// 3-2-1 countdown to my_reveal_at on the server clock (PRD P3).
//
// One enormous digit in accent on white, nothing else (DESIGN.md section 9).
// The keyed <p> remounts each second so the tick animation replays.

type Props = { secondsLeft: number };

export function Countdown({ secondsLeft }: Props) {
  const n = Math.max(1, Math.ceil(secondsLeft));

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas">
      <p
        key={n}
        aria-hidden="true"
        className="countdown-tick text-countdown font-extrabold tabular-nums text-accent"
      >
        {n}
      </p>
      {/* Static, not a live region: announcing "3… 2… 1…" would talk over the
          reveal itself, which is the part worth hearing. */}
      <span className="sr-only">Your group is about to appear.</span>
    </main>
  );
}
