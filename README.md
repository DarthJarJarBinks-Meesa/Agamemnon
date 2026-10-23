# SecurePatent

Offline prototype of a confidentiality-preserving patent assistant. It runs on a laptop with no API keys, no model download, and no calls to USPTO or Google Patents.

The public assistant and the examiner tool are separate programs.

- The public assistant on port 8000 reads only `public.db`. Answers are copied from reviewer-signed fragments. It cannot retrieve secret patents, and a refusal uses the same wording whether or not a restricted record exists.
- The examiner tool on port 8001 reads the local corpus and a private jobs database. It compares claim limitations with earlier publications and labels unpublished or later records as technical overlap, not statutory prior art.
- `python -m agamemnon.eval` compares a leaky retriever, a retriever with an output filter, and this public assistant. The fixture corpus includes synthetic canary strings so leakage is measurable.

Changing the secret patents does not change public answers, because that program is not given the secret database.

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

The examiner page can load a fictional wearable-sensor application. Uploads accept `.txt`, `.pdf`, and `.docx`. Text is extracted locally; the file is not sent anywhere.

```bash
python -m agamemnon.eval
pytest
```

The corpus is synthetic: about 60 fictional patents, simulated disclosure labels, and approved public notes. It is not a complete prior-art search and it does not decide whether a claim is valid.

## Marketing homepage

The Next.js site in this repo is separate. From the same environment that has Node installed:

```bash
npm install
npm run dev
```

Open http://localhost:3000.
