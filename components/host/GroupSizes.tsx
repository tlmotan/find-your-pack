// Group sizes after Start, to help the host judge completion in real life (PRD H8).

import type { HostState } from "@/lib/types";

export function GroupSizes({ groups }: { groups: HostState["group_sizes"] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 p-6">
      {groups.map((g) => (
        <li key={g.name}>
          {g.emoji} {g.name}: {g.size}
        </li>
      ))}
    </ul>
  );
}
