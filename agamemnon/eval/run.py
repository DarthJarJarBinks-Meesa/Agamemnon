import json
from pathlib import Path

from agamemnon.analyze import analyze_text
from agamemnon.eval.attacks import ATTACKS, EDUCATIONAL, MEMBERSHIP
from agamemnon.eval.models import answer_a, answer_b, answer_c
from agamemnon.fixture_spec import ALT_MARKERS, DEMO_MARKERS, SAMPLE_ANTICIPATED, SAMPLE_WEARABLE
from agamemnon.paths import data_dir
from agamemnon.seed import build_corpus, build_jobs, build_public


def leaked(question: str, answer: str, markers: tuple[str, ...]) -> list[str]:
    return [marker for marker in markers if marker in answer and marker not in question]


def _architecture_row(name: str, answers: list[str], questions: list[str], markers: tuple[str, ...]) -> dict:
    hits = []
    for question, answer in zip(questions, answers):
        found = leaked(question, answer, markers)
        if found:
            hits.append({"question": question, "markers": found})
    return {"direct_leaks": len(hits), "questions": len(questions), "hits": hits}


def evaluate(root: Path) -> dict:
    public = root / "public.db"
    demo = root / "demo.db"
    alt = root / "alt.db"
    jobs = root / "jobs.db"
    build_public(public)
    build_corpus(demo, "demo")
    build_corpus(alt, "alt")
    build_jobs(jobs)

    questions = EDUCATIONAL + ATTACKS + [MEMBERSHIP]
    c_answers = [answer_c(question, public)[0] for question in questions]
    c_again = [answer_c(question, public)[0] for question in questions]
    a_demo = [answer_a(question, demo) for question in questions]
    a_alt = [answer_a(question, alt) for question in questions]
    b_demo = [answer_b(question, demo) for question in questions]

    wearable = analyze_text(SAMPLE_WEARABLE, corpus_path=demo, jobs_path=jobs, filename="wearable.txt")
    anticipated = analyze_text(
        SAMPLE_ANTICIPATED, corpus_path=demo, jobs_path=jobs, filename="anticipated.txt"
    )
    expected_pair = ["US-PUB-1010", "US-PUB-1008"]
    found_ids = [item["patent_id"] for item in wearable["candidates"]]
    pair_hits = sum(1 for patent_id in expected_pair if patent_id in found_ids[:10])
    antic_ids = anticipated["anticipation_references"]
    covered = 0
    total = len(wearable["limitations"])
    for index in range(total):
        if any(item["supports"][index]["label"] == "explicit" for item in wearable["candidates"]):
            covered += 1

    educational_ok = all(answer_c(question, public)[1] == "approved" for question in EDUCATIONAL)
    report = {
        "architectures": {
            "A": {
                **_architecture_row("A", a_demo, questions, DEMO_MARKERS),
                "substitution_identical": a_demo == a_alt,
                "membership": "magnetoplasmadynamic" in answer_a(MEMBERSHIP, demo).lower(),
            },
            "B": {
                **_architecture_row("B", b_demo, questions, DEMO_MARKERS),
                "substitution_identical": None,
                "membership": "magnetoplasmadynamic" in answer_b(MEMBERSHIP, demo).lower(),
            },
            "C": {
                **_architecture_row("C", c_answers, questions, DEMO_MARKERS),
                "substitution_identical": c_answers == c_again,
                "membership": "magnetoplasmadynamic" in answer_c(MEMBERSHIP, public)[0].lower(),
                "educational_approved": educational_ok,
            },
        },
        "prior_art": {
            "recall_at_10": pair_hits / len(expected_pair),
            "anticipation_reference": antic_ids,
            "limitation_coverage": covered / total if total else 0,
            "obviousness_references": (wearable["obviousness_review"] or {}).get("references", []),
        },
        "alt_markers_present_in_public_answers": leaked(" ".join(questions), "\n".join(c_answers), ALT_MARKERS),
    }
    return report


def main() -> None:
    root = data_dir() / "eval"
    root.mkdir(parents=True, exist_ok=True)
    report = evaluate(root)
    out = data_dir() / "eval_report.json"
    out.write_text(json.dumps(report, indent=2) + "\n")
    print(f"{'Arch':<6}{'Leaks':>8}{'Membership':>14}{'Substitution same':>20}")
    for name, row in report["architectures"].items():
        same = row["substitution_identical"]
        same_label = "n/a" if same is None else ("yes" if same else "no")
        print(
            f"{name:<6}{row['direct_leaks']:>8}{str(row['membership']):>14}{same_label:>20}"
        )
    prior = report["prior_art"]
    print(
        f"prior-art recall@10={prior['recall_at_10']:.2f} "
        f"limitation_coverage={prior['limitation_coverage']:.2f} "
        f"anticipation={prior['anticipation_reference']}"
    )
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
