import { contentTokens } from "@/lib/demo/tokens";
import type { BibliographicHit } from "@/lib/demo/prioris-types";
import type { ChartDocument } from "@/lib/prioris/chart";

const PATENT_LIMIT = 8;
const LITERATURE_LIMIT = 4;
const USPTO_LIMIT = 8;

type Limitation = { text: string };

export type PaperRecord = {
  id: string;
  title: string;
  authors: string;
  publication: string | null;
  publicationDate: string | null;
  href: string | null;
  blob: string;
};

export type Gathered = {
  patents: ChartDocument[];
  bibliographic: BibliographicHit[];
  papers: PaperRecord[];
  warnings: string[];
  summary: string;
  failed: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textOf(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function preferredField(value: unknown, field: string) {
  const rows = asArray(value).map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  const english = rows.find((row) => textOf(row.lang).toUpperCase().startsWith("EN"));
  return textOf((english ?? rows[0])?.[field]);
}

function preferredText(value: unknown) {
  return preferredField(value, "text");
}

function isoFromCompact(value: unknown) {
  const digits = textOf(value).replace(/\D/g, "");
  if (digits.length < 8) return null;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function previousDay(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function plainWord(token: string) {
  const parts = token
    .toLowerCase()
    .split("-")
    .filter((part) => part.length >= 4 && !/^\d+$/.test(part));
  parts.sort((a, b) => b.length - a.length);
  return parts[0] ?? "";
}

function queryToken(token: string) {
  const cleaned = token.replace(/[^a-z0-9-]/gi, "");
  if (cleaned.length < 3) return "";
  return cleaned.includes("-") ? `"${cleaned}"` : cleaned;
}

const GENERIC_TERMS = new Set([
  "housing",
  "sensor",
  "device",
  "transmitter",
  "signal",
  "system",
  "method",
  "apparatus",
  "data",
  "user",
  "body",
  "skin",
  "short",
  "range",
  "unit",
  "module",
  "portion",
  "member",
  "element",
  "layer",
  "surface",
  "measurement",
  "measurements",
  "remote",
  "monitor",
  "physiological",
  "contact",
  "contacting",
]);

function termGroups(limitations: Limitation[]) {
  return limitations
    .map((limitation) => {
      const tokens = [...new Set(contentTokens(limitation.text))].sort((a, b) => b.length - a.length);
      const picked: string[] = [];
      for (const token of tokens) {
        const word = plainWord(token);
        if (!word || GENERIC_TERMS.has(word) || picked.includes(word)) continue;
        picked.push(word);
        if (picked.length === 2) break;
      }
      return picked;
    })
    .filter((group) => group.length);
}

function patentQueries(limitations: Limitation[], cutoff: string) {
  const groups = termGroups(limitations).map((group) => {
    const tokens = group.map(queryToken).filter(Boolean);
    return tokens.length === 1 ? tokens[0] : `(${tokens.join(" OR ")})`;
  });
  const date = ` AND APD:[19000101 TO ${previousDay(cutoff).replaceAll("-", "")}]`;
  const queries: string[] = [];
  for (let size = groups.length; size >= 1 && queries.length < 3; size -= 1) {
    queries.push(`TA:(${groups.slice(0, size).join(" AND ")}) AND AUTHORITY:US${date}`);
  }
  return queries.filter((query) => query.length > 12).map((query) => query.slice(0, 1500));
}

function firstCpc(value: unknown) {
  const match = JSON.stringify(value ?? "").match(/[A-HY]\d{2}[A-Z][A-Z0-9]*\/[0-9]+/);
  return match?.[0] ?? "";
}

function assigneeName(parties: unknown) {
  const record = asRecord(parties);
  const assignees = asArray(record?.assignees).map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  const english = assignees.find((row) => textOf(row.lang).toUpperCase().startsWith("EN"));
  return textOf((english ?? assignees[0])?.name) || null;
}

function googlePatentHref(patentNumber: string) {
  const cleaned = patentNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned ? `https://patents.google.com/patent/${cleaned}` : null;
}

export function sameNumber(left: string, right: string) {
  const a = left.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const b = right.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  const ad = a.replace(/\D/g, "");
  const bd = b.replace(/\D/g, "");
  return ad.length >= 6 && ad === bd;
}

async function readJson(response: Response) {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function patsnap(path: string, init: RequestInit) {
  const key = process.env.PATSNAP_API_KEY;
  if (!key) throw new Error("PatSnap is not configured.");
  const response = await fetch(`https://connect.patsnap.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const payload = await readJson(response);
  const record = asRecord(payload);
  if (!response.ok || record?.status === false) {
    throw new Error(textOf(record?.error_msg) || `PatSnap returned ${response.status}.`);
  }
  return record ?? {};
}

async function usptoSearch(params: Record<string, string>) {
  const key = process.env.USPTO_API_KEY;
  if (!key) throw new Error("USPTO is not configured.");
  const response = await fetch(`https://api.uspto.gov/api/v1/patent/applications/search?${new URLSearchParams(params)}`, {
    headers: { "X-API-KEY": key, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const payload = await readJson(response);
  if (response.status === 404) return {};
  if (!response.ok) throw new Error(`USPTO returned ${response.status}.`);
  return asRecord(payload) ?? {};
}

async function searchUspto(limitations: Limitation[], cutoff: string) {
  const groups = termGroups(limitations);
  const heads = groups.map((group) => group[0]).filter(Boolean);
  const alternates = groups.map((group) => group[1] ?? group[0]).filter(Boolean);
  const queries = [...new Set([
    heads.slice(0, 3).join(" AND "),
    alternates.slice(0, 3).join(" AND "),
    heads.slice(0, 2).join(" AND "),
    alternates.includes("optical") ? "optical AND sensor" : "",
    alternates.includes("optical") ? "wearable AND optical" : "",
  ].filter((query) => query.length > 3))];
  const range = `applicationMetaData.filingDate 1900-01-01:${previousDay(cutoff)}`;
  for (const q of queries) {
    const payload = await usptoSearch({ q, limit: String(USPTO_LIMIT), rangeFilters: range });
    const bag = asArray(payload.patentFileWrapperDataBag);
    if (bag.length) return bag;
  }
  return [];
}

async function searchPatents(limitations: Limitation[], cutoff: string) {
  let total = 0;
  const seen = new Set<string>();
  const results: Record<string, unknown>[] = [];
  let batches = 0;
  for (const query of patentQueries(limitations, cutoff)) {
    const payload = await patsnap("/search/patent/query-search-patent", {
      method: "POST",
      body: JSON.stringify({
        query_text: query,
        limit: 4,
        sort: [{ field: "SCORE", order: "DESC" }],
      }),
    });
    const data = asRecord(payload.data) ?? {};
    const rows = asArray(data.results).map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
    if (!rows.length) continue;
    batches += 1;
    total += Number(data.total_search_result_count ?? rows.length);
    for (const row of rows) {
      const id = textOf(row.pn) || textOf(row.patent_id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      results.push(row);
    }
    if (batches >= 2 || results.length >= PATENT_LIMIT) break;
  }
  return { total, results: results.slice(0, PATENT_LIMIT) };
}

async function patentDetails(ids: string[]) {
  if (!ids.length) return new Map<string, { biblio: Record<string, unknown>; claims: string }>();
  const joined = encodeURIComponent(ids.join(","));
  const [biblioPayload, claimPayload] = await Promise.all([
    patsnap(`/basic-patent-data/bibliography?patent_id=${joined}`, { method: "GET" }),
    patsnap(`/basic-patent-data/claim-data?patent_id=${joined}&replace_by_related=1`, { method: "GET" }),
  ]);
  const claimsById = new Map<string, string>();
  for (const item of asArray(claimPayload.data).map(asRecord)) {
    if (!item) continue;
    const id = textOf(item.patent_id);
    claimsById.set(id, preferredField(item.claims, "claim_text").slice(0, 50000));
  }
  const details = new Map<string, { biblio: Record<string, unknown>; claims: string }>();
  for (const item of asArray(biblioPayload.data).map(asRecord)) {
    if (!item) continue;
    const id = textOf(item.patent_id);
    details.set(id, { biblio: asRecord(item.bibliographic_data) ?? {}, claims: claimsById.get(id) ?? "" });
  }
  return details;
}

function documentFromPatSnap(hit: Record<string, unknown>, detail: { biblio: Record<string, unknown>; claims: string } | undefined): ChartDocument | null {
  const pn = textOf(hit.pn);
  const patentId = textOf(hit.patent_id);
  if (!pn && !patentId) return null;
  const biblio = detail?.biblio ?? {};
  const application = asRecord(biblio.application_reference);
  const publication = asRecord(biblio.publication_reference);
  const filingDate = isoFromCompact(application?.date) ?? "";
  const publicationDate = isoFromCompact(publication?.date);
  const title = preferredText(biblio.invention_title) || pn || patentId;
  const abstractText = preferredText(biblio.abstracts).slice(0, 5000);
  const claimsText = detail?.claims ?? "";
  return {
    id: pn || patentId,
    title,
    abstractText,
    description: "",
    claimsText,
    cpc: firstCpc(biblio.classification_data),
    familyId: "",
    filingDate,
    publicationDate,
    published: Boolean(publicationDate || pn),
    source: "PatSnap",
    href: googlePatentHref(pn),
    assignee: assigneeName(biblio.parties),
    similarityText: `${claimsText} ${abstractText}`,
  };
}

function bibliographicFromUspto(item: unknown): BibliographicHit | null {
  const record = asRecord(item);
  const meta = asRecord(record?.applicationMetaData);
  if (!record || !meta) return null;
  const applicationNumber = textOf(record.applicationNumberText);
  const publicationNumber = textOf(meta.earliestPublicationNumber);
  const patentNumber = textOf(meta.patentNumber);
  const id = publicationNumber || (patentNumber ? `US${patentNumber}` : applicationNumber);
  if (!id) return null;
  const publicationDate = textOf(meta.earliestPublicationDate) || asArray(meta.publicationDateBag).map(textOf).find(Boolean) || null;
  return {
    id,
    title: textOf(meta.inventionTitle) || id,
    filingDate: textOf(meta.filingDate) || null,
    publicationDate,
    assignee: textOf(meta.firstApplicantName) || null,
    href: publicationNumber
      ? googlePatentHref(publicationNumber)
      : patentNumber
        ? googlePatentHref(`US${patentNumber}`)
        : applicationNumber
          ? `https://patentcenter.uspto.gov/applications/${applicationNumber}`
          : null,
  };
}

async function searchLiterature(limitations: Limitation[], cutoff: string) {
  const words = [...new Set(limitations.flatMap((limitation) => contentTokens(limitation.text).map(plainWord)).filter((word) => word.length >= 5))];
  words.sort((a, b) => b.length - a.length);
  if (!words.length) return [];
  const upper = new Date(`${previousDay(cutoff)}T23:59:59Z`).getTime();
  const readHits = (payload: Record<string, unknown>) => {
    const data = asRecord(payload.data) ?? {};
    return asArray(data.results).map(asRecord).filter((row): row is Record<string, unknown> => Boolean(row));
  };
  for (const text of [words.slice(0, 4).join(" "), words.slice(0, 2).join(" ")]) {
    if (!text) continue;
    try {
      const dated = await patsnap("/search/literature/query-search", {
        method: "POST",
        body: JSON.stringify({ text, type: "title/abstract", limit: LITERATURE_LIMIT, offset: 0, date_time: `[0 TO ${upper}]` }),
      });
      const hits = readHits(dated);
      if (hits.length) return hits;
    } catch {
      // A rejected date filter should not hide the undated search.
    }
    const payload = await patsnap("/search/literature/query-search", {
      method: "POST",
      body: JSON.stringify({ text, type: "title/abstract", limit: LITERATURE_LIMIT, offset: 0 }),
    });
    const hits = readHits(payload);
    if (hits.length) return hits;
  }
  return [];
}

function authorsOf(value: unknown) {
  const names = asArray(value).map(textOf).filter(Boolean);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} et al.`;
}

function titleOf(value: unknown) {
  if (typeof value === "string") return value.trim();
  const first = asArray(value)[0];
  if (typeof first === "string") return first.trim();
  return preferredText(value);
}

async function literatureDetails(ids: string[]) {
  if (!ids.length) return new Map<string, Record<string, unknown>>();
  const payload = await patsnap("/literature/bibliography", {
    method: "POST",
    body: JSON.stringify({ paper_id: ids.join(",") }),
  });
  const details = new Map<string, Record<string, unknown>>();
  for (const item of asArray(payload.data).map(asRecord)) {
    if (!item) continue;
    details.set(textOf(item.paper_id), item);
  }
  return details;
}

async function guard<T>(label: string, work: Promise<T>, fallback: T, warnings: string[]) {
  try {
    return await work;
  } catch (error) {
    console.error(label, error instanceof Error ? error.message : "request failed");
    warnings.push(`${label} did not respond. The other sources were still searched.`);
    return fallback;
  }
}

export async function gatherLive(limitations: Limitation[], cutoff: string): Promise<Gathered> {
  const warnings: string[] = [];
  const hasPatSnap = Boolean(process.env.PATSNAP_API_KEY);
  const hasUspto = Boolean(process.env.USPTO_API_KEY);
  if (!hasPatSnap) warnings.push("PatSnap is not configured, so claims and literature were not searched.");
  if (!hasUspto) warnings.push("USPTO is not configured, so US file-wrapper records were not searched.");

  const [patentSearch, usptoRecords, literatureHits] = await Promise.all([
    hasPatSnap ? guard("PatSnap patent search", searchPatents(limitations, cutoff), { total: 0, results: [] }, warnings) : Promise.resolve({ total: 0, results: [] }),
    hasUspto ? guard("USPTO search", searchUspto(limitations, cutoff), [], warnings) : Promise.resolve([]),
    hasPatSnap ? guard("Literature search", searchLiterature(limitations, cutoff), [], warnings) : Promise.resolve([]),
  ]);

  const ids = patentSearch.results.map((hit) => textOf(hit.patent_id)).filter(Boolean).slice(0, PATENT_LIMIT);
  const details = ids.length
    ? await guard("PatSnap document retrieval", patentDetails(ids), new Map(), warnings)
    : new Map<string, { biblio: Record<string, unknown>; claims: string }>();

  const patents = patentSearch.results
    .map((hit) => documentFromPatSnap(hit, details.get(textOf(hit.patent_id))))
    .filter((item): item is ChartDocument => Boolean(item))
    .filter((patent, index, list) => {
      const title = patent.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return list.findIndex((other) => other.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === title) === index;
    });

  const bibliographic = usptoRecords
    .map(bibliographicFromUspto)
    .filter((item): item is BibliographicHit => Boolean(item))
    .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);

  for (const patent of patents) {
    if (bibliographic.some((item) => sameNumber(item.id, patent.id))) {
      patent.source = "PatSnap and USPTO";
    }
  }

  const paperIds = literatureHits.map((hit) => textOf(hit.paper_id)).filter(Boolean);
  const paperDetails = paperIds.length
    ? await guard("Literature records", literatureDetails(paperIds), new Map(), warnings)
    : new Map<string, Record<string, unknown>>();

  const papers: PaperRecord[] = literatureHits.map((hit) => {
    const id = textOf(hit.paper_id);
    const detail = paperDetails.get(id);
    const title = titleOf(detail?.title) || titleOf(hit.title) || id;
    const doi = textOf(detail?.doi) || textOf(hit.doi);
    const abstractText = preferredText(detail?.abstract);
    return {
      id: doi || id,
      title,
      authors: authorsOf(detail?.author ?? hit.author),
      publication: textOf(detail?.publication) || null,
      publicationDate: isoFromCompact(detail?.publication_date),
      href: doi ? `https://doi.org/${doi}` : null,
      blob: `${title}\n${abstractText}`,
    };
  });

  const readCount = patents.filter((patent) => patent.claimsText || patent.abstractText).length;
  const summary = [
    hasPatSnap
      ? `Prioris read ${readCount} US patent documents from PatSnap and compared their titles, abstracts, and claims with the limitations.`
      : "PatSnap was not searched.",
    hasUspto ? `USPTO returned ${bibliographic.length} file-wrapper records with matching title words and an earlier filing date.` : "USPTO was not searched.",
    hasPatSnap ? `Literature search returned ${papers.length} papers.` : "",
    "Description text outside the abstract and claims was not retrieved. This is not a complete search of every publication.",
  ]
    .filter(Boolean)
    .join(" ");

  const failed = warnings.some((warning) => warning.includes("did not respond"));
  return { patents, bibliographic, papers, warnings, summary, failed };
}
