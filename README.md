# V² Fit

Vikas & Varsha's gym companion — a static, offline-first React PWA (no backend).

- `npm run dev` · `npm test` (Vitest engine tests) · `npm run build`
- Content is typed data in `src/data/` — edit the plan or meals there, no component changes needed.
- Pure logic lives in `src/engine/` (calendar, progression, nutrition, rotation, grocery).
- Fallback exercise photos: free-exercise-db (public domain / Unlicense), in `public/media/fallback/<id>/`.
- Phase-2 media: drop files in `public/media/hf/<id>/<male|female>.mp4|.webp` and list them in `public/media/hf/manifest.json`:
  `{ "db-lateral-raise": { "male": { "video": "/media/hf/db-lateral-raise/male.mp4", "poster": "/media/hf/db-lateral-raise/male.webp" } } }`
- QA clock override: append `?simulate=2026-11-16T07:00` to the URL.
