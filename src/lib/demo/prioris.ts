import patents from "../../../data/fixtures/patents.json";
import type { PriorisCandidate, PriorisReport, Support } from "./prioris-types";
import { contentTokens } from "./tokens";

type Patent = {
  id: string;
  title: string;
  abstract: string;
  description: string;
  claims_text: string;
  cpc: string;
  family_id: string;
  filing_date: string;
  publication_date: string | null;
  published: number;
  disclosure_tier: string;
};

const OBVIOUSNESS_NOTE =
  "Together these references explicitly cover every independent limitation. That flags an obviousness question for examiner review, including motivation to combine. It is not a determination of obviousness.";

const CORPUS_LIMITATION =
  "This search uses the local synthetic fixture corpus only. It is not a complete prior-art search of USPTO records, Google Patents, or non-patent literature.";

const DISCLAIMER =
  "Findings are for examiner review. This tool does not decide validity, anticipation, or obviousness.";

function field(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  return match ? match[1].trim() : null;
}

function parseApplication(text: string) {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  const title = field(normalized, /^Title:\s*(.+)$/im);
  const filingDate = field(normalized, /^Filing date:\s*(\d{4}-\d{2}-\d{2})\s*$/im);
  const familyId = field(normalized, /^Family:\s*(\S+)\s*$/im);
  const cpc = field(normalized, /^CPC:\s*(\S+)\s*$/im);
  const claimsBlob = /^Claims:\s*$/im.test(normalized)
    ? normalized.split(/^Claims:\s*$/im)[1]
    : normalized;

  const claims: { number: number; dependent: boolean }[] = [];
  const limitations: { claimNumber: number; index: number; text: string }[] = [];
  for (const chunk of claimsBlob.trim().split(/\n(?=\d+\.\s)/)) {
    const match = chunk.trim().match(/^(\d+)\.\s+([\s\S]+)/);
    if (!match) continue;
    const number = Number(match[1]);
    const body = match[2].replace(/\s+/g, " ").trim();
    const dependent = /\bof claim\s+\d+/i.test(body);
    claims.push({ number, dependent });
    if (dependent) continue;
    const comprising = /\bcomprising\b:?\s*/i.exec(body);
    const tail = comprising ? body.slice(comprising.index + comprising[0].length) : body;
    for (const raw of tail.split(";")) {
      const piece = raw
        .trim()
        .replace(/^[ .;:]+|[ .;:]+$/g, "")
        .replace(/^(and|or)\s+/i, "")
        .trim();
      if (contentTokens(piece).length >= 2) {
        limitations.push({ claimNumber: number, index: limitations.length + 1, text: piece });
      }
    }
  }
  return { title, filingDate, familyId, cpc, claimsParsed: claims.length, limitations };
}

function blobOf(patent: Patent) {
  return [patent.title, patent.abstract, patent.description, patent.claims_text].filter(Boolean).join("\n");
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

function supportFor(limitation: string, blob: string): Support {
  const needed = contentTokens(limitation);
  if (!needed.length) return { label: "none", score: 0, quote: "" };
  const haystack = blob.toLowerCase();
  const hits = needed.filter((token) => haystack.includes(token));
  const label = hits.length === needed.length ? "explicit" : hits.length * 3 >= needed.length * 2 ? "partial" : "none";
  return {
    label,
    score: Math.round((hits.length / needed.length) * 1000) / 1000,
    quote: label === "none" ? "" : quoteFor(blob, hits),
  };
}

function qualifies(patent: Patent, cutoff: string): [boolean, string] {
  if (!patent.published || !patent.publication_date) {
    return [false, "Unpublished record. Counted as technical overlap only, not statutory prior art."];
  }
  if (patent.filing_date >= cutoff) {
    return [false, "Filing date is not earlier than the application. Not treated as prior art."];
  }
  return [true, "Published, with a filing date before the application."];
}

function similarity(limitations: { text: string }[]) {
  const app = new Set(contentTokens(limitations.map((item) => item.text).join(" ")));
  const scores = new Map<string, number>();
  if (app.size < 4) return scores;
  for (const patent of patents as Patent[]) {
    const other = new Set(contentTokens(`${patent.claims_text} ${patent.description}`));
    if (!other.size) continue;
    let shared = 0;
    for (const token of app) if (other.has(token)) shared += 1;
    const union = app.size + other.size - shared;
    scores.set(patent.id, shared / union);
  }
  return scores;
}

export function analyzeApplication(raw: string): PriorisReport {
  const parsed = parseApplication(raw);
  if (!parsed.filingDate) {
    throw new Error("Include a line 'Filing date: YYYY-MM-DD' in the application.");
  }
  if (!parsed.limitations.length) {
    throw new Error("No independent claim limitations were found.");
  }

  const similarities = similarity(parsed.limitations);
  const scored: PriorisCandidate[] = [];
  for (const patent of patents as Patent[]) {
    if (parsed.familyId && patent.family_id === parsed.familyId) continue;
    if (parsed.title && patent.title.toLowerCase() === parsed.title.toLowerCase()) continue;
    const blob = blobOf(patent);
    const supports = parsed.limitations.map((limitation) => supportFor(limitation.text, blob));
    const explicitCount = supports.filter((item) => item.label === "explicit").length;
    const partialCount = supports.filter((item) => item.label === "partial").length;
    if (!explicitCount && !partialCount) continue;
    const [ok, reason] = qualifies(patent, parsed.filingDate);
    const cpcMatch = Boolean(parsed.cpc && patent.cpc.split("/")[0] === parsed.cpc.split("/")[0]);
    scored.push({
      patentId: patent.id,
      title: patent.title,
      filingDate: patent.filing_date,
      publicationDate: patent.publication_date,
      qualifiesAsPriorArt: ok,
      eligibilityReason: reason,
      supports,
      explicitCount,
      partialCount,
      anticipation: false,
      highPriority: false,
      possibleDuplicate: (similarities.get(patent.id) ?? 0) >= 0.9,
      cpcMatch,
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
    filingDate: parsed.filingDate,
    claimsParsed: parsed.claimsParsed,
    limitations: parsed.limitations,
    candidates: legal,
    internalOverlap: internal,
    anticipationReferences: anticipators,
    obviousnessReview: combination.length ? { references: combination, note: OBVIOUSNESS_NOTE } : null,
    highPriority: legal.filter((item) => item.highPriority).length,
    candidateCount: legal.length,
    corpusLimitation: CORPUS_LIMITATION,
    disclaimer: DISCLAIMER,
  };
}
