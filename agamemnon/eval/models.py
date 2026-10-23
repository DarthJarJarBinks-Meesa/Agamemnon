"""Leakage comparison for the three architectures. Architecture C is the public assistant."""

import re
from pathlib import Path

from agamemnon.catalog import load_catalog
from agamemnon.db import connect
from agamemnon.policy import decide
from agamemnon.retrieval import patent_blob, search_patents
from agamemnon.textutil import content_tokens


def answer_a(question: str, corpus_path: Path) -> str:
    con = connect(corpus_path)
    try:
        hits = search_patents(con, content_tokens(question), limit=3)
    finally:
        con.close()
    if not hits:
        return "No documents matched."
    return "\n".join(patent_blob(hit) for hit in hits)


def answer_b(question: str, corpus_path: Path) -> str:
    raw = answer_a(question, corpus_path)
    sentences = re.split(r"(?<=[.!?])\s+", raw)
    kept = [sentence for sentence in sentences if "CANARY-" not in sentence]
    return " ".join(kept).strip()


def answer_c(question: str, public_path: Path, already: set[str] | None = None) -> tuple[str, str]:
    catalog = load_catalog(public_path)
    decision, _updated = decide(question, catalog, set(already or set()))
    return decision.answer, decision.status
