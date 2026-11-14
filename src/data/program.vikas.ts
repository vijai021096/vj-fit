import type { Block, Lift, ProgramDef } from '../types'

/** VIKAS — lean bulk, Upper/Lower + Push/Pull/Legs-Arms. Month 1 base; months 2–3 are patches below. */
const L = (ex: string, sets: number, reps: [number, number], rest: number, extra: Partial<Lift> = {}): Block => ({ type: 'lift', ex, sets, reps, rest, ...extra })
const star = { star: true }

const finder = (ex: string): Block => ({ type: 'lift', ex, sets: 3, reps: [10, 10], rest: 75, note: '2–3 light sets × 10 at RIR 4–5. The third set is optional. Log every weight.' })

export const vikasProgram: ProgramDef = {
  person: 'vikas',
  days: {
    mon: { key: 'upper-a', title: 'Upper A', subtitle: 'Chest & Back', minutes: 65, kind: 'upper', blocks: [
      L('bb-bench-press', 3, [6, 8], 150, star),
      L('lat-pulldown', 3, [8, 10], 120, { ...star, note: 'Wide, overhand grip' }),
      L('incline-db-press', 3, [8, 12], 120),
      L('seated-cable-row', 3, [10, 12], 90),
      L('db-lateral-raise', 3, [12, 15], 60, star),
      L('cable-triceps-pushdown', 2, [10, 15], 60),
      L('db-curl', 2, [10, 12], 60),
      L('hanging-knee-raise', 3, [10, 15], 60, { note: 'Abs' }),
    ] },
    tue: { key: 'lower-a', title: 'Lower A', subtitle: 'Quads & Hamstrings', minutes: 60, kind: 'lower', blocks: [
      L('back-squat', 3, [6, 8], 150, { ...star, gate: { flag: 'squatApproved', label: 'Trainer approved my squat form', use: { ex: 'goblet-squat', reps: [10, 12], note: 'Goblet squat while you learn. Switch to the back squat once a trainer approves your form.' } } }),
      L('bb-romanian-deadlift', 3, [8, 10], 120, star),
      L('leg-press', 3, [10, 12], 120),
      L('lying-leg-curl', 3, [10, 12], 90),
      L('standing-calf-raise', 4, [10, 15], 60),
      L('cable-crunch', 3, [10, 15], 60, { note: 'Abs' }),
      { type: 'lift', ex: 'plank', sets: 3, hold: [45, 45], rest: 45, note: 'Abs' },
    ] },
    wed: { key: 'push', title: 'Push', subtitle: 'Shoulders focus', minutes: 55, kind: 'upper', blocks: [
      L('seated-db-shoulder-press', 3, [8, 10], 120, star),
      L('machine-chest-press', 3, [8, 12], 90),
      L('cable-lateral-raise', 3, [12, 15], 45, { ...star, perSide: true }),
      L('pec-deck', 3, [12, 15], 60, { note: 'Pec deck or cable fly' }),
      L('overhead-cable-triceps-extension', 3, [10, 15], 60),
      L('assisted-dips', 2, [8, 12], 90),
    ] },
    thu: { key: 'pull', title: 'Pull', subtitle: 'Back width & Biceps', minutes: 60, kind: 'upper', blocks: [
      L('assisted-pull-up', 3, [6, 10], 120, { ...star, note: 'Track the assistance kg; less is better.' }),
      L('chest-supported-row', 3, [8, 10], 120, { ...star, note: 'Machine or incline dumbbells' }),
      L('single-arm-db-row', 3, [10, 12], 60, { perSide: true }),
      L('face-pull', 3, [12, 15], 60),
      L('ez-bar-curl', 3, [8, 12], 60),
      L('hammer-curl', 2, [10, 12], 60),
      L('hanging-leg-raise', 3, [10, 15], 60, { note: 'Abs — bent knee → straight leg as you get stronger' }),
    ] },
    fri: { key: 'lower-b', title: 'Lower B + Arms', minutes: 70, kind: 'lower', blocks: [
      L('hack-squat', 3, [8, 10], 120, { ...star, note: 'Leg press if there’s no hack squat' }),
      L('db-walking-lunge', 2, [10, 10], 90, { perSide: true }),
      L('seated-leg-curl', 3, [10, 12], 60),
      L('leg-extension', 2, [12, 15], 60),
      L('seated-calf-raise', 3, [12, 15], 45),
      L('close-grip-bench-press', 3, [8, 10], 120, star),
      { type: 'superset', rest: 60, items: [
        { ex: 'incline-db-curl', sets: 2, reps: [10, 12], rest: 0 },
        { ex: 'ez-bar-skull-crusher', sets: 2, reps: [10, 12], rest: 60 },
      ] },
      L('ab-wheel-rollout', 3, [8, 12], 60, { note: 'Abs — from the knees' }),
    ] },
    sat: { key: 'active', title: 'Active recovery', subtitle: 'Optional', minutes: 45, kind: 'active', note: '30–45 min walk, badminton or cricket, plus 10 min mobility.', blocks: [
      { type: 'cardio', ex: 'incline-walk', minutes: 30, label: 'Walk, badminton or cricket — 30–45 min' },
      { type: 'mobility', minutes: 10, label: 'Mobility — 10 min' },
    ] },
    sun: { key: 'rest', title: 'Rest', minutes: 0, kind: 'rest', note: 'Rest day. Eat well, sleep well.', blocks: [] },
  },
  months: {
    2: {
      note: 'Month 2 swaps',
      swap: {
        'incline-db-press': { ex: 'incline-smith-press' },
        'lat-pulldown': { ex: 'neutral-grip-pulldown', note: 'Neutral grip' },
        'seated-cable-row': { ex: 't-bar-row' },
        'db-curl': { ex: 'cable-curl' },
        'pec-deck': { ex: 'low-to-high-cable-fly', note: undefined },
        'machine-chest-press': { ex: 'flat-db-press' },
        'db-walking-lunge': { ex: 'bulgarian-split-squat', sets: 2, reps: [8, 10] },
        'hanging-knee-raise': { ex: 'hanging-leg-raise', note: 'Abs — straight legs' },
      },
    },
    3: {
      note: 'Month 3: heavier squat and bench, deadlift added. Everything else returns to the Month 1 exercises at heavier loads.',
      swap: {
        'back-squat': { sets: 4, reps: [5, 6] },
        'bb-bench-press': { sets: 4, reps: [5, 7] },
        'bb-romanian-deadlift': { sets: 2, reps: [8, 10] },
      },
      prepend: { tue: [L('trap-bar-deadlift', 3, [5, 5], 150, { note: 'Trap-bar or conventional deadlift' })] },
    },
  },
  day0: [
    finder('goblet-squat'), finder('machine-chest-press'), finder('lat-pulldown'), finder('seated-cable-row'),
    finder('db-romanian-deadlift'), finder('seated-db-shoulder-press'), finder('db-lateral-raise'),
    { type: 'lift', ex: 'plank', sets: 2, hold: [30, 30], rest: 45 },
    { type: 'lift', ex: 'bb-bench-press', sets: 2, reps: [10, 10], rest: 90, note: 'Empty bar only, with a spotter or trainer present.' },
  ],
  milestones: [
    { id: 'pullup-1', label: 'First unassisted pull-up' },
    { id: 'pullup-10', label: '10 strict pull-ups' },
    { id: 'bench-bw5', label: 'Bench bodyweight × 5' },
    { id: 'squat-125', label: 'Squat 1.25× bodyweight × 5' },
    { id: 'streak-12', label: '12-week streak' },
  ],
}
