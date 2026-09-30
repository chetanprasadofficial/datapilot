import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data, error } = await db.from("rejected_rows").select("id,raw,reason").eq("run_id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}
