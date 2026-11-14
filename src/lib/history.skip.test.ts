import { describe, expect, it } from 'vitest'
import { streak } from './history'
import type { SessionLog } from '../types'

const s = (date: string) => ({ id: date, date, finishedAt: 1 }) as unknown as SessionLog
describe('streak with skipped days', () => {
  // Mon 16, Tue 17 done; Wed 18 missed; Thu 19 done; today Fri 20
  const sessions = [s('2026-11-16'), s('2026-11-17'), s('2026-11-19')]
  it('breaks at an unmarked miss', () => expect(streak(sessions, '2026-11-20', '2026-11-16')).toBe(1))
  it('does not break at a day marked not going, and does not count it', () => expect(streak(sessions, '2026-11-20', '2026-11-16', new Set(['2026-11-18']))).toBe(3))
})
