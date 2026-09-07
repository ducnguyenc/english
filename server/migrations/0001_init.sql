-- Migration 0001: schema khởi tạo ban đầu — content_items (word/pattern), item_progress, app_state.

CREATE TABLE IF NOT EXISTS content_items (
  id            TEXT          NOT NULL PRIMARY KEY,
  -- Không CHECK(kind IN (...)) cố định — SQLite không cho ALTER CHECK constraint mà không rebuild
  -- cả bảng, nên danh sách kind hợp lệ ('word' | 'pattern' | 'sentence' | 'phrase' | ...) được validate
  -- ở tầng ứng dụng (server/index.js) để thêm kind mới chỉ cần sửa code, không cần migration rebuild bảng.
  kind          TEXT          NOT NULL,
  topic         TEXT          NULL,

  -- Word
  english       TEXT          NULL,
  ipa           TEXT          NULL,  -- dùng chung: word / sentence / phrase
  vietnamese    TEXT          NULL,
  word_type     TEXT          NULL,
  example       TEXT          NULL,
  example_vi    TEXT          NULL,
  note          TEXT          NULL,  -- dùng chung
  collocations  TEXT          NULL,  -- JSON string
  etymology     TEXT          NULL,  -- JSON string

  -- Pattern / Sentence (phrase) / Phrase (chunk) — dùng chung cột "formula"
  formula       TEXT          NULL,
  meaning_vi    TEXT          NULL,  -- Pattern.meaningVi / Sentence.meaningVn / Phrase.meaningVn
  examples      TEXT          NULL,  -- JSON string, chỉ Pattern

  -- Dùng chung
  image         TEXT          NULL,  -- emoji, URL, hoặc data URI base64

  created_at    TEXT          NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT          NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kind  ON content_items(kind);
CREATE INDEX IF NOT EXISTS idx_topic ON content_items(topic);

CREATE TABLE IF NOT EXISTS item_progress (
  item_id           TEXT    NOT NULL PRIMARY KEY,
  day               INTEGER NOT NULL DEFAULT 1,
  correct_streak    INTEGER NOT NULL DEFAULT 0,
  wrong_count       INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at  INTEGER NULL,
  history           TEXT    NOT NULL DEFAULT '[]',
  FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_day ON item_progress(day);

CREATE TABLE IF NOT EXISTS app_state (
  id              INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
  streak          INTEGER NOT NULL DEFAULT 0,
  last_study_date TEXT    NULL,
  CHECK (id = 1)
);

INSERT OR IGNORE INTO app_state (id, streak, last_study_date) VALUES (1, 0, NULL);
