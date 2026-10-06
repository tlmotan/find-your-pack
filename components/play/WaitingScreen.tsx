// Shown until the host presses Start (PRD P2). Includes the "Keep this page open" tip.

export function WaitingScreen() {
  // TODO: design
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">You&apos;re in!</h1>
        <p className="mt-2">Waiting for the host to start…</p>
        <p className="mt-6 text-sm opacity-70">Keep this page open.</p>
      </div>
    </main>
  );
}
