/**
 * Daily safety copy of every household's records, kept inside the same database.
 * Protects against the failure sync can't: a bad write or a wrong delete that has already replicated everywhere.
 * One snapshot per household per day (the first run of the day wins, so a later bad write can't overwrite it); the newest 14 are kept.
 */
export const BACKUP_SCHEMA = `
create table if not exists record_backups (
  day date not null,
  household_id uuid not null references households(id) on delete cascade,
  record_count int not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (day, household_id)
);
`
export const KEEP_DAYS = 14

export function createBackups(db, log = console.log) {
  return {
    async snapshot() {
      const hs = (await db.query('select id from households')).rows
      let made = 0
      for (const h of hs) {
        const r = await db.query(
          `insert into record_backups (day, household_id, record_count, data)
           select current_date, $1, count(*)::int, coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'id', id, 'data', data, 'updated_at', updated_at)), '[]'::jsonb)
           from records where household_id = $1 and not deleted
           on conflict (day, household_id) do nothing returning day`, [h.id])
        made += r.rows.length
      }
      await db.query(`delete from record_backups where day < current_date - ${KEEP_DAYS}`)
      return made
    },
    async list(householdId) {
      const { rows } = await db.query('select day::text as day, record_count, created_at from record_backups where household_id = $1 order by day desc', [householdId])
      return { backups: rows }
    },
    async get(householdId, day) {
      const { rows } = await db.query('select day::text as day, record_count, data from record_backups where household_id = $1 and day = $2', [householdId, day])
      return rows[0] ?? null
    },
    /** Runs now (after migration) and every 6 hours; failures are logged, never fatal. */
    start(intervalMs = 6 * 3600 * 1000) {
      const run = () => this.snapshot().then((n) => n && log(`backup: ${n} snapshot(s) taken`)).catch((e) => log('backup failed', e.message))
      void run()
      const t = setInterval(run, intervalMs); t.unref?.(); return t
    },
  }
}
