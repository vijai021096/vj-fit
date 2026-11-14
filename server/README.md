# V² Fit sync server

Plain Node (`node:http`) + Postgres (Neon). No framework.

- `DATABASE_URL` (required) – Neon connection string
- `PORT` – set by Render
- `CORS_ORIGINS` – optional, comma-separated extras (regexes as `/…/`)

`npm test` runs against in-process Postgres (PGlite).
