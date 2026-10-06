// k6 load test (ARCHITECTURE.md §6.3): N phones join, heartbeat, then fetch after Start.
// Run against a real Supabase project only:  k6 run -e SUPABASE_URL=... -e ANON_KEY=... -e JOIN_CODE=... tests/load/start.js

import http from "k6/http";
import { sleep, check } from "k6";

export const options = { vus: 150, duration: "2m" };

const URL = __ENV.SUPABASE_URL;
const KEY = __ENV.ANON_KEY;
const JOIN_CODE = __ENV.JOIN_CODE;

function rpc(fn, body) {
  return http.post(`${URL}/rest/v1/rpc/${fn}`, JSON.stringify(body), {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  });
}

export default function () {
  // TODO: join once per VU, then poll get_my_state every 5 s; measure latency once started.
  const token = `load-${__VU}`;
  const res = rpc("join_session", { p_join_code: JOIN_CODE, p_device_token: token });
  check(res, { "join ok": (r) => r.status === 200 });
  sleep(5);
}
