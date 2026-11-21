import { describe, expect, it } from 'vitest'
import { DEFAULT_PROGRAMS } from '../engine/program'
import { DEFAULT_PLANS } from '../engine/rotation'
import { planOk, programOk } from './content'
import { WEEKDAYS } from '../types'

describe('content validation', () => {
  for (const p of ['vijai'] as const) {
    it(`${p}: coach program and meal plan pass the shape check`, () => {
      const prog = DEFAULT_PROGRAMS[p]
      const bad = WEEKDAYS.flatMap((d) => prog.days[d].blocks.map((b, i) => [d, i, b] as const)).filter(([, , b]) => !programOk({ ...prog, days: Object.fromEntries(WEEKDAYS.map((d) => [d, { ...prog.days[d], blocks: [] }])) as never, months: prog.months } as never) || false)
      expect(bad).toEqual([])
      expect(programOk(prog)).toBe(true)
      expect(planOk(DEFAULT_PLANS[p])).toBe(true)
    })
    it(`${p}: an edited title survives a JSON round trip`, () => {
      const c = JSON.parse(JSON.stringify(DEFAULT_PROGRAMS[p])); c.days.mon.title = 'X'
      expect(programOk(c)).toBe(true)
    })
  }
  it('rejects garbage', () => {
    expect(programOk(undefined)).toBe(false)
    expect(programOk({} as never)).toBe(false)
    expect(planOk({ slots: [], tips: [] })).toBe(false)
  })
})
