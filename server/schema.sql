-- Chạy trên database `laravel` đã có sẵn (không CREATE DATABASE, chỉ tạo bảng).
-- mysql -h 127.0.0.1 -P 3322 -u root -ppassword laravel < server/schema.sql

-- Mỗi field của Word/Pattern (xem src/types.ts) có 1 cột riêng, thay vì gộp hết vào 1 cột JSON.
-- Cột nào chỉ thuộc "word" hoặc chỉ thuộc "pattern" thì để NULL ở dòng thuộc kind còn lại.
-- Riêng collocations / examples (mảng {en,vi}) / etymology (nested: root, word_family,
-- common_confusions, example_sentences, additional_notes...) vẫn giữ JSON vì là dữ liệu
-- lồng nhau, tách thành bảng riêng sẽ tốn công hơn lợi ích thu được.
CREATE TABLE IF NOT EXISTS content_items (
  id            VARCHAR(191)  NOT NULL PRIMARY KEY,
  kind          ENUM('word', 'pattern') NOT NULL,
  topic         VARCHAR(191)  NULL,

  -- Word
  english       VARCHAR(191)  NULL,
  ipa           VARCHAR(191)  NULL,
  vietnamese    VARCHAR(500)  NULL,
  word_type     VARCHAR(20)   NULL,   -- 'type' là từ khoá SQL nên đặt tên cột khác
  example       TEXT          NULL,
  example_vi    TEXT          NULL,
  note          TEXT          NULL,
  collocations  JSON          NULL,
  etymology     JSON          NULL,

  -- Pattern
  formula       VARCHAR(500)  NULL,
  meaning_vi    VARCHAR(500)  NULL,
  examples      JSON          NULL,

  -- Dùng chung
  image         MEDIUMTEXT    NULL,   -- emoji, URL, hoặc data URI base64 (ảnh nén)

  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kind (kind),
  INDEX idx_topic (topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS item_progress (
  item_id           VARCHAR(191)  NOT NULL PRIMARY KEY,
  day               TINYINT       NOT NULL DEFAULT 1,   -- 1..5 = tầng Leitner, 6 = Đã thuộc
  correct_streak    INT           NOT NULL DEFAULT 0,
  wrong_count       INT           NOT NULL DEFAULT 0,
  last_reviewed_at  BIGINT        NULL,                 -- epoch ms, khớp với progress.ts cũ
  history           JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  CONSTRAINT fk_progress_item FOREIGN KEY (item_id) REFERENCES content_items(id) ON DELETE CASCADE,
  INDEX idx_day (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Trạng thái tổng (streak học liên tiếp) — chỉ 1 dòng vì single-user, không cần bảng users.
CREATE TABLE IF NOT EXISTS app_state (
  id                TINYINT       NOT NULL PRIMARY KEY DEFAULT 1,
  streak            INT           NOT NULL DEFAULT 0,
  last_study_date   DATE          NULL,
  CONSTRAINT chk_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO app_state (id, streak, last_study_date)
VALUES (1, 0, NULL)
ON DUPLICATE KEY UPDATE id = id;
