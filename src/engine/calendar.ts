import { formatInTimeZone } from 'date-fns-tz'
import type { Weekday } from '../types'

export const TZ = 'Asia/Kolkata'
export const DEFAULT_START = '2026-11-15'
export const WEEKS = 12

/** Optional clock override for QA: ?simulate=2026-11-16T07:30 */
let offsetMs = 0
export function setSimulatedNow(iso: string | null) {
  if (!iso) { offsetMs = 0; return }
  const withTime = iso.length <= 10 ? `${iso}T07:00:00` : iso
  const t = Date.parse(`${withTime}+05:30`)
  if (!Number.isNaN(t)) offsetMs = t - Date.now()
}
export const now = () => new Date(Date.now() + offsetMs)

/** Live IST calendar date, YYYY-MM-DD. Rollover at IST midnight regardless of device timezone. */
export function istDate(d: Date = now()): string {
  const p = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const g = (t: string) => p.find((x) => x.type === t)!.value
  return `${g('year')}-${g('month')}-${g('day')}`
}
export function istMinutes(d: Date = now()): number {
  const [h, m] = formatInTimeZone(d, TZ, 'HH:mm').split(':').map(Number)
  return h * 60 + m
}
export const istClock = (d: Date = now()) => formatInTimeZone(d, TZ, 'h:mm a')
export const istLong = (d: Date = now()) => formatInTimeZone(d, TZ, 'EEE, d MMM yyyy')

const utc = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
export const diffDays = (a: string, b: string) => Math.round((utc(a) - utc(b)) / 86400000)
export function addDays(s: string, n: number): string {
  return new Date(utc(s) + n * 86400000).toISOString().slice(0, 10)
}
const WD: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
export const weekdayOf = (s: string): Weekday => WD[new Date(utc(s)).getUTCDay()]
export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...opts }).format(new Date(utc(s)))
}

/** Week 1 starts on the first Monday on/after the start date. A Sunday start gives Day 0 + Monday Week 1. */
export function week1Start(programStart: string): string {
  const wd = new Date(utc(programStart)).getUTCDay()
  return addDays(programStart, wd === 1 ? 0 : (8 - wd) % 7)
}
export const programEnd = (programStart: string) => addDays(week1Start(programStart), WEEKS * 7 - 1)

export interface Position {
  phase: 'before' | 'day0' | 'gap' | 'program'
  date: string
  weekday: Weekday
  cycle: number
  weekIndex: number
  month: 1 | 2 | 3
  weekInMonth: 1 | 2 | 3 | 4
  dayNumber: number
  daysToStart: number
  /** Day 0 merged into Week 1 Monday ("my gym is closed Sunday") */
  mergedDay0: boolean
}

export function position(date: string, programStart: string = DEFAULT_START, mergeDay0 = false): Position {
  const w1 = week1Start(programStart)
  const weekday = weekdayOf(date)
  const base = { date, weekday, cycle: 1, weekIndex: 1, month: 1 as const, weekInMonth: 1 as const, dayNumber: 1, mergedDay0: false }
  const day0Separate = w1 !== programStart && !mergeDay0
  if (diffDays(date, w1) < 0) {
    if (day0Separate && date === programStart) return { ...base, phase: 'day0', daysToStart: 0 }
    if (diffDays(date, programStart) < 0) return { ...base, phase: 'before', daysToStart: diffDays(day0Separate ? programStart : w1, date) }
    return { ...base, phase: 'gap', daysToStart: diffDays(w1, date) }
  }
  const n = diffDays(date, w1)
  const totalWeek = Math.floor(n / 7)
  const weekIndex = (totalWeek % WEEKS) + 1
  return {
    phase: 'program', date, weekday,
    cycle: Math.floor(totalWeek / WEEKS) + 1,
    weekIndex,
    month: Math.ceil(weekIndex / 4) as 1 | 2 | 3,
    weekInMonth: (((weekIndex - 1) % 4) + 1) as 1 | 2 | 3 | 4,
    dayNumber: (n % 7) + 1,
    daysToStart: 0,
    mergedDay0: n === 0 && !day0Separate,
  }
}

/** Date of a given (cycle, weekIndex, weekday). */
export function dateOf(programStart: string, cycle: number, weekIndex: number, weekday: Weekday): string {
  const idx = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(weekday)
  return addDays(week1Start(programStart), ((cycle - 1) * WEEKS + (weekIndex - 1)) * 7 + idx)
}

export function greeting(mins: number = istMinutes()): string {
  if (mins < 300) return 'Up late'
  if (mins < 720) return 'Good morning'
  if (mins < 1020) return 'Good afternoon'
  return 'Good evening'
}
