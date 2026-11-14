import test from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from './helpers.js'
import { istParts } from '../src/push.js'

const KEY = 'k'.repeat(32)
const fake = () => {
  const sent = []
  return { sent, generateVAPIDKeys: () => ({ publicKey: 'PUB', privateKey: 'PRIV' }), sendNotification: async (sub, payload) => { if (sub.endpoint.includes('gone')) { const e = new Error('gone'); e.statusCode = 410; throw e } sent.push({ sub, payload: JSON.parse(payload) }) } }
}
const SUB = (n = 'a') => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: 'p', auth: 'a' } })
const join = async (s) => (await s.call('POST', '/api/open', { body: { key: KEY, label: 'phone' } })).body.token

test('push: public key is served, subscription needs auth and a valid shape', async () => {
  const w = fake(); const s = await startServer({ sharedKey: KEY, openLimit: 1000, webpush: w })
  try {
    assert.equal((await s.call('GET', '/api/push/key')).body.publicKey, 'PUB')
    assert.equal((await s.call('PUT', '/api/push/subscription', { body: {} })).status, 401)
    const t = await join(s)
    assert.equal((await s.call('PUT', '/api/push/subscription', { token: t, body: { subscription: { endpoint: 'http://insecure' }, person: 'vikas', items: [] } })).status, 400)
    assert.equal((await s.call('PUT', '/api/push/subscription', { token: t, body: { subscription: SUB(), person: 'nobody', items: [] } })).status, 400)
    const ok = await s.call('PUT', '/api/push/subscription', { token: t, body: { subscription: SUB(), person: 'vikas', items: [{ date: '2026-11-15', at: 480, title: 'Breakfast', body: 'x' }, { date: 'bad', at: 1, title: 'drop me' }] } })
    assert.equal(ok.status, 200); assert.equal(ok.body.items, 1)
  } finally { await s.close() }
})

test('push: only reminders that are due are sent, once', async () => {
  const w = fake(); const s = await startServer({ sharedKey: KEY, openLimit: 1000, webpush: w })
  try {
    const t = await join(s)
    const now = Date.UTC(2026, 10, 15, 2, 30)            // 08:00 IST
    const { date } = istParts(now)
    await s.call('PUT', '/api/push/subscription', { token: t, body: { subscription: SUB(), person: 'vikas', items: [
      { date, at: 480, title: 'Breakfast', body: 'Oats', img: 'v-b2', slot: 'breakfast' }, { date, at: 600, title: 'Later', body: '' }, { date: '2026-11-16', at: 480, title: 'Tomorrow', body: '' }] } })
    assert.equal(await s.push.tick(now), 1)
    assert.equal(w.sent[0].payload.image, 'https://v2-fit.vercel.app/media/food/v-b2.webp')
    assert.deepEqual(w.sent[0].payload.data, { slot: 'breakfast', date, person: 'vikas' })
    assert.deepEqual(w.sent[0].payload.actions.map((a) => a.action), ['ate', 'skip'])
    assert.equal(await s.push.tick(now + 60000), 0)       // already sent
    assert.deepEqual(w.sent.map((x) => x.payload.title), ['Breakfast'])
    assert.equal(await s.push.tick(now + 120 * 60000), 1) // 10:00 IST → "Later"
  } finally { await s.close() }
})

test('push: a dead subscription is dropped, test endpoint works, unsubscribe removes it', async () => {
  const w = fake(); const s = await startServer({ sharedKey: KEY, openLimit: 1000, webpush: w })
  try {
    const a = await join(s), b = await join(s)
    assert.equal((await s.call('POST', '/api/push/test', { token: a })).status, 404)
    await s.call('PUT', '/api/push/subscription', { token: a, body: { subscription: SUB('ok'), person: 'vikas', items: [] } })
    assert.equal((await s.call('POST', '/api/push/test', { token: a })).status, 200)
    await s.call('PUT', '/api/push/subscription', { token: b, body: { subscription: SUB('gone'), person: 'varsha', items: [] } })
    assert.equal((await s.call('POST', '/api/push/test', { token: b })).status, 502)
    assert.equal((await s.db.query('select count(*)::int n from push_subs')).rows[0].n, 1)
    await s.call('DELETE', '/api/push/subscription', { token: a })
    assert.equal((await s.db.query('select count(*)::int n from push_subs')).rows[0].n, 0)
  } finally { await s.close() }
})

test('push: server without push configured answers 404', async () => {
  const s = await startServer({ sharedKey: KEY })
  try { assert.equal((await s.call('GET', '/api/push/key')).status, 404) } finally { await s.close() }
})
