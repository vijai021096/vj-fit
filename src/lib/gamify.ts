import type { WeightRow } from '../db'
import type { SessionLog } from '../types'
import type { DayStat } from './insights'
import { addDays } from '../engine/calendar'
import { movingAvg, weeklyTrend } from '../engine/nutrition'

/* ───────────────────────── XP, levels, streaks ───────────────────────── */

export interface DayGoals { workout: boolean; protein: boolean; calories: boolean; steps: boolean; water: boolean; weighIn: boolean }
export const XP_RULES: { key: keyof DayGoals; label: string; xp: number }[] = [
  { key: 'workout', label: 'Workout done', xp: 100 },
  { key: 'protein', label: 'Protein target hit', xp: 40 },
  { key: 'calories', label: 'Calories on target', xp: 30 },
  { key: 'steps', label: 'Steps goal', xp: 30 },
  { key: 'water', label: 'Water goal', xp: 15 },
  { key: 'weighIn', label: 'Weighed in', xp: 10 },
]
export const PR_XP = 25

export interface Targets { kcal: number; protein: number; steps: number; waterL: number }

export function goalsFor(d: DayStat, t: Targets, weighed: boolean): DayGoals {
  return {
    workout: d.sessions > 0,
    protein: d.protein >= t.protein * 0.9,
    // On target = something eaten, and not over by more than 10% (or wildly under).
    calories: d.eaten > 0 && d.eaten <= t.kcal * 1.1 && d.eaten >= t.kcal * 0.7,
    steps: d.steps >= t.steps,
    water: d.water >= t.waterL,
    weighIn: weighed,
  }
}
export const xpOfDay = (g: DayGoals, prs = 0) => XP_RULES.reduce((n, r) => n + (g[r.key] ? r.xp : 0), 0) + prs * PR_XP

/** A day "counts" for the streak when at least 3 of the 5 daily habits are hit (weigh-in is a bonus). */
export const dayCounts = (g: DayGoals) => [g.workout, g.protein, g.calories, g.steps, g.water].filter(Boolean).length >= 3

const TITLES = ['Rookie', 'Grinder', 'Iron', 'Shredder', 'Beast', 'Machine', 'Spartan', 'Titan', 'Legend', 'Mythic']
/** Total XP needed to reach level n (level 1 = 0). Grows ~n^1.5 so early levels come fast. */
export const xpForLevel = (n: number) => (n <= 1 ? 0 : Math.round(300 * Math.pow(n - 1, 1.5)))
export function levelOf(xp: number): { level: number; title: string; into: number; need: number; pct: number } {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  const lo = xpForLevel(level), hi = xpForLevel(level + 1)
  return { level, title: TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 2))], into: xp - lo, need: hi - lo, pct: (xp - lo) / (hi - lo) }
}

export interface Gamify { total: number; today: DayGoals; todayXp: number; streak: number; best: number; week: number }
export function gamify(stats: DayStat[], t: Targets, weights: WeightRow[], sessions: SessionLog[]): Gamify {
  const weighed = new Set(weights.map((w) => w.date))
  const prsBy = new Map<string, number>()
  sessions.forEach((s) => { if (s.finishedAt && s.prs?.length) prsBy.set(s.date, (prsBy.get(s.date) ?? 0) + s.prs.length) })
  const per = stats.map((d) => { const g = goalsFor(d, t, weighed.has(d.date)); return { date: d.date, g, xp: xpOfDay(g, prsBy.get(d.date) ?? 0) } })
  const total = per.reduce((n, p) => n + p.xp, 0)
  const last = per[per.length - 1]
  // Streak: today extends it once it counts, but an unfinished today never breaks it.
  let streak = 0
  for (let i = per.length - 1; i >= 0; i--) {
    if (dayCounts(per[i].g)) streak++
    else if (i === per.length - 1) continue
    else break
  }
  let best = 0, run = 0
  per.forEach((p) => { run = dayCounts(p.g) ? run + 1 : 0; best = Math.max(best, run) })
  const week = per.slice(-7).reduce((n, p) => n + p.xp, 0)
  return { total, today: last?.g ?? goalsFor({ date: '', eaten: 0, protein: 0, workoutBurn: 0, stepBurn: 0, burn: 0, steps: 0, water: 0, minutes: 0, volume: 0, sessions: 0, logged: false }, t, false), todayXp: last?.xp ?? 0, streak, best: Math.max(best, streak), week }
}

/* ───────────────────────── Goal countdown ───────────────────────── */

export interface GoalForecast {
  start: number; now: number; goal: number
  lost: number; left: number; pct: number
  /** kg/week, negative = losing. null until there's two weeks of weigh-ins. */
  rate: number | null
  /** Predicted finish date at the real rate (or the planned rate when rate is null). */
  eta: string | null
  etaFromPlan: boolean
  status: 'ahead' | 'on-track' | 'behind' | 'gaining' | 'unknown' | 'done'
}
/** Planned fat-loss pace for this cut (kg/week). */
export const PLAN_RATE = -0.6

export function forecast(weights: WeightRow[], profileKg: number, goal: number, today: string): GoalForecast {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const avg = movingAvg(sorted)
  const start = sorted[0]?.kg ?? profileKg
  const now = avg.length ? avg[avg.length - 1].avg : profileKg
  const lost = Math.max(0, start - now)
  const left = Math.max(0, now - goal)
  const pct = start > goal ? Math.min(1, Math.max(0, (start - now) / (start - goal))) : 1
  const rate = weeklyTrend(sorted, today)
  if (left <= 0.05) return { start, now, goal, lost, left: 0, pct: 1, rate, eta: today, etaFromPlan: false, status: 'done' }
  const useReal = rate != null && rate < -0.05
  const r = useReal ? rate! : PLAN_RATE
  const weeks = left / -r
  const eta = weeks < 260 ? addDays(today, Math.round(weeks * 7)) : null
  const status: GoalForecast['status'] = rate == null ? 'unknown' : rate >= 0.05 ? 'gaining' : rate <= -0.75 ? 'ahead' : rate <= -0.4 ? 'on-track' : 'behind'
  return { start, now, goal, lost, left, pct, rate, eta, etaFromPlan: !useReal, status }
}
