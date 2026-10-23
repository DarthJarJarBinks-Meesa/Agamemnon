import catalog from "../../../data/fixtures/public_fragments.json";

export const NO_APPROVED =
  "I can explain approved general concepts from the public knowledge set. I do not have additional approved material on that request.";

export const RELEASE_LIMIT =
  "This session has reached the approved release limit. You can still review the material already provided.";

const SENSITIVE = [
  /ignore (all |the )?(previous|prior|above)/i,
  /system prompt/i,
  /\bjailbreak\b/i,
  /\b(classified|secret|restricted|confidential)\b/i,
  /exact architecture/i,
  /exact design/i,
  /show me the original/i,
  /\buspto examiner\b/i,
  /\bi am an? examiner\b/i,
  /base64/i,
  /performance targets/i,
  /must look like/i,
  /prior-art search/i,
  /prior art search/i,
  /does a .{0,80}exist/i,
  /one question at a time/i,
  /break down the secret/i,
  /pretend you are/i,
  /\bi am an? authorized\b/i,
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  oxygenation: ["oxygenation", "oximetry", "blood", "wavelength", "absorption", "optical", "spo2"],
  propulsion: ["propulsion", "thruster", "thrusters", "ion", "hall", "spacecraft", "propellant", "electric"],
  wearable: ["wearable", "wrist", "fitness", "monitor", "monitors"],
  computing: ["accelerator", "accelerators", "inference", "quantization", "processor", "processors", "bandwidth"],
  microelectronics: ["transistor", "transistors", "circuit", "circuits", "semiconductor", "switch", "switches"],
};

export type Fragment = {
  id: string;
  topic: string;
  text: string;
  citation: string;
};

export type AthenaDecision = {
  status: "approved" | "no_approved_material" | "release_limit";
  bundleId: string | null;
  fragments: Fragment[];
  answer: string;
  releasedBundleIds: string[];
  sourcesLabel: string;
};

function normalize(question: string) {
  return question.replaceAll("\u0000", "").replace(/\s+/g, " ").trim().slice(0, 2000);
}

export function isSensitiveQuestion(question: string) {
  const normalized = normalize(question);
  return !normalized || SENSITIVE.some((pattern) => pattern.test(normalized));
}

function topicFor(question: string) {
  const words = new Set(question.toLowerCase().match(/[a-z0-9-]+/g) ?? []);
  const ranked = Object.entries(TOPIC_KEYWORDS)
    .map(([topic, keywords]) => ({
      topic,
      hits: keywords.filter((keyword) => words.has(keyword)).length,
    }))
    .sort((a, b) => b.hits - a.hits || a.topic.localeCompare(b.topic));
  if (!ranked.length || ranked[0].hits < 2) return null;
  return ranked[0].topic;
}

export function fixedRefusal(already: string[]): AthenaDecision {
  return {
    status: "no_approved_material",
    bundleId: null,
    fragments: [],
    answer: NO_APPROVED,
    releasedBundleIds: [...new Set(already)],
    sourcesLabel: "Approved public knowledge only",
  };
}

export function decideAthena(
  question: string,
  already: string[],
  maxBundles = 3,
  options?: { trustQuestion?: boolean },
): AthenaDecision {
  const released = new Set(already);
  const sourcesLabel = "Approved public knowledge only";
  const refuse = (status: AthenaDecision["status"], answer: string): AthenaDecision => ({
    status,
    bundleId: null,
    fragments: [],
    answer,
    releasedBundleIds: [...released],
    sourcesLabel,
  });

  const normalized = normalize(question);
  if (!options?.trustQuestion && isSensitiveQuestion(normalized)) {
    return refuse("no_approved_material", NO_APPROVED);
  }

  const topic = topicFor(normalized);
  const bundle = catalog.bundles.find((item) => item.topic === topic);
  if (!bundle) return refuse("no_approved_material", NO_APPROVED);
  if (!released.has(bundle.id) && released.size >= maxBundles) {
    return refuse("release_limit", RELEASE_LIMIT);
  }

  const byId = new Map(catalog.fragments.map((fragment) => [fragment.id, fragment]));
  const fragments = bundle.fragment_ids
    .map((id) => byId.get(id))
    .filter((fragment): fragment is Fragment => Boolean(fragment));
  released.add(bundle.id);
  return {
    status: "approved",
    bundleId: bundle.id,
    fragments,
    answer: fragments.map((fragment) => `${fragment.text}\nSource: ${fragment.citation}`).join("\n\n"),
    releasedBundleIds: [...released],
    sourcesLabel,
  };
}
