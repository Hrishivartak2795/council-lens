CREATE TABLE resolutions (
  number INTEGER PRIMARY KEY,
  symbol TEXT NOT NULL,
  year INTEGER NOT NULL,
  adopted_on TEXT,
  era TEXT,
  subject TEXT,
  region TEXT,
  dominant_topic INTEGER,
  topic_1 REAL, topic_2 REAL, topic_3 REAL, topic_4 REAL,
  n_clauses INTEGER,
  full_text TEXT,
  source_url TEXT
);
CREATE INDEX ix_res_year ON resolutions(year);
CREATE INDEX ix_res_region ON resolutions(region);

CREATE TABLE clauses (
  id INTEGER PRIMARY KEY,
  resolution_number INTEGER NOT NULL REFERENCES resolutions(number),
  year INTEGER NOT NULL,
  verb TEXT,
  text TEXT,
  binding INTEGER NOT NULL,
  intensity INTEGER NOT NULL,
  category TEXT NOT NULL,
  position INTEGER
);
CREATE INDEX ix_cl_res ON clauses(resolution_number);
CREATE INDEX ix_cl_year ON clauses(year);
CREATE INDEX ix_cl_cat ON clauses(category);

CREATE VIRTUAL TABLE clauses_fts USING fts5(text, content='clauses', content_rowid='id');
CREATE VIRTUAL TABLE resolutions_fts USING fts5(subject, body);

CREATE TABLE topics (id INTEGER PRIMARY KEY, label TEXT);
CREATE TABLE eras (name TEXT PRIMARY KEY, start_year INTEGER, end_year INTEGER);

-- user-generated data (the interactive part of the HCI project)
CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  resolution_number INTEGER NOT NULL REFERENCES resolutions(number),
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, resolution_number)
);
CREATE TABLE clause_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  clause_id INTEGER NOT NULL REFERENCES clauses(id),
  suggested_category TEXT,
  suggested_binding INTEGER,
  comment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
