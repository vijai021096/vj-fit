import type { Block, Person, ProgramDef } from '../types'
import { PEOPLE, WEEKDAYS } from '../types'
import type { MealPlan } from '../data/meals.types'
import { DEFAULT_PROGRAMS, PROGRAMS } from '../engine/program'
import { DEFAULT_PLANS, PLANS, clearRotationCache } from '../engine/rotation'
import { EX } from '../data/exercises'
import { CARBS } from '../data/foods'
import { useStore } from '../store'

const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x)
const exOk = (id: unknown) => typeof id === 'string' && !!EX[id]

function blockOk(b: Block): boolean {
  if (!b || typeof b !== 'object') return false
  if (b.type === 'lift') return exOk(b.ex) && num(b.sets) && num(b.rest) && (!!b.reps || !!b.hold)
  if (b.type === 'superset') return Array.isArray(b.items) && b.items.length > 0 && b.items.every((i) => exOk(i.ex) && num(i.sets) && (!!i.reps || !!i.hold)) && num(b.rest)
  if (b.type === 'circuit') return Array.isArray(b.items) && b.items.length > 0 && b.items.every((i) => exOk(i.ex)) && num(b.rounds) && num(b.rest)
  if (b.type === 'cardio') return exOk(b.ex) && num(b.minutes)
  if (b.type === 'mobility') return num(b.minutes)
  return false
}
/** Shape check so a bad edit (or a bad synced record) can never crash the app. */
export function programOk(p: ProgramDef | undefined): p is ProgramDef {
  try {
    if (!p || !p.days || !p.months) return false
    return WEEKDAYS.every((d) => { const s = p.days[d]; return s && typeof s.title === 'string' && Array.isArray(s.blocks) && s.blocks.every(blockOk) })
  } catch { return false }
}
export function planOk(p: MealPlan | undefined): p is MealPlan {
  try {
    if (!p || !Array.isArray(p.slots) || !p.slots.length) return false
    return p.slots.every((s) => typeof s.id === 'string' && Array.isArray(s.options) && s.options.length > 0 &&
      s.options.every((o) => typeof o.id === 'string' && typeof o.name === 'string' && num(o.kcal) && num(o.protein) && (!o.carb || (CARBS[o.carb.unit] && num(o.carb.qty)))))
  } catch { return false }
}

/** Point the engines at the edited content (or back to the coach's). */
export function applyContent() {
  const { content } = useStore.getState()
  for (const p of PEOPLE as Person[]) {
    const prog = content.programs[p]
    PROGRAMS[p] = programOk(prog) ? prog : DEFAULT_PROGRAMS[p]
    const meal = content.meals[p]
    PLANS[p] = planOk(meal) ? meal : DEFAULT_PLANS[p]
  }
  clearRotationCache()
}

let last: unknown
export function watchContent() {
  applyContent()
  last = useStore.getState().content
  useStore.subscribe((s) => {
    if (s.content === last) return
    const changed = JSON.stringify(s.content) !== JSON.stringify(last)
    last = s.content
    if (!changed) return
    applyContent()
    useStore.setState({ contentRev: s.contentRev + 1 })
  })
}
export const isEdited = (person: Person, what: 'programs' | 'meals') => !!useStore.getState().content[what][person]

/* ---- editing helpers: always copy-on-write from the coach's plan ---- */
export function editProgram(person: Person, fn: (p: ProgramDef) => void) {
  useStore.getState().set((x) => {
    const base = x.content.programs[person] ?? structuredClone(DEFAULT_PROGRAMS[person])
    fn(base)
    x.content.programs[person] = base
    x.contentAt[`program:${person}`] = Date.now()
  })
}
export function editMeals(person: Person, fn: (p: MealPlan) => void) {
  useStore.getState().set((x) => {
    const base = x.content.meals[person] ?? structuredClone(DEFAULT_PLANS[person])
    fn(base)
    x.content.meals[person] = base
    x.contentAt[`meals:${person}`] = Date.now()
  })
}
export function resetContent(person: Person, what: 'programs' | 'meals') {
  useStore.getState().set((x) => {
    delete x.content[what][person]
    x.contentAt[`${what === 'programs' ? 'program' : 'meals'}:${person}`] = Date.now()
  })
}
