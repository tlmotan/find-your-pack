// 3-2-1 countdown to my_reveal_at on the server clock (PRD P3).

type Props = { secondsLeft: number };

export function Countdown({ secondsLeft }: Props) {
  // TODO: design the one big motion moment of the app
  return (
    <main className="min-h-dvh grid place-items-center">
      <p className="text-8xl font-black tabular-nums">{Math.max(1, Math.ceil(secondsLeft))}</p>
    </main>
  );
}
