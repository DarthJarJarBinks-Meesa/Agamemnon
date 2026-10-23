# SecurePatent

Offline prototype of a confidentiality-preserving patent assistant, plus a separate prior-art search on the website.

```
USPTO / Google Patents / PatSnap
        |
        |  Prioris only, authenticated, keyword query
        v
 [Prioris prior-art chart]          [Sentinel private review]
        |                                      |
        |                              human approve / revoke
        |                                      |
        |                                      v
        |                            public.db  (approved notes only)
        |                                      |
        v                                      v
 claim chart and PDFs                 Athena public answers
```

Athena and Prioris are different tools.

- Athena answers a question by quoting reviewer-signed public notes. The public program on port 8000 reads only `public.db`. It has no tool that can open the private corpus, and it does not send the question to USPTO, Google Patents, or PatSnap. A refusal uses the same wording whether or not a restricted record exists.
- Sentinel is the private review path on the examiner process, port 8001. It splits a local patent into units, marks every unit `REVIEW_REQUIRED`, and proposes a public note from the approved library. A model recommendation never publishes. The reviewer password must approve the exact text, and only then can that text be copied into `public.db`. Revoke deletes a note that Sentinel itself published. Re-seed wipes the private review database.
- Prioris, at `/prioris`, is the prior-art search. It is a separate page with its own password. Athena's route does not call it. Prioris does contact USPTO and PatSnap when API keys are set. That is intentional, and it is outside Athena's process. The Python examiner's claim chart stays on the laptop and does not call those APIs.
- `python -m agamemnon.eval` compares a leaky retriever, a retriever with an output filter, and this public assistant. The fixture corpus includes synthetic canary strings so leakage is measurable.

Changing the secret patents does not change public answers, because that program is not given the secret database.

## Threat model and limits

The boundary is which database the public process can open, not a prompt that tells a model to be careful. These are the limits of this prototype:

- The reviewer password is a local stand-in. It is not a government accreditation, and the tool does not decide classification.
- Many ordinary questions are refused because they are outside the small approved catalog. That false-refusal rate is the cost of having no other source.
- No local model is installed. Answers are copied from approved notes. A later local model would still be limited to those notes.
- Passing the tests does not prove that a person cannot rediscover an invention, and it does not remove anything already published on the internet.
- Sentinel's ingest allowlist accepts only specific USPTO and Google Patents URLs. Seed, chat, and analysis do not call it. PatSnap is not on that allowlist; only Prioris uses PatSnap, and only for prior art.
- The website Athena reads the signed export in `data/fixtures/public_fragments.json`. Publish and revoke update the local `public.db` used by port 8000. They do not edit the website export until you run `python -m agamemnon.seed` after a reviewed change to the fixture notes.
- Cross-session monitoring is only a per-session cap on how many approved bundles can be released. Someone with many sessions can still ask every approved question. The protection is that the secret text is not in the public store.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m agamemnon.seed
python -m agamemnon
```

- Public assistant: http://127.0.0.1:8000
- Examiner console: http://127.0.0.1:8001
- Local examiner password: `analyst` (override with `AGAMEMNON_ANALYST_PASSWORD`)

The examiner page can load a fictional wearable-sensor application. Uploads accept `.txt`, `.pdf`, and `.docx`. Text is extracted locally; the file is not sent anywhere. The same page has a Sentinel queue. The password is sent only to port 8001.

```bash
python -m agamemnon.sentinel analyze US-SEC-2001
python -m agamemnon.sentinel reviews
python -m agamemnon.sentinel decide US-SEC-2001-c0 approve --reviewer ada
python -m agamemnon.sentinel publish US-SEC-2001-c0
python -m agamemnon.sentinel revoke US-SEC-2001-c0
python -m agamemnon.sentinel audit
```

`analyze` only fills the private queue. `publish` copies an approved note into `public.db`. `python -m agamemnon.seed` rebuilds all four databases and drops review history.

```bash
python -m agamemnon.eval
pytest
```

The eval prints canary leakage for the leaky retriever and for Sentinel's proposed public notes. `pytest` checks jailbreak wording, a swapped private corpus, publish-before-approval, revocation, the ingest allowlist, and that the public Athena route does not reference Prioris or the patent APIs.

The corpus is synthetic: about 60 fictional patents, simulated disclosure labels, and approved public notes. It is not a complete prior-art search and it does not decide whether a claim is valid.

## Live prior-art search

The Prioris page on the site searches live indexes when the keys in `.env` are set:

- `USPTO_API_KEY` searches US patent file-wrapper records.
- `PATSNAP_API_KEY` searches global patent claims and technical literature.

Copy `.env.example` to `.env` and paste the keys there. The page sends a keyword query built from the claims. It does not store the application. Each search reads a capped set of the closest documents, not the entire historical archive. Athena answers ordinary questions from public references, including Wikipedia, and from USPTO and PatSnap when those keys are set. A request for restricted material still gets one fixed reply and does not call those services.

The Python examiner above stays on the laptop and does not call USPTO or PatSnap.

## Marketing homepage

The Next.js site in this repo includes Athena at `/athena` and live Prioris search at `/prioris`. From the same environment that has Node installed:

```bash
npm install
npm run dev
```

Open http://localhost:3000.
