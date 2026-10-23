import { contentTokens } from "@/lib/demo/tokens";

export type ParsedLimitation = { claimNumber: number; index: number; text: string };

export type ParsedApplication = {
  title: string | null;
  filingDate: string | null;
  familyId: string | null;
  cpc: string | null;
  claimsParsed: number;
  limitations: ParsedLimitation[];
};

function field(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  return match ? match[1].trim() : null;
}

function cleanPiece(raw: string) {
  return raw
    .trim()
    .replace(/^[ .;:]+|[ .;:]+$/g, "")
    .replace(/^(and|or)\s+/i, "")
    .trim();
}

export function parseApplication(text: string): ParsedApplication {
  const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  const title = field(normalized, /^Title:\s*(.+)$/im);
  const filingDate = field(normalized, /^Filing date:\s*(\d{4}-\d{2}-\d{2})\s*$/im);
  const familyId = field(normalized, /^Family:\s*(\S+)\s*$/im);
  const cpc = field(normalized, /^CPC:\s*(\S+)\s*$/im);
  const claimsBlob = /^Claims:\s*$/im.test(normalized)
    ? normalized.split(/^Claims:\s*$/im)[1]
    : normalized;

  const claims: { number: number; dependent: boolean }[] = [];
  const limitations: ParsedLimitation[] = [];
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
      const piece = cleanPiece(raw);
      if (contentTokens(piece).length >= 2) {
        limitations.push({ claimNumber: number, index: limitations.length + 1, text: piece });
      }
    }
  }

  if (!limitations.length) {
    const prose = normalized
      .split("\n")
      .filter((line) => !/^(Title|Filing date|Family|CPC):/i.test(line))
      .join(" ");
    for (const raw of prose.split(/[.;]/)) {
      const piece = cleanPiece(raw);
      if (contentTokens(piece).length >= 2) {
        limitations.push({ claimNumber: 1, index: limitations.length + 1, text: piece });
      }
      if (limitations.length >= 8) break;
    }
  }

  return {
    title,
    filingDate,
    familyId,
    cpc,
    claimsParsed: claims.length || (limitations.length ? 1 : 0),
    limitations: limitations.slice(0, 12),
  };
}
