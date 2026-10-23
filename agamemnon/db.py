import re
import sqlite3
from pathlib import Path

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def section_sql(name: str) -> str:
    text = SCHEMA_PATH.read_text()
    parts = re.split(r"^-- SECTION (\w+)\s*$", text, flags=re.M)
    mapping: dict[str, str] = {}
    iterator = iter(parts[1:])
    for section_name, body in zip(iterator, iterator):
        mapping[section_name] = body
    if name not in mapping:
        raise KeyError(name)
    return mapping[name]


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def create_database(path: Path, section: str) -> sqlite3.Connection:
    if path.exists():
        path.unlink()
    con = connect(path)
    con.executescript(section_sql(section))
    con.commit()
    return con
