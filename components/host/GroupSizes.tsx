// Group sizes after Start, to help the host judge completion in real life (PRD H8).
//
// The code book: every flag flying, with its pack's count. The host reads this
// off a projector, so the flag does the identifying and the number does the rest.
// Two columns at every width — three would shrink the flags below the size they
// can be told apart at from the back of a hall.

import { SignalFlag } from "@/components/play/SignalFlag";
import type { HostState } from "@/lib/types";
import { packFlag } from "@/lib/pack-flag";

export function GroupSizes({ groups }: { groups: HostState["group_sizes"] }) {
  if (groups.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4">
      {groups.map((g) => (
        <li
          key={g.name}
          className="flex items-center gap-3 rounded-md border border-rule bg-ground-raised p-3 sm:gap-4 sm:p-4"
        >
          <SignalFlag id={packFlag(g.name).id} className="h-10 w-15 shrink-0 rounded-[2px] sm:h-14 sm:w-21" />
          {g.emoji ? (
            <span aria-hidden="true" className="hidden shrink-0 text-3xl leading-none sm:block">
              {g.emoji}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold tracking-[-0.01em] text-chalk sm:text-2xl">
              {g.emoji ? (
                <span aria-hidden="true" className="sm:hidden">
                  {g.emoji}{" "}
                </span>
              ) : null}
              {g.name}
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tracking-[0.14em] text-chalk-dim tabular-nums uppercase">
              {g.size} {g.size === 1 ? "player" : "players"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
