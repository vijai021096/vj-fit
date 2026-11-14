import test from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from './helpers.js'

const KEY = 'k'.repeat(32)
const open = (s, label, key = KEY) => s.call('POST', '/api/open', { body: { key, label } })

test('shared mode: wrong key is refused, right key joins the one household', async () => {
  const s = await startServer({ sharedKey: KEY, openLimit: 1000 })
  try {
    assert.equal((await open(s, 'x', 'nope')).status, 403)
    assert.equal((await s.call('POST', '/api/open', { body: {} })).status, 403)
    const a = await open(s, 'Vikas'), b = await open(s, 'Varsha')
    assert.equal(a.status, 200)
    assert.equal(a.body.householdId, b.body.householdId)
    assert.notEqual(a.body.token, b.body.token)
  } finally { await s.close() }
})

test('shared mode: both phones see each other’s data', async () => {
  const s = await startServer({ sharedKey: KEY, openLimit: 1000 })
  try {
    const a = (await open(s, 'A')).body, b = (await open(s, 'B')).body
    const now = Date.now()
    await s.call('POST', '/api/sync', { token: a.token, body: { cursor: 0, changes: [{ kind: 'weight', id: 'vikas|2026-11-15', data: { kg: 70 }, updatedAt: now, deleted: false }] } })
    await s.call('POST', '/api/sync', { token: b.token, body: { cursor: 0, changes: [{ kind: 'weight', id: 'varsha|2026-11-15', data: { kg: 60 }, updatedAt: now, deleted: false }] } })
    const pa = await s.call('POST', '/api/sync', { token: a.token, body: { cursor: 0, changes: [] } })
    const pb = await s.call('POST', '/api/sync', { token: b.token, body: { cursor: 0, changes: [] } })
    assert.deepEqual(pa.body.changes.map((c) => c.id).sort(), ['varsha|2026-11-15', 'vikas|2026-11-15'])
    assert.deepEqual(pb.body.changes.map((c) => c.id).sort(), ['varsha|2026-11-15', 'vikas|2026-11-15'])
  } finally { await s.close() }
})

test('shared mode: earlier per-phone households are merged (newest wins) and removed', async () => {
  // Phase 1: old server (no shared key) with two separate households, like the two phones had.
  const old = await startServer({ createLimit: 1000, pairLimit: 1000 })
  const h1 = (await old.call('POST', '/api/households', { body: { label: 'Vikas’s phone' } })).body
  const h2 = (await old.call('POST', '/api/households', { body: { label: 'Varsha’s phone' } })).body
  const t = 1_000_000
  await old.call('POST', '/api/sync', { token: h1.token, body: { cursor: 0, changes: [
    { kind: 'profile', id: 'vikas', data: { name: 'v-new' }, updatedAt: t + 5, deleted: false },
    { kind: 'profile', id: 'varsha', data: { name: 'pristine-old' }, updatedAt: t, deleted: false },
    { kind: 'weight', id: 'vikas|d1', data: { kg: 70 }, updatedAt: t, deleted: false } ] } })
  await old.call('POST', '/api/sync', { token: h2.token, body: { cursor: 0, changes: [
    { kind: 'profile', id: 'varsha', data: { name: 'va-new' }, updatedAt: t + 9, deleted: false },
    { kind: 'profile', id: 'vikas', data: { name: 'stale' }, updatedAt: t + 1, deleted: false },
    { kind: 'weight', id: 'varsha|d1', data: { kg: 60 }, updatedAt: t, deleted: false } ] } })
  // Phase 2: same database, now with the shared key.
  const { createApp } = await import('../src/app.js')
  const http = await import('node:http')
  const server = http.createServer(createApp(old.db, { accessLog: false, log: () => {}, sharedKey: KEY, openLimit: 1000 }))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const j = async (path, body, token) => (await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })).json()
    const dev = await j('/api/open', { key: KEY, label: 'Vikas' })
    const pull = await j('/api/sync', { cursor: 0, changes: [] }, dev.token)
    const by = Object.fromEntries(pull.changes.map((c) => [`${c.kind}/${c.id}`, c.data]))
    assert.equal(by['profile/vikas'].name, 'v-new')
    assert.equal(by['profile/varsha'].name, 'va-new')
    assert.equal(by['weight/vikas|d1'].kg, 70)
    assert.equal(by['weight/varsha|d1'].kg, 60)
    const { rows } = await old.db.query('select count(*)::int as n from households')
    assert.equal(rows[0].n, 1)
    // old phones' tokens stop working (they get told to re-open the app)
    const r = await fetch(base + '/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${h1.token}` }, body: '{"cursor":0,"changes":[]}' })
    assert.equal(r.status, 401)
  } finally { await new Promise((r) => server.close(r)); await old.close() }
})

test('shared mode: households and pairing are switched off; open is off without a key', async () => {
  const s = await startServer({ sharedKey: KEY, openLimit: 1000 })
  const n = await startServer({})
  try {
    assert.equal((await s.call('POST', '/api/households', { body: {} })).status, 410)
    assert.equal((await s.call('POST', '/api/pair/join', { body: { code: 'ABCDEFGH' } })).status, 410)
    assert.equal((await n.call('POST', '/api/open', { body: { key: KEY } })).status, 404)
  } finally { await s.close(); await n.close() }
})

test('shared mode: the key attempt limiter stops guessing', async () => {
  const s = await startServer({ sharedKey: KEY, openLimit: 3 })
  try {
    const codes = []
    for (let i = 0; i < 5; i++) codes.push((await open(s, 'x', 'guess' + i)).status)
    assert.deepEqual(codes, [403, 403, 403, 429, 429])
  } finally { await s.close() }
})
