import type { Diet, Person } from '../types'
import type { MealOption, MealPlan, SlotDef, SlotId } from '../data/meals.types'
import { vijaiMeals } from '../data/meals.vijai'

export const DEFAULT_PLANS: Record<Person, MealPlan> = { vijai: vijaiMeals }
/** The meal plan in use — the coach's, or your edited copy (see lib/content.ts). */
export const PLANS: Record<Person, MealPlan> = { ...DEFAULT_PLANS }
export const WEEK_THEMES = ['Classic', 'South Indian', 'North Indian', 'Mix'] as const
export const WHEY_CAP = 2

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15
  return h >>> 0
}
const themeMatch = (o: MealOption, week: number) => (week === 1 ? !o.tag : week === 2 ? o.tag === 'S' : week === 3 ? o.tag === 'N' : true)
type DietArg = Diet | boolean
const norm = (d: DietArg): Diet => (d === true ? 'veg' : d === false ? 'nonveg' : d)
export const allowed = (slot: SlotDef, diet: DietArg) => {
  const d = norm(diet)
  const p = slot.options.filter((o) => (d === 'nonveg' ? true : d === 'egg' ? !o.meat : !o.meat && !o.egg))
  return p.length ? p : slot.options
}

/** 28-day sequence for one slot. Deterministic; never the same option on consecutive days when ≥ 2 options exist. */
export function slotSequence(person: Person, slot: SlotDef, veg: DietArg = 'nonveg'): string[] {
  const pool = allowed(slot, veg)
  const seq: string[] = []
  for (let d = 0; d < 28; d++) {
    const week = Math.floor(d / 7) + 1
    const h = hash(`${person}|${week}|${d % 7}|${slot.id}`)
    const cands = pool.length > 1 ? pool.filter((o) => o.id !== seq[d - 1]) : pool
    const themed = cands.filter((o) => themeMatch(o, week))
    const from = themed.length && h % 10 < 8 ? themed : cands
    seq.push(from[(h >>> 4) % from.length].id)
  }
  if (pool.length > 2 && seq[27] === seq[0]) {
    const alt = pool.find((o) => o.id !== seq[26] && o.id !== seq[0])
    if (alt) seq[27] = alt.id
  }
  return seq
}

const cache = new Map<string, Record<string, string[]>>()
export const clearRotationCache = () => cache.clear()
function sequences(person: Person, veg: DietArg, plan: MealPlan = PLANS[person]) {
  const key = `${person}|${norm(veg)}|${plan === PLANS[person] ? 'std' : 'custom'}`
  if (plan !== PLANS[person]) return Object.fromEntries(plan.slots.map((s) => [s.id, slotSequence(person, s, veg)]))
  if (!cache.has(key)) cache.set(key, Object.fromEntries(plan.slots.map((s) => [s.id, slotSequence(person, s, veg)])))
  return cache.get(key)!
}

export const optionById = (plan: MealPlan, id: string): MealOption | undefined => {
  for (const s of plan.slots) { const o = s.options.find((x) => x.id === id); if (o) return o }
}

/** Max 2 scoops of whey per day: later whey meals are auto-swapped to the closest non-whey option. */
export function enforceWheyCap(picks: Record<string, string>, plan: MealPlan, veg: DietArg = 'nonveg', cap = WHEY_CAP): Record<string, string> {
  const out = { ...picks }
  const scoops = () => plan.slots.reduce((s, sl) => s + (optionById(plan, out[sl.id])?.whey ?? 0), 0)
  for (let i = plan.slots.length - 1; i >= 0 && scoops() > cap; i--) {
    const sl = plan.slots[i]
    const cur = optionById(plan, out[sl.id])
    if (!cur?.whey) continue
    const alts = allowed(sl, veg).filter((o) => !o.whey).sort((a, b) => Math.abs(a.kcal - cur.kcal) - Math.abs(b.kcal - cur.kcal))
    if (alts[0]) out[sl.id] = alts[0].id
  }
  return out
}

/** The day's menu. weekInMonth 1–4, dayIdx 0 = Monday. */
export function dayMenu(person: Person, weekInMonth: number, dayIdx: number, veg: DietArg = 'nonveg', plan: MealPlan = PLANS[person]): Record<SlotId, string> {
  const seqs = sequences(person, veg, plan)
  const d = (weekInMonth - 1) * 7 + dayIdx
  const picks: Record<string, string> = {}
  plan.slots.forEach((s) => (picks[s.id] = seqs[s.id][d]))
  return enforceWheyCap(picks, plan, veg) as Record<SlotId, string>
}

/** Swap candidates from the same slot: within ±15% kcal and ±5 g protein; nearest first. */
export function swapOptions(slot: SlotDef, currentId: string, veg: DietArg = 'nonveg'): { strict: MealOption[]; loose: MealOption[] } {
  const cur = slot.options.find((o) => o.id === currentId)
  const pool = allowed(slot, veg).filter((o) => o.id !== currentId)
  if (!cur) return { strict: [], loose: pool }
  const dist = (o: MealOption) => Math.abs(o.kcal - cur.kcal) / Math.max(1, cur.kcal) + Math.abs(o.protein - cur.protein) / 30
  const ok = (o: MealOption) => Math.abs(o.kcal - cur.kcal) <= 0.15 * cur.kcal + 1e-9 && Math.abs(o.protein - cur.protein) <= 5
  const sorted = [...pool].sort((a, b) => dist(a) - dist(b))
  return { strict: sorted.filter(ok), loose: sorted.filter((o) => !ok(o)) }
}

export const wheyScoops = (picks: Record<string, string>, plan: MealPlan) =>
  plan.slots.reduce((s, sl) => s + (optionById(plan, picks[sl.id])?.whey ?? 0), 0)
