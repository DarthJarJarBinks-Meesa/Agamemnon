import { createHash } from "node:crypto";
import { contentTokens } from "@/lib/demo/tokens";

export type PublicSource = {
  id: string;
  title: string;
  snippet: string;
  source: "Wikipedia" | "PatSnap" | "USPTO";
  href: string | null;
};

const QUESTION_WORDS = new Set([
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "does",
  "did",
  "can",
  "could",
  "would",
  "explain",
  "describe",
  "tell",
  "about",
  "work",
  "works",
  "make",
  "makes",
  "major",
  "please",
]);

const cache = new Map<string, { at: number; sources: PublicSource[] }>();
const USER_AGENT = "AgamemnonAthena/1.0 (https://www.agamemnonai.org)";

function keywords(question: string) {
  const tokens = contentTokens(question).map((token) => (token.endsWith("s") && token.length > 4 ? token.slice(0, -1) : token));
  return [...new Set(tokens.filter((token) => !QUESTION_WORDS.has(token)))].sort((a, b) => b.length - a.length).slice(0, 4);
}

function clip(value: string, limit = 700) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 1)}…` : cleaned;
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function wikipedia(question: string): Promise<PublicSource | null> {
  const search = new URL("https://en.wikipedia.org/w/api.php");
  search.searchParams.set("action", "query");
  search.searchParams.set("list", "search");
  search.searchParams.set("srsearch", question);
  search.searchParams.set("srlimit", "1");
  search.searchParams.set("format", "json");
  const found = await fetch(search, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const payload = record(await readJson(found));
  const query = record(payload?.query);
  const hit = Array.isArray(query?.search) ? record(query.search[0]) : null;
  const title = text(hit?.title);
  if (!found.ok || !title) return null;

  const summary = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const page = record(await readJson(summary));
  const extract = clip(text(page?.extract));
  if (!summary.ok || extract.length < 80) return null;
  const content = record(page?.content_urls);
  const desktop = record(content?.desktop);
  return {
    id: title,
    title,
    snippet: extract,
    source: "Wikipedia",
    href: text(desktop?.page) || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

async function uspto(words: string[]): Promise<PublicSource[]> {
  const key = process.env.USPTO_API_KEY;
  if (!key || !words.length) return [];
  const params = new URLSearchParams({ q: words.slice(0, 3).join(" AND "), limit: "3" });
  const response = await fetch(`https://api.uspto.gov/api/v1/patent/applications/search?${params}`, {
    headers: { "X-API-KEY": key, Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return [];
  const payload = record(await readJson(response));
  const bag = Array.isArray(payload?.patentFileWrapperDataBag) ? payload.patentFileWrapperDataBag : [];
  return bag.flatMap((item): PublicSource[] => {
    const row = record(item);
    const meta = record(row?.applicationMetaData);
    if (!meta) return [];
    const publication = text(meta.earliestPublicationNumber);
    const patent = text(meta.patentNumber);
    const id = publication || (patent ? `US${patent}` : "");
    const title = text(meta.inventionTitle);
    if (!id || !title) return [];
    return [
      {
        id,
        title,
        snippet: clip([text(meta.firstApplicantName), text(meta.filingDate)].filter(Boolean).join(" · ")),
        source: "USPTO",
        href: `https://patents.google.com/patent/${id.replace(/[^A-Za-z0-9]/g, "")}`,
      },
    ];
  });
}

async function patsnap(words: string[]): Promise<PublicSource[]> {
  const key = process.env.PATSNAP_API_KEY;
  if (!key || !words.length) return [];
  const query = `TA:(${words.slice(0, 3).join(" AND ")}) AND AUTHORITY:US`;
  const response = await fetch("https://connect.patsnap.com/search/patent/query-search-patent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ query_text: query, limit: 3, sort: [{ field: "SCORE", order: "DESC" }] }),
    signal: AbortSignal.timeout(20000),
  });
  const payload = record(await readJson(response));
  if (!response.ok || payload?.status === false) return [];
  const data = record(payload?.data);
  const rows = Array.isArray(data?.results) ? data.results : [];
  const ids = rows
    .map((item) => text(record(item)?.pn) || text(record(item)?.patent_id))
    .filter(Boolean)
    .slice(0, 3);
  if (!ids.length) return [];
  const detail = await fetch(`https://connect.patsnap.com/basic-patent-data/bibliography?patent_id=${encodeURIComponent(ids.join(","))}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(20000),
  });
  const body = record(await readJson(detail));
  const entries = Array.isArray(body?.data) ? body.data : [];
  return entries.flatMap((item): PublicSource[] => {
    const row = record(item);
    const biblio = record(row?.bibliographic_data);
    const id = text(row?.patent_id);
    if (!biblio || !id) return [];
    const titles = biblio.invention_title;
    const titleRow = Array.isArray(titles) ? record(titles.find((entry) => text(record(entry)?.lang).toUpperCase().startsWith("EN")) ?? titles[0]) : record(titles);
    const abstracts = biblio.abstracts;
    const abstractRow = Array.isArray(abstracts)
      ? record(abstracts.find((entry) => text(record(entry)?.lang).toUpperCase().startsWith("EN")) ?? abstracts[0])
      : record(abstracts);
    const title = text(titleRow?.text) || id;
    const snippet = clip(text(abstractRow?.text));
    return [{ id, title, snippet, source: "PatSnap", href: `https://patents.google.com/patent/${id.replace(/[^A-Za-z0-9]/g, "")}` }];
  });
}

export async function answerFromPublicSources(question: string): Promise<PublicSource[]> {
  const normalized = question.replace(/\s+/g, " ").trim().slice(0, 300);
  const key = createHash("sha256").update(normalized.toLowerCase()).digest("hex");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 20 * 60 * 1000) return cached.sources;

  const words = keywords(normalized);
  const [wiki, patents, records] = await Promise.all([
    wikipedia(normalized).catch(() => null),
    patsnap(words).catch(() => []),
    uspto(words).catch(() => []),
  ]);
  const seen = new Set<string>();
  const sources = [wiki, ...patents, ...records].flatMap((item) => {
    if (!item) return [];
    const id = item.id.toLowerCase();
    if (seen.has(id)) return [];
    seen.add(id);
    return [item];
  }).slice(0, 6);

  if (sources.length) {
    cache.set(key, { at: Date.now(), sources });
    if (cache.size > 40) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
  }
  return sources;
}
