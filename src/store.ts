import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Person, Profile, ProgramDef, SetLog } from './types'
import type { MealPlan } from './data/meals.types'
import { DEFAULT_START } from './engine/calendar'

export type Palette = 'midnight' | 'gold' | 'red' | 'neon'
export const PALETTES: { value: Palette; label: string }[] = [{ value: 'midnight', label: 'Midnight' }, { value: 'gold', label: 'Gold' }, { value: 'red', label: 'Red' }, { value: 'neon', label: 'Neon' }]
export type Tab = 'today' | 'plan' | 'diet' | 'progress' | 'library'
export type Overlay =
  | null
  | { type: 'session' }
  | { type: 'exercise'; id: string }
  | { type: 'settings' }
  | { type: 'review' }
  | { type: 'install' }
  | { type: 'profile'; person: Person }
  | { type: 'editor'; tab: 'workout' | 'diet' }
  | { type: 'insights' }

export interface Active {
  id: string; date: string; key: string; title: string; weekday: string
  cycle: number; weekIndex: number; isDay0: boolean
  startedAt: number
  phase: 'intro' | 'warmup' | 'work' | 'cooldown' | 'finish'
  idx: number
  sets: Record<string, SetLog[]>
  swaps: Record<string, string>
  rest: { endsAt: number; total: number; label: string; hold?: { step: string; set: number } } | null
  cardio: Record<string, { startedAt: number | null; elapsed: number; done: boolean }>
  checks: Record<string, boolean>
  prs: string[]
}

const blank = (sex: 'male' | 'female'): Profile => ({
  heightCm: sex === 'male' ? 175 : 160, weightKg: sex === 'male' ? 86 : 62, age: 34, sex, gymTime: '07:00', veg: false, diet: 'nonveg', goalWeightKg: 77, kcalAdjust: 0, onboarded: false,
})

interface State {
  person: Person | null
  /** Whose phone this is. Local only — never synced. */
  me: Person | null
  profiles: Record<Person, Profile>
  avatars: Partial<Record<Person, string>>
  settings: { programStart: string; mergeDay0: boolean; theme: 'dark' | 'light' | 'system'; sounds: boolean; creatine: boolean; palette?: Palette }
  flags: { disclaimer: boolean; install: boolean; rir: boolean; backupNudge: number; lastBackup: number; reviewDone: Record<Person, number>; phase: 'bulk' | 'cut' }
  badges: Record<Person, Record<string, string>>
  grocery: Record<string, boolean>
  /** Your edits to the coach's plan. Absent = use the coach's version. */
  content: { programs: Partial<Record<Person, ProgramDef>>; meals: Partial<Record<Person, MealPlan>> }
  contentRev: number
  /** Edit time per content record, e.g. `program:vijai` — drives sync. */
  contentAt: Record<string, number>
  active: Record<Person, Active | null>
  /** The stand-alone cardio stopwatch (one at a time). Survives a reload. */
  quick: { ex: string; startedAt: number | null; elapsed: number } | null
  tab: Tab
  overlay: Overlay
  toast: string | null
  set: (fn: (s: State) => void) => void
  setPerson: (p: Person) => void
  open: (o: Overlay) => void
  setTab: (t: Tab) => void
  patchActive: (fn: (a: Active) => void) => void
  say: (m: string) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      person: 'vijai',
      me: 'vijai',
      profiles: { vijai: blank('male') },
      avatars: {},
      settings: { programStart: DEFAULT_START, mergeDay0: false, theme: 'dark', sounds: true, creatine: true, palette: 'midnight' },
      flags: { disclaimer: false, install: false, rir: false, backupNudge: 0, lastBackup: 0, reviewDone: { vijai: 1 }, phase: 'cut' },
      badges: { vijai: {} },
      grocery: {},
      content: { programs: {}, meals: {} },
      contentRev: 0,
      contentAt: {},
      active: { vijai: null },
      quick: null,
      tab: 'today',
      overlay: null,
      toast: null,
      set: (fn) => set((s) => {
        const { set: _a, setPerson: _b, open: _c, setTab: _d, patchActive: _e, say: _f, ...data } = s
        const c = structuredClone(data) as State
        fn(c)
        return c
      }),
      setPerson: (p) => set({ person: p }),
      open: (o) => set({ overlay: o }),
      setTab: (t) => set({ tab: t, overlay: null }),
      patchActive: (fn) => {
        const p = get().person
        if (!p) return
        const a = get().active[p]
        if (!a) return
        const c = structuredClone(a)
        fn(c)
        set({ active: { ...get().active, [p]: c } })
      },
      say: (m) => { set({ toast: m }); setTimeout(() => { if (get().toast === m) set({ toast: null }) }, 2600) },
    }),
    {
      name: 'vjfit-store',
      version: 1,
      partialize: (s) => ({ person: s.person, me: s.me, profiles: s.profiles, avatars: s.avatars, settings: s.settings, flags: s.flags, badges: s.badges, grocery: s.grocery, content: s.content, contentAt: s.contentAt, active: s.active, quick: s.quick, overlay: s.overlay?.type === 'session' ? s.overlay : null }) as unknown as State,
      migrate: (persisted) => persisted as State,
      merge: (persisted, current) => ({ ...current, ...(persisted as object), content: { programs: {}, meals: {}, ...((persisted as Partial<State>)?.content ?? {}) }, contentAt: (persisted as Partial<State>)?.contentAt ?? {} }),
    },
  ),
)

export const usePerson = () => useStore((s) => s.person) ?? 'vijai'
export const useProfile = () => { const p = usePerson(); return useStore((s) => s.profiles[p]) }

/** True when `person` asked to hide their weight and this phone belongs to someone else. */
export const useWeightHidden = (person: Person) => useStore((s) => !!s.profiles[person].hideWeight && !!s.me && s.me !== person)
