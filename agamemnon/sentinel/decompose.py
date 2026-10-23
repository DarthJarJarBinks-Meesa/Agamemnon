import hashlib
import re


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def _sentences(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.])\s+|\n+", text)
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def _claims(text: str) -> list[str]:
    parts = re.split(r"(?:^|\n)\s*\d+\.\s+", text.strip())
    return [part.strip() for part in parts if part.strip()]


def decompose(document_id: str, abstract: str, description: str, claims: str) -> list[dict]:
    units: list[dict] = []

    def add(kind: str, text: str, span: str) -> None:
        cleaned = " ".join(text.split())
        if not cleaned:
            return
        units.append(
            {
                "id": f"{document_id}-u{len(units)}",
                "kind": kind,
                "text": cleaned,
                "span": span,
                "content_hash": content_hash(cleaned),
            }
        )

    for index, sentence in enumerate(_sentences(abstract), start=1):
        kind = "parameter" if re.search(r"\d", sentence) else "background"
        add(kind, sentence, f"abstract:{index}")
    for index, sentence in enumerate(_sentences(description), start=1):
        kind = "parameter" if re.search(r"\d", sentence) else "function"
        add(kind, sentence, f"description:{index}")
    claim_ids = []
    for index, claim in enumerate(_claims(claims), start=1):
        add("claim", claim, f"claims:{index}")
        claim_ids.append(units[-1]["id"])
    parameter_ids = [unit["id"] for unit in units if unit["kind"] == "parameter"]
    if claim_ids and parameter_ids:
        add(
            "combination",
            f"Review {claim_ids[0]} together with {parameter_ids[0]}.",
            f"{claim_ids[0]}+{parameter_ids[0]}",
        )
    return units
