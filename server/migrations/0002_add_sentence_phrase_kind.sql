-- Migration 0002: thêm kind 'sentence' (tab Câu) và 'phrase' (tab Cụm từ).
-- Cột `kind` không có CHECK constraint (xem 0001) nên 2 kind mới này không cần đổi gì ở DB —
-- chỉ cần thêm cột `extra` để chứa các field riêng (subType, linkedInfo, slotType, replaceableWith,
-- canPluginInto, exampleReuse), validate ở server/index.js.

ALTER TABLE content_items ADD COLUMN extra TEXT NULL; -- JSON string, chỉ Sentence/Phrase
