import { describe, expect, it } from 'vitest'
import { dayStats, intakeOn, rangeDates, sessionBurn, summarize } from './insights'
import type { DayRow } from '../db'
import type { Profile, SessionLog } from '../types'

const prof = (o: Partial<Profile> = {}): Profile => ({ heightCm: 175, weightKg: 70, age: 28, sex: 'm', goal: 'bulk', gymTime: '18:00', veg: false, onboarded: true, ...o } as Profile)
const st = { programStart: '2026-11-15', mergeDay0: false }
const row = (date: string, o: Partial<DayRow> = {}): DayRow => ({ id: `vikas|${date}`, person: 'vikas', date, eaten: {}, swaps: {}, water: 0, steps: 0, updatedAt: 1, ...o })

describe('insights', () => {
  it('counts only meals that were ticked off', () => {
    expect(intakeOn('vikas', row('2026-11-17'), prof(), st)).toEqual({ kcal: 0, protein: 0 })
    const a = intakeOn('vikas', row('2026-11-17', { eaten: { lunch: true } }), prof(), st)
    const b = intakeOn('vikas', row('2026-11-17', { eaten: { lunch: true, dinner: true } }), prof(), st)
    expect(a.kcal).toBeGreaterThan(150); expect(b.kcal).toBeGreaterThan(a.kcal); expect(b.protein).toBeGreaterThan(a.protein)
  })
  it('swapped meals change the totals', () => {
    const base = intakeOn('vikas', row('2026-11-17', { eaten: { breakfast: true } }), prof(), st)
    expect(base.kcal).toBeGreaterThan(0)
  })
  it('workout burn scales with minutes and body weight', () => {
    const s = { person: 'vikas', key: 'tue', startedAt: 1000, finishedAt: 1000 + 60 * 60000 } as unknown as SessionLog
    expect(sessionBurn('vikas', s, 70)).toBe(280)       // (5-1) × 70 × 1 h
    expect(sessionBurn('vikas', s, 90)).toBeGreaterThan(280)
  })
  it('burn = base + workout + steps; empty days are not "logged"', () => {
    const s = { id: 's', person: 'vikas', date: '2026-11-17', key: 'tue', startedAt: 1000, finishedAt: 1000 + 45 * 60000, volume: 5000, sets: {}, exOf: {}, title: '', cycle: 1, weekIndex: 1, updatedAt: 1 } as SessionLog
    const out = dayStats('vikas', ['2026-11-16', '2026-11-17'], [row('2026-11-17', { steps: 8000 })], [s], [], prof(), st)
    expect(out[0].logged).toBe(false)
    expect(out[1].sessions).toBe(1); expect(out[1].workoutBurn).toBeGreaterThan(100); expect(out[1].volume).toBe(5000)
    expect(out[1].stepBurn).toBe(Math.round(8000 * 0.00057 * 70))
    expect(out[1].burn).toBeGreaterThan(out[1].workoutBurn + out[1].stepBurn)
  })
  it('summary averages only logged days and balances only days with food', () => {
    const sm = summarize([
      { date: 'a', eaten: 2500, protein: 120, workoutBurn: 200, stepBurn: 100, burn: 2300, steps: 5000, water: 3, minutes: 50, volume: 1000, sessions: 1, logged: true },
      { date: 'b', eaten: 0, protein: 0, workoutBurn: 0, stepBurn: 0, burn: 2000, steps: 0, water: 0, minutes: 0, volume: 0, sessions: 0, logged: false },
    ])
    expect(sm.daysLogged).toBe(1); expect(sm.avgEaten).toBe(2500); expect(sm.net).toBe(200); expect(sm.workouts).toBe(1)
  })
  it('rangeDates ends today and has n entries', () => {
    const r = rangeDates('2026-11-20', 7)
    expect(r).toHaveLength(7); expect(r[6]).toBe('2026-11-20'); expect(r[0]).toBe('2026-11-14')
  })
})
