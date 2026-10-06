"use client";

// TEMPORARY. Renders the real RevealScreen / HiddenScreen with fake props so
// the design can be checked in a phone viewport before the data layer exists.

import { useState } from "react";

import { Countdown } from "@/components/play/Countdown";
import { HiddenScreen } from "@/components/play/HiddenScreen";
import { RevealScreen } from "@/components/play/RevealScreen";
import { packFlag } from "@/lib/pack-flag";
import { THEMES } from "@/lib/themes";

const GROUPS = THEMES.animals.groups;

export function PreviewClient() {
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<"countdown" | "reveal" | "hidden">("reveal");
  const [packSize, setPackSize] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [barOpen, setBarOpen] = useState(true);

  // noUncheckedIndexedAccess: the preset is non-empty, but prove it.
  const group = GROUPS[index];
  if (!group) return null;

  return (
    <div className="relative">
      {view === "countdown" ? (
        <Countdown secondsLeft={secondsLeft} />
      ) : view === "hidden" ? (
        <HiddenScreen packSize={packSize} />
      ) : (
        <RevealScreen
          // Remount on change so the entrance animation replays.
          key={`${group.name}-${secondsLeft}`}
          name={group.name}
          emoji={group.emoji ?? null}
          soundHint={group.sound_hint ?? null}
          packSize={packSize}
          secondsLeft={secondsLeft}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-rule bg-ground/95 text-chalk backdrop-blur">
        <button
          type="button"
          onClick={() => setBarOpen((v) => !v)}
          className="w-full px-4 py-2 text-left text-xs font-semibold text-chalk-dim"
        >
          {barOpen ? "▾ hide preview controls" : "▸ preview controls"}
        </button>

        {barOpen ? (
          <div className="flex flex-col gap-3 px-4 pb-4 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {GROUPS.map((g, i) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setView("reveal");
                  }}
                  className={`rounded-sm px-2 py-1 text-xs ${
                    i === index && view === "reveal"
                      ? "bg-accent text-on-accent"
                      : "bg-ground-raised text-chalk-dim"
                  }`}
                >
                  {g.emoji} {g.name}
                  <span className="ml-1 opacity-60">{packFlag(g.name).letter}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-1.5">
                {(["countdown", "reveal", "hidden"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`rounded-sm px-3 py-1.5 text-xs font-semibold ${
                      view === v ? "bg-chalk text-ground" : "bg-ground-raised text-chalk-dim"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-chalk-dim">
                pack
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={packSize}
                  onChange={(e) => setPackSize(Number(e.target.value))}
                />
                <span className="w-6 tabular-nums text-chalk">{packSize}</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-chalk-dim">
                timer
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={secondsLeft}
                  onChange={(e) => setSecondsLeft(Number(e.target.value))}
                />
                <span className="w-6 tabular-nums text-chalk">{secondsLeft}</span>
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
