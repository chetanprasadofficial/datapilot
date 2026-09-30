import type { PlanT } from "./planner";
import type { RawItem } from "./connectors";

export type Canon = {
  title?: string; company?: string; location?: string; url?: string;
  posted_at?: string; tags?: string[]; points?: number; author?: string; text?: string;
};
export type Rec = {
  data: Record<string, any>; canon: Canon; items: RawItem[];
  completeness: number; score: number; key: string;
};

const TRACKING = /^(utm_|ref$|fbclid$|gclid$)/i;
export function canonicalUrl(u?: string) {
  if (!u) return undefined;
  try {
    const x = new URL(u);
    x.hash = "";
    [...x.searchParams.keys()].forEach((k) => { if (TRACKING.test(k)) x.searchParams.delete(k); });
    let s = x.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch { return u; }
}
export function toISO(v: any): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u);

const MAPPERS: Record<string, (r: any) => Canon> = {
  remotive: (j) => ({
    title: j.title, company: j.company_name,
    location: j.candidate_required_location ? `Remote (${j.candidate_required_location})` : "Remote",
    url: j.url, posted_at: j.publication_date,
    tags: Array.isArray(j.tags) ? j.tags : [],
    text: [j.category, j.job_type].filter(Boolean).join(" "),
  }),
  arbeitnow: (j) => ({
    title: j.title, company: j.company_name,
    location: [j.remote ? "Remote" : null, j.location].filter(Boolean).join(" · "),
    url: j.url, posted_at: j.created_at,
    tags: Array.isArray(j.tags) ? j.tags : [],
    text: (j.job_types || []).join(" "),
  }),
  hn_algolia: (h) => ({
    title: h.title || h.story_title,
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    posted_at: h.created_at, points: h.points, author: h.author, tags: [],
  }),
};

// The AI may name fields differently (posted_date, link, ...). Map them to canonical keys.
const ALIASES: Record<string, string> = {
  posted_date: "posted_at", date: "posted_at", published_at: "posted_at", published: "posted_at",
  created_at: "posted_at", link: "url", source_url: "url", company_name: "company",
  organization: "company", employer: "company", job_title: "title", headline: "title",
  score: "points", upvotes: "points",
};

export function normalizeItem(item: RawItem, plan: PlanT): Rec {
  const c: Canon = { ...(MAPPERS[item.connector]?.(item.raw) ?? {}) };
  for (const k of ["title", "company", "location", "author"] as const) {
    if (typeof c[k] === "string") c[k] = (c[k] as string).trim() || undefined;
  }
  c.url = canonicalUrl(c.url);
  c.posted_at = toISO(c.posted_at);
  const data: Record<string, any> = {};
  let filled = 0;
  for (const f of plan.fields) {
    let v: any = (c as any)[ALIASES[f.name] ?? f.name];
    if (f.type === "date") v = toISO(v);
    else if (f.type === "url") v = canonicalUrl(v);
    else if (f.type === "number") v = v === undefined || v === null || v === "" ? undefined : Number(v);
    else if (f.type === "string[]") v = Array.isArray(v) ? v : v ? [String(v)] : [];
    data[f.name] = v;
    if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) filled++;
  }
  return { data, canon: c, items: [item], completeness: filled / Math.max(1, plan.fields.length), score: 0, key: "" };
}

function keywords(plan: PlanT): string[] {
  const k = plan.filters?.keywords;
  const arr = Array.isArray(k) ? k : typeof k === "string" ? k.split(/[,\s]+/) : [];
  return arr.map((x: any) => String(x).toLowerCase().trim()).filter(Boolean);
}
const haystack = (c: Canon) =>
  [c.title, c.company, (c.tags || []).join(" "), c.text].filter(Boolean).join(" ").toLowerCase();

const NCR = ["delhi", "noida", "gurgaon", "gurugram", "ghaziabad", "faridabad", "ncr"];
function locationOk(loc: string, filter: any) {
  const raw = Array.isArray(filter) ? filter.join(",") : String(filter || "");
  const toks = raw.toLowerCase().split(/[,|/]|\bor\b/).map((s) => s.trim()).filter(Boolean);
  if (!toks.length) return true;
  const l = loc.toLowerCase();
  return toks.some((t) => (t.includes("delhi") || t.includes("ncr") ? NCR.some((k) => l.includes(k)) : l.includes(t)));
}

export function validateRec(rec: Rec, plan: PlanT): string | null {
  for (const f of plan.fields) {
    const v = rec.data[f.name];
    if (f.required && (v === undefined || v === null || v === "")) return `missing ${f.name}`;
  }
  if (!isHttp(rec.canon.url)) return "invalid url";
  const maxAge = Number(plan.filters?.max_age_days);
  if (maxAge && rec.canon.posted_at) {
    const age = (Date.now() - Date.parse(rec.canon.posted_at)) / 86400000;
    if (age > maxAge) return `older than ${maxAge} days`;
  }
  if (plan.filters?.location && rec.canon.location && !locationOk(rec.canon.location, plan.filters.location))
    return "location does not match";
  const kws = keywords(plan);
  if (kws.length && !kws.some((k) => haystack(rec.canon).includes(k))) return "no keyword match";
  return null;
}

export function dedupe(recs: Rec[]) {
  const byUrl = new Map<string, number>();
  const byTc = new Map<string, number>();
  const out: Rec[] = [];
  let merged = 0;
  for (const r of recs) {
    const uk = r.canon.url ? "u:" + r.canon.url : "";
    const tk = r.canon.title && r.canon.company ? "t:" + slug(r.canon.title) + "|" + slug(r.canon.company) : "";
    let idx: number | undefined = uk ? byUrl.get(uk) : undefined;
    if (idx === undefined && tk) idx = byTc.get(tk);
    if (idx === undefined) {
      idx = out.length;
      out.push(r);
    } else {
      merged++;
      const ex = out[idx];
      const items = [...ex.items, ...r.items];
      if (r.completeness > ex.completeness) { r.items = items; out[idx] = r; } else { ex.items = items; }
    }
    if (uk) byUrl.set(uk, idx);
    if (tk) byTc.set(tk, idx);
  }
  out.forEach((r) => { r.key = r.canon.url || slug((r.canon.title || "") + "|" + (r.canon.company || "")); });
  return { unique: out, merged };
}

export function rank(recs: Rec[], plan: PlanT) {
  const kws = keywords(plan);
  const maxAge = Number(plan.filters?.max_age_days) || 30;
  for (const r of recs) {
    const hay = haystack(r.canon);
    const hits = kws.filter((k) => hay.includes(k)).length;
    let fresh = 0;
    if (r.canon.posted_at) {
      const age = (Date.now() - Date.parse(r.canon.posted_at)) / 86400000;
      fresh = Math.max(0, 1 - age / maxAge);
    }
    r.score = Math.round((hits * 2 + fresh + r.completeness) * 100) / 100;
  }
  return [...recs].sort((a, b) => b.score - a.score);
}
