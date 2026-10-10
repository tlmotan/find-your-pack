import { expect, test, type Page } from "@playwright/test";

// Multiple rounds, end to end: Start → reveal → hidden → Start round 2 → a new
// countdown and a *different* pack on every phone → round 3 → End (PRD H10, A6,
// P3, H7).
//
// Why a browser test: the pgTAP tests prove the server deals a derangement, and
// the vitest tests prove the maths, but neither renders a screen. The thing that
// can actually break here is a phone sitting on "Make your sound!" through a new
// round because its reveal anchor never reset.

import { closeGame, createOpenGame, expectPackSizes, startGame } from "./helpers";

/**
 * The pack name shown during this phone's reveal.
 *
 * Polled rather than read once: the reveal lasts a few seconds and then the
 * group is gone for good, so there is no second chance to look. Both the reveal
 * and hidden screens show "in your pack", which is why the name is identified by
 * ruling out the headings belonging to the other screens.
 */
async function packNameAtReveal(phone: Page, label: string): Promise<string> {
  const notAPackName = ["Make your sound!", "You’re in", "That’s a wrap"];
  let name = "";

  await expect
    .poll(
      async () => {
        const heading = await phone
          .getByRole("heading", { level: 1 })
          .innerText()
          .catch(() => "");
        const text = heading.trim();
        if (text && !notAPackName.includes(text)) name = text;
        return name;
      },
      { timeout: 30_000, intervals: [100], message: `${label} never showed a pack` },
    )
    .not.toBe("");

  return name;
}

/** Every phone's pack for this round, captured together — the reveal is simultaneous. */
function packNamesAtReveal(phones: Page[]): Promise<string[]> {
  return Promise.all(phones.map((phone, i) => packNameAtReveal(phone, `phone ${i + 1}`)));
}

async function waitForHidden(phones: Page[]): Promise<void> {
  await Promise.all(
    phones.map((phone) =>
      expect(phone.getByRole("heading", { name: "Make your sound!" })).toBeVisible({
        timeout: 30_000,
      }),
    ),
  );
}

test.describe("more than one round", () => {
  // Each round costs a full reveal window plus a host poll before the button
  // opens, and this drives three of them.
  test.setTimeout(180_000);

  test("the host runs three rounds and every phone changes pack each time @smoke", async ({ browser }) => {
    const game = await createOpenGame(browser);

    try {
      await startGame(game, browser);
      const { host, phones } = game;

      // 6 phones → floor(6/3) = 2 packs, which is the tightest case for A6:
      // with two packs the whole room has to cross over.
      const roundOne = await packNamesAtReveal(phones);
      expect(new Set(roundOne).size, "both packs are in play").toBe(2);

      await test.step("the next round is refused until the reveal is over", async () => {
        const nextRound = host.getByRole("button", { name: /^Start round 2$/ });
        await expect(nextRound).toBeVisible();
        // The server decides this, so the button cannot offer a call that fails.
        await expect(nextRound).toBeDisabled();
        await expect(host.getByText("Wait for the reveal to finish.")).toBeVisible();
      });

      await waitForHidden(phones);
      await expectPackSizes(host, [3, 3]);
      await expect(host.getByText("Round 1", { exact: true })).toBeVisible();

      const roundTwo = await test.step("host starts round 2", async () => {
        const nextRound = host.getByRole("button", { name: /^Start round 2$/ });
        // Enabled within a host poll (3 s) of the window closing.
        await expect(nextRound).toBeEnabled({ timeout: 30_000 });
        await expect(host.getByText("Everyone gets a new pack.")).toBeVisible();
        await nextRound.click();

        // The columns cover the swap rather than cutting straight from
        // "Make your sound!" to a bare "3" (DESIGN.md §7). On screen for
        // ~880 ms, so this has to be the first thing checked after the click.
        await expect(phones[0]!.locator(".wipe-col").first()).toBeVisible({ timeout: 20_000 });

        return packNamesAtReveal(phones);
      });

      await test.step("nobody is left on the pack they just had", async () => {
        for (const [i, name] of roundTwo.entries()) {
          expect(name, `phone ${i + 1} was given ${name} twice`).not.toBe(roundOne[i]);
        }
      });

      await expect(host.getByText("Round 2", { exact: true })).toBeVisible();
      await waitForHidden(phones);
      // Swapping two players' packs cannot change a size, so ±1 still holds.
      await expectPackSizes(host, [3, 3]);

      await test.step("and again in round 3, so the previous round is tracked each time", async () => {
        const nextRound = host.getByRole("button", { name: /^Start round 3$/ });
        await expect(nextRound).toBeEnabled({ timeout: 30_000 });
        await nextRound.click();

        const roundThree = await packNamesAtReveal(phones);
        for (const [i, name] of roundThree.entries()) {
          expect(name, `phone ${i + 1} was given ${name} twice`).not.toBe(roundTwo[i]);
        }
        await expect(host.getByText("Round 3", { exact: true })).toBeVisible();
        await waitForHidden(phones);
      });

      // Ending is unchanged by rounds: still the one terminal act (H7), and a
      // player who revealed in any round is still asked to rate it (F1).
      await test.step("host ends the game after the last round", async () => {
        await host.getByRole("button", { name: "End game" }).click();
        await host.getByRole("button", { name: "Yes, end it" }).click();
        await expect(host.getByRole("heading", { name: "Game ended" })).toBeVisible();
        await Promise.all(
          phones.map((phone) =>
            expect(phone.getByRole("heading", { name: "That’s a wrap" })).toBeVisible({
              timeout: 30_000,
            }),
          ),
        );
      });
    } finally {
      await closeGame(game);
    }
  });
});
