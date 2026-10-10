// Typed wrappers around the Postgres RPC functions (ARCHITECTURE.md §5).
// UI code calls these, never supabase.rpc() directly.

import { RPC_TIMEOUT_MS } from "./constants";
import { getSupabase } from "./supabase/client";
import type { CreateSessionResult, HostState, JoinResult, MyState } from "./types";
import type { CreateSessionInput, FeedbackInput, UpdateSettingsInput } from "./validation";
import { withTimeout } from "./with-timeout";

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  // Bounded so a request that never answers cannot stall the caller. The poll
  // loop in useMyState depends on every call settling.
  const { data, error } = await withTimeout(getSupabase().rpc(fn, args), RPC_TIMEOUT_MS, fn);
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  return data as T;
}

// Host --------------------------------------------------------------------
export const createSession = (i: CreateSessionInput) =>
  call<CreateSessionResult>("create_session", {
    p_theme_key: i.theme_key,
    p_group_options: i.group_options,
    p_reveal_seconds: i.reveal_seconds,
    p_expires_in_days: i.expires_in_days,
  });

export const getHostState = (sessionId: string, hostSecret: string) =>
  call<HostState>("get_host_state", { p_session_id: sessionId, p_host_secret: hostSecret });

export const updateSettings = (sessionId: string, hostSecret: string, i: UpdateSettingsInput) =>
  call<HostState>("update_settings", {
    p_session_id: sessionId,
    p_host_secret: hostSecret,
    p_reveal_seconds: i.reveal_seconds ?? null,
    p_group_count_override: i.group_count_override ?? null,
    p_expires_in_days: i.expires_in_days ?? null,
  });

export const openLobby = (sessionId: string, hostSecret: string) =>
  call<HostState>("open_lobby", { p_session_id: sessionId, p_host_secret: hostSecret });

export const startSession = (sessionId: string, hostSecret: string) =>
  call<HostState>("start_session", { p_session_id: sessionId, p_host_secret: hostSecret });

/** Deal the room again, everyone on a new pack. Refused while a reveal is running. */
export const startNextRound = (sessionId: string, hostSecret: string) =>
  call<HostState>("start_next_round", { p_session_id: sessionId, p_host_secret: hostSecret });

export const endSession = (sessionId: string, hostSecret: string) =>
  call<{ ok: true }>("end_session", { p_session_id: sessionId, p_host_secret: hostSecret });

// Player ------------------------------------------------------------------
export const joinSession = (joinCode: string, deviceToken: string) =>
  call<JoinResult>("join_session", { p_join_code: joinCode, p_device_token: deviceToken });

export const getMyState = (sessionId: string, deviceToken: string) =>
  call<MyState>("get_my_state", { p_session_id: sessionId, p_device_token: deviceToken });

// Feedback ----------------------------------------------------------------
/**
 * Write one post-game response (PRD F1).
 *
 * Unauthenticated on purpose: by the time this is called the session has been
 * deleted, so there is no secret or token left to prove anything with. See the
 * d1 migration for why that is acceptable here and nowhere else.
 */
export const submitFeedback = (i: FeedbackInput) =>
  call<{ ok: true }>("submit_feedback", {
    p_rating: i.rating,
    p_reasons: i.reasons,
    p_comment: i.comment,
    p_join_code: i.join_code,
  });
