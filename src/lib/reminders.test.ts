import { describe, expect, it } from 'vitest'
import { buildItems } from './reminders'
import type { Profile } from '../types'

const prof = { heightCm: 175, weightKg: 70, age: 28, sex: 'male', gymTime: '07:00', veg: false, kcalAdjust: 0, onboarded: true } as Profile
const st = { programStart: '2026-11-15', mergeDay0: false }

describe('reminders', () => {
  it('builds a week of meals, gym nudges and water prompts, sorted', () => {
    const items = buildItems('vikas', '2026-11-16', st, prof)
    expect(new Set(items.map((i) => i.date)).size).toBe(7)
    expect(items.filter((i) => i.title === 'Drink some water').length).toBe(21)
    expect(items.some((i) => i.title === 'Gym in 15 minutes' && i.at === 6 * 60 + 45)).toBe(true)
    const keys = items.map((i) => `${i.date}${String(i.at).padStart(4, '0')}`)
    expect(keys).toEqual([...keys].sort())
    expect(items.every((i) => i.title && i.at >= 0 && i.at < 1440)).toBe(true)
  })
  it('sends nothing before the program starts', () => {
    expect(buildItems('vikas', '2026-11-01', st, prof).filter((i) => i.date < '2026-11-15')).toEqual([])
  })
})
