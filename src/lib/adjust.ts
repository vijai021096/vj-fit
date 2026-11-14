import { db } from '../db'
import { useStore } from '../store'
import type { Person } from '../types'
import { addDays, diffDays, istDate, position, week1Start } from '../engine/calendar'
import { autoAdjust, targets, weeklyTrend } from '../engine/nutrition'
import { PLANS } from '../engine/rotation'

/** Every 14 days, nudge calories from the 7-day average weight trend and record the reason in plain words. */
export async function maybeAdjust(person: Person) {
  const s = useStore.getState()
  const profile = s.profiles[person]
  const today = istDate()
  const pos = position(today, s.settings.programStart, s.settings.mergeDay0)
  if (!profile.onboarded || pos.phase !== 'program') return
  const since = profile.lastAdjust ?? week1Start(s.settings.programStart)
  if (diffDays(today, since) < 14) return
  const weights = await db.weights.where('person').equals(person).toArray()
  const trend = weeklyTrend(weights, today)
  if (trend === null) return
  const from = addDays(today, -14)
  const days = (await db.days.where('person').equals(person).toArray()).filter((d) => d.date > from)
  const need = PLANS[person].slots.filter((x) => !x.optional).length
  const adherence = days.filter((d) => Object.values(d.eaten).filter(Boolean).length >= 0.8 * need).length / 14
  const adj = autoAdjust(person, trend, targets(person, profile).kcal, adherence)
  s.set((st) => { const p = st.profiles[person]; p.kcalAdjust = (p.kcalAdjust || 0) + adj.delta; p.lastAdjust = today; p.adjustReason = adj.reason })
}
