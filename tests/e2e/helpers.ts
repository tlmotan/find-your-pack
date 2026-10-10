// Shared helpers for the end-to-end specs: crash detection, a phone per browser
// context (so each gets its own device token), and the host actions.
//
// Lifted out of smoke.spec.ts when rounds.spec.ts needed the same scaffolding —
// two copies of "create a game and get six phones into it" would drift.
//
// playwright.config.ts pins the app at 127.0.0.1:54321 and never reads .env.local,
// so a run cannot touch the hosted project.

import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/** Fails the test on uncaught exceptions or unexpected console errors. */
export function watchForCrashes(page: Page, label: string, sink: string[]): void {
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
export async function newPhone(
  context: BrowserContext,
  label: string,
  sink: string[],
): Promise<Page> {
  const page = await context.newPage();
  watchForCrashes(page, label, sink);
  return page;
}

export type TestGame = {
  hostContext: BrowserContext;
  host: Page;
  phoneContexts: BrowserContext[];
  phones: Page[];
  crashes: string[];
  joinCode: string;
};

export async function createOpenGame(browser: Browser): Promise<TestGame> {
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

export async function joinPhone(
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

export async function startGame(game: TestGame, browser: Browser): Promise<void> {
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

export async function currentPackSizes(host: Page): Promise<number[]> {
  const rows = await host.getByRole("listitem").allInnerTexts();
  return rows
    .map((row) => row.match(/\b(\d+)\s+players?\b/i)?.[1])
    .filter((size): size is string => size !== undefined)
    .map(Number)
    .sort((a, b) => a - b);
}

export async function expectPackSizes(host: Page, sizes: number[]): Promise<void> {
  await expect.poll(() => currentPackSizes(host), { timeout: 15_000 }).toEqual(
    [...sizes].sort((a, b) => a - b),
  );
}

export async function endGame(game: TestGame): Promise<void> {
  const endButton = game.host.getByRole("button", { name: "End game" });
  if (await endButton.isVisible()) {
    await endButton.click();
    await game.host.getByRole("button", { name: "Yes, end it" }).click();
    await expect(game.host.getByRole("heading", { name: "Game ended" })).toBeVisible();
  }
}

export async function closeGame(game: TestGame): Promise<void> {
  try {
    await endGame(game);
  } finally {
    await Promise.all(
      [game.hostContext, ...game.phoneContexts].map((context) => context.close()),
    );
  }
  expect(game.crashes, `Crashes detected:\n${game.crashes.join("\n")}`).toHaveLength(0);
}

