import json
from pathlib import Path

from agamemnon.audit import append_event, verify_events
from agamemnon.db import connect, create_database


def build_sentinel(path: Path) -> None:
    con = create_database(path, "sentinel")
    con.close()


def open_sentinel(path: Path):
    if not path.exists():
        build_sentinel(path)
    return connect(path)


def document_row(con, document_id: str):
    return con.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()


def candidates_for(con, document_id: str) -> list[dict]:
    rows = con.execute(
        """
        SELECT id, document_id, level, topic, text, citation, content_hash, status
        FROM candidates WHERE document_id = ? ORDER BY id
        """,
        (document_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def candidate(con, candidate_id: str):
    row = con.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,)).fetchone()
    return dict(row) if row else None


def insert_analysis(con, document: dict, units: list[dict], assessments: list[dict], proposals: list[dict]) -> None:
    con.execute(
        """
        INSERT INTO documents (id, title, body, raw_hash, source, policy_label, imported_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            document["id"],
            document["title"],
            document["body"],
            document["raw_hash"],
            document["source"],
            document["policy_label"],
            document["imported_at"],
        ),
    )
    for unit in units:
        con.execute(
            """
            INSERT INTO units (id, document_id, kind, text, span, content_hash)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (unit["id"], document["id"], unit["kind"], unit["text"], unit["span"], unit["content_hash"]),
        )
    for item in assessments:
        con.execute(
            """
            INSERT INTO assessments (id, unit_id, payload, proposed_disposition, model_version, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["unit_id"],
                json.dumps(item["payload"]),
                item["payload"]["proposed_disposition"],
                item["payload"]["model_version"],
                item["created_at"],
            ),
        )
    for item in proposals:
        con.execute(
            """
            INSERT INTO candidates (id, document_id, level, topic, text, citation, content_hash, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'REVIEW_REQUIRED')
            """,
            (
                item["id"],
                document["id"],
                item["level"],
                item["topic"],
                item["text"],
                item["citation"],
                item["content_hash"],
            ),
        )


def record_decision(con, candidate_id: str, reviewer: str, decision: str, content_hash: str, policy_version: str, decided_at: str) -> None:
    con.execute(
        """
        INSERT INTO decisions (candidate_id, reviewer, decision, content_hash, policy_version, decided_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (candidate_id, reviewer, decision, content_hash, policy_version, decided_at),
    )
    status = "APPROVED" if decision == "approve" else "REJECTED"
    con.execute("UPDATE candidates SET status = ? WHERE id = ?", (status, candidate_id))


def latest_decision(con, candidate_id: str):
    row = con.execute(
        """
        SELECT reviewer, decision, content_hash, policy_version, decided_at
        FROM decisions WHERE candidate_id = ? ORDER BY id DESC LIMIT 1
        """,
        (candidate_id,),
    ).fetchone()
    return dict(row) if row else None


def save_publication(con, candidate_id: str, fragment_id: str | None, content_hash: str, version: int, status: str, owned: int, updated_at: str) -> None:
    con.execute(
        """
        INSERT INTO publications (candidate_id, public_fragment_id, content_hash, version, status, owned, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(candidate_id) DO UPDATE SET
            public_fragment_id = excluded.public_fragment_id,
            content_hash = excluded.content_hash,
            version = excluded.version,
            status = excluded.status,
            owned = excluded.owned,
            updated_at = excluded.updated_at
        """,
        (candidate_id, fragment_id, content_hash, version, status, owned, updated_at),
    )
    con.execute("UPDATE candidates SET status = ? WHERE id = ?", (status, candidate_id))


def publication(con, candidate_id: str):
    row = con.execute("SELECT * FROM publications WHERE candidate_id = ?", (candidate_id,)).fetchone()
    return dict(row) if row else None


def units_for(con, document_id: str) -> list[dict]:
    rows = con.execute(
        "SELECT id, kind, text, span, content_hash FROM units WHERE document_id = ? ORDER BY id",
        (document_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def assessments_for(con, document_id: str) -> list[dict]:
    rows = con.execute(
        """
        SELECT assessments.id, assessments.unit_id, assessments.payload, assessments.proposed_disposition
        FROM assessments
        JOIN units ON units.id = assessments.unit_id
        WHERE units.document_id = ?
        ORDER BY assessments.id
        """,
        (document_id,),
    ).fetchall()
    found = []
    for row in rows:
        item = dict(row)
        item["payload"] = json.loads(item["payload"])
        found.append(item)
    return found


def queue(con) -> list[dict]:
    rows = con.execute(
        """
        SELECT id, document_id, level, topic, status, content_hash
        FROM candidates ORDER BY id
        """
    ).fetchall()
    return [dict(row) for row in rows]


def audit(con, actor: str, action: str, detail: dict) -> None:
    append_event(con, actor, action, json.dumps(detail, sort_keys=True))


def audit_view(con) -> dict:
    rows = con.execute(
        "SELECT ts, actor, action, detail FROM audit_events ORDER BY id"
    ).fetchall()
    return {"intact": verify_events(con), "events": [dict(row) for row in rows]}
