# AGENTS.md

Instructions for AI coding agents working in this repo. This is the single source of agent instructions; `CLAUDE.md` just points here.

## Project
**Find Your Pack** (working name) is a free, open-source mobile web app for live icebreakers.

1. The host shows a QR code.
2. Players scan it and wait.
3. On Start, every phone reveals a secret group (e.g. an animal) at the same moment.
4. The group is then hidden, and players find their pack in real life by making the sound.

Built for a church youth service of 60–150 people on mobile data. **No personal data, no logins.**

## Read before coding
| File | When |
|---|---|
| `ARCHITECTURE-ESSENTIALS.md` | **Always, first.** Stack, non-negotiable rules, data model, RPC functions. |
| `ARCHITECTURE.md` | When you need detail on a section referenced in the essentials (e.g. `[§5.3]`). |
| `PRD.md` | When deciding what is in or out of scope. Requirement IDs (H1, P3, A2…) live here. |
| `DESIGN.md` | Before writing or restyling any UI. Colour, type, components, layout. Tokens are mirrored in `app/globals.css`. |

If a request conflicts with these docs, **stop and ask** instead of guessing.

## Stack
- Next.js (App Router) + TypeScript (strict) + Tailwind, deployed on Vercel.
- Supabase Postgres with RPC functions, Realtime **Broadcast** only, pg_cron.
- Supporting libraries: qrcode.react, Zod, Vitest, Playwright, k6.

## Commands
```bash
npm run dev                          # Next.js dev server
npm run lint                         # ESLint
npm run typecheck                    # tsc --noEmit
npm test                             # Vitest (pure logic only)
npm run test:e2e                     # Playwright: the whole game in a real browser
npm run test:e2e:ui                  # the same, in Playwright's UI mode
npx supabase start                   # local Supabase (Docker)
npx supabase migration new <name>    # create a migration file
npx supabase db reset                # rebuild local DB from migrations
k6 run tests/load/start.js           # load test (against a real project only when asked)
```
If a script doesn't exist yet, add it to `package.json` rather than inventing a different command.

`npm test` covers pure functions only — nothing in `tests/*.test.ts` renders a component, so a
screen that throws passes it. `npm run test:e2e` is what catches that: it drives a whole game
(create → open lobby → two phones → Start → reveal → hidden → End) in a real browser and fails on
any uncaught exception or console error. It needs the local Supabase stack up (`npm run db:start`)
and always talks to `127.0.0.1:54321`, never the hosted project.

## Hard rules (never break these)
1. **No personal data.** Never add name, email, phone, or account fields, or any tracking or analytics.
2. **No Supabase Auth.**
   - Players are identified by a device token from `lib/device-token.ts`.
   - Hosts are identified by the host secret from the URL fragment (`#key=…`).
   - Store only SHA-256 hashes of either.
3. **Tables stay locked.** RLS is on with **no policies**. All reads and writes go through `SECURITY DEFINER` functions with `SET search_path = public` that:
   - validate the token or secret,
   - reject expired sessions, and
   - run as one transaction.
4. **Never create groups or assignments before Start.**
5. **Never return a player's group after their reveal window ends.** Hiding must be enforced by the server, not the client.
6. **Broadcast events carry no data.** Clients react to an event by calling `get_my_state`.
7. **Lock the session row** (`SELECT … FOR UPDATE`) whenever assigning groups.
8. **Schema changes only through new migration files** in `supabase/migrations/`. Never edit an applied migration.
9. **No service-role key** in the app. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
10. **Stay in v1 scope.** No logins, saved themes, in-app "found my pack", or other PRD §11 future ideas unless explicitly asked.

## How to work
- **Plan first** for anything touching more than one file: list the files you'll change and why, then wait for approval.
- **Small steps.** One feature or fix per change. Don't refactor unrelated code.
- **Keep it simple.** Prefer the simplest thing that meets the docs. Ask before adding a new dependency, service, or abstraction.
- **Tests with logic.** Any change to assignment, reveal timing, or a database function needs a matching test (see Must-test in the essentials).
- **Run lint, typecheck, and tests** before saying a task is done, and report the results honestly, including failures.
- **Update the docs** when you change a decision: `ARCHITECTURE.md` first, then the matching line in `ARCHITECTURE-ESSENTIALS.md`. Never let them disagree.

## Teaching mode
The owner is learning backend development through this project.

When you write or change SQL functions, locking, timing, or other backend logic:
- add a short code comment explaining **why**, not just what, and
- give a 1–3 sentence plain explanation in your reply.

Skip explanations for routine UI code.

## Code conventions
- **TypeScript:** strict mode, no `any`. Validate all inputs with Zod at the boundary.
- **Pure logic** (assignment math, countdown math) lives in `lib/` as pure functions, so it's easy to unit-test.
- **Time:** never trust the phone's clock for game timing. Use `lib/server-clock.ts` (offset from `server_now`).
- **Mobile-first:** design for small, older phones and slow mobile data. Keep pages light, and avoid large images and heavy libraries.
- **Copy:** short, friendly, and readable at a glance (e.g. "Make your sound! 🔊").
- **SQL:** snake_case; one function per concern; comment each function's auth check.
- **Commits:** conventional style, e.g. `feat: add open_lobby function`, `fix: reveal window after late join`.

## Definition of done
- Meets the PRD requirement(s), with IDs referenced in the summary.
- Lint, typecheck, and tests pass.
- No hard rule broken.
- Docs updated if a decision changed.
- A short summary of what changed, what was tested, and anything left open.
