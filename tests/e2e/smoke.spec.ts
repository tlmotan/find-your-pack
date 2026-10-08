import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The critical path, end to end: create → open lobby → two phones join → Start →
// countdown → reveal → hidden → End (PRD H1, H1b, H5, H7, P1, P3, P4).
//
// Why this exists: every test in tests/*.test.ts is a pure function, so a screen
// that throws while rendering passes the whole suite. This spec renders them.
//
// It needs the local Supabase stack running (`npm run db:start`). playwright.config.ts
// pins the app at 127.0.0.1:54321 and never reads .env.local, so a run cannot
// touch the hosted project.

/**
 * Fails the test on any uncaught exception or console error, on every page.
 *
 * This is the actual crash detector. A React render that throws surfaces here as
 * a pageerror even when the screen merely goes blank, which is exactly the
 * failure mode a unit test over pure functions cannot see.
 */
function watchForCrashes(page: Page, label: string, sink: string[]): void {
  page.on("pageerror", (error) => {
    sink.push(`[${label}] uncaught: ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;

    const text = msg.text();
    // Realtime drops its websocket whenever a context closes, and a phone on a
    // slow network is expected to retry; neither is a bug in the app.
    const expected = [/websocket/i, /Failed to load resource/i, /favicon/i];
    if (expected.some((pattern) => pattern.test(text))) return;

    sink.push(`[${label}] console.error: ${text}`);
  });
}

/** A phone: its own context, so it gets its own device token (lib/device-token.ts). */
async function newPhone(
  context: BrowserContext,
  label: string,
  sink: string[],
): Promise<Page> {
  const page = await context.newPage();
  watchForCrashes(page, label, sink);
  return page;
}

test.describe("a whole game", () => {
  test("host runs a game and both phones follow it through @smoke", async ({ browser }) => {
    // Collected across every context and asserted at the end, so a crash on one
    // phone is reported even if the assertions it would have broken come later.
    const crashes: string[] = [];

    const hostContext = await browser.newContext();
    const phoneAContext = await browser.newContext();
    const phoneBContext = await browser.newContext();

    try {
      const host = await newPhone(hostContext, "host", crashes);

      // ---- Create the game (H1) ------------------------------------------------
      await test.step("host creates a game", async () => {
        await host.goto("/host/new");
        await host.getByRole("button", { name: "Create game" }).click();

        // The host link is shown exactly once, with the secret in the fragment.
        await expect(host.getByRole("button", { name: "I’ve saved it" })).toBeVisible();
        await host.getByRole("button", { name: "I’ve saved it" }).click();

        await expect(host).toHaveURL(/\/host\/[0-9a-f-]{36}#key=/);
      });

      // ---- Open the lobby (H1b) ------------------------------------------------
      // exact: the helper line under the button quotes the pill's words back.
      await expect(host.getByText("Not open yet", { exact: true })).toBeVisible();
      await host.getByRole("button", { name: "Open lobby" }).click();
      await expect(host.getByText("Lobby open", { exact: true })).toBeVisible();

      // The join code is the one thing the phones need. translate="no" is on it
      // because an auto-translated code is one nobody can type.
      const joinCode = (await host.locator('p[translate="no"]').innerText()).trim();
      expect(joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

      // ---- Two phones join (P1) ------------------------------------------------
      // Two, because start_session refuses below MIN_PLAYERS_TO_START.
      const phoneA = await newPhone(phoneAContext, "phone A", crashes);
      const phoneB = await newPhone(phoneBContext, "phone B", crashes);

      await test.step("both phones scan in and wait", async () => {
        await phoneA.goto(`/join/${joinCode}`);
        await phoneB.goto(`/join/${joinCode}`);

        // /join hands over to /play on its own; the code rides along so the phone
        // can subscribe to the broadcast channel.
        await expect(phoneA).toHaveURL(new RegExp(`/play/[0-9a-f-]{36}\\?code=${joinCode}`));
        await expect(phoneA.getByRole("heading", { name: "You’re in" })).toBeVisible();
        await expect(phoneB.getByRole("heading", { name: "You’re in" })).toBeVisible();
      });

      // The host's count is what Start will act on, so wait for the real number
      // rather than assuming the heartbeat has landed (it polls every 3 s).
      //
      // The number and its label are separate elements inside one aria-atomic
      // region — deliberately, so a screen reader hears "2 phones joined" rather
      // than a bare number changing — so the region is what to assert on.
      const joinedCount = host.getByRole("status");
      await expect(joinedCount).toContainText("phones joined");
      await expect(joinedCount).toContainText("2");

      // ---- Start (H5) ----------------------------------------------------------
      await host.getByRole("button", { name: "Start the game" }).click();

      await test.step("both phones reveal a pack and then hide it", async () => {
        // The group only has to appear; which group each phone gets is random,
        // and asserting a specific one would make this flaky by design.
        await expect(phoneA.getByText("in your pack")).toBeVisible();
        await expect(phoneB.getByText("in your pack")).toBeVisible();

        // Hiding is enforced by the server (hard rule 5), so this is the
        // assertion that matters most on this screen: the reveal ends by itself.
        await expect(phoneA.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
          timeout: 30_000,
        });
        await expect(phoneB.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
          timeout: 30_000,
        });
      });

      // Group sizes replace the QR once the game is running.
      await expect(host.getByRole("heading", { name: "Packs" })).toBeVisible();

      // ---- End (H7) ------------------------------------------------------------
      await test.step("host ends the game and the phones are told", async () => {
        await host.getByRole("button", { name: "End game" }).click();
        await host.getByRole("button", { name: "Yes, end it" }).click();

        await expect(host.getByRole("heading", { name: "Game ended" })).toBeVisible();

        // Both phones played, so each gets the feedback sheet over the ended
        // screen rather than the bare "this game has ended".
        await expect(phoneA.getByRole("heading", { name: "That’s a wrap" })).toBeVisible();
        await expect(phoneB.getByRole("heading", { name: "That’s a wrap" })).toBeVisible();

        // The one thing that must never happen on a game the host did end: a
        // phone being told it lost its spot.
        await expect(phoneA.getByText("We lost your spot")).toHaveCount(0);
      });

      expect(crashes, `Crashes detected:\n${crashes.join("\n")}`).toHaveLength(0);
    } finally {
      await hostContext.close();
      await phoneAContext.close();
      await phoneBContext.close();
    }
  });
});
