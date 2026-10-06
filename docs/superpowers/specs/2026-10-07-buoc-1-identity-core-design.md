# Design — Bước 1: Identity core

Ngày: 07/10/2026 (brainstorm 06–07/10). Phạm vi: Bước 1 trong `../../HANDOFF_2026-10-05_BUOC_0.md` §2, theo spec
[`module-spec-identity-access.md`](../../specs/module-spec-identity-access.md). Brainstorm qua
`superpowers:brainstorming`, hỏi từng câu trong chat. Nền: Bước 0 trên nhánh `feat/migrate-drizzle-to-prisma`
(Prisma 7.10.0, Vitest + Testcontainers, seam `RequestUser`).

**Nhãn:** **Chốt** = chủ dự án chọn trong phiên brainstorm. **Đề xuất** = trợ lý đề xuất trong lúc trình bày
design, chủ dự án đã đồng ý phần chứa nó. **ASSUMPTION** = chưa kiểm chứng bằng chạy thật hoặc nguồn.
Criteria/edge cases dùng số hiệu `B1#`/`B1E#` (theo `docs/specs/SPEC_WRITING_CONVENTIONS.md`), trích ngược
về `I#`/`IE#`/`IR#` của spec Identity và `S#`/`SR#` của system-spec.

## 1. Mục tiêu và tiêu chí xong

Thay seam `RequestUser` giả của Bước 0 bằng danh tính thật, để các bước 2–7 có user, phiên, hồ sơ và phân quyền
thật để cắm vào. **Xong khi:** mọi tiêu chí `B1#` ở mục 8 có test e2e chạy trên Postgres thật bằng một lệnh, và một
lượt chạy tay trên API thật (Postgres + Mailpit trong Docker) đi trọn: đăng ký → đọc OTP trong Mailpit → xác minh →
gia hạn → đổi mật khẩu → logout.

## 2. Quyết định đã chốt (06–07/10/2026)

| # | Quyết định | Lệch spec? |
|---|---|---|
| D1 | **Phạm vi:** Bước 1 = spec "lõi" (đăng ký, đăng nhập mật khẩu, OTP xác minh, phiên, hồ sơ, vai trò) **cộng** đổi mật khẩu (IR14) và quên mật khẩu (IR7, phần mật khẩu). Lý do: pilot ở Bước 3 có người dùng thật; không có đặt lại mật khẩu thì owner phải sửa DB tay. OTP, Mailer, thu hồi phiên vốn đã phải làm ở Bước 1 | Lệch thứ tự HANDOFF §2 (IR7 vốn ở Bước 8) |
| D2 | **Mailer:** cổng `Mailer` + `FakeMailer` (test) + `SmtpMailer` (`nodemailer`, cấu hình `SMTP_*`, chưa chốt Gmail cá nhân hay Workspace) + ngân sách thư mỗi ngày (IR19) | Không |
| D3 | **Ranh giới module:** quy ước, chưa có tool. Mỗi module một file `apps/api/prisma/models/<module>.prisma`; chỉ code của module được truy vấn bảng của nó; module khác gọi qua service module đó export; **không có relation Prisma xuyên module** (tham chiếu chéo là cột uuid trơn). Ghi vào CLAUDE.md, kiểm khi review | Không (đóng câu mở số 2 trong CLAUDE.md) |
| D4 | **Cookie web làm ngay ở Bước 1** (refresh token trong cookie `HttpOnly` + header chống CSRF), không để Bước 3 | Không |
| D5 | **Hướng xác thực A:** guard tự viết + `jose` (6.2.12), không Passport, không `@nestjs/jwt`. Lý do: phần khó (xoay vòng, ân hạn, khóa, OTP) hướng nào cũng tự viết; `jose` dùng lại ở Bước 8 để xác minh ID token Google qua JWKS | Không |
| D6 | **Phân quyền nhân sự: vai trò → danh sách quyền trong code**, hai vai trò **`admin`** (cao nhất) và **`editor`**. Người học không có vai trò (`staff_role = null`); quyền của người học đến từ quyền sở hữu (SR9) và Entitlements (Bước 5). Admin đầu tiên cấp bằng lệnh CLI; sau đó admin cấp/thu qua endpoint (giao diện ở Bước 3) | **Lệch** IR17, K1, N1 ("một owner, không màn quản lý admin") và Pipeline ("nhiều admin và phân vai" ngoài V1) |
| D7 | **Một endpoint OTP chung** `POST /v1/auth/otp` có `purpose`, dùng bất cứ lúc nào (vd xác minh email vài ngày sau từ màn cài đặt), không gắn với đăng ký | Không (làm rõ) |
| D8 | **Đăng ký xong là đăng nhập luôn** (trả token), theo K7 | Không (làm rõ) |
| D9 | **Commit local bình thường** trên `feat/buoc-1-identity-core` (tách từ `feat/migrate-drizzle-to-prisma`). Chưa có remote; push và `main` để sau | — |

Thư viện (đã kiểm `npm view` ngày 06/10/2026): `jose` 6.2.12, `argon2` 0.45.1, `nodemailer` 10.0.15,
`cookie-parser` 1.4.7. Node 24.11 có sẵn `crypto.argon2` (đo được ~44 ms/lần với m=19456, t=2, p=1) nhưng
**không dùng**: trả hash thô, phải tự viết lớp mã hóa chuỗi PHC và so sánh — tự viết code mật mã là rủi ro không đáng.
Gói `argon2` trả chuỗi PHC có tham số + salt, có `verify` và `needsRehash`. Mức ổn định của `crypto.argon2` chưa
đọc được (`ASSUMPTION`, không ảnh hưởng vì không dùng).

### Bảng quyền (D6)

| Quyền | Gồm (nguồn spec) | `admin` | `editor` | Code ở bước |
|---|---|:-:|:-:|---|
| `roles.manage` | Cấp/thu `admin`, `editor` | ✓ | | 1 |
| `content.edit` | Soạn/sửa bản nháp, CSV, đánh dấu đã rà, dạng chấp nhận (CR19, CR22, PR5, PR6) | ✓ | ✓ | 2 |
| `content.publish` | Publish, bỏ publish, retire (CR19) | ✓ | ✓ | 2 |
| `content.import` | Đăng ký nguồn, nhập CEFR-J/Octanove (PR1–PR4) | ✓ | ✓ | 2 |
| `taxonomy.manage` | Chủ đề, ghi đè cờ từ chức năng (CR9, CR10) | ✓ | ✓ | 2 |
| `questions.moderate` | Xem báo lỗi, ẩn/gỡ/khôi phục câu (PRC18, PRC25) | ✓ | ✓ | 4/7 |
| `entitlements.grant` | Cấp quyền/lượt AI cho người học (ER10) | ✓ | ✓ | 5 |
| `ai.settings` | Bật/tắt bài AI, trần chi phí AI (tiền thật) | ✓ | | 6 |

Bước 1 chỉ code `roles.manage`; quyền khác thêm vào bảng ở bước của module đó.

## 3. Cấu trúc module và dữ liệu

```
apps/api/src/identity/
  auth/       đăng ký, đăng nhập, OTP, đổi/đặt lại mật khẩu
  sessions/   access token, refresh token, guard toàn cục, @Public()
  profile/    GET/PATCH /v1/me, IdentityService (export cho module khác)
  staff/      bảng quyền, @RequirePermission(), endpoint vai trò, lệnh CLI admin:grant
  mailer/     cổng Mailer, FakeMailer, SmtpMailer, ngân sách thư
apps/api/src/common/clock/   Clock (now()), bản giả tua được cho test
apps/api/prisma/models/identity.prisma
```

Bảng (Identity sở hữu, theo "Bản đồ ghi dữ liệu" của system-spec):

- **`users`**: `id` uuid, `email` (đã chuẩn hóa, unique), `email_verified_at`, `staff_role` (`admin`/`editor`/null),
  `native_language` (null = chưa thiết lập), `timezone`, `status` (`active`; `deleting` dùng từ Bước 8),
  `failed_login_count`, `login_locked_until`, `created_at`, `updated_at`.
- **`password_credentials`**: `user_id` (PK), `hash` (chuỗi PHC Argon2id), `updated_at`. Tách khỏi `users` để user
  chỉ có Google (Bước 8) không có dòng này và IR9 xóa được mật khẩu mà giữ user. Bảng danh tính Google thêm ở Bước 8.
- **`session_chains`**: `id`, `user_id`, `client_type` (`web`/`mobile`), `device_label`, `created_at` (mốc tuyệt
  đối 365 ngày), `last_used_at` (mốc trượt 90 ngày), `revoked_at`, `revoke_reason`.
- **`refresh_tokens`**: `id`, `chain_id`, `token_hash` (SHA-256, unique), `created_at`, `rotated_at`,
  `successor_ciphertext` (refresh token kế tiếp, AES-256-GCM), `grace_until`. Chỉ giữ refresh token kế tiếp; access
  token luôn ký mới (lệch nhỏ so với IR11 "giữ cặp", vì access token không cần trả lại y hệt).
- **`otp_codes`**: `id`, `user_id`, `purpose` (`verify_email`/`reset_password`), `code_hmac` (HMAC-SHA256 với khóa
  bí mật server), `expires_at`, `attempts`, `consumed_at`, `invalidated_at`, `created_at`.
- **`otp_failure_windows`**: `(user_id, purpose)` PK, `window_start`, `failures`, `locked_until` — trần cộng dồn 20
  lần sai/24 giờ (IR4).
- **`mail_budget_days`**: `day` (ngày UTC) PK, `sent`.
- **Bộ đếm rate limit (Bước 0)**: đổi cột khóa `user_id uuid` → `key text` (`user:<id>`, `ip:<hmac>`,
  `email:<hmac>`). Chỗ duy nhất sửa code Bước 0 ngoài `ProblemDetailsException` (mục 6).

## 4. Token, phiên, cookie web

- **Access token:** JWT HS256 ký bằng `jose`, sống 15 phút, claims `sub` (user id), `sid` (chain id), `iat`, `exp`,
  `iss`, `aud`; header có `kid`. Biến môi trường chứa danh sách khóa `kid:secret`; khóa đầu ký, mọi khóa trong danh
  sách đều kiểm (IE10). Chỉ chấp nhận `alg = HS256`.
- **Guard toàn cục:** mọi route cần đăng nhập trừ route ghi `@Public()`. Guard **không** đọc DB, gắn
  `RequestUser { userId, sessionChainId }` vào request, nên `RateLimitGuard` và `IdempotencyInterceptor` của Bước 0
  không phải sửa. `@RequirePermission(...)` đọc DB: `staff_role` hiện tại và chain `sid` chưa bị thu hồi (IR17).
- **Refresh token:** 32 byte ngẫu nhiên (base64url), lưu SHA-256. Xoay vòng bằng **compare-and-set**:
  `UPDATE refresh_tokens SET rotated_at = $now ... WHERE id = $id AND rotated_at IS NULL`. Request thắng (1 dòng)
  tạo token mới, ghi `successor_ciphertext` và `grace_until = now + 10 s` trong cùng transaction. Request thua (0
  dòng, Postgres bắt nó chờ tới khi bên thắng commit rồi mới đánh giá lại `WHERE`) đọc lại dòng và đi nhánh ân hạn.
  Không cần raw SQL: Prisma `updateMany` trả `count`.
- **Ân hạn 10 giây:** token đã xoay quay lại khi `now <= grace_until`, chain chưa thu hồi, **và token kế tiếp vẫn là
  token hiện hành** của chain → trả lại đúng refresh token kế tiếp (giải mã) + access token ký mới; ghi log
  `refresh_grace_used`. Ngoài các điều kiện đó → coi là dùng lại: thu hồi cả chain, log warn `refresh_reuse_detected`.
- **Hết hạn:** chain hết hiệu lực khi `now - last_used_at > 90 ngày` hoặc `now - created_at > 365 ngày`.
- **Tối đa 10 chain hoạt động/tài khoản:** tạo chain thứ 11 thì thu hồi chain **dùng lâu nhất chưa dùng lại**
  (`last_used_at` nhỏ nhất) trong cùng transaction.
- **Web/mobile:** body đăng nhập/đăng ký có `client: "web" | "mobile"`, lưu vào `client_type`.
  Web: `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/refresh`, body **không** chứa
  refresh token. Gia hạn web đọc cookie và **bắt buộc** header `X-CSRF-Protection: 1`. Mobile: refresh token trong body.
  Gia hạn có `refresh_token` trong body → đường mobile; không có → đường cookie. `client_type` của chain phải khớp
  đường đi.
- **Logout** `POST /v1/auth/logout` (cần access token): thu hồi chain `sid`; web thì xóa cookie. Gọi lại vẫn 204.

## 5. Đăng ký, OTP, mật khẩu, gửi thư

- **Đăng ký** `POST /v1/auth/register` (`@Public`): `email`, `password`, `timezone`, `client`, `device_label`.
  Thứ tự: kiểm dữ liệu (400) → kiểm ngân sách thư (503) → transaction tạo user + credential + chain (unique
  violation → 409). Trả token. Sau khi trả lời, gửi OTP `verify_email`.
- **OTP** `POST /v1/auth/otp`: `{ purpose: "verify_email" }` cần đăng nhập, gửi tới email tài khoản;
  `{ purpose: "reset_password", email }` là `@Public`, trả 202 giống hệt nhau dù email có hay không. Mã 6 chữ số
  `crypto.randomInt(0, 1_000_000)` đệm số 0 đầu, hiệu lực 10 phút, mã mới vô hiệu mã cũ cùng mục đích.
- **Xác minh** `POST /v1/auth/verify-email` `{ code }` (cần đăng nhập).
- **Đăng nhập** `POST /v1/auth/login` (`@Public`). Email không tồn tại → vẫn chạy `argon2.verify` với một hash giả
  tạo lúc khởi động, để thời gian phản hồi như sai mật khẩu. Tối đa 4 lần băm Argon2 song song (semaphore,
  `ASSUMPTION`; mỗi lần ~19 MiB).
- **Đổi mật khẩu** `POST /v1/auth/password/change` (cần đăng nhập) `{ current_password, new_password }`.
- **Đặt lại mật khẩu** `POST /v1/auth/password/reset` (`@Public`) `{ email, code, new_password }`. Không trả token;
  người dùng đăng nhập lại.
- **Gửi thư sau khi trả lời request** (lệch IR19/Defense Analysis "gửi đồng bộ trong request"): nếu chờ SMTP rồi mới
  trả lời thì luồng quên mật khẩu lộ email có tồn tại qua thời gian phản hồi. Gửi qua một `MailDispatcher` giữ danh
  sách promise đang chạy (test gọi `drain()` để chờ). Timeout SMTP 10 giây (`ASSUMPTION`).
- **Thư thông báo (IR22) ở Bước 1:** đổi mật khẩu, đặt lại mật khẩu, khóa OTP do vượt trần cộng dồn.
- **Mailpit** (`axllent/mailpit`) làm SMTP local và cho một test e2e của `SmtpMailer` (`ASSUMPTION`: chạy được với
  Testcontainers — kiểm ở task đầu của plan).

## 6. Rate limit, hồ sơ, vai trò, lỗi

- **Rate limit:** `@RateLimit` nhận nhiều luật `{ by: "user" | "ip" | "email", max, windowSeconds }`. IP và email
  băm HMAC trước khi lưu. Một tác vụ mỗi giờ trong tiến trình API xóa bộ đếm cũ hơn 24 giờ (IR21) và xóa
  `successor_ciphertext` đã quá `grace_until`. `TRUST_PROXY` cấu hình được (`ASSUMPTION`: cần khi deploy sau proxy).
  Số mặc định (`ASSUMPTION`, cấu hình được): đăng ký 5/giờ/IP; đăng nhập 20/phút/IP; OTP 60 giây + 5/giờ/email và
  20/giờ/IP; gia hạn 60/phút/IP; thư 20/ngày/IP; endpoint ghi đã đăng nhập theo user như Bước 0.
- **Hồ sơ** `GET /v1/me`, `PATCH /v1/me`: `native_language` ∈ {`vi`, `en`} (SR3, SE5); `timezone` kiểm bằng
  `new Intl.DateTimeFormat("en", { timeZone })`, **không** bằng `Intl.supportedValuesOf("timeZone")` — đã chạy thử
  trên Node 24.11: danh sách đó không có `Asia/Ho_Chi_Minh` (chỉ có `Asia/Saigon`), còn `DateTimeFormat` nhận cả hai
  và từ chối `Mars/Base`. Lưu đúng chuỗi client gửi. `IdentityService` export `getProfile(userId)` và
  `isEmailVerified(userId)` (I22, I24).
- **Vai trò:** `GET /v1/admin/users?email=` và `PUT /v1/admin/users/{id}/staff-role` `{ staff_role }`, cần
  `roles.manage`. Lệnh `pnpm --filter api admin:grant <email>`.
- **Lỗi** (Problem Details): 400 dữ liệu sai (mật khẩu yếu kèm `violations`; cần thêm field mở rộng vào
  `ProblemDetailsException` của Bước 0), 400 OTP sai/hết hạn/đã dùng (một thông báo); 401 đăng nhập sai (một thông
  báo), token thiếu/sai/hết hạn; 403 thiếu quyền, thiếu header CSRF; 409 email đã dùng, vi phạm luật vai trò; 429 kèm
  `Retry-After`; 503 hết ngân sách thư.
- **Idempotency:** endpoint của Identity **không** dùng `@Idempotent()` — các endpoint `@Public` không có user để
  khóa key (SR8 theo user), còn trùng lặp đã được chặn bằng ràng buộc unique, compare-and-set và rate limit (xem B1E19,
  B1E20).

## 7. Test

- **Unit:** chuẩn hóa email, quy tắc mật khẩu, bảng quyền, kiểm timezone, băm token/HMAC.
- **E2E** (Testcontainers Postgres, `AppModule` thật, `FakeMailer` thay qua provider override): mỗi `B1#` ở mục 8 ít
  nhất một test; nhóm đồng thời và nhóm đường web ở mục 9.
- **Đồng hồ giả:** mọi mốc thời gian so hạn (OTP, khóa, ân hạn, 90/365 ngày, cửa sổ đếm) tính bằng `Clock` trong code
  và ghi vào DB; không so hạn bằng `now()` của Postgres (đồng hồ giả không với tới được).
- **Không đo thời gian thật** cho I8/I10: kiểm `argon2.verify` được gọi đúng một lần ở cả hai nhánh.
- **Kiểm chứng cuối** theo `verification.md`: chạy API thật + Postgres + Mailpit, đi tay luồng ở mục 1.

## 8. Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| B1#1 | When `POST /v1/auth/register` receives a new email, a valid password, a valid timezone and `client`, then one transaction creates an unverified user (`native_language` null, `staff_role` null), an Argon2id credential (m=19456, t=2, p=1) and a session chain, the response is 201 with an access token and the refresh token (body for mobile, cookie for web), and a `verify_email` OTP is dispatched after the response | I1, IR2, D8 |
| B1#2 | When the normalized email already belongs to a user, then the response is 409 "email already used", no row is created and no mail is sent | I2, IR2 |
| B1#3 | When a password fails any of: ≥ 8 code points, ≤ 128 code points, an uppercase letter (`\p{Lu}`), a lowercase letter (`\p{Ll}`), a digit (`\p{Nd}`), a character that is neither letter nor digit, then registration, change or reset returns 400 whose `violations` lists every failed rule, and nothing is stored | I3, IR3 |
| B1#4 | When `POST /v1/auth/otp` with `verify_email` is called by an authenticated unverified user, then earlier unconsumed `verify_email` codes of that user are invalidated, a new 6-digit code valid for 10 minutes is stored as an HMAC, the response is 202, and the code is mailed after the response | IR4, D7 |
| B1#5 | When `POST /v1/auth/otp` with `reset_password` names an email, then the response is 202 with the same body whether or not an account exists, and a code is created and mailed only when it exists | I8, IR7 |
| B1#6 | When an OTP is requested for an email less than 60 seconds after the previous request for that email, or more than 5 times in one hour, then the response is 429 with `Retry-After`, counted per normalized email across both purposes and whether or not an account exists | I6, IR4 |
| B1#7 | When the correct `verify_email` code is submitted within 10 minutes and before 5 attempts, then `email_verified_at` is set, the code is consumed, and submitting it again returns the generic invalid-code 400 | I4, IR5 |
| B1#8 | When a wrong code is submitted, then `attempts` is incremented by one conditional `UPDATE ... WHERE attempts < 5 AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > $now`, and once 5 attempts are used even the correct code is refused until a new code is requested | I5, IR4 |
| B1#9 | When a `reset_password` code is submitted to verify the email, or a `verify_email` code to reset the password, then it is refused, because codes are looked up by (user, purpose) | I7, IR4 |
| B1#10 | When the 21st wrong code within one 24-hour failure window is submitted for a (user, purpose), then that purpose is locked for 24 hours, one notification mail is sent, and further requests and submissions for that purpose are refused | I28, IR4 |
| B1#11 | When `POST /v1/auth/login` has a matching email and password and the account is not locked, then a new session chain is created, the token pair is returned, and `failed_login_count` is reset to 0 | IR6, IR10 |
| B1#12 | When a login fails because the email is unknown, the password is wrong, the password exceeds 128 code points, or the account is locked, then the response is the same 401 body, and `argon2.verify` runs exactly once in the unknown-email, wrong-password and locked cases (the oversized case reveals nothing about the account) | I10, IR6 |
| B1#13 | When the 10th consecutive wrong password is submitted for an account, then `login_locked_until = now + 15 min` and the counter returns to 0; during the lock even the correct password gets the generic 401; after it the correct password succeeds | I11, IR6 |
| B1#14 | When a request reaches a route without `@Public()`, then it passes only with an `Authorization: Bearer` JWT whose `alg` is HS256, `kid` is a configured key, signature, `iss`, `aud` and `exp` are valid; otherwise 401 | IR10, IE10 |
| B1#15 | When a current refresh token is presented to `POST /v1/auth/refresh`, then exactly one compare-and-set rotation succeeds, a new pair is returned, the chain's `last_used_at` is updated, and the old token no longer rotates | I16, IR11 |
| B1#16 | When a rotated refresh token is presented within 10 seconds of its rotation, the chain is not revoked and its successor is still the chain's current token, then the same successor refresh token and a newly signed access token are returned and a `refresh_grace_used` event is logged | IE1, IR11 |
| B1#17 | When a rotated refresh token is presented and any condition of B1#16 fails, then the whole chain is revoked with reason `reuse_detected`, the response is 401, and a warn-level `refresh_reuse_detected` event is logged without the token | I17, IE2 |
| B1#18 | When a refresh token's chain is idle for more than 90 days or older than 365 days, then refresh returns 401 and the chain is revoked with reason `expired` | I18, IR12 |
| B1#19 | When a login or registration would create an 11th active chain, then the active chain with the oldest `last_used_at` is revoked in the same transaction | IE3, IR15 (`ASSUMPTION`: "oldest" read as least recently used) |
| B1#20 | When `POST /v1/auth/logout` is called, then only the chain named by the token's `sid` is revoked, other chains keep working, a web response also clears the cookie, and a repeated call returns 204 | I19, IR13 |
| B1#21 | When `client` is `web` at login or registration, then the refresh token is only in a `Set-Cookie` with `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/refresh` and not in the body; a cookie refresh without `X-CSRF-Protection: 1` returns 403 and rotates nothing | IR10, Defense Analysis (CSRF) |
| B1#22 | When `POST /v1/auth/password/change` has the correct current password and a valid new one, then the hash is replaced, every chain of the user is revoked, a new chain of the same client type and label is returned for the caller, and a notification mail is dispatched | I20, I26, IR14 |
| B1#23 | When `POST /v1/auth/password/reset` has an email, its live `reset_password` code and a valid new password, then the hash is replaced, every chain is revoked, `email_verified_at` is set if empty, the login lock and counter are cleared, the code is consumed, and a notification mail is dispatched | I9, I26, IR7, IR14 |
| B1#24 | When `PATCH /v1/me` sets `native_language` outside {`vi`, `en`} or a `timezone` that `Intl.DateTimeFormat` rejects, then 400 is returned and nothing changes; valid values are stored as sent | I22, S8, SE5, IR16 |
| B1#25 | When another module calls `IdentityService.isEmailVerified(userId)` or `getProfile(userId)`, then the answer comes from the stored row | I24, IR16 |
| B1#26 | When a route marked `@RequirePermission(p)` is called, then it proceeds only if the stored `staff_role` grants `p` and the token's chain is not revoked; otherwise 403, whatever the token says | I21, IR17, D6 |
| B1#27 | When an admin sets `staff_role` of a user, then it applies to that user's next request without signing them out, and is refused with 409 if the target's email is not verified | D6 |
| B1#28 | When a change would leave zero users with `staff_role = admin`, then it is refused with 409; changes are serialized by `pg_advisory_xact_lock` on a constant key | D6 |
| B1#29 | When `admin:grant <email>` runs for an existing verified user, then the user becomes `admin`; for an unknown or unverified email it exits non-zero and changes nothing | IR17, D6 |
| B1#30 | When today's (UTC) mail count has reached the configured budget, then registration and OTP requests return 503 "mail temporarily unavailable" identically for known and unknown emails; when the count first reaches 80 %, one warn log is written that day | I27, IR19 |
| B1#31 | When a request to the real `AppModule` carries only `X-Test-User-Id`, then a protected route returns 401 | B0E6 |
| B1#32 | When any Identity flow logs, then the line carries `operation_id` and never contains a password, OTP, access or refresh token, or `Set-Cookie` value | S13, IR19, IR21 |

## 9. Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| B1E1 | The same password typed as composed `é` (U+00E9) on one device and decomposed `e` + U+0301 on another | Passwords are NFC-normalized before length checks, hashing and verifying, so both log in | IR3 (`ASSUMPTION`) |
| B1E2 | A login request with a 1 MB password | Rejected with the generic 401 before Argon2 runs; registration rejects it with 400 (`max_length`); no hashing of oversized input | IR3, IE9 |
| B1E3 | An account is locked and the attacker keeps guessing | Failures during the lock neither extend it nor count toward the next lock, so an attacker cannot keep a real user locked forever; the real user can still reset the password, which clears the lock | IR6 (`ASSUMPTION`) |
| B1E4 | A stolen access token is used to brute-force `password/change` | Wrong current passwords count toward the same 10-failure lock as login | IR6 (`ASSUMPTION`) |
| B1E5 | Two refreshes with the same current token arrive together (two tabs) | The loser's conditional `UPDATE` waits for the winner's commit, matches 0 rows, re-reads the row and takes the grace path; both get the same refresh token; the chain never forks | IE1 |
| B1E6 | A→B rotation, then B→C rotation, then A is presented again, all within 10 seconds | B is no longer the chain's current token, so A is treated as reuse and the chain is revoked | IR11 (`ASSUMPTION`: rare, accepted) |
| B1E7 | Logout or password change commits inside a refresh's 10-second grace window | Both the rotation and the grace path check `revoked_at`; the grace pair is refused and the chain stays revoked | IE14 |
| B1E8 | `successor_ciphertext` after the grace window | Never used after `grace_until` (logic); physically erased by the hourly cleanup, so it may sit encrypted in the DB for up to an hour | IR11 (`ASSUMPTION`: spec says "≤ 10 s") |
| B1E9 | Two logins at once when the user already has 10 active chains | Up to 11 can exist briefly; the next chain creation trims back to 10 | IR15 (`ASSUMPTION`: accepted instead of a per-user lock) |
| B1E10 | A web chain's refresh token is sent in the body, or a mobile one through the cookie path | 401 without rotating; `client_type` must match the path | D4 |
| B1E11 | Local development over `http://localhost` with a `Secure` cookie | Works in Chromium-based browsers, which treat localhost as secure; other browsers unverified | `ASSUMPTION` |
| B1E12 | Two admins demote each other at the same instant | The advisory lock serializes them; the second sees one admin left and gets 409 | D6 |
| B1E13 | An admin whose session was revoked still holds a live access token | Normal routes accept it for up to 15 minutes (IR13); `@RequirePermission` routes refuse it because they check the chain | I21, IR13 |
| B1E14 | A JWT signed with `alg: none`, with RS256, or with a removed `kid` | 401; `jose` is called with `algorithms: ["HS256"]` and only configured keys | IE10 |
| B1E15 | Mail budget almost exhausted and several requests pass the pre-check together | The pre-check is a read; the count is incremented atomically when a mail is actually dispatched; a dispatch that finds the budget full is skipped and logged, and the user can request again (then gets 503). The overshoot is bounded by concurrency, so the budget stays below the provider cap | IR19 (`ASSUMPTION`) |
| B1E16 | The process crashes after the response but before the mail is sent | The mail is lost and logged nowhere; the user requests a new code after the 60-second cooldown | IR19, D2 |
| B1E17 | A `reset_password` purpose is locked by the 24-hour cap (B1#10) | OTP requests still return 202 without sending, and submissions get the generic invalid-code 400, so the lock does not reveal the account; a locked `verify_email` (authenticated) returns 429 with `Retry-After` | IR4, I8 |
| B1E18 | Code `"012345"`, or `" 123456 "` with spaces | Codes are 6-digit strings with leading zeros; input is trimmed and must match `^\d{6}$`; HMACs are compared with `timingSafeEqual` | IR4 |
| B1E19 | A client retries registration after losing the 201 response | 409 "email already used"; the client offers sign-in instead. No idempotency key is needed | IR2 |
| B1E20 | A client retries a password change after losing the response | The old "current password" no longer matches, so the retry fails with 401; the change itself succeeded. Accepted | IR14 (`ASSUMPTION`) |
| B1E21 | A verified user calls `verify-email` or asks for a `verify_email` code | OTP request: 202, nothing sent (IE7). Verify call: 200, no change | IE7 |
| B1E22 | The device sends `Asia/Ho_Chi_Minh` | Accepted (Node reports it as `Asia/Saigon` but accepts both); stored as sent | IR16 |
| B1E23 | Every e2e request comes from 127.0.0.1 and test files run in parallel | IP limits and the global mail budget would leak between tests: the test config raises IP limits and gives each app instance its own budget key; the IP-limit test varies the IP through `X-Forwarded-For` with `TRUST_PROXY` on; each test uses unique emails | B0E3 |
| B1E24 | The API runs behind a reverse proxy without `TRUST_PROXY` | Every user shares the proxy's IP and IP limits hit everyone; documented as a deploy requirement | `ASSUMPTION` |
| B1E25 | Stored Argon2 parameters are weaker than the current configuration | After a successful login, `argon2.needsRehash` triggers a rehash with the current parameters | R17 |
| B1E26 | `admin:grant` runs on a database with no users | Exits non-zero with "register this email first" | D6 |

## 10. Chỗ lệch spec — sửa spec sau khi duyệt design này

1. `module-spec-identity-access.md`: IR17 (vai trò `admin`/`editor` + bảng quyền + endpoint cấp/thu); bỏ "màn quản
   lý admin" khỏi "Ngoài phạm vi"; IR11 (chỉ giữ refresh token kế tiếp; lưu vật lý ≤ 1 giờ, B1E8); IR19 và Defense
   Analysis "Timeout và retry" (gửi thư sau khi trả lời); IR15 ("cũ nhất" = dùng lâu nhất chưa dùng lại); OTP một
   endpoint chung (D7).
2. `system-spec.md` SR1, SR9 và `DECISIONS` K1/N1: từ "một owner" thành vai trò nhân sự có quyền.
3. `module-spec-content-pipeline.md` (ràng buộc "chỉ admin", PR18, P17, ngoài phạm vi "nhiều admin và phân vai"),
   `module-spec-vocabulary-content.md` CR19, `module-spec-practice.md` PRC25, `module-spec-entitlements-usage.md`
   ER10/E14: "chỉ admin" → "cần quyền `<p>`".
4. HANDOFF §2: IR7/IR14 chuyển từ Bước 8 sang Bước 1.

## 11. Ngoài phạm vi Bước 1

Google login, liên kết Google (IR8, IR9, I12–I15); xóa tài khoản và trạng thái "đang xóa" (IR18, I23, I25, S17) — Bước
8. CAPTCHA, kiểm mật khẩu đã lộ (câu mở của spec). Giao diện cấp vai trò (Bước 3). Kênh cảnh báo ngoài log (Slack,
email cho owner) — Bước 1 chỉ ghi log warn.

## 12. Rủi ro và việc còn mở

- Mọi con số rate limit, khóa, ngân sách, timeout SMTP, semaphore Argon2 = 4 là `ASSUMPTION`, cấu hình được.
- Mailpit + Testcontainers chưa chạy thử (`ASSUMPTION`) — task đầu của plan.
- Giới hạn gửi của Gmail cá nhân vẫn chưa có nguồn Google (R29).
- Câu mở cũ của Bước 0 (B0E1, `Idempotency-Key` bắt buộc + timeout 30 s) không chặn Bước 1 vì Identity không dùng
  `@Idempotent()`.
- Nhánh `feat/buoc-1-identity-core` tách từ `feat/migrate-drizzle-to-prisma`; repo chưa có `main`, chưa có remote.
