import http from 'node:http'
import { PGlite } from '@electric-sql/pglite'
import { createApp, SCHEMA } from '../src/app.js'
import { createPush } from '../src/push.js'
import { createBackups } from '../src/backups.js'

/** In-process Postgres (PGlite) behind the same adapter shape as pgDb. */
export async function memDb() {
  const pg = new PGlite()
  await pg.exec(SCHEMA)
  return {
    pg,
    query: (sql, params) => pg.query(sql, params),
    tx: (fn) => pg.transaction((t) => fn((sql, params) => t.query(sql, params))),
  }
}
export async function startServer(opts = {}) {
  const db = await memDb()
  const { webpush, ...rest } = opts
  const push = webpush ? createPush(db, webpush, () => {}) : undefined
  const backups = createBackups(db, () => {})
  const server = http.createServer(createApp(db, { accessLog: false, log: () => {}, push, backups, ...rest }))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (method, path, { token, body, origin } = {}) => {
    const headers = { 'content-type': 'application/json' }
    if (token) headers.authorization = `Bearer ${token}`
    if (origin) headers.origin = origin
    const r = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await r.text()
    return { status: r.status, headers: r.headers, body: text ? JSON.parse(text) : null }
  }
  return { db, push, backups, base, call, close: () => new Promise((r) => server.close(r)) }
}
