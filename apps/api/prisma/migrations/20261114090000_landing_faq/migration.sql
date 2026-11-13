-- Giao diện mới M8 (§10.7): questions and answers of the home page, edited in the admin app and read by the web at build time.

-- CreateTable
CREATE TABLE "landing_faq_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "position" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "row_version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "landing_faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landing_faq_items_published_position_idx" ON "landing_faq_items"("published", "position");

-- The six drafted items (plan M8.1), published so the home page shows them from the first deploy; the owner checks them in admin (QM8-6).
-- Answers of rows 20, 50 and 60 were rewritten after checking them against the code (rulings R174–R176). NULL authors = seeded here.
INSERT INTO "landing_faq_items" ("position", "question", "answer", "published", "created_at", "updated_at") VALUES
  (10, 'Gói Pro có tự gia hạn không?', 'Không. Bạn trả một lần cho mỗi kỳ 1, 3 hoặc 12 tháng. Hết kỳ, tài khoản về gói Miễn phí và Wordmet không tự trừ tiền.', true, now(), now()),
  (20, 'Hết Pro thì từ và lịch ôn có mất không?', 'Không. Từ, nhóm và lịch ôn của bạn vẫn còn, và bạn vẫn ôn thẻ như trước. Bạn học tiếp với giới hạn của gói Miễn phí, ví dụ 3 phiên luyện mỗi ngày và ít lượt AI hơn mỗi tháng.', true, now(), now()),
  (30, 'Dùng trên điện thoại được không?', 'Được. Wordmet chạy trên trình duyệt của điện thoại và máy tính, không cần cài ứng dụng. Từ và lịch ôn giống nhau trên mọi máy.', true, now(), now()),
  (40, 'Mua thêm khi Pro còn hạn thì sao?', 'Kỳ mới bắt đầu ngay sau khi kỳ đang dùng kết thúc, nên bạn không mất ngày nào.', true, now(), now()),
  (50, 'Có được hoàn tiền không?', 'Không. Wordmet không hoàn tiền sau khi đã thanh toán, kể cả thời gian chưa dùng. Nếu thanh toán gặp sự cố, gửi email tới support@wordmet.com kèm email tài khoản và nội dung chuyển khoản (mã bắt đầu bằng WM).', true, now(), now()),
  (60, 'AI có chấm bài của tôi không?', 'Không. AI chỉ soạn câu luyện và các đáp án được chấp nhận. Câu trả lời của bạn được chấm theo quy tắc cố định, nên cùng một câu trả lời luôn có cùng kết quả.', true, now(), now());
