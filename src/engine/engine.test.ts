import { describe, expect, it } from 'vitest'
import { addDays, dateOf, istDate, position, programEnd, week1Start, weekdayOf } from './calendar'
import { suggest, rampSets, isPR } from './progression'
import { autoAdjust, bmr, carbLabel, mealTimes, scaleDay, targets, CUT_FLOOR, weeklyTrend } from './nutrition'
import { PLANS, dayMenu, enforceWheyCap, optionById, slotSequence, swapOptions, wheyScoops } from './rotation'
import { groceryList } from './grocery'
import { modSets, resolveDay0, resolveSession, weekMod } from './program'
import { EX } from '../data/exercises'
import type { MealPlan } from '../data/meals.types'
import type { Profile } from '../types'

const prof = (o: Partial<Profile>): Profile => ({ heightCm: 175, weightKg: 75, age: 28, sex: 'male', gymTime: '07:00', veg: false, kcalAdjust: 0, onboarded: true, ...o })

describe('calendar', () => {
  it('15 Nov 2026 is a Sunday and Day 0; Week 1 starts Mon 16 Nov', () => {
    expect(weekdayOf('2026-11-15')).toBe('sun')
    expect(week1Start('2026-11-15')).toBe('2026-11-16')
    expect(position('2026-11-15').phase).toBe('day0')
    const p = position('2026-11-16')
    expect(p).toMatchObject({ phase: 'program', weekIndex: 1, month: 1, weekInMonth: 1, dayNumber: 1, weekday: 'mon', cycle: 1 })
    expect(position('2026-11-17')).toMatchObject({ weekIndex: 1, dayNumber: 2, weekday: 'tue' })
    expect(position('2026-11-14').phase).toBe('before')
  })
  it('week/month math and the 12-week end date', () => {
    expect(position('2026-11-22')).toMatchObject({ weekIndex: 1, dayNumber: 7, weekday: 'sun' })
    expect(position('2026-11-23')).toMatchObject({ weekIndex: 2, weekInMonth: 2, month: 1 })
    expect(position('2026-12-14')).toMatchObject({ weekIndex: 5, weekInMonth: 1, month: 2 })
    expect(position('2027-01-11')).toMatchObject({ weekIndex: 9, weekInMonth: 1, month: 3 })
    expect(programEnd('2026-11-15')).toBe('2027-02-07')
    expect(position('2027-02-07')).toMatchObject({ weekIndex: 12, weekInMonth: 4, month: 3, cycle: 1 })
    expect(position('2027-02-08')).toMatchObject({ weekIndex: 1, month: 1, cycle: 2 })
    expect(dateOf('2026-11-15', 1, 12, 'sun')).toBe('2027-02-07')
  })
  it('"gym closed Sunday" merges Day 0 into Week 1 Monday', () => {
    expect(position('2026-11-15', '2026-11-15', true).phase).toBe('gap')
    expect(position('2026-11-16', '2026-11-15', true)).toMatchObject({ phase: 'program', mergedDay0: true })
    expect(position('2026-11-16', '2026-11-15', false).mergedDay0).toBe(false)
  })
  it('IST rollover happens at local midnight', () => {
    expect(istDate(new Date('2026-11-15T18:29:00Z'))).toBe('2026-11-15')
    expect(istDate(new Date('2026-11-15T18:30:00Z'))).toBe('2026-11-16')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('program', () => {
  it('week modifiers', () => {
    expect(weekMod(1, 1).name).toBe('Learn')
    expect(weekMod(2, 1).name).toBe('Reset')
    expect(weekMod(1, 2).name).toBe('Build')
    expect(weekMod(3, 3).name).toBe('Push')
    expect(weekMod(1, 4).name).toBe('Prove')
    expect(modSets(3, true, weekMod(1, 1))).toBe(2)
    expect(modSets(2, false, weekMod(1, 1))).toBe(2)
    expect(modSets(4, false, weekMod(1, 1))).toBe(3)
    expect(modSets(3, true, weekMod(1, 3))).toBe(4)
    expect(modSets(3, false, weekMod(1, 4))).toBe(3)
  })
  it('Mon: Upper A at Learn values with a fat-loss finisher', () => {
    const v = resolveSession('vijai', 1, 'mon')
    expect(v.def.title).toBe('Upper A'); expect(v.mod.name).toBe('Learn')
    expect(v.steps[0]).toMatchObject({ ex: 'bb-bench-press', reps: [6, 8] })
    expect(v.steps[v.steps.length - 1]).toMatchObject({ kind: 'cardio', ex: 'incline-walk', minutes: 15 })
    expect(resolveSession('vijai', 3, 'mon').steps.slice(-1)[0].minutes).toBe(20)
    expect(resolveSession('vijai', 1, 'wed').steps.filter((s) => s.group === 'A').map((s) => s.label)).toEqual(['A1', 'A2'])
  })
  it('month swaps apply', () => {
    expect(resolveSession('vijai', 1, 'tue').steps[0].ex).toBe('back-squat')
    const m2 = resolveSession('vijai', 5, 'mon').steps.map((s) => s.ex)
    expect(m2).toContain('neutral-grip-pulldown'); expect(m2).not.toContain('lat-pulldown')
    const m3 = resolveSession('vijai', 11, 'thu').steps
    expect(m3[0]).toMatchObject({ ex: 'trap-bar-deadlift', reps: [5, 5] })
  })
  it('every programmed exercise exists in the library', () => {
    for (const person of ['vijai'] as const)
      for (let w = 1; w <= 12; w++) for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const)
        for (const s of resolveSession(person, w, d, { squatApproved: w > 6 }).steps) if (s.kind !== 'mobility') expect(EX[s.ex], s.ex).toBeTruthy()
    for (const s of resolveDay0('vijai').steps) expect(EX[s.ex]).toBeTruthy()
    Object.values(EX).forEach((e) => e.alternatives.forEach((a) => expect(EX[a], `${e.id} → ${a}`).toBeTruthy()))
  })
})

describe('double progression', () => {
  const rx = { reps: [8, 10] as [number, number], sets: 3 }
  it('first time', () => expect(suggest([], rx, 'bb-upper').kind).toBe('first'))
  it('all sets at the top → load goes up by the right step', () => {
    expect(suggest([{ w: 40, reps: [10, 10, 10] }], rx, 'bb-upper')).toMatchObject({ kind: 'up', weight: 42.5, text: '↑ Try 42.5 kg today' })
    expect(suggest([{ w: 60, reps: [10, 10, 10] }], rx, 'bb-lower').weight).toBe(65)
    expect(suggest([{ w: 8, reps: [10, 10, 10] }], rx, 'db').weight).toBe(9)
    expect(suggest([{ w: 12, reps: [10, 11, 10] }], rx, 'db').weight).toBe(14)
    expect(suggest([{ w: 35, reps: [10, 10, 10] }], rx, 'machine').text).toContain('1 pin')
    expect(suggest([{ w: 40, reps: [10, 10, 10] }], rx, 'assist')).toMatchObject({ kind: 'up', weight: 35 })
  })
  it('inside the range → stay and aim for more reps', () => {
    const s = suggest([{ w: 40, reps: [10, 9, 8] }], rx, 'bb-upper')
    expect(s).toMatchObject({ kind: 'stay', weight: 40 })
    expect(s.targets).toEqual([10, 10, 9])
    expect(s.text).toBe('Stay at 40 kg — aim for 10 · 10 · 9')
  })
  it('below the range two sessions in a row → −10%', () => {
    expect(suggest([{ w: 40, reps: [7, 6, 6] }, { w: 40, reps: [8, 7, 6] }], rx, 'bb-upper')).toMatchObject({ kind: 'down', weight: 35 })
    expect(suggest([{ w: 40, reps: [7, 6, 6] }, { w: 40, reps: [9, 9, 8] }], rx, 'bb-upper').kind).toBe('stay')
    expect(suggest([{ w: 40, reps: [7, 6, 6] }], rx, 'bb-upper').kind).toBe('stay')
  })
  it('timed holds add 10 s once all sets are completed', () => {
    expect(suggest([{ w: 0, reps: [45, 45, 45] }], { hold: [45, 45], sets: 3 }, 'hold').text).toBe('↑ Try 55 s today')
    expect(suggest([{ w: 0, reps: [45, 30, 30] }], { hold: [45, 45], sets: 3 }, 'hold').kind).toBe('stay')
  })
  it('reset week uses ~90%, ramp sets and PR detection', () => {
    expect(suggest([{ w: 50, reps: [8, 8, 8] }], rx, 'bb-upper', { reset: true })).toMatchObject({ kind: 'reset', weight: 45 })
    expect(rampSets(60, 'bb-upper')).toEqual([{ w: 30, reps: 8 }, { w: 42.5, reps: 5 }, { w: 50, reps: 2 }])
    expect(isPR([{ w: 40, r: 8 }], 40, 9)).toBe(true)
    expect(isPR([{ w: 40, r: 8 }], 42.5, 6)).toBe(true)
    expect(isPR([{ w: 40, r: 8 }], 40, 8)).toBe(false)
    expect(isPR([], 40, 8)).toBe(false)
  })
})

describe('nutrition', () => {
  it('Mifflin-St Jeor and cut targets', () => {
    expect(bmr(prof({}))).toBeCloseTo(1708.75)
    const me = prof({ weightKg: 86, heightCm: 175, age: 34 })
    const v = targets('vijai', me)
    expect(v.kcal).toBe(Math.round(bmr(me) * 1.45 - 550))
    expect(v.kcal).toBeGreaterThan(1950); expect(v.kcal).toBeLessThan(2150)
    expect(v.protein).toBe(Math.round(1.9 * 86))
    expect(v.fat).toBe(Math.round((v.kcal * 0.25) / 9))
  })
  it('never goes below the 1,800 kcal floor', () => {
    expect(targets('vijai', prof({ weightKg: 86, heightCm: 175, age: 34, kcalAdjust: -900 })).kcal).toBe(CUT_FLOOR)
  })
  it('auto-adjust rules (cut)', () => {
    expect(autoAdjust('vijai', -0.1, 2050, 0.9).delta).toBe(-100)
    expect(autoAdjust('vijai', -0.1, 2050, 0.5).delta).toBe(0)
    expect(autoAdjust('vijai', -0.1, 1850, 0.9).delta).toBe(-50)
    expect(autoAdjust('vijai', -0.1, 1800, 0.9).delta).toBe(0)
    expect(autoAdjust('vijai', -1.2, 2050).delta).toBe(100)
    expect(autoAdjust('vijai', -0.5, 2050).delta).toBe(0)
  })
  it('trend needs enough data', () => {
    expect(weeklyTrend([{ date: '2026-11-20', kg: 75 }], '2026-11-30')).toBeNull()
    const pts = [...Array(21)].map((_, i) => ({ date: addDays('2026-11-16', i), kg: 75 + i * 0.05 }))
    expect(weeklyTrend(pts, '2026-12-06')!).toBeCloseTo(0.35, 2)
  })
  it('only carbs scale, within bounds, toward the target', () => {
    const plan = PLANS.vijai
    const chosen = plan.slots.map((s) => ({ slot: s.id, option: s.options[0] }))
    const base = chosen.reduce((s, c) => s + c.option.kcal, 0)
    const lower = scaleDay(chosen, base - 300)
    expect(lower.totalKcal).toBeLessThan(base)
    expect(Math.abs(lower.totalKcal - (base - 300))).toBeLessThanOrEqual(60)
    expect(lower.totalProtein).toBeLessThanOrEqual(chosen.reduce((s, c) => s + c.option.protein, 0))
    const way = scaleDay(chosen, 500)
    expect(way.qty.lunch).toBe(1); expect(way.qty.dinner).toBe(0)
    expect(carbLabel('rice', 1.5)).toBe('1½ cups rice'); expect(carbLabel('roti', 3)).toBe('3 roti'); expect(carbLabel('rice', 0.75)).toBe('¾ cup rice')
  })
  it('meal timeline brackets the workout for morning and evening', () => {
    const slots = PLANS.vijai.slots.map((s) => s.id)
    for (const g of ['06:30', '18:30']) {
      const t = mealTimes(slots, g)
      const gm = Number(g.slice(0, 2)) * 60 + 30
      expect(gm - t.pre!).toBeGreaterThanOrEqual(60); expect(gm - t.pre!).toBeLessThanOrEqual(75)
      expect(t.post! - (gm + 60)).toBeLessThanOrEqual(60); expect(t.post!).toBeGreaterThan(gm + 60)
    }
  })
})

describe('rotation', () => {
  it('is deterministic', () => {
    expect(dayMenu('vijai', 2, 3)).toEqual(dayMenu('vijai', 2, 3))
  })
  it('never repeats lunch or dinner on consecutive days (incl. across weeks and the 4-week wrap)', () => {
    for (const person of ['vijai'] as const) for (const veg of [false, true]) for (const slot of ['lunch', 'dinner'] as const) {
      const days = [...Array(29)].map((_, d) => dayMenu(person, (Math.floor(d / 7) % 4) + 1, d % 7, veg)[slot])
      for (let i = 1; i < days.length; i++) expect(days[i], `${person} ${slot} day ${i}`).not.toBe(days[i - 1])
    }
  })
  it('each week gets a different menu and themes are preferred', () => {
    const wk = (w: number) => [...Array(7)].map((_, d) => dayMenu('vijai', w, d).lunch).join()
    expect(new Set([wk(1), wk(2), wk(3), wk(4)]).size).toBe(4)
    const lunch = PLANS.vijai.slots.find((s) => s.id === 'lunch')!
    const seq = slotSequence('vijai', lunch)
    const south = seq.slice(7, 14).filter((id) => optionById(PLANS.vijai, id)!.tag === 'S').length
    const southW3 = seq.slice(14, 21).filter((id) => optionById(PLANS.vijai, id)!.tag === 'S').length
    expect(south).toBeGreaterThan(southW3)
  })
  it('egg mode removes chicken and fish meals', () => {
    for (let d = 0; d < 28; d++) {
      const m = dayMenu('vijai', Math.floor(d / 7) + 1, d % 7, 'egg')
      for (const slot of ['breakfast', 'lunch', 'post'] as const) expect(optionById(PLANS.vijai, m[slot])!.meat).toBeFalsy()
    }
  })
  it('whey cap: never more than 2 scoops a day', () => {
    for (const person of ['vijai'] as const) for (let d = 0; d < 28; d++)
      expect(wheyScoops(dayMenu(person, Math.floor(d / 7) + 1, d % 7), PLANS[person])).toBeLessThanOrEqual(2)
    const plan: MealPlan = { tips: [], slots: (['breakfast', 'mid', 'post', 'bed'] as const).map((id) => ({ id, label: id, options: [
      { id: `${id}-w`, name: 'whey', kcal: 120, protein: 24, whey: 1, g: '' }, { id: `${id}-x`, name: 'other', kcal: 150, protein: 12, g: '' }] })) }
    const picks = { breakfast: 'breakfast-w', mid: 'mid-w', post: 'post-w', bed: 'bed-w' }
    const capped = enforceWheyCap(picks, plan)
    expect(wheyScoops(capped, plan)).toBe(2)
    expect(capped).toEqual({ breakfast: 'breakfast-w', mid: 'mid-w', post: 'post-x', bed: 'bed-x' })
  })
  it('swap stays within ±15% kcal and ±5 g protein when possible', () => {
    const lunch = PLANS.vijai.slots.find((s) => s.id === 'lunch')!
    const { strict } = swapOptions(lunch, 'j-l1')
    expect(strict.length).toBeGreaterThan(0)
    strict.forEach((o) => { expect(Math.abs(o.kcal - 590)).toBeLessThanOrEqual(0.15 * 590); expect(Math.abs(o.protein - 60)).toBeLessThanOrEqual(5) })
  })
})

describe('grocery', () => {
  it('builds an aisle-grouped list with chicken and eggs', () => {
    const list = groceryList(1, [{ person: 'vijai', profile: prof({ weightKg: 86, age: 34 }) }], { creatine: true })
    const aisles = list.map((g) => g.aisle)
    expect(aisles).toContain('Meat & Fish'); expect(aisles).toContain('Supplements')
    expect(list.find((g) => g.aisle === 'Eggs')!.items[0].qty).toBeGreaterThan(10)
  })
})
