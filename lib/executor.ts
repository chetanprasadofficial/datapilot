import { randomUUID } from "crypto";
import { db } from "./db";
import type { PlanT } from "./planner";
import { CONNECTORS, type RawItem } from "./connectors";
import { normalizeItem, validateRec, dedupe, rank } from "./transforms";

const now = () => new Date().toISOString();

async function step(runId: string, name: string, patch: Record<string, any>) {
  await db.from("run_steps").update(patch).eq("run_id", runId).eq("name", name);
}
async function insertChunks(table: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 200));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

export async function runWorkflow(runId: string, plan: PlanT) {
  const t0 = Date.now();
  try {
    await db.from("runs").update({ status: "running", started_at: now() }).eq("id", runId);

    // 1. collect (all connectors in parallel; one failing does not fail the run)
    await step(runId, "collect", { status: "running", started_at: now() });
    const settled = await Promise.allSettled(
      plan.sources.map(async (s) => {
        const fn = CONNECTORS[s.connector];
        if (!fn) throw new Error(`${s.connector} connector is not enabled yet`);
        const t = Date.now();
        const items = await fn(s.params || {});
        return { items, ms: Date.now() - t };
      })
    );
    const raw: RawItem[] = [];
    const details: any[] = [];
    let failed = 0;
    settled.forEach((r, i) => {
      const c = plan.sources[i].connector;
      if (r.status === "fulfilled") {
        raw.push(...r.value.items);
        details.push({ connector: c, status: "ok", items: r.value.items.length, ms: r.value.ms });
      } else {
        failed++;
        details.push({ connector: c, status: "failed", error: String((r.reason as any)?.message ?? r.reason).slice(0, 200) });
      }
    });
    await step(runId, "collect", {
      status: failed === plan.sources.length ? "failed" : "done",
      items_in: plan.sources.length, items_out: raw.length,
      detail: { connectors: details }, finished_at: now(),
    });

    // 2. normalize
    await step(runId, "normalize", { status: "running", started_at: now() });
    const recs = raw.map((it) => normalizeItem(it, plan));
    await step(runId, "normalize", { status: "done", items_in: raw.length, items_out: recs.length, finished_at: now() });

    // 3. validate (rejected rows are kept with reasons)
    await step(runId, "validate", { status: "running", started_at: now() });
    const valid: typeof recs = [];
    const rejected: any[] = [];
    const reasons: Record<string, number> = {};
    for (const r of recs) {
      const why = validateRec(r, plan);
      if (!why) valid.push(r);
      else {
        reasons[why] = (reasons[why] || 0) + 1;
        rejected.push({
          run_id: runId,
          raw: { source: r.items[0].connector, title: r.canon.title, company: r.canon.company,
                 location: r.canon.location, url: r.canon.url, posted_at: r.canon.posted_at },
          reason: why,
        });
      }
    }
    await step(runId, "validate", {
      status: "done", items_in: recs.length, items_out: valid.length,
      detail: { rejected: rejected.length, reasons }, finished_at: now(),
    });

    // 4. dedupe
    await step(runId, "dedupe", { status: "running", started_at: now() });
    const { unique, merged } = dedupe(valid);
    await step(runId, "dedupe", { status: "done", items_in: valid.length, items_out: unique.length, detail: { merged }, finished_at: now() });

    // 5. rank + save
    await step(runId, "rank", { status: "running", started_at: now() });
    const ranked = rank(unique, plan).slice(0, plan.limit);
    const sourceRows: any[] = [];
    const recordRows: any[] = [];
    const linkRows: any[] = [];
    for (const r of ranked) {
      const recordId = randomUUID();
      recordRows.push({ id: recordId, run_id: runId, data: r.data, dedupe_key: r.key, score: r.score, completeness: r.completeness, grounded: true });
      const seen = new Set<string>();
      for (const it of r.items) {
        const k = it.connector + "|" + it.source_url;
        if (seen.has(k)) continue;
        seen.add(k);
        const sid = randomUUID();
        sourceRows.push({ id: sid, run_id: runId, connector: it.connector, url: it.source_url, fetched_at: it.fetched_at, http_status: 200, robots_allowed: null, snippet: (it.snippet || "").slice(0, 300) });
        linkRows.push({ record_id: recordId, source_id: sid, evidence: (it.snippet || "").slice(0, 300) });
      }
    }
    await insertChunks("sources", sourceRows);
    await insertChunks("records", recordRows);
    await insertChunks("record_sources", linkRows);
    await insertChunks("rejected_rows", rejected.slice(0, 300));
    await step(runId, "rank", { status: "done", items_in: unique.length, items_out: ranked.length, finished_at: now() });

    // 6. finish
    const status = failed === plan.sources.length ? "failed" : failed > 0 ? "partial" : "done";
    await db.from("runs").update({
      status, finished_at: now(),
      error: failed ? details.filter((d) => d.status === "failed").map((d) => `${d.connector}: ${d.error}`).join(" | ") : null,
      stats: {
        collected: raw.length, normalized: recs.length, rejected: rejected.length,
        duplicates: merged, final: ranked.length, duration_ms: Date.now() - t0,
        connectors: details, reject_reasons: reasons,
      },
    }).eq("id", runId);
  } catch (e: any) {
    await db.from("runs").update({ status: "failed", error: String(e?.message ?? e).slice(0, 500), finished_at: now() }).eq("id", runId);
  }
}
