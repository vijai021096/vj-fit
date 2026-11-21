# VJ Fit

Vijai's fat-loss & muscle companion — a static, offline-first React PWA (no backend needed).
Forked from V² Fit (vikaskalyan-rgb/v2-fit) and made single-user.

**Goal:** 86 kg → 77 kg, fat loss first while keeping muscle (`GOAL` in `src/types.ts` = `'cut'`; switch to `'bulk'` later).

- Workout plan: `src/data/program.vijai.ts` — 5-day split (Upper A / Lower A / Shoulders & Arms / Lower B / Upper B) + incline-walk finishers, Saturday cardio, Sunday rest.
- Meals: `src/data/meals.vijai.ts` — non-veg pools built on oats, egg whites, chapathi, boiled chicken/fish, carrot & beans. Carb portions auto-scale to the calorie target (~2,040 kcal at 86 kg).
- Targets: Mifflin-St Jeor × 1.45 activity − 550 kcal, floor 1,800 kcal, protein 1.9 g/kg (`src/engine/nutrition.ts`). Auto-adjusts every 14 days from your weigh-in trend.

`npm run dev` · `npm test` · `npm run build` · QA clock override: `?simulate=2026-11-23T07:00`
