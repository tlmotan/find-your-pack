import Link from "next/link";

import { JoinForm } from "@/components/join/JoinForm";

// Landing. Two audiences: a player who couldn't scan the QR and is standing in
// a loud room (PRD P1), and the host setting the game up (H1). The join path
// leads because it is the one under time pressure.

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-[440px]">
        <h1 className="text-title text-balance font-extrabold tracking-tight text-ink">Find Your Pack</h1>
        <p className="mt-3 text-pretty text-lg text-body">
          Get a secret group. Make the sound. Find your pack.
        </p>

        <div className="mt-10">
          <JoinForm />
        </div>

        <p className="mt-10 border-t border-hairline pt-6 text-[15px] text-muted">
          Running the game?{" "}
          <Link href="/host/new" className="rounded-sm font-semibold text-accent hover:underline">
            Host a game
          </Link>
        </p>
      </div>
    </main>
  );
}
