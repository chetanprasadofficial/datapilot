import { db } from "@/lib/db";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const { data, error } = await db.from("workflows").select("*").eq("id", id).single();
    if (error) return Response.json({ error: error.message }, { status: 404 });
    return Response.json(data);
  }
  const { data, error } = await db
    .from("workflows")
    .select("id,prompt,plan,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
