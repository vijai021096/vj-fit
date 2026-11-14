import pg from 'pg'
import { SCHEMA } from './app.js'

/** node-postgres adapter. Works with Neon's pooled (PgBouncer) endpoint: no named prepared statements. */
export function pgDb(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: true },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  })
  pool.on('error', (e) => console.error('pg pool error', e.message))
  return {
    pool,
    query: (sql, params) => pool.query(sql, params),
    async tx(fn) {
      const c = await pool.connect()
      try {
        await c.query('begin')
        const out = await fn((sql, params) => c.query(sql, params))
        await c.query('commit')
        return out
      } catch (e) {
        await c.query('rollback').catch(() => {})
        throw e
      } finally {
        c.release()
      }
    },
    migrate: () => pool.query(SCHEMA),
    close: () => pool.end(),
  }
}
