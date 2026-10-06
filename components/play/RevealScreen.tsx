// Shows the player's group for reveal_seconds (PRD P3).
//
// The one loud screen. The flag is run up the halyard and snaps taut — the
// single authored motion in the app (see the direction contract in layout.tsx).

import { SignalFlag } from "@/components/play/SignalFlag";
import { packFlag } from "@/lib/pack-flag";

/**
 * How long before the group vanishes the big warning takes over. Losing your
 * flag is the whole mechanic, so the last seconds have to be felt, not read off
 * a label in the corner. A 2-second window is urgent for its entire length,
 * which is correct.
 */
const HIDE_WARNING_SECONDS = 5;

type Props = {
  name: string;
  emoji: string | null;
  soundHint: string | null;
  packSize: number;
  secondsLeft: number;
};

export function RevealScreen({ name, emoji, soundHint, packSize, secondsLeft }: Props) {
  const flag = packFlag(name);
  const remaining = Math.max(0, Math.ceil(secondsLeft));
  const ending = remaining <= HIDE_WARNING_SECONDS;

  return (
    <main className="relative flex min-h-dvh flex-col bg-ground px-5 pt-[9dvh] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Absolutely positioned so arriving costs no layout shift: the flag must
          not jump a pixel while someone is memorising it. */}
      {ending ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-[1.5dvh]">
          <p
            key={remaining}
            aria-hidden="true"
            className="drop-in text-hide-warning font-extrabold tabular-nums tracking-[-0.04em] text-signal-yellow"
          >
            {remaining}
          </p>
        </div>
      ) : null}

      {/* Flown high, not centred: a flag sits near the top of its mast, and the
          space beneath it is what makes it read as flying. The outer box clips
          so the inner one can rise through it. */}
      <div className="-mx-5 w-screen max-w-[100vw] overflow-hidden">
        <div className="hoist">
          <SignalFlag
            id={flag.id}
            className="snap-taut block w-full origin-bottom"
            // Flatter than a flag's true 3:2 so it reads as a band across the
            // screen; the box is stated so nothing jumps before paint.
            style={{ aspectRatio: "26 / 10" }}
          />
        </div>
      </div>

      <div aria-live="polite" className="mt-[7dvh] text-center">
        {emoji ? (
          <p className="text-emoji leading-none" aria-hidden="true">
            {emoji}
          </p>
        ) : null}

        <h1 className="text-flag-name mt-5 text-balance font-extrabold tracking-[-0.03em] text-chalk">
          {name}
        </h1>

        {soundHint ? (
          <p className="mt-3 text-3xl font-extrabold text-signal-yellow">{soundHint}</p>
        ) : null}
      </div>

      {/* The emptiness is the composition, not a gap to fill. */}
      <div className="flex-1" />

      {/* Code-book margin. Once the big warning is up it owns the count, so the
          footer says what is about to happen instead of repeating the number. */}
      <div className="flex items-end justify-between border-t border-rule pt-4 text-[13px] font-semibold tracking-[0.14em] uppercase">
        <span className="tabular-nums text-chalk-dim">{packSize} in your pack</span>
        <span className={ending ? "text-signal-yellow" : "tabular-nums text-chalk-dim"}>
          {ending ? "Flag coming down" : `Hiding in ${remaining}s`}
        </span>
      </div>
    </main>
  );
}
