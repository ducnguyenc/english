-- Migration 0004: một số DB được tạo trước khi comment "Không CHECK(kind IN (...)) cố định" ở 0001
-- được viết, nên bảng thật vẫn còn CHECK(kind IN ('word', 'pattern')) — chặn insert sentence/phrase
-- với lỗi "CHECK constraint failed: kind IN ('word', 'pattern')". SQLite không có ALTER/DROP CHECK
-- constraint tại chỗ (không phải thiếu sót của migration này — SQLite chưa từng hỗ trợ việc đó),
-- nên bắt buộc phải rebuild bảng theo đúng quy trình SQLite khuyến nghị: tạo bảng mới không CHECK ->
-- copy dữ liệu -> xoá bảng cũ -> đổi tên -> tạo lại index.
-- Idempotent theo nghĩa: nếu bảng đã không còn CHECK này (DB mới, tạo sau khi sửa 0001) thì việc
-- rebuild vẫn chạy được bình thường, chỉ là dư thừa chứ không lỗi.
--
-- QUAN TRỌNG: kết nối better-sqlite3 của app CÓ bật `foreign_keys` (khác mặc định của sqlite3 CLI),
-- nên DROP TABLE content_items sẽ cascade xoá toàn bộ item_progress đang tham chiếu tới nó (item_id
-- FK ON DELETE CASCADE) — tức là mất sạch tiến độ học nếu không đề phòng. Vì vậy phải backup
-- item_progress trước khi rebuild, rồi restore lại sau khi bảng content_items mới đã có đủ id.

CREATE TABLE item_progress_backup_0004 AS SELECT * FROM item_progress;

CREATE TABLE content_items_new (
  id            TEXT          NOT NULL PRIMARY KEY,
  kind          TEXT          NOT NULL,
  topic         TEXT          NULL,

  english       TEXT          NULL,
  ipa           TEXT          NULL,
  vietnamese    TEXT          NULL,
  word_type     TEXT          NULL,
  example       TEXT          NULL,
  example_vi    TEXT          NULL,
  note          TEXT          NULL,
  collocations  TEXT          NULL,
  etymology     TEXT          NULL,

  formula       TEXT          NULL,
  meaning_vi    TEXT          NULL,
  examples      TEXT          NULL,

  image         TEXT          NULL,

  created_at    TEXT          NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT          NOT NULL DEFAULT (datetime('now')),
  extra         TEXT          NULL
);

INSERT INTO content_items_new
  SELECT id, kind, topic, english, ipa, vietnamese, word_type, example, example_vi, note,
         collocations, etymology, formula, meaning_vi, examples, image, created_at, updated_at, extra
  FROM content_items;

DROP TABLE content_items;
ALTER TABLE content_items_new RENAME TO content_items;

CREATE INDEX IF NOT EXISTS idx_kind  ON content_items(kind);
CREATE INDEX IF NOT EXISTS idx_topic ON content_items(topic);

-- Restore lại tiến độ đã bị cascade-xoá ở bước DROP TABLE content_items phía trên. Chỉ những
-- item_id vẫn còn tồn tại trong content_items mới được restore (khớp đúng ngữ nghĩa FK).
INSERT INTO item_progress (item_id, day, correct_streak, wrong_count, last_reviewed_at, history)
  SELECT item_id, day, correct_streak, wrong_count, last_reviewed_at, history
  FROM item_progress_backup_0004
  WHERE item_id IN (SELECT id FROM content_items);

DROP TABLE item_progress_backup_0004;
