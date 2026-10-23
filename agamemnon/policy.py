import re
from dataclasses import dataclass, field

NO_APPROVED = (
    "I can explain approved general concepts from the public knowledge set. "
    "I do not have additional approved material on that request."
)

RELEASE_LIMIT = (
    "This session has reached the approved release limit. "
    "You can still review the material already provided."
)

SENSITIVE_PATTERNS = (
    r"ignore (all |the )?(previous|prior|above)",
    r"system prompt",
    r"\bjailbreak\b",
    r"\b(classified|secret|restricted|confidential)\b",
    r"exact architecture",
    r"exact design",
    r"show me the original",
    r"\buspto examiner\b",
    r"\bi am an? examiner\b",
    r"base64",
    r"performance targets",
    r"must look like",
    r"prior-art search",
    r"prior art search",
    r"does a .{0,80}exist",
    r"one question at a time",
    r"break down the secret",
    r"pretend you are",
    r"\bi am an? authorized\b",
)

MIN_TOPIC_HITS = 2

TOPIC_KEYWORDS = {
    "oxygenation": (
        "oxygenation",
        "oximetry",
        "blood",
        "wavelength",
        "absorption",
        "optical",
        "spo2",
    ),
    "propulsion": (
        "propulsion",
        "thruster",
        "thrusters",
        "ion",
        "hall",
        "spacecraft",
        "propellant",
        "electric",
    ),
    "wearable": ("wearable", "wrist", "fitness", "monitor", "monitors"),
    "computing": (
        "accelerator",
        "accelerators",
        "inference",
        "quantization",
        "processor",
        "processors",
        "bandwidth",
    ),
    "microelectronics": (
        "transistor",
        "transistors",
        "circuit",
        "circuits",
        "semiconductor",
        "switch",
        "switches",
    ),
    "stationkeeping": ("station", "keeping", "orbit", "stationkeeping"),
}


@dataclass
class Decision:
    status: str
    bundle_id: str | None
    fragments: list[dict] = field(default_factory=list)
    answer: str = ""


def normalize_question(question: str) -> str:
    cleaned = question.replace("\x00", "")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:2000]


def _sensitive(question: str) -> bool:
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, question, re.I):
            return True
    return False


def _topic(question: str) -> str | None:
    words = set(re.findall(r"[a-z0-9-]+", question.lower()))
    ranked = []
    for topic, keywords in TOPIC_KEYWORDS.items():
        ranked.append((len(words & set(keywords)), topic))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    if not ranked or ranked[0][0] < MIN_TOPIC_HITS:
        return None
    return ranked[0][1]


def render_fragments(rows: list[dict]) -> str:
    blocks = [f"{row['text']}\nSource: {row['citation']}" for row in rows]
    return "\n\n".join(blocks)


def decide(
    question: str,
    catalog: dict,
    already: set[str],
    max_bundles: int = 3,
) -> tuple[Decision, set[str]]:
    normalized = normalize_question(question)
    if not normalized or _sensitive(normalized):
        return Decision("no_approved_material", None, [], NO_APPROVED), set(already)

    topic = _topic(normalized)
    bundle = next((item for item in catalog["bundles"] if item["topic"] == topic), None) if topic else None
    if bundle is None:
        return Decision("no_approved_material", None, [], NO_APPROVED), set(already)

    if bundle["id"] not in already and len(already) >= max_bundles:
        return Decision("release_limit", None, [], RELEASE_LIMIT), set(already)

    by_id = {row["id"]: row for row in catalog["fragments"]}
    chosen = [by_id[fid] for fid in bundle["fragment_ids"] if fid in by_id]
    updated = set(already) | {bundle["id"]}
    return (
        Decision("approved", bundle["id"], chosen, render_fragments(chosen)),
        updated,
    )
