import { z } from "zod";
import { callGemini } from "./llm";

export const Plan = z.object({
  goal: z.string().min(5),
  entity: z.string(),
  fields: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(["string", "url", "date", "number", "string[]"]),
        required: z.boolean(),
      })
    )
    .min(2)
    .max(12),
  filters: z.record(z.string(), z.any()),
  sources: z
    .array(
      z.object({
        connector: z.enum(["remotive", "arbeitnow", "hn_algolia", "web_page"]),
        params: z.record(z.string(), z.any()),
      })
    )
    .min(1)
    .max(4),
  steps: z
    .array(z.enum(["collect", "normalize", "validate", "dedupe", "rank"]))
    .default(["collect", "normalize", "validate", "dedupe", "rank"]),
  dedupe_keys: z.array(z.string()).default(["url"]),
  limit: z.number().min(10).max(50),
  assumptions: z.array(z.string()).optional(),
});
export type PlanT = z.infer<typeof Plan>;

export const PLANNER_V1 = `You design data-collection workflows. Convert the user's request into JSON.
Return ONLY valid JSON matching this shape. No markdown, no commentary.

{
  "goal": string,
  "entity": string (e.g. job_posting, news_post, event),
  "fields": [{"name": string, "type": "string"|"url"|"date"|"number"|"string[]", "required": boolean}],
  "filters": object (keywords: string[], location: string, max_age_days: number, min/max numbers),
  "sources": [{"connector": "remotive"|"arbeitnow"|"hn_algolia"|"web_page", "params": object}],
  "steps": ["collect","normalize","validate","dedupe","rank"],
  "dedupe_keys": ["url", "title+company"],
  "limit": number between 10 and 50,
  "assumptions": string[]
}

Available connectors (use only these):
- remotive params: {search}
- arbeitnow params: {search}
- hn_algolia params: {query, days}
- web_page params: {urls: [https URLs], instructions} (only if the user gave URLs)

Rules:
- Choose 2 to 4 sources that fit the request. Prefer APIs over web_page.
- Define "fields" the user would want as columns. Mark url as required.
- Put every constraint the user mentioned in "filters".
- Never include login-only sites or sites that forbid scraping.
- If the request is too vague, still return a best-effort plan and list what you assumed in "assumptions".`;

function templatePlan(prompt: string): PlanT {
  const p = prompt.toLowerCase();
  const kw = p.split(/\W+/).filter((w) => w.length > 3 && !/^(find|list|collect|recent|posted|last|days|weeks|from|with|that|jobs?|remote)$/.test(w)).slice(0, 4);
  const note = ["Template plan used because the AI planner was unavailable"];

  if (/funding|startup|hacker news|launch|news/.test(p)) {
    return Plan.parse({
      goal: prompt.slice(0, 140),
      entity: "news_post",
      fields: [
        { name: "title", type: "string", required: true },
        { name: "url", type: "url", required: true },
        { name: "posted_at", type: "date", required: false },
        { name: "points", type: "number", required: false },
      ],
      filters: { keywords: kw, max_age_days: 7 },
      sources: [{ connector: "hn_algolia", params: { query: kw.join(" ") || "startup funding", days: 7 } }],
      limit: 30,
      assumptions: note,
    });
  }

  return Plan.parse({
    goal: prompt.slice(0, 140),
    entity: "job_posting",
    fields: [
      { name: "title", type: "string", required: true },
      { name: "company", type: "string", required: true },
      { name: "location", type: "string", required: false },
      { name: "url", type: "url", required: true },
      { name: "posted_at", type: "date", required: false },
      { name: "tags", type: "string[]", required: false },
    ],
    filters: { keywords: kw, max_age_days: 7 },
    sources: [
      { connector: "remotive", params: { search: kw.join(" ") || "software" } },
      { connector: "arbeitnow", params: { search: kw.join(" ") || "software" } },
      { connector: "hn_algolia", params: { query: "hiring " + (kw[0] || "software"), days: 7 } },
    ],
    limit: 50,
    assumptions: note,
  });
}

export function enforce(prompt: string, plan: PlanT): PlanT {
  const p = prompt.toLowerCase();
  const filters: Record<string, any> = { ...plan.filters };
  const m = p.match(/(?:last|past|previous)\s+(\d+)\s*(day|week|month)s?/);
  if (m) {
    const n = Number(m[1]);
    filters.max_age_days = m[2] === "day" ? n : m[2] === "week" ? n * 7 : n * 30;
  }
  if (plan.entity === "job_posting" && /\bremote\b/.test(p)) {
    filters.location = /delhi|ncr|noida|gurgaon|gurugram/.test(p) ? "Remote, Delhi-NCR" : "remote";
  }
  let sources = plan.sources.map((x) =>
    x.connector === "hn_algolia" && filters.max_age_days
      ? { ...x, params: { ...x.params, days: filters.max_age_days } }
      : x
  );
  if (plan.entity === "job_posting" && !/hacker news|\bhn\b/.test(p)) {
    const apis = sources.filter((x) => x.connector !== "hn_algolia");
    if (apis.length) sources = apis;
  }
  return { ...plan, filters, sources };
}

export async function planFromPrompt(prompt: string) {
  let lastErr = "";
  let raw = "";
  for (let i = 0; i < 2; i++) {
    try {
      const input =
        PLANNER_V1 +
        "\n\nUser request: " +
        prompt +
        (lastErr ? "\n\nYour previous answer was invalid: " + lastErr + "\nFix it and return only valid JSON." : "");
      const out = await callGemini(input);
      raw = JSON.stringify(out);
      const parsed = Plan.safeParse(out);
      if (parsed.success) return { plan: enforce(prompt, parsed.data), raw, via: "llm" as const };
      lastErr = parsed.error.message.slice(0, 500);
    } catch (e: any) {
      lastErr = String(e?.message ?? e).slice(0, 300);
      break; // network or API failure: do not wait through more retries
    }
  }
  console.error("PLANNER FALLBACK:", lastErr, "| RAW:", raw.slice(0, 600));
  return { plan: enforce(prompt, templatePlan(prompt)), raw: raw || "template fallback: " + lastErr, via: "template" as const };
}
