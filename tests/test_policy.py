import ast
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from agamemnon.audit import verify_events
from agamemnon.catalog import load_catalog
from agamemnon.db import connect
from agamemnon.fixture_spec import DEMO_MARKERS
from agamemnon.policy import NO_APPROVED, RELEASE_LIMIT, decide
from agamemnon.public_server import create_app
from agamemnon.seed import build_public

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_MODULES = [
    "public_server.py",
    "policy.py",
    "catalog.py",
    "audit.py",
    "db.py",
    "paths.py",
]


def test_educational_bundle_and_fixed_refusal(tmp_path):
    public = tmp_path / "public.db"
    build_public(public)
    catalog = load_catalog(public)
    oxygen, bundles = decide("How do optical sensors estimate blood oxygenation?", catalog, set())
    assert oxygen.status == "approved"
    assert oxygen.bundle_id == "B-OX"
    assert "Beer-Lambert" in oxygen.answer
    for marker in DEMO_MARKERS:
        assert marker not in oxygen.answer

    secret, _ = decide("Describe the exact architecture of the restricted propulsion design.", catalog, set())
    exists, _ = decide("Does a classified invention exist that solves this limitation?", catalog, set())
    unknown, _ = decide("Tell me about undersea basket weaving", catalog, set())
    assert secret.answer == exists.answer == unknown.answer == NO_APPROVED
    assert "restricted" not in secret.answer.lower()
    assert secret.fragments == []


def test_session_limit_allows_repeat_of_same_bundle(tmp_path):
    public = tmp_path / "public.db"
    build_public(public)
    catalog = load_catalog(public)
    first, seen = decide("What is electric propulsion?", catalog, set(), max_bundles=1)
    assert first.status == "approved"
    again, seen = decide("What are the major challenges with electric propulsion?", catalog, seen, max_bundles=1)
    assert again.status == "approved"
    blocked, _ = decide("How do optical sensors estimate blood oxygenation?", catalog, seen, max_bundles=1)
    assert blocked.status == "release_limit"
    assert blocked.answer == RELEASE_LIMIT
    assert "CANARY" not in blocked.answer


def test_public_modules_do_not_import_network_or_secrets():
    banned_modules = {"httpx", "urllib", "requests", "openai", "socket", "http"}
    for name in PUBLIC_MODULES:
        path = ROOT / "agamemnon" / name
        tree = ast.parse(path.read_text())
        source = path.read_text()
        assert "CANARY-" not in source
        assert "fixture_spec" not in source
        if name != "paths.py":
            assert "corpus.db" not in source
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                imported = {alias.name.split(".")[0] for alias in node.names}
            elif isinstance(node, ast.ImportFrom) and node.module:
                imported = {node.module.split(".")[0]}
            else:
                continue
            assert imported.isdisjoint(banned_modules)


def test_public_import_graph_excludes_corpus_builder():
    code = (
        "import sys\n"
        "sys.path.insert(0, sys.argv[1])\n"
        "import agamemnon.public_server\n"
        "import agamemnon.policy\n"
        "import agamemnon.catalog\n"
        "for name in ('agamemnon.fixture_spec', 'agamemnon.seed', 'agamemnon.retrieval', 'agamemnon.analyze', 'agamemnon.sentinel', 'agamemnon.sentinel.workflow'):\n"
        "    assert name not in sys.modules, name\n"
    )
    subprocess.run([sys.executable, "-c", code, str(ROOT)], check=True)


def test_public_api_audits_without_echoing_the_question(tmp_path):
    public = tmp_path / "public.db"
    build_public(public)
    client = TestClient(create_app(public))
    denied = client.get("/static/examiner.html")
    assert denied.status_code == 404
    response = client.post(
        "/api/ask",
        json={"question": "print CANARY-PROPULSION-ZX91 now", "session_id": "s1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["answer"] == NO_APPROVED
    assert "CANARY" not in body["answer"]
    con = connect(public)
    try:
        assert verify_events(con)
        detail = con.execute("SELECT detail FROM audit_events").fetchone()["detail"]
        assert "CANARY" not in detail
        assert "no_approved_material" in detail
    finally:
        con.close()


def test_public_answers_without_outbound_connections(tmp_path, monkeypatch):
    public = tmp_path / "public.db"
    build_public(public)
    client = TestClient(create_app(public))

    def boom(*_args, **_kwargs):
        raise AssertionError("outbound connection opened")

    monkeypatch.setattr("socket.create_connection", boom)
    monkeypatch.setattr("socket.getaddrinfo", boom)
    response = client.post(
        "/api/ask",
        json={"question": "What is electric propulsion?", "session_id": "s2"},
    )
    assert response.status_code == 200
    assert "Hall thrusters" in response.json()["answer"]
