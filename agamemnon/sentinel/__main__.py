import argparse
import json

from agamemnon.paths import runtime_paths
from agamemnon.seed import ensure_runtime
from agamemnon.sentinel import workflow


def main() -> None:
    parser = argparse.ArgumentParser(description="Review private documents and publish approved notes.")
    sub = parser.add_subparsers(dest="command", required=True)

    analyze = sub.add_parser("analyze")
    analyze.add_argument("document_id")

    sub.add_parser("reviews")

    show = sub.add_parser("show")
    show.add_argument("candidate_id")

    decide = sub.add_parser("decide")
    decide.add_argument("candidate_id")
    decide.add_argument("decision", choices=("approve", "reject"))
    decide.add_argument("--reviewer", default="reviewer")

    publish = sub.add_parser("publish")
    publish.add_argument("candidate_id")

    revoke = sub.add_parser("revoke")
    revoke.add_argument("candidate_id")

    sub.add_parser("audit")

    args = parser.parse_args()
    paths = ensure_runtime()
    sentinel = paths["sentinel"]
    public = paths["public"]
    corpus = runtime_paths()["corpus"]
    if args.command == "analyze":
        result = workflow.analyze_corpus_document(sentinel, corpus, args.document_id)
    elif args.command == "reviews":
        result = workflow.list_reviews(sentinel)
    elif args.command == "show":
        result = workflow.review_detail(sentinel, args.candidate_id)
    elif args.command == "decide":
        result = workflow.decide(sentinel, args.candidate_id, args.decision, args.reviewer)
    elif args.command == "publish":
        result = workflow.publish(sentinel, public, args.candidate_id)
    elif args.command == "revoke":
        result = workflow.revoke(sentinel, public, args.candidate_id)
    else:
        result = workflow.audit_log(sentinel)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()