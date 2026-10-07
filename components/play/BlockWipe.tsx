// Five signal-colour columns that sweep down over the reveal and clear away
// onto "Make your sound!". Red never touches blue.

import type { CSSProperties } from "react";

import type { WipePhase } from "@/hooks/useBlockWipe";

const COLUMNS = [
  "bg-signal-red",
  "bg-signal-yellow",
  "bg-signal-blue",
  "bg-signal-white",
  "bg-signal-black",
];

export function BlockWipe({ phase }: { phase: WipePhase }) {
  if (!phase) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 flex">
      {COLUMNS.map((colour, i) => (
        <div
          key={colour}
          className={`wipe-col wipe-${phase} h-full flex-1 ${colour}`}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
    </div>
  );
}
