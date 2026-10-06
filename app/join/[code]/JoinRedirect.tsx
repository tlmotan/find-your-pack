"use client";

import { StatusScreen } from "@/components/play/StatusScreen";

export function JoinRedirect({ joinCode }: { joinCode: string }) {
  // TODO: validate with joinCodeSchema → getDeviceToken → joinSession →
  //       "joined" → router.replace(`/play/${session_id}?code=${joinCode}`)
  //       "not_open" → StatusScreen "This game hasn't opened yet"
  //       "ended" → StatusScreen "This game has ended"
  void joinCode;
  return <StatusScreen title="Joining…" />;
}
