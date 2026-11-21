import { describe, expect, it } from 'vitest'
import type { DayStat, Summary } from './insights'
import { weekWeightDelta, weeklyReview } from './weekly'

const day = (i: number, eaten: number, protein: number, sessions = 0): DayStat => ({ date: `2026-11-0${i + 1}`, eaten, protein, workoutBurn: 0, stepBurn: 0, burn: 2000, steps: 0, water: 0, minutes: 0, volume: 0, sessions, logged: true })
const sum = (o: Partial<Summary>): Summary => ({ daysLogged: 7, avgEaten: 2800, avgBurn: 2400, avgProtein: 130, avgSteps: 0, avgWater: 0, workouts: 5, minutes: 0, volume: 0, net: 400, eatDays: 7, ...o })
const W = (date: string, kg: number) => ({ id: date, person: 'vijai' as const, date, kg, updatedAt: 1 })

describe('weekWeightDelta', () => {
  it('compares last reading in the window to the last one before it', () => {
    expect(weekWeightDelta([W('2026-10-30', 70), W('2026-11-03', 70.4), W('2026-11-07', 70.6)], '2026-11-01', '2026-11-07')).toBe(0.6)
  })
  it('is null without a before/after pair', () => { expect(weekWeightDelta([W('2026-11-03', 70)], '2026-11-01', '2026-11-07')).toBeNull() })
})

describe('weeklyReview skipped days', () => {
  it('takes days you said you would miss off the planned count', () => {
    const s = Array.from({ length: 7 }, (_, i) => day(i, 2800, 130))
    const base = weeklyReview('vijai', s, sum({}), { kcal: 2800, protein: 130 }, [], []).planned
    expect(weeklyReview('vijai', s, sum({}), { kcal: 2800, protein: 130 }, [], [], 2).planned).toBe(base - 2)
  })
})

describe('weeklyReview focus', () => {
  const t = { kcal: 2800, protein: 130 }
  it('asks for logging first', () => {
    const s = [day(0, 0, 0), day(1, 0, 0), day(2, 2800, 130)]
    expect(weeklyReview('vijai', s, sum({ eatDays: 1 }), t, [], []).focus).toMatch(/Log your meals/)
  })
  it('flags protein', () => {
    const s = Array.from({ length: 7 }, (_, i) => day(i, 2800, 80))
    expect(weeklyReview('vijai', s, sum({}), t, [], []).focus).toMatch(/Protein/)
  })
  it('is goal aware about calories', () => {
    const s = Array.from({ length: 7 }, (_, i) => day(i, 2300, 130))
    expect(weeklyReview('vijai', s, sum({ avgEaten: 2000 }), { kcal: 1600, protein: 100 }, [], []).focus).toMatch(/over target/)
  })
  it('says well done when everything is on track', () => {
    const s = Array.from({ length: 7 }, (_, i) => day(i, 2800, 130))
    expect(weeklyReview('vijai', s, sum({ avgEaten: 2800 }), t, [W('2026-10-30', 86), W('2026-11-05', 85.4)], []).focus).toMatch(/solid week/)
  })
})
