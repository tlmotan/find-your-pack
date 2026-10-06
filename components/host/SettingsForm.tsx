"use client";

// Groups (preset or custom names), reveal timer, expiry (PRD H2, H3, H1a, H9).
// Used on /host/new, and in the lobby before Start.

import type { CreateSessionInput } from "@/lib/validation";

type Props = { onSubmit: (input: CreateSessionInput) => void; submitLabel: string };

export function SettingsForm({ onSubmit, submitLabel }: Props) {
  // TODO: build form, validate with createSessionSchema before onSubmit
  void onSubmit;
  return (
    <form className="p-6" onSubmit={(e) => e.preventDefault()}>
      <p>Settings form (TODO)</p>
      <button type="submit" className="mt-4 rounded border px-4 py-2">{submitLabel}</button>
    </form>
  );
}
