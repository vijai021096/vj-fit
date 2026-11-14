import { describe, expect, it } from 'vitest'
import { QUOTES, quoteFor } from './quotes'

describe('quotes', () => {
  it('has 100+ unique lines that fit a notification', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(100)
    expect(new Set(QUOTES).size).toBe(QUOTES.length)
    expect(Math.max(...QUOTES.map((q) => q.length))).toBeLessThanOrEqual(150)
  })
  it('changes every day and repeats only after the whole list', () => {
    const seen = new Set<string>()
    for (let i = 0; i < QUOTES.length; i++) seen.add(quoteFor(new Date(Date.UTC(2026, 10, 15 + i)).toISOString().slice(0, 10)))
    expect(seen.size).toBe(QUOTES.length)
    expect(quoteFor('2026-11-15')).toBe(quoteFor('2026-11-15'))
  })
})
