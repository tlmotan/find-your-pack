"use client";

// "Save your host link" step shown right after create_session (PRD H1).
// The link is the only way back in; it can't be recovered if lost.

type Props = { hostLink: string; onContinue: () => void };

export function HostLinkCard({ hostLink, onContinue }: Props) {
  // TODO: copy button (navigator.clipboard), confirmation state
  return (
    <section className="p-6">
      <h1 className="text-2xl font-bold">Save your host link</h1>
      <p className="mt-2">It&apos;s the only way back to this game if you close the page.</p>
      <code className="mt-4 block break-all rounded border p-3 text-sm">{hostLink}</code>
      <button type="button" className="mt-4 rounded border px-4 py-2" onClick={onContinue}>
        I&apos;ve saved it
      </button>
    </section>
  );
}
