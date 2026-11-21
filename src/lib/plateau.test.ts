import { describe, expect, it } from 'vitest'
import type { SessionLog } from '../types'
import { deloadAdvice, stalledLifts } from './plateau'

const mk = (date: string, w: number, r: number, ex = 'bb-bench-press'): SessionLog => ({
  id: date + ex, person: 'vijai', date, key: 'mon', title: 't', cycle: 1, weekIndex: 1, startedAt: 1, finishedAt: 2,
  sets: { s1: [{ w, r, done: true, t: 1 } as never] }, exOf: { s1: ex }, updatedAt: 1,
})

describe('stalledLifts', () => {
  it('flags a lift whose best was 3+ sessions and 14+ days ago', () => {
    const s = [mk('2026-10-05', 60, 8), mk('2026-10-12', 60, 8), mk('2026-10-19', 57.5, 8), mk('2026-10-26', 57.5, 8), mk('2026-11-02', 60, 7)]
    const r = stalledLifts(s, '2026-11-04')
    expect(r).toHaveLength(1)
    expect(r[0].sessionsSinceBest).toBe(4)
    expect(r[0].daysSinceBest).toBeGreaterThanOrEqual(14)
  })
  it('stays quiet while progress continues', () => {
    const s = [mk('2026-10-05', 60, 8), mk('2026-10-12', 60, 9), mk('2026-10-19', 62.5, 8), mk('2026-10-26', 62.5, 9)]
    expect(stalledLifts(s, '2026-10-28')).toHaveLength(0)
  })
  it('ignores lifts not trained recently and short histories', () => {
    const s = [mk('2026-08-01', 60, 8), mk('2026-08-08', 55, 8), mk('2026-08-15', 55, 8), mk('2026-08-22', 55, 8)]
    expect(stalledLifts(s, '2026-11-04')).toHaveLength(0)
    expect(stalledLifts(s.slice(0, 3), '2026-08-23')).toHaveLength(0)
  })
})

describe('deloadAdvice', () => {
  it('escalates with the number of stalled lifts', () => {
    const f = (n: number) => Array.from({ length: n }, (_, i) => ({ ex: 'e' + i, sessionsSinceBest: 3, daysSinceBest: 20, w: 1, reps: 1 }))
    expect(deloadAdvice(f(0)).level).toBe('none')
    expect(deloadAdvice(f(2)).level).toBe('watch')
    expect(deloadAdvice(f(3)).level).toBe('deload')
  })
})
