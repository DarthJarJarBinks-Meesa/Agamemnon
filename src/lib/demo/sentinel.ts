import catalog from "../../../data/fixtures/public_fragments.json";

const NEEDLES: Record<string, string[]> = {
  oxygenation: ["oxygenation", "oximetry", "blood", "wavelength", "optical"],
  propulsion: ["propulsion", "thruster", "thrusters", "nozzle", "propellant", "spacecraft"],
  wearable: ["wearable", "wrist", "telemetry", "fitness"],
  computing: ["accelerator", "inference", "processor", "processors", "quantization"],
  microelectronics: ["transistor", "transistors", "semiconductor", "lithography"],
};

export const SENTINEL_SAMPLE = `Electric propulsion accelerates a propellant for spacecraft.
This draft sets the coil gap to 4.2 millimeters.
Ion thrusters and Hall thrusters are the methods named in the background.`;

export type SentinelUnit = {
  id: string;
  kind: "background" | "parameter";
  withheld: boolean;
  text?: string;
  reason: string;
};

export type SentinelProposal = {
  id: string;
  topic: string;
  level: "L1" | "L2";
  text: string;
  citation: string;
  status: "REVIEW_REQUIRED";
};

export type SentinelReview = {
  disposition: "REVIEW_REQUIRED";
  units: SentinelUnit[];
  proposals: SentinelProposal[];
};

function sentences(text: string) {
  return text
    .split(/(?<=[.])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function reviewDisclosure(raw: string): SentinelReview {
  const text = raw.replaceAll("\u0000", "").replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!text) {
    throw new Error("Paste a document.");
  }

  const units = sentences(text).map((sentence, index): SentinelUnit => {
    const parameter = /\d/.test(sentence) || /canary-/i.test(sentence);
    if (parameter) {
      return {
        id: `u${index}`,
        kind: "parameter",
        withheld: true,
        reason: "A number or private marker stays in the review. It is not proposed for the public assistant.",
      };
    }
    return {
      id: `u${index}`,
      kind: "background",
      withheld: false,
      text: sentence,
      reason: "Ordinary background, still unpublished until a reviewer approves a separate public note.",
    };
  });

  const blob = text.toLowerCase();
  const proposals: SentinelProposal[] = [];
  for (const [topic, words] of Object.entries(NEEDLES)) {
    if (!words.some((word) => blob.includes(word))) continue;
    const level = topic === "computing" || topic === "microelectronics" ? "L1" : "L2";
    for (const fragment of catalog.fragments) {
      if (fragment.topic !== topic) continue;
      proposals.push({
        id: fragment.id,
        topic,
        level,
        text: fragment.text,
        citation: fragment.citation,
        status: "REVIEW_REQUIRED",
      });
    }
  }

  return { disposition: "REVIEW_REQUIRED", units, proposals };
}
