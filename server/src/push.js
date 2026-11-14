/**
 * Web-push reminders. Separate from sync: its own tables, its own routes.
 * Each phone uploads the next week of reminders ({date, at, title, body} in IST); a one-minute loop sends the ones that are due.
 * VAPID keys are generated on first use and kept in the database, so there is no secret to configure.
 */
export const PUSH_SCHEMA = `
create table if not exists push_keys (id int primary key, pub text not null, priv text not null);
create table if not exists push_subs (
  device_id uuid primary key references devices(id) on delete cascade,
  sub jsonb not null,
  person text not null,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
`

export const FOOD_BASE = 'https://v2-fit.vercel.app/media/food/'
const IST_MS = 330 * 60 * 1000
export const istParts = (ms) => {
  const d = new Date(ms + IST_MS)
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

export class PushError extends Error { constructor(status, message) { super(message); this.status = status } }

const clean = (s, n) => String(s ?? '').slice(0, n)

export function validate(body) {
  const sub = body?.subscription
  if (!sub || typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 600 || !sub.keys?.p256dh || !sub.keys?.auth) throw new PushError(400, 'Invalid push subscription')
  const person = body.person === 'varsha' ? 'varsha' : body.person === 'vikas' ? 'vikas' : null
  if (!person) throw new PushError(400, 'person must be vikas or varsha')
  const raw = Array.isArray(body.items) ? body.items : []
  if (raw.length > 200) throw new PushError(400, 'Too many reminders')
  const items = raw.map((i) => ({ date: clean(i.date, 10), at: Math.round(Number(i.at)), title: clean(i.title, 80), body: clean(i.body, 160), ...(/^[vr]-[a-z0-9]{1,4}$/.test(i.img ?? '') ? { img: i.img } : {}) }))
    .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && Number.isFinite(i.at) && i.at >= 0 && i.at < 1440 && i.title)
  return { sub: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }, person, items }
}

/** @param webpush the `web-push` module (or a fake with the same three functions in tests) */
export function createPush(db, webpush, log = console.log) {
  let keys = null
  const sent = new Set()
  async function vapid() {
    if (keys) return keys
    let { rows } = await db.query('select pub, priv from push_keys where id = 1')
    if (!rows[0]) {
      const k = webpush.generateVAPIDKeys()
      await db.query('insert into push_keys (id, pub, priv) values (1, $1, $2) on conflict (id) do nothing', [k.publicKey, k.privateKey])
      ;({ rows } = await db.query('select pub, priv from push_keys where id = 1'))
    }
    keys = { publicKey: rows[0].pub, privateKey: rows[0].priv }
    return keys
  }
  const options = async () => { const k = await vapid(); return { vapidDetails: { subject: 'mailto:v2fit@example.com', publicKey: k.publicKey, privateKey: k.privateKey }, TTL: 3600 } }

  async function deliver(deviceId, sub, payload) {
    try { await webpush.sendNotification(sub, JSON.stringify(payload), await options()); return true }
    catch (e) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await db.query('delete from push_subs where device_id = $1', [deviceId])
      else log('push failed', e?.statusCode ?? e?.message)
      return false
    }
  }

  return {
    publicKey: async () => (await vapid()).publicKey,
    async save(deviceId, body) {
      const v = validate(body)
      await db.query(`insert into push_subs (device_id, sub, person, items, updated_at) values ($1, $2, $3, $4, now())
        on conflict (device_id) do update set sub = excluded.sub, person = excluded.person, items = excluded.items, updated_at = now()`, [deviceId, JSON.stringify(v.sub), v.person, JSON.stringify(v.items)])
      return { ok: true, items: v.items.length }
    },
    async remove(deviceId) { await db.query('delete from push_subs where device_id = $1', [deviceId]); return { ok: true } },
    async test(deviceId) {
      const { rows } = await db.query('select sub from push_subs where device_id = $1', [deviceId])
      if (!rows[0]) throw new PushError(404, 'Turn reminders on first')
      const ok = await deliver(deviceId, rows[0].sub, { title: 'V² Fit', body: 'Reminders are working.' })
      if (!ok) throw new PushError(502, 'The push service refused the message')
      return { ok: true }
    },
    /** Send everything due in the last two minutes (covers timer drift), once. */
    async tick(nowMs = Date.now()) {
      const { date, minutes } = istParts(nowMs)
      const { rows } = await db.query('select device_id, sub, items from push_subs')
      let n = 0
      for (const r of rows) {
        for (const [i, it] of (r.items ?? []).entries()) {
          if (it.date !== date || it.at > minutes || it.at < minutes - 2) continue
          const k = `${r.device_id}|${it.date}|${it.at}|${i}`
          if (sent.has(k)) continue
          sent.add(k)
          if (await deliver(r.device_id, r.sub, { title: it.title, body: it.body, tag: `r-${it.date}-${it.at}`, ...(it.img ? { image: `${FOOD_BASE}${it.img}.webp` } : {}) })) { n++; log(`push sent: ${it.title}`) }
        }
      }
      if (sent.size > 5000) sent.clear()
      return n
    },
    start(intervalMs = 60000) { const t = setInterval(() => { this.tick().catch((e) => log('push tick', e.message)) }, intervalMs); t.unref?.(); return t },
  }
}
