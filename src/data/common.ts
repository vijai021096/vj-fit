import type { WeekMod } from '../types'

/** Section 3 — week modifiers. Computed from (month, weekInMonth). */
export const WEEK_MODS: Record<string, WeekMod> = {
  Learn: { name: 'Learn', rir: '3–4', hint: 'One set fewer. Form first — leave 3–4 clean reps in the tank.' },
  Reset: { name: 'Reset', rir: '3', hint: 'Start the block at about 90% of last week’s loads.' },
  Build: { name: 'Build', rir: '2–3', hint: 'Full sets. Leave 2–3 reps in reserve.' },
  Push: { name: 'Push', rir: '1–2', hint: 'One extra set on ★ lifts. Leave 1–2 reps in reserve.' },
  Prove: { name: 'Prove', rir: '1–2', hint: 'Beat the logbook on every ★ lift — a rep PR or a load PR. Never test a 1-rep max.' },
}

export const WARMUP = {
  general: '5 min easy bike or incline walk',
  upper: ['Arm circles × 10', 'Band pull-aparts × 15', 'Scap push-ups × 10'],
  lower: ['Bodyweight squats × 10', 'Glute bridges × 10', 'Leg swings × 10 per side', 'Hip-hinge drill × 10'],
  ramp: [{ pct: 0.5, reps: 8 }, { pct: 0.7, reps: 5 }, { pct: 0.85, reps: 2 }],
}

export const COOLDOWN = ['Doorway chest stretch', 'Lat stretch', 'Hip-flexor stretch', 'Hamstring stretch', 'Child’s pose']
export const COOLDOWN_HOLD = 30

/** File ids for the warm-up / cool-down pictures in /media/routine (id.webp, id-2.webp for the second pose, id.f.webp for Varsha). */
export const ROUTINE_ID: Record<string, string> = {
  [WARMUP.general]: 'warm-bike',
  'Arm circles × 10': 'arm-circles', 'Band pull-aparts × 15': 'band-pull-aparts', 'Scap push-ups × 10': 'scap-push-ups',
  'Bodyweight squats × 10': 'bodyweight-squats', 'Glute bridges × 10': 'glute-bridges', 'Leg swings × 10 per side': 'leg-swings', 'Hip-hinge drill × 10': 'hip-hinge-drill',
  'Doorway chest stretch': 'doorway-chest-stretch', 'Lat stretch': 'lat-stretch', 'Hip-flexor stretch': 'hip-flexor-stretch', 'Hamstring stretch': 'hamstring-stretch', 'Child’s pose': 'childs-pose',
}

export const SAFETY = 'Sharp or joint pain → stop that exercise and swap it. Muscle burn is fine.'
export const WEEK1_BANNER = 'Ask a trainer to watch your squat, bench and Romanian deadlift once.'
export const FIRST_TIME = 'Pick a weight you could lift ~15 times, then do 10.'
export const DISCLAIMER = 'General fitness guidance, not medical advice. Check with a doctor if you have any medical condition.'

export const DAY0 = {
  baseline: [
    'Morning weigh-in (after the toilet, before food)',
    'Measurements',
    '4 progress photos — front, side, back, relaxed, same light',
  ],
  tour: ['Lat pulldown', 'Cable stack', 'Leg press', 'Smith machine', 'Dumbbell rack', 'Assisted pull-up machine'],
  warmup: '5 min bike',
  finish: 'Baseline saved. Week 1 starts tomorrow.',
}

export const RIR_EXPLAIN = 'RIR = Reps In Reserve: how many more clean reps you could have done. RIR 2 means you stopped with two good reps left.'

export const MUSCLE_INFO: Record<string, { name: string; does: string }> = {
  'upper-traps': { name: 'Upper traps', does: 'Lift and steady the shoulder blades.' },
  'mid-traps-rhomboids': { name: 'Mid traps & rhomboids', does: 'Pull the shoulder blades together — posture muscles.' },
  'front-delts': { name: 'Front delts', does: 'Raise the arm forward and press overhead.' },
  'side-delts': { name: 'Side delts', does: 'Raise the arm out to the side — shoulder width.' },
  'rear-delts': { name: 'Rear delts', does: 'Pull the arm back; balance the shoulder.' },
  'upper-chest': { name: 'Upper chest', does: 'Press up and inward on an incline.' },
  'mid-lower-chest': { name: 'Mid & lower chest', does: 'Press and bring the arms together.' },
  biceps: { name: 'Biceps', does: 'Bend the elbow and turn the palm up.' },
  brachialis: { name: 'Brachialis', does: 'Bends the elbow; adds arm thickness.' },
  forearms: { name: 'Forearms', does: 'Grip and wrist control.' },
  triceps: { name: 'Triceps', does: 'Straighten the elbow — every press.' },
  lats: { name: 'Lats', does: 'Pull the arms down and back — back width.' },
  'lower-back': { name: 'Lower back', does: 'Keeps the spine steady when you hinge.' },
  abs: { name: 'Abs', does: 'Brace the trunk and curl the ribs to the hips.' },
  obliques: { name: 'Obliques', does: 'Resist twisting and side-bending.' },
  glutes: { name: 'Glutes', does: 'Extend the hips — squats, hinges, stairs.' },
  'glute-med': { name: 'Glute med', does: 'Steadies the hips on one leg.' },
  'hip-flexors': { name: 'Hip flexors', does: 'Lift the knee toward the chest.' },
  adductors: { name: 'Adductors', does: 'Inner thigh; steady the knees in squats.' },
  quads: { name: 'Quads', does: 'Straighten the knee — squats and presses.' },
  hamstrings: { name: 'Hamstrings', does: 'Bend the knee and help extend the hips.' },
  calves: { name: 'Calves', does: 'Point the foot — push-off in walking.' },
  soleus: { name: 'Soleus', does: 'Deep calf; works hardest with a bent knee.' },
}
