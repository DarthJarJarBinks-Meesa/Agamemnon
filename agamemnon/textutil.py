import re

STOP = frozenset(
    {
        "a",
        "an",
        "the",
        "of",
        "to",
        "and",
        "or",
        "in",
        "on",
        "for",
        "with",
        "from",
        "by",
        "at",
        "into",
        "over",
        "that",
        "this",
        "be",
        "is",
        "are",
        "was",
        "were",
        "comprising",
        "wherein",
        "configured",
        "disposed",
        "including",
        "include",
        "includes",
        "send",
        "sends",
        "sending",
        "measurements",
        "measurement",
        "remote",
        "device",
        "wearer",
        "contacting",
        "contacts",
        "contact",
        "using",
        "use",
        "used",
        "within",
        "through",
        "toward",
        "onward",
        "onwards",
        "sits",
        "sitting",
        "readings",
        "reading",
        "apparatus",
        "monitor",
        "physiological",
        "wearable",
    }
)

TOKEN_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


def tokens(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


def content_tokens(text: str) -> list[str]:
    out: list[str] = []
    for token in tokens(text):
        if token in STOP:
            continue
        if len(token) < 3 and "-" not in token:
            continue
        out.append(token)
    return out


def fts_tokens(parts: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for token in parts:
        for piece in token.split("-"):
            if piece in STOP or len(piece) < 3:
                continue
            if piece not in seen:
                seen.add(piece)
                out.append(piece)
    return out


def match_expr(parts: list[str]) -> str | None:
    cleaned = []
    for token in fts_tokens(parts):
        if re.fullmatch(r"[a-z0-9]{3,40}", token):
            cleaned.append(f'"{token}"')
    if not cleaned:
        return None
    return " OR ".join(cleaned[:32])
