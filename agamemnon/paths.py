import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "data" / "fixtures"
STATIC = Path(__file__).resolve().parent / "static"


def data_dir() -> Path:
    return Path(os.environ.get("AGAMEMNON_DATA", ROOT / "data" / "runtime"))


def runtime_paths(root: Path | None = None) -> dict[str, Path]:
    base = root or data_dir()
    return {
        "public": base / "public.db",
        "corpus": base / "corpus.db",
        "jobs": base / "jobs.db",
    }
