import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from agamemnon.audit import append_event
from agamemnon.claims import parse_application
from agamemnon.db import connect, create_database
from agamemnon.fixture_spec import CORPUS_LIMITATION, DISCLAIMER
from agamemnon.retrieval import patent_blob, search_patents
from agamemnon.textutil import content_tokens

OBVIOUSNESS_NOTE = (
    "Together these references explicitly cover every independent limitation. "
    "That flags an obviousness question for examiner review, including motivation to combine. "
    "It is not a determination of obviousness."
)


def support_for(limitation: str, blob: str) -> dict:
    needed = content_tokens(limitation)
    if not needed:
        return {"label": "none", "score": 0.0, "quote": ""}
    haystack = blob.lower()
    hits = [token for token in needed if token in haystack]
    if len(hits) == len(needed):
        label = "explicit"
    elif len(hits) * 3 >= len(needed) * 2:
        label = "partial"
    else:
        label = "none"
    score = len(hits) / len(needed)
    quote = _quote(blob, hits) if label != "none" else ""
    return {"label": label, "score": round(score, 3), "quote": quote}


def _quote(blob: str, hits: list[str]) -> str:
    sentences = [part.strip() for part in blob.replace("\n", " ").split(".") if part.strip()]
    best = ""
    best_count = -1
    for sentence in sentences:
        lowered = sentence.lower()
        count = sum(1 for token in hits if token in lowered)
        if count > best_count:
            best = sentence
            best_count = count
    if len(best) > 280:
        best = best[:277] + "..."
    return best


def qualifies(patent: dict, cutoff: str) -> tuple[bool, str]:
    if not patent["published"] or not patent["publication_date"]:
        return (
            False,
            "Unpublished record. Counted as technical overlap only, not statutory prior art.",
        )
    if patent["filing_date"] >= cutoff:
        return (
            False,
            "Filing date is not earlier than the application. Not treated as prior art.",
        )
    return True, "Published, with a filing date before the application."


def similarity_by_id(con, limitations: list[dict]) -> dict[str, float]:
    app_tokens = set(content_tokens(" ".join(item["text"] for item in limitations)))
    if len(app_tokens) < 4:
        return {}
    scores: dict[str, float] = {}
    for row in con.execute("SELECT id, claims_text, description FROM patents"):
        other = set(content_tokens(f"{row['claims_text']} {row['description']}"))
        if not other:
            continue
        scores[row["id"]] = len(app_tokens & other) / len(app_tokens | other)
    return scores


def exact_title_ids(con, title: str | None) -> set[str]:
    if not title:
        return set()
    rows = con.execute(
        "SELECT id FROM patents WHERE lower(title) = lower(?)",
        (title.strip(),),
    ).fetchall()
    return {row["id"] for row in rows}


def _score_hit(patent: dict, limitations: list[dict], cutoff: str, cpc: str | None) -> dict:
    blob = patent_blob(patent)
    supports = [support_for(item["text"], blob) for item in limitations]
    explicit_count = sum(1 for item in supports if item["label"] == "explicit")
    partial_count = sum(1 for item in supports if item["label"] == "partial")
    ok, reason = qualifies(patent, cutoff)
    cpc_match = bool(cpc and patent["cpc"].split("/")[0] == cpc.split("/")[0])
    return {
        "patent_id": patent["id"],
        "title": patent["title"],
        "filing_date": patent["filing_date"],
        "publication_date": patent["publication_date"],
        "family_id": patent["family_id"],
        "disclosure_tier": patent["disclosure_tier"],
        "qualifies_as_prior_art": ok,
        "eligibility_reason": reason,
        "supports": supports,
        "explicit_count": explicit_count,
        "partial_count": partial_count,
        "cpc_match": cpc_match,
        "anticipation": False,
        "high_priority": False,
        "possible_duplicate": False,
    }


def _cover(candidates: list[dict], limitation_count: int) -> tuple[list[str], list[str]]:
    covers = {
        item["patent_id"]: {
            index
            for index, support in enumerate(item["supports"])
            if support["label"] == "explicit"
        }
        for item in candidates
    }
    anticipators = [
        patent_id for patent_id, covered in sorted(covers.items()) if len(covered) == limitation_count
    ]
    for item in candidates:
        item["anticipation"] = item["patent_id"] in anticipators
    if anticipators or limitation_count == 0:
        return anticipators, []

    remaining = set(range(limitation_count))
    chosen: list[str] = []
    while remaining:
        best_id = None
        best_gain: set[int] = set()
        for patent_id, covered in sorted(covers.items()):
            gain = covered & remaining
            if len(gain) > len(best_gain):
                best_id = patent_id
                best_gain = gain
        if not best_gain or best_id is None:
            return [], []
        chosen.append(best_id)
        remaining -= best_gain
    if len(chosen) >= 2:
        return [], chosen
    return [], []


def analyze_text(
    raw: str,
    *,
    corpus_path: Path,
    jobs_path: Path,
    filename: str = "application.txt",
) -> dict:
    parsed = parse_application(raw)
    if not parsed["filing_date"]:
        raise ValueError("Include a line 'Filing date: YYYY-MM-DD' in the application.")
    if not parsed["limitations"]:
        raise ValueError("No independent claim limitations were found.")

    if not jobs_path.exists():
        create_database(jobs_path, "jobs")
    corpus = connect(corpus_path)
    jobs = connect(jobs_path)
    try:
        query_tokens: list[str] = []
        for limitation in parsed["limitations"]:
            query_tokens.extend(content_tokens(limitation["text"]))
        excluded_families = {parsed["family_id"]} if parsed["family_id"] else set()
        excluded_ids = exact_title_ids(corpus, parsed["title"])
        similarities = similarity_by_id(corpus, parsed["limitations"])
        hits = search_patents(corpus, query_tokens, limit=30)
        hits = [
            hit
            for hit in hits
            if hit["family_id"] not in excluded_families and hit["id"] not in excluded_ids
        ]

        scored = [
            _score_hit(hit, parsed["limitations"], parsed["filing_date"], parsed["cpc"])
            for hit in hits
        ]
        for item in scored:
            item["possible_duplicate"] = similarities.get(item["patent_id"], 0.0) >= 0.9
        useful = [
            item
            for item in scored
            if item["explicit_count"] or item["partial_count"]
        ]
        useful.sort(
            key=lambda item: (
                -int(item["qualifies_as_prior_art"]),
                -item["explicit_count"],
                -item["partial_count"],
                -int(item["cpc_match"]),
                item["patent_id"],
            )
        )
        legal = [item for item in useful if item["qualifies_as_prior_art"]]
        internal = [item for item in useful if not item["qualifies_as_prior_art"]]
        threshold = 1 if len(parsed["limitations"]) <= 1 else max(2, (len(parsed["limitations"]) + 1) // 2)
        for item in legal:
            item["high_priority"] = item["explicit_count"] >= threshold

        anticipators, cover = _cover(legal, len(parsed["limitations"]))
        obviousness = None
        if cover:
            obviousness = {"references": cover, "note": OBVIOUSNESS_NOTE}

        job_id = str(uuid.uuid4())
        created = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        jobs.execute(
            "INSERT INTO jobs (id, filename, raw_text, created_at) VALUES (?, ?, ?, ?)",
            (job_id, Path(filename).name, raw, created),
        )
        detail_base = {"job_id": job_id, "filename": Path(filename).name}
        append_event(
            jobs,
            "analyst",
            "intake",
            json.dumps({**detail_base, "claims_parsed": parsed["claims_parsed"]}),
        )
        append_event(
            jobs,
            "analyst",
            "retrieval",
            json.dumps({**detail_base, "candidate_ids": [item["patent_id"] for item in legal]}),
        )
        append_event(
            jobs,
            "analyst",
            "comparison",
            json.dumps(
                {
                    **detail_base,
                    "anticipation_references": anticipators,
                    "obviousness_references": cover,
                    "internal_ids": [item["patent_id"] for item in internal],
                }
            ),
        )
        head = append_event(jobs, "analyst", "report", json.dumps(detail_base))
        jobs.commit()

        return {
            "job_id": job_id,
            "title": parsed["title"],
            "filing_date": parsed["filing_date"],
            "family_id": parsed["family_id"],
            "claims_parsed": parsed["claims_parsed"],
            "limitations": parsed["limitations"],
            "candidates": legal,
            "internal_overlap": internal,
            "anticipation_references": anticipators,
            "obviousness_review": obviousness,
            "high_priority": sum(1 for item in legal if item["high_priority"]),
            "candidate_count": len(legal),
            "corpus_limitation": CORPUS_LIMITATION,
            "disclaimer": DISCLAIMER,
            "audit_head": head,
            "excluded_duplicate_ids": sorted(excluded_ids),
        }
    finally:
        corpus.close()
        jobs.close()
