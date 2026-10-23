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
