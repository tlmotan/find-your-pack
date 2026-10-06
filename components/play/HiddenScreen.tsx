// After the reveal: group hidden, pack size still visible (PRD P4).
//
// Deliberately back to the plain white canvas. The pack colour is gone and the
// group name is never rendered here — that absence is the whole game.

type Props = { packSize: number };

export function HiddenScreen({ packSize }: Props) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10 text-center">
      <div className="w-full max-w-[440px]">
        <h1 className="text-title text-balance font-extrabold tracking-tight text-ink">
          Make your sound! <span aria-hidden="true">🔊</span>
        </h1>
        <p className="text-body mt-4 text-xl tabular-nums">{packSize} in your pack</p>
      </div>
    </main>
  );
}
