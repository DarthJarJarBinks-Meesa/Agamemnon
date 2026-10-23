import hashlib
from datetime import datetime, timezone
from sqlite3 import Connection

GENESIS = "0" * 64


def append_event(
    con: Connection,
    actor: str,
    action: str,
    detail: str,
    ts: str | None = None,
) -> str:
    stamp = ts or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    row = con.execute("SELECT hash FROM audit_events ORDER BY id DESC LIMIT 1").fetchone()
    prev = row["hash"] if row else GENESIS
    payload = f"{prev}|{actor}|{action}|{detail}|{stamp}"
    digest = hashlib.sha256(payload.encode()).hexdigest()
    con.execute(
        "INSERT INTO audit_events (ts, actor, action, detail, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?)",
        (stamp, actor, action, detail, prev, digest),
    )
    return digest


def verify_events(con: Connection) -> bool:
    prev = GENESIS
    rows = con.execute(
        "SELECT actor, action, detail, ts, prev_hash, hash FROM audit_events ORDER BY id"
    ).fetchall()
    for row in rows:
        if row["prev_hash"] != prev:
            return False
        payload = f"{prev}|{row['actor']}|{row['action']}|{row['detail']}|{row['ts']}"
        if hashlib.sha256(payload.encode()).hexdigest() != row["hash"]:
            return False
        prev = row["hash"]
    return True
