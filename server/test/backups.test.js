import test from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from './helpers.js'

const KEY = 'k'.repeat(32)
const join = async (s) => (await s.call('POST', '/api/open', { body: { key: KEY, label: 'phone' } })).body.token
const put = (s, token, id, kg) => s.call('POST', '/api/sync', { token, body: { cursor: 0, changes: [{ kind: 'weight', id, data: { kg }, updatedAt: Date.now(), deleted: false }] } })

test('backups: snapshot is taken once a day, lists, downloads, needs auth', async () => {
  const s = await startServer({ sharedKey: KEY, openLimit: 1000 })
  try {
    assert.equal((await s.call('GET', '/api/backups')).status, 401)
    const t = await join(s)
    assert.equal((await put(s, t, 'a', 70)).status, 200)
    assert.equal(await s.backups.snapshot(), 1)
    assert.equal(await s.backups.snapshot(), 0, 'second run the same day does nothing')
    await put(s, t, 'b', 71)
    const list = (await s.call('GET', '/api/backups', { token: t })).body.backups
    assert.equal(list.length, 1); assert.equal(list[0].record_count, 1, 'the later write is not in the first snapshot')
    const got = (await s.call('GET', `/api/backups/${list[0].day}`, { token: t })).body
    assert.equal(got.data[0].id, 'a')
    assert.equal((await s.call('GET', '/api/backups/2001-01-01', { token: t })).status, 404)
  } finally { await s.close() }
})

test('backups: old snapshots are pruned', async () => {
  const s = await startServer({ sharedKey: KEY, openLimit: 1000 })
  try {
    const t = await join(s); await put(s, t, 'a', 70); await s.backups.snapshot()
    const hid = (await s.db.query('select household_id from record_backups')).rows[0].household_id
    await s.db.query("insert into record_backups (day, household_id, record_count, data) values (current_date - 30, $1, 0, '[]')", [hid])
    await s.backups.snapshot()
    assert.equal((await s.db.query('select count(*)::int n from record_backups')).rows[0].n, 1)
  } finally { await s.close() }
})
