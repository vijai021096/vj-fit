import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from './helpers.js'
import { newCode, normCode, corsAllowed, DEFAULT_ORIGINS } from '../src/app.js'

let s
before(async () => { s = await startServer({ createLimit: 1000, pairLimit: 1000 }) })
after(async () => { await s.close() })

const pair = async () => {
  const a = await s.call('POST', '/api/households', { body: { label: "Vikas's iPhone" } })
  assert.equal(a.status, 201)
  const code = (await s.call('POST', '/api/pair/start', { token: a.body.token })).body.code
  const b = await s.call('POST', '/api/pair/join', { body: { code: code.toLowerCase().replace(/(....)/, '$1-'), label: "Varsha's iPhone" } })
  assert.equal(b.status, 200)
  assert.equal(b.body.householdId, a.body.householdId)
  return { A: a.body.token, B: b.body.token, hid: a.body.householdId, deviceA: a.body.deviceId, deviceB: b.body.deviceId }
}

test('health reports the database', async () => {
  const r = await s.call('GET', '/api/health')
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { ok: true, service: 'v2-fit-sync', db: true })
})

test('codes: 8 chars from an unambiguous alphabet, normalised on input', () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), /^[A-HJ-NP-Z2-9]{8}$/)
  assert.equal(normCode(' ab cd-ef 12 '), 'ABCDEF12')
})

test('auth: missing, malformed and unknown tokens are rejected', async () => {
  assert.equal((await s.call('POST', '/api/sync', { body: {} })).status, 401)
  assert.equal((await s.call('POST', '/api/sync', { token: 'short', body: {} })).status, 401)
  assert.equal((await s.call('POST', '/api/sync', { token: 'x'.repeat(43), body: {} })).status, 401)
})

test('pairing: two phones join one household; codes are single-use', async () => {
  const a = await s.call('POST', '/api/households', { body: {} })
  const code = (await s.call('POST', '/api/pair/start', { token: a.body.token })).body.code
  assert.equal((await s.call('POST', '/api/pair/join', { body: { code } })).status, 200)
  assert.equal((await s.call('POST', '/api/pair/join', { body: { code } })).status, 404)
  assert.equal((await s.call('POST', '/api/pair/join', { body: { code: 'ZZZZZZZZ' } })).status, 404)
  assert.equal((await s.call('POST', '/api/pair/join', { body: { code: 'abc' } })).status, 400)
  const me = await s.call('GET', '/api/me', { token: a.body.token })
  assert.equal(me.body.devices.length, 2)
  assert.equal(me.body.devices.filter((d) => d.me).length, 1)
})

test('expired codes are refused', async () => {
  const a = await s.call('POST', '/api/households', { body: {} })
  const code = (await s.call('POST', '/api/pair/start', { token: a.body.token })).body.code
  await s.db.query("update pair_codes set expires_at = now() - interval '1 minute'")
  assert.equal((await s.call('POST', '/api/pair/join', { body: { code } })).status, 404)
})

test('sync: push on one phone, pull on the other; last writer wins', async () => {
  const { A, B } = await pair()
  const w = { kind: 'weight', id: 'vikas|2026-11-16', data: { kg: 72.4, person: 'vikas', date: '2026-11-16' }, updatedAt: 1000 }
  let r = await s.call('POST', '/api/sync', { token: A, body: { cursor: 0, changes: [w] } })
  assert.equal(r.status, 200); assert.equal(r.body.accepted, 1)
  r = await s.call('POST', '/api/sync', { token: B, body: { cursor: 0, changes: [] } })
  assert.equal(r.body.changes.length, 1)
  assert.deepEqual(r.body.changes[0], { ...w, deleted: false })
  const cursorB = r.body.cursor
  // older write loses
  r = await s.call('POST', '/api/sync', { token: B, body: { cursor: cursorB, changes: [{ ...w, data: { kg: 99 }, updatedAt: 500 }] } })
  assert.equal(r.body.accepted, 0)
  assert.equal(r.body.changes.length, 0)
  // newer write wins and is visible to A
  r = await s.call('POST', '/api/sync', { token: B, body: { cursor: cursorB, changes: [{ ...w, data: { kg: 72.1 }, updatedAt: 2000 }] } })
  assert.equal(r.body.accepted, 1)
  r = await s.call('POST', '/api/sync', { token: A, body: { cursor: 0 } })
  assert.equal(r.body.changes[0].data.kg, 72.1)
  // tombstone
  await s.call('POST', '/api/sync', { token: A, body: { changes: [{ kind: 'weight', id: w.id, deleted: true, updatedAt: 3000 }] } })
  r = await s.call('POST', '/api/sync', { token: B, body: { cursor: cursorB } })
  const last = r.body.changes.at(-1)
  assert.equal(last.deleted, true); assert.equal(last.data, null)
})

test('households are isolated from each other', async () => {
  const one = await pair(), two = await pair()
  await s.call('POST', '/api/sync', { token: one.A, body: { changes: [{ kind: 'day', id: 'secret', data: { x: 1 }, updatedAt: 1 }] } })
  const r = await s.call('POST', '/api/sync', { token: two.A, body: { cursor: 0 } })
  assert.equal(r.body.changes.find((c) => c.id === 'secret'), undefined)
})

test('duplicate keys in one batch keep the newest; validation errors', async () => {
  const { A } = await pair()
  let r = await s.call('POST', '/api/sync', { token: A, body: { changes: [
    { kind: 'day', id: 'd', data: { n: 1 }, updatedAt: 1 }, { kind: 'day', id: 'd', data: { n: 2 }, updatedAt: 5 }, { kind: 'day', id: 'd', data: { n: 3 }, updatedAt: 3 }] } })
  assert.equal(r.status, 200)
  assert.equal(r.body.changes.find((c) => c.id === 'd').data.n, 2)
  assert.equal((await s.call('POST', '/api/sync', { token: A, body: { changes: [{ kind: 'evil', id: 'x', updatedAt: 1 }] } })).status, 400)
  assert.equal((await s.call('POST', '/api/sync', { token: A, body: { changes: [{ kind: 'day', id: '', updatedAt: 1 }] } })).status, 400)
  assert.equal((await s.call('POST', '/api/sync', { token: A, body: { changes: [{ kind: 'day', id: 'x', updatedAt: Date.now() + 30 * 864e5 }] } })).status, 400)
  assert.equal((await s.call('POST', '/api/sync', { token: A, body: { changes: 'nope' } })).status, 400)
  const big = 'x'.repeat(600 * 1024)
  assert.equal((await s.call('POST', '/api/sync', { token: A, body: { changes: [{ kind: 'day', id: 'big', data: { big }, updatedAt: 1 }] } })).status, 413)
})

test('pull pages through large histories', async () => {
  const { A, B } = await pair()
  for (let k = 0; k < 3; k++) {
    const changes = Array.from({ length: 400 }, (_, i) => ({ kind: 'session', id: `s${k}-${i}`, data: { i }, updatedAt: 10 + i }))
    assert.equal((await s.call('POST', '/api/sync', { token: A, body: { changes } })).body.accepted, 400)
  }
  let cursor = 0, got = 0, pages = 0, more = true
  while (more) {
    const r = await s.call('POST', '/api/sync', { token: B, body: { cursor } })
    got += r.body.changes.length; cursor = r.body.cursor; more = r.body.more; pages++
  }
  assert.equal(got, 1200); assert.equal(pages, 3)
})

test('unlinking: device loses access; last device removes the household', async () => {
  const { A, B, deviceB, deviceA, hid } = await pair()
  assert.equal((await s.call('DELETE', `/api/devices/${deviceB}`, { token: A })).status, 200)
  assert.equal((await s.call('GET', '/api/me', { token: B })).status, 401)
  const r = await s.call('DELETE', `/api/devices/${deviceA}`, { token: A })
  assert.equal(r.body.householdDeleted, true)
  const { rows } = await s.db.query('select count(*)::int as n from households where id = $1', [hid])
  assert.equal(rows[0].n, 0)
})

test('CORS: Vercel origins allowed, others refused', async () => {
  let r = await s.call('OPTIONS', '/api/sync', { origin: 'https://v2-fit.vercel.app' })
  assert.equal(r.status, 204)
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://v2-fit.vercel.app')
  assert.match(r.headers.get('access-control-allow-headers'), /Authorization/)
  r = await s.call('GET', '/api/health', { origin: 'https://evil.example' })
  assert.equal(r.status, 403)
  assert.equal(r.headers.get('access-control-allow-origin'), null)
  assert.ok(corsAllowed('https://v2-fit-git-main-vikaskalyan-rgbs-projects.vercel.app', DEFAULT_ORIGINS))
  assert.ok(corsAllowed('https://v2-k7xgugwb8-vikaskalyan-rgbs-projects.vercel.app', DEFAULT_ORIGINS))
  assert.ok(!corsAllowed('https://v2-fit.vercel.app.evil.com', DEFAULT_ORIGINS))
  assert.ok(!corsAllowed('https://evil-vikaskalyan-rgbs-projects.vercel.app', DEFAULT_ORIGINS))
})

test('rate limit on joining', async () => {
  const s2 = await startServer({ pairLimit: 3 })
  try {
    const codes = []
    for (let i = 0; i < 4; i++) codes.push((await s2.call('POST', '/api/pair/join', { body: { code: 'AAAAAAAA' } })).status)
    assert.deepEqual(codes, [404, 404, 404, 429])
  } finally { await s2.close() }
})

test('creating households is rate limited per network', async () => {
  const s3 = await startServer({ createLimit: 2 })
  try {
    const st = []
    for (let i = 0; i < 3; i++) st.push((await s3.call('POST', '/api/households', { body: {} })).status)
    assert.deepEqual(st, [201, 201, 429])
  } finally { await s3.close() }
})

test('concurrent syncs from both phones never lose a change', async () => {
  const { A, B } = await pair()
  const mk = (who, n) => Array.from({ length: n }, (_, i) => ({ kind: 'day', id: `${who}${i}`, data: { who, i }, updatedAt: 100 + i }))
  await Promise.all([
    ...Array.from({ length: 5 }, (_, k) => s.call('POST', '/api/sync', { token: A, body: { changes: mk(`a${k}-`, 20) } })),
    ...Array.from({ length: 5 }, (_, k) => s.call('POST', '/api/sync', { token: B, body: { changes: mk(`b${k}-`, 20) } })),
  ])
  let cursor = 0, ids = new Set(), more = true
  while (more) { const r = await s.call('POST', '/api/sync', { token: A, body: { cursor } }); r.body.changes.forEach((c) => ids.add(c.id)); cursor = r.body.cursor; more = r.body.more }
  assert.equal(ids.size, 200)
})
