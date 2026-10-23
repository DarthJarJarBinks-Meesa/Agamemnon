import { createHash } from "node:crypto";
import type { PriorisReport } from "@/lib/demo/prioris-types";
import { parseApplication } from "@/lib/prioris/application";
import { chartDocuments, scoreLiterature } from "@/lib/prioris/chart";
import { gatherLive, sameNumber } from "./gather";

const cache = new Map<string, { at: number; report: PriorisReport }>();
const CACHE_MS = 20 * 60 * 1000;

export function liveSearchReady() {
  return Boolean(process.env.USPTO_API_KEY || process.env.PATSNAP_API_KEY);
}

export async function searchLive(raw: string): Promise<PriorisReport> {
  const key = createHash("sha256").update(`v2\n${raw}`).digest("hex");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.report;

  const parsed = parseApplication(raw);
  if (!parsed.limitations.length) {
    throw new Error("No claim limitations were found. Number the claims, or paste a short description of the invention.");
  }

  const cutoff = parsed.filingDate ?? new Date().toISOString().slice(0, 10);
  const gathered = await gatherLive(parsed.limitations, cutoff);
  const usable = gathered.patents.length + gathered.bibliographic.length + gathered.papers.length;
  if (!usable && gathered.warnings.length) {
    throw new Error("The patent indexes did not respond. Try the search again.");
  }

  const warnings = [
    ...(parsed.filingDate
      ? []
      : ["No filing date was included. Records are compared with today's date. Add a line 'Filing date: YYYY-MM-DD' to judge prior art against the application."]),
    ...gathered.warnings,
  ];
  const report = chartDocuments(parsed, gathered.patents, {
    cutoff,
    corpusLimitation: gathered.summary,
    warnings,
    loose: true,
  });
  report.literature = scoreLiterature(parsed.limitations, gathered.papers, cutoff);
  const chartIds = [...report.candidates, ...report.internalOverlap].map((item) => item.patentId);
  report.bibliographic = gathered.bibliographic.filter((item) => !chartIds.some((id) => id === item.id || sameNumber(id, item.id)));

  if (!gathered.failed) {
    cache.set(key, { at: Date.now(), report });
    if (cache.size > 30) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) cache.delete(oldest[0]);
    }
  }
  return report;
}
