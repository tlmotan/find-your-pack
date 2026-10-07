"use client";

// TEMPORARY. Two modes:
//   - Inspect: hold any single screen still and tweak its props.
//   - Run: play countdown → reveal → hidden for real, driven by the actual
//     usePlayerScreen hook and a synthetic MyState, so what you watch is the
//     shipping timing logic rather than a parallel imitation.
//
// The controls live in a draggable bubble rather than a docked bar: a bar along
// the bottom covers the footer rule, which is exactly the part of these screens
// that needs looking at.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { BlockWipe } from "@/components/play/BlockWipe";
import { Countdown } from "@/components/play/Countdown";
import { FeedbackSheet } from "@/components/play/FeedbackSheet";
import { HiddenScreen } from "@/components/play/HiddenScreen";
import { RevealScreen } from "@/components/play/RevealScreen";
import { StatusScreen } from "@/components/play/StatusScreen";
import { WaitingScreen } from "@/components/play/WaitingScreen";
import { useBlockWipe } from "@/hooks/useBlockWipe";
import { useEndedWipe } from "@/hooks/useEndedWipe";
import { usePlayerScreen } from "@/hooks/usePlayerScreen";
import { COUNTDOWN_SECONDS } from "@/lib/constants";
import { packFlag } from "@/lib/pack-flag";
import { THEMES } from "@/lib/themes";
import type { MyState, PlayerScreen } from "@/lib/types";

type View = "waiting" | "countdown" | "reveal" | "hidden" | "ended" | "feedback";

/** The chip the host is inspecting, as the screen the player would be on. */
function asPlayerScreen(view: View): PlayerScreen {
  if (view === "reveal") return "revealed";
  // The sheet sits over the ended screen, so both are "ended" to the hook.
  if (view === "feedback") return "ended";
  return view;
}

const GROUPS = THEMES.animals.groups;
const BUBBLE = 52;
/** Below this a press counts as a tap, not a drag. */
const DRAG_SLOP = 5;

export function PreviewClient() {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("reveal");
  const [packSize, setPackSize] = useState(10);
  const [revealSeconds, setRevealSeconds] = useState(8);
  const [open, setOpen] = useState(false);

  // null = not running. When set, the real hook drives the screens.
  const [live, setLive] = useState<MyState | null>(null);
  const liveView = usePlayerScreen(live, 0);
  const { screen, secondsLeft } = liveView;
  const wipe = useBlockWipe(liveView);

  // The shipping hook, fed the chip selection: hidden → ended wipes here for
  // exactly the reason it wipes on a real phone, not a preview imitation.
  const ended = useEndedWipe(asPlayerScreen(view));
  // While it holds, it is holding the hidden screen under the columns.
  const shown: View = ended.screen === "hidden" && view !== "hidden" ? "hidden" : view;

  // Placed on mount, because the viewport size is not known on the server.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    setPos({ x: window.innerWidth - BUBBLE - 16, y: Math.round(window.innerHeight * 0.4) });
  }, []);

  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(x, 8), window.innerWidth - BUBBLE - 8),
    y: Math.min(Math.max(y, 8), window.innerHeight - BUBBLE - 8),
  });

  const group = GROUPS[index];
  if (!group) return null;

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const next = clamp(e.clientX - d.dx, e.clientY - d.dy);
    if (!d.moved && (Math.abs(e.clientX - d.dx - (pos?.x ?? 0)) > DRAG_SLOP ||
        Math.abs(e.clientY - d.dy - (pos?.y ?? 0)) > DRAG_SLOP)) {
      d.moved = true;
    }
    setPos(next);
  };

  const onPointerUp = () => {
    // A press that never moved is a tap: the bubble must work without dragging.
    if (drag.current && !drag.current.moved) setOpen((o) => !o);
    drag.current = null;
  };

  // Keyboard alternative to dragging, so the gesture is never the only way.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!pos) return;
    const step = e.shiftKey ? 40 : 12;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setPos(clamp(pos.x + move[0], pos.y + move[1]));
  };

  const run = () => {
    const now = Date.now();
    // Exactly the shape get_my_state returns, so the hook cannot tell the
    // difference between this and a real game.
    setLive({
      status: "reveal",
      group: { name: group.name, emoji: group.emoji ?? null, sound_hint: group.sound_hint ?? null },
      pack_size: packSize,
      my_reveal_at: new Date(now + COUNTDOWN_SECONDS * 1000).toISOString(),
      reveal_seconds: revealSeconds,
      server_now: new Date(now).toISOString(),
    });
  };

  const stage = () => {
    if (live) {
      if (screen === "countdown") return <Countdown secondsLeft={secondsLeft ?? 0} />;
      if (screen === "hidden") return <HiddenScreen packSize={packSize} />;
      if (live.status !== "reveal") return <WaitingScreen />;
      return (
        <RevealScreen
          name={live.group.name}
          emoji={live.group.emoji}
          soundHint={live.group.sound_hint}
          packSize={live.pack_size}
          secondsLeft={secondsLeft ?? 0}
        />
      );
    }
    if (shown === "waiting") return <WaitingScreen />;
    if (shown === "countdown") return <Countdown secondsLeft={revealSeconds} />;
    if (shown === "hidden") return <HiddenScreen packSize={packSize} />;
    // What a player's phone actually shows once the host ends the game.
    if (shown === "ended") return <StatusScreen title="This game has ended" />;
    // The proposed feedback sheet over that same ended screen. Preview only —
    // see the header of FeedbackSheet.tsx.
    if (shown === "feedback") {
      return (
        <>
          <StatusScreen title="This game has ended" />
          <FeedbackSheet onDismiss={() => setView("ended")} />
        </>
      );
    }
    return (
      <RevealScreen
        key={`${group.name}-${revealSeconds}`}
        name={group.name}
        emoji={group.emoji ?? null}
        soundHint={group.sound_hint ?? null}
        packSize={packSize}
        secondsLeft={revealSeconds}
      />
    );
  };

  const chip = "rounded-sm px-2.5 py-1 text-xs font-semibold disabled:opacity-40";
  // Open upward / leftward when the bubble sits low or right, so the panel
  // stays on screen wherever it has been dragged.
  const up = pos !== null && typeof window !== "undefined" && pos.y > window.innerHeight / 2;
  const left = pos !== null && typeof window !== "undefined" && pos.x > window.innerWidth / 2;

  return (
    <div className="relative">
      {stage()}
      <BlockWipe phase={wipe ?? ended.phase} />

      {pos ? (
        <div className="fixed z-50" style={{ left: pos.x, top: pos.y }}>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Hide preview controls" : "Show preview controls"}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onKeyDown={onKeyDown}
            className="grid h-[52px] w-[52px] touch-none place-items-center rounded-pill border-2 border-ground bg-accent text-lg font-extrabold text-on-accent shadow-[0_6px_20px_rgba(0,0,0,0.45)] select-none"
          >
            {open ? "×" : "⚑"}
          </button>

          {open ? (
            <div
              className="absolute w-[17rem] max-h-[62dvh] overflow-y-auto rounded-md border border-rule bg-ground/97 p-3 text-chalk shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur"
              style={{
                top: up ? undefined : BUBBLE + 10,
                bottom: up ? BUBBLE + 10 : undefined,
                left: left ? undefined : 0,
                right: left ? 0 : undefined,
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={live ? () => setLive(null) : run}
                  className={`rounded-pill h-9 px-4 text-xs font-extrabold ${
                    live ? "border-2 border-rule text-chalk" : "bg-accent text-on-accent"
                  }`}
                >
                  {live ? `Stop (${screen})` : "Run the sequence"}
                </button>
                {live ? (
                  <span className="text-xs tabular-nums text-chalk-dim">
                    {secondsLeft === null ? "—" : `${secondsLeft.toFixed(1)}s`}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {GROUPS.map((g, i) => (
                  <button
                    key={g.name}
                    type="button"
                    disabled={live !== null}
                    onClick={() => {
                      setIndex(i);
                      setView("reveal");
                    }}
                    className={`rounded-sm px-1.5 py-1 text-xs disabled:opacity-40 ${
                      i === index ? "bg-accent text-on-accent" : "bg-ground-raised text-chalk-dim"
                    }`}
                  >
                    {g.emoji} {packFlag(g.name).letter}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {(
                  ["waiting", "countdown", "reveal", "hidden", "ended", "feedback"] as const
                ).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={live !== null}
                    onClick={() => setView(v)}
                    className={`${chip} ${
                      view === v ? "bg-chalk text-ground" : "bg-ground-raised text-chalk-dim"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <label className="mt-3 flex items-center gap-2 text-xs text-chalk-dim">
                pack
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={packSize}
                  onChange={(e) => setPackSize(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-6 tabular-nums text-chalk">{packSize}</span>
              </label>

              <label className="mt-2 flex items-center gap-2 text-xs text-chalk-dim">
                reveal
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={revealSeconds}
                  onChange={(e) => setRevealSeconds(Number(e.target.value))}
                  disabled={live !== null}
                  className="flex-1"
                />
                <span className="w-6 tabular-nums text-chalk">{revealSeconds}s</span>
              </label>

              <p className="mt-3 text-[11px] text-chalk-dim">
                Drag the ⚑ to move. Focus it and use arrow keys.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
