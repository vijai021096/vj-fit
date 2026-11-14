import type { SessionLog } from '../types'
import { e1rm } from '../engine/progression'

export interface SessionBest { date: string; score: number; w: number; reps: number }
export interface Stalled { ex: string; sessionsSinceBest: number; daysSinceBest: number; w: number; reps: number }

const dayDiff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

/** Best set of each finished session for one exercise, oldest first. Bodyweight/hold work is scored by reps. */
export function exerciseSeries(sessions: SessionLog[], ex: string): SessionBest[] {
  const out: SessionBest[] = []
  for (const s of sessions) {
    if (!s.finishedAt) continue
    let best: SessionBest | null = null
    for (const [step, sets] of Object.entries(s.sets)) {
      if (s.exOf[step] !== ex) continue
      for (const x of sets) {
        if (!x.done) continue
        const score = x.w > 0 ? e1rm(x.w, x.r) : x.r
        if (!best || score > best.score) best = { date: s.date, score, w: x.w, reps: x.r }
      }
    }
    if (best) out.push(best)
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * A lift is "stalled" when its best session was at least 3 sessions and 14 days ago and nothing since has beaten it
 * (within 0.5%). Only lifts trained recently are flagged, so abandoned exercises stay quiet.
 */
export function stalledLifts(sessions: SessionLog[], today: string): Stalled[] {
  const exs = new Set<string>()
  for (const s of sessions) if (s.finishedAt) Object.values(s.exOf).forEach((e) => exs.add(e))
  const out: Stalled[] = []
  for (const ex of exs) {
    const series = exerciseSeries(sessions, ex)
    if (series.length < 4) continue
    const max = Math.max(...series.map((x) => x.score))
    const idx = series.findIndex((x) => x.score >= max * 0.995)
    const since = series.length - 1 - idx
    const last = series[series.length - 1]
    const days = dayDiff(series[idx].date, last.date)
    if (since >= 3 && days >= 14 && dayDiff(last.date, today) <= 21) out.push({ ex, sessionsSinceBest: since, daysSinceBest: days, w: series[idx].w, reps: series[idx].reps })
  }
  return out.sort((a, b) => b.daysSinceBest - a.daysSinceBest)
}

export interface DeloadAdvice { level: 'none' | 'watch' | 'deload'; text: string }
/** One stalled lift = tweak that lift; three or more across the body = the whole week is the problem. */
export function deloadAdvice(stalled: Stalled[]): DeloadAdvice {
  if (stalled.length >= 3) return { level: 'deload', text: `${stalled.length} lifts have stalled together. That usually means fatigue, not weakness. Take one lighter week: about 90% of your usual weights, same exercises, stop each set with 2 reps in hand. Sleep and protein matter more than extra sets.` }
  if (stalled.length >= 1) return { level: 'watch', text: 'One or two stalled lifts is normal. Try a lighter set of 12, a slower lowering phase, or 2 extra minutes of rest before changing anything else.' }
  return { level: 'none', text: '' }
}
