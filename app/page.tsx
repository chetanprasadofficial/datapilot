"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const EXAMPLES = [
  "Find remote or Delhi-NCR software internships posted in the last 7 days",
  "Collect recent Hacker News posts about startups raising funding, with title, link and date",
  "From this page (a public hackathon listing that allows crawling), list upcoming hackathons in India with dates and prizes",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

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
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center justify-between"><p className="text-sm tracking-widest text-orange-400">DATAPILOT</p><a href="/history" className="text-sm text-neutral-400 hover:text-white">History →</a></div>
        <h1 className="mt-3 text-4xl font-semibold">Describe the data you need.</h1>
        <p className="mt-2 text-lg text-neutral-400">Get a clean, sourced dataset.</p>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Find remote software internships posted in the last 7 days"
          className="mt-8 h-32 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-base outline-none focus:border-orange-400"
        />
        <button
          onClick={() => go(prompt)}
          disabled={busy}
          className="mt-3 rounded-lg bg-orange-500 px-5 py-2.5 font-medium text-black disabled:opacity-50"
        >
          {busy ? "Planning..." : "Create plan"}
        </button>
        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

        <h2 className="mt-12 text-sm uppercase tracking-widest text-neutral-500">Try an example</h2>
        <div className="mt-3 space-y-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setPrompt(ex); go(ex); }}
              disabled={busy}
              className="block w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-left text-sm text-neutral-300 hover:border-orange-400 disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
