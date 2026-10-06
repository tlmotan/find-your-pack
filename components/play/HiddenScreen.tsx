// After the reveal: group hidden, pack size still visible (PRD P4).

type Props = { packSize: number };

export function HiddenScreen({ packSize }: Props) {
  // TODO: design
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-4xl font-black">Make your sound! 🔊</h1>
        <p className="mt-4 text-xl">{packSize} in your pack</p>
      </div>
    </main>
  );
}
