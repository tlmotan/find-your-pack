import Link from "next/link";

import { JoinForm } from "@/components/join/JoinForm";
import { SignalFlag } from "@/components/play/SignalFlag";
import { PACK_FLAGS } from "@/lib/pack-flag";

// Landing. Two audiences: a player who couldn't scan the QR and is standing in
// a loud room (PRD P1), and the host setting the game up (H1). The join path
// leads because it is the one under time pressure.

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col bg-ground">
      {/* A hoist of flags, flush to the top edge and touching: the product's own
          vocabulary saying what you are about to be given, rather than a
          decorative strip floating inside the gutter. */}
      <div className="flex w-full shrink-0" aria-hidden="true">
        {PACK_FLAGS.slice(0, 7).map((flag) => (
          <SignalFlag key={flag.id} id={flag.id} className="h-16 flex-1" />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center px-7 py-12">
        <div className="mx-auto w-full max-w-[26rem]">
          <h1 className="text-display text-balance font-extrabold tracking-[-0.03em] text-chalk">
            Find Your Pack
          </h1>

          <p className="mt-6 text-pretty text-lg leading-relaxed text-chalk-dim">
            Everyone gets a secret group at the same moment. Then it disappears, and you
            find your pack by making the sound.
          </p>

          <div className="mt-10">
            <JoinForm />
          </div>

          <div className="mt-12 border-t border-rule pt-6">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
              Running the game?
            </p>
            {/* Its own action rather than a word buried in a sentence: the host
                is a different person with a different job. */}
            <Link
              href="/host/new"
              className="mt-2 inline-flex items-center gap-2 rounded-sm text-lg font-extrabold text-signal-yellow hover:underline"
            >
              Host a game
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
