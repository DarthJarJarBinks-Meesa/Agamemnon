import json
from pathlib import Path

from agamemnon.db import create_database
from agamemnon.fixture_spec import (
    SAMPLE_ANTICIPATED,
    SAMPLE_WEARABLE,
    all_patents,
    bundles,
    fragments,
)
from agamemnon.paths import FIXTURES, runtime_paths
from agamemnon.sentinel.store import build_sentinel


def build_public(path: Path) -> None:
    con = create_database(path, "public")
    try:
        for row in fragments():
            con.execute(
                "INSERT INTO fragments (id, topic, text, citation) VALUES (?, ?, ?, ?)",
                (row["id"], row["topic"], row["text"], row["citation"]),
            )
        for row in bundles():
            con.execute(
                "INSERT INTO bundles (id, topic, fragment_ids, description) VALUES (?, ?, ?, ?)",
                (row["id"], row["topic"], json.dumps(row["fragment_ids"]), row["description"]),
            )
        con.commit()
    finally:
        con.close()


def build_corpus(path: Path, variant: str = "demo") -> None:
    con = create_database(path, "corpus")
    try:
        for row in all_patents(variant):
            con.execute(
                """
                INSERT INTO patents (
                    id, title, abstract, description, claims_text, cpc, family_id,
                    filing_date, publication_date, published, disclosure_tier, canary, kind
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["title"],
                    row["abstract"],
                    row["description"],
                    row["claims_text"],
                    row["cpc"],
                    row["family_id"],
                    row["filing_date"],
                    row["publication_date"],
                    row["published"],
                    row["disclosure_tier"],
                    row["canary"],
                    row["kind"],
                ),
            )
            con.execute(
                """
                INSERT INTO patents_fts (patent_id, title, abstract, description, claims_text, cpc)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    row["id"],
                    row["title"],
                    row["abstract"],
                    row["description"],
                    row["claims_text"],
                    row["cpc"],
                ),
            )
        con.commit()
    finally:
        con.close()


def build_jobs(path: Path) -> None:
    con = create_database(path, "jobs")
    con.close()


def export_fixtures() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    (FIXTURES / "public_fragments.json").write_text(
        json.dumps({"fragments": fragments(), "bundles": bundles()}, indent=2) + "\n"
    )
    (FIXTURES / "patents.json").write_text(json.dumps(all_patents("demo"), indent=2) + "\n")
    (FIXTURES / "sample_wearable.txt").write_text(SAMPLE_WEARABLE)
    (FIXTURES / "sample_anticipated.txt").write_text(SAMPLE_ANTICIPATED)


def ensure_runtime(root: Path | None = None) -> dict[str, Path]:
    paths = runtime_paths(root)
    if not paths["public"].exists():
        build_public(paths["public"])
    if not paths["corpus"].exists():
        build_corpus(paths["corpus"])
    if not paths["jobs"].exists():
        build_jobs(paths["jobs"])
    if not paths["sentinel"].exists():
        build_sentinel(paths["sentinel"])
    return paths


def main() -> None:
    paths = runtime_paths()
    build_public(paths["public"])
    build_corpus(paths["corpus"])
    build_jobs(paths["jobs"])
    build_sentinel(paths["sentinel"])
    export_fixtures()
    print(f"public    {paths['public']}")
    print(f"corpus    {paths['corpus']}")
    print(f"jobs      {paths['jobs']}")
    print(f"sentinel  {paths['sentinel']}")


if __name__ == "__main__":
    main()
