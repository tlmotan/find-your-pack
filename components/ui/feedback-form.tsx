"use client";

// The post-game feedback controls: a rating, a few fixed reasons, an optional
// comment, send or not.
//
// The comment box is the one part that needs watching. An open field is where
// someone types their own or a friend's name, and AGENTS.md hard rule 1
// forbids this app to hold that, so it is fenced rather than left wide open:
// asked for last so the tappable answers are already given, capped at
// COMMENT_MAX_LENGTH, and labelled with a plain request for no names. None of
// that is enforcement — whoever decides where these answers go has to strip or
// review what comes back, and that decision is still owed a PRD line.
//
// This component only reports what was entered. It makes no network call and
// writes nothing to storage.

import { useId, useState } from "react";

/** Emoji alone is not a label, so every rating carries a word for screen readers. */
const RATINGS = [
  { value: 1, emoji: "😖", label: "Bad" },
  { value: 2, emoji: "🙁", label: "Poor" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "🤩", label: "Great" },
] as const;

const REASONS = ["Easy to join", "Found my pack", "Loved the flag", "Too fast", "Confusing"];

/** Someone who taps Send without touching anything still sends a real answer. */
const DEFAULT_RATING = 4;
const DEFAULT_REASONS = ["Easy to join"];

/** Long enough for a real thought, short enough that nobody writes a diary. */
const COMMENT_MAX_LENGTH = 300;
/** The counter stays out of the way until the limit is actually in reach. */
const COMMENT_COUNTER_FROM = COMMENT_MAX_LENGTH - 50;

/** The small uppercase section labels. Shared so the two can't drift apart. */
const LABEL = "text-[13px] font-bold tracking-[0.14em] text-chalk-dim uppercase";

export type FeedbackResponse = {
  rating: number;
  reasons: string[];
  /** Trimmed; empty when the player left the box alone, which most will. */
  comment: string;
};

export type FeedbackFormProps = {
  className?: string;
  onSubmit?: (data: FeedbackResponse) => void;
  onCancel?: () => void;
};

export function FeedbackForm({ className = "", onSubmit, onCancel }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(DEFAULT_RATING);
  const [reasons, setReasons] = useState<string[]>(DEFAULT_REASONS);
  const [comment, setComment] = useState("");
  const commentId = useId();
  const commentHintId = useId();

  function reset() {
    setRating(DEFAULT_RATING);
    setReasons(DEFAULT_REASONS);
    setComment("");
  }

  function toggleReason(reason: string) {
    setReasons((current) =>
      current.includes(reason) ? current.filter((r) => r !== reason) : [...current, reason],
    );
  }

  return (
    <div className={className}>
      <p className={LABEL}>Before you go</p>
      <h2 className="text-title mt-2 font-extrabold tracking-[-0.02em] text-chalk">
        How was that?
      </h2>

      {/* One rating holds at a time, so the group is named once and each button
          reports its own pressed state rather than being announced bare. */}
      <div className="mt-5 flex gap-2" role="group" aria-label="Rate the game">
        {RATINGS.map((r) => {
          const selected = rating === r.value;
          return (
            <button
              key={r.value}
              type="button"
              aria-label={r.label}
              aria-pressed={selected}
              onClick={() => setRating(r.value)}
              className={`flex aspect-square flex-1 items-center justify-center rounded-md border-2 text-3xl transition-[border-color,background-color] duration-150 ${
                selected ? "border-accent bg-accent/[0.08]" : "border-rule"
              }`}
            >
              <span aria-hidden="true">{r.emoji}</span>
            </button>
          );
        })}
      </div>

      <p className={`mt-6 ${LABEL}`}>What worked?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {REASONS.map((reason) => {
          const selected = reasons.includes(reason);
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleReason(reason)}
              className={`rounded-pill min-h-11 border-2 px-4 text-base transition-colors duration-150 ${
                selected
                  ? "border-accent bg-accent font-bold text-on-accent"
                  : "border-rule font-semibold text-chalk"
              }`}
            >
              {reason}
            </button>
          );
        })}
      </div>

      {/* Last, and optional. The taps above are already a complete answer, so
          nobody has to type in a loud hall to be heard. */}
      <label htmlFor={commentId} className={`mt-6 block ${LABEL}`}>
        Additional comments
      </label>
      <textarea
        id={commentId}
        name="comment"
        rows={3}
        value={comment}
        maxLength={COMMENT_MAX_LENGTH}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more about your experience…"
        aria-describedby={commentHintId}
        className="mt-3 w-full resize-none rounded-md border-2 border-rule bg-ground p-3 text-base text-chalk placeholder:text-chalk-dim transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_rgba(255,209,0,0.25)]"
      />
      <div className="mt-2 flex items-start justify-between gap-3">
        <p id={commentHintId} className="text-[15px] text-chalk-dim">
          Optional. Please don&rsquo;t include anyone&rsquo;s name.
        </p>
        {comment.length >= COMMENT_COUNTER_FROM ? (
          <p aria-hidden="true" className="shrink-0 text-[15px] tabular-nums text-chalk-dim">
            {COMMENT_MAX_LENGTH - comment.length}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          onSubmit?.({ rating, reasons, comment: comment.trim() });
          reset();
        }}
        className="rounded-pill mt-7 h-14 w-full bg-accent text-lg font-extrabold tracking-[-0.01em] text-on-accent transition-colors duration-150 hover:bg-accent-pressed"
      >
        Send feedback
      </button>

      {/* Declining stays the low-effort path: this is for a thumb already on its
          way to closing the tab. Padded to a real tap target (DESIGN.md §8). */}
      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={() => {
            reset();
            onCancel?.();
          }}
          className={`rounded-sm px-4 py-3 transition-colors hover:text-chalk ${LABEL}`}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
