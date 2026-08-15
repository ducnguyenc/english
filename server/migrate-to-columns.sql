-- Chuyển content_items từ 1 cột `data JSON` sang các cột riêng lẻ.
-- An toàn để chạy nhiều lần: ADD COLUMN IF NOT EXISTS / bỏ qua nếu đã migrate.
-- mysql -h 127.0.0.1 -P 3322 -u root -ppassword laravel < server/migrate-to-columns.sql

-- Lưu ý: chạy 1 lần duy nhất trên mỗi DB — nếu chạy lại lúc cột đã tồn tại, ALTER TABLE
-- sẽ báo lỗi "Duplicate column name" (không dùng IF NOT EXISTS vì bản MySQL đang dùng
-- không hỗ trợ cú pháp này cho ADD COLUMN nhiều cột trong 1 câu lệnh).
ALTER TABLE content_items
  ADD COLUMN english      VARCHAR(191) NULL AFTER topic,
  ADD COLUMN ipa          VARCHAR(191) NULL AFTER english,
  ADD COLUMN vietnamese   VARCHAR(500) NULL AFTER ipa,
  ADD COLUMN word_type    VARCHAR(20)  NULL AFTER vietnamese,
  ADD COLUMN example      TEXT         NULL AFTER word_type,
  ADD COLUMN example_vi   TEXT         NULL AFTER example,
  ADD COLUMN note         TEXT         NULL AFTER example_vi,
  ADD COLUMN collocations JSON         NULL AFTER note,
  ADD COLUMN etymology    JSON         NULL AFTER collocations,
  ADD COLUMN formula      VARCHAR(500) NULL AFTER etymology,
  ADD COLUMN meaning_vi   VARCHAR(500) NULL AFTER formula,
  ADD COLUMN examples     JSON         NULL AFTER meaning_vi,
  ADD COLUMN image        MEDIUMTEXT   NULL AFTER examples;

-- Backfill từ cột `data` cũ (bỏ qua nếu bảng không còn cột này, tức đã migrate xong).
UPDATE content_items
SET
  english      = JSON_UNQUOTE(JSON_EXTRACT(data, '$.english')),
  ipa          = JSON_UNQUOTE(JSON_EXTRACT(data, '$.ipa')),
  vietnamese   = JSON_UNQUOTE(JSON_EXTRACT(data, '$.vietnamese')),
  word_type    = JSON_UNQUOTE(JSON_EXTRACT(data, '$.type')),
  example      = JSON_UNQUOTE(JSON_EXTRACT(data, '$.example')),
  example_vi   = JSON_UNQUOTE(JSON_EXTRACT(data, '$.exampleVi')),
  note         = JSON_UNQUOTE(JSON_EXTRACT(data, '$.note')),
  collocations = JSON_EXTRACT(data, '$.collocations'),
  etymology    = JSON_EXTRACT(data, '$.etymology'),
  formula      = JSON_UNQUOTE(JSON_EXTRACT(data, '$.formula')),
  meaning_vi   = JSON_UNQUOTE(JSON_EXTRACT(data, '$.meaningVi')),
  examples     = JSON_EXTRACT(data, '$.examples'),
  image        = JSON_UNQUOTE(JSON_EXTRACT(data, '$.image'))
WHERE data IS NOT NULL;

-- JSON_UNQUOTE trên giá trị NULL trả về chuỗi "null" chứ không phải NULL thật — dọn lại.
UPDATE content_items SET english = NULL WHERE english = 'null';
UPDATE content_items SET ipa = NULL WHERE ipa = 'null';
UPDATE content_items SET vietnamese = NULL WHERE vietnamese = 'null';
UPDATE content_items SET word_type = NULL WHERE word_type = 'null';
UPDATE content_items SET example = NULL WHERE example = 'null';
UPDATE content_items SET example_vi = NULL WHERE example_vi = 'null';
UPDATE content_items SET note = NULL WHERE note = 'null';
UPDATE content_items SET formula = NULL WHERE formula = 'null';
UPDATE content_items SET meaning_vi = NULL WHERE meaning_vi = 'null';
UPDATE content_items SET image = NULL WHERE image = 'null';

ALTER TABLE content_items DROP COLUMN data;
