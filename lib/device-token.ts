// The player's only identity: a random token kept in this browser (ARCHITECTURE.md §1, §7).
// No personal data. Clearing site data or switching browser = a new player.

const STORAGE_KEY = "fyp.device_token";

/** Only the two methods we use, so tests can pass a stub and a node run works. */
export type TokenStorage = Pick<Storage, "getItem" | "setItem">;

// Last-resort identity for a browser that refuses storage. It lives as long as
// the page does, which is long enough to play: the player keeps one tab open.
let memoryToken: string | null = null;

function browserStorage(): TokenStorage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // Safari in private mode throws on the property access itself.
    return null;
  }
}

function newToken(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  // Older iOS Safari has crypto.getRandomValues but not randomUUID.
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // The token only has to be unique among players in one room, and it is never
  // a security boundary — the server stores a hash and trusts nothing else.
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getDeviceToken(storage: TokenStorage | null = browserStorage()): string {
  if (storage) {
    try {
      const existing = storage.getItem(STORAGE_KEY);
      if (existing) return existing;

      const created = newToken();
      storage.setItem(STORAGE_KEY, created);
      return created;
    } catch {
      // Quota or a hardened browser: fall through to the in-memory token rather
      // than failing the join outright.
    }
  }

  memoryToken ??= newToken();
  return memoryToken;
}
