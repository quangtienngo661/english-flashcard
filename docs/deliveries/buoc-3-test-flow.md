# Bước 3 — test flow phần hệ thống (kịch bản, chưa chạy)

> **Trạng thái 17/10/2026:** kịch bản chuẩn bị cho plan Task 22, Step 2. **Chưa chạy.** Chỉ chạy sau khi lượt review độc lập code
> Bước 3 đã xong và các lỗi tìm được đã merge vào `dev`. Kết quả ghi vào mục 3–4 khi chạy. G5 (D45): chủ dự án tự báo Bước 3 xong;
> file này chỉ giao kết quả, không tự tuyên bố xong.

## 1. Gate tự động (Task 22, Step 1)

Chạy **khi phiên điều phối cho lượt chạy toàn bộ trên máy** (máy từng hết RAM khi nhiều luồng chạy cùng lúc).

| Ở đâu | Lệnh (PowerShell) |
|---|---|
| `apps/api` | `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test; pnpm test:e2e` |
| `apps/api` (riêng) | `pnpm test:e2e:scale` (Review Focus 5: 100 nhóm × 2.000 từ, `GET /v1/groups` < 500 ms — ngưỡng `ASSUMPTION`) |
| `apps/admin` | `pnpm test; pnpm build:e2e; pnpm test:e2e; pnpm test:e2e:real` |

So số test với cuối Bước 2.5 (API 578 unit + 475 e2e; admin 219 unit + 67 mocked e2e + 7 real-stack e2e — `buoc-2-5.md`).

## 2. Chạy tay (Task 22, Step 2)

**Môi trường:** DB mới (đề xuất `english_learning_b3manual` trên Postgres 5434; DB `english_learning` của chủ dự án không bị
đụng), Redis 6380 với `JOB_QUEUE_PREFIX=wordmet-b3run`, Mailpit (`http://localhost:8025`). `.env` của API cần
`LEARNER_APP_URL` (bắt buộc từ PR #30), `REMINDER_TICK_SECONDS=60`; `REMINDER_RETRY_BACKOFF_MS` để mặc định (60 000, PR #38). Chạy `pnpm db:setup`, `pnpm build`, rồi API + worker
(`pnpm run:dev`). Gọi API trực tiếp (không có giao diện người học ở phần hệ thống).

Nếu chạy trên một DB đã có dữ liệu cũ: gọi `POST /v1/admin/content/inflections/backfill` một lần để các entry cũ có dạng chia
(lưu ý của luồng A).

| # | Bước | Gọi | Quan sát cần ghi |
|---|---|---|---|
| 1 | Tạo admin | Đăng ký qua API, OTP từ Mailpit, `pnpm admin:grant <email>` | `granted` |
| 2 | Nạp file CEFR-J 1.5 thật | Đăng ký nguồn có license, `POST /v1/admin/content/uploads` với `docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`; theo dõi `GET .../uploads/{id}` | Số dòng tạo mới, bị loại; thời gian. File CEFR-J không có cột `inflections`, nên dạng chia đến từ bước 3 |
| 3 | Sinh dạng chia | `POST /v1/admin/content/inflections/backfill` → `GET .../backfill/{id}` tới khi xong | Trạng thái job, số dạng chia sinh ra; xem một entry bất quy tắc (`go`: `went`, `gone`) có đúng không |
| 4 | Xuất "chưa có nghĩa" (B3#15) | `GET /v1/admin/content/entries/export` | File `entries-without-sense.csv`; số dòng ≈ 7.799 (chưa entry nào có nghĩa) |
| 5 | Điền nghĩa cho vài dòng, **bỏ trống cột topics**, upload lại; trong cùng file: một dòng ô `inflections` = `-`, một dòng ghi dạng chia tay (ví dụ `past:went;past_participle:gone` cho `go`) | `POST /v1/admin/content/uploads` | Lô hoàn tất, senses tạo mới khớp entry CEFR-J có sẵn. Dòng `-`: entry không còn dạng chia nào (bản sửa M3 của luồng A). Upload lại đúng file đó lần hai: dạng chia đã duyệt vẫn giữ (H1) |
| 6 | Publish không chủ đề (B3#14, B3E33) | `POST /v1/admin/content/senses/publish` với `items[{sense_id, revision}]` (hoặc qua admin UI) | `published` = số dòng, `refused` 0 (trước Bước 3 sẽ bị `topic-missing`) |
| 7 | Tạo learner | Đăng ký, xác minh OTP, `PATCH /v1/me` `{ native_language: "vi" }` | Không có `native_language` thì 403 `profile-incomplete` |
| 8 | Tra và thêm nhanh từ catalog (B3#8, B3#10, B3E14) | `GET /v1/lookup?q=went` (đã điền nghĩa cho `go`), rồi một dạng chia của từ **chưa có nghĩa** (ví dụ `q=deployed`); `POST /v1/groups`; `POST /v1/quick-add` `{ group_id, sense_id }` | `went` → `via_inflection` có `go` kèm nghĩa. Dạng chia của từ chưa có nghĩa → `via_inflection` vẫn có từ gốc (`entry_id`, `lemma`, `pos`) với `senses: []` (bản sửa M8 của luồng A), không lộ từ riêng của người khác. Mục học mức 0, hẹn hôm nay |
| 9 | Hàng ôn và ôn (B3#2, B3#4, B3#6) | `GET /v1/groups`, `GET /v1/groups/{id}/queue`, `POST /v1/reviews` (`known` / `review`) | Số "hôm nay" trên `GET /v1/groups` giảm; "Cần ôn tập" đưa từ lên đầu hàng |
| 10 | Danh sách cân nhắc (B3#7) | Chỉnh `due_date` một mục mức ≥ 1 về quá 60 ngày (SQL trên DB thử), `GET /v1/groups/{id}/backlog`, `POST /v1/items/relearn` | Mục ở backlog, không ở queue; relearn về mức 0 |
| 11 | Từ riêng (B3#9, B3E17) | `POST /v1/quick-add` với `new_word` + `sentence`; rồi `DELETE /v1/my-words/{id}` | Tạo cùng nhau; xóa sạch cả entry, nghĩa, câu, mục học |
| 12 | Nhắc học: chuẩn bị | Learner A (đã xác minh, còn một thẻ hôm nay), learner B (chưa xác minh, có thẻ). "Vắng mặt" đọc từ `users.last_seen_at`, ghi khi đăng nhập hoặc làm mới phiên (PR #39): A vừa đăng nhập nên nhận email nhắc thường. `PUT /v1/admin/settings` đặt `send_time` = mốc 15 phút kế tiếp theo giờ địa phương của learner | Lịch sử settings ghi người đổi (B3#19) |
| 13 | Nhắc học: chờ qua `send_time` + 1–2 tick (60 giây) | Mailpit | **Đúng một** email cho A (chủ đề `Tới giờ học từ vựng`, link `<LEARNER_APP_URL>/vi/app/settings`, không có từ nào); **không** email cho B; `reminder_deliveries` một dòng `sent` cho A |
| 14 | Chờ thêm vài tick | Mailpit, log worker | Vẫn một email cho A; log `reminder_skipped` không chứa email |
| 15 | Mailpit tắt giữa chừng (tuỳ chọn) | Đặt `send_time` cho learner C, dừng container Mailpit trước tick, bật lại sau ~2 phút | Lỗi kết nối được phân loại "chắc chắn chưa giao" (PR #38): dòng `sending` bị xoá, job thử lại sau 60 giây, rồi 120 giây; Mailpit bật lại kịp thì C nhận đúng một email |

Lưu output (log, file CSV, ảnh Mailpit) để đính vào PR; không commit dữ liệu người dùng.

## 3. Kết quả

_(chưa chạy)_

## 4. Chưa kiểm ở lần này

_(điền khi chạy; ít nhất: B3E32 và B3E34 thuộc plan giao diện; số liệu dung lượng ngoài vài nghìn learner chưa đo; lỗi SMTP 5xx
và lỗi "không rõ" (timeout sau khi đã kết nối) chỉ kiểm bằng e2e với FakeMailer, Mailpit không giả lập được; tần suất M9 với SMTP
thật chỉ đo được ở bước Deploy.)_
