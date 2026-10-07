# Design — Bước 1: Identity core

Ngày: 07/10/2026 (brainstorm 06–07/10; soát lại lần 2 ngày 07/10 đối chiếu code Bước 0 thật). Phạm vi: Bước 1 trong
`../../HANDOFF_2026-10-05_BUOC_0.md` §2, theo spec
[`module-spec-identity-access.md`](../../specs/module-spec-identity-access.md). Brainstorm qua
`superpowers:brainstorming`, hỏi từng câu trong chat. Nền: Bước 0 trên nhánh `feat/migrate-drizzle-to-prisma`
(Prisma 7.10.0, `@nestjs/common` 12.1.2, Vitest + Testcontainers, seam `RequestUser`).

**Nhãn:** **Chốt** = chủ dự án chọn trong phiên brainstorm. **Đề xuất** = trợ lý đề xuất, chủ dự án đã đồng ý phần
chứa nó (hoặc thêm ở lần soát 2, chờ duyệt cùng doc). **ASSUMPTION** = chưa kiểm chứng bằng chạy thật hoặc nguồn.
Criteria/edge cases dùng số hiệu `B1#`/`B1E#` (theo `docs/specs/SPEC_WRITING_CONVENTIONS.md`), trích ngược về
`I#`/`IE#`/`IR#` của spec Identity và `S#`/`SR#` của system-spec.

## 1. Mục tiêu và tiêu chí xong

Thay seam `RequestUser` giả của Bước 0 bằng danh tính thật, để các bước 2–7 có user, phiên, hồ sơ và phân quyền
thật để cắm vào. **Xong khi:** mọi tiêu chí `B1#` ở mục 9 có test e2e chạy trên Postgres thật bằng một lệnh, test cũ
của Bước 0 vẫn xanh, và một lượt chạy tay trên API thật (Postgres + Mailpit trong Docker) đi trọn: đăng ký → đọc OTP
trong Mailpit → xác minh → gia hạn → đổi mật khẩu → logout.

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

Thư viện (đã kiểm `npm view` ngày 06–07/10/2026): `jose` 6.2.12, `argon2` 0.45.1, `nodemailer` 10.0.15,
`cookie-parser` 1.4.7, `zod` 4.6.5 (D10). `jose` có option `currentDate` cho `jwtVerify` (docs `panva/jose`,
đọc qua context7 ngày 07/10) — dùng để đồng hồ giả của test áp được lên kiểm `exp`. Node 24.11 có sẵn `crypto.argon2`
(đo được ~44 ms/lần với m=19456, t=2, p=1) nhưng **không dùng**: trả hash thô, phải tự viết lớp mã hóa chuỗi PHC và so
sánh — tự viết code mật mã là rủi ro không đáng. Gói `argon2` trả chuỗi PHC có tham số + salt, có `verify` và
`needsRehash`.

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

## 3. Cấu trúc module, dữ liệu và chỗ sửa Bước 0

```
apps/api/src/identity/
  auth/       đăng ký, đăng nhập, OTP, đổi/đặt lại mật khẩu, PasswordHasher (bọc argon2 + semaphore)
  sessions/   access token, refresh token, guard toàn cục, @Public()
  profile/    GET/PATCH /v1/me, IdentityService (export cho module khác)
  staff/      bảng quyền, @RequirePermission(), endpoint vai trò, lệnh CLI admin:grant
  mailer/     cổng Mailer, FakeMailer, SmtpMailer, MailDispatcher, ngân sách thư
apps/api/src/common/clock/        Clock (now()), bản giả tua được cho test
apps/api/src/common/maintenance/  tác vụ dọn dẹp mỗi giờ (mục 7)
apps/api/src/app.setup.ts         configureApp(app): dùng chung cho main.ts và e2e test
apps/api/prisma/schema.prisma            chỉ generator + datasource
apps/api/prisma/models/common.prisma     IdempotencyKey, RateLimitCounter (chuyển từ schema.prisma)
apps/api/prisma/models/identity.prisma   bảng của Identity
```

Bảng (Identity sở hữu, theo "Bản đồ ghi dữ liệu" của system-spec):

- **`users`**: `id` uuid, `email` (đã chuẩn hóa, unique, ≤ 254 ký tự), `email_verified_at`, `staff_role`
  (`admin`/`editor`/null), `native_language` (null = chưa thiết lập), `timezone`, `status` (`active`; `deleting` dùng
  từ Bước 8), `failed_login_count`, `login_locked_until`, `created_at`, `updated_at`.
- **`password_credentials`**: `user_id` (PK), `hash` (chuỗi PHC Argon2id), `updated_at`. Tách khỏi `users` để user
  chỉ có Google (Bước 8) không có dòng này và IR9 xóa được mật khẩu mà giữ user. Bảng danh tính Google thêm ở Bước 8.
- **`session_chains`**: `id`, `user_id`, `client_type` (`web`/`mobile`), `device_label` (client gửi, tùy chọn,
  ≤ 100 ký tự; mặc định theo `client_type`), `created_at` (mốc tuyệt đối 365 ngày), `last_used_at` (mốc trượt 90
  ngày; **chỉ cập nhật khi gia hạn**, vì guard không đọc DB), `revoked_at`, `revoke_reason`. **Chain hoạt động** =
  `revoked_at` null, `last_used_at` trong 90 ngày và `created_at` trong 365 ngày.
- **`refresh_tokens`**: `id`, `chain_id`, `token_hash` (SHA-256, unique), `created_at`, `rotated_at`, `successor_id`
  (token thay nó), `successor_ciphertext` (giá trị token kế tiếp, AES-256-GCM), `grace_until`. Chỉ giữ refresh token
  kế tiếp; access token luôn ký mới (lệch nhỏ so với IR11 "giữ cặp", vì access token không cần trả lại y hệt).
- **`otp_codes`**: `id`, `user_id`, `purpose` (`verify_email`/`reset_password`), `code_hmac` (HMAC-SHA256 với khóa
  bí mật server), `expires_at`, `attempts`, `consumed_at`, `invalidated_at`, `created_at`.
- **`otp_failure_windows`**: `(user_id, purpose)` PK, `window_start`, `failures`, `locked_until` — trần cộng dồn 20
  lần sai/24 giờ (IR4). Tăng bằng **một câu lệnh** `INSERT ... ON CONFLICT DO UPDATE` có `CASE` (mở cửa sổ mới khi
  cửa sổ cũ quá 24 giờ) qua TypedSQL, vì Prisma `upsert` không diễn đạt được `CASE`.
- **`mail_budget_days`**: `day` (ngày UTC) PK, `sent`. Tăng bằng Prisma `upsert` + `increment` (cùng mẫu đã kiểm
  bằng query log ở Bước 0 là một câu `INSERT ... ON CONFLICT DO UPDATE`).

**Chỗ sửa code Bước 0** (liệt kê đủ để plan không bỏ sót):

1. **Rate limit:** cột khóa `user_id uuid` → `key text`. Khóa gồm **tên luật** + loại + giá trị:
   `<rule>:<by>:<value>`, ví dụ `login:ip:<hmac>`. Bước 0 hiện khóa chỉ theo `user_id` + `window_start`, nên hai
   endpoint có luật khác nhau dùng **chung một bộ đếm** khi cửa sổ trùng mốc — lỗi tiềm ẩn của Bước 0, sửa luôn ở
   đây. Tách logic đếm ra service `RateLimiter.hit(key, max, windowSeconds)`; `RateLimitGuard` dùng nó cho luật khai
   báo, còn service (vd OTP) gọi trực tiếp khi khóa đếm chỉ biết được sau khi đọc DB. `RateLimiter` lấy giờ từ
   `Clock`. Migration xóa và tạo lại bảng (chỉ chứa bộ đếm tạm, chưa có DB thật).
2. **`ProblemDetailsException`:** thêm field mở rộng (vd `violations`) và `type` cho từng loại lỗi (mục 7).
3. **`RequestWithUser`/`RequestUser`:** chuyển type ra `request-user.ts` (hiện nằm trong file seam giả) và thêm
   `sessionChainId`.
4. **`HealthController`** và `GET /v1/sample` thành `@Public()`; `POST /v1/sample` cần đăng nhập thật.
5. **`configureApp(app)`:** gom `setGlobalPrefix('v1')`, `ProblemDetailsFilter`, `StandardSchemaValidationPipe` (D10),
   `cookie-parser`, `trust proxy`, CORS (D13) vào một hàm dùng chung cho `main.ts` và mọi e2e test dựng `AppModule`.
   Hiện `main.ts` tự làm và test không gọi, nên test không chạy cùng cấu hình với server thật.
6. **`prisma.config.ts`:** `schema: 'prisma/schema.prisma'` → `schema: 'prisma'` (thư mục). Docs Prisma cảnh báo: trỏ
   vào file thì `prisma generate` vẫn chạy nhưng **lặng lẽ bỏ** model ở file khác — plan phải có bước kiểm client sinh
   ra có model `User`.

## 4. Token, phiên, cookie web

- **Access token:** JWT HS256 ký bằng `jose`, sống 15 phút, claims `sub` (user id), `sid` (chain id), `iat`, `exp`,
  `iss`, `aud`; header có `kid`. `JWT_KEYS` chứa danh sách `kid:secret` (mỗi secret ≥ 32 byte ngẫu nhiên); khóa đầu
  ký, mọi khóa trong danh sách đều kiểm (IE10). `jwtVerify` với `algorithms: ["HS256"]`, `issuer`, `audience` và
  `currentDate = Clock.now()`; không cho lệch giờ (server tự ký tự kiểm).
- **Guard toàn cục** (`APP_GUARD`, chạy trước guard gắn ở route như `RateLimitGuard`): mọi route cần đăng nhập trừ
  route ghi `@Public()`. Route `@Public` của Identity: `register`, `login`, `refresh`, `logout` (D12), `otp` (nhánh
  `reset_password`), `password/reset`; ngoài Identity: `GET /v1/health`, `GET /v1/sample`. Guard **không** đọc DB, gắn
  `RequestUser { userId, sessionChainId }`. Trên route `@Public`, guard vẫn gắn `RequestUser` nếu có Bearer token hợp
  lệ, còn token thiếu/sai thì coi như ẩn danh (không 401) — cần cho `POST /v1/auth/otp`, nơi nhánh `verify_email` cần
  user còn nhánh `reset_password` thì không. `@RequirePermission(...)` đọc DB: `staff_role` hiện tại và chain `sid`
  chưa thu hồi (IR17). Hệ quả cho Bước 8: chặn tài khoản "đang xóa" (S17) sẽ cần guard đọc trạng thái user mỗi request.
- **Phản hồi token** (đăng ký, đăng nhập, gia hạn, đổi mật khẩu): `{ access_token, token_type: "Bearer",
  expires_in: 900, refresh_token? }` — `refresh_token` chỉ có với mobile.
- **Refresh token:** 32 byte ngẫu nhiên (base64url), lưu SHA-256. Xoay vòng bằng **compare-and-set** trong một
  transaction: sinh token mới, rồi
  `UPDATE refresh_tokens SET rotated_at, successor_id, successor_ciphertext, grace_until = now + 10 s WHERE id = $id AND rotated_at IS NULL`
  (Prisma `updateMany` trả `count`), rồi chèn dòng token mới. Request thắng (`count = 1`) commit. Request thua
  (`count = 0`; ở READ COMMITTED, Postgres bắt câu `UPDATE` chờ bên thắng commit rồi mới đánh giá lại `WHERE`) đọc
  lại dòng và đi nhánh ân hạn.
- **Ân hạn 10 giây:** token đã xoay quay lại khi `now <= grace_until`, chain chưa thu hồi, **và token `successor_id`
  chưa bị xoay** (vẫn là token hiện hành của chain) → trả lại đúng refresh token kế tiếp (giải mã) + access token ký
  mới; ghi log `refresh_grace_used`. Ngoài các điều kiện đó → coi là dùng lại: thu hồi cả chain, log warn
  `refresh_reuse_detected`. Token không tìm thấy (hash lạ, hoặc đã bị dọn theo mục 7) → 401, không thu hồi gì.
- **Hết hạn:** kiểm khi gia hạn; chain quá 90 ngày không gia hạn hoặc quá 365 ngày tuổi → 401 và chain bị thu hồi với
  lý do `expired`.
- **Tối đa 10 chain hoạt động/tài khoản:** tạo chain thứ 11 thì thu hồi chain hoạt động có `last_used_at` nhỏ nhất,
  trong cùng transaction.
- **Web/mobile:** body đăng nhập/đăng ký có `client: "web" | "mobile"`, lưu vào `client_type`. Web: cookie
  `refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth` (D12: path phủ cả `refresh` và `logout`;
  D13: `Strict` chạy được vì web và API cùng site), `Max-Age` = thời gian còn lại tới mốc hết hạn gần nhất (90 ngày trượt hoặc
  365 ngày tuyệt đối), đặt lại mỗi lần xoay. Body **không** chứa refresh token. Mọi request web dùng cookie (gia hạn,
  logout) **bắt buộc** header `X-CSRF-Protection: 1`. Mobile: refresh token trong body. Có `refresh_token` trong body →
  đường mobile; không có → đường cookie. `client_type` của chain phải khớp đường đi.
- **Logout** `POST /v1/auth/logout` (D12): `@Public`, xác định chain bằng **refresh token** (body
  cho mobile, cookie + header CSRF cho web), không cần access token — để logout vẫn chạy khi access token đã hết hạn
  (app mở lại sau một ngày). Thu hồi chain đó; web thì xóa cookie. Token đã xoay/không tìm thấy/chain đã thu hồi → vẫn
  204 (idempotent, không lộ gì).

## 5. Đăng ký, OTP, mật khẩu, gửi thư

- **Đăng ký** `POST /v1/auth/register` (`@Public`): `email`, `password`, `timezone`, `client`, `device_label?`.
  Thứ tự: kiểm dữ liệu (400) → kiểm ngân sách thư (503) → transaction tạo user + credential + chain (unique
  violation → 409). Trả token. Sau khi trả lời, gửi OTP `verify_email`.
- **Email:** cắt khoảng trắng, chữ thường, ≤ 254 ký tự, đúng dạng địa chỉ email (kiểm cú pháp, không gửi thử).
- **OTP** `POST /v1/auth/otp`: `{ purpose: "verify_email" }` cần đăng nhập (route `@Public`; nhánh này không có
  `RequestUser` thì trả 401 `invalid-token`), gửi tới email tài khoản; `{ purpose: "reset_password", email }` không cần đăng nhập, trả 202 giống
  hệt nhau dù email có hay không. Mã 6 chữ số `crypto.randomInt(0, 1_000_000)` đệm số 0 đầu, hiệu lực 10 phút, mã mới
  vô hiệu mã cũ cùng mục đích. Giới hạn theo email (60 giây, 5 lần/giờ — khung cố định, D11) do `OtpService` gọi `RateLimiter` sau
  khi xác định email, vì nhánh `verify_email` không có email trong body.
- **Xác minh** `POST /v1/auth/verify-email` `{ code }` (cần đăng nhập).
- **Đếm lần sai OTP:** chỉ tính khi có mã còn sống để so (mã chưa dùng, chưa vô hiệu, chưa hết hạn). Gửi mã khi không
  có mã sống → 400 chung, **không** tính vào trần 20 lần/24 giờ (không có gì để đoán).
- **Đăng nhập** `POST /v1/auth/login` (`@Public`). Email không tồn tại → vẫn chạy `argon2.verify` với một hash giả
  tạo lúc khởi động bằng **đúng tham số hiện hành**, để thời gian phản hồi như sai mật khẩu. Sai mật khẩu → tăng
  `failed_login_count` bằng một câu `UPDATE ... RETURNING` (Prisma `update` + `increment`); giá trị trả về ≥ 10 thì
  đặt `login_locked_until` và đưa bộ đếm về 0. `PasswordHasher` giới hạn tối đa 4 lần băm song song (semaphore,
  `ASSUMPTION`; mỗi lần ~19 MiB; `argon2` chạy trên threadpool của libuv, mặc định 4 luồng, dùng chung với DNS/fs —
  nên cân nhắc đặt semaphore < 4 hoặc tăng `UV_THREADPOOL_SIZE`, chốt bằng đo ở plan).
- **Đổi mật khẩu** `POST /v1/auth/password/change` (cần đăng nhập) `{ current_password, new_password }`. Sai mật khẩu
  hiện tại → **400** loại `invalid-current-password` (không dùng 401: client hiểu 401 là phiên hết hạn và sẽ gia
  hạn/đăng xuất). Đang bị khóa đăng nhập → 429 kèm `Retry-After`.
- **Đặt lại mật khẩu** `POST /v1/auth/password/reset` (`@Public`) `{ email, code, new_password }`. Không trả token;
  người dùng đăng nhập lại.
- **Gửi thư sau khi trả lời request** (lệch IR19/Defense Analysis "gửi đồng bộ trong request"): nếu chờ SMTP rồi mới
  trả lời thì luồng quên mật khẩu lộ email có tồn tại qua thời gian phản hồi. `MailDispatcher` khởi động việc gửi
  không `await`, bắt mọi lỗi (không để thành unhandled rejection), giữ danh sách promise đang chạy (test gọi `drain()`
  để chờ). Ngân sách tăng lúc thực sự gửi (B1E15). Timeout SMTP 10 giây (`ASSUMPTION`).
- **Thư thông báo (IR22) ở Bước 1:** đổi mật khẩu, đặt lại mật khẩu, khóa OTP do vượt trần cộng dồn. Hết ngân sách thì
  thư thông báo bị bỏ và ghi log; thao tác chính vẫn thành công.
- **Mailpit** (`axllent/mailpit`) làm SMTP local và cho một test e2e của `SmtpMailer` (`ASSUMPTION`: chạy được với
  Testcontainers — kiểm ở task đầu của plan).

## 6. Rate limit, hồ sơ, vai trò

- **Rate limit:** `@RateLimit` nhận nhiều luật `{ name, by: "user" | "ip" | "email", max, windowSeconds }` (cửa sổ dài
  nhất 24 giờ). IP và email băm HMAC (`RATE_LIMIT_HMAC_KEY`) trước khi lưu. **Cửa sổ cố định theo mốc giờ** như Bước 0
  (D11): "1 lần/60 giây" nghĩa là 1 lần mỗi khung 60 giây, nên hai request sát ranh giới khung có thể cách nhau
  vài giây; "5/giờ" có thể thành tối đa 10 trong vài phút quanh mốc giờ — chấp nhận, vì ngân sách thư và giới hạn IP
  vẫn chặn. Số mặc định (`ASSUMPTION`, cấu hình được), đối chiếu IR20 ("theo IP và theo email hoặc tài khoản"):

  | Endpoint | Theo IP | Theo email / tài khoản |
  |---|---|---|
  | Đăng ký | 5/giờ | — (email trùng đã trả 409) |
  | Đăng nhập | 20/phút | Khóa 10 lần sai liên tiếp (B1#13) |
  | Gửi OTP | 20/giờ | 1/60 giây và 5/giờ mỗi email |
  | Gia hạn | 60/phút | 10/phút mỗi chain |
  | Logout | 60/phút | — |
  | Thư (request gây gửi thư) | 20/ngày | — |
  | Endpoint đã đăng nhập khác | — | 30/phút mỗi user |

- **Hồ sơ** `GET /v1/me` → `{ id, email, email_verified, native_language, timezone, staff_role, permissions }`
  (`permissions` suy từ bảng quyền, để giao diện biết hiện màn nào). `PATCH /v1/me`: `native_language` ∈ {`vi`, `en`}
  (SR3, SE5); `timezone` kiểm bằng `new Intl.DateTimeFormat("en", { timeZone })`, **không** bằng
  `Intl.supportedValuesOf("timeZone")` — đã chạy thử trên Node 24.11: danh sách đó không có `Asia/Ho_Chi_Minh` (chỉ có
  `Asia/Saigon`), còn `DateTimeFormat` nhận cả hai và từ chối `Mars/Base`. Lưu đúng chuỗi client gửi.
  `IdentityService` export `getProfile(userId)` và `isEmailVerified(userId)` (I22, I24).
- **Vai trò** (cần `roles.manage`): `GET /v1/admin/users?email=` (khớp chính xác email đã chuẩn hóa),
  `GET /v1/admin/staff` (danh sách người có `staff_role`, phân trang `page_size`/`page_token` của Bước 0 — giao diện
  Bước 3 cần để thu hồi), `PUT /v1/admin/users/{id}/staff-role` `{ staff_role: "admin" | "editor" | null }`.
  Lệnh CLI `pnpm --filter api admin:grant <email>` (Nest standalone application context, không mở cổng HTTP).

## 7. Lỗi, log, cấu hình, dọn dẹp

**Lỗi** (Problem Details; `type` = `PROBLEM_TYPE_BASE` + slug, `ASSUMPTION`: base URI là cấu hình vì chưa có domain):

| Status | Slug | Khi nào |
|---|---|---|
| 400 | `validation-failed` | Dữ liệu sai; mật khẩu yếu kèm `violations` liệt kê quy tắc chưa đạt |
| 400 | `invalid-otp` | Mã sai, hết hạn, đã dùng, hoặc không có mã sống — một thông báo |
| 400 | `invalid-current-password` | Đổi mật khẩu với mật khẩu hiện tại sai |
| 401 | `invalid-credentials` | Đăng nhập sai (một thông báo cho mọi nguyên nhân) |
| 401 | `invalid-token` | Access token thiếu/sai/hết hạn; refresh token không dùng được |
| 403 | `forbidden` | Thiếu quyền |
| 403 | `csrf-header-required` | Đường cookie thiếu `X-CSRF-Protection: 1` |
| 409 | `email-taken` | Email đã có tài khoản |
| 409 | `staff-role-rule` | Hạ admin cuối cùng; cấp vai trò cho email chưa xác minh |
| 429 | `rate-limited` | Vượt giới hạn, khóa OTP `verify_email`, khóa đăng nhập khi đổi mật khẩu — kèm `Retry-After` |
| 503 | `mail-unavailable` | Hết ngân sách thư |

**Idempotency:** endpoint của Identity **không** dùng `@Idempotent()`. Lệch SR8 ("thao tác có tác dụng phụ nhận
`Idempotency-Key`"), lý do: (1) endpoint `@Public` không có user để khóa key (SR8 theo user); (2) cơ chế Bước 0 lưu
nguyên body phản hồi vào `idempotency_keys.response_body`, mà phản hồi của đăng ký/đổi mật khẩu chứa token — lưu thô
trái IR10 ("lưu dạng hash"); (3) trùng lặp đã được chặn bằng ràng buộc unique, compare-and-set và rate limit (B1E19,
B1E20). `PATCH /v1/me` và `PUT .../staff-role` tự nhiên idempotent.

**Log:** sự kiện `login_failed`, `login_locked`, `refresh_grace_used`, `refresh_reuse_detected`, `otp_sent`,
`otp_locked`, `mail_send_failed`, `mail_budget_80`, `staff_role_changed`. Mang `operation_id` và `user_id` khi biết;
**không** có mật khẩu, mã OTP, token, giá trị cookie, **IP thô**; email lạ (đăng nhập sai, quên mật khẩu) chỉ ghi dạng
HMAC (IR21).

**Cấu hình** (thiếu biến bắt buộc → server không khởi động): `DATABASE_URL`, `JWT_KEYS`, `JWT_ISSUER`, `JWT_AUDIENCE`,
`OTP_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `REFRESH_GRACE_KEY` (AES-256), `SMTP_HOST/PORT/USER/PASS/FROM` (khi dùng
`SmtpMailer`), `MAIL_DAILY_BUDGET` (mặc định 1.500), `TRUST_PROXY`, `CORS_ORIGINS`, `PROBLEM_TYPE_BASE`, cùng các số
giới hạn ở mục 6. Đổi `OTP_HMAC_KEY` làm mọi mã đang sống mất hiệu lực; đổi `RATE_LIMIT_HMAC_KEY` xóa trắng bộ đếm;
đổi `REFRESH_GRACE_KEY` chỉ ảnh hưởng 10 giây ân hạn — đều chấp nhận được.

**CORS (D13):** `CORS_ORIGINS` liệt kê origin web; `credentials: true`; cho phép header `Authorization`,
`Content-Type`, `X-CSRF-Protection`.

**Dọn dẹp mỗi giờ** (trong tiến trình API, tắt được bằng cấu hình — tắt trong test): xóa bộ đếm rate limit có
`window_start` cũ hơn 24 giờ (IR21); xóa `successor_ciphertext` đã quá `grace_until`; xóa `otp_codes` quá 24 giờ sau
khi hết hạn; xóa `session_chains` (và token của chúng) đã thu hồi hoặc hết hạn quá 30 ngày (`ASSUMPTION`). Chạy trùng
ở nhiều instance vô hại (lệnh xóa idempotent).

## 8. Test

- **Unit:** chuẩn hóa email, quy tắc mật khẩu (gồm NFC), bảng quyền, kiểm timezone, băm token/HMAC, tính khóa rate limit.
- **E2E** (Testcontainers Postgres, `AppModule` thật qua `configureApp`, `FakeMailer` thay qua provider override): mỗi
  `B1#` ở mục 9 ít nhất một test; nhóm đồng thời và nhóm đường web ở mục 10. Test cũ của Bước 0 (`sample`,
  `rate-limit`, `idempotency`) sửa theo khóa rate limit mới và vẫn phải xanh.
- **Đồng hồ giả:** mọi mốc thời gian so hạn (OTP, khóa, ân hạn, 90/365 ngày, cửa sổ đếm, `exp` của JWT) tính bằng
  `Clock` trong code và ghi vào DB; không so hạn bằng `now()` của Postgres (đồng hồ giả không với tới được).
- **Không đo thời gian thật** cho I8/I10: spy `PasswordHasher.verify` và kiểm được gọi đúng một lần ở mỗi nhánh.
- **Cookie trong supertest:** cookie `Secure` không được agent tự gửi qua `http`; test đọc `Set-Cookie` và tự gắn header
  `Cookie`.
- **Kiểm chứng cuối** theo `verification.md`: chạy API thật + Postgres + Mailpit, đi tay luồng ở mục 1.

## 9. Acceptance criteria — «When … then …»

| # | Criterion | Cites |
|---|---|---|
| B1#1 | When `POST /v1/auth/register` receives a new email, a valid password, a valid timezone and `client`, then one transaction creates an unverified user (`native_language` null, `staff_role` null), an Argon2id credential (m=19456, t=2, p=1) and a session chain, the response is 201 with an access token and the refresh token (body for mobile, cookie for web), and a `verify_email` OTP is dispatched after the response | I1, IR2, D8 |
| B1#2 | When the normalized email already belongs to a user, then the response is 409 `email-taken`, no row is created and no mail is sent | I2, IR2 |
| B1#3 | When a password (after NFC normalization) fails any of: ≥ 8 code points, ≤ 128 code points, an uppercase letter (`\p{Lu}`), a lowercase letter (`\p{Ll}`), a digit (`\p{Nd}`), a character that is neither letter nor digit, then registration, change or reset returns 400 whose `violations` lists every failed rule, and nothing is stored | I3, IR3 |
| B1#4 | When `POST /v1/auth/otp` with `verify_email` is called by an authenticated unverified user, then earlier unconsumed `verify_email` codes of that user are invalidated, a new 6-digit code valid for 10 minutes is stored as an HMAC, the response is 202, and the code is mailed after the response | IR4, D7 |
| B1#5 | When `POST /v1/auth/otp` with `reset_password` names an email, then the response is 202 with the same body whether or not an account exists, and a code is created and mailed only when it exists | I8, IR7 |
| B1#6 | When an OTP request for an email exceeds 1 per 60-second window or 5 per one-hour window (fixed windows, D11), then the response is 429 `rate-limited` with `Retry-After`, counted per normalized email across both purposes and whether or not an account exists | I6, IR4 |
| B1#7 | When the correct `verify_email` code is submitted within 10 minutes and before 5 attempts, then `email_verified_at` is set, the code is consumed, and submitting it again returns 400 `invalid-otp` | I4, IR5 |
| B1#8 | When a wrong code is submitted while a live code exists, then `attempts` is incremented by one conditional `UPDATE ... WHERE attempts < 5 AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > $now`, and once 5 attempts are used even the correct code is refused until a new code is requested | I5, IR4 |
| B1#9 | When a `reset_password` code is submitted to verify the email, or a `verify_email` code to reset the password, then it is refused, because codes are looked up by (user, purpose) | I7, IR4 |
| B1#10 | When the 21st wrong code against a live code within one 24-hour failure window is submitted for a (user, purpose), then that purpose is locked for 24 hours, one notification mail is sent, and further requests and submissions for that purpose are refused | I28, IR4 |
| B1#11 | When `POST /v1/auth/login` has a matching email and password and the account is not locked, then a new session chain is created, the token pair is returned, and `failed_login_count` is reset to 0 | IR6, IR10 |
| B1#12 | When a login fails because the email is unknown, the password is wrong, the password exceeds 128 code points, or the account is locked, then the response is the same 401 `invalid-credentials` body, and `PasswordHasher.verify` runs exactly once in the unknown-email, wrong-password and locked cases (the oversized case reveals nothing about the account) | I10, IR6 |
| B1#13 | When the 10th consecutive wrong password is submitted for an account, then `login_locked_until = now + 15 min` and the counter returns to 0; during the lock even the correct password gets the generic 401; after it the correct password succeeds | I11, IR6 |
| B1#14 | When a request reaches a route without `@Public()`, then it passes only with an `Authorization: Bearer` JWT whose `alg` is HS256, `kid` is a configured key, and signature, `iss`, `aud` and `exp` (against `Clock.now()`) are valid; otherwise 401 `invalid-token` | IR10, IE10 |
| B1#15 | When a current refresh token is presented to `POST /v1/auth/refresh`, then exactly one compare-and-set rotation succeeds, a new pair is returned, the chain's `last_used_at` is updated, and the old token no longer rotates | I16, IR11 |
| B1#16 | When a rotated refresh token is presented within 10 seconds of its rotation, the chain is not revoked and its `successor_id` token is not itself rotated, then the same successor refresh token and a newly signed access token are returned and a `refresh_grace_used` event is logged | IE1, IR11 |
| B1#17 | When a rotated refresh token is presented and any condition of B1#16 fails, then the whole chain is revoked with reason `reuse_detected`, the response is 401, and a warn-level `refresh_reuse_detected` event is logged without the token | I17, IE2 |
| B1#18 | When a refresh token's chain has not been refreshed for more than 90 days or is older than 365 days, then refresh returns 401 and the chain is revoked with reason `expired` | I18, IR12 |
| B1#19 | When a login, registration or password change would create an 11th active chain, then the active chain with the oldest `last_used_at` is revoked in the same transaction | IE3, IR15 (`ASSUMPTION`: "oldest" read as least recently used) |
| B1#20 | When `POST /v1/auth/logout` presents a refresh token (body for mobile, cookie with `X-CSRF-Protection: 1` for web) (D12), then only that token's chain is revoked, other chains keep working, a web response also clears the cookie, and a repeated or unknown-token call still returns 204 | I19, IR13 |
| B1#21 | When `client` is `web` at login or registration, then the refresh token is only in a `Set-Cookie` with `HttpOnly; Secure; SameSite=Strict; Path=/v1/auth` and a `Max-Age` equal to the nearer expiry, and not in the body; a cookie refresh or logout without `X-CSRF-Protection: 1` returns 403 `csrf-header-required` and changes nothing | IR10, Defense Analysis (CSRF) |
| B1#22 | When `POST /v1/auth/password/change` has the correct current password and a valid new one, then the hash is replaced, every chain of the user is revoked, a new chain of the same client type and label is returned for the caller (cookie for web), and a notification mail is dispatched | I20, I26, IR14 |
| B1#23 | When `POST /v1/auth/password/reset` has an email, its live `reset_password` code and a valid new password, then the hash is replaced, every chain is revoked, `email_verified_at` is set if empty, the login lock and counter are cleared, the code is consumed, and a notification mail is dispatched | I9, I26, IR7, IR14 |
| B1#24 | When `PATCH /v1/me` sets `native_language` outside {`vi`, `en`} or a `timezone` that `Intl.DateTimeFormat` rejects, then 400 is returned and nothing changes; valid values are stored as sent | I22, S8, SE5, IR16 |
| B1#25 | When another module calls `IdentityService.isEmailVerified(userId)` or `getProfile(userId)`, then the answer comes from the stored row | I24, IR16 |
| B1#26 | When a route marked `@RequirePermission(p)` is called, then it proceeds only if the stored `staff_role` grants `p` and the token's chain is not revoked; otherwise 403 `forbidden`, whatever the token says | I21, IR17, D6 |
| B1#27 | When an admin sets `staff_role` of a user, then it applies to that user's next request without signing them out, and is refused with 409 `staff-role-rule` if the target's email is not verified | D6 |
| B1#28 | When a change would leave zero users with `staff_role = admin`, then it is refused with 409 `staff-role-rule`; role changes are serialized by `pg_advisory_xact_lock` on a constant key | D6 |
| B1#29 | When `admin:grant <email>` runs for an existing verified user, then the user becomes `admin`; for an unknown or unverified email it exits non-zero and changes nothing | IR17, D6 |
| B1#30 | When today's (UTC) mail count has reached the configured budget, then registration and OTP requests return 503 `mail-unavailable` identically for known and unknown emails; when the count first reaches 80 %, one warn log is written that day | I27, IR19 |
| B1#31 | When a request to the real `AppModule` carries only `X-Test-User-Id`, then a protected route returns 401 | B0E6 |
| B1#32 | When any Identity flow logs, then the line carries `operation_id` and never contains a password, OTP, access or refresh token, cookie value, raw IP address, or the plain email of a failed sign-in or reset request | S13, SR10, IR19, IR21 |
| B1#33 | When two rate-limit rules with different windows guard different endpoints for the same user or IP, then each rule counts only its own requests | B0 fix (mục 3) |

## 10. Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| B1E1 | The same password typed as composed `é` (U+00E9) on one device and decomposed `e` + U+0301 on another | Passwords are NFC-normalized before length checks, hashing and verifying, so both log in | IR3 (`ASSUMPTION`) |
| B1E2 | A login request with a 1 MB password | Rejected with the generic 401 before Argon2 runs; registration rejects it with 400 (`max_length`); no hashing of oversized input | IR3, IE9 |
| B1E3 | An account is locked and the attacker keeps guessing | Failures during the lock neither extend it nor count toward the next lock, so an attacker cannot keep a real user locked forever; the real user can still reset the password, which clears the lock | IR6 (`ASSUMPTION`) |
| B1E4 | A stolen access token is used to brute-force `password/change` | Wrong current passwords return 400 `invalid-current-password` and count toward the same 10-failure lock as login; while locked, `password/change` returns 429 | IR6 (`ASSUMPTION`) |
| B1E5 | Two refreshes with the same current token arrive together (two tabs) | The loser's conditional `UPDATE` waits for the winner's commit, matches 0 rows, re-reads the row and takes the grace path; both get the same refresh token; the chain never forks | IE1 |
| B1E6 | A→B rotation, then B→C rotation, then A is presented again, all within 10 seconds | B is already rotated, so A is treated as reuse and the chain is revoked | IR11 (`ASSUMPTION`: rare, accepted) |
| B1E7 | Logout or password change commits inside a refresh's 10-second grace window | Both the rotation and the grace path check `revoked_at`; the grace pair is refused and the chain stays revoked | IE14 |
| B1E8 | `successor_ciphertext` after the grace window | Never used after `grace_until` (logic); physically erased by the hourly cleanup, so it may sit encrypted in the DB for up to an hour | IR11 (`ASSUMPTION`: spec says "≤ 10 s") |
| B1E9 | Two logins at once when the user already has 10 active chains | Up to 11 can exist briefly; the next chain creation trims back to 10 | IR15 (`ASSUMPTION`: accepted instead of a per-user lock) |
| B1E10 | A web chain's refresh token is sent in the body, or a mobile one through the cookie path | 401 without rotating; `client_type` must match the path | D4 |
| B1E11 | Local development over `http://localhost` with a `Secure` cookie | Works in Chromium-based browsers, which treat localhost as secure; other browsers unverified | `ASSUMPTION` |
| B1E12 | Two admins demote each other at the same instant | The advisory lock serializes them; the second sees one admin left and gets 409 | D6 |
| B1E13 | An admin whose session was revoked still holds a live access token | Normal routes accept it for up to 15 minutes (IR13); `@RequirePermission` routes refuse it because they check the chain | I21, IR13 |
| B1E14 | A JWT signed with `alg: none`, with RS256, or with a removed `kid` | 401; `jose` is called with `algorithms: ["HS256"]` and only configured keys | IE10 |
| B1E15 | Mail budget almost exhausted and several requests pass the pre-check together | The pre-check is a read; the count is incremented atomically when a mail is actually dispatched; a dispatch that finds the budget full is skipped and logged, and the user can request again (then gets 503). The overshoot is bounded by concurrency, so the budget stays below the provider cap | IR19 (`ASSUMPTION`) |
| B1E16 | The process crashes after the response but before the mail is sent | The mail is lost; the user requests a new code after the cooldown | IR19, D2 |
| B1E17 | A `reset_password` purpose is locked by the 24-hour cap (B1#10) | OTP requests still return 202 without sending, and submissions get 400 `invalid-otp`, so the lock does not reveal the account; a locked `verify_email` (authenticated) returns 429 with `Retry-After` | IR4, I8 |
| B1E18 | An attacker who knows a victim's email requests reset codes (mailed to the victim) and submits wrong ones until the 20-failure cap | The victim's password reset is locked for 24 hours and the victim gets the lock notification; password login is unaffected. Accepted: this is the price IR4's cumulative cap pays to stop code guessing | IR4, I28 (`ASSUMPTION`: accepted DoS) |
| B1E19 | Code `"012345"`, or `" 123456 "` with spaces | Codes are 6-digit strings with leading zeros; input is trimmed and must match `^\d{6}$`; HMACs are compared with `timingSafeEqual` | IR4 |
| B1E20 | A client retries registration after losing the 201 response | 409 `email-taken`; the client offers sign-in instead. No idempotency key is needed | IR2 |
| B1E21 | A client retries a password change after losing the response | The old "current password" no longer matches, so the retry gets 400 `invalid-current-password`; the change itself succeeded. Accepted | IR14 (`ASSUMPTION`) |
| B1E22 | A verified user calls `verify-email` or asks for a `verify_email` code | OTP request: 202, nothing sent (IE7). Verify call: 200, no change | IE7 |
| B1E23 | The device sends `Asia/Ho_Chi_Minh` | Accepted (Node reports it as `Asia/Saigon` but accepts both); stored as sent | IR16 |
| B1E24 | Every e2e request comes from 127.0.0.1 and test files run in parallel | IP limits and the global mail budget would leak between tests: the test config raises IP limits and gives each app instance its own budget key; the IP-limit test varies the IP through `X-Forwarded-For` with `TRUST_PROXY` on; each test uses unique emails | B0E3 |
| B1E25 | The API runs behind a reverse proxy without `TRUST_PROXY` | Every user shares the proxy's IP and IP limits hit everyone; documented as a deploy requirement | `ASSUMPTION` |
| B1E26 | Stored Argon2 parameters are weaker than the current configuration | After a successful login, `argon2.needsRehash` triggers a rehash with the current parameters | R17 |
| B1E27 | `admin:grant` runs on a database with no users | Exits non-zero with "register this email first" | D6 |
| B1E28 | Known and unknown emails take different DB work on failed login (counter `UPDATE`) and on reset requests (OTP insert) | Argon2 (~44 ms) dominates and runs in both branches; the remaining difference is a few ms of DB writes. Accepted as residual; not padded artificially | I8, I10 (`ASSUMPTION`: residual accepted) |
| B1E29 | A mobile app reopens after a day and the user taps logout with an expired access token | Logout works because it uses the refresh token, not the access token (D12) | IR13 |
| B1E30 | A refresh token whose chain was cleaned up after 30 days dead is replayed | 401 `invalid-token`; nothing to revoke | Mục 7 |
| B1E31 | Prisma config still points at `schema.prisma` after models move to `prisma/models/` | `prisma generate` succeeds but the client silently lacks the models; the plan verifies the generated client exports `User` | Prisma docs (multi-file schema pitfalls) |

## 11. Chỗ lệch spec — sửa spec sau khi duyệt design này

1. `module-spec-identity-access.md`: IR17 (vai trò `admin`/`editor` + bảng quyền + endpoint cấp/thu); bỏ "màn quản
   lý admin" khỏi "Ngoài phạm vi"; IR11 (chỉ giữ refresh token kế tiếp; lưu vật lý ≤ 1 giờ, B1E8); IR19 và Defense
   Analysis "Timeout và retry" (gửi thư sau khi trả lời); IR15 ("cũ nhất" = dùng lâu nhất chưa dùng lại); OTP một
   endpoint chung (D7); I6 ("1 lần mỗi khung 60 giây", D11); IR13/I19 (logout bằng refresh token, D12); IR10 hoặc ràng buộc deploy
   (web và API cùng tên miền gốc, D13).
2. `system-spec.md` SR1, SR9 và `DECISIONS` K1/N1: từ "một owner" thành vai trò nhân sự có quyền. SR8: Identity không
   nhận `Idempotency-Key` (lý do ở mục 7).
3. `module-spec-content-pipeline.md` (ràng buộc "chỉ admin", PR18, P17, ngoài phạm vi "nhiều admin và phân vai"),
   `module-spec-vocabulary-content.md` CR19, `module-spec-practice.md` PRC25, `module-spec-entitlements-usage.md`
   ER10/E14: "chỉ admin" → "cần quyền `<p>`".
4. HANDOFF §2: IR7/IR14 chuyển từ Bước 8 sang Bước 1.

## 12. Ngoài phạm vi Bước 1

Google login, liên kết Google (IR8, IR9, I12–I15); xóa tài khoản và trạng thái "đang xóa" (IR18, I23, I25, S17) — Bước
8, khi đó guard phải đọc trạng thái user mỗi request (mục 4). CAPTCHA, kiểm mật khẩu đã lộ (câu mở của spec). Giao diện
cấp vai trò (Bước 3). Kênh cảnh báo ngoài log (Slack, email cho owner) — Bước 1 chỉ ghi log warn. Tài liệu OpenAPI.

## 13. Quyết định chốt ở lần soát 2 (07/10/2026)

Bốn câu hỏi lộ ra khi soát lại doc với code Bước 0, chủ dự án đã chốt cả bốn theo đề xuất:

| # | Quyết định | Lý do |
|---|---|---|
| D10 | **Kiểm dữ liệu đầu vào bằng `zod`** + `StandardSchemaValidationPipe` (có sẵn trong `@nestjs/common` 12.1.2 đã cài, kiểm bằng `import` ngày 07/10), áp dụng cho mọi module | Một schema vừa kiểm lúc chạy vừa sinh type; không cần `class-transformer` và metadata decorator; hợp ESM. Lỗi của pipe phải ra dạng Problem Details `validation-failed` |
| D11 | **Rate limit dùng khung cố định cho mọi luật** (cơ chế Bước 0) | Đã test và kiểm atomic ở Bước 0; vượt nhẹ ở ranh giới khung được ngân sách thư và giới hạn IP chặn |
| D12 | **Logout xác định phiên bằng refresh token** (body cho mobile, cookie + header CSRF cho web) | Logout chạy được cả khi access token đã hết hạn; cookie dùng `Path=/v1/auth` |
| D13 | **Web và API cùng tên miền gốc khi deploy** (vd `app.<miền>` và `api.<miền>`) | Điều kiện để cookie `SameSite=Strict` được gửi; là yêu cầu deploy, ghi vào runbook của Bước 3 |

## 14. Rủi ro và việc còn mở

- Mọi con số rate limit, khóa, ngân sách, timeout SMTP, semaphore Argon2, giữ dữ liệu 30 ngày là `ASSUMPTION`, cấu
  hình được.
- Mailpit + Testcontainers chưa chạy thử (`ASSUMPTION`) — task đầu của plan.
- Giới hạn gửi của Gmail cá nhân vẫn chưa có nguồn Google (R29).
- Câu mở cũ của Bước 0 (B0E1, `Idempotency-Key` bắt buộc + timeout 30 s) không chặn Bước 1 vì Identity không dùng
  `@Idempotent()`.
- Nhánh `feat/buoc-1-identity-core` tách từ `feat/migrate-drizzle-to-prisma`; repo chưa có `main`, chưa có remote.
