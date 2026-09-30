import { db } from "@/lib/db";
import { planFromPrompt } from "@/lib/planner";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 5) return Response.json({ error: "Prompt is too short" }, { status: 400 });

  const { plan, raw, via } = await planFromPrompt(prompt);
  const { data, error } = await db
    .from("workflows")
    .insert({ prompt, plan, plan_raw: raw })
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id, plan, via });
}
