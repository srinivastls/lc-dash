import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const username = process.env.LEETCODE_USERNAME?.trim().replace(/^@/, "");
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!username || !appUrl || !supabaseUrl || !serviceKey) {
    return NextResponse.json({
      error: "Missing LEETCODE_USERNAME, APP_URL, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY."
    }, { status: 500 });
  }

  try {
    const statsResponse = await fetch(`${appUrl}/api/leetcode/${encodeURIComponent(username)}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000)
    });
    if (!statsResponse.ok) {
      return NextResponse.json({ error: "Could not fetch the configured public profile." }, { status: 502 });
    }

    const stats = await statsResponse.json();
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const snapshotDate = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("leetcode_snapshots").upsert({
      username,
      snapshot_date: snapshotDate,
      total_solved: stats.totalSolved,
      easy_solved: stats.easySolved,
      medium_solved: stats.mediumSolved,
      hard_solved: stats.hardSolved,
      ranking: stats.ranking
    }, { onConflict: "username,snapshot_date" });

    if (error) {
      return NextResponse.json({ error: "Snapshot database write failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, username, snapshotDate });
  } catch {
    return NextResponse.json({ error: "Daily snapshot failed; check service and database configuration." }, { status: 500 });
  }
}
