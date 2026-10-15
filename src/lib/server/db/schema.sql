-- nyoba · skema SQLite v1
-- Dijalankan sekali pas app.db masih kosong (PRAGMA user_version = 0).
-- Semua waktu disimpan sebagai teks ISO 8601 UTC, contoh '2026-10-15T10:00:00Z'.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 📚 Pustaka referensi -------------------------------------------------------

CREATE TABLE refs (
  key           TEXT PRIMARY KEY,                 -- lazuardi2024
  type          TEXT NOT NULL CHECK (type IN ('jurnal', 'prosiding', 'standar', 'skripsi', 'tesis', 'web')),
  year          INTEGER,
  title         TEXT NOT NULL,
  venue         TEXT,                             -- jurnal / penerbit / institusi
  volume_issue  TEXT,                             -- '12(3)'
  pages         TEXT,                             -- '33-41'
  doi           TEXT,
  url           TEXT,
  read_status   TEXT NOT NULL DEFAULT 'Belum dibaca'
                CHECK (read_status IN ('Belum dibaca', 'Dibaca sekilas', 'Dibaca penuh')),
  verified      INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  notes         TEXT,                             -- catatan kritis
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  CHECK (key GLOB '[a-z]*[0-9][0-9][0-9][0-9]*')
);

CREATE TABLE ref_authors (
  ref_key       TEXT NOT NULL REFERENCES refs(key) ON DELETE CASCADE ON UPDATE CASCADE,
  position      INTEGER NOT NULL,                 -- 0 = penulis pertama
  family        TEXT NOT NULL,                    -- 'Lazuardi'  (atau nama lembaga: 'OWASP Foundation')
  given         TEXT,                             -- 'L'         (NULL untuk nama tunggal / lembaga)
  PRIMARY KEY (ref_key, position)
);

CREATE TABLE ref_files (
  id            INTEGER PRIMARY KEY,
  ref_key       TEXT NOT NULL REFERENCES refs(key) ON DELETE CASCADE ON UPDATE CASCADE,
  path          TEXT NOT NULL UNIQUE,             -- references/lazuardi2024.pdf (relatif ke vault)
  sha256        TEXT NOT NULL UNIQUE,             -- cegah file dobel
  page_count    INTEGER,
  page_offset   INTEGER,                          -- halaman PDF - halaman tercetak, kalau tetap
  created_at    TEXT NOT NULL
);

CREATE INDEX ref_files_ref_key ON ref_files(ref_key);

-- 📌 Sitasi yang nempel ke teks ---------------------------------------------

CREATE TABLE citations (
  id            TEXT PRIMARY KEY,                 -- uuid
  ref_key       TEXT NOT NULL REFERENCES refs(key) ON DELETE RESTRICT ON UPDATE CASCADE,
  file_id       INTEGER REFERENCES ref_files(id) ON DELETE SET NULL,
  doc_path      TEXT NOT NULL,                    -- docs/kolokium/01-bab-1.md
  anchor_text   TEXT NOT NULL,                    -- teks yang diblok
  anchor_before TEXT,                             -- ~40 karakter sebelum, buat cocok ulang
  anchor_after  TEXT,                             -- ~40 karakter sesudah (sebelum marker [@...])
  page_printed  TEXT,                             -- '24' — yang ditulis di naskah
  page_index    INTEGER,                          -- halaman PDF (mulai 1) buat navigasi
  quote         TEXT,                             -- kalimat sumber yang disorot di PDF
  status        TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'lepas')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX citations_ref_key ON citations(ref_key);
CREATE INDEX citations_doc_path ON citations(doc_path);
CREATE INDEX citations_lepas ON citations(status) WHERE status = 'lepas';

-- 🔐 Login ------------------------------------------------------------------

CREATE TABLE sessions (
  id_hash       TEXT PRIMARY KEY,                 -- sha256 dari token di cookie; token aslinya nggak disimpan
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,
  user_agent    TEXT
);

CREATE TABLE login_attempts (
  id            INTEGER PRIMARY KEY,
  ip            TEXT NOT NULL,
  ok            INTEGER NOT NULL CHECK (ok IN (0, 1)),
  at            TEXT NOT NULL
);

CREATE INDEX login_attempts_ip_at ON login_attempts(ip, at);

-- 🔎 Pencarian (dibangun ulang dari vault kapan aja) ------------------------

CREATE VIRTUAL TABLE docs_fts USING fts5(
  doc_path UNINDEXED,
  title,
  body,
  tokenize = 'unicode61 remove_diacritics 2'
);

PRAGMA user_version = 1;
