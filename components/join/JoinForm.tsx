"use client";

// The manual join path (PRD P1). Validates locally and routes to /join/[code],
// which does the real work — nothing here touches Supabase.

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";

import { JOIN_CODE_LENGTH, joinCodeError, normalizeJoinCode } from "@/lib/join-code";

export function JoinForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = joinCodeError(code);
    if (message) {
      setError(message);
      // Put the cursor back where the fix happens, rather than leaving it on
      // the button they just pressed.
      inputRef.current?.focus();
      return;
    }
    setSubmitting(true);
    router.push(`/join/${normalizeJoinCode(code)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="block text-[15px] font-semibold text-ink">
        Join code
      </label>

      <input
        id={inputId}
        ref={inputRef}
        name="join-code"
        value={code}
        onChange={(e) => {
          setCode(normalizeJoinCode(e.target.value));
          // Clear a stale complaint the moment they start fixing it.
          if (error) setError(null);
        }}
        // A venue keyboard should offer capitals and no autocorrect: this is a
        // code, not a word.
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        maxLength={JOIN_CODE_LENGTH}
        aria-describedby={error ? `${hintId} ${inputId}-error` : hintId}
        aria-invalid={error ? true : undefined}
        className={`text-code mt-2 h-16 w-full rounded-md border-[1.5px] bg-canvas text-center font-mono font-extrabold tracking-[0.12em] text-ink transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-soft)] ${
          error ? "border-danger" : "border-hairline"
        }`}
      />

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-[15px] text-danger">
          {error}
        </p>
      ) : (
        <p id={hintId} className="mt-2 text-[15px] text-muted">
          6 characters, from the host’s screen.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        // Stays accent-filled while in flight: a button that greys out
        // mid-action reads as broken, and "Joining…" already says it is busy.
        // Grey-on-hairline would also only reach 3.7:1.
        className="rounded-pill mt-5 h-14 w-full bg-accent text-lg font-semibold text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-pressed active:scale-[0.98] disabled:cursor-wait disabled:active:scale-100"
      >
        {submitting ? "Joining…" : "Join the game"}
      </button>
    </form>
  );
}
