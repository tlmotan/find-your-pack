// Full-screen message for joining / not_open / ended.

type Props = { title: string; body?: string };

export function StatusScreen({ title, body }: Props) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ground px-6 py-12 text-center">
      <div className="max-w-[26rem]">
        <div className="halyard mx-auto h-16 w-px" aria-hidden="true" />
        <h1 className="text-title mt-8 text-balance font-extrabold tracking-[-0.02em] text-chalk">
          {title}
        </h1>
        {body ? <p className="mt-3 text-pretty text-lg text-chalk-dim">{body}</p> : null}
      </div>
    </main>
  );
}
