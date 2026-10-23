import hashlib
import json
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agamemnon.audit import append_event
from agamemnon.db import connect
from agamemnon.paths import STATIC
from agamemnon.catalog import load_catalog
from agamemnon.policy import decide


class AskRequest(BaseModel):
    question: str
    session_id: str = "anonymous"


class SessionLedger:
    def __init__(self) -> None:
        self._data: dict[str, set[str]] = {}
        self._lock = threading.Lock()

    def snapshot(self, session_id: str) -> set[str]:
        with self._lock:
            return set(self._data.get(session_id, set()))

    def store(self, session_id: str, bundles: set[str]) -> None:
        with self._lock:
            self._data[session_id] = set(bundles)


def create_app(public_db: Path) -> FastAPI:
    app = FastAPI(title="SecurePatent public assistant")
    ledger = SessionLedger()

    @app.get("/")
    def index():
        return FileResponse(STATIC / "index.html")

    @app.get("/static/public.css")
    def css():
        return FileResponse(STATIC / "public.css")

    @app.post("/api/ask")
    def ask(body: AskRequest):
        already = ledger.snapshot(body.session_id)
        catalog = load_catalog(public_db)
        decision, updated = decide(body.question, catalog, already)
        ledger.store(body.session_id, updated)
        detail = json.dumps(
            {
                "question_sha256": hashlib.sha256(body.question.encode()).hexdigest(),
                "status": decision.status,
                "bundle_id": decision.bundle_id,
            }
        )
        con = connect(public_db)
        try:
            append_event(con, "public", "disclosure", detail)
            con.commit()
        finally:
            con.close()
        return {
            "status": decision.status,
            "bundle_id": decision.bundle_id,
            "answer": decision.answer,
            "fragments": decision.fragments,
            "sources_label": "Approved public knowledge only",
        }

    return app


def main() -> None:
    import uvicorn

    from agamemnon.paths import runtime_paths

    path = runtime_paths()["public"]
    if not path.exists():
        raise SystemExit("Missing public.db. Run python -m agamemnon.seed first.")
    uvicorn.run(create_app(path), host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
