"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CursorGlow from "./CursorGlow";
import "./home.css";

const EXAMPLES = [
  "Find remote software developer jobs posted in the last 30 days",
  "Collect recent Hacker News posts about startups raising funding, with title, link and date",
  "Find remote or Delhi-NCR software internships posted in the last 7 days",
];

const CARDS = [
  ["01", "Describe", "Type what you need in plain English.", "Gemini turns your words into a structured plan."],
  ["02", "Review", "See fields, filters and sources.", "Switch any source off before you run."],
  ["03", "Run", "Watch five live pipeline steps.", "collect · normalize · validate · dedupe · rank."],
  ["04", "Inspect", "Every row shows its source.", "Rejected rows keep their reason."],
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  const [splash, setSplash] = useState(true);
  const [ph, setPh] = useState(0);
  const [copied, setCopied] = useState(-1);

  useEffect(() => {
    if (sessionStorage.getItem("dp_splash")) {
      setSplash(false);
      return;
    }
    const t = setTimeout(() => {
      setSplash(false);
      sessionStorage.setItem("dp_splash", "1");
    }, 5200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPh((n) => (n + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(t);
  }, []);

  async function go(text: string) {
    if (text.trim().length < 5) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create a plan");
      router.push("/plan/" + data.id);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <CursorGlow />

      {splash && (
        <div className="dp-splash" onClick={() => setSplash(false)}>
          <div className="dp-splash-grid" />
          <div className="dp-splash-orb dp-splash-orb-a" />
          <div className="dp-splash-orb dp-splash-orb-b" />

          <div className="dp-splash-top">
            <span>INTELLIGENCE PLATFORM</span>
            <span>01 / DATA PILOT</span>
          </div>

          <div className="dp-stack">
            <div className="dp-stack-panel panel-a">
              <span>01</span><b>DISCOVER</b><small>Find patterns inside your data.</small>
            </div>
            <div className="dp-stack-panel panel-b">
              <span>02</span><b>DIRECT</b><small>Turn questions into structured plans.</small>
            </div>
            <div className="dp-stack-panel panel-c">
              <span>03</span><b>INSPECT</b><small>Trace every result back to its source.</small>
            </div>
            <div className="dp-brand-panel">
              <span className="dp-kicker">INTELLIGENCE PLATFORM</span>
              <h1>DATA PILOT</h1>
              <p>Turn Data Into Direction.</p>
              <div className="dp-brand-line" />
            </div>
          </div>

          <div className="dp-splash-bottom">
            <span>ASK FOR DATA · TRUST EVERY ROW</span>
            <span>CLICK TO SKIP</span>
          </div>
        </div>
      )}

      <main className="dp-home min-h-screen text-neutral-100">
        <div className="dp-bgfx" aria-hidden="true">
          <div className="dp-orb dp-o1" />
          <div className="dp-orb dp-o2" />
          <div className="dp-orb dp-o3" />
          <div className="dp-grid" />
        </div>

        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
          <header className="dp-nav dp-enter flex items-center justify-between">
            <div className="dp-wordmark">
              <span className="dp-wordmark-dot" />
              DATA PILOT
            </div>
            <nav className="flex items-center gap-2">
              <a href="/history" className="dp-nav-link">History <span>↗</span></a>
              <a href="/history" className="dp-nav-pill">Workspace</a>
            </nav>
          </header>

          <section className="dp-hero">
            <div className="dp-hero-copy dp-enter">
              <div className="dp-eyebrow"><i /> DATA INTELLIGENCE / 01</div>
              <h1>
                Ask for data.
                <br />
                <span>Get direction.</span>
              </h1>
              <p>
                Describe what you need in plain English. Data Pilot builds a
                structured research plan and returns a clean, traceable dataset.
              </p>
            </div>

            <div className="dp-command-wrap dp-enter" style={{ animationDelay: ".18s" }}>
              <div className="dp-command glass">
                <div className="dp-command-top">
                  <span>RESEARCH COMMAND</span>
                  <span className="dp-live"><i /> READY</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={"e.g. " + EXAMPLES[ph]}
                  className="dp-textarea"
                />
                <div className="dp-command-bottom">
                  <span className="dp-hint">Plain English → structured workflow</span>
                  <button
                    onClick={() => go(prompt)}
                    disabled={busy}
                    className="dp-run-btn"
                  >
                    {busy ? "Planning…" : "Create plan"} <b>↗</b>
                  </button>
                </div>
                {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
              </div>
            </div>

            <div className="dp-metrics dp-enter" style={{ animationDelay: ".28s" }}>
              <div><strong>01</strong><span>DESCRIBE</span></div>
              <div><strong>05</strong><span>PIPELINE STEPS</span></div>
              <div><strong>∞</strong><span>TRACEABLE ROWS</span></div>
            </div>
          </section>

          <section className="dp-section dp-enter" style={{ animationDelay: ".38s" }}>
            <div className="dp-section-head">
              <div>
                <span className="dp-section-no">01</span>
                <h2>Start with a question.</h2>
              </div>
              <span className="dp-section-note">QUICK PROMPTS</span>
            </div>

            <div className="dp-examples">
              {EXAMPLES.map((ex, i) => (
                <div key={ex} className="dp-example glass">
                  <button
                    onClick={() => { setPrompt(ex); go(ex); }}
                    disabled={busy}
                    className="dp-example-main"
                  >
                    <span className="dp-example-index">0{i + 1}</span>
                    <span>{ex}</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ex);
                      setCopied(i);
                      setTimeout(() => setCopied(-1), 1500);
                    }}
                    className="dp-copy"
                  >
                    {copied === i ? "COPIED" : "COPY"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="dp-section dp-enter" style={{ animationDelay: ".48s" }}>
            <div className="dp-section-head">
              <div>
                <span className="dp-section-no">02</span>
                <h2>How the pilot works.</h2>
              </div>
              <span className="dp-section-note">HOVER TO EXPLORE</span>
            </div>

            <div className="dp-process-grid">
              {CARDS.map(([n, t, a, b], i) => (
                <div key={n} tabIndex={0} className="dp-process">
                  <div className="dp-process-inner">
                    <div className="dp-process-face">
                      <div className="dp-process-number">{n}</div>
                      <h3>{t}</h3>
                      <p>{a}</p>
                      <span className="dp-arrow">↗</span>
                    </div>
                    <div className="dp-process-face dp-process-back">
                      <span>PROCESS / {n}</span>
                      <p>{b}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer className="dp-footer">
            <span>DATA PILOT</span>
            <span>TURN DATA INTO DIRECTION.</span>
          </footer>
        </div>
      </main>
    </>
  );
}
