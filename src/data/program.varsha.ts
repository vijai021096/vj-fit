import type { Block, Lift, ProgramDef } from '../types'

/** VARSHA — strength + upper-body emphasis. Month 1 base; months 2–3 are patches below. */
const L = (ex: string, sets: number, reps: [number, number], rest: number, extra: Partial<Lift> = {}): Block => ({ type: 'lift', ex, sets, reps, rest, ...extra })
const star = { star: true }
const finder = (ex: string): Block => ({ type: 'lift', ex, sets: 3, reps: [10, 10], rest: 75, note: '2–3 light sets × 10 at RIR 4–5. The third set is optional. Log every weight.' })

const INTERVALS: Block = {
  type: 'cardio', ex: 'bike', minutes: 0, label: 'Bike intervals', note: '30 s hard / 90 s easy',
  intervals: { work: 30, easy: 90, rounds: 5, roundsByWeek: [5, 6, 8, 8], workLabel: 'Hard', easyLabel: 'Easy' },
}

export const varshaProgram: ProgramDef = {
  person: 'varsha',
  why: [
    'No one can lose from just one spot. What changes your silhouette is steady overall progress plus stronger, wider shoulders and back.',
    'Lower body is trained at moderate loads, not skipped. In a calorie deficit it gets stronger and tighter, not bigger.',
    'No heavy hip thrusts and no glute-growth isolation (kickbacks, abductions).',
    'Core work focuses on bracing and anti-rotation, not heavy weighted side-bends.',
  ],
  days: {
    mon: { key: 'upper-a', title: 'Upper A', subtitle: 'Back & Shoulders — build the frame', minutes: 55, kind: 'upper', blocks: [
      L('lat-pulldown', 3, [10, 12], 90, star),
      L('seated-db-shoulder-press', 3, [10, 12], 90, star),
      L('seated-cable-row', 3, [10, 12], 90),
      L('db-lateral-raise', 3, [12, 15], 45, star),
      L('incline-push-up', 3, [8, 12], 60, { note: 'Hands on a bench or Smith bar; lower the incline over time' }),
      L('face-pull', 2, [12, 15], 45),
      { type: 'superset', rest: 60, items: [
        { ex: 'cable-triceps-pushdown', sets: 2, reps: [12, 15], rest: 0 },
        { ex: 'db-curl', sets: 2, reps: [12, 15], rest: 60 },
      ] },
      { type: 'cardio', ex: 'incline-walk', minutes: 10, label: 'Finisher — incline walk', note: '8–10% incline, 4.5–5 km/h' },
    ] },
    tue: { key: 'lower', title: 'Lower', subtitle: 'Strength & tone, controlled loads', minutes: 55, kind: 'lower', blocks: [
      L('goblet-squat', 3, [10, 12], 90, { ...star, note: 'To a box if needed' }),
      L('db-romanian-deadlift', 3, [10, 12], 90, star),
      L('leg-press', 2, [12, 15], 90, { note: 'Feet mid-platform, shoulder width' }),
      L('lying-leg-curl', 3, [12, 15], 60),
      L('low-box-step-up', 2, [10, 10], 60, { perSide: true, note: 'Bodyweight → light dumbbells' }),
      L('dead-bug', 3, [8, 8], 45, { perSide: true, note: 'Core' }),
      { type: 'lift', ex: 'side-plank', sets: 3, hold: [20, 30], rest: 30, perSide: true, note: 'Core' },
      { type: 'cardio', ex: 'bike', minutes: 10, label: 'Finisher — easy bike' },
    ] },
    wed: { key: 'conditioning', title: 'Conditioning + Core', minutes: 50, kind: 'cardio', blocks: [
      { type: 'cardio', ex: 'incline-walk', minutes: 30, minutesByWeek: [30, 32, 34, 36], label: 'Zone-2 cardio', note: 'Incline walk or cycle — a pace where you can talk in short sentences. +2 min per week, up to 40.' },
      { type: 'circuit', rounds: 3, rest: 60, items: [
        { ex: 'dead-bug', reps: 10, perSide: true },
        { ex: 'pallof-press', reps: 10, perSide: true },
        { ex: 'plank', hold: 35, note: '30–40 s' },
        { ex: 'bird-dog', reps: 8, perSide: true },
      ] },
      { type: 'mobility', minutes: 10, label: 'Mobility — 10 min (guided)' },
    ] },
    thu: { key: 'upper-b', title: 'Upper B', subtitle: 'Shoulder width & Arms', minutes: 55, kind: 'upper', blocks: [
      L('assisted-pull-up', 3, [6, 10], 90, { ...star, note: 'Track the assistance kg.' }),
      L('machine-shoulder-press', 3, [10, 12], 90),
      L('single-arm-db-row', 3, [10, 12], 60, { ...star, perSide: true }),
      L('cable-lateral-raise', 3, [12, 15], 45, { ...star, perSide: true }),
      L('reverse-pec-deck', 3, [12, 15], 45),
      L('machine-chest-press', 2, [10, 12], 60),
      { type: 'superset', rest: 60, items: [
        { ex: 'overhead-cable-triceps-extension', sets: 2, reps: [12, 15], rest: 0 },
        { ex: 'hammer-curl', sets: 2, reps: [12, 12], rest: 60 },
      ] },
      { type: 'cardio', ex: 'incline-walk', minutes: 10, label: 'Finisher — incline walk' },
    ] },
    fri: { key: 'full-body', title: 'Full-Body Circuit', subtitle: 'Strength circuit + intervals', minutes: 50, kind: 'full', blocks: [
      { type: 'circuit', rounds: 3, rest: 75, items: [
        { ex: 'goblet-squat', reps: 12 },
        { ex: 'incline-push-up', reps: 10 },
        { ex: 'single-arm-db-row', reps: 12, perSide: true },
        { ex: 'db-reverse-lunge', reps: 8, perSide: true, note: 'Light dumbbells' },
        { ex: 'seated-db-shoulder-press', reps: 10 },
        { ex: 'plank', hold: 40 },
      ] },
      INTERVALS,
    ] },
    sat: { key: 'active', title: 'Active day', minutes: 55, kind: 'active', note: '45–60 min brisk walk, dance class or badminton — do it together with Vikas — plus 10 min mobility.', blocks: [
      { type: 'cardio', ex: 'incline-walk', minutes: 45, label: 'Brisk walk, dance class or badminton — 45–60 min' },
      { type: 'mobility', minutes: 10, label: 'Mobility — 10 min' },
    ] },
    sun: { key: 'rest', title: 'Rest', subtitle: '30 min easy walk', minutes: 30, kind: 'rest', note: 'Rest day, plus a 30 min easy walk.', blocks: [] },
  },
  months: {
    2: {
      note: 'Month 2 swaps',
      swap: {
        'seated-db-shoulder-press': { ex: 'arnold-press' },
        'lat-pulldown': { ex: 'neutral-grip-pulldown', note: 'Close neutral grip' },
        'db-romanian-deadlift': { ex: 'bb-romanian-deadlift', note: 'Light-moderate' },
        'incline-push-up': { note: 'Lower incline than Month 1' },
      },
      replace: {
        wed: [
          { type: 'cardio', ex: 'incline-walk', minutes: 32, label: 'Incline-walk intervals', note: '2 min @ 12% / 2 min @ 6%',
            intervals: { work: 120, easy: 120, rounds: 8, workLabel: '12% incline', easyLabel: '6% incline' } },
          { type: 'circuit', rounds: 3, rest: 60, items: [
            { ex: 'dead-bug', reps: 10, perSide: true },
            { ex: 'pallof-press', reps: 10, perSide: true },
            { ex: 'plank', hold: 35, note: '30–40 s' },
            { ex: 'bird-dog', reps: 8, perSide: true },
          ] },
          { type: 'mobility', minutes: 10, label: 'Mobility — 10 min (guided)' },
        ],
        fri: [
          { type: 'circuit', rounds: 3, rest: 75, items: [
            { ex: 'kettlebell-deadlift', reps: 12 },
            { ex: 'incline-push-up', reps: 8, note: 'Push-up — the lowest incline you can do' },
            { ex: 'inverted-row', reps: 10 },
            { ex: 'db-reverse-lunge', reps: 8, perSide: true, note: 'Goblet hold' },
            { ex: 'landmine-press', reps: 10, perSide: true },
            { ex: 'bear-crawl-hold', hold: 30 },
          ] },
          INTERVALS,
        ],
      },
    },
    3: {
      note: 'Month 3: circuit goes to 4 rounds, Zone-2 to 40 min, pulldown and press to 8–10 reps, heavier.',
      swap: {
        'lat-pulldown': { reps: [8, 10] },
        'seated-db-shoulder-press': { reps: [8, 10] },
        'machine-shoulder-press': { reps: [8, 10] },
      },
      circuitRounds: 4,
      replace: {
        wed: [
          { type: 'cardio', ex: 'incline-walk', minutes: 40, label: 'Zone-2 cardio', note: 'Incline walk or cycle — a pace where you can talk in short sentences.' },
          { type: 'circuit', rounds: 3, rest: 60, items: [
            { ex: 'dead-bug', reps: 10, perSide: true },
            { ex: 'pallof-press', reps: 10, perSide: true },
            { ex: 'plank', hold: 35, note: '30–40 s' },
            { ex: 'bird-dog', reps: 8, perSide: true },
          ] },
          { type: 'mobility', minutes: 10, label: 'Mobility — 10 min (guided)' },
        ],
      },
    },
  },
  day0: [
    finder('goblet-squat'), finder('machine-chest-press'), finder('lat-pulldown'), finder('seated-cable-row'),
    finder('db-romanian-deadlift'), finder('seated-db-shoulder-press'), finder('db-lateral-raise'),
    { type: 'lift', ex: 'plank', sets: 2, hold: [30, 30], rest: 45 },
  ],
  milestones: [
    { id: 'pushup-10', label: '10 floor push-ups' },
    { id: 'assist-half', label: 'Pull-up assistance halved' },
    { id: 'pullup-1', label: 'First unassisted pull-up (stretch goal)' },
    { id: 'steps-30', label: '8k+ steps 30 days in a row' },
    { id: 'streak-12', label: '12-week streak' },
  ],
}
