"use client";

// PROPOSED — NOT IN v1, AND NOT WIRED TO ANYTHING.
//
// A design study for the post-game feedback sheet (see mockup-prompts.md §10).
// It is rendered only by /preview so the design can be judged for real. It is
// imported by no route, it makes no network call, and it stores nothing —
// every answer lives in local state and dies with the component.
//
// Before any of this ships it needs a PRD line, because it sits against two
// standing rules: AGENTS.md hard rule 1 (no tracking or analytics) and rule 10
// (v1 scope). That is a product decision, not a styling one.
//
// Deliberately no free-text field: an open box is where someone types their
// own or a friend's name, which is the exact thing hard rule 1 forbids us to
// hold. Fixed chips carry the same signal and are faster to tap in a loud hall.

import { useState } from "react";

/** Emoji alone is not a label — each rating carries a word for screen readers. */
const RATINGS = [
  { value: 1, emoji: "😖", label: "Bad" },
  { value: 2, emoji: "🙁", label: "Poor" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
] as const;

const TAGS = ["Easy to join", "Found my pack", "Loved the flag", "Too fast", "Confusing"];

type Props = { onDismiss?: () => void };

export function FeedbackSheet({ onDismiss }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  return (
    // Flush to three edges rather than floating: the system has no elevation,
    // so a card with a shadow would be the only thing in the app that lifts.
    <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-md border-t border-rule bg-ground-raised px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[26rem]">
        {sent ? (
          <div role="status" className="py-6 text-center">
            <p className="text-title font-extrabold tracking-[-0.02em] text-chalk">Thank you!</p>
            <p className="mt-2 text-[15px] text-chalk-dim">That helps us run a better one next time.</p>
          </div>
        ) : (
          <>
            <p className="text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
              Before you go
            </p>
            <h2 className="mt-2 text-title font-extrabold tracking-[-0.02em] text-chalk">
              How was that?
            </h2>

            {/* A radiogroup, not five toggles: exactly one rating can hold. */}
            <fieldset className="mt-5 border-0 p-0">
              <legend className="sr-only">Rate your experience</legend>
              <div className="flex gap-2">
                {RATINGS.map((r) => {
                  const selected = rating === r.value;
                  return (
                    <label
                      key={r.value}
                      className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border-2 py-3 text-3xl transition-[border-color,background-color] duration-150 ${
                        selected ? "border-accent bg-accent/10" : "border-rule"
                      }`}
                    >
                      <input
                        type="radio"
                        name="rating"
                        value={r.value}
                        checked={selected}
                        onChange={() => setRating(r.value)}
                        className="sr-only"
                      />
                      <span aria-hidden="true">{r.emoji}</span>
                      <span className="sr-only">{r.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <p className="mt-6 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
              What worked?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TAGS.map((tag) => {
                const selected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-pill min-h-11 border-2 px-4 text-base font-semibold transition-colors duration-150 ${
                      selected
                        ? "border-accent bg-accent text-on-accent"
                        : "border-rule text-chalk"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={rating === null}
              onClick={() => setSent(true)}
              className="rounded-pill mt-7 h-14 w-full bg-accent text-lg font-extrabold tracking-[-0.01em] text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-pressed active:scale-[0.98] disabled:bg-ground disabled:text-chalk-dim disabled:active:scale-100"
            >
              Send feedback
            </button>

            {/* Declining stays the low-effort path: this catches someone with a
                thumb already on the way to closing the tab. */}
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-sm px-4 py-3 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase transition-colors hover:text-chalk"
              >
                No thanks
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
