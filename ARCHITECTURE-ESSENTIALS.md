# ARCHITECTURE-ESSENTIALS: Find Your Pack

Quick reference for critical decisions only. Full detail: `ARCHITECTURE.md` (section numbers in brackets). Product scope: `PRD.md`.

## Stack [§2]
- **Next.js (App Router) + TypeScript + Tailwind** on **Vercel**.
- **Supabase:** Postgres + RPC functions, Realtime **Broadcast** only, pg_cron.
- **No Supabase Auth.** Anonymous sign-in is rate-limited per IP, and 100+ phones share one venue IP. [§1]
- **Supporting libraries:** qrcode.react, Zod, Vitest, k6.
- Vercel Cron pings `/api/keepalive` daily so the free Supabase project doesn't pause. [§9]

## Non-negotiable rules
1. **No personal data.** Players = random **device token** (`crypto.randomUUID()` in `localStorage`). Host = **host secret** in the link fragment `/host/{id}#key=…`. Store only SHA-256 hashes of both. [§1, §7]
2. **Tables are locked.** RLS on with no policies. All access goes through `SECURITY DEFINER` RPC functions (fixed `search_path`) that check tokens and reject expired sessions. [§4.2, §5]
3. **Assignments are created at Start, never before.** [§5.1]
4. **Same-moment reveal.** Start sets `reveal_at = now() + 3s`. Phones count down to it using `server_now` to correct their clock. [§5.3]
5. **Server-enforced reveal window**, anchored to when the phone **first received** its group (`revealed_at`), not to Start. After `window_end`, never return the group again. [§5.3]
6. **Broadcast events carry no data.** On any event, phones call `get_my_state`. [§6.1]
7. **Only active phones are assigned at Start** (`last_seen_at` within 60 s). Others are assigned to the smallest group when they next check in. [§5.1–5.2]
8. **No joins before Open lobby.** While `scheduled`, `join_session` returns `not_open` and creates no row. Start needs ≥2 active players.
9. **Sessions expire** 1–7 days after creation (default 7). `end_session` deletes immediately; pg_cron deletes expired sessions.
10. **Finding your pack happens in real life.** No in-app "found" or "last" tracking in v1.

## Data model [§4]
```
sessions(id, join_code UK, host_secret_hash, theme_key? (label only), group_options jsonb [2–20],
         group_count_override?, reveal_seconds=5 [2–30], status scheduled|lobby|started,
         lobby_opened_at, started_at, reveal_at, created_at, expires_at)
groups(id, session_id FK cascade, name, emoji?, sound_hint?, sort_order)   -- created at Start
participants(id, session_id FK cascade, device_token_hash, group_id? FK,
             joined_at, last_seen_at, assigned_at?, revealed_at?)
  unique(session_id, device_token_hash)
feedback(id, created_at, rating [1-5], reasons text[] [<=10], comment [<=300], join_code?)
  -- NO FK to sessions, on purpose: end_session deletes the session, and the
  -- feedback sheet only appears because that row is already gone.
```
- Animal preset lives in `lib/themes.ts` (10 groups + owl and lion as spares).
- `group_options` is always stored on the session (preset copied from `lib/themes.ts`, or custom names), because Postgres can't read app code. Names 1–30 characters.

## RPC functions [§5]
| Function | Auth | Purpose |
|---|---|---|
| `create_session(groups, reveal_seconds, expires_in_days)` | — | `scheduled`; returns id, join code, raw host secret (once). |
| `get_host_state(id, secret)` | host | Status, settings, active count, group sizes. Polled every 3 s. |
| `update_settings(id, secret, …)` | host | Before Start only; expiry ≤ 7 days from `created_at`. |
| `open_lobby(id, secret)` | host | `scheduled` → `lobby`. |
| `start_session(id, secret)` | host | Needs `lobby` + ≥2 active; lock, assign, set `reveal_at`. |
| `end_session(id, secret)` | host | Delete session (cascade). Host page broadcasts `ended` first. |
| `join_session(join_code, device_token)` | device | `not_open` / `ended` / upsert row. |
| `get_my_state(id, device_token)` | device | Heartbeat; assign if started and unassigned; enforce reveal window. |
| `submit_feedback(rating, reasons, comment, join_code)` | — | Insert one post-game response. Write-only: no read function exists, because the anon key is public. Host reads the table in the Supabase dashboard. |

## Assignment [§5.1–5.2]
- Formula: `G = override ?? clamp(floor(N_active/3), 1, min(10, len(list)))`, and never more than `len(list)`.
- Shuffle active participants, then assign `i mod G`. Group sizes stay within ±1.
- Lock the session row (`SELECT … FOR UPDATE`) on Start and on every late assignment.
- Late or waking player: smallest group (ties → lowest `sort_order`). Their reveal = `assigned_at + 3s`.
- Pack size = `count(participants WHERE group_id = X)`.

## Reveal window [§5.3]
```
my_reveal_at = greatest(session.reveal_at, assigned_at + 3s)
revealed_at  = set once, the first time the group is returned
window_end   = greatest(my_reveal_at, revealed_at) + reveal_seconds + 3s
get_my_state → not_open | waiting | reveal{group, pack_size, my_reveal_at, server_now} | hidden{pack_size} | ended
```

## Update channels [§6]
| What | How |
|---|---|
| Start/End | Broadcast `session:{join_code}`: `started`, `ended`. Phones wait 0–500 ms jitter, then fetch. |
| Missed broadcast | Phone polls every 5 s while waiting. |
| Pack size | Phone polls every 10 s after reveal, and on `visibilitychange`. |
| Host dashboard | Polls `get_host_state` every 3 s. |

## File layout [§8]
```
app/  page.tsx | host/new (→ "Save your host link") | host/[sessionId] | join/[code] (no form)
      play/[sessionId] | api/keepalive/route.ts
lib/  supabase/client.ts | device-token.ts | server-clock.ts | themes.ts | assignment.ts
supabase/migrations/   # all schema, RLS lock-down, functions, cron — migrations only
tests/ assignment.test.ts | load/start.js
```
- **Player screen states:** `joining → waiting → countdown → revealed → hidden`, plus `not_open` and `ended`.
- **Env:** only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No service-role key in v1.

## Must-test [§10]
- Balance ±1 for N = 1–200; late and waking players go to the smallest group; G ≤ list length.
- The anon key can't touch tables directly; host functions reject a wrong secret.
- No group after `window_end`; a phone that first checks in late still gets a full reveal.
- Inactive players are skipped at Start but assigned on check-in; Start fails with <2 active players or before `open_lobby`.
- Expired sessions rejected; no join while `scheduled`.
- Feedback survives `end_session`; anon can call `submit_feedback` but cannot SELECT the table; only a player who reached a reveal is asked.
- k6: 150–300 phones against the real project. Dry run: lock a phone at Start, scan from an in-app browser.
