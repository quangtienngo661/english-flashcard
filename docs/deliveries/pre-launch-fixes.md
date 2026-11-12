# Sửa bảo mật trước launch — as-built (12/11/2026)

Nguồn: review bảo mật 07/11 (`docs/audit/2026-11-07-security-review-auth-payments.md`, chưa vào `dev`) và minor M4 của launch B
(`docs/deliveries/chuan-bi-launch-b-m1-rulings.md`, "Deferred minors"). Chủ dự án duyệt toàn bộ đề xuất trong chat ngày 12/11/2026
và miễn design doc cho đợt này. Nhánh `fix/pre-launch-security`, một PR vào `dev`. Không làm F1 (đã xử lý trước), M6 (chưa chốt),
F6, F8, F9, F11 (ngoài phạm vi).

## Quyết định đã duyệt

| # | Việc | Chốt |
|---|---|---|
| F4 | Khóa sau 10 lần sai mật khẩu | Theo tài khoản + IP. Bảng `login_failures`; bỏ `users.failed_login_count`, `users.login_locked_until` |
| F5 | Grace của refresh token | 10 s → 2 s |
| F7 | argon2 ở route công khai | Turnstile trên `POST /v1/auth/verify-email` và `POST /v1/auth/password/reset`; không bypass khi Cloudflare sập |
| M4 | Admin xác nhận đơn bằng tay | Hủy link payOS trước; hủy không được thì hỏi trạng thái link: `PAID`/`CANCELLED`/`EXPIRED` hoặc không có → vẫn xác nhận; còn lại → 503, đơn giữ nguyên |
| nodemailer | Advisory | Giữ 10.3.1: GitHub advisory DB `affects=nodemailer@10.3.1` → 0 (đối chứng 10.0.12 → 5), `pnpm audit` → 0 |
| F10 | `/v1/sample` | Gỡ module, xóa `src/sample`, bỏ rule `sample.create` |
| F3 | Đăng ký lại email chưa xác minh | Bảng `pending_registrations`; mật khẩu gõ lúc nhập mã quyết định bản nào thắng |
| F2 | Đăng ký lộ tài khoản | Luôn 201; tài khoản đã có → thư "Bạn đã có tài khoản Wordmet"; đang bị xóa → không gửi gì |
| F12 | Admin đổi email | Email mới chưa xác minh, thu hồi mọi phiên, hủy OTP còn sống, thư xác nhận tới email mới |

## Thay đổi

- **F10**: `GET`/`POST /v1/sample` → 404.
- **F5**: `REFRESH_GRACE_MS = 2_000` trong `identity/sessions/session.service.ts`.
- **F4**: migration `20261113100000_login_failures`; `decideCredential` đọc và ghi dòng `(user_id, ip_key)`, `ip_key` là HMAC của IP
  (cùng cách `RateLimiter` băm IP, `identity/auth/client-ip-key.ts`). Áp cho đăng nhập, đổi mật khẩu, xác nhận xóa tài khoản. Đặt
  lại mật khẩu và Google sign-up trên tài khoản chưa xác minh xóa mọi dòng của user; job dọn dẹp xóa dòng cũ hơn 24 giờ.
- **F3**: migration `20261113110000_pending_registrations`. Đăng ký lại chỉ ghi bản chờ. Nhập mã với mật khẩu cũ → giữ bản cũ; với
  mật khẩu bản chờ → áp hồ sơ, mật khẩu bản chờ và thu hồi phiên. Bản chờ bị xóa khi xác minh xong, khi đặt lại mật khẩu, khi đăng ký
  bằng Google.
- **F2**: `register` không còn 409 `email-taken`; template `accountExistsMail`, chịu cùng giới hạn thư mỗi email.
- **F12**: `StaffService.updateUser`; template `emailChangedConfirmMail`. Admin: câu gợi ý ở hộp Sửa, câu báo `email-not-verified` ở
  trang đăng nhập.
- **F7**: API `@Turnstile('auth.verify.ip')`, `@Turnstile('auth.reset.ip')`, hai schema nhận `turnstile_token`. Web: form "Nhập mã"
  gửi token của widget sẵn có, form "Đặt mật khẩu mới" thêm widget. Admin: bước đặt lại của "Quên mật khẩu" gửi token. 22 chỗ gọi
  verify-email trong 13 smoke và `admin-e2e-real` gửi `SMOKE_TURNSTILE_TOKEN` / `E2E_TURNSTILE_TOKEN`.
- **M4**: `AdminOrdersService.confirmPayment`. Smoke payments: bước LB1E3 giờ trả qua QR với webhook trễ rồi mới xác nhận tay; bước
  mới "M4" kiểm link bị hủy và trả lại QR cũ không thêm khoản nào.

## Đỏ trước

Mỗi fix là một commit `test(…)` rồi một commit `fix(…)`. Lý do đỏ, đọc từ lần chạy trước khi sửa:

| Fix | Test đỏ vì |
|---|---|
| F10 | `GET /v1/sample` trả 200; danh sách route còn `GET`/`POST /v1/sample` |
| F5 | Dùng lại token cũ ở +3 s vẫn nhận successor thay vì `reuse`; rotate ghi `graceUntil` +10 000 ms |
| F4 | 52 test ở 10 spec: `decideCredential` trả chuỗi thay vì `{ kind, lockedUntil, newlyLocked }`; khóa từ IP A vẫn chặn IP B; login không nhận IP |
| F3 | 13 test: đăng ký lại vẫn ghi đè `users` và credential; verify không biết bản chờ; reset và Google sign-up không xóa bản chờ |
| F2 | 9 test: đăng ký email đã xác minh ném `Email taken`; `accountExistsMail` chưa có |
| F12 | API ghi `emailVerifiedAt` = now, không thu hồi phiên, không thư xác nhận; admin không có câu gợi ý và câu báo mới |
| F7 | API: verify/reset có token → 400 validation, không token vẫn chạy; web/admin: không gửi token, widget không reset, nút không khóa |
| M4 | `cancelCheckout` không được gọi khi xác nhận; payOS lỗi vẫn xác nhận thay vì 503 |

## Kiểm (12/11/2026)

- `apps/api`: `pnpm test` 355 file, 5245 test pass; `pnpm lint` không lỗi (2 cảnh báo có từ trước); `tsc --noEmit` sạch; `pnpm build`
  qua; `prisma migrate diff` (lệnh CI) trên DB đã áp migration → "This is an empty migration.".
- `apps/web`: lint, typecheck sạch; `pnpm test` 95 file, 990 test pass. `apps/admin`: lint, typecheck sạch; `pnpm test` 105 file,
  1409 test pass.
- Smoke trên DB mới riêng, API + worker build từ nhánh này, port 3310: `smoke:buoc-8` 20/20 PASS, `smoke:buoc-b-payments` 22/22 PASS.
  Kiểm tay: đăng ký email mới → 201; verify-email không token → 400, có token → 200; đăng ký lại email đã xác minh → 201 và Mailpit
  có thư "Bạn đã có tài khoản Wordmet". Output: `docs/deliveries/pre-launch-fixes-smoke-output.txt`.

## Chưa kiểm thật

- payOS thật: hủy link đã `PAID` trả lỗi gì, và link đã hủy có còn nhận chuyển khoản không (`ASSUMPTION`; smoke dùng payOS giả, giả
  từ chối hủy link `PAID`).
- Turnstile thật (Cloudflare) trên hai route mới; CI và smoke dùng `TURNSTILE_MODE=fake`.
- Các smoke khác (Bước 2, 4–7, nhóm B…) chỉ được sửa thêm token ở verify-email, chưa chạy lại.

## Giới hạn đã biết

- F3: trước khi nhập mã, đăng nhập bằng mật khẩu của bản chờ vẫn báo sai mật khẩu. Đăng ký lại với đúng mật khẩu cũ nhưng tên mới →
  giữ hồ sơ cũ.
- F4: người dùng chung IP với kẻ tấn công (CGNAT) cũng bị khóa 15 phút.
- F12: tài khoản chỉ dùng Google không đăng nhập được cho tới khi dùng Quên mật khẩu ở email mới; staff xác nhận bằng Quên mật khẩu
  ở trang admin.
- `apps/api/scripts/learner-test-setup.mjs`: tài khoản đã xác minh với mật khẩu khác giờ kết thúc bằng lỗi "No OTP mail" (trước là
  409).

## Việc cho nhánh `refactor/giao-dien-moi` (không sửa trong PR này)

- `VerifyEmailForm` gửi `turnstile_token` (widget đã có; `session-store.verifyEmail` nhận tham số token) và reset widget khi lỗi;
  `ResetPasswordForm` thêm `useTurnstile`, widget, token, khóa nút khi chưa có token. Thiếu thì hai form lỗi 400 với API mới.
- `RegisterForm`: đoạn xử lý 409 `email-taken` / `account-deleting` và key `register.accountDeleting` thành code chết, nên bỏ.
