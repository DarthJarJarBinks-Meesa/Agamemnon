import re

from agamemnon.textutil import content_tokens


def parse_application(text: str) -> dict:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()

    def field(pattern: str) -> str | None:
        match = re.search(pattern, normalized, re.M | re.I)
        return match.group(1).strip() if match else None

    title = field(r"^Title:\s*(.+)$")
    filing = field(r"^Filing date:\s*(\d{4}-\d{2}-\d{2})\s*$")
    family = field(r"^Family:\s*(\S+)\s*$")
    cpc = field(r"^CPC:\s*(\S+)\s*$")

    if re.search(r"^Claims:\s*$", normalized, re.M | re.I):
        claims_blob = re.split(r"^Claims:\s*$", normalized, maxsplit=1, flags=re.M | re.I)[1]
    else:
        claims_blob = normalized

    claims = []
    limitations = []
    for chunk in re.split(r"\n(?=\d+\.\s)", claims_blob.strip()):
        chunk = chunk.strip()
        match = re.match(r"(\d+)\.\s+([\s\S]+)", chunk)
        if not match:
            continue
        number = int(match.group(1))
        body = " ".join(match.group(2).split())
        dependent = bool(re.search(r"\bof claim\s+\d+", body, re.I))
        lims: list[str] = []
        if not dependent:
            parts = re.split(r"\bcomprising\b:?\s*", body, maxsplit=1, flags=re.I)
            tail = parts[1] if len(parts) > 1 else body
            for piece in tail.split(";"):
                piece = re.sub(r"^(and|or)\s+", "", piece.strip(" .;:"), flags=re.I).strip()
                if len(content_tokens(piece)) >= 2:
                    lims.append(piece)
                    limitations.append({"claim_number": number, "text": piece})
        claims.append(
            {
                "number": number,
                "text": body,
                "dependent": dependent,
                "limitations": lims,
            }
        )
    for index, limitation in enumerate(limitations, start=1):
        limitation["index"] = index
    return {
        "title": title,
        "filing_date": filing,
        "family_id": family,
        "cpc": cpc,
        "claims": claims,
        "limitations": limitations,
        "claims_parsed": len(claims),
    }
