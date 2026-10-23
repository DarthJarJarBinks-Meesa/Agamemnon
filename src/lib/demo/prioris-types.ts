export type Support = { label: "explicit" | "partial" | "none"; score: number; quote: string };

export type PriorisCandidate = {
  patentId: string;
  title: string;
  filingDate: string;
  publicationDate: string | null;
  qualifiesAsPriorArt: boolean;
  eligibilityReason: string;
  supports: Support[];
  explicitCount: number;
  partialCount: number;
  anticipation: boolean;
  highPriority: boolean;
  possibleDuplicate: boolean;
  cpcMatch: boolean;
  source: string;
  href: string | null;
  assignee: string | null;
};

export type LiteratureHit = {
  id: string;
  title: string;
  authors: string;
  publication: string | null;
  publicationDate: string | null;
  href: string | null;
  qualifiesAsPriorArt: boolean;
  eligibilityReason: string;
  explicitCount: number;
  partialCount: number;
  quote: string;
};

export type BibliographicHit = {
  id: string;
  title: string;
  filingDate: string | null;
  publicationDate: string | null;
  assignee: string | null;
  href: string | null;
};

export type PriorisReport = {
  title: string | null;
  filingDate: string;
  filingDateAssumed: boolean;
  claimsParsed: number;
  limitations: { claimNumber: number; index: number; text: string }[];
  candidates: PriorisCandidate[];
  internalOverlap: PriorisCandidate[];
  anticipationReferences: string[];
  obviousnessReview: { references: string[]; note: string } | null;
  highPriority: number;
  candidateCount: number;
  corpusLimitation: string;
  disclaimer: string;
  literature: LiteratureHit[];
  bibliographic: BibliographicHit[];
  warnings: string[];
};
