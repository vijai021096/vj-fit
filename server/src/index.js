import http from 'node:http'
import { createApp, DEFAULT_ORIGINS, parseOrigins } from './app.js'
import { pgDb } from './db.js'

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set'); process.exit(1) }
const db = pgDb(url)
const extra = parseOrigins(process.env.CORS_ORIGINS)
const app = createApp(db, { origins: [...DEFAULT_ORIGINS, ...extra] })

let tries = 0
async function migrate() {
  for (;;) {
    try { await db.migrate(); console.log('schema ready'); return }
    catch (e) { tries++; console.error(`migrate failed (${tries}):`, e.message); if (tries > 10) throw e; await new Promise((r) => setTimeout(r, 3000)) }
  }
}
await migrate()
const port = Number(process.env.PORT) || 8787
const server = http.createServer(app)
server.keepAliveTimeout = 65000
server.listen(port, () => console.log(`v2-fit sync listening on ${port}`))
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { server.close(); db.close().finally(() => process.exit(0)) })
