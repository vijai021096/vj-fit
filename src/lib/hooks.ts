import { useEffect, useMemo, useState } from 'react'
import { useStore, usePerson } from '../store'
import { istDate, now, position, type Position } from '../engine/calendar'
import { db, useLive } from '../db'
import type { Person, SessionLog } from '../types'

/** Re-render on a timer so the IST clock, countdowns and day rollover stay live. */
export function useNow(ms = 20000): Date {
  const [, set] = useState(0)
  useEffect(() => {
    const id = setInterval(() => set((x) => x + 1), ms)
    const vis = () => set((x) => x + 1)
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [ms])
  return now()
}
export function usePosition(): Position {
  const d = useNow()
  const start = useStore((s) => s.settings.programStart)
  const merge = useStore((s) => s.settings.mergeDay0)
  const date = istDate(d)
  return useMemo(() => position(date, start, merge), [date, start, merge])
}
export function useSessions(person?: Person): SessionLog[] | undefined {
  const me = usePerson()
  const p = person ?? me
  return useLive<SessionLog[] | undefined>(() => db.sessions.where('person').equals(p).sortBy('date'), [p], undefined)
}
export function useTick(ms = 250, on = true) {
  const [, set] = useState(0)
  useEffect(() => { if (!on) return; const id = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(id) }, [ms, on])
}
