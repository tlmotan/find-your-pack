// Full-screen message for joining / not_open / ended.

type Props = { title: string; body?: string };

export function StatusScreen({ title, body }: Props) {
  return (
    <main className="min-h-dvh grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {body ? <p className="mt-2 opacity-80">{body}</p> : null}
      </div>
    </main>
  );
}
