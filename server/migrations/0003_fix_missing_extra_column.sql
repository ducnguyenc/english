-- Migration 0003: một số DB đã được bootstrap (đánh dấu 0001, 0002 "đã áp dụng" mà không thực sự
-- chạy — xem nhánh bootstrap trong migrate.js) nên cột `extra` từ migration 0002 chưa tồn tại thực
-- tế, gây lỗi "table content_items has no column named extra". Migration này bù lại cột đó.
-- Idempotent: chỉ ALTER khi cột chưa có, để chạy an toàn trên cả DB đã có `extra` lẫn DB thiếu cột.

ALTER TABLE content_items ADD COLUMN extra TEXT NULL; -- JSON string, chỉ Sentence/Phrase
