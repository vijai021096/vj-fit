import { describe, expect, it } from 'vitest'
import type { DayStat } from './insights'
import type { SessionLog } from '../types'
import { forecast, gamify, levelOf, xpForLevel } from './gamify'
import { recovery } from './recovery'

const day = (date: string, o: Partial<DayStat> = {}): DayStat => ({ date, eaten: 0, protein: 0, workoutBurn: 0, stepBurn: 0, burn: 2400, steps: 0, water: 0, minutes: 0, volume: 0, sessions: 0, logged: false, ...o })
const T = { kcal: 2000, protein: 160, steps: 10000, waterL: 4 }
const good = (date: string) => day(date, { eaten: 1950, protein: 170, steps: 11000, water: 4, sessions: 1 })
const W = (date: string, kg: number) => ({ id: date, person: 'vijai' as const, date, kg, updatedAt: 1 })

describe('levels', () => {
  it('starts at level 1 and grows', () => {
    expect(levelOf(0).level).toBe(1)
    expect(levelOf(xpForLevel(2)).level).toBe(2)
    expect(levelOf(xpForLevel(5) - 1).level).toBe(4)
    expect(levelOf(0).title).toBe('Rookie')
  })
})

describe('gamify', () => {
  it('scores a perfect day and counts the streak', () => {
    const g = gamify([good('2026-11-20'), good('2026-11-21'), good('2026-11-22')], T, [W('2026-11-22', 85)], [])
    expect(g.todayXp).toBe(100 + 40 + 30 + 30 + 15 + 10)
    expect(g.streak).toBe(3); expect(g.best).toBe(3)
  })
  it('an unfinished today does not break the streak, a bad yesterday does', () => {
    expect(gamify([good('2026-11-20'), good('2026-11-21'), day('2026-11-22')], T, [], []).streak).toBe(2)
    expect(gamify([good('2026-11-20'), day('2026-11-21'), good('2026-11-22')], T, [], []).streak).toBe(1)
  })
  it('overeating does not count as calories on target', () => {
    expect(gamify([day('2026-11-22', { eaten: 2600, protein: 170 })], T, [], []).today.calories).toBe(false)
  })
})

describe('goal forecast', () => {
  it('uses the planned pace until there is a trend', () => {
    const f = forecast([], 86, 77, '2026-11-21')
    expect(f.left).toBe(9); expect(f.etaFromPlan).toBe(true); expect(f.status).toBe('unknown')
    expect(f.eta).toBe('2027-03-06')   // 9 kg ÷ 0.6 kg/week = 15 weeks = 105 days
  })
  it('uses the real trend once there are two weeks of weigh-ins', () => {
    const ws = Array.from({ length: 22 }, (_, i) => W(`2026-11-${String(i + 1).padStart(2, '0')}`, 86 - i * 0.1))
    const f = forecast(ws, 86, 77, '2026-11-22')
    expect(f.rate!).toBeLessThan(-0.6); expect(f.etaFromPlan).toBe(false); expect(['on-track', 'ahead']).toContain(f.status)
  })
})

describe('muscle recovery', () => {
  const now = Date.parse('2026-11-21T18:00:00+05:30')
  const sess = (hoursAgo: number, ex: string, sets: number): SessionLog => ({
    id: `s${hoursAgo}`, person: 'vijai', date: '2026-11-21', key: 'mon', title: 'x', cycle: 1, weekIndex: 1, startedAt: now - hoursAgo * 3600000 - 3600000, finishedAt: now - hoursAgo * 3600000,
    sets: { a: Array.from({ length: sets }, () => ({ w: 60, r: 8, done: true })) }, exOf: { a: ex }, updatedAt: 1,
  })
  it('heavy chest work today leaves chest fatigued and triceps less so', () => {
    const r = recovery([sess(1, 'bb-bench-press', 9)], now)
    expect(r['mid-lower-chest'].state).toBe('fatigued')
    expect(r.triceps.fatigue).toBeLessThan(r['mid-lower-chest'].fatigue)
    expect(r.quads.state).toBe('fresh')
  })
  it('recovers after the window passes', () => {
    expect(recovery([sess(80, 'bb-bench-press', 9)], now)['mid-lower-chest'].state).toBe('fresh')
  })
})
