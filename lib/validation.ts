import { z } from "zod";
import { EXPIRES_IN_DAYS, GROUP_OPTIONS, REVEAL_SECONDS } from "./constants";

// Zod schemas for every input that crosses a boundary (form → RPC, URL → page).
// The database re-checks the same limits with CHECK constraints.

export const groupOptionSchema = z.object({
  name: z.string().trim().min(1).max(GROUP_OPTIONS.nameMaxLength),
  emoji: z.string().max(16).optional(),
  sound_hint: z.string().max(40).optional(),
});

export const createSessionSchema = z.object({
  theme_key: z.string().nullable(),
  group_options: z.array(groupOptionSchema).min(GROUP_OPTIONS.min).max(GROUP_OPTIONS.max),
  reveal_seconds: z.number().int().min(REVEAL_SECONDS.min).max(REVEAL_SECONDS.max),
  expires_in_days: z.number().int().min(EXPIRES_IN_DAYS.min).max(EXPIRES_IN_DAYS.max),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSettingsSchema = z.object({
  reveal_seconds: z.number().int().min(REVEAL_SECONDS.min).max(REVEAL_SECONDS.max).optional(),
  group_count_override: z.number().int().min(1).max(GROUP_OPTIONS.max).nullable().optional(),
  expires_in_days: z.number().int().min(EXPIRES_IN_DAYS.min).max(EXPIRES_IN_DAYS.max).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

/** 6 characters, no 0/O or 1/I lookalikes. Matches the DB CHECK constraint. */
export const joinCodeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/);
