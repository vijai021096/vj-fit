import { describe, expect, it } from 'vitest'
import { cardioTotals, fmtDuration } from './cardio'
import type { SessionLog } from '../types'
import type { DayRow } from '../db'

const sess = (date: string, cardio?: Record<string, number>) => ({ id: date, person: 'vikas', date, exOf: { '3': 'bike', '4': 'incline-walk' }, cardio } as unknown as SessionLog)
const day = (date: string, cardio: DayRow['cardio']) => ({ id: date, person: 'vikas', date, eaten: {}, swaps: {}, water: 0, steps: 0, updatedAt: 1, cardio }) as DayRow

describe('cardio totals', () => {
  it('adds workout steps and stand-alone timers inside the range only', () => {
    const t = cardioTotals([sess('2026-11-16', { '3': 600, '4': 300 }), sess('2026-11-10', { '3': 999 }), sess('2026-11-17')], [day('2026-11-17', [{ id: 'a', ex: 'bike', sec: 1200 }]), day('2026-11-30', [{ id: 'b', ex: 'bike', sec: 5 }])], '2026-11-14', '2026-11-20')
    expect(t.seconds).toBe(2100)
    expect(t.byEx).toEqual({ bike: 1800, 'incline-walk': 300 })
  })
  it('formats durations', () => { expect(fmtDuration(1500)).toBe('25 min'); expect(fmtDuration(4500)).toBe('1 h 15 min'); expect(fmtDuration(11)).toBe('11 sec') })
})
