"use client";

// Create a session: groups, reveal timer, expiry → create_session → "Save your host link".

import { useRouter } from "next/navigation";
import { useState } from "react";

import { HostLinkCard } from "@/components/host/HostLinkCard";
import { SettingsForm } from "@/components/host/SettingsForm";
import { buildHostLink } from "@/lib/host-secret";
import { createSession } from "@/lib/rpc";
import type { CreateSessionInput } from "@/lib/validation";

export default function NewHostPage() {
  const router = useRouter();
  const [hostLink, setHostLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: CreateSessionInput) {
    setBusy(true);
    setError(null);
    try {
      const result = await createSession(input);
      // The secret goes in the URL fragment, which browsers never send to a
      // server or write to logs (lib/host-secret.ts).
      setHostLink(buildHostLink(window.location.origin, result.session_id, result.host_secret));
    } catch {
      setError("Couldn't create the game. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (hostLink) {
    return (
      <main className="min-h-dvh px-6 py-12">
        <HostLinkCard
          hostLink={hostLink}
          // push, not replace: Back should return to this card, because losing
          // the link is the one unrecoverable mistake on this screen.
          onContinue={() => router.push(hostLink.replace(window.location.origin, ""))}
        />
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-6 py-12">
      <div className="mx-auto w-full max-w-[640px]">
        <h1 className="text-title text-balance font-extrabold tracking-tight text-ink">
          New game
        </h1>
        <p className="mt-3 text-pretty text-lg text-body">
          Set it up now; open the lobby when everyone&apos;s in the room.
        </p>
      </div>

      <div className="mt-10">
        <SettingsForm onSubmit={handleSubmit} submitLabel="Create game" busy={busy} />
      </div>

      {error ? (
        <p role="alert" className="mx-auto mt-6 w-full max-w-[640px] text-[15px] text-danger">
          {error}
        </p>
      ) : null}
    </main>
  );
}
