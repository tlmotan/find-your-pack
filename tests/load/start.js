// k6 load test (ARCHITECTURE.md §6.3): N phones join a lobby, poll while waiting,
// then all fetch their group in one burst at Start.
//
// Run against a real Supabase project only, and only when asked (AGENTS.md):
//   k6 run -e SUPABASE_URL=... -e ANON_KEY=... -e JOIN_CODE=... \
//          -e START_AT=<unix seconds> tests/load/start.js
//
// START_AT is the wall-clock second the host presses Start. Every VU waits for
// it, then fires get_my_state inside START_JITTER_MS — that is the only way to
// reproduce the real burst, because in the app the burst is triggered by one
// broadcast, not by polling.
//
// START_COMMIT_MS models the gap the broadcast already gives us for free: the
// host only announces "started" after start_session has committed, so no real
// phone can fetch before the groups exist. Without this lead the test asks for a
// group before Start is written and scores its own race as a failure.

import http from "k6/http";
import { sleep, check } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

// Mirrors lib/constants.ts. Keep in sync.
const POLL_WAITING_MS = 5_000;
const POLL_AFTER_REVEAL_MS = 10_000;
const START_JITTER_MS = 500;
const JOIN_JITTER_MS = 2_000;
const RPC_TIMEOUT_MS = 10_000;

const PHONES = Number(__ENV.PHONES || 150);
const START_COMMIT_MS = Number(__ENV.START_COMMIT_MS || 1_000);
const AFTER_START_SECONDS = Number(__ENV.AFTER_START_SECONDS || 60);

const URL = __ENV.SUPABASE_URL;
const KEY = __ENV.ANON_KEY;
const JOIN_CODE = __ENV.JOIN_CODE;
const SESSION_ID = __ENV.SESSION_ID;
const START_AT = Number(__ENV.START_AT || 0);

// Split by phase, because the whole question is whether the Start burst is
// slower than the idle polling — an aggregate would hide exactly that.
const joinMs = new Trend("fyp_join_ms", true);
const waitPollMs = new Trend("fyp_waiting_poll_ms", true);
const revealBurstMs = new Trend("fyp_reveal_burst_ms", true);
const afterRevealPollMs = new Trend("fyp_after_reveal_poll_ms", true);
const revealedOk = new Rate("fyp_revealed_ok");
const rpcErrors = new Counter("fyp_rpc_errors");

export const options = {
  scenarios: {
    // One iteration per VU: each iteration is one phone's whole lifecycle,
    // rather than a treadmill of unrelated requests.
    phones: {
      executor: "per-vu-iterations",
      vus: PHONES,
      iterations: 1,
      maxDuration: "5m",
    },
  },
  thresholds: {
    // The burst is the moment that must not degrade: every phone reveals
    // together, so a slow tail is a visible bug in the room.
    "fyp_reveal_burst_ms": [`p(95)<2000`, `p(99)<${RPC_TIMEOUT_MS}`],
    "fyp_waiting_poll_ms": ["p(95)<1500"],
    "fyp_join_ms": ["p(95)<2000"],
    "fyp_revealed_ok": ["rate==1.0"],
    "fyp_rpc_errors": ["count==0"],
  },
};

function rpc(fn, body) {
  const res = http.post(`${URL}/rest/v1/rpc/${fn}`, JSON.stringify(body), {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    timeout: `${RPC_TIMEOUT_MS}ms`,
    tags: { fn },
  });
  if (res.status !== 200) rpcErrors.add(1, { fn, status: res.status });
  return res;
}

function body(res) {
  try {
    return res.json();
  } catch {
    return null;
  }
}

/** Sleep until a wall-clock unix-seconds instant, or return false if it passed. */
function sleepUntil(unixSeconds) {
  const ms = unixSeconds * 1000 - Date.now();
  if (ms <= 0) return false;
  sleep(ms / 1000);
  return true;
}

export default function () {
  // A device token per VU, so each phone is a distinct player row. Only the
  // SHA-256 of this ever reaches the database (hard rule 2).
  const token = `load-vu-${__VU}-${Date.now()}`;

  // Smear the join the way the client does when the lobby opens.
  sleep((Math.random() * JOIN_JITTER_MS) / 1000);

  const joinRes = rpc("join_session", { p_join_code: JOIN_CODE, p_device_token: token });
  joinMs.add(joinRes.timings.duration);
  const joined = body(joinRes);
  check(joinRes, { "join ok": (r) => r.status === 200 });
  if (joinRes.status !== 200) return;

  const sessionId = SESSION_ID || (joined && joined.session_id);
  const myState = () => rpc("get_my_state", { p_session_id: sessionId, p_device_token: token });

  // --- Waiting phase: poll at the attentive rate until just before Start. ---
  while (START_AT > 0 && Date.now() < START_AT * 1000 - POLL_WAITING_MS) {
    const res = myState();
    waitPollMs.add(res.timings.duration);
    const s = body(res);
    // Before Start the server must not hand out a group (hard rule 4).
    check(res, {
      "waiting poll ok": (r) => r.status === 200,
      "no group before start": () => !s || s.group === undefined,
    });
    sleep(POLL_WAITING_MS / 1000);
  }

  // --- The burst: every phone fetches within START_JITTER_MS of Start. ---
  if (START_AT > 0) sleepUntil(START_AT + START_COMMIT_MS / 1000);
  sleep((Math.random() * START_JITTER_MS) / 1000);

  const burst = myState();
  revealBurstMs.add(burst.timings.duration);
  const revealed = body(burst);
  const gotGroup = burst.status === 200 && !!revealed && !!revealed.group;
  revealedOk.add(gotGroup);
  check(burst, {
    "reveal fetch ok": (r) => r.status === 200,
    "group present at reveal": () => gotGroup,
  });

  // --- After the reveal: back off, as the client does. ---
  const until = Date.now() + AFTER_START_SECONDS * 1000;
  while (Date.now() < until) {
    sleep(POLL_AFTER_REVEAL_MS / 1000);
    const res = myState();
    afterRevealPollMs.add(res.timings.duration);
    const s = body(res);
    check(res, { "after-reveal poll ok": (r) => r.status === 200 });
    // Stop for good once the session ends, rather than hammer a dead session.
    if (s && s.status === "ended") break;
  }
}
