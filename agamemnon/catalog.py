import json
from pathlib import Path

from agamemnon.db import connect


def load_catalog(path: Path) -> dict:
    con = connect(path)
    try:
        fragment_rows = [
            dict(row)
            for row in con.execute("SELECT id, topic, text, citation FROM fragments ORDER BY id")
        ]
        bundle_rows = []
        for row in con.execute("SELECT id, topic, fragment_ids, description FROM bundles"):
            item = dict(row)
            item["fragment_ids"] = json.loads(item["fragment_ids"])
            bundle_rows.append(item)
        return {"fragments": fragment_rows, "bundles": bundle_rows}
    finally:
        con.close()
