import { db } from "@/lib/db";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase();
  const { data, error } = await db
    .from("records")
    .select("id,data,score,completeness,grounded,record_sources(evidence,sources(connector,url,fetched_at,robots_allowed))")
    .eq("run_id", id)
    .order("score", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  let rows = (data ?? []) as any[];
  if (q) rows = rows.filter((r) => JSON.stringify(r.data).toLowerCase().includes(q));
  return Response.json(rows);
}
