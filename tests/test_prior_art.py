import io

from fastapi.testclient import TestClient

from agamemnon.analyze import analyze_text
from agamemnon.analyst_server import create_app
from agamemnon.audit import verify_events
from agamemnon.claims import parse_application
from agamemnon.db import connect
from agamemnon.extract import extract_text
from agamemnon.fixture_spec import SAMPLE_ANTICIPATED, SAMPLE_WEARABLE
from agamemnon.seed import build_corpus, build_jobs


def _stores(tmp_path):
    corpus = tmp_path / "corpus.db"
    jobs = tmp_path / "jobs.db"
    build_corpus(corpus)
    build_jobs(jobs)
    return corpus, jobs


def test_claim_parser_splits_independent_limitations():
    parsed = parse_application(SAMPLE_WEARABLE)
    assert parsed["claims_parsed"] == 3
    assert parsed["filing_date"] == "2020-01-01"
    assert [item["text"] for item in parsed["limitations"]] == [
        "a wrist-worn housing",
        "a dual-wavelength optical sensor disposed in the housing",
        "a short-range wireless transmitter configured to send measurements to a remote device",
        "a galvanic skin electrode contacting the wearer",
    ]
    assert parsed["claims"][1]["dependent"] is True
    assert parsed["claims"][1]["limitations"] == []


def test_obviousness_pair_and_nonstatutory_overlap(tmp_path):
    corpus, jobs = _stores(tmp_path)
    report = analyze_text(SAMPLE_WEARABLE, corpus_path=corpus, jobs_path=jobs)
    ids = [item["patent_id"] for item in report["candidates"]]
    assert ids[:4] == ["US-PUB-1010", "US-PUB-1001", "US-PUB-1002", "US-PUB-1008"] or set(ids) >= {
        "US-PUB-1010",
        "US-PUB-1001",
        "US-PUB-1002",
        "US-PUB-1008",
        "US-PUB-3001",
    }
    assert set(ids) == {
        "US-PUB-1001",
        "US-PUB-1002",
        "US-PUB-1008",
        "US-PUB-1010",
        "US-PUB-3001",
    }
    assert report["high_priority"] == 4
    assert report["anticipation_references"] == []
    assert report["obviousness_review"]["references"] == ["US-PUB-1010", "US-PUB-1008"]
    by_id = {item["patent_id"]: item for item in report["candidates"]}
    assert [item["label"] for item in by_id["US-PUB-1001"]["supports"]] == [
        "explicit",
        "explicit",
        "none",
        "none",
    ]
    assert [item["label"] for item in by_id["US-PUB-1002"]["supports"]] == [
        "explicit",
        "none",
        "explicit",
        "none",
    ]
    internal = {item["patent_id"]: item for item in report["internal_overlap"]}
    assert set(internal) == {"US-UNPUB-1005", "US-LATE-1006"}
    assert internal["US-UNPUB-1005"]["qualifies_as_prior_art"] is False
    assert "Unpublished" in internal["US-UNPUB-1005"]["eligibility_reason"]
    assert "not earlier" in internal["US-LATE-1006"]["eligibility_reason"]
    assert "CANARY-WEARABLE-QQ77" not in " ".join(item["patent_id"] for item in report["candidates"])


def test_anticipation_family_and_title_exclusion(tmp_path):
    corpus, jobs = _stores(tmp_path)
    anticipated = analyze_text(SAMPLE_ANTICIPATED, corpus_path=corpus, jobs_path=jobs)
    assert anticipated["anticipation_references"] == ["US-PUB-1010"]
    assert anticipated["obviousness_review"] is None
    assert any(item["possible_duplicate"] for item in anticipated["candidates"] if item["patent_id"] == "US-PUB-1010")

    family = SAMPLE_ANTICIPATED.replace("FAM-APP-ANTIC", "FAM-WEAR-FULL")
    hidden = analyze_text(family, corpus_path=corpus, jobs_path=jobs)
    assert "US-PUB-1010" not in [item["patent_id"] for item in hidden["candidates"]]
    assert hidden["anticipation_references"] == []

    titled = SAMPLE_ANTICIPATED.replace("Three part wrist monitor", "Wrist optical radio recorder")
    excluded = analyze_text(titled, corpus_path=corpus, jobs_path=jobs)
    assert "US-PUB-1010" in excluded["excluded_duplicate_ids"]
    assert "US-PUB-1010" not in [item["patent_id"] for item in excluded["candidates"]]


def test_audit_chain_detects_tampering(tmp_path):
    corpus, jobs = _stores(tmp_path)
    analyze_text(SAMPLE_WEARABLE, corpus_path=corpus, jobs_path=jobs, filename="sample.txt")
    con = connect(jobs)
    try:
        assert verify_events(con)
        stored = con.execute("SELECT raw_text FROM jobs").fetchone()["raw_text"]
        assert "galvanic skin electrode" in stored
        con.execute("UPDATE audit_events SET detail = 'tampered' WHERE id = 1")
        assert verify_events(con) is False
    finally:
        con.close()
    corpus_con = connect(corpus)
    try:
        found = corpus_con.execute(
            "SELECT COUNT(*) AS n FROM patents WHERE title = ?",
            ("Wrist optical telemetry monitor",),
        ).fetchone()["n"]
        assert found == 0
    finally:
        corpus_con.close()


def _pdf(text: str) -> bytes:
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    safe = safe.replace("\n", " ")
    stream = f"BT /F1 9 Tf 36 750 Td ({safe}) Tj ET".encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        out += f"{offset:010d} 00000 n \n".encode()
    out += f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    return bytes(out)


def test_docx_and_pdf_extraction_roundtrip():
    from docx import Document

    document = Document()
    for line in SAMPLE_ANTICIPATED.splitlines():
        document.add_paragraph(line)
    buffer = io.BytesIO()
    document.save(buffer)
    docx_text = extract_text("sample.docx", buffer.getvalue())
    assert "Filing date: 2020-01-01" in docx_text
    assert "wrist-worn housing" in docx_text

    pdf_text = extract_text("sample.pdf", _pdf(SAMPLE_ANTICIPATED))
    assert "2020-01-01" in pdf_text
    assert "wrist-worn housing" in pdf_text


def test_analyst_api_requires_password_and_returns_chart(tmp_path):
    corpus, jobs = _stores(tmp_path)
    client = TestClient(create_app(corpus, jobs))
    denied = client.post("/api/analyze", data={"text": SAMPLE_WEARABLE, "filename": "a.txt"})
    assert denied.status_code == 401
    ok = client.post(
        "/api/analyze",
        data={"text": SAMPLE_WEARABLE, "filename": "a.txt"},
        headers={"X-Analyst-Password": "analyst"},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["claims_parsed"] == 3
    assert body["candidate_count"] == 5
    assert "local synthetic fixture corpus" in body["corpus_limitation"]
    missing = client.get("/api/ask")
    assert missing.status_code == 404
