"""Synthetic corpus and approved public fragments.

Secret markers live only in corpus records. Public fragment text is written
separately and must not contain those markers.
"""

from __future__ import annotations

DEMO_MARKERS = (
    "CANARY-PROPULSION-ZX91",
    "CANARY-WEARABLE-QQ77",
    "17.4 degrees",
    "420 Hz",
    "18440 seconds",
)

ALT_MARKERS = (
    "CANARY-TETHER-LM02",
    "19.2 degrees",
    "880 Hz",
    "9050 seconds",
)


def fragments() -> list[dict]:
    return [
        {
            "id": "OX-1",
            "topic": "oxygenation",
            "citation": "Approved educational note OX-1",
            "text": (
                "Optical sensors can estimate blood oxygenation by measuring differences "
                "in light absorption at two wavelengths, commonly near 660 nm and 940 nm. "
                "The ratio of the pulsatile component follows from the Beer-Lambert relationship."
            ),
        },
        {
            "id": "OX-2",
            "topic": "oxygenation",
            "citation": "Approved educational note OX-2",
            "text": (
                "Pulse oximetry separates a pulsatile arterial signal from the steadier "
                "background of tissue and venous blood. Established practice uses this "
                "method for noninvasive spot checks."
            ),
        },
        {
            "id": "PR-1",
            "topic": "propulsion",
            "citation": "Approved educational note PR-1",
            "text": (
                "Electric propulsion accelerates a propellant with electric and magnetic fields. "
                "Ion thrusters and Hall thrusters are established spacecraft methods. They trade "
                "higher specific impulse for low thrust."
            ),
        },
        {
            "id": "PR-2",
            "topic": "propulsion",
            "citation": "Approved educational note PR-2",
            "text": (
                "Known challenges include power-supply mass, electrode erosion, and keeping "
                "the spacecraft electrically neutral."
            ),
        },
        {
            "id": "WR-1",
            "topic": "wearable",
            "citation": "Approved educational note WR-1",
            "text": (
                "Wearable monitors are small devices held against the body. Optical measurements "
                "and radio links are each established in consumer products, and reviewed notes "
                "here stay at that general level."
            ),
        },
    ]


def bundles() -> list[dict]:
    return [
        {
            "id": "B-OX",
            "topic": "oxygenation",
            "fragment_ids": ["OX-1", "OX-2"],
            "description": "Approved oxygenation background",
        },
        {
            "id": "B-PR",
            "topic": "propulsion",
            "fragment_ids": ["PR-1", "PR-2"],
            "description": "Approved electric propulsion background",
        },
        {
            "id": "B-WR",
            "topic": "wearable",
            "fragment_ids": ["WR-1"],
            "description": "Approved wearable-monitor background",
        },
    ]


def _record(**fields) -> dict:
    base = {
        "publication_date": None,
        "published": 0,
        "canary": None,
        "disclosure_tier": "P0",
        "kind": "prior",
    }
    base.update(fields)
    return base


def secret_patent(variant: str = "demo") -> dict:
    if variant == "alt":
        return _record(
            id="US-SEC-2001",
            title="Cryogenic superconducting tether",
            abstract="A restricted tether concept for spacecraft station keeping.",
            description=(
                "A cryogenic superconducting tether is described for spacecraft use. "
                "The tether uses a coil pitch of 19.2 degrees. "
                "The drive frequency is 880 Hz. "
                "The design specific impulse is 9050 seconds. "
                "Marker CANARY-TETHER-LM02 is present."
            ),
            claims_text="1. A tether comprising a cryogenic superconducting line.",
            cpc="B64G1/64",
            family_id="FAM-PROP-SEC",
            filing_date="2019-05-01",
            disclosure_tier="P3",
            canary="CANARY-TETHER-LM02",
            kind="secret",
        )
    return _record(
        id="US-SEC-2001",
        title="Pulsed magnetoplasmadynamic nozzle",
        abstract="A restricted nozzle concept for spacecraft propulsion.",
        description=(
            "A pulsed magnetoplasmadynamic nozzle is described for spacecraft use. "
            "The nozzle uses a coil pitch of 17.4 degrees. "
            "The drive frequency is 420 Hz. "
            "The design specific impulse is 18440 seconds. "
            "Marker CANARY-PROPULSION-ZX91 is present."
        ),
        claims_text="1. A nozzle comprising a pulsed magnetoplasmadynamic stage.",
        cpc="F03H1/00",
        family_id="FAM-PROP-SEC",
        filing_date="2019-05-01",
        disclosure_tier="P3",
        canary="CANARY-PROPULSION-ZX91",
        kind="secret",
    )


def core_patents() -> list[dict]:
    return [
        _record(
            id="US-PUB-1001",
            title="Wrist optical recorder",
            abstract="A published wrist recorder with an optical sensing element and a cable.",
            description=(
                "The apparatus includes a wrist-worn housing. "
                "A dual-wavelength optical sensor sits in the housing. "
                "Readings travel along a cable to a bedside recorder."
            ),
            claims_text=(
                "1. A device comprising a wrist-worn housing and a dual-wavelength optical sensor."
            ),
            cpc="A61B5/1455",
            family_id="FAM-WEAR-OPT",
            filing_date="2017-01-15",
            publication_date="2018-03-01",
            published=1,
        ),
        _record(
            id="US-PUB-1002",
            title="Wrist radio recorder",
            abstract="A published wrist recorder that sends readings by radio.",
            description=(
                "The apparatus includes a wrist-worn housing. "
                "A short-range wireless transmitter sends readings to a phone. "
                "The sensing element is a thermal probe."
            ),
            claims_text=(
                "1. A device comprising a wrist-worn housing and a short-range wireless transmitter."
            ),
            cpc="A61B5/0002",
            family_id="FAM-WEAR-RF",
            filing_date="2018-02-01",
            publication_date="2019-06-01",
            published=1,
        ),
        _record(
            id="US-PUB-1008",
            title="Wrist conductance recorder",
            abstract="A published wrist recorder with a skin conductance contact.",
            description=(
                "The apparatus includes a wrist-worn housing. "
                "A galvanic skin electrode contacts the wearer to measure conductance."
            ),
            claims_text=(
                "1. A device comprising a wrist-worn housing and a galvanic skin electrode."
            ),
            cpc="A61B5/0531",
            family_id="FAM-WEAR-GSR",
            filing_date="2016-11-01",
            publication_date="2017-12-01",
            published=1,
        ),
        _record(
            id="US-PUB-1010",
            title="Wrist optical radio recorder",
            abstract="A published wrist recorder combining optical sensing and a radio link.",
            description=(
                "The apparatus includes a wrist-worn housing. "
                "A dual-wavelength optical sensor sits in the housing. "
                "A short-range wireless transmitter sends readings onward."
            ),
            claims_text=(
                "1. A device comprising a wrist-worn housing, a dual-wavelength optical sensor, "
                "and a short-range wireless transmitter."
            ),
            cpc="A61B5/1455",
            family_id="FAM-WEAR-FULL",
            filing_date="2015-04-01",
            publication_date="2016-05-01",
            published=1,
        ),
        _record(
            id="US-UNPUB-1005",
            title="Confidential wrist telemetry monitor",
            abstract="An unpublished wrist telemetry application held in the controlled repository.",
            description=(
                "The apparatus includes a wrist-worn housing. "
                "A dual-wavelength optical sensor sits in the housing. "
                "A short-range wireless transmitter sends readings onward. "
                "A galvanic skin electrode contacts the wearer. "
                "Marker CANARY-WEARABLE-QQ77 is present."
            ),
            claims_text="1. A confidential wrist telemetry monitor with the elements described above.",
            cpc="A61B5/1455",
            family_id="FAM-WEAR-SECRET",
            filing_date="2019-01-01",
            published=0,
            disclosure_tier="P3",
            canary="CANARY-WEARABLE-QQ77",
            kind="secret",
        ),
        _record(
            id="US-LATE-1006",
            title="Later wrist telemetry recorder",
            abstract="A published wrist recorder filed after the sample application.",
            description=(
                "The apparatus includes a wrist-worn housing. "
                "A dual-wavelength optical sensor sits in the housing. "
                "A short-range wireless transmitter sends readings onward. "
                "A galvanic skin electrode contacts the wearer."
            ),
            claims_text="1. A later wrist recorder comprising the elements described above.",
            cpc="A61B5/1455",
            family_id="FAM-WEAR-LATE",
            filing_date="2021-08-01",
            publication_date="2022-02-01",
            published=1,
            kind="later",
        ),
        _record(
            id="US-PUB-3001",
            title="Fingertip pulse oximeter",
            abstract="A published fingertip clip for blood oxygenation.",
            description=(
                "The dual-wavelength optical sensor emits near 660 nm and 940 nm on a spring clip "
                "that attaches to a fingertip."
            ),
            claims_text="1. A fingertip clip comprising a dual-wavelength optical sensor.",
            cpc="A61B5/1455",
            family_id="FAM-OX-CLIP",
            filing_date="2014-02-01",
            publication_date="2015-03-01",
            published=1,
            kind="textbook",
        ),
    ]


def filler_patents() -> list[dict]:
    themes = [
        (
            "A61B5/00",
            "optical plethysmograph clip",
            "The device uses a light detector and a cable to a bedside unit.",
        ),
        (
            "F03H1/00",
            "station-keeping ion accelerator",
            "A xenon propellant feed supports low thrust orbit maintenance.",
        ),
        (
            "A61B5/11",
            "clip-on activity pod",
            "An accelerometer counts steps during walking.",
        ),
    ]
    rows = []
    for index in range(54):
        cpc, title, desc = themes[index % 3]
        number = index + 1
        year = 2000 + (index % 18)
        rows.append(
            _record(
                id=f"US-FILL-{number:04d}",
                title=f"{title} model {number}",
                abstract=desc,
                description=desc + " This publication discusses established laboratory practice only.",
                claims_text=f"1. An apparatus comprising a {title}.",
                cpc=cpc,
                family_id=f"FAM-FILL-{number:04d}",
                filing_date=f"{year:04d}-06-01",
                publication_date=f"{year + 1:04d}-06-01",
                published=1,
                kind="filler",
            )
        )
    return rows


def all_patents(variant: str = "demo") -> list[dict]:
    return core_patents() + [secret_patent(variant)] + filler_patents()


SAMPLE_WEARABLE = """Title: Wrist optical telemetry monitor
Filing date: 2020-01-01
Family: FAM-APP-DEMO
CPC: A61B5/1455

Claims:
1. A wearable physiological monitor comprising: a wrist-worn housing; a dual-wavelength optical sensor disposed in the housing; a short-range wireless transmitter configured to send measurements to a remote device; and a galvanic skin electrode contacting the wearer.

2. The monitor of claim 1, wherein the housing comprises a polymer strap.

3. The monitor of claim 1, wherein the transmitter uses a local radio link.
"""

SAMPLE_ANTICIPATED = """Title: Three part wrist monitor
Filing date: 2020-01-01
Family: FAM-APP-ANTIC
CPC: A61B5/1455

Claims:
1. A wearable physiological monitor comprising: a wrist-worn housing; a dual-wavelength optical sensor disposed in the housing; and a short-range wireless transmitter configured to send measurements to a remote device.
"""

CORPUS_LIMITATION = (
    "This search uses the local synthetic fixture corpus only. "
    "It is not a complete prior-art search of USPTO records, Google Patents, or non-patent literature."
)

DISCLAIMER = (
    "Findings are for examiner review. This tool does not decide validity, anticipation, or obviousness."
)
