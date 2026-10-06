"use client";

// QR + settings → Open lobby → live count → Start → group sizes → End (PRD §6.1).

import { useEffect, useState } from "react";
import { readHostSecretFromHash } from "@/lib/host-secret";
import { useHostState } from "@/hooks/useHostState";

export function HostDashboard({ sessionId }: { sessionId: string }) {
  const [hostSecret, setHostSecret] = useState<string | null>(null);
  useEffect(() => setHostSecret(readHostSecretFromHash()), []);
  const { state, error } = useHostState(sessionId, hostSecret);

  // TODO: JoinQrCode, SettingsForm (before Start), HostControls, GroupSizes,
  //       broadcastEvent("started") after startSession succeeds,
  //       broadcastEvent("ended") before endSession.
  if (!hostSecret) return <main className="p-6">This host link is missing its key.</main>;
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Host dashboard</h1>
      <pre className="mt-4 text-xs">{JSON.stringify({ state, error }, null, 2)}</pre>
    </main>
  );
}
