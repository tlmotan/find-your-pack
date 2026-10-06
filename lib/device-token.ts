// The player's only identity: a random token kept in this browser (ARCHITECTURE.md §1, §7).
// No personal data. Clearing site data or switching browser = a new player.

const STORAGE_KEY = "fyp.device_token";

export function getDeviceToken(): string {
  // TODO: read from localStorage; if missing, create with crypto.randomUUID() and save.
  //       Wrap storage access in try/catch (private mode can throw) and fall back to an in-memory token.
  void STORAGE_KEY;
  throw new Error("not implemented: getDeviceToken");
}
