// Shown until the host presses Start (PRD P2). Includes the "Keep this page open" tip.
//
// An empty halyard and no flag. The screen is honest about having nothing yet,
// which is what makes the hoist land when it comes.

export function WaitingScreen() {
  return (
    <main className="flex min-h-dvh flex-col bg-ground px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="halyard h-28 w-px" aria-hidden="true" />

        <h1 className="text-title mt-8 text-balance font-extrabold tracking-[-0.02em] text-chalk">
          You&rsquo;re in
        </h1>
        <p className="mt-3 text-lg text-chalk-dim">Waiting for the host to start…</p>
      </div>

      <div className="flex items-end justify-between border-t border-rule pt-4 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
        <span>No flag yet</span>
        <span>Keep this page open</span>
      </div>
    </main>
  );
}
