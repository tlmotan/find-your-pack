"use client";

// "Save your host link" step shown right after create_session (PRD H1).
// The link is the only way back in; it can't be recovered if lost.

import { useRef, useState } from "react";

type Props = { hostLink: string; onContinue: () => void };

type CopyState = "idle" | "copied" | "failed";

export function HostLinkCard({ hostLink, onContinue }: Props) {
  const [copied, setCopied] = useState<CopyState>("idle");
  const linkRef = useRef<HTMLElement>(null);

  async function copy() {
    try {
      // Needs a secure context; plain http on a LAN IP will throw here.
      await navigator.clipboard.writeText(hostLink);
      setCopied("copied");
    } catch {
      // Select the text so the host can copy it by hand rather than retype a
      // 64-character secret.
      setCopied("failed");
      const node = linkRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  return (
    <section className="mx-auto w-full max-w-[640px]">
      <h1 className="text-title text-balance font-extrabold tracking-[-0.02em] text-chalk">
        Save your host link
      </h1>
      <p className="mt-3 text-pretty text-lg text-chalk-dim">
        This is the only way back to your game. We can&rsquo;t recover it, and we have no
        account to send it to.
      </p>

      <code
        ref={linkRef}
        className="mt-6 block rounded-md border border-rule bg-ground-raised p-4 font-mono text-sm break-all text-chalk"
      >
        {hostLink}
      </code>

      <button
        type="button"
        onClick={copy}
        className="rounded-pill mt-4 h-14 w-full bg-accent text-lg font-extrabold tracking-[-0.01em] text-on-accent transition-[background-color,transform] duration-150 hover:bg-accent-pressed active:scale-[0.98]"
      >
        {copied === "copied" ? "Copied ✓" : "Copy link"}
      </button>

      {/* Polite, so it is announced without interrupting whatever is being read. */}
      <p role="status" className="mt-3 min-h-[1.5rem] text-[15px] text-chalk-dim">
        {copied === "copied" ? "Copied. Paste it somewhere you’ll find it again." : null}
        {copied === "failed" ? "Couldn’t copy automatically — the link is selected, copy it now." : null}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="rounded-pill mt-2 h-14 w-full border-2 border-rule text-lg font-semibold text-chalk transition-colors duration-150 hover:border-chalk-dim"
      >
        I&rsquo;ve saved it
      </button>
    </section>
  );
}
