import { db } from "@/lib/db";
import { callGemini } from "@/lib/llm";

export async function GET() {
  const out: any = {};
  try {
    const { error } = await db.from("workflows").select("id").limit(1);
    out.supabase = error ? "ERROR: " + error.message : "ok";
  } catch (e: any) { out.supabase = "ERROR: " + e.message; }
  try {
    out.gemini = await callGemini('Return JSON {"hello":"world"}');
  } catch (e: any) { out.gemini = "ERROR: " + e.message; }
  return Response.json(out);
}
