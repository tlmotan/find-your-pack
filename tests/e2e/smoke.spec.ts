import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

// The critical path, end to end: create → open lobby → two phones join → Start →
// countdown → reveal → hidden → End (PRD H1, H1b, H5, H7, P1, P3, P4).
//
// Why this exists: every test in tests/*.test.ts is a pure function, so a screen
// that throws on an unexpected server response passes those tests. This spec
// renders the UI and completes a round trip through local Supabase.
//
// playwright.config.ts pins the app at 127.0.0.1:54321 and never reads .env.local,
// so a run cannot touch the hosted project.

/** Fails the test on uncaught exceptions or unexpected console errors. */
function watchForCrashes(page: Page, label: string, sink: string[]): void {
  page.on("pageerror", (error) => {
    sink.push(`[${label}] uncaught: ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;

    const text = msg.text();
    // Realtime can drop a websocket as a context closes; phones also retry
    // expected failed requests such as a missing favicon.
    const expected = [/websocket/i, /Failed to load resource/i, /favicon/i];
    if (expected.some((pattern) => pattern.test(text))) return;

    sink.push(`[${label}] console.error: ${text}`);
  });
}

/** A phone has its own context, and therefore its own device token. */
async function newPhone(
  context: BrowserContext,
  label: string,
  sink: string[],
): Promise<Page> {
  const page = await context.newPage();
  watchForCrashes(page, label, sink);
  return page;
}

type TestGame = {
  hostContext: BrowserContext;
  host: Page;
  phoneContexts: BrowserContext[];
  phones: Page[];
  crashes: string[];
  joinCode: string;
};

async function createOpenGame(browser: Browser): Promise<TestGame> {
  const crashes: string[] = [];
  const hostContext = await browser.newContext();
  const game: TestGame = {
    hostContext,
    host: await newPhone(hostContext, "host", crashes),
    phoneContexts: [],
    phones: [],
    crashes,
    joinCode: "",
  };

  try {
    await game.host.goto("/host/new");
    await game.host.getByRole("button", { name: "Create game" }).click();
    await game.host.getByRole("button", { name: "I’ve saved it" }).click();
    await expect(game.host).toHaveURL(/\/host\/[0-9a-f-]{36}#key=/);
    await expect(game.host.getByText("Not open yet", { exact: true })).toBeVisible();

    await game.host.getByRole("button", { name: "Open lobby" }).click();
    await expect(game.host.getByText("Lobby open", { exact: true })).toBeVisible();
    game.joinCode = (await game.host.locator('p[translate="no"]').innerText()).trim();
    expect(game.joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    return game;
  } catch (error) {
    await hostContext.close();
    throw error;
  }
}

async function joinPhone(
  game: TestGame,
  browser: Browser,
  expectWaiting = true,
): Promise<Page> {
  const context = await browser.newContext();
  game.phoneContexts.push(context);
  const phone = await newPhone(context, `phone ${game.phones.length + 1}`, game.crashes);
  game.phones.push(phone);

  await phone.goto(`/join/${game.joinCode}`);
  await expect(phone).toHaveURL(
    new RegExp(`/play/[0-9a-f-]{36}\\?code=${game.joinCode}`),
  );
  if (expectWaiting) {
    await expect(phone.getByRole("heading", { name: "You’re in" })).toBeVisible();
  }
  return phone;
}

async function startGame(game: TestGame, browser: Browser): Promise<void> {
  for (let i = game.phones.length; i < 6; i += 1) {
    await joinPhone(game, browser);
  }

  const joinedCount = game.host.getByRole("status");
  await expect(joinedCount).toContainText("6");
  await expect(joinedCount).toContainText("phones joined");
  const startButton = game.host.getByRole("button", { name: "Start the game" });
  await expect(startButton).toBeEnabled();
  await startButton.click();
  await expect(game.host.getByRole("heading", { name: "Packs" })).toBeVisible();
}

async function currentPackSizes(host: Page): Promise<number[]> {
  const rows = await host.getByRole("listitem").allInnerTexts();
  return rows
    .map((row) => row.match(/\b(\d+)\s+players?\b/i)?.[1])
    .filter((size): size is string => size !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

async function expectPackSizes(host: Page, sizes: number[]): Promise<void> {
  await expect.poll(() => currentPackSizes(host), { timeout: 15_000 }).toEqual(
    [...sizes].sort((a, b) => a - b),
  );
}

async function endGame(game: TestGame): Promise<void> {
  const endButton = game.host.getByRole("button", { name: "End game" });
  if (await endButton.isVisible()) {
    await endButton.click();
    await game.host.getByRole("button", { name: "Yes, end it" }).click();
    await expect(game.host.getByRole("heading", { name: "Game ended" })).toBeVisible();
  }
}

async function closeGame(game: TestGame): Promise<void> {
  try {
    await endGame(game);
  } finally {
    await Promise.all(
      [game.hostContext, ...game.phoneContexts].map((context) => context.close()),
    );
  }
  expect(game.crashes, `Crashes detected:\n${game.crashes.join("\n")}`).toHaveLength(0);
}

test.describe("a whole game", () => {
  test("host runs a game and both phones follow it through @smoke", async ({ browser }) => {
    const crashes: string[] = [];

    const hostContext = await browser.newContext();
    const phoneAContext = await browser.newContext();
    const phoneBContext = await browser.newContext();

    try {
      const host = await newPhone(hostContext, "host", crashes);

      await test.step("host creates a game", async () => {
        await host.goto("/host/new");
        await host.getByRole("button", { name: "Create game" }).click();
        await expect(host.getByRole("button", { name: "I’ve saved it" })).toBeVisible();
        await host.getByRole("button", { name: "I’ve saved it" }).click();
        await expect(host).toHaveURL(/\/host\/[0-9a-f-]{36}#key=/);
      });

      await expect(host.getByText("Not open yet", { exact: true })).toBeVisible();
      await host.getByRole("button", { name: "Open lobby" }).click();
      await expect(host.getByText("Lobby open", { exact: true })).toBeVisible();
      const joinCode = (await host.locator('p[translate="no"]').innerText()).trim();
      expect(joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

      const phoneA = await newPhone(phoneAContext, "phone A", crashes);
      const phoneB = await newPhone(phoneBContext, "phone B", crashes);
      await test.step("both phones scan in and wait", async () => {
        await phoneA.goto(`/join/${joinCode}`);
        await phoneB.goto(`/join/${joinCode}`);
        await expect(phoneA).toHaveURL(new RegExp(`/play/[0-9a-f-]{36}\\?code=${joinCode}`));
        await expect(phoneA.getByRole("heading", { name: "You’re in" })).toBeVisible();
        await expect(phoneB.getByRole("heading", { name: "You’re in" })).toBeVisible();
      });

      const joinedCount = host.getByRole("status");
      await expect(joinedCount).toContainText("phones joined");
      await expect(joinedCount).toContainText("2");
      await host.getByRole("button", { name: "Start the game" }).click();

      await test.step("both phones reveal a pack and then hide it", async () => {
        await expect(phoneA.getByText("in your pack")).toBeVisible();
        await expect(phoneB.getByText("in your pack")).toBeVisible();
        await expect(phoneA.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
          timeout: 30_000,
        });
        await expect(phoneB.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
          timeout: 30_000,
        });
      });

      await expect(host.getByRole("heading", { name: "Packs" })).toBeVisible();
      await test.step("host ends the game and the phones are told", async () => {
        await host.getByRole("button", { name: "End game" }).click();
        await host.getByRole("button", { name: "Yes, end it" }).click();
        await expect(host.getByRole("heading", { name: "Game ended" })).toBeVisible();
        await expect(phoneA.getByRole("heading", { name: "That’s a wrap" })).toBeVisible();
        await expect(phoneB.getByRole("heading", { name: "That’s a wrap" })).toBeVisible();
        await expect(phoneA.getByText("We lost your spot")).toHaveCount(0);
      });

      expect(crashes, `Crashes detected:\n${crashes.join("\n")}`).toHaveLength(0);
    } finally {
      await Promise.all([hostContext, phoneAContext, phoneBContext].map((context) => context.close()));
    }
  });
});

test.describe("staggered player arrivals", () => {
  test("players joining one at a time wait without seeing a group before Start", async ({
    browser,
  }) => {
    const game = await createOpenGame(browser);

    try {
      const startButton = game.host.getByRole("button", { name: "Start the game" });

      for (let count = 1; count <= 3; count += 1) {
        const phone = await joinPhone(game, browser);
        await expect(game.host.getByRole("status")).toContainText(`${count}`);
        await expect(phone.getByRole("heading", { name: "You’re in" })).toBeVisible();
        await expect(phone.getByText("in your pack")).toHaveCount(0);
        if (count === 1) {
          await expect(startButton).toBeDisabled();
        } else {
          await expect(startButton).toBeEnabled();
        }
      }
    } finally {
      await closeGame(game);
    }
  });

  test("a player joining after Start gets an assignment and their own reveal", async ({
    browser,
  }) => {
    const game = await createOpenGame(browser);

    try {
      await startGame(game, browser);
      await expectPackSizes(game.host, [3, 3]);

      const latePhone = await joinPhone(game, browser, false);
      await expect(latePhone.locator("main")).toContainText("Your flag is about to go up.", {
        timeout: 5_000,
      });
      await expect(latePhone.getByText("in your pack")).toBeVisible({ timeout: 10_000 });
      await expect(
        latePhone.getByRole("heading", { name: "Make your sound!" }),
      ).toBeVisible({ timeout: 15_000 });
      await expectPackSizes(game.host, [3, 4]);
    } finally {
      await closeGame(game);
    }
  });

  test("multiple late players are each assigned to a smallest pack", async ({ browser }) => {
    const game = await createOpenGame(browser);

    try {
      await startGame(game, browser);
      await expectPackSizes(game.host, [3, 3]);
      for (const phone of game.phones) {
        await expect(phone.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
          timeout: 30_000,
        });
      }

      for (const sizes of [[3, 4], [4, 4], [4, 5]]) {
        const latePhone = await joinPhone(game, browser, false);
        await expect(latePhone.getByText("in your pack")).toBeVisible({ timeout: 10_000 });
        await expect(
          latePhone.getByRole("heading", { name: "Make your sound!" }),
        ).toBeVisible({ timeout: 15_000 });
        await expectPackSizes(game.host, sizes);
      }
    } finally {
      await closeGame(game);
    }
  });

  test("a player arriving after the original reveal still gets a full reveal window", async ({
    browser,
  }) => {
    const game = await createOpenGame(browser);

    try {
      await startGame(game, browser);
      await expectPackSizes(game.host, [3, 3]);
      for (const phone of game.phones) {
        await expect(phone.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
          timeout: 30_000,
        });
      }

      const latePhone = await joinPhone(game, browser, false);
      await expect(latePhone.getByText("in your pack")).toBeVisible({ timeout: 10_000 });
      const revealStartedAt = Date.now();
      await expect(
        latePhone.getByRole("heading", { name: "Make your sound!" }),
      ).toBeVisible({ timeout: 15_000 });
      expect(Date.now() - revealStartedAt).toBeGreaterThanOrEqual(4_000);
      await expectPackSizes(game.host, [3, 4]);
    } finally {
      await closeGame(game);
    }
  });
});
