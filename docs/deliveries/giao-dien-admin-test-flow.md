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
2. **Menu 24 mục.** Admin thấy đủ các nhóm; mục chưa có màn hiện "Tính năng chưa có" cùng một dòng mục đích và "Dự kiến: …".

Chưa kiểm được ở M0, vì chưa có màn nào dùng (`useDirtyForm`, `useDialogDirtyClose`, `useKeptDraft`) — các test đơn vị đã phủ, nhưng chưa có gì để bấm:

- Hộp "Rời trang?" khi rời form đang sửa dở (hỏi một lần, "Ở lại" giữ chữ, "Rời trang" thì sang trang kia và không hỏi lại; đổi bộ lọc, đổi tab, hoặc rời sau
  khi vừa lưu thì không hỏi). **Kiểm ở màn Prompt, mục M1a bên dưới.**
- Thanh "Bạn có thay đổi chưa lưu từ lần trước." với [Khôi phục] [Bỏ] sau khi phiên hết hạn giữa lúc sửa (để form có chữ chưa lưu, đổi mật khẩu của chính tài khoản đó
  bằng API ở cửa sổ khác, bấm lưu → về trang đăng nhập; đăng nhập lại → thanh hiện). **Kiểm ở màn Prompt, mục M1a bên dưới** (Settings ở M2 kiểm lại).

## M1a — AI: Prompt (A/82)

Đăng nhập bằng admin, mở **AI › Prompt** (`/ai/prompts`). Chưa cần model cho thao tác.

1. **Hỏi "Rời trang?".** Sửa một chữ trong ô "Lời dặn". Bấm **AI › Tình trạng** ở menu. → Hộp "Rời trang?" hiện một lần. Bấm [Ở lại] → vẫn ở
   Prompt, chữ vừa sửa còn nguyên. Bấm lại mục menu, chọn [Rời trang] → sang Tình trạng, không hỏi lần nữa. Quay lại Prompt → chữ cũ (bản đã
   lưu), không có thanh khôi phục.
2. **Không hỏi khi chỉ đổi thao tác hay khi vừa lưu.** Sửa "Lời dặn", rồi đổi ô "Thao tác" sang "Tra từ bằng AI" → URL thành `?op=lookup_word`,
   không có hộp hỏi. Đổi về "Sinh câu điền từ" → thanh "Bạn có thay đổi chưa lưu từ lần trước." hiện (chữ sửa dở của thao tác đó được giữ).
   Bấm [Bỏ] → thanh mất, ô là chữ đã lưu. Sửa lại, bấm [Lưu] → "Đã lưu bản số N."; bấm một mục menu → sang ngay, không hỏi.
3. **Thanh khôi phục sau khi phiên kết thúc.** Sửa "Lời dặn" (đừng lưu). Mở một tab thứ hai cùng trình duyệt vào admin, bấm Đăng xuất ở tab đó.
   → Tab đang sửa về trang đăng nhập, không có hộp "Rời trang?". Đăng nhập lại ở tab đang sửa → về đúng `/ai/prompts`, ô là chữ đã lưu, phía
   trên có "Bạn có thay đổi chưa lưu từ lần trước." [Khôi phục] [Bỏ]. Bấm [Khôi phục] → chữ sửa dở quay lại, thanh mất, [Lưu] bấm được.
4. **Chạy thử khi chưa có model.** Bấm [Chạy thử] → "Thao tác này chưa có model. Chọn model ở Thao tác." và nút "Mở Thao tác" dẫn sang `/ai/operations`.
   Dòng "Còn …/20 lần chạy thử trong giờ này (dùng chung với Bộ ví dụ)" được đọc lại sau lần bấm này (design §6.4: lần lỗi cũng trừ lượt, nên số giảm một).
