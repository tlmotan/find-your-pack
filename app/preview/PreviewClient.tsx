"use client";

// TEMPORARY. Renders the real RevealScreen / HiddenScreen with fake props so
// the design can be checked in a phone viewport before the data layer exists.

import { useState } from "react";

import { HiddenScreen } from "@/components/play/HiddenScreen";
import { RevealScreen } from "@/components/play/RevealScreen";
import { packColorIndex } from "@/lib/pack-color";
import { THEMES } from "@/lib/themes";

const GROUPS = THEMES.animals.groups;

export function PreviewClient() {
  const [index, setIndex] = useState(0);
  const [showHidden, setShowHidden] = useState(false);
  const [packSize, setPackSize] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [barOpen, setBarOpen] = useState(true);

  // noUncheckedIndexedAccess: the preset is non-empty, but prove it.
  const group = GROUPS[index];
  if (!group) return null;

  return (
    <div className="relative">
      {showHidden ? (
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

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-hairline bg-canvas/95 text-ink backdrop-blur">
        <button
          type="button"
          onClick={() => setBarOpen((v) => !v)}
          className="w-full px-4 py-2 text-left text-xs font-semibold text-muted"
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
                    setShowHidden(false);
                  }}
                  className={`rounded-sm px-2 py-1 text-xs ${
                    i === index && !showHidden
                      ? "bg-accent text-on-accent"
                      : "bg-surface text-body"
                  }`}
                >
                  {g.emoji} {g.name}
                  <span className="ml-1 opacity-60">{packColorIndex(g.name)}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowHidden((v) => !v)}
                className="rounded-sm bg-ink px-3 py-1.5 text-xs font-semibold text-white"
              >
                {showHidden ? "Show reveal" : "Show hidden"}
              </button>

              <label className="flex items-center gap-2 text-xs text-muted">
                pack
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={packSize}
                  onChange={(e) => setPackSize(Number(e.target.value))}
                />
                <span className="w-6 tabular-nums text-ink">{packSize}</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-muted">
                timer
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={secondsLeft}
                  onChange={(e) => setSecondsLeft(Number(e.target.value))}
                />
                <span className="w-6 tabular-nums text-ink">{secondsLeft}</span>
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
