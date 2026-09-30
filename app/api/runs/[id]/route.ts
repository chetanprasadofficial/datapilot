import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { data: run } = await db.from("runs").select("*").eq("id", id).single();
  if (!run) return Response.json({ error: "Run not found" }, { status: 404 });
  const { data: steps } = await db.from("run_steps").select("*").eq("run_id", id).order("position");
  const { data: workflow } = await db.from("workflows").select("id,prompt,plan").eq("id", run.workflow_id).single();
  return Response.json({ run, steps: steps ?? [], workflow });
}
