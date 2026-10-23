from pathlib import Path

from agamemnon.db import connect
from agamemnon.fixture_spec import DEMO_MARKERS
from agamemnon.sentinel import store
from agamemnon.sentinel.workflow import analyze_corpus_document


def _fragment_ids(path: Path) -> list[str]:
    con = connect(path)
    try:
        return [row["id"] for row in con.execute("SELECT id FROM fragments ORDER BY id")]
    finally:
        con.close()


def probe(root: Path) -> dict:
    """Run the private reasoner without publishing. Public rows must stay put."""
    public = root / "public.db"
    before = _fragment_ids(public)
    sentinel = root / "sentinel-probe.db"
    summary = analyze_corpus_document(sentinel, root / "demo.db", "US-SEC-2001")
    con = store.open_sentinel(sentinel)
    try:
        texts = [row["text"] for row in store.candidates_for(con, "US-SEC-2001")]
        dispositions = store.assessments_for(con, "US-SEC-2001")
    finally:
        con.close()
    leaks = [marker for marker in DEMO_MARKERS if any(marker in text for text in texts)]
    return {
        "canary_leakage": len(leaks),
        "unauthorized_publish": before != _fragment_ids(public),
        "review_required": bool(dispositions)
        and all(item["proposed_disposition"] == "REVIEW_REQUIRED" for item in dispositions),
        "candidates": len(summary["candidates"]),
    }
