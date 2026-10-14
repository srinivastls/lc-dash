import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

type Obj = Record<string, unknown>;
function obj(value: unknown): Obj { return value && typeof value === "object" ? value as Obj : {}; }
function firstText(...values: unknown[]): string {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}
function firstNum(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value);
    if (value !== undefined && value !== null && value !== "" && Number.isFinite(n)) return n;
  }
  return null;
}
function normalize(raw: unknown) {
  const root = obj(raw);
  const candidates: unknown[] = Array.isArray(raw) ? raw : [
    root.submission, root.submissions, root.data, root.acceptedSubmission,
    root.acSubmission, root.recentAcSubmissionList, root
  ];
  let rows: unknown[] = [];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) { rows = candidate; break; }
    const nested = obj(candidate);
    for (const key of ["submission", "submissions", "acceptedSubmission", "acSubmission", "recentAcSubmissionList", "data", "results"]) {
      if (Array.isArray(nested[key])) { rows = nested[key] as unknown[]; break; }
    }
    if (rows.length) break;
  }

  const unique = new Map<string, {
    id: string; title: string; slug: string; difficulty: string;
    timestamp: number | null; language: string; status: string; url: string;
  }>();

  for (const item of rows) {
    const r = obj(item);
    const question = obj(r.question);
    const title = firstText(r.title, r.titleSlug && String(r.titleSlug).replace(/-/g, " "), r.title_slug, question.title, question.titleSlug && String(question.titleSlug).replace(/-/g, " "));
    const slug = firstText(r.titleSlug, r.title_slug, question.titleSlug, question.title_slug);
    if (!title && !slug) continue;
    const statusRaw = firstText(r.statusDisplay, r.status, r.status_msg, r.statusMsg, "Accepted");
    if (!/accepted|success|ac$/i.test(statusRaw) && statusRaw !== "Accepted") continue;
    const id = firstText(r.questionId, r.question_id, question.questionId, question.questionFrontendId, r.id, slug, title);
    const key = slug || id || title;
    if (unique.has(key)) continue;
    const difficultyRaw = firstText(r.difficulty, question.difficulty, r.level);
    const difficulty = difficultyRaw ? difficultyRaw[0].toUpperCase() + difficultyRaw.slice(1).toLowerCase() : "Unknown";
    const timestamp = firstNum(r.timestamp, r.submitTime, r.submit_time, r.date, r.submissionTime);
    unique.set(key, {
      id, title: title || slug.replace(/-/g, " "), slug, difficulty,
      timestamp, language: firstText(r.lang, r.language, r.programmingLanguage) || "—",
      status: statusRaw, url: slug ? `https://leetcode.com/problems/${slug}/` : "https://leetcode.com/problemset/"
    });
  }
  return [...unique.values()].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
}

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username: raw } = await context.params;
  const username = decodeURIComponent(raw).trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid LeetCode username." }, { status: 400 });
  }
  try {
    // Public endpoint currently exposes recent accepted submissions; request an expanded window.
    const response = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/acSubmission?limit=100`, {
      headers: { Accept: "application/json", "User-Agent": "CodeTrack-LeetCode-Dashboard/1.0" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store"
    });
    if (!response.ok) {
      return NextResponse.json({ error: `The public submission service returned ${response.status}.` }, { status: 502 });
    }
    const rawData: unknown = await response.json();
    const problems = normalize(rawData);
    return NextResponse.json({
      username,
      problems,
      count: problems.length,
      scope: "recent accepted submissions; upstream public endpoint may limit history",
      updatedAt: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not retrieve accepted submissions right now. Please retry later." }, { status: 502 });
  }
}
