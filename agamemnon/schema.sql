-- SECTION public
CREATE TABLE fragments (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    text TEXT NOT NULL,
    citation TEXT NOT NULL
);

CREATE TABLE bundles (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    fragment_ids TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
);

-- SECTION corpus
CREATE TABLE patents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT NOT NULL,
    description TEXT NOT NULL,
    claims_text TEXT NOT NULL,
    cpc TEXT NOT NULL,
    family_id TEXT NOT NULL,
    filing_date TEXT NOT NULL,
    publication_date TEXT,
    published INTEGER NOT NULL,
    disclosure_tier TEXT NOT NULL,
    canary TEXT,
    kind TEXT NOT NULL
);

CREATE VIRTUAL TABLE patents_fts USING fts5(
    patent_id UNINDEXED,
    title,
    abstract,
    description,
    claims_text,
    cpc
);

-- SECTION jobs
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
);

-- SECTION sentinel
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    raw_hash TEXT NOT NULL,
    source TEXT NOT NULL,
    policy_label TEXT NOT NULL,
    imported_at TEXT NOT NULL
);

CREATE TABLE units (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    span TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE assessments (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    proposed_disposition TEXT NOT NULL,
    model_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id)
);

CREATE TABLE candidates (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    level TEXT NOT NULL,
    topic TEXT NOT NULL,
    text TEXT NOT NULL,
    citation TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE decisions (
    id INTEGER PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    reviewer TEXT NOT NULL,
    decision TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    decided_at TEXT NOT NULL
);

CREATE TABLE publications (
    candidate_id TEXT PRIMARY KEY,
    public_fragment_id TEXT,
    content_hash TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL,
    owned INTEGER NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE audit_events (
    id INTEGER PRIMARY KEY,
    ts TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT NOT NULL,
    prev_hash TEXT NOT NULL,
    hash TEXT NOT NULL
);
