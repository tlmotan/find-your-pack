# Find Your Pack

A free, open-source web app for live icebreakers. Players scan a QR code and get a secret group (e.g. an animal). When the host presses Start, every phone reveals at the same moment. Then the group hides, and everyone finds their pack by making the sound.

No sign-up. No names. No personal data.

> **Status:** scaffold. Data model and structure are in place; features are being built one at a time.

## Docs
- `PRD.md`: what we're building and why.
- `ARCHITECTURE-ESSENTIALS.md`: the critical decisions. Start here.
- `ARCHITECTURE.md`: full design detail.
- `AGENTS.md` / `CLAUDE.md`: instructions for AI coding agents.

## Local setup
Requirements: Node 20+, Docker (for local Supabase).

```bash
npm install
npx supabase init          # first time only; creates supabase/config.toml (keep the existing migrations)
npm run db:start           # starts local Supabase and applies migrations
cp .env.example .env.local # paste the local URL and anon key printed by db:start
npm run dev
```

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm test` | Unit tests (Vitest) |
| `npm run db:reset` | Rebuild the local database from migrations |
| `npm run db:test` | Database tests (pgTAP) |
| `npm run load` | Load test with k6 (real project only) |

## Project structure
```
app/                     Pages (Next.js App Router)
  host/new               Create a game
  host/[sessionId]       Host dashboard (secret in #key)
  join/[code]            QR lands here; no form
  play/[sessionId]       Player screens
  api/keepalive          Daily ping so the free database doesn't pause
components/host, play    UI pieces
hooks/                   Polling, broadcast, and screen-state logic
lib/                     Types, themes, validation, RPC wrappers, pure logic
supabase/migrations/     Schema, lock-down, functions, cleanup cron
supabase/tests/          Database tests (pgTAP)
tests/                   Unit tests and the k6 load test
```

## Deploy
1. Create a Supabase project and run the migrations (`npx supabase db push`).
2. Import the repo into Vercel and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. The keep-alive cron in `vercel.json` runs automatically.

## License
TBD (e.g. MIT).
