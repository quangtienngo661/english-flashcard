# Giao diện admin — tài liệu kiểm (theo mốc)

Design [`../superpowers/specs/2026-10-27-giao-dien-admin-design.md`](../superpowers/specs/2026-10-27-giao-dien-admin-design.md), plan tóm tắt
và as-built [`giao-dien-admin.md`](giao-dien-admin.md). Mỗi mốc một mục: **làm gì → thấy gì**. Khung Figma: file `7HcPAKLrWu32C27qYMJUOA`.
Kiểm cả tiếng Việt và tiếng Anh, cửa sổ rộng và hẹp (390px).

## 0. Dựng stack thật trên máy (PowerShell; để chạy `pnpm test:e2e:real` hoặc tự kiểm tay)

Cổng 3000, 3100, 5173 và 5183 có thể đang bị phiên khác dùng; runbook này dùng cổng riêng (API 3300, admin 5203).

1. Docker Desktop chạy, rồi ở thư mục gốc: `docker compose up -d` (Postgres 5434, Redis 6380, Mailpit).
   **Hộp thư thử (Mailpit): http://localhost:8025** — mail OTP và mail mật khẩu tạm của tài khoản mới nằm ở đó.
2. Tạo DB riêng (chỉ cần một lần):
   ```powershell
   docker compose exec -T postgres psql -U dev -d english_learning -c "CREATE DATABASE english_learning_admin_e2e"
   ```
3. Tạo file môi trường của API, `apps/api/.env` (chép từ `.env.example`; mỗi chỗ `REPLACE_WITH_…` là một giá trị mới từ
   `node scripts/gen-secret.mjs`, `JWT_KEYS` giữ tiền tố `k1:`). Các giá trị khác mặc định:
   `DATABASE_URL=postgresql://dev:dev@localhost:5434/english_learning_admin_e2e`, `JOB_QUEUE_PREFIX=wordmet-admin-e2e`,
   `AI_FAKE_ENABLED=true`, `OPENAI_API_KEY` và `ANTHROPIC_API_KEY` để trống, `CORS_ORIGINS=http://localhost:5203`,
   `ADMIN_APP_URL=http://localhost:5203`, `LEARNER_APP_URL=http://localhost:5204`, `TERMS_VERSION=2026-10-20`,
   `MAINTENANCE_ENABLED=false`, `PROBLEM_TYPE_BASE=http://localhost:3300/problems/`. File này không bao giờ commit.
4. Trong `apps/api`: `pnpm db:setup`, `pnpm build`, rồi chạy API và worker (hai cửa sổ), cả hai với `PORT=3300`:
   ```powershell
   $env:PORT = "3300"; node dist/main.js
   $env:PORT = "3300"; node dist/worker.js
   ```
5. Test tự động, trong `apps/admin`:
   ```powershell
   $env:E2E_API_URL = "http://localhost:3300"; $env:E2E_API_DIR = "../api"; $env:ADMIN_E2E_PORT = "5203"; pnpm test:e2e:real
   ```
   Không đặt biến nào thì dùng cổng mặc định như CI (API 3000, admin 5173). Mỗi lần chạy tạo tài khoản mới có đuôi `-<run>`: admin, một
   người học, Minh (editor), Lan và Khoa (người học, đã chọn tiếng mẹ đẻ `vi`); mật khẩu nằm ở `apps/admin/e2e-real/.state.json`
   (file này không commit).
6. Tự kiểm tay: `pnpm build:e2e` với `VITE_API_BASE_URL=http://localhost:3300`, rồi `pnpm preview --port 5203` và mở http://localhost:5203.
   Đăng nhập bằng một tài khoản trong `.state.json`.
7. Xong thì tắt API, worker và preview của riêng bạn (theo PID), không tắt tiến trình của phiên khác.

## M0 — Khung chung

1. **Editor mở trang chỉ admin dùng.** Đăng nhập bằng Minh (editor). Gõ thẳng `/staff` trên thanh địa chỉ. → URL vẫn là `/staff`, tiêu đề
   "Vai trò & staff" còn đó, dưới tiêu đề là "Bạn không có quyền xem trang này." và nút "Về trang chủ"; không bị chuyển đi im lặng. Bấm nút
   → về `/uploads`. Khung Figma A/71e (node `387:1767`). Menu bên trái của Minh chỉ có các mục của editor (không có Vai trò & staff,
   Người dùng, Giao dịch, AI).
2. **Rời form đang sửa dở chỉ hỏi một lần.** Đăng nhập admin, mở một form có ô nhập (ví dụ `/sources/new`), gõ vài chữ rồi bấm một mục menu khác.
   → hiện hộp "Rời trang?" với "Thay đổi chưa lưu sẽ mất."; bấm "Ở lại" thì còn nguyên chữ đã gõ, bấm "Rời trang" thì sang trang kia và không
   hỏi lần nữa. Đổi bộ lọc hoặc đổi tab trong danh sách, hoặc rời sau khi vừa lưu, thì không hỏi.
3. **Menu 24 mục.** Admin thấy đủ các nhóm; mục chưa có màn hiện "Tính năng chưa có" cùng một dòng mục đích và "Dự kiến: …".
4. **Phiên hết hạn giữa lúc sửa** (tùy chọn): để form có chữ chưa lưu, đổi mật khẩu của chính tài khoản đó bằng API ở cửa sổ khác, bấm lưu
   → về trang đăng nhập; đăng nhập lại → form hiện thanh "Bạn có thay đổi chưa lưu từ lần trước." với [Khôi phục] [Bỏ].
