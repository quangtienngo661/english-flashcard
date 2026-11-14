# Launch prep — code facts cho đợt hardening (04/11/2026)

Khảo sát chỉ đọc, làm đầu vào cho design doc của đợt "chuẩn bị launch: Turnstile, security header, các mục review còn mở". Đọc trên nhánh
`docs/launch-prep-design` tại `a6b2bd15` (bằng `origin/dev` lúc đọc). Không chạy app, không cài gì, không chạy test. Worktree không có `node_modules`;
mã của React Aria, React DOM và Express được đọc trong `node_modules` của checkout chính (`E:\Working\Working project\english-learning\node_modules`),
cùng phiên bản với lockfile (`pnpm-lock.yaml:6180` react-aria 3.53.1, `:4523` express 5.2.1). Mọi đường dẫn tính từ gốc repo, trừ khi ghi khác.
Tài liệu Cloudflare đọc ngày 04/11/2026 (ngày cập nhật của từng trang ghi cạnh). Điều chưa xác nhận được ghi `ASSUMPTION`.

## 0. Tóm tắt cho design

1. Ba route gửi mail OTP không cần đăng nhập: `POST /v1/auth/register`, `POST /v1/auth/otp` (`verify_email` hoặc `reset_password`), và **`POST /v1/auth/login`
   của tài khoản chưa xác minh** (gửi lại mã khi mật khẩu đúng, `apps/api/src/identity/auth/auth.service.ts:151-153`). Chặn bot chỉ ở register và otp thì bot đã
   đăng ký vẫn gọi được login để gửi thêm mail (bị giới hạn 1 mail/60 s, 5 mail/giờ cho mỗi email).
2. `api.` và `admin-api.` là **cùng một tiến trình NestJS** (`docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md:92`). Admin có trang quên mật khẩu gọi
   đúng `POST /v1/auth/otp` (`apps/admin/src/features/account/ForgotPasswordPage.tsx:58`). Bắt Turnstile ở API cho `reset_password` thì admin cũng phải có widget,
   hoặc phải có ngoại lệ. Admin không có form đăng ký.
3. Schema body là `z.strictObject` và có test ghim "field lạ → 400" (`apps/api/src/identity/auth/auth.controller.spec.ts:61-66`). Muốn thêm token vào body thì phải
   sửa schema, và thứ tự deploy quan trọng: web gửi field mới tới API cũ sẽ nhận 400.
4. Schema đăng ký có `client: 'mobile'` (`apps/api/src/identity/auth/auth.schemas.ts:9`), nhưng app Flutter chưa có. Cần quyết định trước: API làm gì với request
   `mobile` không có token Turnstile.
5. API đã gọi HTTP ra ngoài bằng `fetch` global: có `AbortSignal.timeout`, và `fetch` truyền vào được để test (`apps/api/src/identity/google/google-client.real.ts:13-59`).
   Không có axios/undici. Đây là mẫu dùng lại được cho siteverify.
6. Mẫu cho provider giả: class trừu tượng, một bản thật và một bản giả, chọn bằng factory theo config (`apps/api/src/identity/identity.module.ts:47-48`). API từ chối
   khởi động khi bật đồ giả cùng `BILLING_PRODUCTION=true` (`apps/api/src/common/config/app-config.ts:261-275`). Q13 đã chốt giữ nguyên cơ chế này.
7. Chín script smoke, `admin-e2e-real`, e2e mock của web và admin đều gọi register/otp (§A5). Nếu API bắt token thì phải có chế độ giả hoặc tắt cho local/smoke.
8. CSP của web không có `frame-src`, nên `default-src 'self'` áp vào và chặn iframe Turnstile. `script-src` cũng thiếu `https://challenges.cloudflare.com`
   (`apps/web/src/lib/csp.ts:19-30`). Các directive đều được ghim trong `csp.test.ts`, còn e2e E23 đòi 0 lần vi phạm CSP (`apps/web/e2e/csp.spec.ts:20-34`).
9. `TRUST_PROXY` mặc định `false` (`app-config.ts:207-208`). Khi đứng sau Cloudflare, `request.ip` là IP của proxy, nên `remoteip` gửi siteverify và rate limit theo IP
   đều sai nếu không cấu hình biến này.
10. Security header: admin tĩnh không có header nào (không có `public/`, không có `_headers`). React Aria tự chèn thẻ `<style>` lúc chạy, nên CSP của admin cần
    `style-src 'unsafe-inline'` hoặc hash. API không có helmet và không tắt `X-Powered-By: Express`. Web chỉ có CSP.
11. Review còn mở: phần lớn là việc tài liệu (R3, R4, R12, R13). Phần code nằm ở R14 (19 mục Thấp, đa số cỡ S). R2 đã có checklist tay ở nhánh khác. R8 cần thử trên
    trình duyệt. R11 đã merge nhưng plan chưa cập nhật (§C).

---

## A. Turnstile cho đăng ký và quên mật khẩu

### A1. Các endpoint của API

| Route | Controller | Schema body | `@RateLimit` (giá trị ở `apps/api/src/common/config/app-config.ts`) | Kiểm ngân sách mail | Gửi mail? |
|---|---|---|---|---|---|
| `POST /v1/auth/register` (201) | `apps/api/src/identity/auth/auth.controller.ts:19-29` | `registerSchema` `auth.schemas.ts:4-15` (strict; `client: 'web'\|'mobile'` :9; `accept_terms: true` :13) | `auth.register.ip` 5/3600 s theo IP (:124); `mail.ip.daily` 20/86400 s theo IP (:135) | `budget.assertAvailable()` `auth.service.ts:56` → 503 `mail-unavailable` | Có: mã xác minh, gửi sau khi trả response (`auth.service.ts:99-106`). Mỗi email bị giới hạn qua `tryLimitEmail` (`auth.service.ts:60`): `auth.otp.email.cooldown` 1/60 s (:129), `auth.otp.email.hourly` 5/3600 s (:130). Email đã xác minh → 409 `email-taken` (`auth.service.ts:81-87`) |
| `POST /v1/auth/otp` (202), `purpose: verify_email \| reset_password` | `otp.controller.ts:21-35` (rẽ nhánh ở :29-33) | `otpRequestSchema` `otp.schemas.ts:4-7` (discriminated union của hai strict object, chỉ có `purpose` và `email`) | `auth.otp.ip` 20/3600 s (:128); `mail.ip.daily` (:135) | `otp.service.ts:111` | Có. `requestCode` (`otp.service.ts:105-123`): giới hạn theo email (:110, :160-163), kiểm ngân sách (:111), rồi mới tra tài khoản và gửi mail sau khi đã trả response (:112-122). Nhờ vậy email lạ và email có tài khoản được trả lời giống nhau |
| `POST /v1/auth/login` (tài khoản chưa xác minh, mật khẩu đúng) | `auth.controller.ts:31-41` | `loginSchema` `auth.schemas.ts:16` | `auth.login.ip` 20/60 s (:125) | `sendVerifyCodeQuietly` kiểm ngân sách và tự bỏ qua khi hết (`otp.service.ts:82-95`) | Có: trả 403 `email-not-verified`, kèm gửi lại mã (`auth.service.ts:151-153`) |
| `POST /v1/auth/verify-email` | `otp.controller.ts:37-48` | `verifyEmailSchema` `otp.schemas.ts:8-9` | `auth.verify.ip` 20/3600 s (:127) | — | Không |
| `POST /v1/auth/password/reset` (204) | `password.controller.ts:32-41` | `resetSchema` `password.schemas.ts:7-12` | `auth.reset.ip` 20/3600 s (:134) | — | Không gửi mã. Sai mã lần thứ 21 thì khóa và có thư báo khóa (`otp.service.ts:147-151`). Băm mật khẩu trước khi tra tài khoản để thời gian phản hồi như nhau (B1-6, `password.service.ts:101-104`) |
| `GET /v1/auth/google/complete` | `google-auth.controller.ts:87-92` | — | `auth.google.ip` 20/60 s (:146) | — | Không |
| `POST /v1/auth/google/complete` (tạo tài khoản bằng Google) | `google-auth.controller.ts:94-109` | `googleCompleteSchema` `google.schemas.ts:5-11` | `auth.register.ip` (:97), **dùng chung bộ đếm với đăng ký email** | — | Không. Cần cookie `google_signup` niêm phong, tức là phải đăng nhập Google trước (`google-auth.service.ts:240-300`), và header `X-CSRF-Protection: 1` (:104-106) |
| `GET /v1/auth/google/start`, `/callback` | `google-auth.controller.ts:46-76` | query | `auth.google.ip` qua `limited()` (:35-44); quá giới hạn thì chuyển trang (redirect) chứ không trả 429 | — | Không |

Cơ chế dùng chung:
- `@RateLimit(...rules)` = metadata + `UseGuards(RateLimitGuard)` (`apps/api/src/common/rate-limit/rate-limit.decorator.ts:7-8`). Guard lấy subject theo `by`: `ip` là
  `request.ip`, `email` là `request.body.email` đã chuẩn hóa (`rate-limit.guard.ts:22-31`). Nghĩa là body đã được parse **trước** khi guard chạy. Một guard Turnstile
  đọc token trong body làm được theo đúng mẫu này.
- Bộ đếm: upsert một câu theo cửa sổ cố định; vượt thì trả 429 `rate-limited` kèm `retryAfterSeconds` (`rate-limiter.service.ts:17-37`). Key là HMAC của subject
  (`:46-55`).
- Giới hạn là hằng trong code: `loadConfig` chép `DEFAULT_LIMITS` (`app-config.ts:360`). Không có biến môi trường nào đổi được.
- Ngân sách mail: `MAIL_DAILY_BUDGET` mặc định 1500 (`app-config.ts:205`), đếm theo ngày UTC với key `${MAIL_BUDGET_KEY}:YYYY-MM-DD` (`mail-budget.service.ts:77-79`).
  Mail nhắc học dừng ở 80%, mail thanh toán dừng ở 95% (`:9-18`). Mail OTP gọi `tryConsume()` không có trần riêng (`mail-dispatcher.service.ts:71`), nên dùng được tới 100%.
- Pipe validation global là `StandardSchemaValidationPipe` (`apps/api/src/app.setup.ts:37`).

### A2. Các form web gọi những route trên (`apps/web/src`)

| Màn | File | Gửi thế nào | Xử lý lỗi |
|---|---|---|---|
| Đăng ký `/{locale}/app/register` | `features/learner/auth/RegisterForm.tsx` | `store.register(...)` (:34-47) → `session-store.ts:147-152`: `raw('/v1/auth/register', ...)`, gộp thêm `DEVICE = { client: 'web', device_label: 'Wordmet Web' }` (`session-store.ts:60`). Dùng `useSubmitOnce` để mỗi lần bấm chỉ gửi một request | `email-taken` (có `extensions.reason === 'account-deleting'` thì câu riêng), `age-below-minimum`, vi phạm mật khẩu; lỗi khác hiện `errorText(error)` (:56-67). Nút bị tắt khi chưa tick đồng ý hoặc chưa có ngày sinh (:135) |
| Quên mật khẩu | `ForgotPasswordForm.tsx` | `createApiClient({ send: store.send }).post('/v1/auth/otp', { purpose: 'reset_password', email })` (:26-31). Email lưu vào `sessionStorage`, không đưa lên URL (:28-29) | Mọi lỗi đi qua `errorText` (:33-41) |
| Xác minh email, nút gửi lại mã | `VerifyEmailForm.tsx` | `post('/v1/auth/otp', { purpose: 'verify_email', email })` (:110-115). Đếm ngược 60 s trên máy theo `auth.otp.email.cooldown` (:21-23) | `errorText` (:117-124). Khi nộp mã: `invalid-otp` và 429 có câu riêng (:96-107) |
| Hoàn tất đăng ký Google | `GoogleComplete.tsx` | `GET` (:48-60), rồi `POST /v1/auth/google/complete` (:63-70) | `age-below-minimum`, 401 → "hết hạn", còn lại `errorText` (:72-83) |
| Đặt lại mật khẩu | `ResetPasswordForm.tsx:31` | `POST /v1/auth/password/reset` (không gọi otp) | — |

- Trang quên mật khẩu và trang đặt lại mật khẩu **mở được cả khi đã đăng nhập** (sửa B8-2): `AuthGate.tsx:12-13, 31`. Dòng "Đặt mật khẩu" trong Cài đặt trỏ tới
  `SettingsPage.tsx:183`. Vậy widget Turnstile cũng sẽ hiện cho người đã đăng nhập.
- Chuyển lỗi: `toApiError` đọc problem+json và header `retry-after` (`app-shell/api/problem.ts:93-115`). `KNOWN_ERROR_SLUGS` (`:35-83`) đã có `rate-limited`,
  `mail-unavailable`, `validation-failed`, `csrf-header-required`. Slug lạ hiện câu `errors.generic` kèm `operation_id` (`:117-121`, `use-error-message.ts:16-35`). 429
  hiện "thử lại sau N giây" (`use-error-message.ts:21-23`).
- Thêm một slug mới (ví dụ lỗi Turnstile) thì phải có chữ cả vi lẫn en: `problem.test.ts:65-72` kiểm mỗi slug có câu dưới `App.errors`. Các câu hiện có nằm ở
  `messages/vi.json:1038, 1045` và `messages/en.json:1038, 1045`.
- Form đăng ký chỉ có trong bản build bật app (`NEXT_PUBLIC_LEARNER_APP=on`, `src/lib/learner-app-flag.ts:2`; `next.config.ts:25`). Waitlist đã bị bỏ ở đợt landing
  03/11 (`src/components/landing/copy.test.ts:43-47`).

### A3. Admin

- Không có form đăng ký: không route nào gọi `/v1/auth/register` (grep `apps/admin/src`; đối chứng: grep cùng lệnh tìm thấy `/v1/auth/login` ở `src/auth/session-store.ts:124`).
- Có trang quên mật khẩu `/forgot-password` (`src/app/routes.tsx:57`, link ở `features/account/LoginPage.tsx:100`), hai bước: `POST /v1/auth/otp` `reset_password`
  (`ForgotPasswordPage.tsx:55-65`; 429 thì đếm ngược theo `retryAfterSeconds`), rồi `POST /v1/auth/password/reset` (:72-95). e2e mock của admin giả lập route otp
  (`apps/admin/e2e/account.spec.ts:83-99`).
- Admin gọi API qua host `admin-api.` (`src/resolve-api-base-url.ts:15-16`), cùng tiến trình với `api.` (design 2.5:92). Một kiểm tra Turnstile đặt ở API áp cho cả hai
  host, trừ khi phân biệt theo `Origin`/host.

### A4. Cấu hình, CSP và gọi HTTP ra ngoài

- **Env của API:** một zod `envSchema` (`app-config.ts:184-285`). Có sẵn các helper `nonEmpty`, `booleanString`, `secretSchema` (`:150-159`). Ràng buộc chéo giữa các
  biến viết trong `superRefine` (`:254-285`). Thiếu hoặc sai biến thì API dừng, báo tên biến (`:287-292`). Ví dụ biến tùy chọn rỗng thì thành `null`: `GOOGLE_CLIENT_ID`
  (`:248`). Mode suy ra từ biến (`google.mode`, `:353`). Test cấu hình: `apps/api/src/common/config/app-config.spec.ts` (ví dụ `:60-61`, `:296-299`). Thêm field vào
  `AppConfig` thì phải sửa cả `apps/api/test/support/test-config.ts:4`.
- **Env public của web:** đọc `process.env.NEXT_PUBLIC_*` lúc build (`apps/web/src/app-shell/config.ts:2-4`); README ghi rằng các biến này được đóng vào bundle
  (`apps/web/README.md:20-31`). Nơi đặt biến: `deploy-web.yml:27-31`, `docker-compose.yml:111-113`, `playwright.config.ts:24-26`, `ci.yml:111`. Web chưa có file
  `.env.example`. Admin dùng `VITE_*` (`apps/admin/src/vite-env.d.ts`, `apps/admin/.env.example`, `ci.yml:147,155,160`, `docker-compose.yml:93`).
- **CSP của web:** `buildCsp` (`apps/web/src/lib/csp.ts:15-33`) có `default-src 'self'`, `script-src 'self' [hash] https://static.cloudflareinsights.com
  ['unsafe-inline' D20]`, `connect-src 'self' <API> https://cloudflareinsights.com`, `frame-ancestors 'none'`, `form-action 'self'`. **Không có `frame-src`.** Khi
  `CSP_INLINE_FALLBACK = true` (`:6`) thì không dùng hash, và không có nonce (D20). CSP chỉ đặt ở production, cho `/:path*`, qua `headers()` của
  `next.config.ts:28-31`. Test ghim directive: `csp.test.ts:16-58`. e2e E23 kiểm header có mặt và không có vi phạm trên `/vi` và `/vi/app` (`e2e/csp.spec.ts:20-34`),
  chạy trên bản build OpenNext (`playwright.config.ts:19`).
- **Turnstile cần gì** (tài liệu Cloudflare, đọc 04/11/2026):
  - CSP (trang cập nhật 05/05/2026): `script-src https://challenges.cloudflare.com` (hoặc nonce) và `frame-src https://challenges.cloudflare.com`; `connect-src 'self'` chỉ
    cần ở chế độ pre-clearance. Trang không nói về `style-src`.
  - Siteverify (cập nhật 22/10/2026): `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`, nhận form-urlencoded hoặc JSON, field `secret`, `response` (bắt
    buộc), `remoteip`, `idempotency_key` (tùy chọn). Token dài tối đa 2048 ký tự, sống 300 s, **chỉ dùng được một lần** (dùng lại thì `timeout-or-duplicate`). Response có
    `success`, `error-codes`, `hostname`, `action`, `cdata`, `challenge_ts`.
  - Khóa test (cập nhật 20/10/2026): sitekey `1x00000000000000000000AA` (luôn qua, hiện widget), `2x00000000000000000000AB` (luôn trượt), `1x00000000000000000000BB` (luôn
    qua, ẩn), `3x00000000000000000000FF` (bắt thử thách tương tác). Secret `1x0000000000000000000000000000000AA` (luôn qua), `2x…AA` (luôn trượt), `3x…AA` (báo token đã
    dùng). Sitekey test sinh token `XXXX.DUMMY.TOKEN.XXXX`; secret production từ chối token này. Khóa test vẫn gọi mạng tới Cloudflare.
- **Gọi HTTP ra ngoài hiện có:** `RealGoogleClient` dùng `fetch` global: `fetch` truyền vào được qua `deps.fetch` (`google-client.real.ts:13, 21-26`), `POST` form-urlencoded
  với `AbortSignal.timeout(10_000)` (`:39-50`), lỗi bọc thành `GoogleExchangeError` và không mang secret (`:53-56`). `jose.createRemoteJWKSet` cũng gọi mạng (`:24`). SDK
  OpenAI và Anthropic nhận `fetch` truyền vào (`ai/adapters/openai/openai.adapter.ts:12-22`, `anthropic/anthropic.adapter.ts:16-25`). SMTP qua nodemailer. Không có
  axios, undici hay got trong dependency (`apps/api/package.json`).
- CORS chỉ cho các header `Authorization, Content-Type, X-CSRF-Protection, Idempotency-Key` và expose `Retry-After` (`app.setup.ts:29-34`). Gửi token Turnstile bằng
  header riêng thì phải thêm header đó vào danh sách; gửi trong body thì không phải.
- IP client: `app.set('trust proxy', config.trustProxy)` (`app.setup.ts:28`), `TRUST_PROXY` mặc định `false` (`app-config.ts:207-208`). Deploy checklist đã có mục đặt
  biến này đúng với proxy thật.

### A5. Mẫu provider giả và nơi bị ảnh hưởng nếu bắt token

- **Google:** `GoogleClient` trừu tượng, có `FakeGoogleClient` và `RealGoogleClient`, factory theo `config.google.mode` (`identity.module.ts:47-48`). Route giả
  `/v1/dev/google/authorize` trả 404 khi mode khác `fake` (`google/fake-google.controller.ts:25-37`). `GOOGLE_FAKE_ENABLED` thắng `real` (`app-config.ts:107, 353`). Bật
  `GOOGLE_FAKE_ENABLED` thì bắt buộc có các biến đi kèm (`:276-281`).
- **AI:** `AI_FAKE_ENABLED` → đăng ký `FakeAiAdapter` (`ai/adapters/adapters.registrar.ts:16-21`).
- **Billing:** `BILLING_FAKE_ENABLED` + `BILLING_FAKE_SECRET` bắt buộc (`app-config.ts:282-284`).
- **Chặn ở production:** `BILLING_PRODUCTION` (mặc định `false`, `:238`) bật cùng một đồ giả thì API dừng khởi động (`:261-275`). Test: `app-config.spec.ts:60-61, 296-299`.
  Review X-3/B5-2 gọi đây là fail-open; Q13 (02/11) giữ nguyên, chỉ thêm mục checklist (§C, R3).
- **Nơi gọi register/otp sẽ vỡ nếu API bắt token mà không có chế độ giả hoặc tắt:** `apps/api/scripts/` gồm `smoke-buoc-0-3-fixes`, `-2`, `-4`, `-5`, `-6`, `-7`, `-8`,
  `smoke-nhom-b`, `learner-test-setup.mjs` (grep `auth/register`); `apps/admin/e2e-real/support/api.ts`; e2e mock của web, chặn mọi `/v1/**` (`apps/web/e2e/support/mock-api.ts:45`;
  đăng ký ở `e2e/app/m1.spec.ts:16, 47, 51`) và của admin (`account.spec.ts:83`). Script widget tải từ `challenges.cloudflare.com` sẽ chạy cả trong e2e, trừ khi bị
  chặn hoặc giả lập.

### A6. Mục Turnstile trong deploy checklist

`docs/deliveries/deploy-checklist.md:83-86`, tóm tắt: gắn Cloudflare Turnstile vào đăng ký, quên mật khẩu và waitlist, API kiểm token phía server. Lý do: bot đăng ký bằng
email người khác làm SMTP Gmail gửi hàng loạt OTP, bị coi là spam và khóa tài khoản gửi; rate limit theo IP không đủ khi bot đổi IP. Mục ghi "cần sửa code", thêm domain
Turnstile vào CSP, và đánh `ASSUMPTION` cho tên domain. Hai điểm đã cũ: waitlist không còn (A2). Tên domain nay đã xác nhận ở A4 (`challenges.cloudflare.com`). Các mục
liên quan: WAF rule (`:77-79`), Bot Fight Mode chèn JS cần CSP cho phép (`:80-82`), Cloudflare Access cho `admin.` (`:90-92`).

---

## B. Security header

### B1. Admin (static assets trên Workers)

- `apps/admin/wrangler.jsonc:1-6`: chỉ có `assets` (`directory: ./dist`, `not_found_handling: single-page-application`), route `admin.wordmet.com`. **Không có `main`**
  (không có Worker script). Build: `tsc --noEmit && vite build` (`apps/admin/package.json`, script `build`). `vite.config.ts:6-8` chỉ khai plugin, không đổi
  `publicDir`/`outDir`. `apps/admin/public/` không tồn tại; cả repo không có file `_headers` (lệnh `find`). Không có CSP ở `index.html`.
- **Cloudflare Workers Static Assets `_headers`** (tài liệu cập nhật 22/09/2026): là file trong thư mục static assets (dùng framework thì đặt ở `public/`); tối đa 100 rule,
  mỗi dòng tối đa 2.000 ký tự; **không** áp cho response do Worker code sinh ra. Trang không nói gì về response của fallback SPA (`not_found_handling`).
- **Nguồn ngoài của admin:** Google Fonts (`index.html:8-10`: `fonts.googleapis.com` cho stylesheet, `fonts.gstatic.com` cho font); API `https://admin-api.wordmet.com`
  (`resolve-api-base-url.ts:15`). Tải file bằng `URL.createObjectURL` (`src/api/download.ts:3`). Preview Markdown của văn bản pháp lý không ghi đè `img`
  (`features/legal/MarkdownPreview.tsx:5-21`), nên ảnh Markdown sẽ tải từ bất kỳ URL nào. Đây là điểm phải chọn khi đặt `img-src`.
- **Script và style inline:** `index.html` không có script inline (chỉ `<script type="module" src="/src/main.tsx">` :14, được bundle lúc build). Trong `src` không có
  `dangerouslySetInnerHTML`, `<style>`, `eval` hay `new Function` (grep rỗng). Có 7 prop `style={}` (`AiEvalPage.tsx:351,356`, `dashboard/charts.tsx:128,266,305,340`,
  `jobs/StatusBadge.tsx:27`). React DOM 19.3.0 gán style qua CSSOM `node.style[...]` / `setProperty` (`react-dom-client.production.js:1439-1456`).
- **React Aria 3.53.1 tự chèn thẻ `<style>`** vào `<head>` lúc chạy: `usePress` (`dist/private/interactions/usePress.mjs:581-598`, `touch-action`) và `usePreventScroll`
  (`dist/private/overlays/usePreventScroll.mjs:104-113`, `overscroll-behavior`). Cả hai gán `nonce` lấy từ `<meta name="csp-nonce">` (`dist/private/utils/getNonce.mjs:20-26`).
  SPA tĩnh không có nonce theo từng request, nên với CSP `style-src` chặt thì hai thẻ này bị chặn, trừ khi cho `'unsafe-inline'` hoặc thêm hash của nội dung (nội dung
  là chuỗi cố định).
- Nguồn trong checklist: AD12 `docs/superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-admin-practice.md:35`; `deploy-checklist.md:49-51`. Tóm tắt: thêm CSP,
  `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` bằng `apps/admin/public/_headers`, kiểm Workers Static Assets có đọc file này không, thử CSP
  với style inline của React Aria.

### B2. API

- `apps/api/src/app.setup.ts:12-38`: `operationIdMiddleware`; parser raw cho `/v1/billing/webhooks/*` (:15-18); JSON 2 MB cho bulk examples (:21-25); JSON 100 KB
  cho mọi route khác (:26); `cookieParser()` (:27); `trust proxy` (:28); CORS theo `CORS_ORIGINS` với `credentials: true` (:29-34); prefix `v1` (:35); filter
  problem-details (:36); pipe validation (:37). `main.ts:13` tạo app với `bodyParser: false`.
- **Không có helmet** trong bất kỳ `package.json` nào, cũng không có trong `pnpm-lock.yaml` (0 lần; đối chứng `cookie-parser` 12 lần). Trong `apps/api/src` không đặt header
  bảo mật nào (grep `nosniff|Strict-Transport|X-Frame|Referrer-Policy|Cache-Control|x-powered-by` rỗng; đối chứng `enableCors` tìm thấy).
- `X-Powered-By`: Express 5.2.1 bật mặc định (`express/lib/application.js:94`, gửi ở `:160`). Adapter của Nest không đụng tới (grep rỗng), và `app.setup.ts` không tắt.
  Suy ra response của API có `X-Powered-By: Express` (suy từ code, chưa chạy).
- Healthcheck chỉ kiểm sống: `health.controller.ts:6-10` trả `{ status: 'ok' }`.
- Nguồn: FD-dj `docs/superpowers/reviews/2026-10-20-buoc-0-3-review-evidence/inventory-foundation-db.md:80` (header bảo mật, healthcheck chỉ kiểm sống, chưa có cấu hình
  log level; chủ dự án quyết lúc Deploy, đi cặp với AD12); `deploy-checklist.md:52-53`.

### B3. Web (để so)

Web chỉ có CSP (`next.config.ts:28-31`) và `poweredByHeader: false` (`:23`). `proxy.ts` đặt `Cache-Control`/`Vary` (`:19, 28, 41-42`). Không có HSTS, `nosniff`,
`Referrer-Policy`, `Permissions-Policy` (grep rỗng; đối chứng `Content-Security-Policy` tìm thấy ở `next.config.ts:30`). Checklist đã có mục kiểm Console không lỗi CSP
ngay sau lần đầu lên `main` (`deploy-checklist.md:108-110`).

---

## C. Các mục review còn mở (`docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md` §7b)

Link tính từ `docs/preparation/`. Cỡ: S ≈ dưới nửa ngày, M ≈ khoảng một ngày hoặc nhiều file, L ≈ nhiều ngày. Mỗi finding đã được mở và đọc; số dòng code trong finding
là của lúc review (`867d385`, 29/10). Các mục có ghi "(kiểm 04/11)" thì đã đọc lại trên `a6b2bd15`.

### R2 🟡 — Lấy lại răng cho test sau D38 (phần cần DB) — quyết định Q11: không e2e, dev test tay theo checklist

| Còn lại | Finding | Loại | File chạm | Cỡ |
|---|---|---|---|---|
| Merge checklist tay. File `docs/audit/2026-11-04-dev-test-checklist.md` có trên nhánh `docs/dev-test-checklist` (`9e8da244`), **chưa có trên nhánh này** (kiểm 04/11). Checklist có mục A Identity (B1-2), B Học (B3-2), C Xóa tài khoản đủ dữ liệu (B8-1), D Nhắc học (B3-1, G1-10), E fetchState (B5-4), F Khung job (B2-4), G 9 smoke, H ghi kết quả | [X-2](../superpowers/reviews/2026-10-29-buoc-1-8-review.md#x-2), [B1-2](../superpowers/reviews/buoc-1-8/buoc-1-and-fixes-0-3.md#b1-2), [B3-1](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-1), [B3-2](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-2), [B8-1](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-1), [B5-4](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-4), [B2-4](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-4) | docs | `docs/audit/…` | S |
| Chạy hết checklist một lượt và lưu output (mục H). Checklist ước khoảng 2 giờ, cộng thời gian các smoke | như trên | chạy tay + docs | `docs/deliveries/dev-checklist-<ngày>-smoke-output.txt` | M |
| Phần checklist tự ghi là chưa thành check (Phụ lục): smoke 6/7 trong CI ([B6-4](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b6-4); thay bằng luật "đổi `src/ai/**`, `src/practice/**` thì chạy G6, G7"); nhắc học ngày cũ và `ETIMEDOUT`; chạy đua Identity B1#35; B8E49 với dữ liệu lớn; B2#70; job `billing-refund-refetch` | như trên | quyết định (Q11 đã loại test tự động) | — | — |
| Sửa câu "xóa sạch 53 cột" ở `buoc-8.md` cho đúng phạm vi (B8-1); ghi vào `buoc-1.md` rằng 182 e2e không còn chạy lại được (B1-2, B1-7) | B8-1, B1-2 | docs | `docs/deliveries/buoc-8.md`, `buoc-1.md` | S |

### R3 ⬜ — Chặn provider giả ở production (Q13: giữ cơ chế, chỉ thêm checklist)

| Còn lại | Finding | Loại | File chạm | Cỡ |
|---|---|---|---|---|
| Thêm mục: đặt `BILLING_PRODUCTION=true`; không đặt `BILLING_FAKE_ENABLED`, `AI_FAKE_ENABLED`, `GOOGLE_FAKE_ENABLED`; kiểm API từ chối khởi động khi bật một đồ giả. Hiện checklist chỉ nhắc `BILLING_PRODUCTION` bên trong mục Google (`deploy-checklist.md:142, 144`; grep `BILLING_PRODUCTION` chỉ ra hai dòng này, kiểm 04/11). Trạng thái code: `app-config.ts:238, 261-275`; `.env.example:61-62, 70, 81` | [X-3](../superpowers/reviews/2026-10-29-buoc-1-8-review.md#x-3), [B5-2](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-2) | docs | `docs/deliveries/deploy-checklist.md` | S |

### R4 ⬜ — Bổ sung `deploy-checklist.md` (chỉ tài liệu)

Grep 04/11 trên checklist: `fetchState`, `transaction_id`, `ai_call_contents`, `G1-10`, `D39`, `nonce`, `max_concurrent`, `Điều 42` đều 0 dòng.

| Mục cần thêm | Finding | Cỡ |
|---|---|---|
| AI: chính sách riêng tư nêu việc gửi từ riêng và câu ngữ cảnh cho OpenAI/Anthropic; `ai_call_contents` giữ 7 ngày và admin đọc được; điều khoản dữ liệu của provider; OpenAI dưới 18 tuổi / ZDR so với mốc 13 tuổi; không dùng model giữ dữ liệu 30 ngày; `max_concurrent_calls` 50 tính theo tiến trình, so với tier Anthropic; ba điểm riêng tư của B7 §20; chữ "300 câu AI" (B7 §19) | [B6-1](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b6-1) | S–M |
| Bước 5 trước khi bán thật: D24/Điều 42 và email báo trước khi gia hạn; adapter thật gửi `transaction_id` (D37) và có `fetchState` (D39); đo khóa trần AI dưới tải | [B5-9](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-9) | S |
| Chạy tay hai worker gửi nhắc học (G1-10; checklist dev mục D đã có) | [B3-1](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-1) | S |
| Đo lại "Ôn tất cả" (D39) trong mục "Đo tải" | [B4-1](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b4-1) | S |
| Xem lại CSP (nonce/hash thay `'unsafe-inline'`) trước khi bật `/app` | [UW-4](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-4) | S |
| Build và test bản cờ app tắt (cấu hình production). Đề xuất gốc là một bước CI hoặc một unit test gọi `proxy()`, tức là code | [UW-3](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-3) | S (docs) / S–M (CI) |
| Mục R3 (ở trên); R10 đã sửa ở #187, nên chỉ còn câu "sửa trước provider thật" của B5-3 là đã xong | [X-4](../superpowers/reviews/2026-10-29-buoc-1-8-review.md#x-4) | S |
| Đánh dấu xong "Dọn tài khoản chưa xác nhận" (`deploy-checklist.md:115` còn `[ ]`; job `identity.unverified-cleanup` có ở `apps/api/src/identity/deletion/deletion-jobs.service.ts:36`, kiểm 04/11) | [B8-6](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-6) | S |
| Các dòng do finding R14 đề xuất thêm vào checklist: tạo DB production mới, không mang tài khoản chưa xác minh từ trước 26/10 ([B8-5](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-5)); đo search/browse của người học ([B2-5](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-5)) và đo mở phiên có dạng AI ([B7-5](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b7-5)) trong "Đo tải" | như cột trái | S |

Ghi chú: memory của dự án ("No lawyer push", 03/11/2026) muốn mỗi sự thật pháp lý chỉ nêu một lần, không thêm phương án "chờ luật sư".

### R8 🟡 — "Đặt mật khẩu" của tài khoản chỉ có Google

| Còn lại | Finding | Loại | File chạm | Cỡ |
|---|---|---|---|---|
| Code đã sửa (#188): `AuthGate.tsx:12-13, 31` cho phép `forgot-password` và `reset-password` khi đã đăng nhập (kiểm 04/11). Còn thiếu: thử trên trình duyệt thật (tài khoản chỉ có Google → Cài đặt → Đặt mật khẩu → form hiện, gửi mã, đặt được). Checklist dev không có mục này (grep `B8-2` = 0). B8-4 đề xuất thêm một e2e mock cho đúng luồng này | [B8-2](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-2), [B8-4](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-4) | chạy tay (+ e2e nếu chọn) | `apps/web/e2e/app/*` nếu làm e2e | S |

### R11 🟡 — Sửa nguồn đã có dữ liệu (plan ghi "chờ merge")

Đã merge: `2ed7d8b5` và `12988565` là tổ tiên của `HEAD` (`git merge-base --is-ancestor`, kiểm 04/11), và `source-version-locked` có trong
`apps/api/src/content/sources/sources.service.ts`. Chỉ còn sửa dòng R11 trong plan thành ✅ (docs, S). Finding: [B2-2](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-2).

### R12 ⬜ — Sửa tài liệu lệch code (chỉ tài liệu)

Trạng thái kiểm 04/11:

| Chỗ lệch | Còn không | Finding | Cỡ |
|---|---|---|---|
| `CLAUDE.md:167-168` "Step 8 is still decided-but-not-scaffolded" | còn | [B8-6](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-6) | S |
| `CLAUDE.md:311` "the dashboard's two missing numbers" (#171 đã merge); `giao-dien-admin.md:612` (theo review, chưa đọc lại); thêm AD19 cho dashboard `ai.view` | còn | [UA-2](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-2) | S |
| `CLAUDE.md:348` "mọi cài đặt AI, chi phí và các lần gọi vẫn `settings.manage`" (dashboard `ai.view` cho editor xem tiền); design B7 §9.1/§13 quyền đọc lý do báo lỗi (code dùng `content.edit`) | còn | [B7-4](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b7-4) | S |
| `CLAUDE.md:308` "24 admin screens" → 24 mục menu | còn | [UA-5](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-5) | S |
| Design Bước 0 (B0#2, B0E8), Bước 1 (§4 guard không đọc DB, B1#1 đăng ký trả token, §5), fixes (§4.3 ngày sinh, §4.5): thêm ghi chú "đã thay bởi …" | còn (grep "đã thay bởi\|superseded" trong design Bước 0 và Bước 1: 0) | [B1-7](../superpowers/reviews/buoc-1-8/buoc-1-and-fixes-0-3.md#b1-7) | M |
| Design B3: B3E2, §8.3, §19, phần header | theo review | [B3-6](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-6) | S |
| `apps/admin/messages/en.json` trần 100 ví dụ | **đã sửa** (`:504-505` ghi 1,000; UA-1, #188) | [UA-1](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-1) | — |
| Test flow còn `pnpm test:e2e`: `buoc-2-test-flow.md:15, 18`; `buoc-2-5-test-flow.md:17`; **cả** `buoc-3-test-flow.md:13` (`test:e2e`) và `:14` (`test:e2e:scale`, trong khi script thật là `test:scale`) | còn | [B2-7](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-7) | S |
| Nhãn `B2#66` ở `apps/api/test/support/list-routes.spec.ts:34` (đổi tên test, là code) | theo review | B2-7 | S |
| `giao-dien-nguoi-hoc-handoff-2026-10-23.md:31` "Sắp có"; `buoc-7.md:156` "Chưa có giao diện" | còn | [UW-9](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-9) | S |
| Design Bước 8 §9.1 (`logout-pending`), §17 (e2e mock); thêm bước đăng xuất rồi đăng nhập lại vào `buoc-8-test-flow.md` B3 | theo review | [B8-8](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-8) | S |

### R13 ⬜ — Lưu bằng chứng chạy

| Còn lại | Finding | Loại | Cỡ |
|---|---|---|---|
| Nối output smoke hồi quy (sau Bước 6–8; smoke 4/5 của đợt sửa) vào các file `*-smoke-output.txt` | [B1-8](../superpowers/reviews/buoc-1-8/buoc-1-and-fixes-0-3.md#b1-8), [B8-6](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-6) | chạy tay + docs | M |
| As-built ngắn cho lần gọi AI thật 28/10 (cũng đóng phần còn lại của A5). `docs/deliveries/` không có file nào như vậy (kiểm 04/11). Cần dữ liệu của chủ dự án | [X-6](../superpowers/reviews/2026-10-29-buoc-1-8-review.md) | docs | S |
| Thêm mục "Thêm sau plan" vào test flow admin (`giao-dien-admin-test-flow.md`: grep "thêm sau plan" = 0, kiểm 04/11) | [UA-3](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-3) | docs | M |
| Lượt trình duyệt và kiểm tay Bước 8: `buoc-8.md:129-131` "(chưa có — điền sau khi chạy …)". e2e mock cho các màn mới của Bước 8 (code) | [B8-4](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-4), B8-6 | chạy tay / code | M |
| Chủ dự án tự chạy test flow người học (D4); ghi trong as-built người học rằng bằng chứng chỉ có bằng lời | [UW-8](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-8) | chủ dự án + docs | S |

### R14 🟡 — Các điểm Thấp còn mở

Đã sửa theo plan: B1-3, B1-4, B1-6, B1-9, B1-10, B3-3, B3-4, B4-3, B6-2, B6-3, UW-5, B8-7, UA-1. Đã đọc lại ba mục: B1-6 (`password.service.ts:101-104`), B8-7
(`vi.json` `App.deleteAccount.deleted.plans` = "Gói của bạn"), UA-1. Còn mở:

| Mã | Còn lại | Loại | File chạm | Cỡ |
|---|---|---|---|---|
| [B1-5](../superpowers/reviews/buoc-1-8/buoc-1-and-fixes-0-3.md#b1-5) | Dọn `otp_failure_windows` (> 48 h) và `mail_budget_buckets` cũ. Kiểm 04/11: không có `deleteMany` nào; `otp_failure_windows` chỉ bị xóa khi xóa tài khoản (`identity/deletion/account-data-map.ts:20`) | code | `identity/maintenance/identity-cleanup.service.ts`, một job của `src/common` | S |
| [B2-3](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-3) | Content chạy SQL trên bảng Pipeline (`sources.service.ts:136-140`) → probe kiểu `EntryUsageProbe`; chốt DB12; race hẹp khi xóa nguồn lúc đang upload | code + quyết định | `content/sources/*`, `content-pipeline/*` | M |
| [B2-5](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-5) | Đo search/browse của người học khi bảng có từ riêng (`ASSUMPTION`, chưa đo) | test:scale (code test) | `apps/api/test/content/lookup.scale.e2e-spec.ts` | S–M |
| [B2-6](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-6) | Trần 3 lượt job dựa vào `job.attemptsMade` (kiểm 04/11: `job-runner.service.ts:78`), không dựa vào `background_jobs.attempts`; reconciler thêm lại có thể ra khoảng 5 lượt | code hoặc ghi design | `content-pipeline/jobs/job-runner.service.ts` | S |
| [B3-5](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-5) | `visibleSenseIds` chạy ngoài transaction (kiểm 04/11: `learning/items/items.service.ts:61` trước `$transaction` ở :65); `deleteItem` (:135, :146) không gọi `lockItems` | code | `learning/items/items.service.ts`, `quick-add.service.ts` | S |
| [B3-7](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b3-7) = [B25-2](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b25-2) | Trang Xuất của admin thiếu "Từ chưa có nghĩa" (API `entries/export?has_sense=false` có sẵn); 7.799 > `EXPORT_MAX_ROWS` 5.000; câu 18 chưa chốt | quyết định + code admin | `apps/admin/src/features/content/*` | S–M |
| [B4-4](../superpowers/reviews/buoc-1-8/buoc-3-and-4.md#b4-4) | PX3 (`review_id` không so hành động), PX5 (`overdue_first` với từ mức 0; câu 27 treo), PX6 (`types` cho phép null, `hint_level` không có CHECK) | quyết định + code + migration | `learning/practice/*`, `practice/*`, migration | M |
| [B5-5](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-5) | Mốc chu kỳ = `event.currentPeriodStart` (kiểm 04/11: `subscription-machine.ts:88, 130, 248`); đề xuất `min(currentPeriodStart, occurredAt)` + unit test. Chỉ gặp với provider thật (`ASSUMPTION` về hành vi provider) | code | `entitlements/billing/subscription-machine.ts` | S |
| [B5-6](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-6) | Xác nhận muộn không kiểm trần toàn hệ thống: sửa chữ trong design hoặc kiểm dưới `lockAiDaily` | docs hoặc code | design Bước 5 / `usage-ledger.service.ts` | S |
| [B5-7](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-7) | `refund` phải đòi có dòng `use` `confirmed` cho đúng `operation_id`; thêm test | code | `entitlements/usage/usage-ledger.service.ts` | S |
| [B5-8](../superpowers/reviews/buoc-1-8/buoc-5.md#b5-8) | Chứng minh test chạy đua có răng: trên nhánh nháp bỏ `lockPool` / `lockAiDaily` thì smoke phải đỏ; ghi kết quả vào as-built. Checklist dev không có (grep `B5-8` = 0) | chạy tay + docs | `docs/deliveries/buoc-5.md` | S |
| [B7-5](../superpowers/reviews/buoc-1-8/buoc-6-and-7.md#b7-5) | Đo mở phiên với 50 từ có dạng AI (mỗi từ một query) | đo + docs | `question-builder.service.ts:94-103` (chỉ đo) | S |
| [B8-5](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-5) | Dùng lại id của tài khoản chưa xác minh tạo trước 26/10: ghi vào checklist "DB production tạo mới", hoặc chạy bộ xóa trước khi dùng lại id | docs (hoặc code) | `deploy-checklist.md` / `google-auth.service.ts:266-286` | S |
| [B8-8](../superpowers/reviews/buoc-1-8/buoc-8.md#b8-8) | Ghi chú as-built cho design §9.1/§17; thêm bước vào test flow B3 | docs | design Bước 8, `buoc-8-test-flow.md` | S |
| [UW-6](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-6) | Bỏ các assert class bố cục (`font-bold`, `sm:grid-cols-2`, `text-caption`); giữ class motion | code test | `practice-session.test.tsx`, `review-session.test.tsx`, `group-page.test.tsx` | S |
| [UW-7](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#uw-7) | Lớp phiên chép từ admin sang web đã lệch 133 dòng: ghi một dòng theo dõi (tách package khi có app thứ ba) | docs | improvement plan | S |
| [UA-4](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-4) | Khai `AppConfig` của `use-intl` cho admin. Kiểm 04/11: `apps/admin/src/vite-env.d.ts` không có (đối chứng: web có ở `src/global.d.ts:5`) | code | `apps/admin/src/vite-env.d.ts` | S |
| [UA-6](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-6) | 44 lần `getByTestId('detail-panel')` → `role="region"` có tên | code + test | 32 file test admin | M |
| [UA-7](../superpowers/reviews/buoc-1-8/giao-dien-nguoi-hoc-and-admin.md#ua-7) | Email trong URL bộ lọc admin: ghi nhận, xét lại khi chọn hosting (log truy cập) | docs | `deploy-checklist.md` | S |

Ngoài R14 nhưng vẫn mở và không có dòng theo dõi: `writeEntry` bị chép ở hai controller (phần "nợ" của [B2-8](../superpowers/reviews/buoc-1-8/buoc-2-and-2-5.md#b2-8),
code S). Phần index của B2-8 đã xong ở R1 (`batch_records_record_type_record_id_idx`,
`apps/api/prisma/migrations/20261102100000_review_r1_user_id_indexes/migration.sql`).

### Các dòng ⬜/🟡 khác của plan có liên quan

- 🟡 A6 (điểm nhỏ của admin): ô tìm kiếm ở màn Người dùng chưa chặn ký tự NUL trong URL; khóa tài khoản bị rate limit chỉ hiện câu chung, chưa đếm ngược; ô ngày hiện
  `mm/dd/yyyy`. Code admin, S mỗi điểm.
- ⬜ A7 (Docker) còn câu "Form waitlist của landing cần Cloudflare D1", đã cũ (waitlist bị bỏ 03/11).
- Các dòng B1–B11 (nhóm B), C*, D* nằm ngoài đợt này.

---

## D. Tài liệu lệch code (kiểm 04/11)

| Chỗ | Thực tế |
|---|---|
| `package.json:5` (gốc) `"test:e2e": "pnpm --filter api test:e2e"` | `apps/api/package.json` không có script `test:e2e` (scripts chỉ có `test`, `test:watch`, `test:cov`, `test:debug`, `test:scale`…). Lệnh gốc gọi tới script không tồn tại. `ASSUMPTION`: pnpm báo lỗi "missing script" (chưa chạy) |
| `docs/deliveries/buoc-2-test-flow.md:15, 18`; `buoc-2-5-test-flow.md:17` | `pnpm test:e2e` của `apps/api` và kỳ vọng "457 e2e" / "475/475" không còn (D38) |
| `docs/deliveries/buoc-3-test-flow.md:13, 14` | `pnpm test:e2e` và `pnpm test:e2e:scale`; script thật là `test:scale` |
| `CLAUDE.md:16` "real Google not yet tried"; `:318` "Not yet done: real Google sign-in rounds 1 and 2"; `docs/deliveries/buoc-8.md:124`, `:129-131` ("chưa có"); `deploy-checklist.md:148` ("Chưa ai chạy tới 29/10/2026") | Chủ dự án nói đã thử Google thật, nhưng **repo không ghi kết quả nào** (`buoc-8.md` mục "Kết quả kiểm tay" trống). Cần kết quả của chủ dự án (ngày, lần 1/lần 2, hai `ASSUMPTION` của design §19) mới sửa được bốn chỗ này |
| `deploy-checklist.md:83` nhắc waitlist; `IMPROVEMENT_PLAN` A7 | Waitlist đã bị bỏ (`apps/web/src/components/landing/copy.test.ts:43-47`) |
| `deploy-checklist.md:115` `[ ]` dọn tài khoản chưa xác nhận | Đã có (`deletion-jobs.service.ts:36`) |
| `IMPROVEMENT_PLAN` R11 "chờ merge" | Đã merge (§C, R11) |
| `CLAUDE.md:167-168`, `:308`, `:311`, `:348` | Xem R12 |

---

## E. ASSUMPTION và những gì chưa kiểm

- `ASSUMPTION`: CSP không áp lên style gán qua CSSOM (`node.style[...]`), nên 7 prop `style={}` của admin không cần `'unsafe-inline'`. Chỉ đã đọc cách React gán, chưa thử
  trên trình duyệt.
- `ASSUMPTION`: hash CSP áp được cho thẻ `<style>` mà React Aria tạo bằng `document.createElement` lúc chạy (thay cho `'unsafe-inline'`). Chưa thử.
- `ASSUMPTION`: Vite copy `apps/admin/public/` vào `dist/` theo mặc định (`vite.config.ts` không đổi `publicDir`/`outDir`). Chưa build.
- `ASSUMPTION`: rule `_headers` có áp cho response của fallback SPA (`not_found_handling: single-page-application`) không. Tài liệu Cloudflare không nói.
- `ASSUMPTION`: `remoteip` đúng khi đứng sau Cloudflare chỉ nếu `TRUST_PROXY` được đặt đúng; chưa có môi trường để thử.
- `ASSUMPTION`: `pnpm --filter api test:e2e` báo lỗi missing script (chưa chạy).
- Suy từ code, chưa chạy: API trả `X-Powered-By: Express`.
- Chưa xác nhận: kết quả Google thật mà chủ dự án nói đã thử (không có trong repo).
- Số dòng code trong các finding R14 mà bảng không ghi "kiểm 04/11" là số của lúc review (`867d385`, 29/10); có thể đã dịch.
- Checklist dev (`docs/audit/2026-11-04-dev-test-checklist.md`) được đọc từ nhánh `docs/dev-test-checklist` (`9e8da244`), chưa có trên `dev`.
