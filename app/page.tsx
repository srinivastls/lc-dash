"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Brain, CalendarDays, CheckCircle2, Flame, RefreshCw, Target, Trophy } from "lucide-react";

type Stats = {
  username: string;
  totalSolved: number | null;
  easySolved: number | null;
  mediumSolved: number | null;
  hardSolved: number | null;
  totalQuestions: number | null;
  ranking: number | null;
  calendar: Record<string, number>;
  updatedAt: string;
  source: string;
};

function numberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && value !== null && value !== "" ? n : null;
}
function pretty(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

export default function Dashboard() {
  const [username, setUsername] = useState("srinivastls");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStats(event?: React.FormEvent) {
    event?.preventDefault();
    const clean = username.trim().replace(/^@/, "");
    if (!clean) { setError("Enter your LeetCode username to load your public stats."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/leetcode/${encodeURIComponent(clean)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Couldn't load this profile. Check the username and try again.");
      setStats(payload);
      setUsername(clean);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStats(null);
    } finally { setLoading(false); }
  }

  const solved = stats?.totalSolved ?? 0;
  const total = stats?.totalQuestions ?? 0;
  const progress = total > 0 ? Math.min(100, (solved / total) * 100) : 0;
  const calendarEntries = stats ? Object.entries(stats.calendar).sort(([a], [b]) => a.localeCompare(b)).slice(-140) : [];

  useEffect(() => { void loadStats(); }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark"><Activity size={22} /></div>
        <div className="brand-copy"><strong>CodeTrack</strong><span>LEETCODE INTERVIEW OS</span></div>
        <a className="leetcode-link" href="https://leetcode.com/" target="_blank" rel="noreferrer">Open LeetCode <ArrowUpRight size={15}/></a>
      </header>

      <section className="hero">
        <div className="eyebrow"><span className="pulse" /> YOUR PERSONAL CODING ANALYTICS</div>
        <h1>Consistency builds<br/><span>interview confidence.</span></h1>
        <p className="hero-copy">Track the work behind the results. Review your problem-solving activity, monitor difficulty balance, and build a stronger DSA routine.</p>
        <form className="profile-form" onSubmit={loadStats}>
          <div className="input-wrap"><span>leetcode.com/u/</span><input aria-label="LeetCode username" placeholder="your-username" value={username} onChange={e => setUsername(e.target.value)} /></div>
          <button disabled={loading} type="submit">{loading ? <RefreshCw className="spin" size={16}/> : <Activity size={16}/>} {loading ? "Loading…" : "Load my stats"}</button>
        </form>
        {error && <p role="alert" className="error">{error}</p>}
        <p className="privacy-note"><CheckCircle2 size={14}/> Public profile data only. No password or session cookie needed.</p>
      </section>

      <section className="section-heading">
        <div><span className="section-kicker">YOUR OVERVIEW</span><h2>{stats ? `Welcome back, ${stats.username}` : "Your progress at a glance"}</h2></div>
        {stats && <button className="refresh-button" onClick={() => loadStats()} disabled={loading}><RefreshCw size={14}/> Refresh</button>}
      </section>

      <section className="metric-grid">
        <article className="metric-card primary-card">
          <div className="metric-top"><span>Problems solved</span><div className="metric-icon"><CheckCircle2 size={18}/></div></div>
          <div className="metric-number">{stats ? pretty(stats.totalSolved) : "—"}<small>{stats?.totalQuestions ? ` / ${pretty(stats.totalQuestions)}` : " total"}</small></div>
          <div className="progress-track"><div className="progress-fill" style={{width: `${progress}%`}} /></div>
          <div className="metric-foot">{stats ? `${progress.toFixed(1)}% of tracked problem set` : "Connect your profile to begin"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>Easy solved</span><div className="metric-icon easy"><Target size={18}/></div></div>
          <div className="metric-number">{stats ? pretty(stats.easySolved) : "—"}</div><div className="metric-foot">Build speed & fundamentals</div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>Medium solved</span><div className="metric-icon medium"><Brain size={18}/></div></div>
          <div className="metric-number">{stats ? pretty(stats.mediumSolved) : "—"}</div><div className="metric-foot">Core interview practice</div>
        </article>
        <article className="metric-card">
          <div className="metric-top"><span>Hard solved</span><div className="metric-icon hard"><Trophy size={18}/></div></div>
          <div className="metric-number">{stats ? pretty(stats.hardSolved) : "—"}</div><div className="metric-foot">Advanced problem solving</div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><div className="panel-title"><CalendarDays size={18}/> Submission activity</div><p>Recent activity from your public calendar</p></div><span className="panel-badge">LAST ~20 WEEKS</span></div>
          {!stats ? <div className="empty-state"><div className="empty-icon"><CalendarDays size={23}/></div><strong>Your activity will appear here</strong><span>Enter your username above to load the public activity calendar.</span></div> :
            calendarEntries.length ? <div className="calendar-bars">{calendarEntries.map(([day, count]) => <div key={day} className="bar-column" title={`${day}: ${count} submissions`}><div className={`bar level-${count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : 3}`} style={{height: `${Math.max(5, Math.min(100, count * 15))}%`}}/><span>{day.slice(8)}</span></div>)}</div> :
            <div className="empty-state"><strong>No calendar data returned</strong><span>The upstream API may not expose this profile's calendar.</span></div>}
          <div className="activity-legend"><span>Less</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><span>More</span></div>
        </article>
        <article className="panel goal-panel">
          <div className="panel-heading"><div><div className="panel-title"><Flame size={18}/> Interview focus</div><p>A simple weekly structure</p></div></div>
          <div className="goal-row"><div className="goal-number">01</div><div><strong>Patterns before volume</strong><span>Recognize the technique, then solve variations.</span></div></div>
          <div className="goal-row"><div className="goal-number">02</div><div><strong>Review missed problems</strong><span>Re-solve without looking at your old solution.</span></div></div>
          <div className="goal-row"><div className="goal-number">03</div><div><strong>Practice under time</strong><span>Explain complexity and trade-offs out loud.</span></div></div>
          <div className="goal-note"><Target size={16}/><span>Suggested starting target: <b>5 focused problems per week</b>. Adjust it to your schedule.</span></div>
        </article>
      </section>

      <footer className="footer"><span>CODETRACK <i>·</i> PERSONAL DSA PROGRESS</span><span>{stats ? `Last loaded ${new Date(stats.updatedAt).toLocaleString()}` : "Waiting for your profile"}{stats?.ranking ? ` · Global rank ${pretty(stats.ranking)}` : ""}</span></footer>
      <p className="disclaimer">Data is provided by a community-maintained API and may be delayed or unavailable. The dashboard does not yet claim to track private submissions or automatically infer topic mastery.</p>
    </main>
  );
}
