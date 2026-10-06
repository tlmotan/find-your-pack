// Shows the player's group for reveal_seconds (PRD P3).

type Props = { name: string; emoji: string | null; soundHint: string | null; packSize: number; secondsLeft: number };

export function RevealScreen({ name, emoji, soundHint, packSize, secondsLeft }: Props) {
  // TODO: design + reveal animation (respect prefers-reduced-motion)
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        {emoji ? <p className="text-8xl">{emoji}</p> : null}
        <h1 className="mt-4 text-4xl font-black">{name}</h1>
        {soundHint ? <p className="mt-2 text-xl">{soundHint}</p> : null}
        <p className="mt-6">{packSize} in your pack</p>
        <p className="mt-2 text-sm opacity-70">Hiding in {Math.ceil(secondsLeft)}s</p>
      </div>
    </main>
  );
}
