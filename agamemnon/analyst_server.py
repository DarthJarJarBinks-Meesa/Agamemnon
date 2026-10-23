import hashlib
import hmac
import os
from pathlib import Path

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agamemnon.analyze import analyze_text
from agamemnon.extract import extract_text
from agamemnon.fixture_spec import SAMPLE_WEARABLE
from agamemnon.paths import STATIC
from agamemnon.sentinel import workflow

SAFE_ERRORS = (
    "No ",
    "Candidate ",
    "Content ",
    "Refusing ",
    "Document ",
)


def _password_ok(supplied: str) -> bool:
    expected = os.environ.get("AGAMEMNON_ANALYST_PASSWORD", "analyst")
    return hmac.compare_digest(
        hashlib.sha256(supplied.encode()).digest(),
        hashlib.sha256(expected.encode()).digest(),
    )


def _require(password: str) -> None:
    if not _password_ok(password):
        raise HTTPException(status_code=401, detail="Analyst authentication failed")


class AnalyzeBody(BaseModel):
    document_id: str


class DecisionBody(BaseModel):
    decision: str
    reviewer: str = "reviewer"


def _sentinel_call(func):
    try:
        return func()
    except ValueError as exc:
        message = str(exc)
        if not message.startswith(SAFE_ERRORS):
            raise HTTPException(status_code=400, detail="The review could not be completed.") from exc
        raise HTTPException(status_code=400, detail=message) from exc


def create_app(corpus_db: Path, jobs_db: Path, sentinel_db: Path | None = None) -> FastAPI:
    app = FastAPI(title="SecurePatent examiner")
    private = sentinel_db or (jobs_db.parent / "sentinel.db")

    @app.get("/")
    def index():
        return FileResponse(STATIC / "examiner.html")

    @app.get("/static/examiner.css")
    def css():
        return FileResponse(STATIC / "examiner.css")

    @app.get("/api/sample")
    def sample(x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        return {"filename": "sample_wearable.txt", "text": SAMPLE_WEARABLE}

    @app.post("/api/analyze")
    async def analyze(
        x_analyst_password: str = Header(default=""),
        upload: UploadFile | None = File(default=None),
        text: str = Form(default=""),
        filename: str = Form(default="application.txt"),
    ):
        _require(x_analyst_password)
        if upload is not None and upload.filename:
            data = await upload.read()
            try:
                raw = extract_text(upload.filename, data)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            stored_name = Path(upload.filename).name
        elif text.strip():
            raw = text
            stored_name = Path(filename).name or "application.txt"
        else:
            raise HTTPException(status_code=400, detail="Upload a file or paste the application text.")
        try:
            report = analyze_text(raw, corpus_path=corpus_db, jobs_path=jobs_db, filename=stored_name)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return report

    @app.post("/internal/sentinel/analyze")
    def sentinel_analyze(body: AnalyzeBody, x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        return _sentinel_call(lambda: workflow.analyze_corpus_document(private, corpus_db, body.document_id))

    @app.get("/internal/sentinel/reviews")
    def sentinel_reviews(x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        return workflow.list_reviews(private)

    @app.get("/internal/sentinel/reviews/{candidate_id}")
    def sentinel_review(candidate_id: str, x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        return _sentinel_call(lambda: workflow.review_detail(private, candidate_id))

    @app.post("/internal/sentinel/reviews/{candidate_id}/decision")
    def sentinel_decision(candidate_id: str, body: DecisionBody, x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        return _sentinel_call(
            lambda: workflow.decide(private, candidate_id, body.decision, body.reviewer)
        )

    @app.post("/internal/sentinel/releases/{candidate_id}/publish")
    def sentinel_publish(candidate_id: str, x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        public_db = jobs_db.parent / "public.db"
        return _sentinel_call(lambda: workflow.publish(private, public_db, candidate_id))

    @app.post("/internal/sentinel/releases/{candidate_id}/revoke")
    def sentinel_revoke(candidate_id: str, x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        public_db = jobs_db.parent / "public.db"
        return _sentinel_call(lambda: workflow.revoke(private, public_db, candidate_id))

    @app.get("/internal/sentinel/audit")
    def sentinel_audit(x_analyst_password: str = Header(default="")):
        _require(x_analyst_password)
        return _sentinel_call(lambda: workflow.audit_log(private))

    return app


def main() -> None:
    import uvicorn

    from agamemnon.paths import runtime_paths

    paths = runtime_paths()
    if not paths["corpus"].exists() or not paths["jobs"].exists():
        raise SystemExit("Missing analyst databases. Run python -m agamemnon.seed first.")
    uvicorn.run(
        create_app(paths["corpus"], paths["jobs"], paths["sentinel"]),
        host="127.0.0.1",
        port=8001,
    )


if __name__ == "__main__":
    main()
