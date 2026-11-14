// V² Fit sync API. Plain node:http — no framework, small attack surface.
//
// Model: a *household* (Vikas + Varsha) owns any number of *devices*. Each device holds a random
// bearer token (only its SHA-256 is stored). Data are opaque JSON *records* keyed by (kind, id) with a
// client timestamp `updatedAt`; the newest write wins. Every accepted write gets a fresh server `seq`,
// so a device pulls "everything after my cursor" without trusting phone clocks for ordering.
import { createHash, randomBytes, randomUUID } from 'node:crypto'

export const SCHEMA = `
create table if not exists households (
  id uuid primary key,
  name text not null default 'V² Fit',
  created_at timestamptz not null default now()
);
create table if not exists devices (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Phone',
  created_at timestamptz not null default now(),
  last_seen timestamptz
);
create table if not exists pair_codes (
  code_hash text primary key,
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid,
  expires_at timestamptz not null,
  used_at timestamptz
);
create sequence if not exists record_seq;
create table if not exists records (
  household_id uuid not null references households(id) on delete cascade,
  kind text not null,
  id text not null,
  data jsonb,
  updated_at bigint not null,
  deleted boolean not null default false,
  device_id uuid,
  seq bigint not null default nextval('record_seq'),
  primary key (household_id, kind, id)
);
create index if not exists records_household_seq on records (household_id, seq);
create index if not exists devices_household on devices (household_id);
`

export const KINDS = new Set(['session', 'weight', 'measure', 'day', 'profile', 'settings', 'badges', 'grocery', 'content', 'avatar'])
const MAX_BODY = 4 * 1024 * 1024
const MAX_CHANGES = 500
const MAX_RECORD = 512 * 1024
const PULL_LIMIT = 500
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_TTL_MIN = 15

const sha = (s) => createHash('sha256').update(s).digest('hex')
const newToken = () => randomBytes(32).toString('base64url')
export function newCode() {
  const b = randomBytes(8)
  return Array.from(b, (x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join('')
}
export const normCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

/** Fixed-window limiter, in memory. Fine for one small instance. */
export function limiter(max, windowMs) {
  const hits = new Map()
  return (key) => {
    const now = Date.now()
    const h = hits.get(key)
    if (!h || now - h.start > windowMs) { hits.set(key, { start: now, n: 1 }); return true }
    h.n++
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k)
    return h.n <= max
  }
}

export function corsAllowed(origin, allow) {
  if (!origin) return false
  return allow.some((a) => (a instanceof RegExp ? a.test(origin) : a === origin))
}
export function parseOrigins(env) {
  const list = (env ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return list.map((s) => (s.startsWith('/') && s.endsWith('/') ? new RegExp(s.slice(1, -1)) : s))
}
export const DEFAULT_ORIGINS = [
  'https://v2-fit.vercel.app',
  /^https:\/\/v2-fit-[a-z0-9-]+-vikaskalyan-rgbs-projects\.vercel\.app$/,
  /^https:\/\/v2-[a-z0-9]+-vikaskalyan-rgbs-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

/**
 * @param {{ query: (sql: string, params?: unknown[]) => Promise<{rows: any[]}>, tx: <T>(fn: (q: (sql: string, params?: unknown[]) => Promise<{rows: any[]}>) => Promise<T>) => Promise<T> }} db
 */
export function createApp(db, opts = {}) {
  const origins = opts.origins ?? DEFAULT_ORIGINS
  const pairLimit = limiter(opts.pairLimit ?? 10, 10 * 60 * 1000)
  const createLimit = limiter(opts.createLimit ?? 20, 60 * 60 * 1000)
  const log = opts.log ?? ((...a) => console.log(...a))

  async function auth(req) {
    const h = req.headers.authorization ?? ''
    const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(h)
    if (!m) throw new HttpError(401, 'Missing or malformed token')
    const { rows } = await db.query('update devices set last_seen = now() where token_hash = $1 returning id, household_id, label', [sha(m[1])])
    if (!rows[0]) throw new HttpError(401, 'This phone is no longer linked')
    return { deviceId: rows[0].id, householdId: rows[0].household_id, label: rows[0].label }
  }

  async function readJson(req) {
    let size = 0
    const chunks = []
    for await (const c of req) {
      size += c.length
      if (size > MAX_BODY) throw new HttpError(413, 'Request too large')
      chunks.push(c)
    }
    if (!chunks.length) return {}
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { throw new HttpError(400, 'Invalid JSON') }
  }
  const label = (s) => String(s ?? 'Phone').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40) || 'Phone'

  async function household(req, body) {
    if (!createLimit(ip(req))) throw new HttpError(429, 'Too many new households from this network. Try later.')
    const hid = randomUUID(), did = randomUUID(), token = newToken()
    await db.tx(async (q) => {
      await q('insert into households (id) values ($1)', [hid])
      await q('insert into devices (id, household_id, token_hash, label) values ($1, $2, $3, $4)', [did, hid, sha(token), label(body.label)])
    })
    return { householdId: hid, deviceId: did, token }
  }

  async function pairStart(req) {
    const a = await auth(req)
    const code = newCode()
    await db.query("delete from pair_codes where household_id = $1 and (used_at is not null or expires_at < now())", [a.householdId])
    const { rows } = await db.query(
      `insert into pair_codes (code_hash, household_id, created_by, expires_at) values ($1, $2, $3, now() + interval '${CODE_TTL_MIN} minutes') returning expires_at`,
      [sha(code), a.householdId, a.deviceId],
    )
    return { code, expiresAt: new Date(rows[0].expires_at).toISOString() }
  }

  async function pairJoin(req, body) {
    if (!pairLimit(ip(req))) throw new HttpError(429, 'Too many attempts. Wait a few minutes and try again.')
    const code = normCode(body.code)
    if (code.length !== 8) throw new HttpError(400, 'The code has 8 characters.')
    const did = randomUUID(), token = newToken()
    const hid = await db.tx(async (q) => {
      const { rows } = await q('update pair_codes set used_at = now() where code_hash = $1 and used_at is null and expires_at > now() returning household_id', [sha(code)])
      if (!rows[0]) throw new HttpError(404, 'That code is wrong or has expired. Make a new one on the other phone.')
      await q('insert into devices (id, household_id, token_hash, label) values ($1, $2, $3, $4)', [did, rows[0].household_id, sha(token), label(body.label)])
      return rows[0].household_id
    })
    return { householdId: hid, deviceId: did, token }
  }

  async function me(req) {
    const a = await auth(req)
    const { rows } = await db.query('select id, label, created_at, last_seen from devices where household_id = $1 order by created_at', [a.householdId])
    const c = await db.query('select count(*)::int as n from records where household_id = $1', [a.householdId])
    return {
      householdId: a.householdId, deviceId: a.deviceId, records: c.rows[0].n,
      devices: rows.map((d) => ({ id: d.id, label: d.label, createdAt: d.created_at, lastSeen: d.last_seen, me: d.id === a.deviceId })),
    }
  }

  async function unlink(req, id) {
    const a = await auth(req)
    const { rows } = await db.query('delete from devices where id = $1 and household_id = $2 returning id', [id, a.householdId])
    if (!rows[0]) throw new HttpError(404, 'No such device')
    // last device out: remove the household and its data entirely
    const left = await db.query('select count(*)::int as n from devices where household_id = $1', [a.householdId])
    if (left.rows[0].n === 0) await db.query('delete from households where id = $1', [a.householdId])
    return { ok: true, householdDeleted: left.rows[0].n === 0 }
  }

  function cleanChanges(list) {
    if (!Array.isArray(list)) throw new HttpError(400, 'changes must be an array')
    if (list.length > MAX_CHANGES) throw new HttpError(413, `At most ${MAX_CHANGES} changes per request`)
    const best = new Map()
    for (const c of list) {
      if (!c || typeof c !== 'object') throw new HttpError(400, 'Bad change')
      const kind = String(c.kind), id = String(c.id ?? '')
      if (!KINDS.has(kind)) throw new HttpError(400, `Unknown kind ${kind}`)
      if (!id || id.length > 200) throw new HttpError(400, 'Bad id')
      const updatedAt = Math.floor(Number(c.updatedAt))
      if (!Number.isFinite(updatedAt) || updatedAt < 0 || updatedAt > Date.now() + 7 * 864e5) throw new HttpError(400, 'Bad updatedAt')
      const deleted = !!c.deleted
      const data = deleted ? null : (c.data ?? null)
      const json = JSON.stringify(data)
      if (json.length > MAX_RECORD) throw new HttpError(413, `Record ${kind}/${id} is too large`)
      const k = `${kind}\u0000${id}`
      const prev = best.get(k)
      if (!prev || prev.updated_at < updatedAt) best.set(k, { kind, id, data, updated_at: updatedAt, deleted })
    }
    return [...best.values()]
  }

  async function sync(req, body) {
    const a = await auth(req)
    const changes = cleanChanges(body.changes ?? [])
    const cursor = Math.max(0, Math.floor(Number(body.cursor) || 0))
    return db.tx(async (q) => {
      // serialise syncs per household so a pull can never skip a concurrently-committing seq
      await q('select pg_advisory_xact_lock(hashtext($1))', [a.householdId])
      let accepted = 0
      if (changes.length) {
        const { rows } = await q(
          `insert into records (household_id, kind, id, data, updated_at, deleted, device_id)
           select $1, x.kind, x.id, x.data, x.updated_at, x.deleted, $2
           from jsonb_to_recordset($3::jsonb) as x(kind text, id text, data jsonb, updated_at bigint, deleted boolean)
           on conflict (household_id, kind, id) do update
             set data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted,
                 device_id = excluded.device_id, seq = nextval('record_seq')
             where records.updated_at < excluded.updated_at
           returning 1`,
          [a.householdId, a.deviceId, JSON.stringify(changes)],
        )
        accepted = rows.length
      }
      const { rows } = await q(
        'select kind, id, data, updated_at, deleted, seq from records where household_id = $1 and seq > $2 order by seq limit $3',
        [a.householdId, cursor, PULL_LIMIT + 1],
      )
      const more = rows.length > PULL_LIMIT
      const page = more ? rows.slice(0, PULL_LIMIT) : rows
      const next = page.length ? Number(page[page.length - 1].seq) : cursor
      return {
        accepted,
        cursor: next,
        more,
        changes: page.map((r) => ({ kind: r.kind, id: r.id, data: r.data, updatedAt: Number(r.updated_at), deleted: r.deleted })),
        serverTime: Date.now(),
      }
    })
  }

  const ip = (req) => (String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || '?')

  async function route(req) {
    const url = new URL(req.url, 'http://x')
    const p = url.pathname.replace(/\/+$/, '') || '/'
    const m = req.method
    if (m === 'GET' && (p === '/' || p === '/api/health')) {
      let dbOk = false
      try { await db.query('select 1'); dbOk = true } catch { /* reported below */ }
      return [dbOk ? 200 : 503, { ok: dbOk, service: 'v2-fit-sync', db: dbOk }]
    }
    if (m === 'POST' && p === '/api/households') return [201, await household(req, await readJson(req))]
    if (m === 'POST' && p === '/api/pair/start') return [200, await pairStart(req)]
    if (m === 'POST' && p === '/api/pair/join') return [200, await pairJoin(req, await readJson(req))]
    if (m === 'GET' && p === '/api/me') return [200, await me(req)]
    if (m === 'POST' && p === '/api/sync') return [200, await sync(req, await readJson(req))]
    const dm = /^\/api\/devices\/([0-9a-f-]{36})$/.exec(p)
    if (m === 'DELETE' && dm) return [200, await unlink(req, dm[1])]
    throw new HttpError(404, 'Not found')
  }

  return async function handler(req, res) {
    const origin = req.headers.origin
    const ok = corsAllowed(origin, origins)
    res.setHeader('Vary', 'Origin')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'no-store')
    if (ok) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      res.setHeader('Access-Control-Max-Age', '600')
    }
    if (req.method === 'OPTIONS') { res.statusCode = ok ? 204 : 403; return res.end() }
    if (origin && !ok) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ error: 'Origin not allowed' })) }
    const t0 = Date.now()
    let status = 500, body
    try {
      ;[status, body] = await route(req)
    } catch (e) {
      status = e instanceof HttpError ? e.status : 500
      body = { error: e instanceof HttpError ? e.message : 'Server error' }
      if (!(e instanceof HttpError)) log('error', req.method, req.url, e)
    }
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
    if (opts.accessLog !== false) log(`${req.method} ${new URL(req.url, 'http://x').pathname} ${status} ${Date.now() - t0}ms`)
  }
}
