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
};

export type PriorisReport = {
  title: string | null;
  filingDate: string;
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
};
