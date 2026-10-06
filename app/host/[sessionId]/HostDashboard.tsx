"use client";

// QR + settings → Open lobby → live count → Start → group sizes → End (PRD §6.1).

import { useEffect, useState } from "react";

import { GroupSizes } from "@/components/host/GroupSizes";
import { HostControls } from "@/components/host/HostControls";
import { JoinQrCode } from "@/components/host/JoinQrCode";
import { buildJoinLink, readHostSecretFromHash } from "@/lib/host-secret";
import { broadcastEvent } from "@/lib/realtime";
import { endSession, openLobby, startSession } from "@/lib/rpc";
import { useHostState } from "@/hooks/useHostState";

export function HostDashboard({ sessionId }: { sessionId: string }) {
  const [hostSecret, setHostSecret] = useState<string | null>(null);
  useEffect(() => setHostSecret(readHostSecretFromHash()), []);

  const { state, error, refresh } = useHostState(sessionId, hostSecret);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!hostSecret) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 py-12 text-center">
        <div className="max-w-[440px]">
          <h1 className="text-title font-extrabold tracking-tight text-ink">
            This host link is missing its key
          </h1>
          <p className="mt-3 text-lg text-body">
            Open the full link you saved — the part after the <code className="font-mono">#</code>{" "}
            is what proves you&apos;re the host.
          </p>
        </div>
      </main>
    );
  }

  if (ended) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 py-12 text-center">
        <div className="max-w-[440px]">
          <h1 className="text-title font-extrabold tracking-tight text-ink">Game ended</h1>
          <p className="mt-3 text-lg text-body">Everything has been deleted. Nothing was kept.</p>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 py-12 text-center">
        <p className="text-lg text-muted">{error ? "Couldn't load this game." : "Loading…"}</p>
      </main>
    );
  }

  const started = state.status === "started";

  return (
    <main className="min-h-dvh px-6 py-12">
      <div className="mx-auto w-full max-w-[640px] lg:max-w-[1100px]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title font-extrabold tracking-tight text-ink">Find Your Pack</h1>
          <StatusPill status={state.status} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* The QR goes away once the game has started: late joiners are still
              welcome, but the room's attention should be on the packs. */}
          {!started ? (
            <JoinQrCode joinUrl={buildJoinLink(origin, state.join_code)} joinCode={state.join_code} />
          ) : (
            <section>
              <h2 className="text-[15px] font-semibold text-ink">Packs</h2>
              <div className="mt-3">
                <GroupSizes groups={state.group_sizes} />
              </div>
            </section>
          )}

          <section>
            {/* Projector-sized: this number is read from the back of the room. */}
            <p className="text-projected font-extrabold tabular-nums tracking-tight text-accent">
              {state.active_count}
            </p>
            <p className="-mt-2 text-xl text-muted">
              {state.active_count === 1 ? "phone joined" : "phones joined"}
            </p>

            <div className="mt-8 max-w-[440px]">
              <HostControls
                state={state}
                busy={busy}
                onOpenLobby={() => void run(async () => void (await openLobby(sessionId, hostSecret)))}
                onStart={() =>
                  void run(async () => {
                    await startSession(sessionId, hostSecret);
                    // Broadcast only after the server has committed, so no phone
                    // can ask for its group before one exists.
                    await broadcastEvent(state.join_code, "started");
                  })
                }
                onEnd={() =>
                  void run(async () => {
                    // Broadcast BEFORE deleting: once the row is gone there is
                    // nothing left to announce from.
                    await broadcastEvent(state.join_code, "ended");
                    await endSession(sessionId, hostSecret);
                    setEnded(true);
                    // Stops useHostState polling a session that no longer
                    // exists; the ended screen is checked before this matters.
                    setHostSecret(null);
                  })
                }
              />
            </div>

            {actionError ? (
              <p role="alert" className="mt-4 text-[15px] text-danger">
                {actionError}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = status === "scheduled" ? "Not open yet" : status === "lobby" ? "Lobby open" : "Playing";
  const tone =
    status === "lobby"
      ? "bg-accent-soft text-accent"
      : status === "started"
        ? "bg-surface text-success"
        : "bg-surface text-muted";

  return <span className={`rounded-pill px-3.5 py-1.5 text-[15px] font-semibold ${tone}`}>{label}</span>;
}
