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

  // Announcing is best-effort. The action already succeeded on the server, and
  // every phone polls as a fallback, so a dropped websocket must never tell the
  // host their tap failed.
  async function announce(event: "opened" | "started" | "ended", joinCode: string) {
    try {
      await broadcastEvent(joinCode, event);
    } catch {
      // Swallowed on purpose: the poll fallback covers it.
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "That didn’t work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!hostSecret) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ground px-6 py-12 text-center">
        <div className="max-w-[440px]">
          <h1 className="text-title text-balance font-extrabold tracking-[-0.02em] text-chalk">
            This host link is missing its key
          </h1>
          <p className="mt-3 text-lg text-chalk-dim">
            Open the full link you saved — the part after the <code className="font-mono text-signal-yellow">#</code>{" "}
            is what proves you&rsquo;re the host.
          </p>
        </div>
      </main>
    );
  }

  if (ended) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ground px-6 py-12 text-center">
        <div className="max-w-[440px]">
          <h1 className="text-title text-balance font-extrabold tracking-[-0.02em] text-chalk">Game ended</h1>
          <p className="mt-3 text-lg text-chalk-dim">Everything has been deleted. Nothing was kept.</p>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-dvh place-items-center bg-ground px-6 py-12 text-center">
        <p className="text-lg text-chalk-dim">{error ? "Couldn’t load this game." : "Loading…"}</p>
      </main>
    );
  }

  const started = state.status === "started";

  return (
    <main className="min-h-dvh bg-ground px-5 py-12">
      <div className="mx-auto w-full max-w-[640px] lg:max-w-[1100px]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-title text-balance font-extrabold tracking-[-0.02em] text-chalk">Find Your Pack</h1>
          <StatusPill status={state.status} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-start">
          {/* The QR goes away once the game has started: late joiners are still
              welcome, but the room's attention should be on the packs. */}
          {!started ? (
            <JoinQrCode joinUrl={buildJoinLink(origin, state.join_code)} joinCode={state.join_code} />
          ) : (
            <section>
              <h2 className="text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">Packs</h2>
              <div className="mt-3">
                <GroupSizes groups={state.group_sizes} />
              </div>
            </section>
          )}

          <section>
            {/* Projector-sized: this number is read from the back of the room. */}
            <p className="text-projected font-extrabold tabular-nums tracking-[-0.05em] text-signal-yellow">
              {state.active_count}
            </p>
            <p className="mt-1 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim uppercase">
              {state.active_count === 1 ? "phone joined" : "phones joined"}
            </p>

            <div className="mt-8 max-w-[440px]">
              <HostControls
                state={state}
                busy={busy}
                onOpenLobby={() =>
                  void run(async () => {
                    await openLobby(sessionId, hostSecret);
                    // Only after the server has committed: a phone told too
                    // early would try to join a session still 'scheduled'.
                    // This is what lets everyone waiting at the door in.
                    await announce("opened", state.join_code);
                  })
                }
                onStart={() =>
                  void run(async () => {
                    await startSession(sessionId, hostSecret);
                    // Broadcast only after the server has committed, so no phone
                    // can ask for its group before one exists.
                    await announce("started", state.join_code);
                  })
                }
                onEnd={() =>
                  void run(async () => {
                    // Broadcast BEFORE deleting: once the row is gone there is
                    // nothing left to announce from.
                    await announce("ended", state.join_code);
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
              <p role="alert" className="mt-5 text-[15px] text-danger">
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
      ? "bg-accent text-on-accent"
      : status === "started"
        ? "border border-rule text-success"
        : "border border-rule text-chalk-dim";

  return (
    <span className={`rounded-pill px-3.5 py-1.5 text-[13px] font-semibold tracking-[0.14em] uppercase ${tone}`}>
      {label}
    </span>
  );
}
