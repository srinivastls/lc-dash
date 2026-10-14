import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

type AnyObject = Record<string, unknown>;
const API_BASE = "https://alfa-leetcode-api.onrender.com";

function obj(value: unknown): AnyObject {
  return value && typeof value === "object" ? value as AnyObject : {};
}
function firstNumber(objects: AnyObject[], keys: string[]): number | null {
  for (const item of objects) {
    for (const key of keys) {
      const n = Number(item[key]);
      if (item[key] !== undefined && item[key] !== null && item[key] !== "" && Number.isFinite(n)) return n;
    }
  }
  return null;
}
function normalizeSolved(raw: unknown) {
  const root = obj(raw);
  const nested = obj(root.solvedProblem);
  const all = [root, nested, obj(root.data)];
  return {
    totalSolved: firstNumber(all, ["solvedProblem", "totalSolved", "total_solved", "solved"]),
    easySolved: firstNumber(all, ["easySolved", "easy_solved", "Easy"]),
    mediumSolved: firstNumber(all, ["mediumSolved", "medium_solved", "Medium"]),
    hardSolved: firstNumber(all, ["hardSolved", "hard_solved", "Hard"]),
    totalQuestions: firstNumber(all, ["totalQuestions", "total_questions", "totalProblem"])
  };
}
function normalizeProfile(raw: unknown) {
  const root = obj(raw);
  const profile = obj(root.profile);
  const matched = obj(root.matchedUser);
  const submitStats = obj(root.submitStats);
  const ac = obj(submitStats.acSubmissionNum);
  const ranking = firstNumber([root, profile, matched], ["ranking", "rank"]);
  return { ranking, ac };
}
function normalizeCalendar(raw: unknown): Record<string, number> {
  const root = obj(raw);
  let candidate: unknown = root.submissionCalendar ?? root.calendar ?? root.data ?? root;
  if (typeof candidate === "string") {
    try { candidate = JSON.parse(candidate); } catch { return {}; }
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(obj(candidate))) {
    const count = Number(value);
    if (!Number.isFinite(count)) continue;
    // Calendar APIs often return Unix timestamps; convert them to YYYY-MM-DD.
    const numericKey = Number(key);
    const day = /^\d{4}-\d{2}-\d{2}$/.test(key)
      ? key
      : Number.isFinite(numericKey)
        ? new Date(numericKey > 1e12 ? numericKey : numericKey * 1000).toISOString().slice(0, 10)
        : key;
    out[day] = count;
  }
  return out;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "CodeTrack-LeetCode-Dashboard/1.0" },
    signal: AbortSignal.timeout(12000),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Upstream API returned ${response.status}`);
  return response.json();
}

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await context.params;
  const username = decodeURIComponent(rawUsername).trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid LeetCode username." }, { status: 400 });
  }

  try {
    const [solvedResult, profileResult, calendarResult] = await Promise.allSettled([
      fetchJson(`${API_BASE}/${encodeURIComponent(username)}/solved`),
      fetchJson(`${API_BASE}/${encodeURIComponent(username)}`),
      fetchJson(`${API_BASE}/${encodeURIComponent(username)}/calendar`)
    ]);
    if (solvedResult.status === "rejected" && profileResult.status === "rejected") {
      return NextResponse.json({ error: "The public stats service is unavailable or the username could not be found. Try again shortly." }, { status: 502 });
    }

    const solved = solvedResult.status === "fulfilled" ? normalizeSolved(solvedResult.value) : normalizeSolved({});
    const profile = profileResult.status === "fulfilled" ? normalizeProfile(profileResult.value) : { ranking: null, ac: {} as AnyObject };
    // Some API versions return difficulty counts in the profile payload instead of /solved.
    const difficultyRows = Array.isArray(profile.ac) ? profile.ac as unknown[] : [];
    const fromRows = (difficulty: string) => {
      const row = difficultyRows.map(obj).find(r => String(r.difficulty ?? r.difficultyName ?? "").toLowerCase() === difficulty);
      return row ? firstNumber([row], ["count", "submissions", "solved"]) : null;
    };
    const easySolved = solved.easySolved ?? fromRows("easy");
    const mediumSolved = solved.mediumSolved ?? fromRows("medium");
    const hardSolved = solved.hardSolved ?? fromRows("hard");
    const totalSolved = solved.totalSolved !== null
      ? solved.totalSolved
      : [easySolved, mediumSolved, hardSolved].every(v => v !== null)
        ? ((easySolved ?? 0) + (mediumSolved ?? 0) + (hardSolved ?? 0))
        : null;
    const calendar = calendarResult.status === "fulfilled" ? normalizeCalendar(calendarResult.value) : {};

    return NextResponse.json({
      username,
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      totalQuestions: solved.totalQuestions,
      ranking: profile.ranking,
      calendar,
      updatedAt: new Date().toISOString(),
      source: "alfa-leetcode-api"
    }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return NextResponse.json({ error: "Unable to load LeetCode data right now. Please retry." }, { status: 502 });
  }
}
