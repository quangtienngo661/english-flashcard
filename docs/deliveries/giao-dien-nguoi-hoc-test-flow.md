# Giao diện người học — tài liệu kiểm (theo mốc)

Design [`../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md`](../superpowers/specs/2026-10-22-giao-dien-nguoi-hoc-design.md) §11 (D4):
chủ dự án tự kiểm bằng tay trên máy Windows theo file này, mỗi mốc một mục. Mỗi bước: **làm gì → thấy gì → khung Figma** (file
`7HcPAKLrWu32C27qYMJUOA`, node id ở [`../mockups/2026-10-22/figma-node-ids.md`](../mockups/2026-10-22/figma-node-ids.md)). Kiểm cả
tiếng Việt và tiếng Anh, sáng và tối, cửa sổ rộng và hẹp (thu cửa sổ dưới 768px, hoặc F12 → chế độ điện thoại 390px).

## 0. Dựng máy (PowerShell, làm một lần)

1. Mở Docker Desktop. Ở thư mục gốc repo:
   ```powershell
   docker compose up -d
   pnpm install --frozen-lockfile
   ```
   Postgres ở cổng 5434, Redis 6380, Mailpit (hộp thư thử) ở http://localhost:8025.
2. `apps/api/.env` (chép từ `.env.example` nếu chưa có), kiểm các dòng. Bản `.env` tạo trước 21/10 **thiếu** `ADMIN_APP_URL`,
   `LEARNER_APP_URL`, `TERMS_VERSION`, nên API không khởi động ("Missing or invalid configuration variables"); chép ba dòng đó từ `.env.example`.
   - `CORS_ORIGINS` có `http://localhost:3001` (app người học) và `http://127.0.0.1:5173` (admin mở bằng IP, mục 6);
   - `AI_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true` và `BILLING_FAKE_SECRET` (một giá trị từ `node scripts/gen-secret.mjs`);
   - **không** đặt `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`; `TERMS_VERSION` giữ như `.env.example`.
   - **Nên dùng DB riêng cho dữ liệu thử:** file CSV mẫu ghi đè các nghĩa đang có cùng từ + loại từ (ví dụ `go` verb). Nếu DB đang có nội dung
     thật, tạo DB mới rồi trỏ `DATABASE_URL` vào đó (và `JOB_QUEUE_PREFIX=wordmet-learner-ui`) khi kiểm:
     ```powershell
     docker compose exec -T postgres psql -U dev -d english_learning -c "CREATE DATABASE english_learning_learner_ui"
     ```
     `DATABASE_URL=postgresql://dev:dev@localhost:5434/english_learning_learner_ui`
3. API và worker, trong `apps/api`:
   ```powershell
   pnpm db:setup
   pnpm build
   pnpm run:dev
   ```
4. Dữ liệu thử (cửa sổ PowerShell khác, trong `apps/api`), đổi hai email theo ý:
   ```powershell
   pnpm learner:setup -- --admin admin@example.com --learner lan@example.com
   ```
   Script tạo hai tài khoản đã xác minh (in mật khẩu thử ở cuối), nạp file CSV mẫu 303 nghĩa (`scripts/fixtures/learner-sample.csv`; cặp Kinh
   doanh · B1 có 113 nghĩa), bật AI giả `fake:ok` cho 6 thao tác AI. Thêm `--plan pro` để cấp gói Pro cho người học, `--plan trial` để có gói
   Dùng thử. Chạy lại không sao (đã nạp thì bỏ qua).
5. App người học, trong `apps/web`:
   ```powershell
   pnpm dev:app
   ```
   Mở http://localhost:3001/vi/app. `dev:app` bật `NEXT_PUBLIC_LEARNER_APP=on` và trỏ API về `http://localhost:3000`. **Trên Windows** lệnh này
   chạy `next dev` trong container Linux (`pnpm cf:docker --dev-app`), vì Windows chặn thư viện SWC mà next-intl cần (`next dev` chạy thẳng báo
   "Failed to load native binding"). Lần đầu mất vài phút cài thư viện; mỗi trang mở lần đầu biên dịch vài giây. Thêm file mới khi đang chạy thì
   tắt (Ctrl+C, rồi `docker stop wordmet-dev-app`) và chạy lại.
6. **Admin cùng lúc** (khi cần, ví dụ cấp gói): chạy admin với API qua IP, rồi mở admin bằng IP — để cookie đăng nhập của admin không đè
   phiên của app người học:
   ```powershell
   $env:VITE_API_BASE_URL='http://127.0.0.1:3000'; pnpm --filter admin dev
   ```
   Mở http://127.0.0.1:5173 (không dùng `localhost`).

Tắt hết: Ctrl+C ở các cửa sổ; `docker compose stop` ở thư mục gốc.

## M1 — Khung app, tài khoản, Cài đặt

Kiểm sáng/tối: Cài đặt → Giao diện → Sáng / Tối / Theo hệ thống. Kiểm tiếng Anh: Cài đặt → Ngôn ngữ → English (đường dẫn đổi sang `/en/app`).

| # | Làm | Thấy | Khung |
|---|---|---|---|
| 1 | Mở http://localhost:3001/vi/app khi chưa đăng nhập | Chuyển sang `/vi/app/login?next=%2Fvi%2Fapp`. Bên trái nền navy, bên phải thẻ "Đăng nhập" | K/02 `273:1343`, M/02 |
| 2 | Bấm "Đăng ký". Điền Tên, Ngày sinh `14/5/2015` | Ngay dưới ô: "Bạn cần đủ 13 tuổi để dùng Wordmet."; nút [Tạo tài khoản] mờ | K/01b `341:8507` |
| 3 | Sửa ngày sinh thành `14/5/2008`, điền email mới, mật khẩu `abc` (thiếu điều kiện), tick ô đồng ý, bấm [Tạo tài khoản] | Dưới ô mật khẩu liệt kê các điều còn thiếu (chữ hoa, số, ký tự đặc biệt…) | K/01 `273:1302` |
| 4 | Mật khẩu `Aa1!aaaa`, bấm lại | Sang "Nhập mã 6 số", có email của bạn; "Gửi lại mã sau 60 giây" đếm ngược | K/03 `273:1383` |
| 5 | Lấy mã ở http://localhost:8025, gõ 6 số, bấm [Xác minh] | Sang "Bạn đọc nghĩa của từ bằng ngôn ngữ nào?" | K/06 `273:1483`, K/06b `341:8909` |
| 6 | Mở ô Ngôn ngữ (có cờ), chọn Tiếng Việt, bấm [Tiếp tục] | Sang Hôm nay (M1 mới có tiêu đề; nội dung là M2). Thanh trên: 4 tab, "Gói học · Miễn phí", biểu tượng Cài đặt, avatar | K/10 `256:189` (phần thanh trên, chân trang) |
| 7 | Bấm avatar | Menu: tên "Nguyễn Lan" (Họ + Tên), email, Cài đặt · Gói học (chip Miễn phí) · Đăng xuất | K/90 `328:13087` |
| 8 | Vào Cài đặt | 6 mục: Thông tin cá nhân · Gói và mức sử dụng ("đã dùng 0/3", "Còn 3 phiên, mở lại lúc 0:00.", hai dòng AI "Cần gói Pro") · Học tập · Thông báo ("Lúc 20:00 giờ của bạn…") · Phím tắt (chỉ màn rộng) · Tài khoản (Xóa tài khoản "Sắp có") | K/50 `277:2441` |
| 9 | Bấm [Sửa] ở Ngày sinh, đổi thành `14/5/2015` | Lỗi ngay dưới ô, [Lưu thay đổi] mờ | K/92, K/91 `328:11013` |
| 10 | Đổi Tên, bấm [Lưu thay đổi] | Thông báo "Đã lưu thay đổi."; Cài đặt hiện tên mới | K/91 |
| 11 | Cài đặt → tắt "Nhắc học qua email", tải lại trang | Công tắc vẫn tắt | K/50 |
| 12 | Cài đặt → Giao diện → Tối | Cả app tối ngay; mở tab thứ hai, đổi lại Sáng ở tab đó → tab này đổi theo | (bản tối mẫu, page 08 section 11) |
| 13 | Cài đặt → Ngôn ngữ → English | Đường dẫn thành `/en/app/settings`, chữ tiếng Anh ("Settings", "Plan and usage", "1/3 used"…) | K/50 |
| 14 | Gõ tay `http://localhost:3001/vi/app/settings` khi hồ sơ đang English | Tự chuyển về `/en/app/settings` (E10) | — |
| 15 | Đăng xuất (avatar → Đăng xuất) rồi mở http://localhost:3001/vi/app/settings | Về đăng nhập; đăng nhập xong vào thẳng Cài đặt (E2) | K/02 |
| 16 | Ở đăng nhập, bấm "Quên mật khẩu?", nhập email, [Gửi mã]; lấy mã ở Mailpit, đặt mật khẩu mới | Về đăng nhập với dòng "Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới." | K/04 `273:1422`, K/05 `273:1450` |
| 17 | (Admin, mục 0.6) khóa tài khoản người học, rồi đăng nhập lại bằng đúng mật khẩu | Hộp đỏ "Tài khoản đang bị khóa" phía trên form, email vẫn còn | K/93 `328:13037` |
| 18 | Dừng API (Ctrl+C ở `run:dev`), tải lại một trang app | Màn "Không kết nối được" + [Thử lại]; bật API lại, bấm [Thử lại] → vào lại trang, vẫn đăng nhập (E5) | — |
| 19 | Thu cửa sổ dưới 768px ở Cài đặt | Thanh trên điện thoại (logo hoặc "‹ Quay lại", chip gói, avatar), tab dưới 4 mục; không cuộn ngang | M/90, tab dưới `284:156` |
| 20 | Chân trang (màn rộng) | Giới thiệu, Gói học, Liên hệ, Điều khoản, Chính sách bấm được; Trợ giúp, Câu hỏi thường gặp, Gửi góp ý mờ, không bấm được; không có dòng đổi ngôn ngữ | chân trang `443:6928` |

Kiểm tự động của M1 (CI, job `web`): `e2e/app/m1.spec.ts` (luồng đăng ký, E2, E8, E10, mức sử dụng; axe ở mọi trang M1 × vi/en × sáng/tối ×
1440/390), `e2e/app/overflow.spec.ts` (không cuộn ngang với tên dài), `e2e/csp.spec.ts` (không vi phạm CSP).
