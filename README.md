# DataPilot

**Describe the data you need in plain English. Get a clean, sourced dataset.**

DataPilot turns a natural-language request into a data-collection workflow, runs it against permitted public sources, cleans and deduplicates the results, and shows every row with its provenance. Rows that get dropped are kept, with the reason.

- **Live demo:** `<YOUR_PRODUCTION_URL>`
- **Demo video:** `<YOUR_VIDEO_LINK>`

## The problem

Collecting data from the web usually means writing a one-off script per source, then cleaning, deduplicating and checking the output by hand. The result is often a spreadsheet nobody can trace back to where each row came from. DataPilot makes the workflow visible and repeatable: plan, run, inspect, re-run.

## Features

- **Prompt to plan.** An LLM (Gemini) converts a request into a structured plan: entity, fields, filters, sources and row limit. The plan is shown for review before anything runs, and you can switch individual sources off.
- **Five-step pipeline.** `collect → normalize → validate → dedupe → rank`, with live per-step status and item counts.
- **Honest filtering.** Every rejected row is stored with a reason (for example `location does not match`, `older than 30 days`, `no keyword match`, `not a software role`) and is visible in the Rejected tab.
- **Deduplication across sources.** Rows are merged on canonical URL and on title + company. The merged row keeps every source it came from.
- **Source inspector.** Click any row to see where it came from: connector, URL, fetch time and the robots/permission status.
- **Results table.** Search, source filter and column sorting.
- **Export.** CSV and JSON.
- **History and re-run.** Every run is stored. Re-running a workflow shows the change in final row count against the previous run.
- **Reliable planner.** If the LLM is unavailable (quota, outage), the app falls back to a rule-based template plan and says so on the plan page. Explicit constraints in the prompt (for example "last 30 days", "remote") are enforced in code after planning, so the plan always matches what was asked.

## How it works

```
Prompt
  │
  ▼
Planner (Gemini → JSON plan, validated with Zod;
         template fallback + code-level constraint enforcement)
  │
  ▼
Plan review page (edit sources)  ──►  Run
                                       │
        ┌──────────────────────────────┘
        ▼
  collect      call each connector (Remotive, Arbeitnow, Hacker News/Algolia)
  normalize    map each source's fields to a canonical record
  validate     required fields, URL, age, location, keywords, role sanity
  dedupe       merge on canonical URL and title+company
  rank         keyword hits + freshness + completeness
        │
        ▼
  Supabase (Postgres): workflows, runs, run steps, records,
  record–source links, rejected rows
        │
        ▼
  Run page: summary cards, results, rejected tab, inspector, export
```

**Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Supabase (Postgres), Google Gemini API, deployed on Vercel.

## Sources and the permitted-sources rule

DataPilot only collects from sources that publish a public API or feed intended for programmatic access:

| Connector | Source | Notes |
|---|---|---|
| `remotive` | Remotive public jobs API | Remote jobs. The public API returned about 16 items per query in testing, and listings are delayed. |
| `arbeitnow` | Arbeitnow job board API | Mostly European roles. Several pages are fetched and filtered locally. |
| `hn_algolia` | Hacker News search (Algolia API) | Best for news/launch prompts. Job prompts return very few rows because job posts live inside monthly comment threads. |

Rules the code follows:

- No login-only sites, no scraping of pages that forbid it.
- Requests identify themselves with a `DataPilotBot` user agent.
- Timeouts on every request; one retry on transient errors; on HTTP 403/429 the connector stops instead of retrying.
- Source terms apply. In particular, please do not run the Remotive connector more often than the provider allows.

## Running locally

```bash
git clone https://github.com/chetanprasadofficial/datapilot.git
cd datapilot
npm install
```

Create `.env.local`:

```
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-flash-latest
GEMINI_FALLBACK_MODEL=gemini-3-flash-preview
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Create the tables in your Supabase project (`<PATH_TO_SQL_SCHEMA_FILE_IF_YOU_HAVE_ONE>`), then:

```bash
npm run dev
```

Open http://localhost:3000. The service-role key must only be used server-side; never expose it to the browser.

## Try these prompts

- `Find remote software developer jobs posted in the last 30 days` (shows volume, dedupe and source badges)
- `Collect recent Hacker News posts about startups raising funding, with title, link and date`
- `Find remote or Delhi-NCR software internships posted in the last 7 days` (few or zero rows on purpose; the Rejected tab explains why each row was dropped)

## Limitations

- **Free public APIs are thin.** Volume depends on what the sources expose. Real internship postings are rare in these feeds, so internship prompts often end with 0-1 rows.
- **Remotive returns a small number of items** per request through its public API.
- **Role filtering is heuristic.** Title keywords and an exclusion list decide what counts as a software role. It can misclassify edge cases.
- **Location matching is text-based.** Rows with a blank location are rejected when a location filter is set.
- **LLM quota.** The planner uses the Gemini free tier. When the quota is exhausted, the template plan is used and the plan page says so.
- **Not yet implemented: `web_page` connector.** Extraction from arbitrary public pages (with a robots.txt check, per-page rate limiting and verification that each extracted value appears in the page text) is designed and accepted by the plan schema, but not enabled. Requests that need it are not offered in the UI.
- Serverless execution has time limits, so very large runs are out of scope.

## Roadmap

1. `web_page` connector with robots.txt enforcement and evidence-grounded extraction.
2. More API connectors (events, papers, grants).
3. Scheduled runs and change alerts on re-run.
4. Editable filters on the plan page, not just source toggles.

## Project structure

```
app/
  page.tsx              prompt box and examples
  plan/[id]/page.tsx    plan review and run button
  runs/[id]/page.tsx    live run, results, rejected rows, inspector
  history/page.tsx      past runs, re-run, row-count comparison
  api/                  plan, workflows, runs, records, rejected, export
lib/
  planner.ts            Gemini planner, template fallback, constraint enforcement
  llm.ts                Gemini client with model fallback and retries
  connectors.ts         Remotive, Arbeitnow, Hacker News connectors
  transforms.ts         normalize, validate, dedupe, rank
  executor.ts           runs the pipeline and records step status
  export.ts             CSV / JSON export
  db.ts                 Supabase client
```

## License

`<ADD LICENSE, e.g. MIT>`
