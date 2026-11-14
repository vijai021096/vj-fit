import type { Person, Profile } from '../types'
import { AISLES, CARBS, GROCERY, type Aisle } from '../data/foods'
import { PLANS, dayMenu, optionById } from './rotation'
import { scaleDay, targets, type Chosen } from './nutrition'

export interface GroceryItem { id: string; name: string; aisle: Aisle; qty: number; unit: string; label: string }

export function parseG(g: string): [string, number][] {
  return g ? g.split(',').map((x) => { const [k, v] = x.split(':'); return [k, Number(v)] as [string, number] }) : []
}

function nice(id: string, qty: number, unit: string): string {
  if (unit === 'g') return qty >= 1000 ? `${(Math.ceil(qty / 100) / 10).toFixed(1)} kg` : `${Math.ceil(qty / 50) * 50} g`
  if (unit === 'ml') return `${(Math.ceil(qty / 500) / 2).toFixed(1)} L`
  if (id === 'eggs') return `${Math.ceil(qty)} (${Math.ceil(qty / 6)} × 6)`
  return `${Math.ceil(qty)}${unit ? ` ${unit}` : ''}`
}

/** Combined household list for one menu week (W1–W4), grouped by aisle. */
export function groceryList(
  weekInMonth: number,
  people: { person: Person; profile: Profile }[],
  opts: { creatine?: boolean } = {},
): { aisle: Aisle; items: GroceryItem[] }[] {
  const sum = new Map<string, number>()
  const add = (k: string, v: number) => { if (GROCERY[k] && v > 0) sum.set(k, (sum.get(k) ?? 0) + v) }
  for (const { person, profile } of people) {
    const plan = PLANS[person]
    const target = targets(person, profile).kcal
    for (let d = 0; d < 7; d++) {
      const menu = dayMenu(person, weekInMonth, d, profile.veg)
      const chosen: Chosen[] = plan.slots.map((s) => ({ slot: s.id, option: optionById(plan, menu[s.id])! }))
      const scaled = scaleDay(chosen, target)
      for (const c of chosen) {
        parseG(c.option.g).forEach(([k, v]) => add(k, v))
        if (c.option.carb) { const [k, per] = CARBS[c.option.carb.unit].grocery; add(k, per * (scaled.qty[c.slot] ?? c.option.carb.qty)) }
      }
    }
    if (opts.creatine) add('creatine', 5 * 7)
  }
  return AISLES.map((aisle) => ({
    aisle,
    items: [...sum.entries()].filter(([k]) => GROCERY[k].aisle === aisle)
      .map(([id, qty]) => ({ id, name: GROCERY[id].name, aisle, qty, unit: GROCERY[id].unit, label: nice(id, qty, GROCERY[id].unit) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((g) => g.items.length)
}

export function groceryText(list: ReturnType<typeof groceryList>, title: string, checked: Record<string, boolean> = {}): string {
  return [`🛒 ${title}`, ...list.flatMap((g) => ['', `*${g.aisle}*`, ...g.items.map((i) => `${checked[i.id] ? '✅' : '▫️'} ${i.name} — ${i.label}`)])].join('\n')
}
