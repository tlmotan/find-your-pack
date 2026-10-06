// Group sizes after Start, to help the host judge completion in real life (PRD H8).

import type { HostState } from "@/lib/types";

export function GroupSizes({ groups }: { groups: HostState["group_sizes"] }) {
  if (groups.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {groups.map((g) => (
        <li key={g.name} className="rounded-lg bg-surface px-4 py-3 text-center">
          <span className="block text-4xl" aria-hidden="true">
            {g.emoji}
          </span>
          <span className="mt-1 block text-lg font-semibold text-ink">{g.name}</span>
          <span className="block text-base tabular-nums text-muted">
            {g.size} {g.size === 1 ? "player" : "players"}
          </span>
        </li>
      ))}
    </ul>
  );
}
