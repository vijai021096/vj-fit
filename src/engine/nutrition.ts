import { isCut, type Person, type Profile } from '../types'
import { CARBS, type CarbUnit } from '../data/foods'
import type { MealOption, SlotId } from '../data/meals.types'

/** Never prescribe below this while cutting (male). */
export const CUT_FLOOR = 1800
/** Deficit used while cutting: ~0.5–0.7 kg/week of fat loss at your size. */
export const CUT_DEFICIT = 550
/** Desk job + 5 gym days. Steps on top are your buffer. */
export const ACTIVITY = 1.45
export const PROTEIN_PER_KG = 1.9

/** Mifflin-St Jeor */
export function bmr(p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
}
export const tdee = (p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex'>) => bmr(p) * ACTIVITY

export interface Targets { bmr: number; tdee: number; kcal: number; protein: number; fat: number; carbs: number; floored: boolean }
export function targets(person: Person, p: Profile): Targets {
  const t = tdee(p)
  const raw = !isCut(person) ? t + 300 + (p.kcalAdjust || 0) : t - CUT_DEFICIT + (p.kcalAdjust || 0)
  const floored = isCut(person) && raw < CUT_FLOOR
  const kcal = Math.round(floored ? CUT_FLOOR : raw)
  const protein = Math.round((p.proteinPerKg || PROTEIN_PER_KG) * p.weightKg)
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { bmr: Math.round(bmr(p)), tdee: Math.round(t), kcal, protein, fat, carbs, floored }
}

export interface WeightPoint { date: string; kg: number }
/** 7-day moving average ending on each logged date. */
export function movingAvg(points: WeightPoint[], window = 7): (WeightPoint & { avg: number })[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const day = (s: string) => Date.parse(`${s}T00:00:00Z`) / 86400000
  return sorted.map((p) => {
    const w = sorted.filter((q) => day(p.date) - day(q.date) >= 0 && day(p.date) - day(q.date) < window)
    return { ...p, avg: w.reduce((s, q) => s + q.kg, 0) / w.length }
  })
}
/** kg/week from the 7-day average now vs the 7-day average `days` ago. null if not enough data. */
export function weeklyTrend(points: WeightPoint[], today: string, days = 14): number | null {
  const day = (s: string) => Date.parse(`${s}T00:00:00Z`) / 86400000
  const t = day(today)
  const win = (from: number, to: number) => points.filter((p) => t - day(p.date) >= from && t - day(p.date) < to)
  const a = win(0, 7), b = win(days, days + 7)
  if (a.length < 3 || b.length < 3) return null
  const avg = (x: WeightPoint[]) => x.reduce((s, p) => s + p.kg, 0) / x.length
  return ((avg(a) - avg(b)) / days) * 7
}

export interface Adjust { delta: number; reason: string }
/** Section 8A auto-adjust, evaluated every 14 days. trend is kg/week (positive = gaining). */
export function autoAdjust(person: Person, trend: number, currentKcal: number, adherence = 1): Adjust {
  const f = (n: number) => `${Math.abs(n).toFixed(2)} kg/week`
  if (!isCut(person)) {
    if (trend < 0.2) return { delta: 150, reason: `You’re gaining ${trend < 0 ? '−' : ''}${f(trend)}, under the 0.25–0.35 target, so we added about 150 kcal.` }
    if (trend > 0.5) return { delta: -150, reason: `You’re gaining ${f(trend)}, faster than planned, so we trimmed about 150 kcal to keep it lean.` }
    return { delta: 0, reason: `Gaining ${f(trend)} — right on track. No change.` }
  }
  const loss = -trend
  if (loss > 1) return { delta: 100, reason: `Your average is dropping ${f(loss)}, faster than planned, so we added about 100 kcal to protect your strength and energy.` }
  if (loss < 0.2) {
    if (adherence < 0.8) return { delta: 0, reason: 'Progress has been slow, but meals were logged on fewer than 80% of days — let’s get consistent before changing anything.' }
    if (currentKcal <= CUT_FLOOR) return { delta: 0, reason: `You’re already at the ${CUT_FLOOR} kcal floor, so calories stay put. Steps and sleep are the levers now.` }
    const delta = -Math.min(100, currentKcal - CUT_FLOOR)
    return { delta, reason: `Your average has been nearly flat for two weeks with great consistency, so we trimmed about ${-delta} kcal.` }
  }
  return { delta: 0, reason: `Your average is moving ${f(loss)} — right on track. No change.` }
}

// ── Portions ────────────────────────────────────────────────────────────────
const FRAC: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' }
function mixed(n: number): string {
  const whole = Math.floor(n + 1e-9)
  const f = FRAC[String(Math.round((n - whole) * 100) / 100)] ?? ''
  return whole === 0 ? f || '0' : `${whole}${f}`
}
export function carbLabel(unit: CarbUnit, qty: number): string {
  if (unit === 'oats') return `${Math.round(qty)} g oats`
  if (unit === 'rice' || unit === 'millet') return `${mixed(qty)} ${qty > 1 ? 'cups' : 'cup'} ${unit}`
  return `${mixed(qty)} ${unit === 'ragi-dosa' ? 'ragi dosa' : unit}`
}
export const mealName = (o: MealOption, qty?: number) => (o.carb ? o.name.replace('{c}', carbLabel(o.carb.unit, qty ?? o.carb.qty)) : o.name)

export interface Chosen { slot: SlotId; option: MealOption }
export interface Scaled { qty: Partial<Record<SlotId, number>>; kcal: Partial<Record<SlotId, number>>; protein: Partial<Record<SlotId, number>>; totalKcal: number; totalProtein: number }

/** Only carb portions scale to hit the calorie target; protein portions stay fixed. */
export function scaleDay(chosen: Chosen[], targetKcal: number): Scaled {
  const qty: Partial<Record<SlotId, number>> = {}
  chosen.forEach((c) => { if (c.option.carb) qty[c.slot] = c.option.carb.qty })
  const order: SlotId[] = ['lunch', 'dinner', 'breakfast']
  const scal = order.map((s) => chosen.find((c) => c.slot === s)).filter((c): c is Chosen => !!c?.option.carb)
  const total = () => chosen.reduce((s, c) => s + c.option.kcal + (c.option.carb ? (qty[c.slot]! - c.option.carb.qty) * CARBS[c.option.carb.unit].kcal : 0), 0)
  for (let guard = 0; guard < 60; guard++) {
    const diff = targetKcal - total()
    let moved = false
    for (const c of scal) {
      const carb = c.option.carb!
      const def = CARBS[carb.unit]
      const stepK = def.step * def.kcal
      const d = targetKcal - total()
      const q = qty[c.slot]!
      if (d >= stepK / 2 && q + def.step <= (carb.max ?? def.max) + 1e-9) { qty[c.slot] = q + def.step; moved = true }
      else if (d <= -stepK / 2 && q - def.step >= (carb.min ?? def.min) - 1e-9) { qty[c.slot] = q - def.step; moved = true }
    }
    if (!moved || Math.abs(diff) < 20) break
  }
  const kcal: Scaled['kcal'] = {}, protein: Scaled['protein'] = {}
  chosen.forEach((c) => {
    const extra = c.option.carb ? qty[c.slot]! - c.option.carb.qty : 0
    kcal[c.slot] = Math.round(c.option.kcal + (c.option.carb ? extra * CARBS[c.option.carb.unit].kcal : 0))
    protein[c.slot] = Math.round((c.option.protein + (c.option.carb ? extra * CARBS[c.option.carb.unit].protein : 0)) * 10) / 10
  })
  return { qty, kcal, protein, totalKcal: Math.round(total()), totalProtein: Math.round(Object.values(protein).reduce((s, v) => s + (v ?? 0), 0)) }
}

// ── Meal timeline ───────────────────────────────────────────────────────────
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const fmtMin = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  const h = Math.floor(x / 60), mm = x % 60
  return `${h % 12 === 0 ? 12 : h % 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
/**
 * Meal times from the gym time. Pre-workout 60–75 min before; post-workout within 60 min after;
 * other meals 3–4 h apart. Works for morning and evening training.
 */
export function mealTimes(slots: SlotId[], gymTime: string, durationMin = 60): Partial<Record<SlotId, number>> {
  const g = toMin(gymTime)
  const end = g + durationMin
  const t: Partial<Record<SlotId, number>> = {}
  const has = (s: SlotId) => slots.includes(s)
  const preSlot: SlotId | null = has('pre') ? 'pre' : null
  if (g < 12 * 60) {
    // morning training: early → (pre) → gym → post → breakfast → mid → lunch → evening → dinner → bed
    if (preSlot) { t.pre = g - 65; t.early = g - 110 } else t.early = g - 60
    t.post = end + 20
    t.breakfast = end + 80
    t.mid = t.breakfast + 150
    t.lunch = Math.max(t.mid + 120, 13 * 60)
    t.evening = t.lunch + 210
    t.dinner = Math.max(t.lunch + 390, 19 * 60 + 45)
    t.bed = t.dinner + 120
  } else {
    // afternoon / evening training
    t.early = 6 * 60 + 30
    t.breakfast = 8 * 60
    t.mid = 10 * 60 + 45
    t.lunch = Math.min(13 * 60 + 30, g - 150)
    if (preSlot) t.pre = g - 65
    t.evening = Math.max(t.lunch + 180, g - 70)
    if (t.evening > g - 60) t.evening = g - 70
    t.post = end + 20
    t.dinner = Math.max(end + 90, 20 * 60)
    t.bed = t.dinner + 110
  }
  const out: Partial<Record<SlotId, number>> = {}
  slots.forEach((s) => { if (t[s] !== undefined) out[s] = t[s] })
  return out
}

export const DEFAULT_WATER_L: Record<Person, number> = { vijai: 4 }
export const DEFAULT_STEPS: Record<Person, number> = { vijai: 10000 }
export const waterTarget = (person: Person, p: Profile) => p.waterL || DEFAULT_WATER_L[person]
export const stepsTarget = (person: Person, p: Profile) => p.stepsTarget || DEFAULT_STEPS[person]
