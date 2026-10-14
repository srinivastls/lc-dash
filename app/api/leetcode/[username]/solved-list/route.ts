import { NextResponse } from "next/server";
import { Credential, LeetCode } from "leetcode-query";

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
    const statusRaw = firstText(
  r.statusDisplay,
  r.status,
  r.status_msg,
  r.statusMsg
);

if (statusRaw.toLowerCase() !== "accepted") continue;
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


async function getDifficultyMap(): Promise<Map<string, string>> {
  const leetcode = new LeetCode();
  const difficultyMap = new Map<string, string>();

  // Fetch the full problem list in pages.
  const pageSize = 100;
  const maxPages = 50;

  for (let page = 0; page < maxPages; page++) {
    const result: unknown = await leetcode.problems({
      limit: pageSize,
      offset: page * pageSize,
    });

    const root = obj(result);
    const rows: unknown[] = Array.isArray(result)
      ? result
      : Array.isArray(root.questions)
        ? root.questions as unknown[]
        : Array.isArray(root.problemsetQuestionList)
          ? root.problemsetQuestionList as unknown[]
          : Array.isArray(root.data)
            ? root.data as unknown[]
            : [];

    if (rows.length === 0) break;

    for (const item of rows) {
      const problem = obj(item);
      const slug = firstText(
        problem.titleSlug,
        problem.title_slug
      );

      const rawDifficulty = firstText(
        problem.difficulty,
        obj(problem.stat).difficulty
      );

      if (slug && rawDifficulty) {
        difficultyMap.set(
          slug,
          rawDifficulty[0].toUpperCase() +
            rawDifficulty.slice(1).toLowerCase()
        );
      }
    }

    if (rows.length < pageSize) break;
  }

  return difficultyMap;
}


function normalizeAuthenticated(rows: unknown[] ,
  difficultyMap: Map<string, string>) {
  const unique = new Map<string, {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    timestamp: number | null;
    language: string;
    status: string;
    url: string;
  }>();

  for (const item of rows) {
    const r = obj(item);
    const title = firstText(r.title);
    const slug = firstText(r.titleSlug);

    if (!title || !slug) continue;

    const status = firstText(r.statusDisplay);
    if (status.toLowerCase() !== "accepted") continue;

    if (!unique.has(slug)) {
      unique.set(slug, {
        id: firstText(r.id, slug),
        title,
        slug,
        difficulty: difficultyMap.get(slug) ?? "Unknown",
        timestamp: firstNum(r.timestamp, r.time),
        language: firstText(r.lang) || "—",
        status: "Accepted",
        url: `https://leetcode.com/problems/${slug}/`
      });
    }
  }

  return [...unique.values()].sort(
    (a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
  );
}


async function getAuthenticatedSubmissions(sessionCookie: string) {
  const credential = new Credential();
  await credential.init(sessionCookie);
  const leetcode = new LeetCode(credential);
  const pageSize = 100;
  const maxPages = 100; // safety cap: up to 10,000 submissions per manual refresh
  const collected: unknown[] = [];

  for (let page = 0; page < maxPages; page++) {
    const result: unknown = await leetcode.submissions({ limit: pageSize, offset: page * pageSize });
    const debug = obj(result);

    if (Array.isArray(result) && result.length > 0) {
  const first = obj(result[0]);

}
    let rows: unknown[] = [];
    if (Array.isArray(result)) rows = result;
    else {
      const r = obj(result);
      for (const key of ["submissions", "submission", "data", "submissions_dump", "results"]) {
        if (Array.isArray(r[key])) { rows = r[key] as unknown[]; break; }
      }
      if (!rows.length && r.data && Array.isArray(obj(r.data).submissions)) {
        rows = obj(r.data).submissions as unknown[];
      }
    }
    if (rows.length === 0) break;
    collected.push(...rows);
    if (rows.length < pageSize) break;
  }
  return collected;
}

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  const { username: raw } = await context.params;
  const username = decodeURIComponent(raw).trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Enter a valid LeetCode username." }, { status: 400 });
  }
  try {
    const sessionCookie = process.env.LEETCODE_SESSION_COOKIE?.trim();
    let rawData: unknown;
    let scope: string;
    let authWarning: string | undefined;

    
if (sessionCookie) {
  try {
    const authenticatedRows = await getAuthenticatedSubmissions(sessionCookie);

    if (authenticatedRows.length > 0) {
      rawData = authenticatedRows;
      scope = "authenticated submission history (up to 10,000 submissions per refresh)";
    } else {
      authWarning =
        "Authenticated history returned no rows. Showing recent public submissions instead.";
    }
  } catch (error) {
    // Log only a safe error category; never log the cookie or response payload.
    console.error(
      "LeetCode submission fetch failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    authWarning =
      "Authenticated history failed. Showing recent public submissions instead.";
  }
}


    if (!rawData) {
      const response = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/acSubmission?limit=100`, {
        headers: { Accept: "application/json", "User-Agent": "CodeTrack-LeetCode-Dashboard/1.0" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store"
      });
      if (!response.ok) {
        return NextResponse.json({
          error: `The public submission service returned HTTP ${response.status}.`,
          ...(authWarning ? { authWarning } : {})
        }, { status: 502 });
      }
      rawData = await response.json();
      scope = "recent accepted submissions; public endpoint currently returns a limited recent history";
    }

    const problems = sessionCookie && Array.isArray(rawData)
  ? normalizeAuthenticated(rawData, await getDifficultyMap())
  : normalize(rawData);

    console.log("Normalized accepted problems:", problems.length);
    return NextResponse.json({
      username,
      problems,
      count: problems.length,
      scope,
      authenticated: Boolean(sessionCookie && !authWarning),
      ...(authWarning ? { authWarning } : {}),
      updatedAt: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Safe diagnostic only: never return request headers, cookies, or raw upstream payloads.
    const category = error instanceof Error ? error.name : "UnknownError";
    return NextResponse.json({
      error: "Could not retrieve accepted submissions right now. Please retry later.",
      diagnostic: category
    }, { status: 502 });
  }
}
