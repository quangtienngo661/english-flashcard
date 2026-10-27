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
  khi vừa lưu thì không hỏi). **Kiểm đầu tiên ở màn Prompt (M1a).**
- Thanh "Bạn có thay đổi chưa lưu từ lần trước." với [Khôi phục] [Bỏ] sau khi phiên hết hạn giữa lúc sửa (để form có chữ chưa lưu, đổi mật khẩu của chính tài khoản đó
  bằng API ở cửa sổ khác, bấm lưu → về trang đăng nhập; đăng nhập lại → thanh hiện). **Kiểm đầu tiên ở màn Settings (M2).**

## M3 — Báo lỗi

Chuẩn bị: stack thật với `AI_FAKE_ENABLED=true` (không có khóa OpenAI / Anthropic). Chạy `pnpm test:e2e:real` một lần thì bộ test tự dựng dữ liệu (xem dưới);
muốn tự bấm thì làm theo các bước dưới bằng tài khoản Lan (người học), Minh (editor), admin trong `.state.json`.

Dữ liệu cần có (bộ test `m3.real.spec.ts` dựng bằng chính API, không ghi thẳng DB): 3 từ riêng đã publish; Lan là Pro; một lý do báo lỗi riêng có trả lượt; Lan có một câu
điền chỗ trống do AI sinh đã trả lời và báo lỗi bằng lý do đó; một dạng chia (`<từ>ment`) mà AI đã dùng nhưng bảng chưa có.

1. **Minh xác nhận lỗi.** Đăng nhập Minh → menu "Báo lỗi". → Danh sách mặc định lọc "Chưa xử lý". Mở ô "Lý do", chọn lý do riêng → còn đúng một dòng (nguồn "Câu AI").
   Bấm tên từ → panel bên phải hiện câu hỏi, câu trả lời của Lan, ghi chú của Lan, "Thông tin AI", dòng "Xác nhận lỗi sẽ trả lại 1 lượt câu AI cho người học." và ba nút.
   Bấm [Xác nhận lỗi] → panel đổi sang dòng "Đã xử lý" kèm "Đã trả lại 1 lượt câu AI", hai nút biến mất. Đóng panel → danh sách (đã lọc) không còn dòng đó.
   Kiểm thêm: số lượt AI của Lan (`GET /v1/me/entitlements`, `pools.ai_practice.remaining`) tăng đúng 1. Khung Figma A/73, A/73e, A/74, A/74c.
2. **Admin xem Trả lượt.** Đăng nhập admin → menu "Trả lượt". Gõ email Minh vào "Email người xử lý" → [Lọc]. → Có dòng của báo lỗi vừa xử lý: người học là email Lan, người xử lý
   là email Minh, vai trò "editor", "Đã trả". Bấm "Xem báo lỗi" → mở đúng báo lỗi đó. Dưới bảng có dòng "Không thu hồi được lượt đã trả." (A/76).
3. **Admin thêm rồi tắt một lý do.** Menu "Lý do báo lỗi" → [Thêm lý do] → nhập mã (ví dụ `thu_m3`), tên tiếng Việt, tên tiếng Anh → [Lưu]. → Hộp đóng, bảng có dòng mới,
   công tắc "Đang dùng" bật. Tắt công tắc → tải lại trang vẫn tắt (và người học không còn thấy lý do này khi báo lỗi). Bấm "Sửa" ở một dòng → hộp "Sửa lý do báo lỗi" (A/75, A/75b).
   Thử nhập mã đã có → lỗi hiện ngay dưới ô mã.
4. **Minh nhận một dạng chia.** Đăng nhập Minh → menu "Dạng chia chưa biết" (A/77). → Có dòng `<từ>` / `<từ>ment` với số lần bị loại. Bấm [Nhận dạng này] → toast
   "Đã thêm “…” vào dạng chia của “…”." có nút [Hoàn tác], dòng biến khỏi danh sách. Bấm [Hoàn tác] → toast "Đã gỡ “…” khỏi dạng chia của “…”.".
   (Chưa kiểm bằng test thật: sau Hoàn tác dòng có quay lại danh sách hay không; xem bằng mắt.) Khi bảng trống: "Chưa có dạng chia nào cần xem." (A/77b).
5. **Editor không thấy màn của admin.** Minh gõ thẳng `/refunds` hoặc `/report-reasons` → "Bạn không có quyền xem trang này." và menu của Minh không có hai mục đó; Minh vẫn có
   "Báo lỗi" và "Dạng chia chưa biết".
6. **Phone 390.** Mở bốn màn ở chiều rộng 390 (hoặc xem ảnh trong `docs/deliveries/giao-dien-admin/m3/`) → không cuộn ngang, bảng thành thẻ.

Khi một báo lỗi đang mở ở bên phải, bảng bên trái chỉ còn ba cột Từ, Lý do, Trạng thái; đóng panel thì đủ 8 cột.
