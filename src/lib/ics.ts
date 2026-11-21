import type { Person, Profile } from '../types'
import { NAME, WEEKDAYS } from '../types'
import { PROGRAMS } from '../engine/program'
import { PLANS } from '../engine/rotation'
import { mealTimes } from '../engine/nutrition'
import { addDays, programEnd, week1Start } from '../engine/calendar'

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (date: string, mins: number) => `${date.replace(/-/g, '')}T${pad(Math.floor(mins / 60) % 24)}${pad(mins % 60)}00`
const DAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

/** Recurring .ics for gym sessions and key meals. No server push — the phone's calendar does the reminding. */
export function buildICS(person: Person, profile: Profile, programStart: string): string {
  const w1 = week1Start(programStart)
  const until = `${programEnd(programStart).replace(/-/g, '')}T183000Z`
  const [h, m] = profile.gymTime.split(':').map(Number)
  const gym = h * 60 + m
  const L: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//V2 Fit//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Kolkata', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0530', 'TZOFFSETTO:+0530', 'TZNAME:IST', 'END:STANDARD', 'END:VTIMEZONE']
  const ev = (uid: string, date: string, start: number, dur: number, title: string, rrule: string, desc = '') => L.push(
    'BEGIN:VEVENT', `UID:${uid}@v2fit`, `DTSTAMP:${stamp(programStart, 0)}Z`, `DTSTART;TZID=Asia/Kolkata:${stamp(date, start)}`, `DTEND;TZID=Asia/Kolkata:${stamp(date, start + dur)}`,
    `RRULE:${rrule}`, `SUMMARY:${title}`, ...(desc ? [`DESCRIPTION:${desc}`] : []), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT')
  WEEKDAYS.forEach((wd, i) => {
    const s = PROGRAMS[person].days[wd]
    if (s.kind === 'rest') return
    ev(`${person}-gym-${wd}`, addDays(w1, i), gym, Math.max(30, s.minutes), `🏋️ ${NAME[person]} · ${s.title}${s.subtitle ? ` — ${s.subtitle}` : ''}`, `FREQ=WEEKLY;BYDAY=${DAY[i]};UNTIL=${until}`, 'VJ Fit')
  })
  const slots = PLANS[person].slots
  const times = mealTimes(slots.map((s) => s.id), profile.gymTime)
  for (const id of ['breakfast', 'lunch', 'post', 'dinner'] as const) {
    const s = slots.find((x) => x.id === id)
    if (s && times[id] !== undefined) ev(`${person}-meal-${id}`, w1, Math.round(times[id]!), 20, `🍽️ ${NAME[person]} · ${s.label}`, `FREQ=DAILY;UNTIL=${until}`)
  }
  L.push('END:VCALENDAR')
  return L.join('\r\n')
}
export function downloadICS(person: Person, profile: Profile, programStart: string) {
  const blob = new Blob([buildICS(person, profile, programStart)], { type: 'text/calendar' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `v2fit-${person}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
