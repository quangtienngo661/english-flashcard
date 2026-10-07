# Bước 1 — Review tổng kết (07/10/2026)

Người review: Claude, đọc lại toàn nhánh `feat/buoc-1-identity-impl` so với `main` (149 file, +9.961/−274 dòng;
`apps/api/src` 104 file, `apps/api/test` 26 file). Codex `gpt-6-astra` đang hết hạn mức (đến 18:10) nên lần
này **không có reviewer độc lập**. Mọi kết quả dưới đây đều chạy trong phiên này.

## 1. Đã xây gì

| Nhóm | Nội dung |
|---|---|
| Hạ tầng | Docker Compose (Postgres cổng **5434**, Mailpit), `.env.example`, `scripts/gen-secret.mjs`, schema Prisma tách file theo module (D3) |
| Nền chung (`src/common`) | Cấu hình kiểm bằng zod (thiếu biến thì không khởi động), `Clock`/đồng hồ giả, `AppLogger` (mức log, che bí mật, `operation_id`), rate limit theo luật có tên (sửa lỗi bộ đếm dùng chung của Bước 0), Problem Details cho lỗi body (400/413/415), `configureApp()` dùng chung cho server và test, bộ dọn dẹp hằng giờ |
| Identity (`src/identity`) | Đăng ký, đăng nhập (khóa 15 phút sau 10 lần sai), OTP xác minh email và quên mật khẩu (khóa 24 giờ sau 20 lần sai), phiên đăng nhập xoay vòng refresh token (ân hạn 10 giây, phát hiện dùng lại, hết hạn 90/365 ngày, tối đa 10 thiết bị), cookie web + header CSRF, đổi/đặt lại mật khẩu, hồ sơ, `IdentityService`, vai trò `admin`/`editor`, lệnh `admin:grant` |
| Quy tắc an toàn xuyên suốt | Mọi thao tác bảo mật của một user xếp hàng qua khóa riêng của user đó; ghi trạng thái (lần sai, khóa, thu hồi) **rồi mới** trả lỗi; thư chỉ gửi sau khi commit và sau khi đã trả lời request |

## 2. Kết quả kiểm chứng (chạy lại lúc 15:55–16:10)

- Unit **338/338** (37 file), e2e **182/182** (23 file) trên Postgres + Mailpit thật qua Testcontainers;
  `tsc`, `oxlint`, `nest build` sạch.
- Chạy tay trên API đã build (Postgres + Mailpit trong Docker): đăng ký 201 → mã OTP 6 số đọc từ Mailpit →
  xác minh 200 → gia hạn 200 (token mới khác token cũ) → đổi mật khẩu 200 → logout 204 → gia hạn bằng token
  đã logout 401 → đăng nhập mật khẩu cũ 401 → `pnpm admin:grant` = `granted` → `/v1/me` báo `admin` +
  `roles.manage` → `/v1/admin/staff` 200.
- Độ phủ: **38/38** tiêu chí `B1#` có test. Edge case: 28/34 có test mang mã; 6 cái còn lại có lý do —
  B1E8 có test nội dung (dọn bản mã hóa sau ân hạn) nhưng tên test không ghi mã; B1E11/B1E18/B1E28 là rủi ro
  chấp nhận; B1E26 đã bỏ (D16); B1E31 kiểm bằng tay ở Task 1 và 4.
- Luật xuyên suốt: `src/common` không import `src/identity` (D3); không có `console.*` trong code chạy thật
  (trừ CLI); cả 12 transaction đều đặt `{ timeout: 10_000, maxWait: 5_000 }`; mọi `endpoint` công khai có
  rate limit theo IP, mọi `endpoint` ghi cần đăng nhập có rate limit theo user; log không chứa mật khẩu, mã
  OTP, token, cookie, IP thô hay email đăng nhập sai (test kiểm log đã được thử bằng cách cố ý làm rò rỉ:
  test bắt được).
- Quét secret toàn bộ diff của nhánh: không thấy (đối chứng: tìm thấy chuỗi `dev:dev@localhost` 4 lần).

## 3. Phát hiện của lần review này

| # | Mức | Phát hiện | Đề xuất |
|---|---|---|---|
| R1 | Trung bình | `main.ts` không bật `enableShutdownHooks()`, `MailDispatcher` không gửi nốt thư khi tắt. Mỗi lần deploy/restart, thư OTP đang chờ (đã trả lời 202 cho người dùng) bị mất — thường xuyên hơn trường hợp "server sập" mà B1E16 đã chấp nhận. Bộ dọn dẹp cũng không dừng êm | Bật `enableShutdownHooks()` và cho `MailDispatcher` chờ `drain()` khi ứng dụng tắt; thêm test |
| R2 | Nhỏ | `otp_sent` được ghi log **bên trong** transaction: nếu transaction lỗi sau đó thì log báo đã gửi mà thực tế không có | Chuyển log ra sau commit |
| R3 | Nhỏ | Bảng `otp_failure_windows` và `mail_budget_buckets` không được dọn (design không yêu cầu). Tăng chậm: tối đa 2 dòng/user và 1 dòng/ngày | Thêm vào bộ dọn dẹp khi tiện |
| R4 | Nhỏ | Test dọn bản mã hóa sau ân hạn chưa ghi mã `B1E8` | Đổi tên test |
| R5 | Quy trình | Task 13 (vai trò) do Codex viết nhưng chỉ có Claude review; Task 14 do Claude tự viết và tự review — chưa có reviewer độc lập | Cho Astra review hai task này khi Codex có lại hạn mức |

## 3b. Xử lý sau review (07/10/2026)

R1 đã sửa (`app.enableShutdownHooks()` + `MailDispatcher.onApplicationShutdown` chờ `drain()`, có unit test).
R2 đã sửa (`otp_sent` ghi qua `OtpService.noteIssued` sau khi commit). R4 đã sửa (test mang mã `B1E8`).
R3 để lại (nhỏ, không có trong design). R5: chủ dự án quyết định không cần review thêm. Thêm CI GitHub
Actions (`.github/workflows/ci.yml`): lint, typecheck, build, unit, e2e; PR chỉ merge khi CI xanh.

## 4. Những điểm đã sửa trong quá trình làm (đã có test)

Lỗi body hỏng/nén lạ trả 500 (Task 2); test khóa user dựa vào thời gian (Task 4); header `Bearer` nhiều dấu
cách bị từ chối (Task 5); thư bị mất khi test đóng app lúc handler chưa xong (Task 6); phiên đã hết hạn vẫn
tính vào giới hạn 10 thiết bị, làm thu hồi oan phiên còn sống (Task 7, do Claude tự review tìm ra); test đăng
nhập song song cạn pool kết nối (Task 7); lần đổi mật khẩu sai thứ 10 trả 429 thay vì 400 (Task 11); thiếu sự
kiện log `otp_sent` (Task 14, phát hiện khi chạy tay).

## 5. Rủi ro và việc còn mở

- Mọi con số rate limit, khóa, ngân sách thư, timeout SMTP là `ASSUMPTION` (cấu hình được).
- Nhiều request của cùng một user dồn lại có thể chiếm hết 10 kết nối DB (đã thấy thật trong test Task 7) —
  design chấp nhận ở quy mô pilot.
- Giới hạn gửi thư của Gmail cá nhân vẫn chưa có nguồn chính thức.
- Các chỗ cần sửa spec gốc (design mục 11) **chưa** áp vào `docs/specs/`.
- Câu mở cũ của Bước 0 (B0E1, `Idempotency-Key` bắt buộc + timeout 30 s) vẫn chờ chủ dự án xác nhận.
- Nhánh chưa push, chưa mở PR.
