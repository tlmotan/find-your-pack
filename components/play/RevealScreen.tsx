// Shows the player's group for reveal_seconds (PRD P3).
//
// The one loud screen in the app: full-bleed pack colour, white text, giant
// emoji. Everything else stays white so this lands (DESIGN.md section 1).

import { packColorVar } from "@/lib/pack-color";

type Props = {
  name: string;
  emoji: string | null;
  soundHint: string | null;
  packSize: number;
  secondsLeft: number;
};

export function RevealScreen({ name, emoji, soundHint, packSize, secondsLeft }: Props) {
  return (
    <main
      // pb clears the iPhone home indicator: this is the app's only
      // full-bleed screen, so nothing else reaches the bottom edge.
      className="reveal-enter flex min-h-dvh flex-col px-6 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center text-white"
      style={{ background: packColorVar(name) }}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex w-full max-w-[440px] flex-col items-center">
          {emoji ? (
            <p className="reveal-emoji text-reveal-emoji leading-none" aria-hidden="true">
              {emoji}
            </p>
          ) : null}

          {/* One live region for the whole reveal, so a screen reader
              announces the group once rather than field by field. */}
          <div aria-live="polite">
            <h1 className="text-reveal-name mt-4 text-balance font-extrabold tracking-tight">{name}</h1>
            {soundHint ? <p className="mt-3 text-2xl font-semibold">{soundHint}</p> : null}
          </div>

          <p className="mt-8 rounded-pill bg-white/15 px-5 py-2 text-lg font-semibold">
            {packSize} in your pack
          </p>
        </div>
      </div>

      {/* tabular-nums: the digit changes every second and must not reflow. */}
      <p className="mt-6 text-sm tabular-nums text-white/70">
        Hiding in {Math.max(0, Math.ceil(secondsLeft))}s
      </p>
    </main>
  );
}
