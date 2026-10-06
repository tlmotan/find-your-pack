// The host secret lives in the URL fragment (/host/{id}#key=…), which browsers
// never send to servers or logs (ARCHITECTURE.md §7).

export function readHostSecretFromHash(hash: string = typeof window === "undefined" ? "" : window.location.hash): string | null {
  const key = new URLSearchParams(hash.replace(/^#/, "")).get("key");
  return key && key.length > 0 ? key : null;
}

export function buildHostLink(origin: string, sessionId: string, hostSecret: string): string {
  return `${origin}/host/${sessionId}#key=${encodeURIComponent(hostSecret)}`;
}

export function buildJoinLink(origin: string, joinCode: string): string {
  return `${origin}/join/${joinCode}`;
}
