import type { Person } from '../types'
import type { WeightRow } from '../db'
import { PROGRAMS } from '../engine/program'
import type { DayStat, Summary } from './insights'
import { deloadAdvice, type Stalled } from './plateau'

export interface Review {
  weightDelta: number | null      // kg change over the week, null when there isn't a before/after pair
  workouts: number; planned: number
  proteinDays: number; eatDays: number
  avgEaten: number; kcalTarget: number
  focus: string
}

export const plannedPerWeek = (person: Person) => Object.values(PROGRAMS[person].days).filter((d) => d.kind !== 'rest' && d.kind !== 'active').length

/** Weight change across a 7-day window: last reading inside it versus the last reading before it. */
export function weekWeightDelta(weights: WeightRow[], from: string, to: string): number | null {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const before = [...sorted].reverse().find((w) => w.date < from)
  const inside = [...sorted].reverse().find((w) => w.date >= from && w.date <= to)
  if (!before || !inside) return null
  return Math.round((inside.kg - before.kg) * 10) / 10
}

/** The single most useful thing to change next week, goal-aware. Order matters: fix logging first, then the biggest lever. */
export function weeklyReview(person: Person, stats: DayStat[], sum: Summary, t: { kcal: number; protein: number }, weights: WeightRow[], stalled: Stalled[], skippedDays = 0): Review {
  const from = stats[0]?.date ?? '', to = stats[stats.length - 1]?.date ?? ''
  const planned = Math.max(1, plannedPerWeek(person) - skippedDays)   // days you said you'd miss don't count against you
  const proteinDays = stats.filter((d) => d.eaten > 0 && d.protein >= t.protein * 0.9).length
  const weightDelta = weekWeightDelta(weights, from, to)
  const gap = sum.avgEaten - t.kcal
  let focus: string
  if (sum.eatDays < 4) focus = 'Log your meals on at least 5 days. Everything else is a guess until you do.'
  else if (deloadAdvice(stalled).level === 'deload') focus = 'Several lifts have stalled together. Take one lighter week (about 90% of your weights).'
  else if (proteinDays < sum.eatDays * 0.6) focus = `Protein is the gap: you hit ${t.protein} g on only ${proteinDays} of ${sum.eatDays} days. Add one high-protein snack.`
  else if (person === 'vikas' && gap < -150) focus = `You ate about ${Math.abs(gap)} kcal a day under target. Add a snack or bigger portions to keep the bulk moving.`
  else if (person === 'varsha' && gap > 150) focus = `You ate about ${gap} kcal a day over target. Check portions and anything added outside the plan.`
  else if (sum.workouts < planned * 0.7) focus = `${sum.workouts} of ${planned} workouts done. Protect the days you can: even a shorter session beats a skipped one.`
  else if (person === 'vikas' && weightDelta != null && weightDelta <= 0 && sum.eatDays >= 5) focus = 'Weight is flat while you are bulking. Add about 150 kcal a day if it stays flat next week.'
  else if (person === 'varsha' && weightDelta != null && weightDelta >= 0.3 && sum.eatDays >= 5) focus = 'Weight went up this week. One week is noise, so repeat it and check the trend before changing anything.'
  else focus = 'This was a solid week. Repeat it, and try to add a rep or a little weight on your first lift.'
  return { weightDelta, workouts: sum.workouts, planned, proteinDays, eatDays: sum.eatDays, avgEaten: sum.avgEaten, kcalTarget: t.kcal, focus }
}
