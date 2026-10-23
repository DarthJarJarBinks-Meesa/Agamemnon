import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from agamemnon.db import connect
from agamemnon.sentinel import store
from agamemnon.sentinel.decompose import content_hash, decompose
from agamemnon.sentinel.library import proposals_for
from agamemnon.sentinel.reason import MODEL_VERSION, assess

POLICY_VERSION = "sentinel-policy-v1"
MARKER = re.compile(r"CANARY-[A-Z0-9-]+")


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _summary(document_id: str, rows: list[dict]) -> dict:
    return {
        "document_id": document_id,
        "candidates": [
            {
                "id": row["id"],
                "topic": row["topic"],
                "level": row["level"],
                "status": row["status"],
                "content_hash": row["content_hash"],
            }
            for row in rows
        ],
    }


def _reject_private_text(text: str, units: list[dict]) -> None:
    if MARKER.search(text):
        raise ValueError("Refusing to publish a private marker.")
    for unit in units:
        if unit["kind"] == "parameter" and unit["text"] and unit["text"] in text:
            raise ValueError("Refusing to publish a private parameter.")


def _write_analysis(con, document: dict, abstract: str, description: str, claims: str) -> dict:
    if store.document_row(con, document["id"]):
        return _summary(document["id"], store.candidates_for(con, document["id"]))
    units = decompose(document["id"], abstract, description, claims)
    assessments = []
    for unit in units:
        payload = assess(unit, document["policy_label"])
        if payload["model_version"] != MODEL_VERSION or payload["proposed_disposition"] != "REVIEW_REQUIRED":
            raise ValueError("Candidate disposition is not reviewable.")
        assessments.append(
            {
                "id": unit["id"].replace("-u", "-a"),
                "unit_id": unit["id"],
                "payload": payload,
                "created_at": document["imported_at"],
            }
        )
    proposals = []
    for index, proposal in enumerate(proposals_for(document["title"], document["body"])):
        _reject_private_text(proposal["text"], units)
        proposals.append(
            {
                **proposal,
                "id": f"{document['id']}-c{index}",
                "content_hash": content_hash(proposal["text"]),
            }
        )
    stored = {
        **document,
        "raw_hash": hashlib.sha256(document["body"].encode()).hexdigest(),
    }
    store.insert_analysis(con, stored, units, assessments, proposals)
    store.audit(
        con,
        "sentinel",
        "analyze",
        {
            "document_id": document["id"],
            "raw_hash": stored["raw_hash"],
            "units": len(units),
            "candidates": len(proposals),
            "disposition": "REVIEW_REQUIRED",
        },
    )
    con.commit()
    return _summary(document["id"], store.candidates_for(con, document["id"]))


def analyze_record(con, record: dict) -> dict:
    document_id = record["id"].strip()
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", document_id):
        raise ValueError("Document id is not valid.")
    abstract = record.get("abstract") or ""
    description = record.get("description") or ""
    claims = record.get("claims") or ""
    body = "\n".join(part for part in (abstract, description, claims, record.get("body") or "") if part)
    document = {
        "id": document_id,
        "title": record.get("title") or document_id,
        "body": body,
        "source": record.get("source") or "local-upload",
        "policy_label": record.get("policy_label") or "unreviewed",
        "imported_at": _now(),
    }
    if record.get("body") and not (abstract or description or claims):
        description = record["body"]
    return _write_analysis(con, document, abstract, description, claims)


def analyze_corpus_document(sentinel_path: Path, corpus_path: Path, document_id: str) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", document_id):
        raise ValueError("Document id is not valid.")
    corpus = connect(corpus_path)
    try:
        row = corpus.execute("SELECT * FROM patents WHERE id = ?", (document_id,)).fetchone()
    finally:
        corpus.close()
    if row is None:
        raise ValueError("No document with that id is in the private repository.")
    policy = "restricted" if row["disclosure_tier"] == "P3" or row["canary"] else "unreviewed"
    con = store.open_sentinel(sentinel_path)
    try:
        return analyze_record(
            con,
            {
                "id": row["id"],
                "title": row["title"],
                "abstract": row["abstract"],
                "description": row["description"],
                "claims": row["claims_text"],
                "source": "local-corpus",
                "policy_label": policy,
            },
        )
    finally:
        con.close()


def analyze_upload(sentinel_path: Path, record: dict) -> dict:
    con = store.open_sentinel(sentinel_path)
    try:
        return analyze_record(con, record)
    finally:
        con.close()


def list_reviews(sentinel_path: Path) -> dict:
    con = store.open_sentinel(sentinel_path)
    try:
        return {"reviews": store.queue(con)}
    finally:
        con.close()


def review_detail(sentinel_path: Path, candidate_id: str) -> dict:
    con = store.open_sentinel(sentinel_path)
    try:
        chosen = store.candidate(con, candidate_id)
        if chosen is None:
            raise ValueError("No review with that id.")
        document = store.document_row(con, chosen["document_id"])
        return {
            "candidate": {
                "id": chosen["id"],
                "topic": chosen["topic"],
                "level": chosen["level"],
                "status": chosen["status"],
                "text": chosen["text"],
                "citation": chosen["citation"],
                "content_hash": chosen["content_hash"],
            },
            "document": {
                "id": document["id"],
                "title": document["title"],
                "policy_label": document["policy_label"],
                "source": document["source"],
            },
            "units": store.units_for(con, document["id"]),
            "assessments": store.assessments_for(con, document["id"]),
            "decision": store.latest_decision(con, candidate_id),
        }
    finally:
        con.close()


def decide(sentinel_path: Path, candidate_id: str, decision: str, reviewer: str) -> dict:
    if decision not in {"approve", "reject"}:
        raise ValueError("Candidate decision must approve or reject.")
    label = reviewer.strip()[:80] or "reviewer"
    con = store.open_sentinel(sentinel_path)
    try:
        chosen = store.candidate(con, candidate_id)
        if chosen is None:
            raise ValueError("No review with that id.")
        if chosen["status"] != "REVIEW_REQUIRED":
            raise ValueError("Candidate is not awaiting review.")
        store.record_decision(con, candidate_id, label, decision, chosen["content_hash"], POLICY_VERSION, _now())
        store.audit(
            con,
            label,
            "decision",
            {"candidate_id": candidate_id, "decision": decision, "content_hash": chosen["content_hash"]},
        )
        con.commit()
        updated = store.candidate(con, candidate_id)
        return {"id": updated["id"], "status": updated["status"], "content_hash": updated["content_hash"]}
    finally:
        con.close()


def _public_fragments(public_path: Path):
    con = connect(public_path)
    return con


def publish(sentinel_path: Path, public_path: Path, candidate_id: str) -> dict:
    con = store.open_sentinel(sentinel_path)
    public = connect(public_path)
    try:
        chosen = store.candidate(con, candidate_id)
        if chosen is None:
            raise ValueError("No review with that id.")
        decision = store.latest_decision(con, candidate_id)
        if chosen["status"] not in {"APPROVED", "REVOKED"} or decision is None or decision["decision"] != "approve":
            raise ValueError("Candidate is not approved.")
        if decision["content_hash"] != chosen["content_hash"]:
            raise ValueError("Content changed since approval.")
        units = store.units_for(con, chosen["document_id"])
        _reject_private_text(chosen["text"], units)
        existing = public.execute("SELECT id FROM fragments WHERE text = ?", (chosen["text"],)).fetchone()
        previous = store.publication(con, candidate_id)
        version = 1 if previous is None else int(previous["version"]) + 1
        if existing is not None:
            fragment_id = existing["id"]
            owned = 0
        else:
            fragment_id = f"pub-{candidate_id}-v{version}"
            owned = 1
            public.execute(
                "INSERT INTO fragments (id, topic, text, citation) VALUES (?, ?, ?, ?)",
                (fragment_id, chosen["topic"], chosen["text"], chosen["citation"]),
            )
            bundle_id = f"B-{fragment_id}"
            public.execute(
                "INSERT INTO bundles (id, topic, fragment_ids, description) VALUES (?, ?, ?, ?)",
                (bundle_id, chosen["topic"], json.dumps([fragment_id]), "Reviewer-published note"),
            )
        stamp = _now()
        store.save_publication(con, candidate_id, fragment_id, chosen["content_hash"], version, "PUBLISHED", owned, stamp)
        store.audit(
            con,
            "reviewer",
            "publish",
            {"candidate_id": candidate_id, "content_hash": chosen["content_hash"], "owned": owned, "version": version},
        )
        con.commit()
        public.commit()
        return {"id": candidate_id, "status": "PUBLISHED", "owned": bool(owned), "public_fragment_id": fragment_id}
    finally:
        con.close()
        public.close()


def revoke(sentinel_path: Path, public_path: Path, candidate_id: str) -> dict:
    con = store.open_sentinel(sentinel_path)
    public = connect(public_path)
    try:
        chosen = store.candidate(con, candidate_id)
        published = store.publication(con, candidate_id)
        if chosen is None or published is None or published["status"] != "PUBLISHED":
            raise ValueError("Candidate is not published.")
        fragment_id = published["public_fragment_id"]
        if published["owned"] and fragment_id:
            public.execute("DELETE FROM fragments WHERE id = ?", (fragment_id,))
            bundles = public.execute("SELECT id, fragment_ids FROM bundles").fetchall()
            for bundle in bundles:
                ids = json.loads(bundle["fragment_ids"])
                if fragment_id not in ids:
                    continue
                remaining = [item for item in ids if item != fragment_id]
                if remaining:
                    public.execute(
                        "UPDATE bundles SET fragment_ids = ? WHERE id = ?",
                        (json.dumps(remaining), bundle["id"]),
                    )
                else:
                    public.execute("DELETE FROM bundles WHERE id = ?", (bundle["id"],))
        store.save_publication(
            con,
            candidate_id,
            fragment_id,
            published["content_hash"],
            published["version"],
            "REVOKED",
            published["owned"],
            _now(),
        )
        store.audit(con, "reviewer", "revoke", {"candidate_id": candidate_id, "owned": published["owned"]})
        con.commit()
        public.commit()
        return {"id": candidate_id, "status": "REVOKED"}
    finally:
        con.close()
        public.close()


def audit_log(sentinel_path: Path) -> dict:
    con = store.open_sentinel(sentinel_path)
    try:
        view = store.audit_view(con)
    finally:
        con.close()
    for event in view["events"]:
        if "CANARY-" in event["detail"]:
            raise ValueError("Refusing to publish a private marker.")
    return view
