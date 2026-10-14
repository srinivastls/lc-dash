"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, Brain, CalendarDays, CheckCircle2, Flame, RefreshCw, Target, Trophy, BookOpen, Clock3, RotateCcw, Plus, Trash2 } from "lucide-react";

type Revision = { id: string; title: string; topic: string; due: string; note: string };
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
  const [activeTab, setActiveTab] = useState<"overview" | "topics" | "revision">("overview");
  const [dailyGoal, setDailyGoal] = useState(2);
  const [completedToday, setCompletedToday] = useState(0);
  const [revisionTitle, setRevisionTitle] = useState("");
  const [revisionTopic, setRevisionTopic] = useState("Arrays & Hashing");
  const [revisionDue, setRevisionDue] = useState("tomorrow");
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["Arrays & Hashing", "Two Pointers", "Sliding Window"]);
  const topics = [
    { name: "Arrays & Hashing", level: "Core", note: "Frequency maps, prefix sums, grouping" },
    { name: "Two Pointers", level: "Core", note: "Sorted arrays, in-place scans" },
    { name: "Sliding Window", level: "Core", note: "Fixed and variable window patterns" },
    { name: "Binary Search", level: "Core", note: "Boundaries, answer-space search" },
    { name: "Trees & BST", level: "Core", note: "DFS, BFS, recursion, invariants" },
    { name: "Graphs", level: "Build", note: "BFS/DFS, topological sort, union-find" },
    { name: "Dynamic Programming", level: "Build", note: "State, transitions, memoization" },
    { name: "Backtracking", level: "Build", note: "Choose, explore, undo" },
    { name: "Heaps & Intervals", level: "Build", note: "Top-k, scheduling, merging" },
    { name: "Linked Lists", level: "Core", note: "Pointers, reversal, cycle detection" },
    { name: "Stack & Queue", level: "Core", note: "Monotonic stack, BFS queues" },
    { name: "Greedy", level: "Build", note: "Local choices and proof intuition" }
  ];

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
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("codetrack-revisions-v1");
      if (saved) setRevisions(JSON.parse(saved) as Revision[]);
    } catch { /* local revision list is optional */ }
  }, []);
  useEffect(() => {
    try { window.localStorage.setItem("codetrack-revisions-v1", JSON.stringify(revisions)); }
    catch { /* storage may be disabled */ }
  }, [revisions]);

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

      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        <button className={activeTab === "overview" ? "tab active" : "tab"} onClick={() => setActiveTab("overview")}><Activity size={15}/> Overview</button>
        <button className={activeTab === "topics" ? "tab active" : "tab"} onClick={() => setActiveTab("topics")}><Brain size={15}/> DSA topics</button>
        <button className={activeTab === "revision" ? "tab active" : "tab"} onClick={() => setActiveTab("revision")}><RotateCcw size={15}/> Revision queue <span className="tab-count">{revisions.length}</span></button>
      </nav>

      {activeTab === "overview" && <>
      <section className="daily-plan panel">
        <div className="daily-plan-copy"><div className="panel-title"><Target size={18}/> Today's interview plan</div><p>Small, consistent sessions beat last-minute marathons.</p></div>
        <div className="daily-controls">
          <label>Daily target <select value={dailyGoal} onChange={e => setDailyGoal(Number(e.target.value))}><option value={1}>1 problem</option><option value={2}>2 problems</option><option value={3}>3 problems</option><option value={4}>4 problems</option><option value={5}>5 problems</option></select></label>
          <div className="goal-counter"><button aria-label="Decrease completed problems" onClick={() => setCompletedToday(v => Math.max(0, v - 1))}>−</button><strong>{completedToday}<span> / {dailyGoal}</span></strong><button aria-label="Mark a problem completed" onClick={() => setCompletedToday(v => Math.min(dailyGoal, v + 1))}>+</button></div>
        </div>
        <div className="daily-progress"><div style={{width: `${Math.min(100, completedToday / dailyGoal * 100)}%`}}/></div>
        <div className="daily-foot"><span>{completedToday >= dailyGoal ? "Daily target reached — great work!" : `${dailyGoal - completedToday} more to reach today's target`}</span><span>{Math.round(Math.min(100, completedToday / dailyGoal * 100))}%</span></div>
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

      </>}
      {activeTab === "topics" && <section className="panel topic-panel">
        <div className="panel-heading"><div><div className="panel-title"><Brain size={18}/> DSA topic checklist</div><p>Mark topics you want to focus on this week. This is your self-assessment, not an inferred score.</p></div><span className="panel-badge">{selectedTopics.length} FOCUS AREAS</span></div>
        <div className="topic-grid">{topics.map(topic => <label key={topic.name} className={`topic-card ${selectedTopics.includes(topic.name) ? "topic-selected" : ""}`}><input type="checkbox" checked={selectedTopics.includes(topic.name)} onChange={e => setSelectedTopics(old => e.target.checked ? [...old, topic.name] : old.filter(name => name !== topic.name))}/><div className="topic-card-main"><strong>{topic.name}</strong><span>{topic.note}</span></div><span className="topic-level">{topic.level}</span></label>)}</div>
        <div className="topic-tip"><BookOpen size={16}/><span><b>Interview strategy:</b> solve a representative Medium problem, explain the approach aloud, analyze time/space complexity, then revisit it in 1, 3, and 7 days.</span></div>
      </section>}
      {activeTab === "revision" && <section className="panel revision-panel">
        <div className="panel-heading"><div><div className="panel-title"><RotateCcw size={18}/> Revision queue</div><p>Keep track of problems to revisit. Saved in this browser on this device.</p></div><span className="panel-badge">{revisions.length} SAVED</span></div>
        <form className="revision-form" onSubmit={e => { e.preventDefault(); if (!revisionTitle.trim()) return; setRevisions(old => [{id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, title: revisionTitle.trim(), topic: revisionTopic, due: revisionDue, note: ""}, ...old]); setRevisionTitle(""); }}>
          <label className="revision-field revision-title-field"><span>Problem name or link</span><input value={revisionTitle} onChange={e => setRevisionTitle(e.target.value)} placeholder="e.g. Longest Substring Without Repeating Characters" required/></label>
          <label className="revision-field"><span>Topic</span><select value={revisionTopic} onChange={e => setRevisionTopic(e.target.value)}>{topics.map(t => <option key={t.name}>{t.name}</option>)}</select></label>
          <label className="revision-field"><span>Review</span><select value={revisionDue} onChange={e => setRevisionDue(e.target.value)}><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="3 days">In 3 days</option><option value="7 days">In 7 days</option></select></label>
          <button className="add-revision" type="submit"><Plus size={15}/> Add problem</button>
        </form>
        {revisions.length === 0 ? <div className="empty-state"><div className="empty-icon"><RotateCcw size={22}/></div><strong>Your revision queue is clear</strong><span>Add problems you struggled with so you can solve them again without looking at the solution.</span></div> : <div className="revision-list">{revisions.map(item => <div className="revision-item" key={item.id}><div className="revision-item-icon"><Clock3 size={17}/></div><div className="revision-item-copy"><strong>{item.title}</strong><span>{item.topic} · Review {item.due}</span></div><button className="delete-revision" aria-label={`Remove ${item.title}`} onClick={() => setRevisions(old => old.filter(r => r.id !== item.id))}><Trash2 size={16}/></button></div>)}</div>}
      </section>}
      <footer className="footer"><span>CODETRACK <i>·</i> PERSONAL DSA PROGRESS</span><span>{stats ? `Last loaded ${new Date(stats.updatedAt).toLocaleString()}` : "Waiting for your profile"}{stats?.ranking ? ` · Global rank ${pretty(stats.ranking)}` : ""}</span></footer>
      <p className="disclaimer">Data is provided by a community-maintained API and may be delayed or unavailable. The dashboard does not yet claim to track private submissions or automatically infer topic mastery.</p>
    </main>
  );
}
