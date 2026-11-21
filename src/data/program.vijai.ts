import type { Block, Lift, ProgramDef } from '../types'

/**
 * VIJAI — fat loss first, keep and build muscle. 86 → 77 kg.
 * 5 lifting days: each muscle twice a week, chest & back Mon + Fri, a dedicated shoulders & arms day,
 * two leg days. Incline-walk finishers grow week by week; Saturday is long steady cardio or cricket.
 * Months 2–3 are patches below.
 */
const L = (ex: string, sets: number, reps: [number, number], rest: number, extra: Partial<Lift> = {}): Block => ({ type: 'lift', ex, sets, reps, rest, ...extra })
const star = { star: true }
const finisher = (min: number[]): Block => ({ type: 'cardio', ex: 'incline-walk', minutes: min[0], minutesByWeek: min, label: 'Fat-loss finisher — incline walk', note: '10–12% incline, 4.5–5.5 km/h. Breathing hard but able to talk in short sentences.' })

const finder = (ex: string): Block => ({ type: 'lift', ex, sets: 3, reps: [10, 10], rest: 75, note: '2–3 sets × 10 at RIR 3–4 to find your working weights. Log every weight.' })

export const vijaiProgram: ProgramDef = {
  person: 'vijai',
  why: [
    'Fat loss comes from the diet and steps; lifting heavy is what tells your body to keep the muscle while you lose 9 kg.',
    'Every muscle is trained twice a week. Chest and back on Monday and Friday, shoulders and arms get their own day.',
    'Finishers start at 15 minutes and grow each week. If weight stalls for 2 weeks, add a 20-minute walk on Sunday before cutting food.',
    'Keep the weights on the ★ lifts the same or rising. If strength holds while the scale drops, you are losing fat, not muscle.',
  ],
  days: {
    mon: { key: 'upper-a', title: 'Upper A', subtitle: 'Chest & Back (heavy)', minutes: 75, kind: 'upper', blocks: [
      L('bb-bench-press', 4, [6, 8], 150, star),
      L('lat-pulldown', 4, [8, 10], 120, { ...star, note: 'Wide, overhand grip' }),
      L('incline-db-press', 3, [8, 12], 120),
      L('seated-cable-row', 3, [10, 12], 90),
      L('pec-deck', 2, [12, 15], 60, { note: 'Pec deck or cable fly' }),
      L('face-pull', 2, [12, 15], 60),
      L('hanging-knee-raise', 3, [12, 15], 60, { note: 'Abs' }),
      finisher([15, 15, 20, 20]),
    ] },
    tue: { key: 'lower-a', title: 'Lower A', subtitle: 'Quads & Core', minutes: 70, kind: 'lower', blocks: [
      L('back-squat', 4, [6, 8], 150, star),
      L('leg-press', 3, [10, 12], 120),
      L('db-walking-lunge', 2, [10, 10], 90, { perSide: true }),
      L('leg-extension', 3, [12, 15], 60),
      L('seated-leg-curl', 2, [10, 12], 60),
      L('standing-calf-raise', 4, [10, 15], 60),
      L('cable-crunch', 3, [12, 15], 60, { note: 'Abs' }),
      { type: 'lift', ex: 'plank', sets: 3, hold: [45, 60], rest: 45, note: 'Abs' },
    ] },
    wed: { key: 'arms', title: 'Shoulders & Arms', subtitle: 'V-taper day', minutes: 70, kind: 'upper', blocks: [
      L('seated-db-shoulder-press', 4, [8, 10], 120, star),
      L('db-lateral-raise', 4, [12, 15], 60, star),
      L('reverse-pec-deck', 3, [12, 15], 60, { note: 'Rear delts' }),
      { type: 'superset', rest: 75, items: [
        { ex: 'ez-bar-curl', sets: 3, reps: [8, 12], rest: 0 },
        { ex: 'cable-triceps-pushdown', sets: 3, reps: [10, 12], rest: 75 },
      ] },
      { type: 'superset', rest: 60, items: [
        { ex: 'hammer-curl', sets: 3, reps: [10, 12], rest: 0 },
        { ex: 'overhead-cable-triceps-extension', sets: 3, reps: [10, 15], rest: 60 },
      ] },
      L('cable-lateral-raise', 2, [15, 20], 45, { perSide: true, note: 'Burnout — light weight, slow' }),
      finisher([15, 15, 20, 20]),
    ] },
    thu: { key: 'lower-b', title: 'Lower B', subtitle: 'Hamstrings, Glutes & Core', minutes: 70, kind: 'lower', blocks: [
      L('bb-romanian-deadlift', 4, [8, 10], 150, star),
      L('hack-squat', 3, [8, 10], 120, { note: 'Leg press if there’s no hack squat' }),
      L('bulgarian-split-squat', 2, [8, 10], 90, { perSide: true }),
      L('lying-leg-curl', 3, [10, 12], 60),
      L('seated-calf-raise', 3, [12, 15], 45),
      L('hanging-leg-raise', 3, [10, 15], 60, { note: 'Abs' }),
      { type: 'lift', ex: 'side-plank', sets: 2, hold: [30, 45], rest: 30, perSide: true, note: 'Obliques' },
    ] },
    fri: { key: 'upper-b', title: 'Upper B', subtitle: 'Chest, Back & Arms (volume)', minutes: 75, kind: 'upper', blocks: [
      L('incline-smith-press', 3, [8, 10], 120, star),
      L('assisted-pull-up', 3, [6, 10], 120, { ...star, note: 'Track the assistance kg; less is better. Bodyweight once you can.' }),
      L('flat-db-press', 3, [10, 12], 90),
      L('chest-supported-row', 3, [10, 12], 90, { note: 'Machine or incline dumbbells' }),
      L('cable-fly', 2, [12, 15], 60),
      { type: 'superset', rest: 60, items: [
        { ex: 'incline-db-curl', sets: 2, reps: [10, 12], rest: 0 },
        { ex: 'ez-bar-skull-crusher', sets: 2, reps: [10, 12], rest: 60 },
      ] },
      finisher([15, 15, 20, 20]),
    ] },
    sat: { key: 'active', title: 'Cardio day', subtitle: 'Steady fat burn', minutes: 50, kind: 'active', note: '40–45 min incline walk, cycling or a cricket session, plus 10 min mobility.', blocks: [
      { type: 'cardio', ex: 'incline-walk', minutes: 40, minutesByWeek: [35, 40, 40, 45], label: 'Incline walk, cycle or cricket', note: 'Steady pace you can keep the whole time.' },
      { type: 'mobility', minutes: 10, label: 'Mobility — 10 min' },
    ] },
    sun: { key: 'rest', title: 'Rest', minutes: 0, kind: 'rest', note: 'Rest day. Still hit your steps and protein. Sleep 7–8 hours.', blocks: [] },
  },
  months: {
    2: {
      note: 'Month 2 swaps — same muscles, new angles',
      swap: {
        'incline-db-press': { ex: 'landmine-press', note: 'Landmine press' },
        'lat-pulldown': { ex: 'neutral-grip-pulldown', note: 'Neutral grip' },
        'seated-cable-row': { ex: 't-bar-row' },
        'ez-bar-curl': { ex: 'cable-curl' },
        'pec-deck': { ex: 'low-to-high-cable-fly', note: undefined },
        'flat-db-press': { ex: 'machine-chest-press' },
        'db-walking-lunge': { ex: 'db-reverse-lunge' },
        'seated-db-shoulder-press': { ex: 'arnold-press' },
        'hanging-knee-raise': { ex: 'hanging-leg-raise', note: 'Abs — straight legs' },
      },
    },
    3: {
      note: 'Month 3: heavier squat and bench, deadlift added. Everything else returns to the Month 1 exercises at heavier loads.',
      swap: {
        'back-squat': { sets: 4, reps: [5, 6] },
        'bb-bench-press': { sets: 4, reps: [5, 7] },
        'bb-romanian-deadlift': { sets: 3, reps: [8, 10] },
      },
      prepend: { thu: [L('trap-bar-deadlift', 3, [5, 5], 150, { note: 'Trap-bar or conventional deadlift' })] },
    },
  },
  day0: [
    finder('back-squat'), finder('bb-bench-press'), finder('lat-pulldown'), finder('seated-cable-row'),
    finder('bb-romanian-deadlift'), finder('seated-db-shoulder-press'), finder('db-lateral-raise'),
    { type: 'lift', ex: 'plank', sets: 2, hold: [45, 45], rest: 45 },
  ],
  milestones: [
    { id: 'kg-82', label: 'Below 82 kg' },
    { id: 'kg-77', label: 'Goal: 77 kg' },
    { id: 'pullup-1', label: 'First unassisted pull-up' },
    { id: 'bench-bw', label: 'Bench bodyweight × 5' },
    { id: 'squat-125', label: 'Squat 1.25× bodyweight × 5' },
    { id: 'streak-12', label: '12-week streak' },
  ],
}
