"use client";

// Groups (preset or custom names), reveal timer, expiry (PRD H2, H3, H1a, H9).
// Used on /host/new, and in the lobby before Start.

import { useId, useRef, useState, type FormEvent } from "react";

import { EXPIRES_IN_DAYS, GROUP_OPTIONS, REVEAL_SECONDS } from "@/lib/constants";
import { THEMES } from "@/lib/themes";
import type { GroupOption } from "@/lib/types";
import { createSessionSchema, type CreateSessionInput } from "@/lib/validation";

type Props = {
  onSubmit: (input: CreateSessionInput) => void;
  submitLabel: string;
  busy?: boolean;
};

type Source = "animals" | "custom";

/** One name per line, blanks dropped. What the host types is what they get. */
function parseCustomNames(raw: string): GroupOption[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((name) => ({ name }));
}

export function SettingsForm({ onSubmit, submitLabel, busy = false }: Props) {
  const revealId = useId();
  const daysId = useId();
  const customId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);

  const [source, setSource] = useState<Source>("animals");
  const [customNames, setCustomNames] = useState("");
  const [revealSeconds, setRevealSeconds] = useState<number>(REVEAL_SECONDS.default);
  const [expiresInDays, setExpiresInDays] = useState<number>(EXPIRES_IN_DAYS.default);
  const [error, setError] = useState<string | null>(null);

  const customGroups = parseCustomNames(customNames);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      theme_key: source === "animals" ? "animals" : null,
      group_options: source === "animals" ? [...THEMES.animals.groups] : customGroups,
      reveal_seconds: revealSeconds,
      expires_in_days: expiresInDays,
    };

    // Zod at the boundary: the database re-checks the same limits, but the host
    // should hear about a typo here rather than as a Postgres error.
    const parsed = createSessionSchema.safeParse(input);
    if (!parsed.success) {
      setError(firstMessage(customGroups.length));
      // Send focus to the problem rather than leaving it on the button.
      errorRef.current?.focus();
      return;
    }

    setError(null);
    onSubmit(parsed.data);
  }

  function firstMessage(count: number): string {
    if (source === "custom" && count < GROUP_OPTIONS.min) {
      return `Add at least ${GROUP_OPTIONS.min} group names, one per line.`;
    }
    if (source === "custom" && count > GROUP_OPTIONS.max) {
      return `That's ${count} groups. The most you can have is ${GROUP_OPTIONS.max}.`;
    }
    if (source === "custom" && customGroups.some((g) => g.name.length > GROUP_OPTIONS.nameMaxLength)) {
      return `Keep each name under ${GROUP_OPTIONS.nameMaxLength} characters.`;
    }
    return "Check the settings above and try again.";
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[640px]">
      <fieldset className="border-0 p-0">
        <legend className="text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">Groups</legend>
        <p className="mt-2 text-[15px] text-chalk-dim">What each person will secretly become.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SourceCard
            checked={source === "animals"}
            onChange={() => setSource("animals")}
            title="Animals"
            detail={`${THEMES.animals.groups.length} ready-made, each with a sound`}
            sample={THEMES.animals.groups.slice(0, 6).map((g) => g.emoji).join(" ")}
          />
          <SourceCard
            checked={source === "custom"}
            onChange={() => setSource("custom")}
            title="My own"
            detail="Type your own group names"
            sample="Aa"
          />
        </div>

        {source === "custom" ? (
          <div className="mt-4">
            <label htmlFor={customId} className="block text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
              Group names
            </label>
            <textarea
              id={customId}
              name="group-names"
              rows={6}
              value={customNames}
              onChange={(e) => setCustomNames(e.target.value)}
              placeholder={"Lions\nTigers\nBears\n…"}
              className="mt-3 w-full rounded-md border-2 border-rule bg-ground-raised p-3 text-base text-chalk transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(255,209,0,0.25)]"
            />
            <p className="mt-3 text-[15px] text-chalk-dim">
              One per line.{" "}
              <span className="whitespace-nowrap">
                {GROUP_OPTIONS.min}–{GROUP_OPTIONS.max} groups
              </span>
              .{" "}
              {customGroups.length > 0 ? `You have ${customGroups.length}.` : null}
            </p>
          </div>
        ) : null}
      </fieldset>

      <hr className="my-10 border-rule" />

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={revealId} className="block text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
            Show the group for
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id={revealId}
              name="reveal-seconds"
              type="number"
              inputMode="numeric"
              min={REVEAL_SECONDS.min}
              max={REVEAL_SECONDS.max}
              value={revealSeconds}
              onChange={(e) => setRevealSeconds(Number(e.target.value))}
              className="h-14 w-24 rounded-md border-2 border-rule bg-ground-raised px-3 text-base tabular-nums text-chalk transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(255,209,0,0.25)]"
            />
            <span className="text-base text-chalk-dim">seconds</span>
          </div>
          <p className="mt-3 text-[15px] text-chalk-dim">
            Then it hides and they make the sound.{" "}
            <span className="whitespace-nowrap">
              {REVEAL_SECONDS.min}–{REVEAL_SECONDS.max}
            </span>
            .
          </p>
        </div>

        <div>
          <label htmlFor={daysId} className="block text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
            Keep this game for
          </label>
          <select
            id={daysId}
            name="expires-in-days"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
            className="mt-3 h-14 w-full rounded-md border-2 border-rule bg-ground-raised px-3 text-base text-chalk transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(255,209,0,0.25)]"
          >
            {Array.from({ length: EXPIRES_IN_DAYS.max }, (_, i) => i + 1).map((d) => (
              // Windows dark mode ignores a select's colours on its options.
              <option key={d} value={d} className="bg-ground-raised text-chalk">
                {d === 1 ? "1 day" : `${d} days`}
              </option>
            ))}
          </select>
          <p className="mt-3 text-[15px] text-chalk-dim">
            Make the QR code early; it works until then, then deletes itself.
          </p>
        </div>
      </div>

      {error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mt-6 text-[15px] text-danger"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="rounded-pill mt-10 h-14 w-full bg-accent text-lg font-extrabold tracking-[-0.01em] text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-pressed active:scale-[0.98] disabled:cursor-wait disabled:active:scale-100"
      >
        {busy ? "Creating…" : submitLabel}
      </button>
    </form>
  );
}

/** A real radio under a styled card, so keyboard and screen readers get the
 *  grouping for free rather than an aria re-implementation. */
function SourceCard({
  checked,
  onChange,
  title,
  detail,
  sample,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  detail: string;
  sample: string;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-md border-2 p-4 transition-[border-color,background-color] duration-150 ${
        checked
          ? "border-accent bg-ground-raised"
          : "border-rule bg-ground hover:border-chalk-dim"
      }`}
    >
      <input
        type="radio"
        name="group-source"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      <span className="block text-2xl" aria-hidden="true">
        {sample}
      </span>
      <span className="mt-3 block text-base font-semibold text-chalk">{title}</span>
      <span className="mt-1 block text-[15px] text-chalk-dim">{detail}</span>
    </label>
  );
}
