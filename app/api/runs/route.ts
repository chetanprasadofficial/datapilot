import { after } from "next/server";
import { db } from "@/lib/db";
import { Plan } from "@/lib/planner";
import { runWorkflow } from "@/lib/executor";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { data: wf } = await db.from("workflows").select("*").eq("id", body.workflowId).single();
  if (!wf) return Response.json({ error: "Workflow not found" }, { status: 404 });
  const parsed = Plan.safeParse(wf.plan);
  if (!parsed.success) return Response.json({ error: "Stored plan is invalid" }, { status: 400 });
  const plan = parsed.data;

  const off: number[] = Array.isArray(body.overrides?.disabledSources) ? body.overrides.disabledSources : [];
  const sources = plan.sources.filter((_, i) => !off.includes(i));
  if (!sources.length) return Response.json({ error: "Enable at least one source" }, { status: 400 });
  const limit = Math.min(50, Math.max(10, Number(body.overrides?.limit) || plan.limit));
  const effective = { ...plan, sources, limit };

  const { data: run, error } = await db
    .from("runs")
    .insert({ workflow_id: wf.id, status: "queued", stats: { overrides: body.overrides ?? {} } })
    .select("id")
    .single();
  if (error || !run) return Response.json({ error: error?.message || "Could not create run" }, { status: 500 });

  const names = ["collect", "normalize", "validate", "dedupe", "rank"];
  await db.from("run_steps").insert(names.map((name, i) => ({ run_id: run.id, name, position: i })));

  after(() => runWorkflow(run.id, effective).catch(() => {}));
  return Response.json({ runId: run.id });
}

export async function GET() {
  const { data, error } = await db
    .from("runs")
    .select("id,status,stats,created_at,finished_at,workflow_id,workflows(prompt,plan)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
