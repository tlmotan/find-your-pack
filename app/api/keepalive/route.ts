// Called daily by Vercel Cron (vercel.json) so the free Supabase project
// doesn't pause between monthly events (ARCHITECTURE.md §9).

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await getSupabase().rpc("keepalive");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
