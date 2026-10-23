import patents from "../../../data/fixtures/patents.json";
import { parseApplication } from "@/lib/prioris/application";
import { chartDocuments, type ChartDocument } from "@/lib/prioris/chart";

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

const CORPUS_LIMITATION =
  "This search uses the local synthetic fixture corpus only. It is not a complete prior-art search of USPTO records, Google Patents, or non-patent literature.";

function toDocument(patent: Patent): ChartDocument {
  return {
    id: patent.id,
    title: patent.title,
    abstractText: patent.abstract,
    description: patent.description,
    claimsText: patent.claims_text,
    cpc: patent.cpc,
    familyId: patent.family_id,
    filingDate: patent.filing_date,
    publicationDate: patent.publication_date,
    published: Boolean(patent.published),
    source: "Local corpus",
    href: null,
    assignee: null,
    similarityText: `${patent.claims_text} ${patent.description}`,
  };
}

export function analyzeApplication(raw: string) {
  const parsed = parseApplication(raw);
  if (!parsed.filingDate) {
    throw new Error("Include a line 'Filing date: YYYY-MM-DD' in the application.");
  }
  if (!parsed.limitations.length) {
    throw new Error("No independent claim limitations were found.");
  }
  return chartDocuments(parsed, (patents as Patent[]).map(toDocument), {
    cutoff: parsed.filingDate,
    corpusLimitation: CORPUS_LIMITATION,
  });
}
