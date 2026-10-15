-- Migration 0005: chặn trùng nội dung ở tầng DB (trước đây chỉ dedupe theo id, nên 2 bản ghi khác id
-- nhưng cùng nội dung vẫn lọt qua — xem lịch sử dọn dữ liệu trùng trước migration này).
-- So khớp không phân biệt hoa/thường và khoảng trắng đầu/cuối (lower(trim(...))), riêng theo từng kind
-- vì "formula" dùng chung cho pattern/sentence/phrase (không nên coi 1 sentence và 1 phrase trùng chữ
-- là trùng nhau).

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_items_word_english
  ON content_items (lower(trim(english)))
  WHERE kind = 'word';

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_items_sentence_formula
  ON content_items (lower(trim(formula)))
  WHERE kind = 'sentence';

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_items_phrase_formula
  ON content_items (lower(trim(formula)))
  WHERE kind = 'phrase';

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_items_pattern_formula
  ON content_items (lower(trim(formula)))
  WHERE kind = 'pattern';
