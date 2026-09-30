export type RawItem = {
  connector: string;
  raw: any;
  source_url: string;
  fetched_at: string;
  snippet?: string;
};

const UA = "DataPilotBot/1.0 (+https://github.com/chetanprasadofficial/datapilot)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      const host = new URL(url).host;
      if (res.status === 429 || res.status === 403)
        throw new Error(`HTTP ${res.status} from ${host} (rate limited or blocked)`);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${host}`);
      return await res.json();
    } catch (e: any) {
      lastErr = e;
      if (/HTTP (403|429)/.test(String(e?.message))) break; // do not hammer the source
      await sleep(600);
    }
  }
  throw new Error(String(lastErr?.message ?? lastErr));
}

async function remotive(params: any): Promise<RawItem[]> {
  const url =
    "https://remotive.com/api/remote-jobs?limit=50&search=" + encodeURIComponent(params.search || "");
  const data = await fetchJson(url);
  return (data.jobs || []).slice(0, 50).map((j: any) => ({
    connector: "remotive",
    raw: j,
    source_url: j.url,
    fetched_at: new Date().toISOString(),
    snippet: j.title,
  }));
}

async function arbeitnow(params: any): Promise<RawItem[]> {
  const data = await fetchJson("https://www.arbeitnow.com/api/job-board-api");
  const terms = String(params.search || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  return (data.data || [])
    .filter((j: any) => {
      if (!terms.length) return true;
      const t = `${j.title} ${(j.tags || []).join(" ")} ${j.description || ""}`.toLowerCase();
      return terms.some((x) => t.includes(x));
    })
    .slice(0, 50)
    .map((j: any) => ({
      connector: "arbeitnow",
      raw: j,
      source_url: j.url,
      fetched_at: new Date().toISOString(),
      snippet: j.title,
    }));
}

async function hn_algolia(params: any): Promise<RawItem[]> {
  const days = Number(params.days) || 7;
  const since = Math.floor(Date.now() / 1000) - days * 86400;
  const url =
    "https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=40" +
    "&query=" + encodeURIComponent(params.query || "") +
    "&numericFilters=" + encodeURIComponent("created_at_i>" + since);
  const data = await fetchJson(url);
  return (data.hits || []).map((h: any) => ({
    connector: "hn_algolia",
    raw: h,
    source_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    fetched_at: new Date().toISOString(),
    snippet: h.title,
  }));
}

export const CONNECTORS: Record<string, (params: any) => Promise<RawItem[]>> = {
  remotive,
  arbeitnow,
  hn_algolia,
};
