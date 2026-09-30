"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [wf, setWf] = useState<any>(null);
  const [err, setErr] = useState("");
  const [off, setOff] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/workflows?id=" + id)
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setWf(d)))
      .catch((e) => setErr(String(e)));
  }, [id]);

  if (err) return <main className="p-10 text-red-400">{err}</main>;
  if (!wf) return <main className="p-10 text-neutral-400">Loading plan...</main>;
  const p = wf.plan;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← New request</a>
        <p className="mt-6 text-sm tracking-widest text-orange-400">PLAN</p>
        <h1 className="mt-2 text-2xl font-semibold">{p.goal}</h1>
        <p className="mt-1 text-sm text-neutral-500">Entity: {p.entity} · Limit: {p.limit} rows</p>

        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-neutral-500">Fields</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.fields.map((f: any) => (
              <span key={f.name} className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-sm">
                {f.name} <span className="text-neutral-500">{f.type}{f.required ? " *" : ""}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-neutral-500">Filters</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-neutral-900 p-3 text-sm text-neutral-300">
            {JSON.stringify(p.filters, null, 2)}
          </pre>
        </section>

        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-neutral-500">Sources</h2>
          <div className="mt-2 space-y-2">
            {p.sources.map((s: any, i: number) => (
              <label key={i} className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <span>
                  <span className="font-medium">{s.connector}</span>
                  <span className="ml-2 text-sm text-neutral-500">{JSON.stringify(s.params)}</span>
                </span>
                <input type="checkbox" checked={!off[i]} onChange={() => setOff({ ...off, [i]: !off[i] })} />
              </label>
            ))}
          </div>
        </section>

        {p.assumptions?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500">Assumptions</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-neutral-400">
              {p.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
            </ul>
          </section>
        )}

        <p className="mt-8 text-xs text-neutral-500">
          Only permitted sources are used. Web pages are checked against robots.txt.
        </p>
        <button disabled className="mt-4 rounded-lg bg-orange-500 px-5 py-2.5 font-medium text-black opacity-60">
          Run (coming next)
        </button>
      </div>
    </main>
  );
}
