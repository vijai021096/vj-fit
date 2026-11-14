import { db } from '../db'
import { useStore } from '../store'
import { PEOPLE } from '../types'

const blobToData = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b) })
const dataToBlob = async (d: string) => (await fetch(d)).blob()

export async function exportAll(withPhotos: boolean) {
  const s = useStore.getState()
  const photos = withPhotos ? await Promise.all((await db.photos.toArray()).map(async (p) => ({ ...p, blob: await blobToData(p.blob) }))) : []
  return {
    app: 'v2fit', v: 1, exportedAt: new Date().toISOString(),
    store: { profiles: s.profiles, settings: s.settings, badges: s.badges, avatars: s.avatars },
    db: { sessions: await db.sessions.toArray(), weights: await db.weights.toArray(), measures: await db.measures.toArray(), days: await db.days.toArray(), photos },
  }
}

export async function downloadBackup(withPhotos = false) {
  const data = await exportAll(withPhotos)
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const name = `v2fit-backup-${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([blob], name, { type: 'application/json' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: 'V² Fit backup' }); mark(); return } catch { /* fall through to download */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  mark()
}
const mark = () => useStore.getState().set((s) => { s.flags.lastBackup = Date.now() })

/** replace: wipe and load. merge: keep both, newest `updatedAt` wins per record — lets two phones share logs. */
export async function importAll(text: string, mode: 'replace' | 'merge'): Promise<string> {
  const data = JSON.parse(text)
  if (data?.app !== 'v2fit' || !data.db) throw new Error('This file is not a V² Fit backup.')
  const tables = ['sessions', 'weights', 'measures', 'days'] as const
  let n = 0
  await db.transaction('rw', [db.sessions, db.weights, db.measures, db.days, db.photos], async () => {
    if (mode === 'replace') await Promise.all([...tables.map((t) => db.table(t).clear()), db.photos.clear()])
    for (const t of tables) for (const row of data.db[t] ?? []) {
      const cur = mode === 'merge' ? await db.table(t).get(row.id) : undefined
      if (!cur || (row.updatedAt ?? 0) > (cur.updatedAt ?? 0)) { await db.table(t).put(row); n++ }
    }
    for (const p of data.db.photos ?? []) {
      if (mode === 'merge' && (await db.photos.get(p.id))) continue
      await db.photos.put({ ...p, blob: await dataToBlob(p.blob) }); n++
    }
  })
  useStore.getState().set((s) => {
    if (mode === 'replace') { Object.assign(s.profiles, data.store?.profiles ?? {}); Object.assign(s.settings, data.store?.settings ?? {}); Object.assign(s.badges, data.store?.badges ?? {}) }
    else for (const p of PEOPLE) {
      if (!s.profiles[p].onboarded && data.store?.profiles?.[p]?.onboarded) s.profiles[p] = data.store.profiles[p]
      s.badges[p] = { ...(data.store?.badges?.[p] ?? {}), ...s.badges[p] }
    }
  })
  return `${mode === 'merge' ? 'Merged' : 'Restored'} ${n} records.`
}

export async function resetAll() {
  await db.delete()
  localStorage.removeItem('v2fit-store')
  location.reload()
}
