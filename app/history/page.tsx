"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BADGE: Record<string, string> = {
  done: "bg-green-500/20 text-green-300",
  partial: "bg-yellow-500/20 text-yellow-300",
  failed: "bg-red-500/20 text-red-300",
  running: "bg-blue-500/20 text-blue-300",
  queued: "bg-neutral-700 text-neutral-300",
};

export default function History() {
  const router = useRouter();
  const [runs, setRuns] = useState<any[] | null>(null);

  useEffect(() => {
    fetch("/api/runs").then((r) => r.json()).then((d) => setRuns(Array.isArray(d) ? d : []));
  }, []);

  async function rerun(workflowId: string) {
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId }),
    });
    const d = await res.json();
    if (d.runId) router.push("/runs/" + d.runId);
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <a href="/" className="text-sm text-neutral-500 hover:text-neutral-300">← New request</a>
        <p className="mt-4 text-sm tracking-widest text-orange-400">HISTORY</p>
        <h1 className="mt-1 text-2xl font-semibold">Past workflows and runs</h1>

        {!runs && <p className="mt-6 text-neutral-400">Loading...</p>}
        {runs && runs.length === 0 && <p className="mt-6 text-neutral-500">No runs yet.</p>}

        <div className="mt-6 space-y-3">
          {runs?.map((r, i) => {
            const prev = runs.slice(i + 1).find((x) => x.workflow_id === r.workflow_id);
            const cur = r.stats?.final;
            const old = prev?.stats?.final;
            const delta = typeof cur === "number" && typeof old === "number" ? cur - old : null;
            const sources = (r.workflows?.plan?.sources ?? []).map((s: any) => s.connector).join(", ");
            return (
              <div key={r.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.workflows?.plan?.goal ?? r.workflows?.prompt}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {new Date(r.created_at).toLocaleString()} · sources: {sources || "—"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm ${BADGE[r.status] ?? BADGE.queued}`}>{r.status}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                  <span>Final rows: <b className="text-neutral-100">{cur ?? "—"}</b></span>
                  <span>Collected: {r.stats?.collected ?? "—"}</span>
                  <span>Rejected: {r.stats?.rejected ?? "—"}</span>
                  {delta !== null && (
                    <span className={delta >= 0 ? "text-green-300" : "text-red-300"}>
                      {delta >= 0 ? "+" : ""}{delta} vs previous run
                    </span>
                  )}
                  <span className="ml-auto flex gap-2">
                    <a href={"/runs/" + r.id} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-100">Open</a>
                    <button onClick={() => rerun(r.workflow_id)} className="rounded-lg bg-orange-500 px-3 py-1.5 font-medium text-black">Re-run</button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
