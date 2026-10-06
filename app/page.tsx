import Link from "next/link";

import { JoinForm } from "@/components/join/JoinForm";
import { SignalFlag } from "@/components/play/SignalFlag";
import { PACK_FLAGS } from "@/lib/pack-flag";

// Landing. Two audiences: a player who couldn't scan the QR and is standing in
// a loud room (PRD P1), and the host setting the game up (H1). The join path
// leads because it is the one under time pressure.

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-ground px-5 py-12">
      <div className="mx-auto w-full max-w-[26rem]">
        {/* A hoist of flags: the product's own vocabulary, saying what you are
            about to be given rather than describing it. */}
        <div className="flex gap-1.5" aria-hidden="true">
          {PACK_FLAGS.slice(0, 6).map((flag) => (
            <SignalFlag key={flag.id} id={flag.id} className="h-7 flex-1" />
          ))}
        </div>

        <h1 className="text-title mt-6 text-balance font-extrabold tracking-[-0.02em] text-chalk">
          Find Your Pack
        </h1>
        <p className="mt-3 text-pretty text-lg text-chalk-dim">
          Everyone gets a secret group at the same moment. Then it disappears, and you
          find your pack by making the sound.
        </p>

        <div className="mt-10">
          <JoinForm />
        </div>

        <p className="mt-10 border-t border-rule pt-6 text-[15px] text-chalk-dim">
          Running the game?{" "}
          <Link
            href="/host/new"
            className="rounded-sm font-semibold text-signal-yellow hover:underline"
          >
            Host a game
          </Link>
        </p>
      </div>
    </main>
  );
}
