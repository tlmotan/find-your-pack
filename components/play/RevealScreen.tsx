// Shows the player's group for reveal_seconds (PRD P3).
//
// The one loud screen. The flag is run up the halyard and snaps taut — the
// single authored motion in the app (see the direction contract in layout.tsx).

import { SignalFlag } from "@/components/play/SignalFlag";
import { packFlag } from "@/lib/pack-flag";

type Props = {
  name: string;
  emoji: string | null;
  soundHint: string | null;
  packSize: number;
  secondsLeft: number;
};

export function RevealScreen({ name, emoji, soundHint, packSize, secondsLeft }: Props) {
  const flag = packFlag(name);

  return (
    <main className="flex min-h-dvh flex-col bg-ground px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Full-bleed field at the flag's own 3:2. Nothing is laid over it:
            text on a checkerboard or a saltire is unreadable, and a flag with a
            caption printed across it is not a flag. */}
        {/* The outer box clips; the inner one rises through it, so the flag
            appears to run up a line rather than fade into place. */}
        <div className="-mx-5 w-screen max-w-[100vw] overflow-hidden">
          <div className="hoist">
            <SignalFlag
              id={flag.id}
              className="snap-taut block h-auto w-full origin-bottom"
              // 3:2, stated so the box is reserved before paint and nothing jumps.
              style={{ aspectRatio: "3 / 2" }}
            />
          </div>
        </div>

        <div aria-live="polite" className="mt-7 w-full text-center">
          <h1 className="text-flag-name text-balance font-extrabold tracking-[-0.03em] text-chalk">
            {emoji ? <span aria-hidden="true">{emoji} </span> : null}
            {name}
          </h1>
          {soundHint ? (
            <p className="mt-3 text-2xl font-semibold text-signal-yellow">{soundHint}</p>
          ) : null}
        </div>
      </div>

      {/* Code-book margin: the facts, set small and tracked, never competing
          with the field above. */}
      <div className="flex items-end justify-between border-t border-rule pt-4 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
        <span className="tabular-nums">{packSize} in your pack</span>
        <span className="tabular-nums">Hiding in {Math.max(0, Math.ceil(secondsLeft))}s</span>
      </div>
    </main>
  );
}
