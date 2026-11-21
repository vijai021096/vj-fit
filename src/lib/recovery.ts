import type { MuscleId, SessionLog } from '../types'
import { EX } from '../data/exercises'

/**
 * Muscle fatigue memory. Every completed set loads its primary muscles fully and its secondary muscles
 * by half. That load fades back to zero over the muscle's recovery window (big muscles take longer).
 * 0 = fresh, 1 = fully fatigued.
 */
export const RECOVERY_H: Partial<Record<MuscleId, number>> = {
  quads: 72, hamstrings: 72, glutes: 72, 'lower-back': 72, lats: 60, 'mid-lower-chest': 60, 'upper-chest': 60, adductors: 60,
  'mid-traps-rhomboids': 48, 'front-delts': 48, 'side-delts': 48, 'rear-delts': 42, 'upper-traps': 48,
  biceps: 48, triceps: 48, brachialis: 48, forearms: 36, calves: 36, soleus: 36, abs: 36, obliques: 36, 'hip-flexors': 36, 'glute-med': 48,
}
/** Hard sets in one go that count as "fully fatigued". */
const FULL = 9

export type Freshness = 'fresh' | 'recovering' | 'fatigued'
export interface MuscleState { id: MuscleId; fatigue: number; state: Freshness; readyInH: number; lastAt: number | null }

const stateOf = (f: number): Freshness => (f >= 0.55 ? 'fatigued' : f >= 0.2 ? 'recovering' : 'fresh')

export function recovery(sessions: SessionLog[], now = Date.now()): Record<MuscleId, MuscleState> {
  const load: Partial<Record<MuscleId, number>> = {}
  const last: Partial<Record<MuscleId, number>> = {}
  const ready: Partial<Record<MuscleId, number>> = {}
  for (const s of sessions) {
    const at = s.finishedAt ?? s.startedAt
    if (!at || now - at > 4 * 86400000 || at > now) continue
    const hours = (now - at) / 3600000
    for (const [step, sets] of Object.entries(s.sets)) {
      const ex = EX[s.exOf[step]]
      if (!ex) continue
      const n = sets.filter((x) => x.done).length
      if (!n) continue
      const add = (m: MuscleId, w: number) => {
        const win = RECOVERY_H[m] ?? 48
        const left = Math.max(0, 1 - hours / win)
        if (left <= 0) return
        load[m] = (load[m] ?? 0) + (n * w * left) / FULL
        last[m] = Math.max(last[m] ?? 0, at)
        ready[m] = Math.max(ready[m] ?? 0, win - hours)
      }
      ex.muscles.primary.forEach((m) => add(m, 1))
      ex.muscles.secondary.forEach((m) => add(m, 0.5))
    }
  }
  const all = Object.keys(RECOVERY_H) as MuscleId[]
  return Object.fromEntries(all.map((m) => {
    const f = Math.min(1, load[m] ?? 0)
    // Ready (≤ 0.2) after roughly the remaining part of the window, scaled by how loaded it is.
    const readyInH = f < 0.2 ? 0 : Math.round((ready[m] ?? 0) * (1 - 0.2 / f))
    return [m, { id: m, fatigue: f, state: stateOf(f), readyInH, lastAt: last[m] ?? null }]
  })) as Record<MuscleId, MuscleState>
}

/** Muscles today's session targets that are still fatigued — worth a lighter first set or a swap. */
export function clashes(rec: Record<MuscleId, MuscleState>, primary: MuscleId[]): MuscleState[] {
  return primary.map((m) => rec[m]).filter((x): x is MuscleState => !!x && x.state === 'fatigued')
}
