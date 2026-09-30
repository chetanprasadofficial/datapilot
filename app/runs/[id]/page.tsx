"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const DONE = ["done", "partial", "failed", "cancelled"];
const BADGE: Record<string, string> = {
  done: "bg-green-500/20 text-green-300",
  partial: "bg-yellow-500/20 text-yellow-300",
  failed: "bg-red-500/20 text-red-300",
  running: "bg-blue-500/20 text-blue-300",
  queued: "bg-neutral-700 text-neutral-300",
  pending: "bg-neutral-800 text-neutral-500",
  cancelled: "bg-neutral-700 text-neutral-400",
};

function cell(v: any, type: string) {
  if (v === undefined || v === null || v === "") return "—";
  if (type === "url")
    return <a href={v} target="_blank" rel="noreferrer" className="text-orange-400 hover:underline" onClick={(e) => e.stopPropagation()}>link</a>;
  if (type === "date") return String(v).slice(0, 10);
  if (Array.isArray(v)) return v.slice(0, 3).join(", ");
  return String(v);
}
const srcs = (r: any) => (r.record_sources ?? []).map((x: any) => x.sources).filter(Boolean);

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [rejected, setRejected] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [srcFilter, setSrcFilter] = useState("all");
  const [tab, setTab] = useState<"results" | "rejected">("results");
  const [sel, setSel] = useState<any>(null);
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState(-1);
  const [err, setErr] = useState("");

  const finished = !!info && DONE.includes(info.run.status);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const d = await (await fetch("/api/runs/" + id)).json();
        if (stop) return;
        if (d.error) { setErr(d.error); return; }
        setInfo(d);
        if (!DONE.includes(d.run.status)) setTimeout(tick, 1500);
      } catch {
        if (!stop) setTimeout(tick, 3000);
      }
    }
    tick();
    return () => { stop = true; };
  }, [id]);

  useEffect(() => {
    if (!finished) return;
    fetch(`/api/runs/${id}/records`).then((r) => r.json()).then((d) => Array.isArray(d) && setRecords(d));
    fetch(`/api/runs/${id}/rejected`).then((r) => r.json()).then((d) => Array.isArray(d) && setRejected(d));
  }, [finished, id]);

  async function rerun() {
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId: info.run.workflow_id }),
    });
    const d = await res.json();
    if (d.runId) router.push("/runs/" + d.runId);
  }

  if (err) return <main className="p-10 text-red-400">{err}</main>;
  if (!info) return <main className="p-10 text-neutral-400">Loading run...</main>;

  const { run, steps, workflow } = info;
  const fields: any[] = workflow?.plan?.fields ?? [];
  const cols = fields.slice(0, 6);
  const stats = run.stats || {};
  const collect = steps.find((s: any) => s.name === "collect");
  const connectorInfo: any[] = collect?.detail?.connectors ?? [];
  const allSources: string[] = Array.from(new Set(records.flatMap((r) => srcs(r).map((s: any) => s.connector))));

  const shown = records
    .filter((r) => !q || JSON.stringify(r.data).toLowerCase().includes(q.toLowerCase()))
    .filter((r) => srcFilter === "all" || srcs(r).some((s: any) => s.connector === srcFilter))
    .sort((a, b) => {
      const av = sortKey === "score" ? a.score : a.data?.[sortKey];
      const bv = sortKey === "score" ? b.score : b.data?.[sortKey];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return (av > bv ? 1 : -1) * sortDir;
    });

  function sortBy(k: string) {
    if (k === sortKey) setSortDir(-sortDir);
    else { setSortKey(k); setSortDir(1); }
  }

  const card = (label: string, v: any) => (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{v ?? "—"}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← New request</a>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm tracking-widest text-orange-400">RUN</p>
            <h1 className="mt-1 text-xl font-semibold">{workflow?.plan?.goal ?? workflow?.prompt}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm ${BADGE[run.status] ?? BADGE.queued}`}>{run.status}</span>
        </div>

        {run.status === "partial" && run.error && (
          <p className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Finished with partial results. {run.error}
          </p>
        )}
        {run.status === "failed" && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            Run failed. {run.error}
          </p>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {card("Collected", stats.collected)}
          {card("Rejected", stats.rejected)}
          {card("Duplicates merged", stats.duplicates)}
          {card("Final rows", stats.final)}
        </section>

        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-neutral-500">Progress</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {steps.map((s: any) => (
              <span key={s.id} className={`rounded-lg px-3 py-2 text-sm ${BADGE[s.status] ?? BADGE.pending}`}>
                {s.name} · {s.status}
                {s.status === "done" ? ` (${s.items_in} → ${s.items_out})` : ""}
              </span>
            ))}
          </div>
          {connectorInfo.length > 0 && (
            <div className="mt-3 space-y-1 text-sm">
              {connectorInfo.map((c, i) => (
                <p key={i} className={c.status === "ok" ? "text-neutral-400" : "text-red-300"}>
                  {c.connector}: {c.status === "ok" ? `${c.items} items in ${c.ms} ms` : c.error}
                </p>
              ))}
            </div>
          )}
          {stats.reject_reasons && Object.keys(stats.reject_reasons).length > 0 && (
            <p className="mt-2 text-sm text-neutral-500">
              Rejected because: {Object.entries(stats.reject_reasons).map(([k, v]) => `${k} (${v})`).join(", ")}
            </p>
          )}
        </section>

        {finished && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setTab("results")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "results" ? "bg-neutral-800" : "text-neutral-500"}`}>
                Results ({records.length})
              </button>
              <button onClick={() => setTab("rejected")} className={`rounded-lg px-3 py-1.5 text-sm ${tab === "rejected" ? "bg-neutral-800" : "text-neutral-500"}`}>
                Rejected ({rejected.length})
              </button>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <a href={`/api/runs/${id}/export?format=csv`} className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-black">Export CSV</a>
                <a href={`/api/runs/${id}/export?format=json`} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm">Export JSON</a>
                <button onClick={rerun} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm">Re-run</button>
              </div>
            </div>

            {tab === "results" && (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search results..."
                    className="w-64 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  <select value={srcFilter} onChange={(e) => setSrcFilter(e.target.value)}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm">
                    <option value="all">All sources</option>
                    {allSources.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="self-center text-sm text-neutral-500">{shown.length} shown</span>
                </div>
                <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900 text-neutral-400">
                      <tr>
                        {cols.map((f) => (
                          <th key={f.name} onClick={() => sortBy(f.name)} className="cursor-pointer whitespace-nowrap px-3 py-2 font-medium">
                            {f.name}{sortKey === f.name ? (sortDir > 0 ? " ▲" : " ▼") : ""}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-medium">source</th>
                        <th onClick={() => sortBy("score")} className="cursor-pointer px-3 py-2 font-medium">
                          score{sortKey === "score" ? (sortDir > 0 ? " ▲" : " ▼") : ""}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => (
                        <tr key={r.id} onClick={() => setSel(r)} className="cursor-pointer border-t border-neutral-800 hover:bg-neutral-900">
                          {cols.map((f) => (
                            <td key={f.name} className="max-w-xs truncate px-3 py-2">{cell(r.data?.[f.name], f.type)}</td>
                          ))}
                          <td className="px-3 py-2">
                            {Array.from(new Set(srcs(r).map((s: any) => s.connector))).map((c: any) => (
                              <span key={c} className="mr-1 rounded bg-neutral-800 px-2 py-0.5 text-xs">{c}</span>
                            ))}
                          </td>
                          <td className="px-3 py-2">{r.score}</td>
                        </tr>
                      ))}
                      {shown.length === 0 && (
                        <tr><td colSpan={cols.length + 2} className="px-3 py-6 text-center text-neutral-500">No rows match.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === "rejected" && (
              <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-900 text-neutral-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">title</th>
                      <th className="px-3 py-2 font-medium">company</th>
                      <th className="px-3 py-2 font-medium">source</th>
                      <th className="px-3 py-2 font-medium">reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejected.map((r) => (
                      <tr key={r.id} className="border-t border-neutral-800">
                        <td className="max-w-xs truncate px-3 py-2">{r.raw?.title ?? "—"}</td>
                        <td className="px-3 py-2">{r.raw?.company ?? "—"}</td>
                        <td className="px-3 py-2">{r.raw?.source ?? "—"}</td>
                        <td className="px-3 py-2 text-yellow-300">{r.reason}</td>
                      </tr>
                    ))}
                    {rejected.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-neutral-500">Nothing was rejected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {sel && (
        <aside className="fixed inset-y-0 right-0 z-10 w-full max-w-md overflow-y-auto border-l border-neutral-800 bg-neutral-900 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm uppercase tracking-widest text-orange-400">Source inspector</h3>
            <button onClick={() => setSel(null)} className="text-neutral-400 hover:text-white">Close ✕</button>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            {fields.map((f) => (
              <div key={f.name}>
                <dt className="text-xs uppercase tracking-widest text-neutral-500">{f.name}</dt>
                <dd className="break-words">{cell(sel.data?.[f.name], f.type)}</dd>
              </div>
            ))}
          </dl>
          <h4 className="mt-6 text-xs uppercase tracking-widest text-neutral-500">Sources ({srcs(sel).length})</h4>
          <div className="mt-2 space-y-3">
            {(sel.record_sources ?? []).map((x: any, i: number) => (
              <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3 text-sm">
                <p className="font-medium">{x.sources?.connector}</p>
                <a href={x.sources?.url} target="_blank" rel="noreferrer" className="break-all text-orange-400 hover:underline">{x.sources?.url}</a>
                <p className="mt-1 text-neutral-500">Fetched: {x.sources?.fetched_at ? new Date(x.sources.fetched_at).toLocaleString() : "—"}</p>
                <p className="text-neutral-500">robots.txt: {x.sources?.robots_allowed === null || x.sources?.robots_allowed === undefined ? "not applicable (public API)" : x.sources.robots_allowed ? "allowed" : "blocked"}</p>
                {x.evidence && <p className="mt-2 text-neutral-300">Evidence: “{x.evidence}”</p>}
              </div>
            ))}
          </div>
        </aside>
      )}
    </main>
  );
}
