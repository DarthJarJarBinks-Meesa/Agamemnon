"""Candidate public sentences.

These strings are the approved educational notes, or a new note written for the
prototype. They are not paraphrases of a private patent. A reviewer still has
to approve the exact text before it can be copied into the public store.
"""

from agamemnon.fixture_spec import fragments

TOPIC_NEEDLES = {
    "oxygenation": ("oxygenation", "oximetry"),
    "propulsion": ("propulsion", "thruster", "nozzle", "propellant"),
    "wearable": ("wearable", "wrist", "telemetry"),
    "computing": ("accelerator", "inference", "processor", "quantization"),
    "microelectronics": ("transistor", "semiconductor", "lithography"),
}

EXTRA = (
    {
        "topic": "stationkeeping",
        "level": "L1",
        "needles": ("tether", "station keeping", "stationkeeping"),
        "citation": "Approved educational note SK-1",
        "text": (
            "Spacecraft station keeping uses small thrusters to hold a planned orbit. "
            "Public descriptions of that practice stop at the function and do not include "
            "a specific tether design."
        ),
    },
)


def proposals_for(title: str, body: str) -> list[dict]:
    blob = f"{title}\n{body}".lower()
    found: list[dict] = []
    for topic, needles in TOPIC_NEEDLES.items():
        if not any(needle in blob for needle in needles):
            continue
        level = "L1" if topic in {"computing", "microelectronics"} else "L2"
        for row in fragments():
            if row["topic"] != topic:
                continue
            found.append(
                {
                    "topic": topic,
                    "level": level,
                    "citation": row["citation"],
                    "text": row["text"],
                }
            )
    for row in EXTRA:
        if any(needle in blob for needle in row["needles"]):
            found.append(
                {
                    "topic": row["topic"],
                    "level": row["level"],
                    "citation": row["citation"],
                    "text": row["text"],
                }
            )
    return found
