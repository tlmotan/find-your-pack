// After the reveal: group hidden, pack size still visible (PRD P4).
//
// The flag is struck. An empty halyard where the field was is the whole point —
// the screen has deliberately stopped being useful, and the room has to work.

type Props = { packSize: number; reconnecting?: boolean };

export function HiddenScreen({ packSize, reconnecting = false }: Props) {
  return (
    <main className="flex min-h-dvh flex-col bg-ground px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* The halyard the flag came down from, left bare. */}
        <div className="halyard h-24 w-px" aria-hidden="true" />

        <h1 className="text-flag-name mt-8 text-balance font-extrabold tracking-[-0.03em] text-signal-yellow">
          Make your sound!
        </h1>
        <p className="mt-4 text-xl text-chalk">Find everyone making it too.</p>
      </div>

      <div className="flex items-end justify-between border-t border-rule pt-4 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
        <span className="tabular-nums">{packSize} in your pack</span>
        <span className={reconnecting ? "text-signal-yellow" : undefined}>
          {reconnecting ? "Reconnecting…" : "Flag struck"}
        </span>
      </div>
    </main>
  );
}
