# Chuẩn bị launch, đợt A: Turnstile, security header, sửa sau review, lượt AI cho Free — Design (04/11/2026)

> **Trạng thái 04/11/2026:** các câu ở §10 đã chốt (chủ dự án: "theo rec của bạn", tức theo đề xuất của Claude). **Đã sửa theo review độc lập
> 04/11/2026** ([`../reviews/2026-11-04-chuan-bi-launch-a-design-review.md`](../reviews/2026-11-04-chuan-bi-launch-a-design-review.md), RA-1…RA-27;
> chủ dự án: "sửa theo review"); **chờ chủ dự án đọc lại.** Ba quyết định mới khi sửa (DA12 vòng 2, DA15 vòng 2, DA19) và các đề xuất kỹ thuật thêm nằm
> ở decision record. Từng finding đổi gì: §13.
> Chưa có code, chưa có plan. Decision record: [`../decisions/2026-11-04-chuan-bi-launch-a-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-a-decisions.md).
> **Nguồn quyết định:** chủ dự án chốt trong chat 02–04/11/2026, tổng hợp ở `docs/preparation/WEB_LAUNCH_DECISIONS_AND_OPEN_ITEMS_2026-11-04.md`
> (nhánh local `docs/web-launch-research`). Mã quyết định (A1, R-Q14, Q13…) dẫn theo file đó.
> **Code đọc trên:** `origin/dev` @ `a6b2bd15`. Mọi `path:line` ở hai file code facts:
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-hardening.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-hardening.md) (Turnstile, header, review) và
> [`../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-free-ai.md`](../../preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-free-ai.md) (lượt AI, trial).
> Các dòng code thêm khi sửa theo review đã được mở lại trên cùng commit.
> **Đợt B** (quảng cáo, thanh toán VietQR) có design riêng: [`2026-11-04-chuan-bi-launch-b-design.md`](2026-11-04-chuan-bi-launch-b-design.md).
> Phụ thuộc giữa hai đợt: §12.

Ví dụ xuyên suốt: **Lan**, học viên gói Free, timezone `Asia/Ho_Chi_Minh`. **Hà** là nhân viên (editor) đăng nhập trang admin.

## 1. Mục tiêu và phạm vi

Ba việc nhỏ và vừa phải xong trước launch web, không phụ thuộc thanh toán hay quảng cáo.

| Phần | Việc | Chạm |
|---|---|---|
| A1 | Turnstile (CAPTCHA của Cloudflare) cho đăng ký, đăng nhập, quên mật khẩu, gửi lại mã của web; đăng nhập và quên mật khẩu của admin | API Identity, web, admin |
| A1 | Security header cho admin tĩnh, API và web | admin (`_headers`), API, web (`next.config.ts`) |
| A2 | Đợt sửa các mục review còn mở (R-Q14 = một đợt riêng) | chủ yếu tài liệu, một ít code nhỏ |
| A3 | Gói Free có 15 câu AI + 5 lượt tra AI mỗi tháng dương lịch (A1–A2 của tổng hợp), có trần riêng mỗi ngày; tắt trial (P3); sửa bản nháp pháp lý theo | API Entitlements, settings, admin, web, landing, bản nháp pháp lý |

**Không làm trong đợt này:** thanh toán, quảng cáo (đợt B); Cloudflare Access, WAF, Bot Fight Mode (cấu hình lúc deploy, đã có trong `deploy-checklist.md`);
viết lại các mục 5–8 của Điều khoản (đi cùng đợt B; mục 5 "Dùng thử" nằm trong đó); test e2e cho backend (Q11: không làm).

## 2. Quyết định đã chốt (tóm tắt)

| Mã | Quyết định | Áp vào |
|---|---|---|
| A1, A2 (tổng hợp) | Free có `free_ai_practice_per_cycle` = 15, `free_ai_lookup_per_cycle` = 5; một tháng = tháng dương lịch theo timezone của học viên | §6 |
| A3 (tổng hợp) | Không cần công tắc từ chối AI: học viên tự bật/tắt "Kiểu câu có AI" và chỉ tra AI khi bấm nút | §6 (không thêm gì) |
| P3 | Tắt trial | §6.9 |
| R-Q14 | Các việc sửa sau review đi thành một đợt riêng có design và plan | §5 |
| R-Q11 (Q11) | Không e2e backend; dev test tay theo checklist `docs/audit/2026-11-04-dev-test-checklist.md` | §5, §8 |
| Q13 | Giữ cơ chế chặn provider giả bằng `BILLING_PRODUCTION`, chỉ thêm mục checklist | §5 (R3) |
| Q-A1, Q-A2 (DA9, DA10) | Turnstile ở đăng ký, đăng nhập, xin mã (OTP) của web; ở đăng nhập và quên mật khẩu của admin; API kiểm token phía server | §4 |
| DA12 vòng 2 | Cloudflare không trả lời: `register` và `otp` từ chối; `login` cho qua, log cảnh báo | §4.2 |
| DA15 vòng 2 | Limits grant có AI hết hạn giữa tháng cũng mở cửa sổ Free mới, như nguồn Pro | §6.3 |
| DA19 | Free có trần AI riêng mỗi ngày `free_ai_daily_cap` (mặc định 500), dưới trần chung | §6.4 |

## 3. Chia việc và thứ tự

Thứ tự theo khối lượng, từ nhỏ đến lớn (chủ dự án 04/11). Mỗi milestone một nhánh từ `origin/dev`, một PR vào `dev`.

| Milestone | Nội dung | Ước lượng |
|---|---|---|
| M1 | Turnstile (API, web, admin) và security header; sửa mục Turnstile và header của `deploy-checklist.md` (§4.5) | 1–2 PR |
| M2 | Đợt sửa sau review: một PR tài liệu, một PR code (gồm B5-7, B5-5) | 2 PR |
| M3 | Lượt AI cho Free (cycle tháng, mốc kết thúc nguồn Pro, trần Free), tắt trial, sửa bản nháp pháp lý | 1–2 PR |

```
M1 Turnstile + header ─────────────┐
M2 tài liệu (song song với M1)     ├──► M3 AI cho Free + tắt trial
M2 code (B5-7, B5-5, …) ───────────┘
```

- **M3 vào `dev` sau M1:** Free có AI chỉ an toàn khi tạo tài khoản hàng loạt đã bị chặn (trade-off của DA3).
- **M3 sau PR code của M2:** B5-7 (M2) và `refund` dùng `aiCycle` (M3) cùng sửa `usage-ledger.service.ts:140-160`.
- **Deploy:** API trước web và admin (§4.2).

## 4. A1 — Turnstile và security header

### 4.1 Turnstile: luồng

```
Lan mở form ──► widget Turnstile ──► token (sống 300 s, dùng 1 lần)
      │ POST /v1/auth/register { …, turnstile_token }
      ▼
API, TurnstileGuard (chạy trước pipe validation):
  1. chế độ `off`?                         có    ─► bỏ qua bước 2–4
  2. token là chuỗi 1–2048 ký tự?          không ─► 400 `validation-failed` (không gọi mạng, không đếm)
  3. `auth.captcha.ip` (60/60 s/IP, `real`) vượt  ─► 429 `rate-limited` (không gọi Cloudflare)
  4. siteverify (5 s, thử lại 1 lần cùng `idempotency_key`)
       ├─ success + hostname trong danh sách ─► bước 5
       ├─ success: false / hostname lạ       ─► 400 `captcha-failed`, không gửi mail
       └─ Cloudflare không trả lời / lỗi     ─► register, otp: 503 `captcha-unavailable`
                                                login: cho qua + log `turnstile_bypassed` (DA12 vòng 2)
  5. RateLimitGuard (luật của route, như cũ) ─► handler: tạo tài khoản, gửi OTP
```

Route phải chặn (theo code facts §A1): `POST /v1/auth/register`; `POST /v1/auth/otp` (cả `verify_email` và `reset_password`); **`POST /v1/auth/login`**
(Q-A1 vòng 2). Login chặn không chỉ vì nó gửi lại mã cho tài khoản chưa xác minh, mà chủ yếu để chặn bot dò mật khẩu bằng danh sách email và mật khẩu bị lộ:
giới hạn 20 lần/phút/IP không chặn được bot đổi IP, còn khóa tài khoản sau 10 lần sai lại cho bot cố tình khóa tài khoản của người thật.
Không chặn: `verify-email`, `password/reset` (không gửi mail, cần mã đúng), `refresh`, Google (Google có lớp chống bot riêng).

### 4.2 Turnstile: API

- **Guard và decorator.** `TurnstileGuard` nằm trong Identity. Ba route ở §4.1 đổi `@RateLimit(...rules)` thành decorator mới `@Turnstile(...rules)` =
  `applyDecorators(SetMetadata(RATE_LIMIT_KEY, rules), UseGuards(TurnstileGuard, RateLimitGuard))`. Nest chạy guard theo thứ tự mảng
  (`@nestjs/core` 12.1.2, `guards/guards-consumer.js`), nên một lần `UseGuards` với hai guard luôn cho `TurnstileGuard` chạy trước, không phụ thuộc thứ tự
  viết decorator (RA-3).
- **Guard chạy trước pipe.** `fnCanActivate` chạy trước, `fnApplyPipes` chỉ chạy trong handler (`router/router-execution-context.js`). Body đã được parse
  (`app.setup.ts:15-26`) nhưng chưa validate, nên guard tự kiểm token theo các bước ở §4.1:
  - `off`: cho qua, không đọc token.
  - Token phải là chuỗi dài 1–2048 ký tự. Thiếu, là số, là object hay dài hơn → 400 `validation-failed`; không gọi mạng, không đếm rate limit.
  - Chỉ ở `real`: luật mới `auth.captcha.ip` (`by: 'ip'`, 60 lần / 60 s, thêm vào `DEFAULT_LIMITS`) đếm số lần gọi Cloudflare của một IP. Vượt → 429
    `rate-limited` kèm `Retry-After`, không gọi Cloudflare (RA-4, phương án a).
  - Gọi siteverify (dưới). Qua thì `RateLimitGuard` đếm luật của route như cũ, nên token giả không ăn vào bộ đếm của người thật.
- **Schema:** thêm `turnstile_token: z.string().min(1).max(2048).optional()` vào `registerSchema`, `loginSchema` và hai nhánh của `otpRequestSchema` (đều
  `strictObject`). `loginSchema` là `registerSchema.pick(...)` (`auth.schemas.ts:16`), nên thêm vào nó bằng `.extend`, không tự sang từ `registerSchema`.
  Không thêm vào `verifyEmailSchema` (`otp.schemas.ts:8`, cũng là `pick`). Schema là hằng tạo lúc load module, nên "bắt buộc" do guard giữ, không do schema.
  Test "field lạ → 400" vẫn giữ.
- **Client siteverify** theo mẫu `RealGoogleClient` (`google-client.real.ts`): `fetch` global truyền vào được để test; `POST` form-urlencoded tới
  `https://challenges.cloudflare.com/turnstile/v0/siteverify` với `secret`, `response`, `remoteip` (= `request.ip`), `idempotency_key` (một UUID mới cho
  mỗi request tới API).
  - Timeout **5 s** mỗi lần. Lỗi mạng, timeout, HTTP 5xx, hoặc `error-codes` có `internal-error` → thử lại **một lần** với cùng `idempotency_key` (trang
    Server-side validation của Cloudflare: `internal-error` thì "Retry the request"). Vẫn lỗi → "Cloudflare không trả lời" (dưới).
  - `success: true` thì `hostname` phải nằm trong `TURNSTILE_ALLOWED_HOSTNAMES`. Ngoài danh sách → 400 `captcha-failed`, log cảnh báo
    `turnstile_hostname_mismatch` kèm hostname.
  - `success: false` → 400 `captcha-failed`. Gồm cả `timeout-or-duplicate` (token đã dùng, hoặc quá 300 s).
  - `error-codes` có `missing-input-secret` hoặc `invalid-input-secret` (cấu hình của ta sai) → xử như "Cloudflare không trả lời", cộng log mức error
    `turnstile_misconfigured`.
  - Không log token, không log secret (luật log của SR). Lỗi bọc lại, không mang secret ra ngoài.
  - Không kiểm `action`: token lấy ở form đăng nhập dùng được cho đăng ký (LA1E12).
- **Một widget cho mọi host (RA-1).** Tạo **một** widget Turnstile (một sitekey, một secret), đăng ký đủ `wordmet.com`, `www.wordmet.com`
  (`apps/web/wrangler.jsonc:7-10` có cả hai) và `admin.wordmet.com`. Web và admin dùng cùng sitekey. API chỉ có một secret, nên không cần biết token đến từ
  widget nào. Hai widget sẽ cần hai secret.
- **Cấu hình** (mẫu như `google.mode`; `AppConfig.turnstile = { mode, secretKey, allowedHostnames }`):
  - `TURNSTILE_MODE` = `real` | `fake` | `off`, **không có mặc định**. Thiếu thì API và worker (cùng `loadConfig`, `worker.ts:10`) dừng, báo tên biến,
    như `TERMS_VERSION` (RA-8). Nhờ vậy một production quên biến này không chạy được mà không có Turnstile.
  - `real`: cần `TURNSTILE_SECRET_KEY` (`nonEmpty`; không dùng `secretSchema` vì secret Turnstile không ở dạng base64url) và
    `TURNSTILE_ALLOWED_HOSTNAMES` (danh sách cách nhau bằng dấu phẩy, ít nhất một tên). Thiếu → dừng.
  - `fake`: không gọi mạng, không đếm `auth.captcha.ip`, không kiểm hostname. Token đúng hình dạng nào cũng qua, trừ `fake-turnstile-fail` → 400
    `captcha-failed`. Dùng cho smoke, `admin-e2e-real`, local, `pnpm bootstrap`.
  - `off`: không kiểm, token không bắt buộc. Chỉ cho unit test (`testConfig`) và local khi cần.
  - `BILLING_PRODUCTION=true` cùng `fake` hoặc `off` → API từ chối khởi động (cùng cơ chế Q13, `app-config.ts:261-275`).
- **Nơi phải đặt biến của API (RA-8):**
  - `apps/api/.env.example`: `TURNSTILE_MODE=fake`; `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES` để trống, kèm ghi chú khóa test (§9).
  - `apps/api/test/support/test-config.ts`: `turnstile: { mode: 'off', secretKey: null, allowedHostnames: [] }`. Các test HTTP đang dựng app thật với guard
    thật (`auth.controller.spec.ts`, `otp.controller.spec.ts`) vì vậy không đổi; `TurnstileGuard` có test riêng.
  - `app-config.spec.ts`; khối env của job `admin-e2e-real` trong `ci.yml` (`TURNSTILE_MODE=fake`).
  - `docker-compose.yml`, service `api`: `TURNSTILE_MODE: ${TURNSTILE_MODE:-fake}`, như `TERMS_VERSION`, để `.env` cũ vẫn chạy (`pnpm bootstrap` chỉ chạy local).
  - Smoke: tám smoke (`smoke-buoc-0-3-fixes`, `-2`, `-4`, `-5`, `-6`, `-7`, `-8`, `smoke-nhom-b`) và `learner-test-setup` tự kiểm `.env` của API có
    `TURNSTILE_MODE=fake` trước khi chạy (theo mẫu kiểm môi trường của các smoke đang có), và gửi `turnstile_token: 'smoke-token'` ở đăng ký, đăng nhập,
    xin mã.
- **Lỗi mới:** `captcha-failed` (400) và `captcha-unavailable` (503), problem+json.
- **Khi không gọi được Cloudflare (DA12 vòng 2, RA-6):**
  - `register`, `otp`: **từ chối**, 503 `captcha-unavailable` kèm câu "thử lại sau ít phút"; không gửi mail. Q-A4 giữ nguyên cho hai route gửi mail.
  - `login`: **cho qua**, log cảnh báo `turnstile_bypassed` (route, lý do). Lúc đó đăng nhập chỉ còn lớp bảo vệ như trước khi có Turnstile:
    `auth.login.ip` 20/60 s và khóa sau 10 lần sai. Nhờ vậy Cloudflare lỗi không chặn cả người học lẫn admin, và không ai phải tắt `BILLING_PRODUCTION`
    để cứu (việc đó mở cửa cho đồ giả, X-3). Tài khoản chưa xác minh đăng nhập đúng mật khẩu vẫn được gửi lại mã như hiện nay (giới hạn theo email
    1 thư/60 s, 5 thư/giờ).
  - Chỉ áp cho lỗi phía Cloudflare hoặc lỗi cấu hình ở trên. Token sai hình dạng (400) và `success: false` (400) không bao giờ được cho qua.
- **Client `mobile`** (schema có, app chưa có): token **bắt buộc như web** (Q-A3); khi có app Flutter thì design riêng cách lấy token trên app.
- **IP:** `remoteip` và `auth.captcha.ip` chỉ đúng khi `TRUST_PROXY` đặt đúng với proxy thật (đã có mục trong `deploy-checklist.md`).
- **Thứ tự deploy:** API trước web và admin. Web bản mới gửi `turnstile_token` tới API bản cũ sẽ nhận 400, vì schema strict (code facts hardening §0.3).

### 4.3 Turnstile: web và admin

- **Component `TurnstileWidget`** (mỗi app một bản, cùng hành vi): tải `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, render với
  `sitekey`, `refresh-expired: 'auto'` (mặc định của Cloudflare, ghi rõ để không ai đổi nhầm), `callback` → nhận token; `expired-callback`,
  `error-callback`, `timeout-callback` → xóa token. Có hàm `reset()`.
- **Form:** nút gửi tắt khi chưa có token. **Sau mọi response** (2xx, 4xx, 5xx, lỗi mạng) form gọi `reset()` và xóa token, trừ khi form chuyển trang
  (RA-5). Lý do: token chỉ dùng được một lần ("Each token can only be validated once"), nên sai mật khẩu (401 `invalid-credentials`), `email-taken`, mật
  khẩu không đạt luật, 429 hay `mail-unavailable` đều đã tiêu token. Lan sửa mật khẩu rồi bấm lại thì đã có token mới.
- **Form có widget:**
  - Web: `RegisterForm`, `LoginForm`, `ForgotPasswordForm`, nút gửi lại mã của `VerifyEmailForm`. Nộp mã (`verify-email`) không gửi token.
  - Admin: `LoginPage` và bước một (`POST /v1/auth/otp`) của `ForgotPasswordPage` (Q-A1, Q-A2). Bước đặt mật khẩu (`password/reset`) không gửi token.
    API không phân biệt host. Sau deploy admin còn được che thêm bằng Cloudflare Access.
  - Trang quên mật khẩu mở cả khi đã đăng nhập (B8-2), nên widget cũng hiện cho người đã đăng nhập. Chấp nhận.
- **Site key:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web, đóng vào bundle lúc build) và `VITE_TURNSTILE_SITE_KEY` (admin). Production dùng cùng sitekey của
  widget ở §4.2.
- **Widget giả khi site key rỗng (RA-7).** Site key rỗng → component không tải script, không gọi mạng, gọi `onToken('fake-turnstile-token')` ngay khi mount
  và sau mỗi `reset()`, không hiện gì. API ở `fake` nhận token này. API ở `real` gửi nó lên Cloudflare và nhận `success: false`, nên widget giả không mở được
  cửa ở production. Dùng cho unit test của form, `pnpm dev:app`, `pnpm bootstrap`, e2e mock của admin và `admin-e2e-real`.
- **Build production fail khi thiếu site key** (cùng kiểu với `assertApiBaseUrl` và `resolveApiBaseUrl`):
  - Web: app bật (`NEXT_PUBLIC_LEARNER_APP=on`) và `NEXT_PUBLIC_SITE_URL` bắt đầu bằng `https://wordmet.com` mà site key rỗng → `next.config.ts` throw.
    Không dựa vào `NODE_ENV`, vì mọi `next build`, kể cả bản e2e, đều chạy với `NODE_ENV=production`.
  - Admin: mode `production` (`vite build`) mà site key rỗng → plugin guard throw (cạnh `apiBaseUrlGuard`, `src/api-base-url-guard.ts`). `build:e2e`
    (mode `e2e`) không bị chặn.
- **Nơi đặt site key (RA-8):**
  - Web: `deploy-web.yml` (khi bật app lúc launch, §4.5); `apps/web/playwright.config.ts` (sitekey test `1x00000000000000000000AA`, xem e2e dưới);
    `apps/web/README.md` (bảng biến); `docker-compose.yml` service web (để trống → widget giả). Web chưa có `.env.example`.
  - Admin: `src/vite-env.d.ts` (khai kiểu); `apps/admin/.env.example` (để trống, ghi chú); bước "Build (production host guard)" của `ci.yml` (sitekey test,
    để guard qua); hai bước build e2e của `ci.yml`, `playwright.config.ts`, `playwright.real.config.ts` và `docker-compose.yml` service admin (để trống →
    widget giả).
- **CSP của web:** `script-src` thêm `https://challenges.cloudflare.com`; thêm `frame-src https://challenges.cloudflare.com` (hiện không có `frame-src`, nên
  `default-src 'self'` chặn iframe). Sửa `csp.test.ts`.
- **e2e của web:** bản build e2e có sitekey test, nên widget thật được dựng. `mockApi()` (`e2e/support/mock-api.ts`) chặn thêm
  `https://challenges.cloudflare.com/turnstile/v0/api.js` và trả một script giả (`window.turnstile` có `render`, `reset`, `remove`; `render` và `reset`
  gọi `callback` với một token cố định), nên mọi e2e có mock chạy không cần mạng. E23 (`e2e/csp.spec.ts`) không gọi `mockApi`: thêm một lần mở
  `/vi/app/login` để widget thật tải từ Cloudflare với sitekey test, và vẫn đòi 0 vi phạm CSP. Nhờ vậy E23 kiểm được CSP với iframe thật; đổi lại E23 cần
  mạng tới Cloudflare trong CI (§11).
- **Lỗi:** thêm `captcha-failed` và `captcha-unavailable` vào `KNOWN_ERROR_SLUGS` của **cả hai** app (web `app-shell/api/problem.ts`, admin
  `src/api/problem.ts`), có câu vi/en (`problem.test.ts` của hai app đòi đủ hai ngôn ngữ). Câu đề xuất: vi "Chưa xác minh được bạn không phải máy. Hãy thử
  lại." / "Chưa kiểm tra chống bot được lúc này. Hãy thử lại sau ít phút."; en "We couldn't check that you're not a bot. Please try again." / "The bot
  check is unavailable right now. Please try again in a few minutes."

### 4.4 Security header

**Admin tĩnh** (Workers Static Assets, không có Worker script): thêm `apps/admin/public/_headers` với **một** rule `/*`. Khi một header được áp hai lần,
`_headers` nối giá trị bằng dấu phẩy (tài liệu `_headers`), nên không thêm rule thứ hai (RA-17). Nội dung chính xác:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://admin-api.wordmet.com; img-src 'self' data: blob:; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- `style-src 'unsafe-inline'`: React Aria tự chèn thẻ `<style>` lúc chạy (code facts B1). **Chốt `'unsafe-inline'`, không dùng hash** (RA-16).
- `img-src 'self' data: blob:`: ảnh chỉ từ chính site (Q-A5). Ảnh ngoài trong Markdown pháp lý sẽ không hiện ở bản xem trước.
- `vite` và `vite preview` không đọc `_headers` (đó là tính năng của Workers Static Assets), nên admin local không có header này. Kiểm trước deploy bằng
  `dist/_headers` sau build và một unit test (§4.6); kiểm thật bằng `curl -I` sau deploy (§4.5).
- `ASSUMPTION`: Vite copy `public/` vào `dist/` (`vite.config.ts` không đổi `publicDir`); kiểm lúc build.
- `ASSUMPTION`: rule `_headers` áp cho trang trả về từ fallback SPA; kiểm `curl -I` một đường dẫn sâu sau deploy.

**API:** dùng `helmet` (thư viện có sẵn, theo luật "dùng công cụ có sẵn trước khi tự viết") với cấu hình cho API JSON:
tắt `X-Powered-By`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`; `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`;
`Cross-Origin-Resource-Policy: same-site`. Kiểm không làm vỡ CORS, cookie refresh và webhook billing (raw body).
- Không đặt HSTS ở API, để Cloudflare đặt ở tầng edge. `ASSUMPTION`: chỉ đúng khi API đứng sau proxy của Cloudflare; hosting của API chưa chọn. Nếu không
  đứng sau proxy thì bật HSTS trong `helmet` (mục checklist, §4.5).

**Web:** thêm vào `headers()` của `next.config.ts` (cạnh CSP): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` như admin. `poweredByHeader: false` đã có. Danh sách header tách thành một hàm trong `src/lib/` (như `buildCsp`) để unit test ghim.
- `ASSUMPTION`: `headers()` có thể không áp cho file tĩnh mà Workers Static Assets trả thẳng (`.open-next/assets`); kiểm `curl -I` một file `/_next/static/…`
  sau deploy (§4.5).

### 4.5 Mục `deploy-checklist.md` (sửa trong PR của M1)

- Sửa mục Turnstile (`deploy-checklist.md:83-86`): bỏ waitlist (đã bị bỏ 03/11); ghi phạm vi thật (đăng ký, đăng nhập, xin mã của web; đăng nhập và quên mật
  khẩu của admin); ghi code đã làm ở đợt A; tên domain đã xác nhận (`challenges.cloudflare.com`).
- Thêm (RA-23):
  - tạo **một** widget Turnstile với `wordmet.com`, `www.wordmet.com`, `admin.wordmet.com`;
  - đặt `TURNSTILE_MODE=real`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_ALLOWED_HOSTNAMES=wordmet.com,www.wordmet.com,admin.wordmet.com` cho API;
  - đặt site key trong `deploy-web.yml` (lúc bật app) và trong build admin;
  - deploy API trước web và admin;
  - sau deploy: `curl` `POST /v1/auth/register` không có token phải nhận 400; log của API không có `turnstile_misconfigured`.
- Đánh dấu hai mục header (`deploy-checklist.md:49-53`) là phần code đã làm, giữ lại phần kiểm sau deploy (RA-22): `curl -I` admin ở `/` và một đường dẫn sâu;
  web ở `/vi` và một file `/_next/static/…`; API có HSTS (nếu API không đứng sau proxy Cloudflare thì bật trong `helmet`).

### 4.6 When → Then (Turnstile, header)

**Acceptance criteria**

| # | Khi | Thì |
|---|---|---|
| LA1#1 | Lan gửi form đăng ký với token hợp lệ (API `real`) | Guard qua, `RateLimitGuard` đếm như cũ, tạo tài khoản, gửi OTP |
| LA1#2 | Lan đăng nhập web với token hợp lệ | Vào app như cũ |
| LA1#3 | Hà đăng nhập trên `admin.wordmet.com`; siteverify trả `hostname: admin.wordmet.com` | Qua, vì hostname nằm trong `TURNSTILE_ALLOWED_HOSTNAMES` |
| LA1#4 | Lan mở `www.wordmet.com/vi/app/login` và đăng nhập | Qua (`www.wordmet.com` nằm trong danh sách) |
| LA1#5 | Lan xin mã đặt lại mật khẩu, hoặc bấm "gửi lại mã" ở trang xác minh | 202 như cũ |
| LA1#6 | Lan gõ sai mật khẩu (401), sửa rồi bấm lại | Form đã `reset()` widget sau 401; lần bấm hai có token mới và API kiểm mật khẩu |
| LA1#7 | Smoke chạy với API `fake` | Smoke gửi `turnstile_token: 'smoke-token'` ở đăng ký, đăng nhập, xin mã; chạy như trước |
| LA1#8 | API hoặc worker khởi động thiếu `TURNSTILE_MODE` | Từ chối khởi động, báo `TURNSTILE_MODE` |
| LA1#9 | `TURNSTILE_MODE=real` thiếu secret hoặc danh sách hostname | Từ chối khởi động, báo tên biến |
| LA1#10 | `BILLING_PRODUCTION=true` cùng `TURNSTILE_MODE=fake` hoặc `off` | Từ chối khởi động, báo `BILLING_PRODUCTION` |
| LA1#11 | Một test HTTP gọi `GET /v1/health` | Có `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Cross-Origin-Resource-Policy: same-site`; không có `X-Powered-By` |
| LA1#12 | Build admin (`pnpm build`) | `dist/_headers` có và giống `public/_headers`; một unit test đọc `public/_headers`, ghim đúng một rule `/*` và chuỗi CSP ở §4.4 |
| LA1#13 | E2E mở `/vi` trên bản build OpenNext | Response có `X-Content-Type-Options: nosniff`, `Referrer-Policy` và `Permissions-Policy` như §4.4 |
| LA1#14 | E23 mở `/vi/app/login` với sitekey test, widget thật | 0 vi phạm CSP |
| LA1#15 | Build web với app bật, site URL `https://wordmet.com`, site key rỗng; hoặc `vite build` admin không có site key | Build fail, báo tên biến |

**Edge cases**

| # | Tình huống | Kết quả |
|---|---|---|
| LA1E1 | Bot gửi register không có `turnstile_token`, hoặc token là số, object, chuỗi dài hơn 2048 (`real` hoặc `fake`) | Guard trả 400 `validation-failed`; không gọi mạng, không đếm rate limit |
| LA1E2 | Bot gửi token giả | siteverify `success: false` → 400 `captcha-failed`; không gửi mail; luật của route không đếm |
| LA1E3 | Một IP gửi quá 60 token trong 60 s (`real`) | Từ lần 61: 429 `rate-limited`, không gọi Cloudflare |
| LA1E4 | Token hợp lệ nhưng `RateLimitGuard` của route trả 429 | Token đã bị tiêu; form `reset()` widget sau 429; Lan chờ `Retry-After` rồi bấm lại với token mới. `e2e-real/support/sign-in.ts` (chờ rồi bấm lại) chạy với API `fake`, và widget giả cấp token mới sau `reset()` |
| LA1E5 | Lan để form 6 phút | Widget tự lấy token mới (`refresh-expired: 'auto'`); trong lúc chưa có token, nút gửi tắt. Token hết hạn giữa đường → `captcha-failed`, widget `reset()`, Lan bấm lại |
| LA1E6 | Lan bấm gửi hai lần nhanh với cùng token | `useSubmitOnce` chặn lần hai ở web; nếu vẫn tới API thì lần hai `captcha-failed` (`timeout-or-duplicate`) |
| LA1E7 | Token qua nhưng `hostname` không có trong danh sách | 400 `captcha-failed`, log `turnstile_hostname_mismatch` |
| LA1E8 | siteverify trả `internal-error`, lỗi mạng, HTTP 5xx, hoặc quá 5 s | Thử lại một lần với cùng `idempotency_key`. Vẫn lỗi → register, otp: 503 `captcha-unavailable`, không gửi mail; login: cho qua, log `turnstile_bypassed` (DA12 vòng 2) |
| LA1E9 | siteverify báo `invalid-input-secret` (secret production đặt sai) | Như LA1E8, cộng log error `turnstile_misconfigured`; checklist kiểm log sau deploy |
| LA1E10 | Cloudflare lỗi đúng lúc bot dò mật khẩu | Login chỉ còn `auth.login.ip` và khóa sau 10 lần sai, như trước khi có Turnstile (§11) |
| LA1E11 | Bot thử 1.000 cặp email và mật khẩu bị lộ từ nhiều IP | Mỗi lần thử cần một token mới. Bot thuê dịch vụ giải CAPTCHA thì vẫn làm được, nhưng khó hơn và tốn tiền hơn nhiều; khóa tài khoản của Lan (10 lần sai) cần 10 token (§11) |
| LA1E12 | Token lấy ở form đăng nhập đem dùng cho `register` | Qua được, vì API không kiểm `action`. Chấp nhận: mỗi lần gửi vẫn cần một token mới |
| LA1E13 | Web bản mới (gửi `turnstile_token`) gọi API bản cũ | 400 `validation-failed` (schema strict); vì vậy deploy API trước |
| LA1E14 | Một client gửi `turnstile_token` ở `verify-email` | 400 (field lạ); web không gửi |
| LA1E15 | `client: 'mobile'` không có token (`real` hoặc `fake`) | 400 `validation-failed`, như web (Q-A3) |
| LA1E16 | API `off` nhận body có hoặc không có token | Cả hai qua; token bị bỏ qua |
| LA1E17 | API `fake` nhận `fake-turnstile-fail` | 400 `captcha-failed` (để test nhánh trượt) |
| LA1E18 | API `real` nhận `fake-turnstile-token` (một bản build thiếu site key) | siteverify `success: false` → 400; widget giả không mở được cửa |
| LA1E19 | Lan đã đăng nhập mở trang quên mật khẩu | Widget hiện; chấp nhận (B8-2) |

## 5. A2 — Đợt sửa sau review

Danh sách đủ ở code facts §C, §D. Chia ba nhóm.

**Nhóm 1, chỉ tài liệu (một PR, song song với M1):**
- R3: mục checklist "đặt `BILLING_PRODUCTION=true`; không đặt các biến `*_FAKE_ENABLED`; kiểm API từ chối khởi động khi bật một đồ giả".
- R4: các mục còn thiếu của `deploy-checklist.md` (AI và riêng tư; trước khi bán thật; đo tải; CSP; chạy hai worker nhắc học; dọn tài khoản chưa xác nhận
  đánh dấu xong; DB production tạo mới (B8-5); đo search và mở phiên AI). Mỗi sự thật pháp lý ghi một lần, không thêm phương án "chờ luật sư".
- R11: sửa dòng plan thành ✅ (đã merge).
- R12: các chỗ lệch trong `CLAUDE.md`, design cũ (ghi chú "đã thay bởi …", không viết lại), test flow còn `pnpm test:e2e`, handoff người học, `buoc-7.md`.
- Tài liệu lệch thêm: plan A7 nhắc D1 waitlist. (Mục Turnstile của `deploy-checklist.md` sửa ở M1, §4.5.)
- Các dòng "ghi nhận" của R14: UW-7 (lớp phiên chép từ admin), UA-7 (email trong URL bộ lọc admin), B8-8 (ghi chú design Bước 8).
- B5-6 (chốt sửa chữ, RA-16): design Bước 5 đổi "chính xác tuyệt đối" thành "chính xác lúc giữ chỗ; xác nhận muộn có thể vượt trần, tối đa bằng số lần xác
  nhận muộn". Không thêm kiểm trần vào `confirm`.
- Google đăng nhập thật: sửa `CLAUDE.md`, `buoc-8.md`, `deploy-checklist.md` sau khi có kết quả của chủ dự án (Q-A10).

**Nhóm 2, code nhỏ (một PR, mỗi mục là một commit; defect thì hai commit: test đỏ trước):**
- Gốc `package.json`: bỏ script `test:e2e` trỏ tới script không còn.
- B1-5: dọn `otp_failure_windows` cũ hơn 48 giờ và `mail_budget_buckets` của ngày cũ hơn 7 ngày bằng job dọn sẵn có.
- B3-5: `visibleSenseIds` chạy trong transaction, sau khóa người học; `deleteItem` gọi `lockItems` trước khi xóa.
- B5-5: mọi chỗ đặt `quotaAnchorAt = event.currentPeriodStart` (`subscription-machine.ts:88, 130, 248`) đổi thành `min(currentPeriodStart, occurredAt)`.
- B5-7: `refund` đòi có dòng `use` `confirmed` của đúng `(user, pool, operation_id)`, và `confirmed_at` của dòng đó nằm trong cycle hiện tại (RA-14, §6.5).
- B2-6 (chốt sửa code, RA-16): nhánh lỗi của `job-runner.service.ts` chỉ thử lại khi `lease.attempts` (bộ đếm DB, tăng ở `acquire`) còn dưới
  `config.pipeline.jobAttempts` (3); đủ thì `failed`, kể cả khi BullMQ còn lượt (reconciler thêm lại).
- UA-4: khai `AppConfig` của `use-intl` cho admin.
- UW-6: bỏ assert class bố cục trong ba file test web.
- B2-7: đổi nhãn `B2#66` trong `list-routes.spec.ts`.
- B2-8 (phần nợ): gộp `writeEntry` bị chép ở hai controller.
- A6 (admin): bỏ ký tự NUL khỏi ô tìm kiếm Người dùng trước khi đưa vào URL; đếm ngược theo `Retry-After` khi khóa tài khoản bị rate limit; ô ngày theo locale.
- B3-7 = B25-2 (Q-A9): lựa chọn "Từ chưa có nghĩa" ở trang Xuất của admin; `EXPORT_MAX_ROWS` mặc định 10.000, sửa đủ ba chỗ: `app-config.ts:226`
  (mặc định), `apps/api/.env.example:10` (đang đặt cứng 5000), `app-config.spec.ts:127` (đang ghim `5_000`) (RA-25).
- B8-4 (Q-A6): e2e mock web cho "Đặt mật khẩu" của tài khoản chỉ có Google.

**Nhóm 3, chạy tay và đo (ghi output vào `docs/deliveries/`):**
- R2: merge checklist dev (nhánh `docs/dev-test-checklist`), chạy một lượt, lưu output.
- R8: thử trên trình duyệt "Đặt mật khẩu" của tài khoản chỉ có Google, và thêm một e2e mock cho đúng luồng này (B8-4, Q-A6; phần code ở nhóm 2).
- R13: nối output smoke hồi quy; lượt trình duyệt Bước 8; mục "Thêm sau plan" cho test flow admin; as-built lần gọi AI thật 28/10 (cần dữ liệu của chủ dự án).
- B5-8: chứng minh test chạy đua có răng (bỏ khóa trên nhánh nháp, smoke phải đỏ).
- B2-5, B7-5: đo bằng `test:scale` (cần Docker).

**Đã chốt theo Q-A9:** B3-7 = B25-2 **làm trong đợt này** (nhóm 2). **Để sau:** B2-3 (Content chạy SQL trên bảng Pipeline, DB12), B4-4 (PX3, PX5, PX6, cần
migration và câu 27 còn treo), UA-6 (44 chỗ `getByTestId('detail-panel')`); ghi dòng theo dõi trong `IMPROVEMENT_PLAN`.

### 5.1 When → Then (các sửa lỗi; mỗi hàng là test đỏ trước khi sửa)

| # | Khi | Thì |
|---|---|---|
| LA2#1 | `refund` được gọi với `operation_id` chỉ có dòng `use` `released`, hoặc không có dòng nào, trong khi cycle còn lượt đã xác nhận (B5-7) | `refunded: false`, không ghi dòng `credit` (hiện trả `true`) |
| LA2#2 | `refund` được gọi cho thao tác có dòng `use` `confirmed` trước đầu cycle hiện tại (Pro: kỳ trước) | `refunded: false` |
| LA2#3 | Event `renewed` có `occurredAt` 10:00 hôm nay, `current_period_start` 10:00 mai (B5-5) | `quotaAnchorAt` = 10:00 hôm nay; lượt Lan dùng trong 24 giờ đó được đếm |
| LA2#4 | Thêm từ riêng X vào nhóm (`items.service`, `quick-add.service`) (B3-5) | `visibleSenseIds` được gọi với `tx`, sau khóa người học, trong cùng transaction |
| LA2#5 | Bỏ một mục khỏi việc học (`deleteItem`) (B3-5) | `lockItems(tx, userId, [itemId])` chạy trước `deleteItem` |
| LA2#6 | Job đã chạy 3 lượt theo `background_jobs.attempts` mà BullMQ còn lượt, vì reconciler thêm lại (B2-6) | Job thành `failed`, không chạy lượt 4 |
| LA2#7 | Job dọn chạy (B1-5) | Xóa `otp_failure_windows` cũ hơn 48 giờ và `mail_budget_buckets` của ngày cũ hơn 7 ngày; giữ dòng mới hơn |
| LA2#8 | Admin gõ ký tự NUL vào ô tìm kiếm Người dùng (A6) | Ký tự bị bỏ; URL và request không có NUL; không 400 |
| LA2#9 | Admin đăng nhập bị 429 khi khóa tài khoản do rate limit (A6) | Hiện đếm ngược theo `Retry-After` |
| LA2#10 | Admin mở trang Xuất, chọn "Từ chưa có nghĩa" (B3-7) | Gọi `entries/export?has_sense=false`; xuất đủ 7.799 dòng, không bị cắt |
| LA2#11 | Chạy `pnpm test:e2e` ở gốc repo | Script không còn (đã bỏ), thay vì gọi tới script không tồn tại |
| LA2#12 | e2e mock: tài khoản chỉ có Google → Cài đặt → Đặt mật khẩu (B8-4) | Form hiện, gửi mã, đặt được mật khẩu |

## 6. A3 — Lượt AI cho Free, tắt trial

### 6.1 Hành vi

- Lan (Free) mỗi tháng dương lịch theo giờ Việt Nam có **15 câu AI** và **5 lượt tra AI**. Tháng 11: từ 00:00 01/11 tới trước 00:00 01/12 giờ của Lan.
- Hết lượt thì như Pro hiện nay: mở phiên có kiểu AI bị từ chối `ai-quota-insufficient` kèm ngày có lượt mới; tra AI trả `quota-exhausted`.
- **Trần riêng mỗi ngày (DA19):** mọi người Free cộng lại dùng tối đa `free_ai_daily_cap` (mặc định 500) lượt AI mỗi ngày Việt Nam; trần chung
  `ai_daily_cap` vẫn đếm mọi gói (§6.4).
- Admin có thể tắt AI của riêng một người Free bằng limits grant `ai_*: 0` (đã có).
- Câu AI làm sẵn (`ai_prefetch_count`, mặc định 2) trừ lượt lúc ghi câu như hiện nay; câu chưa hỏi được dùng lại ở phiên sau.

### 6.2 Cycle tháng dương lịch

Hiện cycle AI là cửa sổ một tháng tính theo UTC từ một anchor (ngày bắt đầu Pro, trial hoặc limits grant). Free không có anchor, nên **nếu chỉ
đổi số thì Free dùng AI không giới hạn** (code facts F3). Thiết kế:

- Hàm thuần `calendarMonthCycle(zone, now)` → `[đầu tháng theo zone, đầu tháng sau theo zone)`, dựng từ `localDate` và `zonedMidnight` sẵn có (đã xử lý
  DST). Thêm phép cộng tháng trên chuỗi `YYYY-MM`.
- Một hàm duy nhất `aiCycle(resolved, zone, now, lastEnd)`:
  - có anchor → `cycleAt(anchor, now)` như cũ (Pro, trial, Free có limits grant có AI: Q-A8, B5E32);
  - không có anchor, gói Free, limit AI > 0 → `[max(đầu tháng, lastEnd ?? đầu tháng), đầu tháng sau)`, với `lastEnd` ở §6.3;
  - còn lại → `null`, như hiện nay. Gồm cả Pro không có anchor (subscription có `quotaAnchorAt` null): không âm thầm thành tháng dương lịch.
- **Cả bốn chỗ** đang tự tính cycle (snapshot, `standing` của reserve/confirm, `refund`, dashboard Pro) đổi sang gọi hàm này. Dashboard chỉ tính người Pro,
  nên truyền `lastEnd = null`.
- `UsageLedgerService` cần timezone: inject `IdentityService` (module đã import), đọc `getProfile(userId, tx)` trong cùng transaction; thiếu profile thì
  `'UTC'` như `checkQuota`.
- **Cần một migration (M3):** `subscriptions.ended_at` (§6.3) và `usage_records.plan` (§6.4). Đếm lượt vẫn theo thời điểm `[start, end)` trên
  `confirmed_at` và `credited_at`; không có period key.
- Snapshot trả `resets_at` = đầu tháng sau theo zone, nên web hiện dòng "Lượt câu AI mới vào 01/12".

### 6.3 Lúc nguồn Pro kết thúc (Q-A7, DA15 vòng 2)

**Vấn đề (RA-2):** `SourcesRepository.load` bỏ subscription `expired`/`revoked` và grant đã thu hồi hoặc đã hết hạn (`sources.repository.ts:38-46`;
`loadMany` cũng vậy). `Subscription` không có cột lúc kết thúc (`entitlements.prisma:53-81`); trạng thái do event hay job ghi không kèm thời điểm. Vì vậy
`resolve()` không bao giờ thấy nguồn đã kết thúc, và một field thêm vào `resolve()` sẽ luôn là `null` ở production dù unit test xanh.

**Đợt A sở hữu cơ chế này.** Design B cắm nguồn Pro của mình vào theo §6.3.4.

#### 6.3.1 Nguồn nào tính

Một **nguồn AI riêng** là nguồn từng cho Lan cycle AI riêng: subscription cho Pro hoặc trial (không tính trial bị từ chối, `trialDenied`), plan grant,
limits grant có `ai_*` > 0 (DA15 vòng 2), và loại nguồn Pro của design B. `lastEnd` = lúc kết thúc **muộn nhất** của các nguồn đó trong
`[đầu tháng theo zone, now]`; không có thì `null`.

#### 6.3.2 Mốc kết thúc của từng loại (hàm thuần `aiSourceEnds`)

| Loại nguồn | `endedAt` | Ghi chú |
|---|---|---|
| Subscription lưu `trialing`/`active`/`grace`, mà `effectiveStatus(now)` đã không còn cho Pro hay trial | Theo luật thời gian của `effectiveStatus` (`plan-rules.ts:50-67`). `trialing`/`active`: `end` = `trialEndsAt ?? currentPeriodEnd` (trial) hoặc `currentPeriodEnd`; hủy cuối kỳ → `end`; không hủy → `end + graceDays` (lúc thành `on_hold`). `grace`: `graceEndsAt ?? currentPeriodEnd + graceDays` | Không cần cột mới |
| Subscription lưu `on_hold`, `expired`, `revoked` | Cột mới `ended_at` (§6.3.3); `null` thì không tính | — |
| Subscription `trialing` có `trialDenied` | Không phải nguồn | D30 |
| Plan grant | `min(endsAt, revokedAt ?? endsAt)`, chỉ khi `startsAt` < mốc đó | Bị thu hồi trước khi bắt đầu thì không tính |
| Limits grant có `ai_practice_per_cycle` hoặc `ai_lookup_per_cycle` > 0 | Như plan grant | DA15 vòng 2 |
| Kỳ trả trước của design B (`prepaid_periods`) | Do design B định nghĩa (§6.3.4) | — |

`lastAiSourceEnd(ends, since, now)` = `endedAt` lớn nhất trong `[since, now]`, hoặc `null`.

#### 6.3.3 Cột `subscriptions.ended_at`

- Migration thêm `ended_at timestamptz NULL`: "lúc row thôi cho Pro hoặc trial". Không backfill: DB production tạo mới (B8-5), local không có dữ liệu thật
  (`ASSUMPTION`, chưa deploy).
- Hàm thuần `nextEndedAt(before, afterStatus, at, graceDays)`:
  - `afterStatus` ∈ {`trialing`, `active`, `grace`} → `null` (đang hoặc lại là Pro hay trial, kể cả kích hoạt lại).
  - `afterStatus` ∈ {`on_hold`, `expired`, `revoked`} và `before.status` ∈ {`trialing`, `active`, `grace`} → `min(at, mốc theo luật thời gian của before)`.
    Mốc theo luật thời gian ở tương lai (bị thu hồi giữa kỳ) thì lấy `at`.
  - Còn lại → giữ `before.endedAt` (vd `on_hold` → `expired`).
  - `at`: áp event → `occurredAt` của event; job và fetch → `now`.
- Bốn chỗ ghi `status` của `subscriptions` đều gọi hàm này: `event-applier.service.ts:183-186` (áp event), `:237` (hỏi lại provider sau khi thu hồi),
  `billing-jobs.service.ts:87` (`timeTransitions`), `:119` (`refetchRevoked`). Chỗ ghi `cancelAtPeriodEnd` khi xóa tài khoản
  (`account-deletion.provider.ts:75`) không đổi status nên không đụng. Máy trạng thái `subscription-machine.ts` giữ thuần, không biết cột này.
- `SubscriptionSource` thêm `endedAt` (map từ cột trong `toSubscription`), vì row `on_hold` vẫn nằm trong danh sách `subscriptions` mà loader đang trả.
- Cột không trỏ tới user, nên bản đồ xóa tài khoản (`account-data-map.ts`) không đổi.

#### 6.3.4 Loader và hợp đồng với design B

- `SourcesRepository.load(db, userId, now, endedSince?)` giữ hai query, chỉ mở rộng `where`:
  - subscription: thêm `OR (status IN ('expired', 'revoked') AND ended_at >= endedSince)`;
  - grant: thêm `OR revoked_at >= endedSince OR (revoked_at IS NULL AND ends_at >= endedSince AND ends_at <= now)`.
  Kết quả trả thêm một mảng `ended` riêng. `subscriptions` và `grants` giữ đúng như hiện nay, để `resolve()`, danh sách `sources` của snapshot và dashboard
  không đổi (snapshot đang đưa mọi grant có `startsAt <= now` vào `sources`). `loadMany` không đổi.
- Người gọi (snapshot, `standing`, `refund`) tính `endedSince = calendarMonthCycle(zone, now).start`, rồi
  `lastEnd = lastAiSourceEnd(aiSourceEnds({ subscriptions, grants, ended, graceDays, now }), endedSince, now)`.
- **Design B cắm vào đúng hai chỗ, không đổi `aiCycle` hay `lastAiSourceEnd`:**
  1. Loader trả thêm, trong `ended`, các kỳ trả trước (`prepaid_periods`) có mốc kết thúc trong `[endedSince, now]`: hết hạn, hoặc kết thúc sớm vì hoàn
     tiền hay thu hồi.
  2. `aiSourceEnds` có một nhánh `kind: 'prepaid_period'` trả `{ kind, id, endedAt }`, với `endedAt` là lúc kỳ đó thôi cho Pro.
  Kỳ đang hiệu lực đi qua `resolve()` như một nguồn Pro; việc đó và anchor của nó thuộc design B.
- PR nào merge sau thì nối hai phía: A vào trước thì B thêm nhánh của mình; B vào trước thì M3 thêm hai chỗ trên cho `prepaid_periods`.

### 6.4 Trần AI mỗi ngày của Free (DA19, RA-10)

- `ai_daily_cap` (mặc định 1000) đếm mọi lượt, không lọc theo gói (`usage.queries.ts:94-103`); chạm trần thì **mọi** người nhận `ai-unavailable`
  (`ledger-rules.ts:40-46`). Không có trần riêng thì khoảng 70 tài khoản Free dùng hết 15 câu trong một ngày là chạm trần, và người trả tiền (đợt B mở bán
  Pro) mất AI tới nửa đêm.
- Setting mới `entitlements.free_ai_daily_cap`, mặc định **500** (một nửa trần chung mặc định), bound 0–100000, không nhận `null`.
- Cột mới `usage_records.plan` (`text NULL`, CHECK `free | trial | pro`): `reserve` ghi `resolved.plan` vào dòng `use` mới (`standing` trả thêm `plan`).
  Dòng cũ và dòng `practice_sessions` để `null`. `capUsedFree(day, now)` = `capUsed` cộng điều kiện `plan = 'free'`. Ghi gói lúc giữ chỗ là cách đếm
  chính xác duy nhất: gói được suy bằng `resolve()` trong TypeScript, SQL không suy lại được.
- Trong `reserve`, dưới cùng khóa `lockAiDaily`: kiểm trần chung như cũ; rồi nếu Lan là Free thì kiểm `capUsedFree < free_ai_daily_cap`. Vượt →
  `ai-unavailable` kèm số giây tới nửa đêm Việt Nam. `free_ai_daily_cap = 0` → `ai-unavailable` không kèm số giây (như công tắc tắt).
- Snapshot: `ai_available.cap_reached` của người Free = chạm trần chung **hoặc** chạm trần Free. `AiSessionPlanner.gate` đã đọc cờ này, nên mở phiên có kiểu
  AI ra 503 như hiện nay.
- Xác nhận muộn không kiểm trần (B5-6, chốt sửa chữ): trần Free cũng có thể vượt, tối đa bằng số lần xác nhận muộn.
- Dashboard admin chỉ có tổng theo ngày, chưa có số của riêng Free. Không thêm trong đợt A (§11).

### 6.5 Refund

- B5-7 (M2): `refund` đòi dòng `use` `confirmed` của đúng `(user, pool, operation_id)`, có `confirmed_at` trong cycle hiện tại. Không có → `refunded: false`,
  không ghi `credit`. Giữ hai kiểm đang có: đã có `credit` thì trả `true`; `confirmed − credits` trong cycle phải > 0.
- M3: `refund` lấy cycle từ `aiCycle`, nên câu AI lỗi của Free hoàn được (hiện trả `refunded: false` vì thiếu anchor, code facts F9).
- Hệ quả (RA-14): câu dùng lúc còn Pro, xác nhận sau khi Lan về Free → `false`; câu tháng 11 xác nhận ngày 02/12 → `false`. Báo lỗi vẫn được ghi
  `refunded: false` như hiện nay (`reports.service.ts`, hàm `refund`). Với Pro, xem §7.

### 6.6 Settings

- Ba key mới trong nhóm `entitlements`: `free_ai_practice_per_cycle` (mặc định 15) và `free_ai_lookup_per_cycle` (mặc định 5), bound 0–5000 như Pro;
  `free_ai_daily_cap` (mặc định 500, bound 0–100000).
- **Không thêm ràng buộc chéo "Free ≤ Pro"** (RA-16): ràng buộc đó buộc admin đặt Free về 0 trước khi đặt AI của Pro về 0. Tắt AI cho mọi người đã có
  `ai_enabled` và `ai_daily_cap = 0`.
- Sửa đủ năm chỗ của `settings.definitions.ts`; `planNumbers()` đọc hai key lượt tháng (bỏ số 0 ghi cứng); `appConfigView` thêm số AI vào `plans.free`;
  kiểu web `AppConfig`.
- Admin: thêm ba ô vào `SETTINGS_LAYOUT.entitlements` (ô trần Free đặt cạnh `ai_daily_cap`), nhãn vi/en, gợi ý `zeroMeaning` theo mẫu `vi.json:1996-2012`
  của admin: "0 = gói Miễn phí không có câu AI", "0 = gói Miễn phí không tra AI được", "0 = người dùng gói Miễn phí không dùng được AI". Hai ô lượt tháng có
  thêm `notes`: "Landing ghi 15 và 5; đổi số ở đây thì sửa chữ landing". Sửa nhãn đang ghi "gói Pro và Dùng thử" (§6.9).
- Test ghim đổi theo: API `settings.definitions.spec.ts` (danh sách, thứ tự, biên; test "chỉ hai key được `null`" giữ nguyên vì key mới không nhận `null`),
  `app-config.view.spec.ts`; admin `settings-api.test.ts` từ 49 lên **52 key**, tab `entitlements` từ 16 lên 19 (nếu A merge trước B, §12); fixture e2e mock
  `apps/admin/e2e/support/settings.ts`.

### 6.7 Web

- Trang gói: dòng AI của thẻ Free đổi từ "cần gói Pro" thành "{n} câu AI và {m} lượt tra AI mỗi tháng" (`included: true`); ô AI của Free trong
  bảng so sánh thôi ghi cứng `'—'`.
- Công tắc "Kiểu câu có AI": khi được dùng thì bỏ chip "Pro" (hiện chip vẫn hiện).
- **Hết lượt: không thêm trạng thái mới, chỉ dùng đúng cái đã có** (RA-19). Web đã có hộp `quota` kèm ngày có lượt mới (`CustomizeDialog.tsx:308-334`,
  `AiLookupPanel.tsx:63-66`); nó hiện đúng cho Free nhờ `resets_at`. Dòng khóa `lockedLine` ("Dành cho gói Pro. Gói Pro chưa mở bán.", `vi.json:341`) chỉ hiện
  khi limit = 0 (`AiTypesToggle.tsx:88`, `locked={!allowed}`). **Chữ của dòng khóa này do design B sửa** (lúc Pro mở bán); đợt A không đụng.
- Tra AI: chip "Dùng thử" bỏ; dòng "còn N lượt tra AI" tự hiện vì `limit > 0`.
- Cài đặt → Mức sử dụng: tự hiện `còn X/Y` và ngày có lượt mới (đã chạy theo dữ liệu).
- **Landing (RA-20):** `Plans.tsx:34-42` dựng `{ label, free: boolean }`, mỗi ô là dấu có/không (`Mark`). Đổi kiểu thành `free: boolean | string`; chuỗi
  hiện thành chữ trong ô Free. Hai dòng AI (`proP2`, `proP3`) của Free ghi "15/tháng" và "5/tháng" (en "15/month", "5/month"), đủ ngắn cho cột giá trị trên
  điện thoại (PR #208). Bỏ câu trial (`Landing.plans.trial`) cùng dòng chứa nó dưới bảng; FAQ `a2` sửa theo.
  - Lời hứa có thứ fail: `sections.test.tsx` ghim nguyên văn hai ô; `settings.definitions.spec.ts` ghim mặc định 15 và 5; hai test mang cùng mã `LA3#16`
    và trỏ sang nhau. Admin đổi setting lúc chạy thì landing lệch tới khi sửa chữ: ghi chú ở ô setting (§6.6), rủi ro ở §11.

### 6.8 Admin

- Chưa có màn nào cho staff xem lượt AI của một học viên (API `GET /v1/admin/entitlements/users/:id` có sẵn, chưa ai gọi). Không thêm trong đợt này.
- Thẻ dashboard "Người dùng gói Pro" chỉ tính Pro; tổng theo ngày đã gồm Free. Không đổi.

### 6.9 Tắt trial

Trial chỉ bắt đầu từ sự kiện của một nhà cung cấp tự gia hạn (`subscription_started` có `trial_ends_at`). Adapter duy nhất hiện nay là bản giả, và
VietQR (đợt B) không có trial. Cách nhỏ nhất:
- Không gỡ code trial (để khi có cổng tự gia hạn còn dùng được). Không thêm setting bật/tắt trial lúc này.
- `trial_eligible` trong snapshot trả `false`.
- Bỏ mọi chữ hứa trial ở web và landing (§6.7); nhãn admin bỏ chữ "Dùng thử" ở các key dùng chung.
- **Script đổi theo (RA-9):**
  - `smoke-buoc-8` bước B8E28 (`:585-601`): thay `view.trial_eligible === true` bằng kiểm `trial_history` của tài khoản mới đăng ký lại bằng SQL (`psql`,
    bước này đã dùng ở `:590-592`): 0 dòng.
  - `learner-test-setup --plan trial` (`:346-362`): bỏ điều kiện `trial_eligible` (nay luôn `false`, nên script lặng lẽ không làm gì và in lý do sai). Gửi
    event, rồi nếu gói không thành `trial` thì in "trial bị từ chối: tài khoản đã dùng trial (D30)".
  - `smoke-buoc-5` (`:239-240`): người mới có `trial_eligible === false`.
  - Các bước khác dựng trial bằng provider giả (`smoke-buoc-5`, `smoke-buoc-8`) giữ nguyên, vì chúng kiểm logic còn trong code.
- Test đổi: `entitlements.service.spec.ts:74-94` (đang ghim `trial_eligible`).

### 6.10 Bản nháp pháp lý (RA-11)

Bản nháp ở nhánh `docs/web-launch-research` (`docs/preparation/legal-drafts/`). Đợt A làm các câu sau sai, nên M3 có một commit tài liệu sửa chúng:
- Chính sách bảo mật mục 3 (dòng 101): bỏ email "nhắc sắp hết thời gian dùng thử".
- Chính sách bảo mật mục 4 (dòng 110): "Tính năng AI chỉ có ở gói Dùng thử và Pro" → AI có ở gói Miễn phí (lượt giới hạn mỗi tháng) và Pro. Dòng 119: bỏ "hoặc
  sử dụng gói Miễn phí" ở cách không dùng AI (Free nay có AI; cách từ chối vẫn là tắt công tắc và không bấm tra AI, DA5).
- Điều khoản mục 4 (dòng 107–108): bỏ "Gói Dùng thử"; gói Miễn phí có câu AI và tra AI giới hạn. Mục 9 (dòng 149): "Ở gói Dùng thử và Pro" → gồm cả Miễn phí.
- Điều khoản mục 5 "Dùng thử" nằm trong mục 5–8 mà đợt B viết lại (§1).

Không ghi con số vào văn bản pháp lý: Điều khoản mục 4 đã trỏ sang trang Gói học. Cloudflare đã có trong danh sách bên nhận dữ liệu (Chính sách mục 5, "chống
tấn công"), nên Turnstile không thêm bên mới. Mỗi sự thật pháp lý ghi một lần.

### 6.11 When → Then (lượt AI của Free)

**Acceptance criteria**

| # | Khi | Thì |
|---|---|---|
| LA3#1 | Lan (Free) mở phiên 10 câu có kiểu AI ngày 05/11, chưa dùng lượt nào | Planner cần ≤ 10 lượt, còn 15 → mở phiên; lượt trừ lúc ghi câu |
| LA3#2 | Lan đã dùng 15 câu AI trong tháng 11, mở phiên có kiểu AI ngày 20/11 | 403 `ai-quota-insufficient`, `resets_at` = 00:00 01/12 giờ Việt Nam |
| LA3#3 | 23:59 30/11 giờ của Lan, còn 0 lượt; tới 00:00 01/12 | Có lại 15 lượt (cửa sổ mới, không cần job) |
| LA3#4 | Lan tra AI lần thứ 6 trong tháng | 403 `quota-exhausted` kèm `resets_at` |
| LA3#5 | Một câu AI Lan dùng lúc Free trong tháng này bị báo lỗi, admin xác nhận | `refunded: true`; Lan có lại 1 lượt |
| LA3#6 | Lan (Pro) dùng 200 câu AI, Pro hủy cuối kỳ hết hạn 20/11 10:00 | Cửa sổ Free tháng 11 = 20/11 10:00 → 01/12; Lan có đủ 15 câu (Q-A7) |
| LA3#7 | Admin thu hồi plan grant Pro của Lan lúc 12/11 09:00 | Cửa sổ Free từ 12/11 09:00 |
| LA3#8 | Lan (Free) được cấp limits grant 50 câu AI từ 10/11 | Chu kỳ theo grant: 10/11 → 10/12, 50 câu (Q-A8) |
| LA3#9 | Limits grant đó hết hạn 20/11 | Từ 20/11 Lan có cửa sổ Free 20/11 → 01/12 với 15 câu; lượt thời grant không tính (DA15 vòng 2) |
| LA3#10 | Người Free cộng lại đã dùng 500 lượt AI trong ngày Việt Nam | Người Free kế tiếp nhận `ai-unavailable` kèm số giây tới nửa đêm Việt Nam; Pro vẫn dùng được tới `ai_daily_cap` (DA19) |
| LA3#11 | Admin đặt `free_ai_practice_per_cycle = 0` | Free về như trước: `plan-required`, web hiện dòng khóa |
| LA3#12 | Lan có limits grant `ai_practice_per_cycle: 0` | Limit 0 → `plan-required` như hiện nay |
| LA3#13 | Một người mới xác minh email xem `GET /v1/me/entitlements` | `trial_eligible: false`; pool AI 15 và 5; `resets_at` = đầu tháng sau theo zone |
| LA3#14 | Admin mở `GET /v1/admin/settings`, rồi `PUT` `free_ai_practice_per_cycle = 5001` | Có ba key mới với mặc định 15, 5, 500; `PUT` trả 400 |
| LA3#15 | Trần chung `ai_daily_cap` đã chạm | Lan nhận `ai-unavailable` như mọi gói |
| LA3#16 | Landing `/vi` hiện bảng gói | Ô Free của hai dòng AI ghi "15/tháng" và "5/tháng", khớp mặc định của setting |

**Edge cases**

| # | Tình huống | Kết quả |
|---|---|---|
| LA3E1 | Lượt giữ chỗ lúc 23:59:30 ngày 30/11, confirm lúc 00:00:10 ngày 01/12 | Tính vào tháng 12 (`confirmed_at` = lúc confirm); tháng 11 coi như không mất lượt đó. Trần ngày tính vào ngày Việt Nam lúc giữ chỗ (`system_date`) |
| LA3E2 | Lượt đang giữ chỗ (`reserved`, < 2 phút) lúc sang tháng | Vẫn được cộng vào `used` tới khi confirm hoặc hết hạn (như hiện nay) |
| LA3E3 | Lan đổi timezone sát cuối tháng (VN → `Pacific/Kiritimati` → VN) | Cửa sổ dịch theo zone; Lan có thể được thêm tới **một lượt Free đầy đủ** (15 + 5). Chấp nhận |
| LA3E4 | Lan đổi timezone giữa tháng (VN → `Europe/London`) | Cửa sổ dịch tới khoảng một ngày; chấp nhận |
| LA3E5 | Free → Pro một ngày (editor cấp, D6–D8) → Free trong cùng tháng | Cửa sổ Free bắt đầu lại sau lúc Pro kết thúc, nên có lại 15 lượt. Chấp nhận: editor vốn đã cấp được Pro (300 câu) |
| LA3E6 | Pro không có anchor (subscription có `quotaAnchorAt` null) | `aiCycle` trả `null` như hiện nay; không thành tháng dương lịch |
| LA3E7 | Câu AI dùng lúc còn Pro, bị báo lỗi, admin xác nhận sau khi Lan về Free | `refunded: false` (dòng `use` trước đầu cửa sổ Free); không cộng lượt Free |
| LA3E8 | Câu AI tháng 11 bị báo lỗi, admin xác nhận ngày 02/12 | `refunded: false` (dòng `use` ngoài cửa sổ tháng 12) |
| LA3E9 | Subscription hủy cuối kỳ, kỳ hết 20/11 10:00; job `timeTransitions` ghi `expired` lúc 10:07 | `ended_at` = 20/11 10:00 (mốc theo luật thời gian, không phải lúc job chạy) |
| LA3E10 | Event `revoked` (hoàn tiền) có `occurredAt` 15/11, kỳ còn tới 30/11 | `ended_at` = 15/11 (`occurredAt`) |
| LA3E11 | Event `expired` tới ngày 02/12 cho kỳ hủy cuối kỳ đã hết 30/11 | `ended_at` = 30/11 |
| LA3E12 | Subscription quá hạn, không hủy, không có event | Thôi là Pro ở `currentPeriodEnd + graceDays` (lúc thành `on_hold`); đó là mốc |
| LA3E13 | Subscription `on_hold` rồi `expired` | `ended_at` giữ lúc thành `on_hold` |
| LA3E14 | Subscription `expired` được kích hoạt lại (`renewed`) | `ended_at` về `null`; Lan là Pro, cycle theo anchor mới |
| LA3E15 | Trial bị từ chối (`trialDenied`) rồi kết thúc | Không phải nguồn; cửa sổ Free từ đầu tháng |
| LA3E16 | Plan grant bị thu hồi trước `startsAt` | Không phải nguồn |
| LA3E17 | Hai nguồn kết thúc trong tháng (grant 10/11, subscription 20/11) | `lastEnd` = 20/11 |
| LA3E18 | Nguồn Pro kết thúc 25/10 | Không trong tháng 11; cửa sổ Free từ 01/11 |
| LA3E19 | Lan có một grant đã hết hạn trong tháng | Danh sách `sources` của snapshot không có grant đó (nguồn đã kết thúc nằm trong mảng `ended` riêng) |
| LA3E20 | `free_ai_daily_cap = 0` | Mọi người Free nhận `ai-unavailable`, không kèm số giây |
| LA3E21 | Lượt giữ chỗ lúc Lan là Free, confirm sau khi Lan lên Pro | Dòng vẫn mang `plan = 'free'` và tính vào trần Free của ngày đó |
| LA3E22 | Xác nhận muộn khi trần Free đã đầy | Vẫn xác nhận (B5-6): trần Free có thể vượt bằng số lần xác nhận muộn |
| LA3E23 | Câu AI làm sẵn (`ai_prefetch_count` = 2) | Trừ lượt lúc ghi câu; câu chưa hỏi dùng lại ở phiên sau |

## 7. Chỗ đổi luật cũ

- Luật Bước 5 "Free AI luôn bằng 0" (comment `plan-rules.ts:7-8`, `plan-numbers.ts:7`) đổi thành số theo setting.
- Cycle Bước 5 (D13: theo UTC từ anchor) giữ nguyên cho Pro và trial; Free có cycle riêng theo tháng dương lịch, bắt đầu sau nguồn AI riêng gần nhất.
- Trần AI: Bước 5 chỉ có một trần chung; nay thêm trần riêng cho Free dưới trần chung (DA19).
- Refund (B5-7): đòi dòng `use` trong cycle hiện tại. Với Pro, câu của kỳ trước được xác nhận sau khi gia hạn **không** hoàn nữa (hiện được hoàn vào kỳ mới nếu
  kỳ mới đã có lượt dùng).
- Anchor (B5-5): `min(currentPeriodStart, occurredAt)` thay cho `currentPeriodStart`.
- Design Bước 5 "trần chính xác tuyệt đối" sửa chữ (B5-6).
- Hứa trial của landing, trang gói và bản nháp pháp lý bỏ.

## 8. Kiểm thử

- **API unit:**
  - Turnstile: `TurnstileGuard` (ba chế độ; token sai hình dạng; `auth.captcha.ip`; siteverify qua, trượt, `timeout-or-duplicate`, sai hostname, `www`, host
    admin; timeout và `internal-error` thử lại một lần với cùng `idempotency_key`; `invalid-input-secret`; register và otp ra 503 còn login cho qua khi
    Cloudflare không trả lời; không có token hay secret trong log); một test HTTP cho thấy token sai thì `RateLimiter.hit` không được gọi (thứ tự guard);
    config (`TURNSTILE_MODE` không có mặc định, `real` cần secret và hostname, chặn ở production); header của API (một test HTTP gọi `/v1/health`, LA1#11).
  - Lượt AI: `calendarMonthCycle` (đầu và cuối tháng, tháng 2, năm nhuận, timezone âm và dương, ngày đổi DST); `aiCycle` (đủ các nguồn anchor, Free có
    `lastEnd`, Pro không anchor); `aiSourceEnds` (mỗi hàng của §6.3.2) và `lastAiSourceEnd`; `nextEndedAt` (LA3E9–LA3E14) và bốn chỗ ghi; loader tách
    `ended` (LA3E19); `standing`, `refund`, snapshot với Free có limit; trần Free (`decideCap` cho Free, LA3#10, LA3E20, LA3E21).
  - Sửa lỗi M2: mỗi hàng §5.1, test đỏ trước.
  - Test đang có phải đổi: code facts free-ai §9; `entitlements.service.spec.ts:74-94` (`trial_eligible`); settings specs (§6.6).
- **Web:** `TurnstileWidget` (đường giả khi site key rỗng; render tường minh với script giả; `reset()` sau mỗi response; hết hạn thì tắt nút gửi);
  `RegisterForm`, `LoginForm`, `ForgotPasswordForm` và nút gửi lại của `VerifyEmailForm` gửi token và làm mới widget (`auth.test.tsx`); hai slug lỗi
  (`problem.test.ts`); `csp.test.ts`; hàm security header; trang gói, công tắc AI, tra AI với fixture Free có lượt; bảng landing (`sections.test.tsx`, LA3#16);
  Mức sử dụng.
- **Admin:** `LoginPage.test.tsx` và `ForgotPasswordPage.test.tsx` (gửi token, làm mới widget); hai slug lỗi (`problem.test.ts`); settings 52 key; test đọc
  `public/_headers` (LA1#12); guard site key của build.
- **E2E:** web: `mockApi()` trả script Turnstile giả; E23 mở `/vi/app/login` với widget thật (LA1#14) và kiểm header ở `/vi` (LA1#13); e2e B8-4 (LA2#12).
  Admin: e2e mock và `admin-e2e-real` chạy với widget giả (site key rỗng) và API `fake`.
- **Smoke:** mọi smoke gửi `turnstile_token` với API `fake` (§4.2). Thêm hoặc đổi:
  - `smoke-buoc-5`: người mới có pool AI 15/5, `trial_eligible` false; **Pro → Free giữa tháng** trên API thật theo hai cách: thu hồi plan grant, và event
    `expired` của billing giả cho một subscription hủy cuối kỳ; cả hai lần, lượt dùng lúc Pro (qua `pnpm entitlements:fake-ai`) không tính vào lượt Free
    (RA-2); trần Free (đặt `free_ai_daily_cap` nhỏ rồi chạm).
  - `smoke-buoc-7`: Free dùng được AI tới hết lượt (thay cho bước đang đòi 403 ở `:879-885`).
  - `smoke-buoc-8`: B8E28 kiểm `trial_history` bằng SQL (§6.9).
- **Checklist dev:** thêm mục Free hết lượt, sang tháng (bằng SQL ở §9), refund, Pro → Free; Turnstile ở chế độ `real` với khóa test của Cloudflare.

## 9. Xong khi

- CI xanh trên mọi PR.
- **Mọi smoke có đổi chạy qua ít nhất một lần trên DB mới** (tám smoke ở §4.2), cộng một lần `learner-test-setup` (gồm `--plan trial`), với API
  `TURNSTILE_MODE=fake`; output lưu vào `docs/deliveries/chuan-bi-launch-a-smoke-output.txt`.
- **Chạy tay Turnstile ở `real` với khóa test:** API `TURNSTILE_MODE=real`, secret `1x0000000000000000000000000000000AA`, sitekey
  `1x00000000000000000000AA` cho web và admin, `TURNSTILE_ALLOWED_HOSTNAMES` = hostname mà siteverify trả ở máy local (`ASSUMPTION`: `localhost`, theo mẫu
  response ở trang Testing của Cloudflare; ghi lại giá trị thật):
  - web: đăng ký, đăng nhập, quên mật khẩu, gửi lại mã; sai mật khẩu rồi bấm lại (LA1#6);
  - admin: đăng nhập, quên mật khẩu;
  - đổi secret sang `2x0000000000000000000000000000000AA` (luôn trượt): cả hai app hiện câu `captcha-failed`.
- **Header:** `curl -I http://localhost:3000/v1/health` trên API local; `pnpm build` của admin rồi kiểm `dist/_headers`; header của web kiểm bằng E23 trong CI.
  Header thật của admin và web kiểm sau deploy (§4.5).
- **Lượt AI chạy tay:** một học viên Free dùng hết 15 câu AI và bị chặn với `resets_at` = đầu tháng sau; rồi "sang tháng" bằng cách lùi dữ liệu, không đổi
  giờ máy (API dùng `SystemClock`, đổi giờ Windows làm lệch Docker, JWT và cookie):

  ```
  docker compose -p english-learning exec -T postgres psql -U dev -d english_learning -c "UPDATE usage_records SET confirmed_at = confirmed_at - interval '1 month' WHERE user_id = '<id của Lan>' AND pool IN ('ai_practice', 'ai_lookup') AND kind = 'use' AND status = 'confirmed'"
  ```

  Sau câu này Lan có lại 15 câu. Thêm một lượt Pro → Free giữa tháng: cấp Pro cho Lan, dùng vài câu AI, thu hồi grant; Lan có đủ 15 câu Free.
- `IMPROVEMENT_PLAN` cập nhật trạng thái R2–R4, R8, R11–R14.

## 10. Câu hỏi đã chốt

Chủ dự án (04/11/2026): "theo rec của bạn", tức chọn theo đề xuất của Claude cho cả mười câu. Lý do và các phương án: decision record.

| # | Câu hỏi | Chốt |
|---|---|---|
| Q-A1 | Chặn Turnstile ở đăng nhập? | **Có**, ở đăng nhập của web và admin (vòng 2, chủ dự án 04/11): chặn bot dò mật khẩu và bot cố tình khóa tài khoản. Vòng 1 chọn "không" vì chỉ xét việc gửi mail |
| Q-A2 | Quên mật khẩu của admin có widget không? | **Có**, như web; API không phân biệt host |
| Q-A3 | Client `mobile` không có token? | **Token bắt buộc như web**; app Flutter có design riêng khi làm |
| Q-A4 | Không gọi được Cloudflare? | Vòng 1: **từ chối** (503). **Vòng 2** (RA-6, DA12): `register` và `otp` vẫn từ chối; `login` cho qua, log cảnh báo |
| Q-A5 | Ảnh trong bản xem trước Markdown của admin? | **Chỉ ảnh của chính site** (`img-src 'self' data: blob:`) |
| Q-A6 | e2e mock cho "Đặt mật khẩu" của tài khoản chỉ có Google? | **Có**, cộng một lượt thử tay |
| Q-A7 | Pro về Free giữa tháng: lượt lúc Pro có tính vào lượt Free? | **Không.** Cửa sổ Free bắt đầu từ `max(đầu tháng, lúc kết thúc nguồn Pro/trial)`. **Vòng 2** (RA-14, DA15): limits grant có AI hết hạn giữa tháng cũng tính là nguồn kết thúc |
| Q-A8 | Free có limits grant có AI: chu kỳ theo grant hay tháng dương lịch? | **Theo grant** như hiện nay (B5E32) |
| Q-A9 | B2-3, B3-7, B4-4, UA-6? | **B3-7 làm** (thêm lựa chọn xuất, `EXPORT_MAX_ROWS` 10.000); **B2-3, B4-4, UA-6 để sau** |
| Q-A10 | Kết quả thử Google thật? | Cần dữ liệu của chủ dự án; tới lúc có, tài liệu ghi "chủ dự án báo đã thử, chưa có ghi chép" thay cho "chưa thử" |

**Quyết định thêm khi sửa theo review** (chủ dự án: "sửa theo review", 04/11/2026; cần chủ dự án đọc lại):

| Finding | Quyết định | Chốt |
|---|---|---|
| RA-6 | DA12 vòng 2 | Login cho qua khi Cloudflare không trả lời; register và otp vẫn từ chối. Review không đề xuất; Claude chọn phương án an toàn và đơn giản nhất |
| RA-10 | DA19 | Trần riêng cho Free mỗi ngày `free_ai_daily_cap`, mặc định 500 (theo đề xuất của review khi muốn bảo vệ Pro; Pro mở bán ở đợt B) |
| RA-14 ⚑ | DA15 vòng 2 | Limits grant có AI hết hạn giữa tháng cũng mở cửa sổ Free mới. Review không đề xuất; Claude chọn |

Không còn câu nào mở cho chủ dự án ngoài việc đọc lại ba quyết định này và các đề xuất kỹ thuật thêm ở decision record.

## 11. Rủi ro và chỗ chưa kiểm

- `ASSUMPTION`: `_headers` áp cho trang fallback SPA của admin; Vite copy `public/` vào `dist/`.
- `ASSUMPTION`: HSTS do Cloudflare đặt chỉ đúng khi API đứng sau proxy Cloudflare; header trong `next.config.ts` có thể không áp cho file tĩnh của Workers
  Static Assets. Cả hai kiểm sau deploy (§4.5).
- `ASSUMPTION`: siteverify với secret test trả `hostname: localhost` ở máy local (tài liệu chỉ đưa ví dụ). Kiểm ở lượt chạy tay `real` (§9).
- Turnstile ở chế độ `real` chỉ kiểm được khi có mạng tới Cloudflare; CI chạy `fake`. E23 tải widget thật từ Cloudflare trong CI: có thể chậm hoặc chập chờn
  khi Cloudflare chậm.
- Lúc Cloudflare lỗi (DA12 vòng 2): đăng nhập chỉ còn rate limit theo IP và khóa sau 10 lần sai; người mới không đăng ký và không xin mã được tới khi
  Cloudflare hồi; không có công tắc khẩn cấp.
- Bot thuê dịch vụ giải CAPTCHA vẫn qua được Turnstile, chỉ tốn tiền hơn (LA1E11).
- Đổi cycle chạm phần tính lượt cốt lõi; bốn chỗ tính cycle phải dùng chung `aiCycle`, nếu không snapshot và reserve có thể báo khác nhau.
- `ended_at` phải được ghi ở cả bốn chỗ ghi `status`. Một chỗ ghi mới sau này mà quên `nextEndedAt` thì `ended_at` là `null`, và lượt dùng lúc Pro lại bị
  tính vào Free (sai về phía chặt, không cho thêm lượt).
- `free_ai_daily_cap` = 500 là số ước; admin chỉnh trong Cài đặt. Dashboard chưa có số lượt của riêng Free trong ngày.
- Landing ghi cứng 15 và 5; admin đổi setting lúc chạy thì landing lệch tới khi sửa chữ (có ghi chú ở ô setting).
- `helmet` thêm một dependency mới cho API; cấu hình mặc định của nó có header hợp với trang HTML hơn API, nên phải cấu hình lại (§4.4).
- Học viên đổi timezone làm cửa sổ tháng dịch, có thể được thêm tới một lượt Free (LA3E3, LA3E4).
- Phụ thuộc với design B (§12).

## 12. Phụ thuộc với design B

Design A không đọc design B khi sửa; các điểm dưới theo review RA-24 và theo hợp đồng ở §6.3.4.
- **CSP của `/app`:** theo review, design B đưa CSP của `/app` sang `proxy.ts` với `nonce` và `'strict-dynamic'`. CSP mới phải giữ `frame-src
  https://challenges.cloudflare.com`; với `'strict-dynamic'`, script Turnstile phải do một script có `nonce` chèn vào (`TurnstileWidget` chèn thẻ `<script>`
  bằng JS). PR merge sau kiểm lại E23.
- **Số key settings:** A thêm ba key (49 → 52); theo review, B thêm ba setting giá. PR merge sau sửa `settings-api.test.ts` và `settings.definitions.spec.ts`.
- **Nguồn Pro của B (`prepaid_periods`):** cắm vào loader và `aiSourceEnds` theo §6.3.4.
- **Chữ dòng khóa** `lockedLine` ("Dành cho gói Pro. Gói Pro chưa mở bán."): design B sửa (§6.7).
- **Điều khoản mục 5–8** (gồm mục 5 "Dùng thử"): design B viết lại (§6.10).

## 13. Thay đổi sau review

- RA-1 → §4.2: một widget, `TURNSTILE_ALLOWED_HOSTNAMES` là danh sách (apex, `www`, `admin.`); LA1#3, LA1#4, LA1E7.
- RA-2 → §6.3 mới: loader trả mảng `ended`, hàm thuần `aiSourceEnds`/`lastAiSourceEnd`, cột `subscriptions.ended_at` có migration, luật cho từng kiểu kết thúc,
  bốn chỗ ghi; câu "không cần migration" sửa (§6.2); LA3E9–LA3E19; smoke Pro → Free (§8, §9).
- RA-3 → §4.2: decorator `@Turnstile` một `UseGuards` hai guard; token `optional()` trong schema, guard kiểm hình dạng; `loginSchema` dùng `.extend`;
  `testConfig` để `off`; LA1E1.
- RA-4 → §4.2: phương án (a), luật `auth.captcha.ip` 60/60 s chỉ ở `real`; LA1E3, LA1E4; trade-off ở decision record.
- RA-5 → §4.3: `reset()` sau mọi response, `refresh-expired: 'auto'`, các callback tắt nút gửi; LA1#6, LA1E4, LA1E5.
- RA-6 → DA12 vòng 2: login cho qua khi Cloudflare lỗi, register và otp từ chối (§4.2, LA1E8, LA1E10, §11).
- RA-7 → §4.3: widget giả khi site key rỗng; build production fail khi thiếu site key; E23 dùng widget thật với sitekey test, e2e khác dùng script giả.
- RA-8 → §4.2, §4.3: `TURNSTILE_MODE` không có mặc định; secret dùng `nonEmpty`; danh sách nơi đặt biến của API, client và smoke; LA1#8–LA1#10.
- RA-9 → §6.9: sửa B8E28 của `smoke-buoc-8`, `learner-test-setup --plan trial`, `smoke-buoc-5`; thêm `entitlements.service.spec.ts`.
- RA-10 → DA19, §6.4: trần `free_ai_daily_cap` (500), cột `usage_records.plan`; LA3#10, LA3E20–LA3E22; §11.
- RA-11 → §6.10: sửa Chính sách mục 3, 4 và Điều khoản mục 4, 9 trong M3; mục 5 theo đợt B.
- RA-12 → §2, §3, §8, §9 bỏ chữ của vòng 1; mục Turnstile của checklist sửa ở M1 (§4.5); test `LoginPage`, `ForgotPasswordPage` của admin (§8).
- RA-13 → §9: kiểm `dist/_headers` và unit test thay cho `curl` admin local; chạy lại mọi smoke có đổi và `learner-test-setup`; câu SQL thay cho đổi giờ máy;
  thêm Pro → Free và đăng nhập web, admin ở `real`.
- RA-14 → §6.11 thêm các hàng LA3E1, LA3E3, LA3E5–LA3E8; LA1E8 (thử lại siteverify), LA1E12 (`action`), LA1E13 (thứ tự deploy); hàng ⚑ chốt ở DA15 vòng 2;
  refund trong cycle hiện tại (§6.5).
- RA-15 → §4.6, §5.1, §6.11: mã `LA1#`/`LA1E`, `LA2#`, `LA3#`/`LA3E`, tách acceptance và edge case; hàng cho header (LA1#11–LA1#13), sửa lỗi (§5.1),
  settings (LA3#14).
- RA-16 → B2-6 chốt sửa code; B5-6 chốt sửa chữ design; CSP admin chốt `'unsafe-inline'`, bỏ hai `ASSUMPTION` về hash và CSSOM; không thêm "Free ≤ Pro" (§5,
  §4.4, §6.6, §11).
- RA-17 → §4.4: một chuỗi CSP cuối cùng, một `script-src`; một rule `/*`.
- RA-18 → §4.3: hai slug ở cả web và admin, câu vi/en.
- RA-19 → §6.7: hết lượt dùng hộp `quota` sẵn có, không thêm trạng thái; chữ dòng khóa thuộc design B.
- RA-20 → §6.7: ô landing `free: boolean | string`, chữ ngắn cho điện thoại, test ghim (LA3#16).
- RA-21 → LA1E11 đổi chữ ("khó hơn và tốn tiền hơn nhiều"); rủi ro ở §11.
- RA-22 → §4.4, §11: hai `ASSUMPTION` (HSTS, file tĩnh của web) và mục checklist (§4.5).
- RA-23 → §4.5: các mục checklist cho Turnstile; sửa `deploy-checklist.md:83-86`, đánh dấu `:49-53`.
- RA-24 → §12: phụ thuộc CSP, số key settings, nguồn Pro, chữ dòng khóa, Điều khoản.
- RA-25 → §5 nhóm 2: `EXPORT_MAX_ROWS` sửa đủ ba chỗ.
- RA-26 → §3: M3 sau M1 và sau PR code của M2.
- RA-27 → §4.2: timeout 5 s, không log token và secret, secret dùng `nonEmpty`; §6.6: gợi ý `zeroMeaning`.
