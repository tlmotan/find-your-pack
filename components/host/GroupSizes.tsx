// Group sizes after Start, to help the host judge completion in real life (PRD H8).
//
// The code book: every flag flying, with its pack's count. The host reads this
// off a projector, so the flag does the identifying and the number does the rest.

import { SignalFlag } from "@/components/play/SignalFlag";
import type { HostState } from "@/lib/types";
import { packFlag } from "@/lib/pack-flag";

export function GroupSizes({ groups }: { groups: HostState["group_sizes"] }) {
  if (groups.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {groups.map((g) => (
        <li
          key={g.name}
          className="flex items-center gap-3 rounded-md border border-rule bg-ground-raised p-3"
        >
          <SignalFlag id={packFlag(g.name).id} className="h-10 w-15 shrink-0 rounded-[2px]" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-chalk">
              {g.emoji ? <span aria-hidden="true">{g.emoji} </span> : null}
              {g.name}
            </p>
            <p className="text-[13px] font-semibold tracking-[0.14em] text-chalk-dim tabular-nums uppercase">
              {g.size} {g.size === 1 ? "player" : "players"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
