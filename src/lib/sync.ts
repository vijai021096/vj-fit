import { create } from 'zustand'
import { db, type SyncMeta } from '../db'
import { useStore } from '../store'
import { PEOPLE, type Person } from '../types'
import { planOk, programOk } from './content'

/* =============================================================================
   Phone-to-phone sync.  Offline-first: the app never waits on the network.
   Every syncable thing is a record {kind, id, data, updatedAt, deleted}. A
   per-record fingerprint (syncmeta) tells us what changed since we last spoke
   to the server; the server keeps the newest write per record (last-writer-wins)
   and hands every device the changes it hasn't seen yet.
   ========================================================================== */

const CFG_KEY = 'v2fit-sync'
export interface SyncCfg { api: string; token: string; deviceId: string; householdId: string; cursor: number; label: string }
const KEY_KEY = 'v2fit-key'
export const getKey = (): string => { try { return localStorage.getItem(KEY_KEY) ?? '' } catch { return '' } }
export const setKey = (k: string) => { try { k ? localStorage.setItem(KEY_KEY, k.trim()) : localStorage.removeItem(KEY_KEY) } catch { /* private mode */ } }
/** A setup link like https://v2-fit.vercel.app/#k=… stores the household key, then is removed from the address bar. */
export function consumeSetupLink() {
  try {
    const m = /[#&?]k=([^&]+)/.exec(location.hash)
    if (!m) return
    setKey(decodeURIComponent(m[1]))
    history.replaceState(null, '', location.pathname + location.search)
  } catch { /* ignore */ }
}
export const DEFAULT_API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '')

export const getCfg = (): SyncCfg | null => { try { const c = JSON.parse(localStorage.getItem(CFG_KEY) ?? 'null'); return c?.token ? c : null } catch { return null } }
const saveCfg = (c: SyncCfg | null) => { try { c ? localStorage.setItem(CFG_KEY, JSON.stringify(c)) : localStorage.removeItem(CFG_KEY) } catch { /* private mode */ } }

export type SyncState = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'unlinked'
export const useSync = create<{ state: SyncState; last: number; error: string; linked: boolean }>(() => ({ state: getCfg() || getKey() ? 'idle' : 'off', last: 0, error: '', linked: !!(getCfg() || getKey()) }))
const setSync = (p: Partial<ReturnType<typeof useSync.getState>>) => useSync.setState(p)

/* ------------------------------- helpers ------------------------------- */
export function stable(v: unknown): string {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : stable(x))).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`
}
export function hashOf(v: unknown): string {
  const s = stable(v); let h1 = 0x811c9dc5, h2 = 5381
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (Math.imul(h2, 33) + c) >>> 0 }
  return `${s.length}.${h1.toString(36)}${h2.toString(36)}`
}
const keyOf = (kind: string, id: string) => `${kind}/${id}`
const MAX_RECORD_CHARS = 500_000
const DEXIE: Record<string, 'sessions' | 'weights' | 'measures' | 'days'> = { session: 'sessions', weight: 'weights', measure: 'measures', day: 'days' }

interface Rec { kind: string; id: string; data: unknown; at?: number; deleted?: boolean; pristine?: boolean }

/** Everything that lives in the Zustand store and should follow you across phones. */
export function storeRecords(): Rec[] {
  const s = useStore.getState()
  const out: Rec[] = []
  for (const p of PEOPLE) {
    out.push({ kind: 'profile', id: p, data: s.profiles[p], pristine: !s.profiles[p].onboarded })
    out.push({ kind: 'badges', id: p, data: s.badges[p], pristine: Object.keys(s.badges[p] ?? {}).length === 0 })
    if (s.avatars[p]) out.push({ kind: 'avatar', id: p, data: s.avatars[p] })
  }
  out.push({ kind: 'settings', id: 'main', data: { programStart: s.settings.programStart, mergeDay0: s.settings.mergeDay0, creatine: s.settings.creatine }, pristine: !s.flags.disclaimer })
  out.push({ kind: 'grocery', id: 'main', data: s.grocery, pristine: Object.keys(s.grocery).length === 0 })
  for (const p of PEOPLE) {
    const pk = `program:${p}`, mk = `meals:${p}`
    if (s.content.programs[p]) out.push({ kind: 'content', id: pk, data: s.content.programs[p], at: s.contentAt[pk] ?? 1 })
    else if (s.contentAt[pk]) out.push({ kind: 'content', id: pk, data: null, at: s.contentAt[pk], deleted: true })
    if (s.content.meals[p]) out.push({ kind: 'content', id: mk, data: s.content.meals[p], at: s.contentAt[mk] ?? 1 })
    else if (s.contentAt[mk]) out.push({ kind: 'content', id: mk, data: null, at: s.contentAt[mk], deleted: true })
  }
  return out
}

async function currentRecords(): Promise<Map<string, Rec>> {
  const m = new Map<string, Rec>()
  for (const r of storeRecords()) m.set(keyOf(r.kind, r.id), r)
  for (const [kind, table] of Object.entries(DEXIE)) {
    for (const row of await db.table(table).toArray()) m.set(keyOf(kind, row.id), { kind, id: row.id, data: row, at: row.updatedAt || 1 })
  }
  return m
}

/** Compare what we have to what we last told the server; mark differences dirty. Returns the fresh records. */
export async function scan(now = Date.now()): Promise<Map<string, Rec>> {
  const cur = await currentRecords()
  const metas = new Map((await db.syncmeta.toArray()).map((m) => [m.key, m]))
  const writes: SyncMeta[] = []
  for (const [key, r] of cur) {
    const hash = r.deleted ? 'DEL' : hashOf(r.data)
    const m = metas.get(key)
    if (m && m.hash === hash) continue
    // A never-touched local default must not out-vote real data living on the other phone.
    if (!m && r.pristine) { writes.push({ key, kind: r.kind, id: r.id, hash, at: 0, dirty: 0, deleted: false }); continue }
    writes.push({ key, kind: r.kind, id: r.id, hash, at: r.at ?? now, dirty: 1, deleted: !!r.deleted })
  }
  for (const [key, m] of metas) {
    if (!m.deleted && !cur.has(key)) writes.push({ ...m, hash: 'DEL', at: now, dirty: 1, deleted: true })
  }
  if (writes.length) await db.syncmeta.bulkPut(writes)
  return cur
}

/* -------------------------------- network -------------------------------- */
class HttpErr extends Error { constructor(public status: number, m: string) { super(m) } }
async function call<T>(api: string, path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000)
  try {
    const r = await fetch(`${api}${path}`, { ...init, signal: ctl.signal, headers: { 'Content-Type': 'application/json', ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new HttpErr(r.status, (j as { error?: string }).error ?? `HTTP ${r.status}`)
    return j as T
  } finally { clearTimeout(t) }
}

/* ------------------------------ applying pulls ------------------------------ */
interface Change { kind: string; id: string; data: unknown; updatedAt: number; deleted: boolean }

async function applyRemote(changes: Change[]) {
  if (!changes.length) return
  const metas = new Map((await db.syncmeta.bulkGet(changes.map((c) => keyOf(c.kind, c.id)))).filter((m): m is SyncMeta => !!m).map((m) => [m.key, m]))
  const metaOut: SyncMeta[] = []
  const storePatches: ((s: ReturnType<typeof useStore.getState>) => void)[] = []
  for (const c of changes) {
    const key = keyOf(c.kind, c.id)
    const m = metas.get(key)
    const hash = c.deleted ? 'DEL' : hashOf(c.data)
    if (m && m.hash === hash) { if (m.at !== c.updatedAt && !m.dirty) metaOut.push({ ...m, at: c.updatedAt }); continue }
    if (m && m.at > c.updatedAt) continue // ours is newer; it goes up in this or the next push
    const table = DEXIE[c.kind]
    if (table) {
      if (c.deleted) await db.table(table).delete(c.id)
      else if (c.data && typeof c.data === 'object') await db.table(table).put({ ...(c.data as object), id: c.id, updatedAt: c.updatedAt })
      else continue
      // the stored row now carries updatedAt = server's value, so fingerprint what we wrote
      const row = c.deleted ? null : await db.table(table).get(c.id)
      metaOut.push({ key, kind: c.kind, id: c.id, hash: c.deleted ? 'DEL' : hashOf(row), at: c.updatedAt, dirty: 0, deleted: c.deleted })
      continue
    }
    const person = (PEOPLE as string[]).includes(c.id) ? (c.id as Person) : null
    const d = c.data as Record<string, unknown> | null
    let applied = true
    if (c.kind === 'profile' && person && d) storePatches.push((s) => { s.profiles[person] = { ...s.profiles[person], ...(d as object) } as never })
    else if (c.kind === 'badges' && person && d) storePatches.push((s) => { s.badges[person] = d as never })
    else if (c.kind === 'avatar' && person) storePatches.push((s) => { if (c.deleted || !d) delete s.avatars[person]; else s.avatars[person] = d as never })
    else if (c.kind === 'settings' && d) storePatches.push((s) => { if (typeof d.programStart === 'string' && d.programStart) s.settings.programStart = d.programStart; if (typeof d.mergeDay0 === 'boolean') s.settings.mergeDay0 = d.mergeDay0; if (typeof d.creatine === 'boolean') s.settings.creatine = d.creatine })
    else if (c.kind === 'grocery' && d) storePatches.push((s) => { s.grocery = d as never })
    else if (c.kind === 'content') {
      const [what, who] = c.id.split(':'); const p = who as Person
      if (!(PEOPLE as string[]).includes(p)) applied = false
      else if (what === 'program') storePatches.push((s) => { if (c.deleted) delete s.content.programs[p]; else if (programOk(d as never)) s.content.programs[p] = d as never; s.contentAt[c.id] = c.updatedAt })
      else if (what === 'meals') storePatches.push((s) => { if (c.deleted) delete s.content.meals[p]; else if (planOk(d as never)) s.content.meals[p] = d as never; s.contentAt[c.id] = c.updatedAt })
      else applied = false
    } else applied = false
    if (applied) metaOut.push({ key, kind: c.kind, id: c.id, hash, at: c.updatedAt, dirty: 0, deleted: c.deleted })
  }
  if (storePatches.length) useStore.getState().set((s) => { for (const f of storePatches) f(s as never) })
  if (metaOut.length) await db.syncmeta.bulkPut(metaOut)
  // content changed under us? the watcher in lib/content.ts re-applies the engines.
}

/* ------------------------------- the loop ------------------------------- */
let reopens = 0
let running: Promise<void> | null = null
let again = false

export function syncNow(): Promise<void> {
  if (!getCfg() && !getKey()) return Promise.resolve()
  if (running) { again = true; return running }
  running = (async () => {
    try { do { again = false; await cycle() } while (again) } finally { running = null }
  })()
  return running
}

async function cycle() {
  let cfg: SyncCfg | null = getCfg(); if (!cfg && !getKey()) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) { setSync({ state: 'offline' }); return }
  setSync({ state: 'syncing', error: '' })
  try {
    if (!cfg) cfg = await connect()
    // local DB was wiped (iOS storage eviction / reset) but the server cursor survived → start from scratch
    if (cfg.cursor > 0 && (await db.syncmeta.count()) === 0) { cfg = { ...cfg, cursor: 0 }; saveCfg(cfg) }
    for (let guard = 0; guard < 200; guard++) {
      const cur = await scan()
      const dirty = (await db.syncmeta.where('dirty').equals(1).limit(200).toArray())
      const changes: (Change & { dropped?: boolean })[] = []
      for (const m of dirty) {
        const r = cur.get(m.key)
        if (m.deleted || !r) { changes.push({ kind: m.kind, id: m.id, data: null, updatedAt: m.at || Date.now(), deleted: true }); continue }
        if (stable(r.data).length > MAX_RECORD_CHARS) { changes.push({ kind: m.kind, id: m.id, data: null, updatedAt: 0, deleted: false, dropped: true }); continue }
        changes.push({ kind: m.kind, id: m.id, data: r.data, updatedAt: m.at || Date.now(), deleted: false })
      }
      const send = changes.filter((c) => !c.dropped).map(({ dropped: _d, ...c }) => c)
      const res: { cursor: number; more: boolean; changes: Change[] } = await call(cfg.api, '/api/sync', { method: 'POST', token: cfg.token, body: JSON.stringify({ cursor: cfg.cursor, changes: send }) })
      await applyRemote(res.changes)
      // push confirmed: clear dirty where nothing changed meanwhile (also drops over-size records so we don't loop)
      const after = new Map((await db.syncmeta.bulkGet(dirty.map((m) => m.key))).filter((m): m is SyncMeta => !!m).map((m) => [m.key, m]))
      await db.syncmeta.bulkPut(dirty.flatMap((m) => { const now = after.get(m.key); return now && now.hash === m.hash ? [{ ...now, dirty: 0 as const }] : [] }))
      cfg = { ...cfg, cursor: res.cursor }; saveCfg(cfg)
      if (!res.more && dirty.length < 200) break
    }
    reopens = 0
    setSync({ state: 'idle', last: Date.now(), error: '' })
  } catch (e) {
    const err = e as Error & { status?: number }
    if (err.status === 401 && getKey() && reopens++ < 2) { saveCfg(null); again = true; return } // old token (e.g. spaces were merged): re-open with the key
    if (err.status === 403) { setKey(''); saveCfg(null); setSync({ state: 'unlinked', linked: false, error: 'That household key is not valid.' }); return }
    if (err.status === 401) { setSync({ state: 'unlinked', error: 'This phone was removed. Enter the household key again.' }); return }
    const offline = err.name === 'AbortError' || err instanceof TypeError || navigator.onLine === false
    setSync({ state: offline ? 'offline' : 'error', error: offline ? '' : err.message })
  }
}

/* ------------------------------ shared database ------------------------------ */
/** Open the one shared household with the key; everything on this phone is (re)sent so nothing is lost. */
async function connect(): Promise<SyncCfg> {
  const api = DEFAULT_API
  if (!api) throw new Error('No sync server is configured for this build.')
  const r = await call<{ householdId: string; deviceId: string; token: string }>(api, '/api/open', { method: 'POST', body: JSON.stringify({ key: getKey(), label: 'Phone' }) })
  const cfg: SyncCfg = { api, token: r.token, deviceId: r.deviceId, householdId: r.householdId, cursor: 0, label: 'Shared database' }
  await db.syncmeta.clear()
  saveCfg(cfg)
  return cfg
}
/** Save the key and connect right away so a wrong key is reported immediately. */
export async function connectWithKey(key: string) {
  const k = key.trim()
  if (k.length < 12) throw new Error('That key looks too short.')
  const prev = getKey()
  setKey(k); saveCfg(null)
  try { await connect() } catch (e) { setKey(prev); throw e }
  setSync({ linked: true, state: 'idle', error: '' })
  void syncNow()
}
/** Stop syncing on this phone. Everything stays on the phone. */
export function disconnectLocal() { saveCfg(null); setKey(''); setSync({ linked: false, state: 'off', error: '' }) }

/* ------------------------------- auto start ------------------------------- */
let started = false
export function startSync() {
  if (started) return; started = true
  let timer: ReturnType<typeof setTimeout> | undefined
  const soon = (ms = 2500) => { if (!getCfg() && !getKey()) return; clearTimeout(timer); timer = setTimeout(() => void syncNow(), ms) }
  useStore.subscribe(() => soon())
  for (const t of ['sessions', 'weights', 'measures', 'days'] as const) {
    db.table(t).hook('creating', () => { soon() }); db.table(t).hook('updating', () => { soon() }); db.table(t).hook('deleting', () => { soon() })
  }
  window.addEventListener('online', () => soon(300))
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(300) })
  setInterval(() => { if (document.visibilityState === 'visible') void syncNow() }, 30000)
  soon(800)
}
