import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (AGENTS.md "Commands": npm run test:e2e).
//
// These drive the real app against a real Postgres, because the bugs they exist
// to catch are the ones the Vitest suite cannot see: every test in tests/*.test.ts
// is a pure function, so nothing there ever renders a component or completes a
// round trip. A screen that throws on an unexpected server response passes lint,
// typecheck and all 120 unit tests.

/**
 * ALWAYS the local Supabase stack, never the hosted project.
 *
 * A run creates and deletes real sessions, so pointing this at production would
 * mean test games appearing in a live event. .env.local is not consulted on
 * purpose: it is edited by hand during dry runs (it currently holds a LAN
 * address so phones can reach the local stack), and an E2E suite must not
 * change targets because of a line someone uncommented.
 *
 * The anon key below is Supabase's published local-dev key — the same one
 * `supabase start` prints for everybody. It is not a secret, and the real one
 * never belongs in a committed file.
 */
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.E2E_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const PORT = 3100; // Not 3000: a dev server you already have open stays untouched.
const REMOTE_BASE_URL = process.env.E2E_BASE_URL;
if (REMOTE_BASE_URL && process.env.E2E_ALLOW_REMOTE !== "1") {
  throw new Error("Set E2E_ALLOW_REMOTE=1 to explicitly allow a hosted Playwright target.");
}
if (REMOTE_BASE_URL && !REMOTE_BASE_URL.startsWith("https://")) {
  throw new Error("E2E_BASE_URL must use HTTPS when testing a remote site.");
}
const BASE_URL = REMOTE_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",

  // Serial. Every test drives a whole game through one shared database, and
  // start_session counts *active phones in the session*, so a parallel run would
  // have tests assigning each other's players.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  // A full game is slower than a page load: open lobby, join, a 3 s countdown,
  // a 5 s reveal window, then the ended wipe.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // One project, a phone. This app is mobile-first and players only ever meet it
  // on a handset; the host dashboard is wide but it is the same DOM.
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 5"] } }],

  ...(REMOTE_BASE_URL
    ? {}
    : {
        webServer: {
    // next dev, not a production build: the point is the fastest loop that still
    // exercises real components. CI can afford `build && start` later.
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    },
        },
      }),
});
