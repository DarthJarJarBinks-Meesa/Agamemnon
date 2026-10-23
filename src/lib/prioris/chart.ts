import type { LiteratureHit, PriorisCandidate, PriorisReport, Support } from "@/lib/demo/prioris-types";
import { contentTokens } from "@/lib/demo/tokens";
import type { ParsedApplication } from "./application";

const OBVIOUSNESS_NOTE =
  "Together these references explicitly cover every independent limitation. That flags an obviousness question for examiner review, including motivation to combine. It is not a determination of obviousness.";

const DISCLAIMER =
  "Findings are for examiner review. This tool does not decide validity, anticipation, or obviousness.";

export type ChartDocument = {
  id: string;
  title: string;
  abstractText: string;
  description: string;
  claimsText: string;
  cpc: string;
  familyId: string;
  filingDate: string;
  publicationDate: string | null;
  published: boolean;
  source: string;
  href: string | null;
  assignee: string | null;
  similarityText: string;
};

function blobOf(document: ChartDocument) {
  return [document.title, document.abstractText, document.description, document.claimsText].filter(Boolean).join("\n");
}

function quoteFor(blob: string, hits: string[]) {
  const sentences = blob.replaceAll("\n", " ").split(".").map((part) => part.trim()).filter(Boolean);
  let best = "";
  let bestCount = -1;
  for (const sentence of sentences) {
    const lowered = sentence.toLowerCase();
    const count = hits.filter((token) => lowered.includes(token)).length;
    if (count > bestCount) {
      best = sentence;
      bestCount = count;
    }
  }
  return best.length > 280 ? `${best.slice(0, 277)}...` : best;
}

const LOOSE_GENERIC = new Set([
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
  "measurement",
  "measurements",
  "remote",
  "monitor",
  "physiological",
]);

function tokenHits(token: string, haystack: string) {
  if (haystack.includes(token)) return true;
  const parts = token.split("-").filter((part) => part.length >= 4);
  return parts.length > 1 && parts.every((part) => haystack.includes(part));
}

export function supportFor(limitation: string, blob: string, loose = false): Support {
  const needed = contentTokens(limitation).filter((token) => !loose || !LOOSE_GENERIC.has(token));
  if (!needed.length) return { label: "none", score: 0, quote: "" };
  const haystack = blob.toLowerCase();
  const hits = needed.filter((token) => (loose ? tokenHits(token, haystack) : haystack.includes(token)));
  const label = hits.length === needed.length
    ? "explicit"
    : loose
      ? hits.length * 2 >= needed.length && hits.length > 0
        ? "partial"
        : "none"
      : hits.length * 3 >= needed.length * 2
        ? "partial"
        : "none";
  return {
    label,
    score: Math.round((hits.length / needed.length) * 1000) / 1000,
    quote: label === "none" ? "" : quoteFor(blob, hits.flatMap((token) => token.split("-"))),
  };
}

function qualifies(document: ChartDocument, cutoff: string): [boolean, string] {
  if (!document.published || !document.publicationDate) {
    return [false, "Unpublished record. Counted as technical overlap only, not statutory prior art."];
  }
  if (!document.filingDate) {
    return [false, "No filing date was returned, so this record was not treated as statutory prior art."];
  }
  if (document.filingDate >= cutoff) {
    return [false, "Filing date is not earlier than the application. Not treated as prior art."];
  }
  if (document.publicationDate >= cutoff) {
    return [
      true,
      "Published, with a filing date before the application. The publication date is later, so review it as earlier-filed art that published afterward.",
    ];
  }
  return [true, "Published, with a filing date before the application."];
}

function similarity(limitations: { text: string }[], documents: ChartDocument[]) {
  const app = new Set(contentTokens(limitations.map((item) => item.text).join(" ")));
  const scores = new Map<string, number>();
  if (app.size < 4) return scores;
  for (const document of documents) {
    const other = new Set(contentTokens(document.similarityText));
    if (!other.size) continue;
    let shared = 0;
    for (const token of app) if (other.has(token)) shared += 1;
    const union = app.size + other.size - shared;
    scores.set(document.id, shared / union);
  }
  return scores;
}

export function chartDocuments(
  parsed: ParsedApplication,
  documents: ChartDocument[],
  options: { cutoff: string; corpusLimitation: string; warnings?: string[]; loose?: boolean },
): PriorisReport {
  const similarities = similarity(parsed.limitations, documents);
  const scored: PriorisCandidate[] = [];
  for (const document of documents) {
    if (parsed.familyId && document.familyId === parsed.familyId) continue;
    if (parsed.title && document.title.toLowerCase() === parsed.title.toLowerCase()) continue;
    const blob = blobOf(document);
    const supports = parsed.limitations.map((limitation) => supportFor(limitation.text, blob, options.loose));
    const explicitCount = supports.filter((item) => item.label === "explicit").length;
    const partialCount = supports.filter((item) => item.label === "partial").length;
    if (!explicitCount && !partialCount) continue;
    const [ok, reason] = qualifies(document, options.cutoff);
    const cpcMatch = Boolean(parsed.cpc && document.cpc.split("/")[0] === parsed.cpc.split("/")[0]);
    scored.push({
      patentId: document.id,
      title: document.title,
      filingDate: document.filingDate,
      publicationDate: document.publicationDate,
      qualifiesAsPriorArt: ok,
      eligibilityReason: reason,
      supports,
      explicitCount,
      partialCount,
      anticipation: false,
      highPriority: false,
      possibleDuplicate: (similarities.get(document.id) ?? 0) >= 0.9,
      cpcMatch,
      source: document.source,
      href: document.href,
      assignee: document.assignee,
    });
  }

  scored.sort((a, b) => {
    if (Number(b.qualifiesAsPriorArt) !== Number(a.qualifiesAsPriorArt)) {
      return Number(b.qualifiesAsPriorArt) - Number(a.qualifiesAsPriorArt);
    }
    if (b.explicitCount !== a.explicitCount) return b.explicitCount - a.explicitCount;
    if (b.partialCount !== a.partialCount) return b.partialCount - a.partialCount;
    if (Number(b.cpcMatch) !== Number(a.cpcMatch)) return Number(b.cpcMatch) - Number(a.cpcMatch);
    return a.patentId.localeCompare(b.patentId);
  });

  const legal = scored.filter((item) => item.qualifiesAsPriorArt);
  const internal = scored.filter((item) => !item.qualifiesAsPriorArt);
  const count = parsed.limitations.length;
  const threshold = count <= 1 ? 1 : Math.max(2, Math.floor((count + 1) / 2));
  for (const item of legal) item.highPriority = item.explicitCount >= threshold;

  const covers = new Map(legal.map((item) => [
    item.patentId,
    new Set(item.supports.map((support, index) => (support.label === "explicit" ? index : -1)).filter((index) => index >= 0)),
  ]));
  const anticipators = [...covers.entries()]
    .filter(([, covered]) => covered.size === count)
    .map(([id]) => id)
    .sort();
  for (const item of legal) item.anticipation = anticipators.includes(item.patentId);

  let combination: string[] = [];
  if (!anticipators.length && count > 0) {
    const remaining = new Set(parsed.limitations.map((_, index) => index));
    const chosen: string[] = [];
    let stalled = false;
    while (remaining.size) {
      let bestId: string | null = null;
      let bestGain: number[] = [];
      for (const id of [...covers.keys()].sort()) {
        const gain = [...(covers.get(id) ?? [])].filter((index) => remaining.has(index));
        if (gain.length > bestGain.length) {
          bestId = id;
          bestGain = gain;
        }
      }
      if (!bestId || !bestGain.length) {
        stalled = true;
        break;
      }
      chosen.push(bestId);
      for (const index of bestGain) remaining.delete(index);
    }
    if (!stalled && chosen.length >= 2) combination = chosen;
  }

  return {
    title: parsed.title,
    filingDate: parsed.filingDate ?? options.cutoff,
    filingDateAssumed: !parsed.filingDate,
    claimsParsed: parsed.claimsParsed,
    limitations: parsed.limitations,
    candidates: legal,
    internalOverlap: internal,
    anticipationReferences: anticipators,
    obviousnessReview: combination.length ? { references: combination, note: OBVIOUSNESS_NOTE } : null,
    highPriority: legal.filter((item) => item.highPriority).length,
    candidateCount: legal.length,
    corpusLimitation: options.corpusLimitation,
    disclaimer: DISCLAIMER,
    literature: [],
    bibliographic: [],
    warnings: options.warnings ?? [],
  };
}

export function scoreLiterature(
  limitations: { text: string }[],
  papers: {
    id: string;
    title: string;
    authors: string;
    publication: string | null;
    publicationDate: string | null;
    href: string | null;
    blob: string;
  }[],
  cutoff: string,
): LiteratureHit[] {
  const hits: LiteratureHit[] = [];
  for (const paper of papers) {
    const supports = limitations.map((limitation) => supportFor(limitation.text, paper.blob, true));
    const explicitCount = supports.filter((item) => item.label === "explicit").length;
    const partialCount = supports.filter((item) => item.label === "partial").length;
    if (!explicitCount && !partialCount) continue;
    const quote = supports.find((item) => item.quote)?.quote ?? "";
    let qualifiesAsPriorArt = false;
    let eligibilityReason = "No publication date was returned. Check the date before treating this paper as prior art.";
    if (paper.publicationDate && paper.publicationDate < cutoff) {
      qualifiesAsPriorArt = true;
      eligibilityReason = "Published before the filing date.";
    } else if (paper.publicationDate) {
      eligibilityReason = "Published on or after the filing date. Not treated as prior art.";
    }
    hits.push({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      publication: paper.publication,
      publicationDate: paper.publicationDate,
      href: paper.href,
      qualifiesAsPriorArt,
      eligibilityReason,
      explicitCount,
      partialCount,
      quote,
    });
  }
  hits.sort((a, b) => {
    if (Number(b.qualifiesAsPriorArt) !== Number(a.qualifiesAsPriorArt)) {
      return Number(b.qualifiesAsPriorArt) - Number(a.qualifiesAsPriorArt);
    }
    if (b.explicitCount !== a.explicitCount) return b.explicitCount - a.explicitCount;
    return b.partialCount - a.partialCount;
  });
  return hits;
}
