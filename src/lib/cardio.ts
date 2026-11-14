import type { SessionLog } from '../types'
import type { DayRow } from '../db'

export interface CardioTotals { seconds: number; byEx: Record<string, number> }

/** Cardio time between two dates (inclusive): timed steps inside workouts plus stand-alone timers. */
export function cardioTotals(sessions: SessionLog[], days: DayRow[], from: string, to: string): CardioTotals {
  const byEx: Record<string, number> = {}
  const add = (ex: string, sec: number) => { if (sec > 0) byEx[ex] = (byEx[ex] ?? 0) + sec }
  for (const s of sessions) if (s.date >= from && s.date <= to) for (const [step, sec] of Object.entries(s.cardio ?? {})) add(s.exOf[step] ?? 'cardio', sec)
  for (const d of days) if (d.date >= from && d.date <= to) for (const e of d.cardio ?? []) add(e.ex, e.sec)
  return { seconds: Object.values(byEx).reduce((a, b) => a + b, 0), byEx }
}

export const fmtDuration = (sec: number) => {
  if (sec < 60) return `${Math.round(sec)} sec`
  const m = Math.round(sec / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}
