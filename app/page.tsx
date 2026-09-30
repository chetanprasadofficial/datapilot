"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./home.css";

const EXAMPLES = [
  "Find remote software developer jobs posted in the last 30 days",
  "Collect recent Hacker News posts about startups raising funding, with title, link and date",
  "Find remote or Delhi-NCR software internships posted in the last 7 days",
];
const CARDS = [
  ["01", "Describe", "Type what you need in plain English.", "Gemini turns your words into a structured plan."],
  ["02", "Review", "See fields, filters and sources.", "Switch any source off before you run."],
  ["03", "Run", "Watch five live pipeline steps.", "collect, normalize, validate, dedupe, rank."],
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
    if (sessionStorage.getItem("dp_splash")) { setSplash(false); return; }
    const t = setTimeout(() => { setSplash(false); sessionStorage.setItem("dp_splash", "1"); }, 3600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setPh((n) => (n + 1) % EXAMPLES.length), 3000);
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
    <main className="min-h-screen text-neutral-100">
      {splash && (
        <div className="splash" onClick={() => setSplash(false)}>
          <div className="splash-logo">
            {"DataPilot".split("").map((ch, i) => (
              <span key={i} className={i >= 4 ? "pilot" : ""} style={{ animationDelay: i * 0.09 + "s" }}>{ch}</span>
            ))}
          </div>
          <p className="splash-tag">Ask for data. Trust every row.</p>
          <div className="splash-bar"><i /></div>
          <small>tap to skip</small>
        </div>
      )}
      <div className="bgfx"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" /></div>
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="up flex items-center justify-between">
          <p className="text-sm tracking-widest text-orange-400">DATAPILOT</p>
          <a href="/history" className="text-sm text-neutral-400 hover:text-white">History →</a>
        </div>
        <h1 className="up mt-3 text-5xl font-bold leading-tight" style={{ animationDelay: ".1s" }}>
          Describe the data<br /><span className="grad">you need.</span>
        </h1>
        <p className="up mt-3 text-lg text-neutral-300" style={{ animationDelay: ".2s" }}>
          Get a clean, sourced dataset. Every row traceable, every rejection explained.
        </p>

        <div className="glass up mt-8 p-4" style={{ animationDelay: ".3s" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={"e.g. " + EXAMPLES[ph]}
            className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 p-4 text-base outline-none focus:border-orange-400"
          />
          <button
            onClick={() => go(prompt)}
            disabled={busy}
            className="btn-glow mt-3 rounded-lg bg-orange-500 px-6 py-2.5 font-semibold text-black disabled:opacity-50"
          >
            {busy ? "Planning..." : "Create plan"}
          </button>
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
        </div>

        <h2 className="up mt-10 text-sm uppercase tracking-widest text-neutral-400" style={{ animationDelay: ".4s" }}>Try an example</h2>
        <div className="mt-3 space-y-2">
          {EXAMPLES.map((ex, i) => (
            <div key={ex} className="ex glass up flex items-center gap-3 p-3" style={{ animationDelay: 0.45 + i * 0.08 + "s", borderRadius: 12 }}>
              <button onClick={() => { setPrompt(ex); go(ex); }} disabled={busy} className="flex-1 text-left text-sm text-neutral-200 disabled:opacity-50">{ex}</button>
              <button onClick={() => { navigator.clipboard.writeText(ex); setCopied(i); setTimeout(() => setCopied(-1), 1500); }} className="shrink-0 rounded-md border border-white/15 px-2.5 py-1 text-xs text-neutral-300 hover:border-orange-400">{copied === i ? "Copied" : "Copy"}</button>
            </div>
          ))}
        </div>

        <h2 className="up mt-12 text-sm uppercase tracking-widest text-neutral-400">How it works (hover a card)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {CARDS.map(([n, t, a, b], i) => (
            <div key={n} tabIndex={0} className="flip up" style={{ animationDelay: 0.6 + i * 0.1 + "s" }}>
              <div className="flip-in">
                <div className="face">
                  <span className="text-xs text-orange-400">{n}</span>
                  <span className="text-xl font-semibold">{t}</span>
                  <span className="mt-1 text-xs text-neutral-400">{a}</span>
                </div>
                <div className="face back"><span className="text-sm">{b}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
