-- UI copy round 2 (docs/audit/2026-11-14-ui-copy, decision Q12): the home page FAQ answers the learner's problems instead of payment
-- questions. Payment answers (auto-renewal, buying while Pro is active, refunds) stay on the Plans page and in the Terms.
-- Replaces the seeded rows (created_by NULL) only while nobody has edited any of them in admin (updated_by NULL). If an admin already
-- edited a seeded row, the FAQ is left exactly as it is (nothing deleted, nothing inserted) and the owner updates it in admin instead.
DELETE FROM "landing_faq_items" WHERE "created_by" IS NULL AND "updated_by" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "landing_faq_items" WHERE "created_by" IS NULL AND "updated_by" IS NOT NULL);

INSERT INTO "landing_faq_items" ("position", "question", "answer", "published", "created_at", "updated_at")
SELECT v.position, v.question, v.answer, v.published, v.created_at, v.updated_at FROM (VALUES
  (10, 'Wordmet giúp mình học từ vựng thế nào?', 'Wordmet lo phần ghi nhớ để bạn dành thời gian dùng từ. Bạn lưu từ mới gặp, Wordmet tra sẵn nghĩa, phiên âm, câu ví dụ và xếp lịch ôn cho từng từ. Mỗi ngày bạn ôn những từ đến hạn và luyện chúng trong câu.', true, now(), now()),
  (20, 'Học rồi vẫn quên, hoặc biết nghĩa mà không dùng được thì sao?', 'Wordmet nhắc bạn ôn đúng lúc sắp quên, nhớ rồi thì giãn dần. Khi luyện, bạn điền và gõ từ vào câu chứ không chỉ chọn nghĩa. Những từ hay sai được gom lại để luyện riêng.', true, now(), now()),
  (30, 'Mình nên bắt đầu từ đâu?', 'Bắt đầu từ những từ bạn đang gặp khi đọc hay xem phim, hoặc chọn một nhóm từ có sẵn theo chủ đề và trình độ. Sau đó, trang Hôm nay cho biết mỗi ngày cần ôn gì.', true, now(), now()),
  (40, 'AI giúp gì, và có đáng tin không?', 'AI viết câu luyện cho từ bạn học và tra nghĩa khi từ điển chưa có. Câu trả lời của bạn được chấm theo đáp án định sẵn, nên kết quả công bằng và nhất quán. Thấy câu nào sai, bạn báo lỗi để đội Wordmet xem lại.', true, now(), now()),
  (50, 'Gói Miễn phí và Pro khác nhau thế nào?', 'Gói Miễn phí đủ để học hằng ngày: ghi từ, tra nghĩa, ôn thẻ và luyện tập. Pro dành cho người muốn luyện nhiều hơn, có AI viết câu luyện cho từng từ, tra bằng AI và không quảng cáo.', true, now(), now()),
  (60, 'Nghĩa và câu ví dụ trong Wordmet lấy từ đâu?', 'Từ điển của Wordmet dựa trên các bộ dữ liệu có giấy phép mở, và mỗi nghĩa được đội Wordmet duyệt trước khi đến tay người học. Danh sách nguồn có ở trang Nguồn dữ liệu. Nghĩa do AI gợi ý luôn có nhãn riêng để bạn kiểm lại.', true, now(), now())
) AS v("position", "question", "answer", "published", "created_at", "updated_at")
WHERE NOT EXISTS (SELECT 1 FROM "landing_faq_items" WHERE "created_by" IS NULL);
