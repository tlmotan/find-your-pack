"use client";

// Create a session: groups, reveal timer, expiry → create_session → "Save your host link".

import { SettingsForm } from "@/components/host/SettingsForm";

export default function NewHostPage() {
  // TODO: on submit → createSession → show HostLinkCard → router.push(host link)
  return <SettingsForm submitLabel="Create game" onSubmit={() => {}} />;
}
