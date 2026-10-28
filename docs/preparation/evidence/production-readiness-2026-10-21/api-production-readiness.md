# API production readiness — ghi chép kiểm (21/10/2026)

- **Phạm vi:** backend `apps/api` (API `dist/main.js` + worker `dist/worker.js`), cấu hình CI, compose, `.env.example`.
- **Nguồn:** snapshot nhánh `dev` tại commit `985531b` (Merge PR #101). Mọi `path:line` dưới đây tính từ gốc repo, theo snapshot đó.
- **Cách kiểm:** chỉ đọc code/config; không sửa, không cài, không chạy server/test. Hai kiểm chứng phụ đã chạy: đọc source
  `@nestjs/core`/`@nestjs/platform-express` 12.1.2 và `pg-connection-string` 2.14.1 trong `node_modules` của working copy (cùng version
  với `pnpm-lock.yaml` của snapshot: dòng 2005, 2028, 5983), và `node -e` in default timeout của `http.Server` trên Node v24.11.0.
- Đã có review khác cho lỗi tính năng: `docs/superpowers/reviews/2026-10-18-buoc-0-4-code-review.md` (gọi tắt **review 18/10**). Phát hiện
  trùng với review đó chỉ được tham chiếu mã (T12, FD10, FD11, DB17, DB18, R3…), không phân tích lại.

## Tóm tắt: 5 gap ảnh hưởng production lớn nhất

1. **Chưa có đường đóng gói và deploy API + worker.** Không Dockerfile, không workflow deploy cho API, không script backup/restore. Build
   cần một Postgres **đã migrate** (TypedSQL `prisma generate --sql`), và `prisma` CLI (dùng cho `migrate deploy`) chỉ là devDependency.
   → Chưa có cách lên production lặp lại được, chưa có cách khôi phục dữ liệu. (mục 7, 10)
2. **Không biết hệ thống đang hỏng.** `GET /v1/health` luôn trả `{status:'ok'}`, không chạm DB hay Redis; worker không có health nào.
   Không Sentry, không metrics, không tracing, không access log; dòng log JSON **không có timestamp**. → DB sập, worker chết, reminder
   ngừng gửi: load balancer vẫn route vào, không ai được báo. (mục 3, 4)
3. **"Chế độ production" là fail-open.** Code không đọc `NODE_ENV`. Cờ duy nhất chặn fake provider là `BILLING_PRODUCTION`, mặc định
   `false`; `.env.example` bật cả `BILLING_FAKE_ENABLED=true` và `AI_FAKE_ENABLED=true`. Quên một biến → production chạy fake billing
   (webhook public `/v1/billing/webhooks/fake` nhận event subscription giả từ bất kỳ ai có `BILLING_FAKE_SECRET`) và fake AI. (mục 1)
4. **Job "mỗi giờ" có thể không bao giờ chạy.** `MaintenanceScheduler` dùng `setInterval` 1 giờ, lần chạy đầu sau 1 giờ kể từ lúc process
   khởi động (đã có trong review 18/10: FD10). Nay nó gánh 15 job, gồm chuyển trạng thái subscription hết hạn, gửi email trial/gia hạn,
   retry billing event, dọn dữ liệu. Deploy/restart dày hơn 1 giờ một lần → các việc này đứng im, không có cảnh báo. (mục 8)
5. **IP client sau proxy.** `TRUST_PROXY` mặc định `false` (T12 của review 18/10) và **chỉ nhận danh sách IP/CIDR**: không nhận số hop
   (`1`) hay `true`. Sau Cloudflare + LB phải liệt kê mọi dải IP Cloudflare (thay đổi theo thời gian); sai thì rate limit theo IP (đăng ký,
   đăng nhập, OTP, reset) áp lên IP của proxy. (mục 6)

Đứng sau 5 gap trên: OTP/email tài khoản gửi trong process không retry (mục 9); `sslmode=require` của `pg` bị hiểu là `verify-full`
(mục 7); không security header, `X-Powered-By: Express` còn bật (mục 6); `/v1/sample` (endpoint thử của Bước 0) còn mở trên production
(mục 11).

---

## 1. Config: nạp, validate, cờ dev/test, NODE_ENV — **một phần**

- **Có:** env được validate bằng zod schema lúc khởi động, fail fast:
  - `apps/api/src/common/config/app-config.ts:161-245` (schema); `:247-252` (`loadConfig` ném lỗi, liệt kê **tên** biến sai, không in giá trị).
  - API gọi `loadConfig` trước khi tạo app: `apps/api/src/main.ts:12`. Worker cũng vậy: `apps/api/src/worker.ts:10`.
  - Nạp `.env` nếu có file ở cwd: `apps/api/src/main.ts:9-11`, `apps/api/src/worker.ts:7-9`, `apps/api/prisma.config.ts:5-7`.
- **Cờ dev/test và cách production từ chối:**
  - `BILLING_FAKE_ENABLED` (mặc định `false`, `app-config.ts:216`), `AI_FAKE_ENABLED` (mặc định `false`, `:219`). Chỉ bị từ chối khi
    `BILLING_PRODUCTION=true` (`:232-241`). `BILLING_PRODUCTION` mặc định `false` (`:215`).
  - `.env.example` bật cả hai fake: `apps/api/.env.example:59-61` (`BILLING_PRODUCTION=false`, `BILLING_FAKE_ENABLED=true`) và `:68`
    (`AI_FAKE_ENABLED=true`).
  - Fake billing tự đăng ký khi cờ bật: `apps/api/src/entitlements/billing/fake/fake-billing.adapter.ts:34-36`; webhook public
    `apps/api/src/entitlements/billing/webhook.controller.ts:13-30`. Fake AI: `apps/api/src/ai/adapters/adapters.registrar.ts:20`.
  - `OPENAI_CUSTOM_HEADERS`/`ANTHROPIC_CUSTOM_HEADERS` phải rỗng, không thì không khởi động: `app-config.ts:225-231`.
  - Cờ chỉ dành cho test nằm trong code, không qua env: `pipeline.runWorkers` (`app-config.ts:296`, worker bật ở `worker.ts:11-13`),
    `reminders.runScheduler` (`app-config.ts:300`). `IMPORT_JOB_BACKOFF_MS`, `IMPORT_ROW_RETRY_BASE_MS` ghi "test speed overrides only"
    (`.env.example:18-20`).
- **NODE_ENV:** không được đọc ở đâu. Đã tìm `NODE_ENV` trong `apps/api` (`*.ts`, `*.json`, `*.mjs`) và `.github`: 0 kết quả.
- **Ý nghĩa production:** schema tốt (thiếu biến là chết ngay, không chạy nửa vời). Nhưng ranh giới dev/prod dựa vào một cờ mang tên
  "billing", mặc định mở. Đề xuất: một biến môi trường rõ ràng (vd. `APP_ENV=production`) mà khi bật thì bắt buộc tắt mọi fake, và mặc
  định từ chối fake trừ khi khai báo rõ là môi trường dev/test.

## 2. Secrets — **có (key ký JWT xoay được); một phần (các key khác)**

- `JWT_KEYS` = danh sách `kid:base64url`, kid không trùng, key đầu ký: `app-config.ts:138-147`;
  `apps/api/src/identity/sessions/access-token.service.ts:19-28` (ký bằng `keys[0]`, header `kid`), `:34-39` (verify theo `kid`, chỉ
  `HS256`). → xoay key được: thêm key mới lên đầu, giữ key cũ đến khi access token cũ hết hạn (mặc định 900 s, `app-config.ts:199`).
- Secret khác: `OTP_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY` (≥ 32 byte), `REFRESH_GRACE_KEY` (đúng 32 byte): `app-config.ts:131-136`, `:173-175`.
  Mỗi cái chỉ một giá trị, không có cơ chế xoay. Đổi `REFRESH_GRACE_KEY` làm hỏng các refresh đang trong grace; đổi `OTP_HMAC_KEY` làm hỏng
  mã OTP còn sống (10 phút).
- Sinh secret: `apps/api/scripts/gen-secret.mjs` (CI dùng ở `.github/workflows/ci.yml:205-214`).
- **Không thấy secret bị commit:** `.gitignore:4-11` chặn `.env`, `.env.*`, `*.pem`, `*.key`; snapshot chỉ có `apps/api/.env.example` và
  `apps/admin/.env.example`. Đã quét toàn snapshot (trừ `node_modules`, lockfile) các mẫu `sk-ant-…`, `sk-…`, `AKIA…`, `-----BEGIN … PRIVATE KEY`,
  `ghp_…`, `xox[bp]-…`: chỉ ra 1 kết quả giả (chuỗi base64 font trong `apps/web/src/app/[locale]/og-fonts.generated.ts:3`), đồng thời là
  đối chứng rằng lệnh quét có đọc file. Ngoài snapshot: file chưa commit `.verify-b25-accounts.md` đã được review 18/10 nêu.
- **Ý nghĩa production:** cần nơi giữ secret (secret manager của hosting) và quy trình xoay. Tài khoản staff mới nhận **mật khẩu dạng chữ
  thường trong email** (`apps/api/src/identity/mailer/templates.ts:38`), có cờ buộc đổi mật khẩu — nên biết khi chọn SMTP.

## 3. Health / readiness — **thiếu**

- Chỉ có `GET /v1/health` trả cứng `{ status: 'ok' }`: `apps/api/src/health/health.controller.ts:4-10`. Không truy vấn DB, không ping Redis,
  không phân biệt liveness/readiness.
- API khởi động được kể cả khi DB không tới được: Prisma tạo client lazy (`apps/api/src/common/db/prisma.module.ts:24-31`), không có bước
  kết nối thử lúc boot.
- Worker không mở HTTP nào (`apps/api/src/worker.ts:11-16`) → không có probe cho worker.
- Lúc tắt (SIGTERM) không có pha "báo không sẵn sàng" trước khi đóng (xem mục 5).
- **Ý nghĩa production:** LB/orchestrator không phân biệt được "process sống" với "phục vụ được". Cần `/health/live` (như hiện nay) và
  `/health/ready` (SELECT 1 + Redis PING có timeout); worker cần một cách báo sống (heartbeat vào DB/Redis hoặc port nhỏ).

## 4. Logging, error tracking, metrics, tracing — **một phần (log) / thiếu (phần còn lại)**

- **Log:** logger tự viết, ghi một dòng JSON ra stdout: `apps/api/src/common/common.module.ts:15-17`; `apps/api/src/common/logging/app-logger.ts:42-66`.
  - Trường: `level`, `event`, `operation_id`, cộng field của caller: `app-logger.ts:4-9`, `:58-64`. **Không có timestamp.**
  - `operation_id`: UUID sinh mới mỗi request, giữ qua `AsyncLocalStorage`: `apps/api/src/common/logging/operation-id.middleware.ts:9-12`,
    `request-context.ts:1-11`. Không nhận id từ upstream (vd. header của LB/Cloudflare), không trả về header response; chỉ có trong body
    lỗi `problem+json` (`apps/api/src/common/problem-details/problem-details.filter.ts:50`). Đã tìm `x-request-id|traceparent`: không có.
  - Redact theo **tên key** bằng regex `password|otp|code|token|cookie|authorization|answer|contextSentence`: `app-logger.ts:16`, `:29-40`.
    Lỗ hổng của regex đã có trong review 18/10 (FD11).
  - Error chỉ ghi `name` + `code` (`app-logger.ts:19-27`); lỗi 5xx ghi thêm tối đa 10 dòng stack frame, không message
    (`problem-details.filter.ts:26-34`, `:102-112`). C3 của review 18/10 đã được sửa ở đây.
  - Không có access log (method, route, status, thời gian). Đã tìm `res.on('finish'`, `duration_ms`, `request_completed`, `morgan`: không có.
  - Log khởi động của Nest dùng logger mặc định dạng chữ, không JSON: `NestFactory.create` không truyền `logger` (`apps/api/src/main.ts:13`).
- **Error tracking / metrics / tracing:** không có. Đã tìm `sentry|opentelemetry|prom-client|prometheus|datadog|newrelic|pino|winston`
  trong `apps/api/package.json` và `apps/api/src`: chỉ có `openTelemetry: false` khi tạo Anthropic client
  (`apps/api/src/ai/adapters/anthropic/anthropic.adapter.ts:23`). Dependencies đầy đủ: `apps/api/package.json:37-58`.
- `start:prod` chạy `node dist/main` không có `--enable-source-maps` (`apps/api/package.json:17`), nên stack frame trỏ vào file JS đã build.
- **Ý nghĩa production:** nền log có cấu trúc là điểm tốt. Thiếu: timestamp (nhiều nền tảng tự thêm, nhưng không chắc), access log để
  đo lỗi/độ trễ, nơi gom lỗi và cảnh báo, metrics cơ bản (tỉ lệ 5xx, p95, độ dài hàng đợi BullMQ, số job maintenance lỗi).

## 5. Graceful shutdown và timeout — **một phần**

- **API:** `app.enableShutdownHooks()` (`apps/api/src/main.ts:17`). Nest 12.1.2 tắt theo thứ tự `onModuleDestroy` → `beforeApplicationShutdown`
  → đóng HTTP server → `onApplicationShutdown` (`node_modules/@nestjs/core/nest-application-context.js:141-148`, đọc trong working copy).
  - Hệ quả: hàng đợi BullMQ và kết nối Redis của API đóng **trước** khi HTTP ngừng nhận request; request đến trong khoảng đó enqueue thất
    bại (`apps/api/src/content-pipeline/jobs/job-queue.service.ts:38`), job ở lại `queued` trong DB và reconciler nhặt lại — không mất dữ
    liệu, chỉ chậm.
  - Không bật `forceCloseConnections`/`return503OnClosing` (tùy chọn có trong `express-adapter.js:226-238`, app không truyền) → `server.close`
    chờ request đang chạy xong.
  - Mail sau response được xả khi tắt: `apps/api/src/common/mail/mail-dispatcher.service.ts:38-46`; billing apply cũng vậy:
    `apps/api/src/entitlements/billing/billing-inbox.service.ts:79-85`.
- **Worker:** `enableShutdownHooks()` (`apps/api/src/worker.ts:16`); đóng Worker BullMQ và Redis: `job-runner.service.ts:95-112`,
  `notifications/scheduler/reminder-queue.service.ts:98-116`, `ai/eval/eval-queue.service.ts:77-94`; dừng timer reconciler
  `job-reconciler.service.ts:86-90`, maintenance `common/maintenance/maintenance.scheduler.ts:58-61`. `worker.close()` của BullMQ chờ job
  đang chạy; job import dài có thể vượt thời gian chờ của nền tảng (SIGKILL) — lease + reconciler sẽ nhận lại (`job-reconciler.service.ts:32-74`).
- **Prisma:** không `$disconnect()` khi tắt (đã tìm `$disconnect|onModuleDestroy|onApplicationShutdown`: chỉ các CLI gọi `$disconnect`,
  vd. `apps/api/src/cli/run-maintenance.ts:20`). Process thoát thì pool tự đóng; rủi ro thấp.
- **Timeout HTTP server:** không cấu hình. Đã tìm `keepAliveTimeout|headersTimeout|requestTimeout`: không có. Default đo trên Node v24.11.0:
  `keepAliveTimeout=5000`, `headersTimeout=60000`, `requestTimeout=300000`. Sau một LB có idle timeout dài hơn 5 s, kết nối keep-alive có thể
  bị Node đóng trong lúc LB còn dùng → lỗi 502 lác đác (tùy nền tảng).
- **Timeout gọi ra ngoài:**
  - AI: theo setting `ai.callTimeoutSeconds` (`apps/api/src/ai/runner/runner.service.ts:92-93`), truyền vào SDK (`openai.adapter.ts:68`), SDK
    không tự retry (`anthropic.adapter.ts:16-26`); mô tả model 5 s (`ai.constants.ts:18`).
  - SMTP: 10 s cho từng pha connect/greeting/socket, không có tổng (`apps/api/src/common/mail/smtp-mailer.ts:15-22`).
  - Billing adapter: 5 s (`entitlements/billing/adapter-call.ts:7-19`, `entitlements.constants.ts:28`).
  - Redis phía API: connect/command 2 s (`job-queue.service.ts:8`, `:23-28`; `eval-queue.service.ts:62-64`).
  - DB: chờ connection 5 s (`app-config.ts:166`, `prisma.module.ts:25-29`); transaction có `timeout` 10–30 s ở từng chỗ (vd.
    `content-pipeline/jobs/background-jobs.service.ts:44`). Không có `statement_timeout` (đã tìm `statement_timeout|idle_in_transaction`: không có).

## 6. Security — **một phần**

- **Security header:** không có. Đã tìm `helmet|x-powered-by|Strict-Transport|X-Frame|csurf`: không có trong `apps/api/src` và
  `package.json`. Adapter Express của Nest 12.1.2 không tắt `x-powered-by` (đã tìm trong `express-adapter.js`) → response mang
  `X-Powered-By: Express`. Với API trả JSON, thiếu header ít nghiêm trọng hơn web, nhưng nên có `nosniff`, HSTS (hoặc đặt ở edge).
- **CORS:** danh sách origin chính xác từ `CORS_ORIGINS` (validate là origin http/https, `app-config.ts:186-189`), `credentials: true`,
  header cho phép giới hạn: `apps/api/src/app.setup.ts:20-25`. Lỗi body-parser trả về thiếu header CORS: FD6 của review 18/10.
- **Cookie refresh:** `httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/v1/auth'`, không đặt `Domain` (host-only):
  `apps/api/src/identity/sessions/session-transport.ts:13-15`, `:23-26`. Mobile nhận refresh token trong body (`:27-28`).
  → API phải cùng "site" (cùng tên miền đăng ký, vd. `wordmet.com`) với web/admin, nếu không cookie Strict không đi kèm request. Thiết kế
  dự kiến `admin-api.wordmet.com` (`.github/workflows/ci.yml:144`), hợp với điều này.
- **CSRF:** refresh bằng cookie bắt buộc header `X-CSRF-Protection: 1` (`session-transport.ts:41-43`); các endpoint khác dùng Bearer token
  (`identity/sessions/auth.guard.ts:22`), không dựa vào cookie. App tắt body parser mặc định (`main.ts:13`) và chỉ đăng ký `json` + `raw`
  (`app.setup.ts:13-17`), không parse form urlencoded. → rủi ro CSRF thấp.
- **Rate limit:** tự viết, **opt-in từng route** bằng `@RateLimit` (`common/rate-limit/rate-limit.decorator.ts:7-8`), đếm cửa sổ cố định
  trong **Postgres** (upsert `rate_limit_counters`, `common/rate-limit/rate-limiter.service.ts:17-41`) → đúng khi chạy nhiều instance.
  Khóa: user id, IP (HMAC), email (HMAC), chain (`rate-limiter.service.ts:19-21`; `rate-limit.guard.ts:24-30`). Số mặc định:
  `app-config.ts:106-125`. Route nào không gắn decorator thì không bị giới hạn (vd. các GET đọc dữ liệu).
- **trust proxy:** `app.set('trust proxy', config.trustProxy)` (`app.setup.ts:19`); giá trị chỉ chấp nhận `false` hoặc danh sách
  IP/CIDR/`loopback|linklocal|uniquelocal` (`app-config.ts:149-158`, `:184-185`), mặc định `false`, `.env.example:47`. Rate limit IP đọc
  `request.ip` (`rate-limit.guard.ts:26`). Hậu quả và vấn đề IPv6 /128: T12 của review 18/10.
- **Mật khẩu:** argon2id `memoryCost 19456` (KiB), `timeCost 2`, `parallelism 1`: `identity/auth/password-hasher.service.ts:6-11`; tối đa 4
  phép hash đồng thời mỗi process, hàng chờ không giới hạn (`:38-52`). Khóa đăng nhập theo tài khoản: 10 lần sai → 15 phút
  (`identity/auth/credential-decision.ts:28-30`); theo IP: 20/phút (`app-config.ts:109`).
- **OTP:** 6 chữ số, sống 10 phút (`identity/auth/otp.service.ts:52-55`), mỗi mã tối đa 5 lần thử (`:117`), 21 lần sai trong cửa sổ 24 giờ
  → khóa 24 giờ (`:129-131`; `prisma/sql/recordOtpFailure.sql`); gửi OTP: 20/giờ/IP, 1/phút và 5/giờ mỗi email (`app-config.ts:110-112`,
  `otp.service.ts:172-173`).
- **Validation:** `StandardSchemaValidationPipe` toàn cục (`app.setup.ts:28`) với schema `z.strictObject` (vd. `identity/auth/auth.schemas.ts:4`)
  → field lạ bị từ chối. 141 tham số `@Body/@Query/@Param` có `schema`; không có `@Body()` trần nào ngoài file test (đã tìm).
- **Giới hạn kích thước:** JSON 100 kb (`app.setup.ts:17`); webhook raw 64 kb (`app.setup.ts:13-16`, `entitlements/entitlements.constants.ts:19`);
  CSV: Multer `memoryStorage`, 1 file, `IMPORT_MAX_BYTES` mặc định 10 MiB (`content-pipeline/content-pipeline.module.ts:30-35`,
  `app-config.ts:202`), tối đa 20.000 dòng (`app-config.ts:201`). File lưu trong Postgres, không ở đĩa local
  (`content-pipeline/upload/uploads.service.ts:90`) → API stateless.
- **Access token không bị thu hồi giữa chừng:** guard chỉ verify JWT, không tra DB (`auth.guard.ts:22`) → khóa tài khoản hay đăng xuất có hiệu
  lực với access token sau tối đa TTL (900 s). Là lựa chọn thiết kế; ghi để biết.

## 7. Database — **một phần**

- **Pool:** mỗi process `DATABASE_POOL_MAX` mặc định 20, chờ connection 5 s (`app-config.ts:165-166`; `common/db/prisma.module.ts:25-29`).
  Tổng connection = 20 × (số instance API + số worker + CLI chạy kèm). Gói Postgres nhỏ thường giới hạn connection thấp → phải tính khi
  chọn gói (`.env.example:2-5` đã ghi mỗi process một pool).
- **TLS tới DB:** không có cấu hình SSL riêng (đã tìm `ssl|sslmode`: không có trong `apps/api/src`), dựa vào tham số trong `DATABASE_URL`.
  `pg-connection-string` 2.14.1 coi `sslmode=require` là `verify-full` (đọc `index.js:139-149`, `:219-227` trong working copy) → DB dùng CA
  riêng sẽ lỗi kết nối nếu không kèm `sslrootcert`.
- **Migration:** `pnpm db:setup` = `prisma migrate deploy && prisma generate --sql` (`apps/api/package.json:25`). Không có script chỉ-migrate
  cho production; `prisma` CLI là devDependency (`package.json:76`). `generate --sql` cần DB đã migrate (`apps/api/prisma.config.ts:1`;
  `.github/workflows/ci.yml:21`) → **build** cũng cần DB. 33 thư mục migration trong `apps/api/prisma/migrations`.
- **Migration rủi ro trên DB đang chạy:** DB hiện trống nên 33 migration hiện có chạy an toàn lần đầu. Với migration sau này: `CREATE INDEX`
  không `CONCURRENTLY` (vd. `apps/api/prisma/migrations/20261021090000_lookup_indexes/migration.sql:1-4`), `DROP`+`ADD` CHECK — đã có trong
  review 18/10 (DB18). Có `DROP TABLE "rate_limit_counters"` ở `20261007114000_rate_limit_key/migration.sql:2` (lịch sử, đã chạy ở mọi DB).
- **Seed:** không có seed script (đã tìm `seed`). Dữ liệu tham chiếu nằm trong migration: `20261012120000_content/migration.sql:181-187`
  (`data_sources`, `topics`, `topic_names`) và migration `20261020072259_ai_initial_prompts`. Admin đầu tiên: `pnpm admin:grant <email>`
  (`apps/api/package.json:10`).
- **Backup/restore:** không có. Đã tìm `pg_dump|pg_restore|backup` trong `apps/api`, `.github`, `package.json`, `docker-compose.yml`: chỉ trúng
  một từ trong `agid-inflections.json` (dữ liệu từ vựng). CLAUDE.md ghi backup thuộc việc Deploy chưa làm.
- **Dọn dữ liệu (chạy trong maintenance hàng giờ, xem mục 8):** idempotency key > 24 h (`common/idempotency/idempotency-cleanup.registrar.ts:18-20`);
  rate-limit counter (`common/rate-limit/rate-limit-cleanup.registrar.ts:15`); OTP hết hạn > 1 ngày, session chain chết > 30 ngày
  (`identity/maintenance/identity-cleanup.service.ts:26-37`); file CSV > 30 ngày (`content-pipeline/import/import-file-cleanup.service.ts:26-27`);
  lịch sử luyện tập theo setting `historyMonths` (`practice/maintenance/practice-cleanup.service.ts:33-49`); raw payload billing > 90 ngày
  (`entitlements/billing/billing-jobs.service.ts:127`, `entitlements.constants.ts:16`); nội dung gọi AI và operation hết hạn
  (`ai/maintenance/ai-maintenance.ts:26-30`). Chưa dọn: `otp_failure_windows`, `mail_budget_buckets` (R3 của review 18/10). Chưa có xóa tài
  khoản (Bước 8).

## 8. Background job và lịch chạy — **có, an toàn khi chạy nhiều instance; lịch hàng giờ yếu**

| Việc | Cơ chế | Process chạy | Chạy 2+ instance thì sao |
|---|---|---|---|
| `content-import`, `content-publish`, `content-inflections` | BullMQ Worker, concurrency 1/queue (`content-pipeline/jobs/job-runner.service.ts:36-53`) | worker (`runWorkers`) | lease trong DB (`acquire`, `:58-59`) → mỗi job một nơi chạy |
| Reconciler job | `setInterval` mỗi `IMPORT_RECONCILE_SECONDS`=30 s (`job-reconciler.service.ts:76-80`) | worker | `updateMany` có điều kiện (`:46-57`), an toàn |
| `reminders` tick | BullMQ Job Scheduler `reminder-tick` mỗi 900 s (`notifications/scheduler/reminder-queue.service.ts:58-61`) | worker | `upsertJobScheduler` cùng id; send job có `jobId` theo user+ngày (`:73-77`) và hàng `reminder_deliveries` duy nhất → một email/ngày |
| `ai-eval` | BullMQ Worker (`ai/eval/eval-queue.service.ts:36-45`), `jobId` = run id (`:51`) | worker; API chỉ enqueue | an toàn |
| 15 job "hàng giờ" | `MaintenanceScheduler`: `setInterval` 1 giờ, **không chạy lúc khởi động** (`common/maintenance/maintenance.scheduler.ts:52-56`) | **mọi process** dựng `AppModule`: API, worker, cả CLI | thiết kế chịu chạy song song: claim `FOR UPDATE SKIP LOCKED` (`entitlements/notices/notice-sender.service.ts:65-69`, `billing-jobs.service.ts:77-78`), claim có điều kiện (`ai/maintenance/ai-maintenance.ts:45-47`), phần còn lại chỉ xóa/null dòng hết hạn (`maintenance.scheduler.ts:10-14`) |

- 15 job đăng ký: `idempotency-keys`, `rate-limit-counters`, `import-file-cleanup`, `identity-cleanup`, `practice-cleanup`,
  `entitlements-usage-expire`, `entitlement-notices`, `billing-events-retry`, `subscriptions-time`, `billing-refund-refetch`,
  `billing-raw-payload-cleanup`, `ai.operations-expire`, `ai.contents-expire`, `ai.models-refresh`, `ai.eval-runs-recover` (tìm
  `scheduler.register(`; vd. `billing-jobs.service.ts:39-42`, `notice-sender.service.ts:47-50`, `ai-maintenance.ts:26-32`).
- Không có `@nestjs/schedule`/`@Cron` (đã tìm `@Cron|@Interval|repeat:`).
- **Ý nghĩa production:** đúng đắn khi nhiều instance là điểm mạnh. Điểm yếu là lịch: lần đầu chạy sau 1 giờ (FD10 của review 18/10), và
  nay gánh việc ảnh hưởng tiền/quyền lợi (`subscriptions-time`, `entitlement-notices`, `billing-events-retry`). Với N instance API + worker,
  mỗi job chạy N+1 lần/giờ lệch giờ nhau → tải DB thừa nhưng không sai. Không có tín hiệu nào báo "đã X giờ chưa chạy maintenance".
- Nhắc người học quét **mọi** ứng viên mỗi 15 phút, trang 500 (`notifications/scheduler/reminder-tick.service.ts:52-59`); chi phí tăng theo
  tổng số người dùng.
- Redis cho BullMQ cần `maxmemory-policy noeviction`; chỉ compose local đặt (`docker-compose.yml:21`), code không kiểm.

## 9. Email — **một phần**

- SMTP qua nodemailer, một transport, không pool, timeout từng pha 10 s: `common/mail/smtp-mailer.ts:11-27`. Config `SMTP_HOST/PORT/USER/PASS/
  FROM/SECURE` (`app-config.ts:176-181`), `SMTP_SECURE` mặc định `false`; không đặt `requireTLS`.
- **OTP, xác minh email, reset, tài khoản staff:** gửi **trong process API**, sau khi response đóng (`mail-dispatcher.service.ts:25-32`),
  không queue, không retry; lỗi chỉ ghi log `mail_send_failed` (`:66-82`). Mail đang chờ mất nếu process bị kill cứng (chỉ xả khi tắt êm,
  `:38-46`). Request OTP luôn trả 202 (`identity/auth/otp.controller.ts:15`), nên khi SMTP sập người dùng không thấy lỗi; gửi lại được sau
  60 s, tối đa 5 lần/giờ.
- **Nhắc học:** qua BullMQ, 3 lần, backoff mũ từ 60 s (`reminder-queue.service.ts:11`, `:73-77`), phân loại lỗi để không gửi trùng
  (`notifications/scheduler/reminder-send.service.ts:56-80`).
- **Email trial/gia hạn:** trong maintenance hàng giờ, trạng thái trong DB, lỗi tạm thời thử lại ở lượt sau, lỗi "không rõ" không gửi lại
  (`entitlements/notices/notice-sender.service.ts:106-123`).
- **Ngân sách chung:** `MAIL_DAILY_BUDGET` mặc định 1500/ngày, lưu Postgres (`common/mail/mail-budget.service.ts:29-49`); nhắc học tối đa 80 %,
  email thanh toán 95 % (`:9-13`); hết ngân sách thì OTP trả 503 (`:29-36`).
- **Ý nghĩa production:** SMTP thật chưa chọn (CLAUDE.md: "personal-Gmail SMTP viability" còn mở). OTP là đường vào app; nên đưa OTP qua
  queue có retry, hoặc ít nhất có cảnh báo khi `mail_send_failed` tăng. SPF/DKIM/DMARC nằm ngoài code.

## 10. Đóng gói, deploy, quét bảo mật — **thiếu**

- **Không có** Dockerfile, `.dockerignore`, Procfile, `fly.toml`, `render.yaml`, `railway.*`, `ecosystem.config.*`, systemd unit (đã `find`
  toàn snapshot). `.github/` chỉ có `workflows/`.
- Lệnh chạy production: `start:prod` = `node dist/main`, `start:worker` = `node dist/worker.js` (`apps/api/package.json:17-18`). Script
  `deploy: nest deploy` (`:12`) và README (`apps/api/README.md:60-71`) là phần còn sót từ scaffold Nest (Mau), không phải quy trình của dự án.
- **CI:** `.github/workflows/ci.yml:13-68`, job `api` = install, `db:setup` (cần Postgres service), drift check, lint, typecheck, build, unit —
  khớp CLAUDE.md. Chỉ chạy `on: pull_request` (`:5-6`). Job `admin-e2e-real` chạy API + worker thật (`:159-269`).
- **Deploy:** chỉ có `.github/workflows/deploy-web.yml` cho `apps/web` (Cloudflare Workers, `:1-55`). Không có workflow deploy API/worker,
  không có bước migrate production.
- **Quét dependency/secret:** không có Dependabot, CodeQL, `pnpm audit`, gitleaks/trufflehog (đã `find` `dependabot.yml`, `codeql*`,
  `renovate.json`; đã tìm `audit|gitleaks|trufflehog` trong `.github` và các `package.json`). Action pin theo tag, không khai báo
  `permissions`: DB17 của review 18/10.
- **Ý nghĩa production:** cần quyết định nền tảng hosting rồi mới viết được image và pipeline. Lưu ý khi viết: (a) build cần DB đã migrate
  vì TypedSQL, hoặc commit/cache client đã generate; (b) image runtime cần `prisma` CLI nếu migrate từ trong image; (c) `argon2` là native
  module (`pnpm-workspace.yaml` cho build ở dòng 9) → build và chạy cùng libc; (d) Node có ICU đầy đủ vì múi giờ dùng `Intl` (mục 11).

## 11. Những thứ khác sẽ gây chuyện ở production

- **Endpoint thử còn mở:** `SampleModule` nằm trong `AppModule` (`apps/api/src/app.module.ts:16`, `:21`): `GET /v1/sample` public, `POST /v1/sample`
  cần đăng nhập, ghi idempotency key (`apps/api/src/sample/sample.controller.ts:12-34`). Middleware giả user (`x-test-user-id`) **không** được
  dùng ở đâu (`common/request-user/fake-request-user.middleware.ts:4-12`; tìm `fakeRequestUserMiddleware`: chỉ có định nghĩa).
- **CLI giả lập tự chặn:** `entitlements:fake-ai` và `ai:fake-call` từ chối nếu cờ fake tắt (`cli/fake-ai.ts:22-26`, `cli/ai-fake-call.ts:23-27`).
  Nhưng vì cờ dễ bật (mục 1), cần quy ước không chạy chúng với env production.
- **URL mặc định localhost** chỉ có trong `.env.example` (`JWT_ISSUER` dòng 30, `CORS_ORIGINS` 48, `PROBLEM_TYPE_BASE` 49, `ADMIN_APP_URL` 50,
  `LEARNER_APP_URL` 52); không có `localhost` cứng trong `apps/api/src` (đã tìm). `PROBLEM_TYPE_BASE` sinh URL `type` cho lỗi nhưng không route
  nào phục vụ các URL này. `ADMIN_APP_URL` được đưa vào email tài khoản staff (`identity/mailer/templates.ts:32-38`); `LEARNER_APP_URL` vào email
  nhắc học (`app-config.ts:57`). Sai giá trị → link trong email sai, không có lỗi lúc khởi động ngoài kiểm dạng URL.
- **Múi giờ nhắc học:** theo IANA timezone của từng người qua `Intl` (`notifications/scheduler/eligibility.ts:33-34`; `common/time/local-date.ts:13-14`)
  → phụ thuộc dữ liệu tz của Node; đổi Node có thể đổi tên vùng (đã có CLI `db:normalize-timezones`, `package.json:26`). Ngày AI tính theo
  `Asia/Ho_Chi_Minh` cố định (`entitlements/entitlements.constants.ts:7`). Cache formatter không giới hạn: C2 của review 18/10.
- **Chỉ một cờ production ảnh hưởng nghiệp vụ billing:** `BILLING_PRODUCTION=true` còn khiến event `sandbox` bị xử lý khác
  (`entitlements/billing/event-applier.service.ts:92`) — bật nó vì lý do "chặn fake" cũng đổi hành vi billing; cần biết khi đặt.
- **README API** là boilerplate Nest, không có runbook vận hành (`apps/api/README.md`). Script gốc `test:e2e` gọi script không còn tồn tại
  (`package.json:5`; `apps/api/package.json` không có `test:e2e`).
- **Hàng chờ hash mật khẩu** không giới hạn độ dài (`password-hasher.service.ts:38-41`): flood đăng nhập từ nhiều IP làm hàng chờ dài, request
  treo đến `requestTimeout` 300 s của Node.

## Chưa kiểm được

- **Hành vi khi chạy thật** (không chạy server theo yêu cầu): thứ tự tắt và mất request lúc SIGTERM, độ dài thời gian `worker.close()` với
  job import lớn, Nest có in log text lúc khởi động hay không — mới suy ra từ source, chưa quan sát.
- **`process.loadEnvFile()` có ghi đè biến môi trường đã có không:** định thử bằng một `.env` giả trong scratchpad, bị hook chặn đọc file
  `.env` của máy; không làm. Ảnh hưởng: nếu image production lỡ chứa `.env`, chưa biết nó thắng hay thua biến của nền tảng. **ASSUMPTION:**
  Node không ghi đè biến đã có — chưa kiểm phiên này.
- **BullMQ có cảnh báo khi Redis không `noeviction` không:** chưa đọc source BullMQ.
- **Mọi thứ phụ thuộc nền tảng hosting** (chưa chọn): idle timeout của LB so với `keepAliveTimeout` 5 s, CA của Postgres managed, giới hạn
  connection, IP của proxy cho `TRUST_PROXY`, SMTP thật, nơi giữ secret.
- **Logic nghiệp vụ của 15 job maintenance** khi chạy song song: đã đọc phần claim của `entitlement-notices`, `subscriptions-time`,
  `ai.models-refresh`; chưa đọc hết `billing-refund-refetch`, `entitlements-usage-expire`, `ai.eval-runs-recover` (phần enqueue lại dùng
  `jobId` = run id nên trùng là no-op theo `eval-queue.service.ts:51`).
- **Frontend** (`apps/web`, `apps/admin`) và security header của chúng: ngoài phạm vi (AD12 của review 18/10).
