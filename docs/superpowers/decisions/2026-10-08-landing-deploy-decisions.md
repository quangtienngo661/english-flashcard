# Decisions — Deploy landing Wordmet lên Cloudflare, lưu waitlist bằng D1

Design: `docs/superpowers/specs/2026-10-08-landing-deploy-design.md`. Chốt ngày 08/10/2026.

## Tóm tắt

| # | Quyết định | Chọn | Ai chốt |
|---|---|---|---|
| DP1 | Nơi lưu email waitlist | Cloudflare D1 | Chủ dự án |
| DP2 | Chống spam form | Honeypot + 1 rate limiting rule của Cloudflare | Chủ dự án |
| DP3 | Cách deploy | Workers Builds | Chủ dự án |
| DP4 | Trang Chính sách bảo mật | Bản ngắn nhưng thật cho việc thu email; bật lại link tới `/privacy` | Chủ dự án |
| DP5 | Cho Google index | Mở ngay khi lên `wordmet.com` | Chủ dự án |
| DP6–DP10 | Cấu hình deploy (tắt preview build, `www` → apex, 20 req/10 s/IP, Email Routing) | Theo đề xuất; email cá nhân `ryan.ngo@` | Chủ dự án duyệt đề xuất của trợ lý |
| DP11 | `proxy.ts` trên Worker | Giữ nguyên; chỉ đổi thành `middleware.ts` khi chạy thật bị lỗi | Chủ dự án |
| — | Email công việc | Cloudflare Email Routing (miễn phí, chỉ nhận); chưa mua Google Workspace | Chủ dự án |

## DP1 — Nơi lưu email waitlist

Bối cảnh: landing chưa có BE/DB; form đang lưu vào bộ nhớ (mất khi restart); design landing cấm deploy như vậy (LPE12).

| Phương án | Trade-off |
|---|---|
| ✅ A. Cloudflare D1 | Miễn phí (100.000 ghi/ngày, 5 GB), cùng chỗ FE, không giữ bí mật; buộc FE chạy trên Workers; sau này chép sang Postgres một lần |
| B. Neon Postgres, FE ghi thẳng | Đúng DB tương lai, không phải chép; FE giữ chuỗi kết nối DB; lệch quy ước chỉ BE chạm bảng |
| C. Resend Contacts | Có sẵn danh sách gửi thư ra mắt; giới hạn gói Free không tìm thấy; dữ liệu ở bên thứ ba, giữ API key |
| D. Tạm bỏ form | Không lưu gì; mất người đăng ký |

Vòng 1: chủ dự án hỏi "chỉ chạy khi FE nằm trên Workers; chép sang Postgres" nghĩa là gì; trợ lý giải thích. Vòng 2: chọn
A, "việc đó tính sau" (chép sang Postgres).

## DP2 — Chống spam

| Phương án | Trade-off |
|---|---|
| ✅ 1. Honeypot + 1 rate limiting rule (Free: theo IP, chu kỳ 10 giây) | Không đổi UI, không bí mật; không chặn bot nhiều IP; luật lọc theo path nên đếm cả lượt xem trang |
| 2. Cách 1 + Turnstile | Chặn bot tốt hơn; thêm widget, khoá bí mật, test, script bên ngoài |
| 3. Chỉ honeypot | Không làm gì; dễ bị spam nhất |

## DP3 — Cách deploy

| Phương án | Trade-off |
|---|---|
| ✅ a. Workers Builds | Không giữ API token ở GitHub; khớp luồng merge qua PR; phải cấu hình monorepo trên Cloudflare |
| b. GitHub Actions + `wrangler deploy` | Mọi thứ trong `ci.yml`; phải tạo và cất Cloudflare API token |
| c. Deploy tay | Đơn giản nhất; dễ deploy nhầm code chưa qua CI |

Vòng 1: chủ dự án yêu cầu kiểm tra giới hạn build Free. Kết quả: 3.000 phút/tháng, 20 phút/build, 2 vCPU, 8 GB RAM, 1 build
cùng lúc; mặc định Node 24.18.0 và pnpm 10.11.1, ghim được bằng `NODE_VERSION`/`PNPM_VERSION`. Vòng 2: chọn a.

## DP4 — Chính sách bảo mật

| Phương án | Trade-off |
|---|---|
| ✅ i. Bản ngắn nhưng thật cho việc thu email | Trung thực, đủ cho giai đoạn waitlist; không phải văn bản pháp lý chuyên nghiệp |
| ii. Giữ bản nháp | Không tốn công; thu email thật dưới chính sách "nháp" |

Bổ sung khi duyệt design: chủ dự án nhắc link chính sách trong câu đồng ý đã bị khoá; design thêm việc bật lại link đó và
link ở footer.

## DP5 — Index

| Phương án | Trade-off |
|---|---|
| ✅ x. Mở ngay | Tìm được tên Wordmet, người xét đơn startup thấy sản phẩm thật; Google lưu bản đầu dù còn lỗi |
| y. Chặn, tự mở sau | An toàn hơn; phải nhớ build lại; lúc chờ không tìm thấy |

## DP11 — `proxy.ts`

Bối cảnh: mã nguồn OpenNext ghi Node middleware chưa được hỗ trợ trên Cloudflare; design bản đầu đề xuất đổi tên ngay.

| Phương án | Trade-off |
|---|---|
| Đổi thành `middleware.ts` ngay | Chắc chạy trên edge; dùng dạng Next 16 coi là cũ |
| ✅ Giữ `proxy.ts`, đổi khi deploy lỗi | Không đổi code khi chưa có bằng chứng; có thể phải sửa thêm một vòng sau lần chạy thử |

## Email công việc

| Phương án | Trade-off |
|---|---|
| Google Workspace Starter (8,40 USD/tháng) | Hộp thư thật, gửi được từ domain; chiếm ~90% chi phí giai đoạn thử |
| ✅ Cloudflare Email Routing | Miễn phí, không giới hạn thư nhận (trang giá Cloudflare); chỉ nhận, gửi đi cần cách khác |

## Đề xuất kỹ thuật duyệt cùng design

- Chọn: `WaitlistStore` D1 nhận `D1Database` từ ngoài; `INSERT … ON CONFLICT DO NOTHING` và `meta.changes` cho
  `created`/`exists`; chuẩn hoá email trim + lowercase; `catch` ghi log không có email; bảng 3 cột; migration bằng
  `wrangler d1 migrations`, chạy tay trên remote; unit test D1 thật qua `getPlatformProxy()`; e2e chạy trên `pnpm preview`
  (runtime Worker); `.node-version` 24.11.0.
- Bỏ: R2/ISR cache của OpenNext (trang tĩnh); backup riêng (dùng D1 Time Travel 7 ngày); tự chạy migration trong Workers
  Builds; Turnstile; thư xác nhận.
