import { db } from "@/lib/db";
import { toCSV } from "@/lib/export";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "csv";
  const { data: run } = await db.from("runs").select("workflow_id").eq("id", id).single();
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
  const { data: wf } = await db.from("workflows").select("plan").eq("id", run.workflow_id).single();
  const { data } = await db
    .from("records")
    .select("data,score,grounded,record_sources(sources(connector,url,fetched_at))")
    .eq("run_id", id)
    .order("score", { ascending: false });

  const fields: string[] = (wf?.plan?.fields ?? []).map((f: any) => f.name);
  const rows = ((data ?? []) as any[]).map((r) => {
    const srcs = (r.record_sources ?? []).map((x: any) => x.sources).filter(Boolean);
    return {
      ...r.data,
      source_url: srcs.map((s: any) => s.url).join(" ; "),
      sources: Array.from(new Set(srcs.map((s: any) => s.connector))).join(", "),
      fetched_at: srcs[0]?.fetched_at ?? "",
      score: r.score,
      grounded: r.grounded,
    };
  });
  const cols = [...fields, "source_url", "sources", "fetched_at", "score", "grounded"];
  const name = `datapilot-run-${id.slice(0, 8)}.${format}`;
  const headers = { "Content-Disposition": `attachment; filename="${name}"` };
  if (format === "json") {
    return new Response(JSON.stringify(rows, null, 2), { headers: { ...headers, "Content-Type": "application/json" } });
  }
  return new Response(toCSV(cols, rows), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
}
