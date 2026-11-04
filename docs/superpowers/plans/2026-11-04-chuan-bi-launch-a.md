# Chuẩn bị launch, đợt A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turnstile ở mọi form gửi được hàng loạt (đăng ký, đăng nhập, xin mã, quên mật khẩu admin), security header cho admin/API/web, đợt sửa sau review,
và gói Free có 15 câu AI + 5 lượt tra AI mỗi tháng dương lịch (có trần riêng mỗi ngày), tắt trial.

**Architecture:** API Identity thêm `TurnstileGuard` chạy trước `RateLimitGuard` qua decorator `@Turnstile`; client siteverify theo mẫu `RealGoogleClient`
với bản giả chọn bằng `TURNSTILE_MODE`. Entitlements thêm một hàm cycle duy nhất `aiCycle()` (tháng dương lịch cho Free, bắt đầu sau nguồn AI riêng kết thúc
gần nhất), cột `subscriptions.ended_at` và `usage_records.plan`, trần `free_ai_daily_cap` kiểm dưới cùng khóa `lockAiDaily`.

**Tech Stack:** NestJS 12 + Prisma 7 + Postgres (API), Next.js 16 + next-intl + OpenNext (web), React + Vite + React Aria (admin), Vitest, Playwright, `helmet`.

**Spec:** [`../specs/2026-11-04-chuan-bi-launch-a-design.md`](../specs/2026-11-04-chuan-bi-launch-a-design.md) (decision record
[`../decisions/2026-11-04-chuan-bi-launch-a-decisions.md`](../decisions/2026-11-04-chuan-bi-launch-a-decisions.md); code facts
`docs/preparation/LAUNCH_PREP_CODE_FACTS_2026-11-04-{hardening,free-ai}.md`). Mọi `§` dưới đây là mục của design.

## Global Constraints

- Ba milestone, mỗi milestone một nhánh từ `origin/dev`, PR vào `dev`: M1 `feat/launch-a-m1-turnstile`; M2 hai nhánh `docs/launch-a-m2-review` và
  `fix/launch-a-m2-review`; M3 `feat/launch-a-m3-free-ai`. M3 merge sau M1 và sau PR code của M2 (§3).
- Defect fix = hai commit: test đỏ trước, fix sau (rule git). Commit Conventional Commits, scope theo `git log` (`api`, `web`, `admin`, `docs`).
- Deploy: API trước web và admin (§4.2, LA1E13).
- Turnstile: token 1–2048 ký tự; luật `auth.captcha.ip` 60 lần/60 s, `by: 'ip'`, chỉ ở `real`; siteverify timeout 5 s, thử lại 1 lần cùng `idempotency_key`;
  `TURNSTILE_MODE` = `real | fake | off`, không mặc định; token giả `fake-turnstile-token` (web/admin), `smoke-token` (smoke), `fake-turnstile-fail` (trượt).
- Lỗi mới: `captcha-failed` (400), `captcha-unavailable` (503). Câu vi/en theo §4.3 nguyên văn.
- CSP admin nguyên văn theo §4.4. Header API: tắt `X-Powered-By`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: no-referrer`;
  `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`; `Cross-Origin-Resource-Policy: same-site`. Không HSTS ở API.
- Free AI: `free_ai_practice_per_cycle` 15, `free_ai_lookup_per_cycle` 5 (bound 0–5000), `free_ai_daily_cap` 500 (bound 0–100000, không `null`).
  Không ràng buộc chéo Free ≤ Pro. Admin settings 49 → 52 key, tab entitlements 16 → 19.
- Không log token, secret, `order_code`; log key có chữ `code` bị che (`app-logger.ts:16`).
- Lệnh test: `pnpm exec vitest run <file>` trong `apps/api`, `apps/web`, `apps/admin`. Không có e2e backend (D38, Q11).

## Review Focus

1. **Lan sai mật khẩu rồi bấm lại** trên web và admin: token đã tiêu, form phải `reset()` widget sau mọi response (Task 6, Task 8 có test cho 401 rồi lần hai).
2. **Cloudflare chậm hơn 5 s** đúng lúc Hà đăng nhập admin: login phải cho qua, register/otp phải 503 (Task 3 có test cả ba route).
3. **Lan hết Pro lúc 10:00 ngày 20/11 sau khi dùng 200 câu**: lượt Pro không được ăn vào 15 lượt Free (Task 22–25 + smoke Task 28).
4. **Lan đổi timezone sát cuối tháng**: cửa sổ dịch, có thể thêm tối đa một lượt Free; không được thành không giới hạn (Task 21 test `calendarMonthCycle` với
   `Pacific/Kiritimati` và `Pacific/Pago_Pago`).
5. **Một smoke hoặc script quên gửi `turnstile_token`** sau M1: phải fail rõ ràng, không treo (Task 4 thêm kiểm `TURNSTILE_MODE=fake` ở đầu mỗi script).

## File structure (mới)

| File | Trách nhiệm |
|---|---|
| `apps/api/src/identity/turnstile/turnstile-client.ts` | `TurnstileClient` trừu tượng, kiểu `TurnstileVerdict` |
| `apps/api/src/identity/turnstile/turnstile-client.real.ts` / `.fake.ts` | Gọi siteverify / bản giả |
| `apps/api/src/identity/turnstile/turnstile.guard.ts` | Guard: hình dạng token, `auth.captcha.ip`, verdict → lỗi hay cho qua |
| `apps/api/src/identity/turnstile/turnstile.decorator.ts` | `@Turnstile(...rules)` |
| `apps/web/src/app-ui/TurnstileWidget.tsx`, `apps/admin/src/ui/TurnstileWidget.tsx` | Widget (bản giả khi site key rỗng) |
| `apps/web/src/lib/security-headers.ts` | Danh sách header ngoài CSP |
| `apps/admin/public/_headers` | Header admin tĩnh |
| `apps/api/src/entitlements/rules/ai-cycle.ts` | `calendarMonthCycle`, `aiCycle` |
| `apps/api/src/entitlements/rules/source-ends.ts` | `aiSourceEnds`, `lastAiSourceEnd`, `nextEndedAt` |
| `apps/api/prisma/migrations/20261105100000_free_ai_cycle/migration.sql` | `subscriptions.ended_at`, `usage_records.plan` |

---

## M1 — Turnstile và security header

### Task 1: Config Turnstile của API

**Files:**
- Modify: `apps/api/src/common/config/app-config.ts` (envSchema, superRefine, `AppConfig`, `loadConfig`, `DEFAULT_LIMITS`, union tên luật)
- Modify: `apps/api/test/support/test-config.ts`, `apps/api/.env.example`, `docker-compose.yml` (service `api`), `.github/workflows/ci.yml` (job `admin-e2e-real`)
- Test: `apps/api/src/common/config/app-config.spec.ts`

**Interfaces:**
- Produces: `AppConfig.turnstile: { mode: 'real' | 'fake' | 'off'; secretKey: string | null; allowedHostnames: string[] }`; luật rate limit `'auth.captcha.ip'`
  `{ by: 'ip', max: 60, windowSeconds: 60 }`.

- [ ] **Step 1: Write the failing tests** trong `app-config.spec.ts`:

```ts
it('LA1#8 refuses to start without TURNSTILE_MODE', () => {
  expect(() => loadConfig(envWithout('TURNSTILE_MODE'))).toThrow(/TURNSTILE_MODE/);
});
it('LA1#9 real needs a secret and at least one hostname', () => {
  expect(() => loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real' })).toThrow(/TURNSTILE_SECRET_KEY.*TURNSTILE_ALLOWED_HOSTNAMES|TURNSTILE_ALLOWED_HOSTNAMES.*TURNSTILE_SECRET_KEY/);
});
it('parses the hostname list', () => {
  const c = loadConfig({ ...validEnv(), TURNSTILE_MODE: 'real', TURNSTILE_SECRET_KEY: 's', TURNSTILE_ALLOWED_HOSTNAMES: 'wordmet.com, www.wordmet.com,admin.wordmet.com' });
  expect(c.turnstile).toEqual({ mode: 'real', secretKey: 's', allowedHostnames: ['wordmet.com', 'www.wordmet.com', 'admin.wordmet.com'] });
});
it.each(['fake', 'off'])('LA1#10 BILLING_PRODUCTION refuses TURNSTILE_MODE=%s', (mode) => {
  expect(() => loadConfig({ ...validEnv(), BILLING_PRODUCTION: 'true', TURNSTILE_MODE: mode })).toThrow(/BILLING_PRODUCTION/);
});
it('adds auth.captcha.ip 60/60s by ip', () => {
  expect(loadConfig(validEnv()).limits['auth.captcha.ip']).toEqual({ by: 'ip', max: 60, windowSeconds: 60 });
});
```

(`validEnv()` là helper env hợp lệ đang có trong spec, thêm `TURNSTILE_MODE: 'off'`; field là `AppConfig.limits`, `app-config.ts:119`.)

- [ ] **Step 2:** `pnpm exec vitest run src/common/config/app-config.spec.ts` → FAIL (thiếu field).
- [ ] **Step 3:** Thêm `TURNSTILE_MODE: z.enum(['real','fake','off'])` (không `.default`), `TURNSTILE_SECRET_KEY: nonEmpty.optional()`,
  `TURNSTILE_ALLOWED_HOSTNAMES` (tách dấu phẩy, `trim`, bỏ rỗng); superRefine: `real` thiếu một trong hai → issue cho từng biến thiếu; `BILLING_PRODUCTION` cùng
  `fake`/`off` → issue `['BILLING_PRODUCTION']` với message như ba đồ giả đang có. Thêm luật vào union và `DEFAULT_LIMITS`. `test-config.ts`:
  `turnstile: { mode: 'off', secretKey: null, allowedHostnames: [] }`. `.env.example`: `TURNSTILE_MODE=fake`, hai biến kia để trống kèm ghi chú khóa test
  (§9). `docker-compose.yml`: `TURNSTILE_MODE: ${TURNSTILE_MODE:-fake}`. `ci.yml` job `admin-e2e-real`: `TURNSTILE_MODE: fake`.
- [ ] **Step 4:** chạy lại spec → PASS; `pnpm exec vitest run` toàn API → PASS (test-config đã có field).
- [ ] **Step 5:** commit `feat(api): add the turnstile config, mode has no default`.

### Task 2: Client siteverify (thật và giả)

**Files:**
- Create: `apps/api/src/identity/turnstile/turnstile-client.ts`, `turnstile-client.real.ts`, `turnstile-client.fake.ts`
- Test: `apps/api/src/identity/turnstile/turnstile-client.real.spec.ts`, `turnstile-client.fake.spec.ts`

**Interfaces:**
- Produces:

```ts
export type TurnstileVerdict =
  | { kind: 'ok'; hostname: string }
  | { kind: 'rejected'; codes: string[] }                       // success:false (gồm timeout-or-duplicate)
  | { kind: 'unavailable'; reason: 'network' | 'timeout' | 'http' | 'internal-error' | 'misconfigured' };
export abstract class TurnstileClient {
  abstract verify(token: string, remoteIp: string | undefined): Promise<TurnstileVerdict>;
}
export class RealTurnstileClient extends TurnstileClient { constructor(secret: string, deps?: { fetch?: typeof fetch; uuid?: () => string }) }
export class FakeTurnstileClient extends TurnstileClient {}   // 'fake-turnstile-fail' → rejected; còn lại → ok, hostname 'fake'
```

- [ ] **Step 1: Write failing tests** (fetch giả trả JSON):
  - `ok` khi `{ success: true, hostname: 'wordmet.com' }`; body gửi là form-urlencoded có `secret`, `response`, `remoteip`, `idempotency_key`.
  - `rejected` với `codes: ['timeout-or-duplicate']`; LA1E18: `{ success: false, 'error-codes': ['invalid-input-response'] }` (bản build gửi `fake-turnstile-token` tới API
    `real`) → `rejected`.
  - Lỗi mạng lần 1, `ok` lần 2 → `ok`; hai lần gọi có **cùng** `idempotency_key`.
  - HTTP 503 hai lần → `{ kind: 'unavailable', reason: 'http' }`; `internal-error` hai lần → `reason: 'internal-error'`; quá 5 s (fake timer + `AbortSignal`) → `'timeout'`.
  - `invalid-input-secret` → `reason: 'misconfigured'`, **không** thử lại.
  - Lỗi ném ra không chứa secret (`expect(String(err)).not.toContain(secret)`).
  - Fake: `'fake-turnstile-fail'` → `rejected` (LA1E17); `'smoke-token'` → `ok`.
- [ ] **Step 2:** chạy hai spec → FAIL.
- [ ] **Step 3:** Implement theo mẫu `google-client.real.ts` (`AbortSignal.timeout(5_000)`, một lần thử lại cho network/timeout/HTTP 5xx/`internal-error`).
- [ ] **Step 4:** chạy → PASS.
- [ ] **Step 5:** commit `feat(api): add the turnstile siteverify client and its fake`.

### Task 3: `TurnstileGuard`, decorator, ba route

**Files:**
- Create: `apps/api/src/identity/turnstile/turnstile.guard.ts`, `turnstile.decorator.ts`
- Modify: `apps/api/src/identity/identity.module.ts` (factory `TurnstileClient` theo `config.turnstile.mode`), `auth/auth.controller.ts` (register, login),
  `auth/otp.controller.ts` (request), `auth/auth.schemas.ts`, `auth/otp.schemas.ts`, nơi đăng ký problem type nếu có danh sách (`common/problem-details`)
- Test: `apps/api/src/identity/turnstile/turnstile.guard.spec.ts`, `apps/api/src/identity/auth/turnstile-routes.spec.ts` (HTTP)

**Interfaces:**
- Consumes: `TurnstileClient` (Task 2), `AppConfig.turnstile`, `RateLimiterService.hit`, luật `auth.captcha.ip` (Task 1).
- Produces: `Turnstile(...rules: RateLimitRuleName[])` = `applyDecorators(SetMetadata(RATE_LIMIT_KEY, rules), UseGuards(TurnstileGuard, RateLimitGuard))`;
  metadata route policy `TURNSTILE_ON_UNAVAILABLE`: `'reject' | 'bypass'` (`login` = `bypass`).

- [ ] **Step 1: Write failing guard tests** (mỗi hàng là một `it`, mã LA1 trong tên):
  - `off` (LA1E16): body có hoặc không có token → `true`; không đọc body, không gọi client.
  - LA1E1: thiếu token / số / object / 2049 ký tự → `ProblemDetailsException` 400 `validation-failed`; client và `RateLimiter.hit` không được gọi.
  - LA1E3 (`real`): `hit('auth.captcha.ip')` trả vượt → 429 `rate-limited` có `retryAfterSeconds`; client không được gọi. `fake` không gọi `hit`.
  - `ok` + hostname trong danh sách (`wordmet.com`, `www.wordmet.com`, `admin.wordmet.com`: LA1#3, LA1#4, một `it.each`) → `true`; LA1E7 hostname lạ → 400 `captcha-failed`
    + log `turnstile_hostname_mismatch` có hostname.
  - LA1E2 `rejected` → 400 `captcha-failed`.
  - LA1E8: `unavailable` với policy `reject` → 503 `captcha-unavailable`; với `bypass` → `true` + log warn `turnstile_bypassed` (route, reason).
  - LA1E9: `misconfigured` → như trên, cộng log error `turnstile_misconfigured`.
  - Log không có token (`expect(JSON.stringify(logCalls)).not.toContain(token)`).
- [ ] **Step 2: Write failing HTTP tests** (dựng app với `turnstile.mode = 'real'` và `FakeTurnstileClient` thay bằng stub):
  - token sai → 400 và spy `RateLimiterService.hit` **không** được gọi với luật của route (thứ tự guard).
  - `POST /v1/auth/register`, `/v1/auth/login`, `/v1/auth/otp` (cả hai purpose) nhận `turnstile_token`; `/v1/auth/verify-email` có `turnstile_token` → 400 (LA1E14).
  - LA1E15: `client: 'mobile'` không token → 400.
  - stub `ok`: LA1#1 register → 201, OTP được gửi, spy `hit` được gọi với luật của route; LA1#2 login → 200; LA1#5 otp (cả hai purpose) → 202.
  - stub `unavailable`: register 503, otp 503, login 200 (với mật khẩu đúng).
  - Không viết test (rủi ro đã chấp nhận, design §11): LA1E10 (Cloudflare lỗi lúc bot dò mật khẩu), LA1E11 (bot thuê dịch vụ giải), LA1E12 (API không kiểm `action`).
- [ ] **Step 3:** chạy → FAIL.
- [ ] **Step 4:** Implement guard theo §4.1 (thứ tự 1–5), decorator, policy metadata; đổi `@RateLimit` → `@Turnstile` ở ba route; schema thêm
  `turnstile_token: z.string().min(1).max(2048).optional()` (register; `loginSchema` dùng `.extend`; hai nhánh otp; không thêm vào `verifyEmailSchema`).
- [ ] **Step 5:** chạy hai spec + toàn API → PASS (test HTTP cũ chạy `off` nên không đổi).
- [ ] **Step 6:** commit `feat(api): require a turnstile token on register, login and otp`.

### Task 4: Script, smoke và e2e-real gửi token

**Files:**
- Modify: `apps/api/scripts/smoke-buoc-0-3-fixes.mjs`, `smoke-buoc-2.mjs`, `smoke-buoc-4.mjs`, `smoke-buoc-5.mjs`, `smoke-buoc-6.mjs`, `smoke-buoc-7.mjs`,
  `smoke-buoc-8.mjs`, `smoke-nhom-b.mjs`, `learner-test-setup.mjs`; `apps/admin/e2e-real/support/api.ts`, `sign-in.ts`

- [ ] **Step 1:** Mỗi script: ở phần kiểm môi trường đầu file (theo mẫu kiểm `.env` đang có) thêm: `.env` của API phải có `TURNSTILE_MODE=fake`, nếu không thì
  dừng với câu `"set TURNSTILE_MODE=fake in apps/api/.env for this smoke"`. Mọi body tới `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/otp` thêm
  `turnstile_token: 'smoke-token'`.
- [ ] **Step 2:** `apps/admin/e2e-real/support/api.ts`: cùng token cho các gọi đăng ký, đăng nhập, xin mã. `sign-in.ts` (LA1E4): nhánh chờ `Retry-After` rồi bấm lại vẫn chạy,
  vì widget giả cấp token mới sau `reset()`.
- [ ] **Step 3: Verify (LA1#7):** `rg -n "auth/(register|login|otp)" apps/api/scripts apps/admin/e2e-real` → mọi chỗ có `turnstile_token` (kiểm bằng mắt từng dòng).
  Chạy `pnpm smoke:buoc-4` với API `TURNSTILE_MODE=fake` trên DB mới → in dòng pass cuối như trước.
- [ ] **Step 4:** commit `test(api): smokes send a fake turnstile token`.

### Task 5: Security header của API

**Files:**
- Modify: `apps/api/package.json` (thêm `helmet`), `apps/api/src/app.setup.ts`
- Test: `apps/api/src/app.setup.headers.spec.ts`

- [ ] **Step 1: Write failing test** LA1#11: dựng app bằng `createTestApp`, `GET /v1/health`:

```ts
expect(res.headers['x-content-type-options']).toBe('nosniff');
expect(res.headers['referrer-policy']).toBe('no-referrer');
expect(res.headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
expect(res.headers['cross-origin-resource-policy']).toBe('same-site');
expect(res.headers['x-powered-by']).toBeUndefined();
expect(res.headers['strict-transport-security']).toBeUndefined();
```

  Thêm một case: preflight `OPTIONS` từ origin trong `CORS_ORIGINS` vẫn trả `access-control-allow-origin`.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** `pnpm --filter api add helmet`; trong `app.setup.ts`, trước CORS: `app.disable('x-powered-by')` và
  `helmet({ contentSecurityPolicy: { useDefaults: false, directives: { 'default-src': ["'none'"], 'frame-ancestors': ["'none'"] } }, referrerPolicy: { policy: 'no-referrer' }, crossOriginResourcePolicy: { policy: 'same-site' }, strictTransportSecurity: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: false, originAgentCluster: false, xDnsPrefetchControl: false, xDownloadOptions: false, xFrameOptions: false, xPermittedCrossDomainPolicies: false, xXssProtection: false })`.
  Chỉ để lại năm header của Global Constraints.
- [ ] **Step 4:** chạy spec + toàn API (gồm spec webhook billing dùng raw body) → PASS.
- [ ] **Step 5:** commit `feat(api): set security headers with helmet`.

### Task 6: Widget và form Turnstile của web

**Files:**
- Create: `apps/web/src/app-ui/TurnstileWidget.tsx`, `TurnstileWidget.test.tsx`
- Modify: `apps/web/src/app-shell/config.ts` (`TURNSTILE_SITE_KEY`), `features/learner/auth/RegisterForm.tsx`, `LoginForm.tsx`, `ForgotPasswordForm.tsx`,
  `VerifyEmailForm.tsx`, `app-shell/session/session-store.ts` (register/login nhận token), `app-shell/api/problem.ts`, `messages/vi.json`, `messages/en.json`
- Test: `features/learner/auth/auth.test.tsx`, `app-shell/api/problem.test.ts`

**Interfaces:**
- Produces: `<TurnstileWidget onToken={(t: string | null) => void} ref={TurnstileHandle} />` với `TurnstileHandle = { reset(): void }`; site key rỗng →
  không tải script, gọi `onToken('fake-turnstile-token')` khi mount và sau mỗi `reset()`.

- [ ] **Step 1: Write failing tests:**
  - Widget: site key rỗng → `onToken('fake-turnstile-token')`, không có thẻ script; có site key → chèn script `…/api.js?render=explicit`, `render` được gọi với
    `{ sitekey, 'refresh-expired': 'auto' }`; `expired-callback` → `onToken(null)`.
  - `auth.test.tsx`: đăng ký gửi `turnstile_token`; nút gửi tắt khi chưa có token (LA1E5: `onToken(null)` sau hết hạn → nút tắt lại); LA1#6: đăng nhập 401 rồi bấm lại →
    `reset` được gọi giữa hai lần và lần hai gửi token mới; LA1E4: 429 → `reset` được gọi; LA1E6: bấm gửi hai lần nhanh → một request; quên mật khẩu và "gửi lại mã" gửi token;
    nộp mã xác minh **không** gửi token. LA1E19 (đã đăng nhập mở quên mật khẩu, widget vẫn hiện) là hành vi chấp nhận, không thêm test.
  - `problem.test.ts`: `captcha-failed`, `captcha-unavailable` có trong `KNOWN_ERROR_SLUGS` và có câu vi/en (test đang có tự bắt).
- [ ] **Step 2:** `pnpm exec vitest run src/app-ui/TurnstileWidget.test.tsx src/features/learner/auth/auth.test.tsx src/app-shell/api/problem.test.ts` → FAIL.
- [ ] **Step 3:** Implement widget; mỗi form giữ token trong state, gửi kèm, gọi `reset()` sau **mọi** response trừ khi chuyển trang; thêm hai slug và câu
  vi/en nguyên văn §4.3.
- [ ] **Step 4:** chạy lại → PASS; `pnpm exec vitest run` toàn web → PASS.
- [ ] **Step 5:** commit `feat(web): turnstile on register, login, forgot password and resend`.

### Task 7: CSP, header, build guard và e2e của web

**Files:**
- Create: `apps/web/src/lib/security-headers.ts`, `security-headers.test.ts`
- Modify: `apps/web/src/lib/csp.ts`, `csp.test.ts`, `apps/web/next.config.ts`, `apps/web/e2e/support/mock-api.ts`, `apps/web/e2e/csp.spec.ts`,
  `apps/web/playwright.config.ts`, `apps/web/README.md`, `docker-compose.yml` (service web)

**Interfaces:**
- Produces: `securityHeaders(): Array<{ key: string; value: string }>` (ba header §4.4 của web).

- [ ] **Step 1: Write failing tests:** `csp.test.ts`: `script-src` chứa `https://challenges.cloudflare.com`; có `frame-src https://challenges.cloudflare.com`.
  `security-headers.test.ts`: đúng ba header, giá trị nguyên văn. Một test cho guard build (LA1#15): hàm `assertTurnstileSiteKey({ learnerApp: 'on', siteUrl: 'https://wordmet.com', siteKey: '' })`
  throw có chữ `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; `siteUrl: 'http://localhost:3001'` không throw.
- [ ] **Step 2:** chạy → FAIL.
- [ ] **Step 3:** Implement; `next.config.ts` gọi `assertTurnstileSiteKey` cạnh `assertApiBaseUrl` và thêm `securityHeaders()` vào `headers()`. `mock-api.ts` route
  `https://challenges.cloudflare.com/turnstile/v0/api.js` trả script giả (`window.turnstile.render/reset/remove`, gọi `callback('e2e-turnstile-token')`).
  `playwright.config.ts`: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`. E23 thêm mở `/vi/app/login` (không mock, widget thật, 0 vi phạm CSP: LA1#14) và LA1#13 kiểm
  ba header ở `/vi`.
- [ ] **Step 4:** `pnpm exec vitest run` web → PASS; `pnpm cf:docker` (chạy e2e trên build Worker) → E23 và các e2e app PASS.
- [ ] **Step 5:** commit `feat(web): csp and security headers for turnstile`.

### Task 8: Turnstile và `_headers` của admin

**Files:**
- Create: `apps/admin/src/ui/TurnstileWidget.tsx` (+ test), `apps/admin/public/_headers`, `apps/admin/src/headers.test.ts`
- Modify: `apps/admin/src/features/account/LoginPage.tsx`, `ForgotPasswordPage.tsx` (+ hai test), `src/auth/session-store.ts`, `src/api/problem.ts`,
  `messages/vi.json`, `messages/en.json`, `src/vite-env.d.ts`, `src/api-base-url-guard.ts` (hoặc plugin cạnh nó), `.env.example`, `.github/workflows/ci.yml`
  (bước build production guard: sitekey test), `playwright.config.ts`, `playwright.real.config.ts`, `docker-compose.yml` (service admin)

- [ ] **Step 1: Write failing tests:** `LoginPage.test.tsx` gửi `turnstile_token`, 401 rồi bấm lại → `reset` + token mới; `ForgotPasswordPage.test.tsx` bước một
  gửi token, bước đặt mật khẩu không gửi; `problem.test.ts` hai slug; `headers.test.ts` (LA1#12) đọc `public/_headers`: đúng một rule `/*`, bốn header,
  CSP đúng chuỗi §4.4; guard build (LA1#15): mode `production` + site key rỗng → throw có `VITE_TURNSTILE_SITE_KEY`, mode `e2e` không throw.
- [ ] **Step 2:** `pnpm exec vitest run` các file trên → FAIL.
- [ ] **Step 3:** Implement như web; `_headers` nguyên văn §4.4.
- [ ] **Step 4:** `pnpm exec vitest run` admin → PASS; `pnpm build` → `dist/_headers` tồn tại và giống `public/_headers` (`diff` không in gì).
- [ ] **Step 5:** commit `feat(admin): turnstile on login and forgot password, static security headers`.

### Task 9: Checklist deploy của M1 và kiểm `real`

**Files:** Modify `docs/deliveries/deploy-checklist.md` (mục Turnstile `:83-86`, header `:49-53`), tạo `docs/deliveries/chuan-bi-launch-a.md` (as-built M1).

- [ ] **Step 1:** Sửa checklist đúng §4.5 (một widget ba host, ba biến API, site key hai app, deploy API trước, kiểm `curl` sau deploy, đánh dấu phần code đã xong).
- [ ] **Step 2: Chạy tay `real`** theo §9 (secret test `1x0000000000000000000000000000000AA`, sitekey `1x00000000000000000000AA`): web đăng ký, đăng nhập, quên
  mật khẩu, gửi lại mã, LA1#6; admin đăng nhập, quên mật khẩu; secret `2x…AA` → cả hai app hiện câu `captcha-failed`. Ghi `hostname` thật mà siteverify trả
  ở local vào as-built.
- [ ] **Step 3:** `curl -I http://localhost:3000/v1/health` → năm header, không `X-Powered-By`.
- [ ] **Step 4:** commit `docs(deploy): turnstile and header items for m1`; mở PR M1 bằng skill `ship-pr`.

---

## M2 — Đợt sửa sau review

### Task 10: PR tài liệu (nhánh `docs/launch-a-m2-review`)

**Files:** `docs/deliveries/deploy-checklist.md`, `docs/preparation/IMPROVEMENT_PLAN_2026-10-28.md`, `CLAUDE.md`, các design cũ trong `docs/superpowers/specs/`,
`docs/deliveries/buoc-2-test-flow.md`, `buoc-2-5-test-flow.md`, `buoc-3-test-flow.md`, `giao-dien-nguoi-hoc-handoff-2026-10-23.md`, `buoc-7.md`,
`docs/superpowers/specs/2026-10-19-buoc-5-entitlements-design.md`.

- [ ] **Step 1:** R3: mục checklist §5 nhóm 1 (đặt `BILLING_PRODUCTION=true`, không đặt `*_FAKE_ENABLED`, `TURNSTILE_MODE=real`, kiểm API từ chối khởi động).
- [ ] **Step 2:** R4: từng mục của code facts hardening §C R4 (mỗi sự thật pháp lý một lần).
- [ ] **Step 3:** R11 → ✅; R12: từng dòng của code facts §C R12 và §D (design cũ thêm ghi chú "đã thay bởi …", không viết lại); plan A7 bỏ D1 waitlist; ghi chú
  UW-7, UA-7, B8-8; B5-6 sửa chữ design Bước 5 nguyên văn §5.
- [ ] **Step 4:** Ghi dòng theo dõi "để sau" cho B2-3, B4-4, UA-6 trong `IMPROVEMENT_PLAN`.
- [ ] **Step 5:** commit `docs(review): close the doc items of the post-review round`; PR bằng `ship-pr`.

### Task 11: Dọn script và test (nhánh `fix/launch-a-m2-review`)

**Files:** gốc `package.json`; `apps/api/test/support/list-routes.spec.ts`; `apps/admin/src/vite-env.d.ts` (UA-4); ba file test web của UW-6
(`practice-session.test.tsx`, `review-session.test.tsx`, `group-page.test.tsx`).

- [ ] **Step 1:** Bỏ `test:e2e` khỏi gốc `package.json` (LA2#11); `pnpm run` ở gốc không còn liệt kê nó.
- [ ] **Step 2:** Đổi nhãn `B2#66`; khai `AppConfig` của `use-intl` cho admin (một key sai trong `t()` phải thành lỗi `tsc`: thử `t('nope')` cục bộ thấy đỏ rồi bỏ).
- [ ] **Step 3:** UW-6: bỏ assert `font-bold`, `sm:grid-cols-2`, `text-caption`; giữ class motion; ba file vẫn PASS.
- [ ] **Step 4:** `pnpm -r exec tsc --noEmit` trong admin, `pnpm exec vitest run` web, admin → PASS. Commit `chore: drop the dead e2e script and layout asserts`.

### Task 12: B5-7 refund đòi dòng `use` đã xác nhận (defect)

**Files:** `apps/api/src/entitlements/usage/usage-ledger.service.ts:140-160`, `usage-ledger.service.spec.ts`

- [ ] **Step 1: Failing tests** LA2#1 (chỉ có `use` `released` hoặc không có dòng, cycle còn lượt → `refunded: false`, không có `credit`), LA2#2 (`use`
  `confirmed` trước đầu cycle → `false`).
- [ ] **Step 2:** chạy → FAIL; commit `test(api): refund needs a confirmed use in the cycle (B5-7)`.
- [ ] **Step 3:** Trong transaction của `refund`: tìm dòng `use` `confirmed` của `(user, pool, operation_id)` với `confirmed_at` trong cycle; không có → `false`.
  Giữ hai kiểm đang có.
- [ ] **Step 4:** PASS; commit `fix(api): refund only a confirmed use of the cycle (B5-7)`.

### Task 13: B5-5 anchor `min(currentPeriodStart, occurredAt)` (defect)

**Files:** `apps/api/src/entitlements/billing/subscription-machine.ts:88, 130, 248`, `subscription-machine.spec.ts`

- [ ] **Step 1: Failing test** LA2#3 cho ba nhánh (`renewed`, `renewed` khi chưa có hàng, chỗ thứ ba ở `:248`): `occurredAt` 10:00 hôm nay, kỳ bắt đầu 10:00 mai →
  `quotaAnchorAt` = 10:00 hôm nay. Commit `test(api): …(B5-5)`.
- [ ] **Step 2:** sửa ba chỗ; PASS; commit `fix(api): anchor the ai cycle at the earlier of period start and event time (B5-5)`.

### Task 14: B3-5 khóa và transaction khi thêm, bỏ mục học (defect)

**Files:** `apps/api/src/learning/items/items.service.ts:61-65, 135-146`, `quick-add.service.ts`, spec tương ứng

- [ ] **Step 1: Failing tests** LA2#4 (spy: `visibleSenseIds` nhận `tx`, gọi sau `lockItems`/khóa người học), LA2#5 (`lockItems(tx, userId, [itemId])` trước
  `deleteItem`). Commit test.
- [ ] **Step 2:** sửa; PASS; commit `fix(api): read visible senses and delete items under the learner lock (B3-5)`.

### Task 15: B2-6 trần lượt job theo DB (defect)

**Files:** `apps/api/src/content-pipeline/jobs/job-runner.service.ts:78`, spec

- [ ] **Step 1: Failing test** LA2#6: `lease.attempts = 3`, `config.pipeline.jobAttempts = 3`, BullMQ `attemptsMade = 1` → job thành `failed`, không ném lại để
  BullMQ thử. Commit test.
- [ ] **Step 2:** nhánh lỗi so `lease.attempts` với `jobAttempts`; PASS; commit `fix(api): cap job retries by the stored attempt count (B2-6)`.

### Task 16: B1-5 dọn bảng cũ

**Files:** `apps/api/src/identity/maintenance/identity-cleanup.service.ts` (+ spec), `apps/api/src/common/mail/mail-budget.service.ts` hoặc job dọn của `src/common`

- [ ] **Step 1: Failing test** LA2#7: xóa `otp_failure_windows` có cửa sổ cũ hơn 48 giờ, `mail_budget_buckets` của ngày UTC cũ hơn 7 ngày; giữ dòng mới hơn.
- [ ] **Step 2:** thêm hai `deleteMany` vào job dọn đang chạy hằng giờ; PASS; commit `feat(api): clean old otp windows and mail budget rows (B1-5)`.

### Task 17: B2-8 gộp `writeEntry`

**Files:** hai controller có `writeEntry` (theo finding B2-8), một helper chung trong `content-pipeline`.

- [ ] **Step 1:** chạy spec hai controller → PASS (mốc trước khi gộp).
- [ ] **Step 2:** tách một hàm dùng chung, hai controller gọi nó; spec vẫn PASS. Commit `refactor(api): share writeEntry between the two export controllers (B2-8)`.

### Task 18: Admin A6 và B3-7

**Files:** `apps/admin/src/features/users/*` (ô tìm kiếm), `features/account/LoginPage.tsx` (đếm ngược khóa), ô ngày dùng locale; `features/content/*` (trang Xuất);
`apps/api/src/common/config/app-config.ts:226`, `apps/api/.env.example:10`, `app-config.spec.ts:127`

- [ ] **Step 1: Failing tests:** LA2#8 (gõ `a\u0000b` → request có `q=ab`); LA2#9 (429 có `Retry-After: 30` → hiện đếm ngược 30); ô ngày `en` hiện `11/04/2026` theo
  `en`, `vi` hiện `04/11/2026`; LA2#10 (chọn "Từ chưa có nghĩa" → gọi `entries/export?has_sense=false`); `EXPORT_MAX_ROWS` mặc định `10_000`.
- [ ] **Step 2:** commit test; implement; PASS; commit `fix(admin): search, lock countdown, local dates, export words without senses`.

### Task 19: B8-4 e2e "Đặt mật khẩu" tài khoản chỉ có Google

**Files:** `apps/web/e2e/app/b8-set-password.spec.ts`, `apps/web/e2e/support/fixtures.ts`

- [ ] **Step 1:** e2e mock LA2#12: `Me` có `sign_in_methods: ['google']` → Cài đặt → "Đặt mật khẩu" → form quên mật khẩu hiện (không bị đưa về `/app`), gửi mã, nhập
  mã và mật khẩu mới → 204 → thông báo thành công.
- [ ] **Step 2:** `pnpm cf:docker` → spec PASS. Commit `test(web): e2e for setting a password on a google-only account (B8-4)`; PR M2 code bằng `ship-pr`.

### Task 20: Chạy tay và đo (nhóm 3)

**Files:** `docs/deliveries/dev-checklist-<ngày chạy YYYY-MM-DD>-output.txt`, `docs/deliveries/buoc-5.md`, `docs/deliveries/buoc-8.md`, `giao-dien-admin-test-flow.md`

- [ ] **Step 1:** Merge `docs/audit/2026-11-04-dev-test-checklist.md` (nhánh `docs/dev-test-checklist`) vào nhánh tài liệu; chạy một lượt; lưu output; ghi ba
  `ASSUMPTION` đã đúng hay sai.
- [ ] **Step 2:** R8 trên trình duyệt; R13 (output smoke hồi quy, lượt trình duyệt Bước 8, mục "Thêm sau plan" ở test flow admin); as-built AI thật 28/10 nếu chủ
  dự án đưa dữ liệu.
- [ ] **Step 3:** B5-8: trên nhánh nháp bỏ `lockPool`/`lockAiDaily`, `pnpm smoke:buoc-5` phải đỏ; ghi kết quả vào `buoc-5.md`; xóa nhánh nháp.
- [ ] **Step 4:** B2-5, B7-5: `pnpm test:scale` (Docker); ghi số.
- [ ] **Step 5:** commit `docs(deliveries): post-review manual runs`.

---

## M3 — Lượt AI cho Free, tắt trial

### Task 21: Hàm thuần cycle tháng dương lịch

**Files:** Create `apps/api/src/entitlements/rules/ai-cycle.ts`, `ai-cycle.spec.ts`

**Interfaces:**
- Consumes: `localDate(zone, at)`, `zonedMidnight(zone, date)` (`common/time/local-date.ts`), `cycleAt(anchor, now)` (`rules/cycle.ts`), `Resolved` (`plan-rules.ts`).
- Produces:

```ts
export type Cycle = { start: Date; end: Date };
export function calendarMonthCycle(zone: string, now: Date): Cycle;
export function aiCycle(resolved: Resolved, zone: string, now: Date, lastEnd: Date | null): Cycle | null;
```

- [ ] **Step 1: Failing tests:**
  - `calendarMonthCycle('Asia/Ho_Chi_Minh', 2026-11-15T03:00Z)` → `{ start: 2026-10-31T17:00Z, end: 2026-11-30T17:00Z }`.
  - 28/02/2027 và 29/02/2028 (nhuận); `America/New_York` tháng có đổi DST (03/2027: start `2027-03-01T05:00Z`, end `2027-04-01T04:00Z`); `Pacific/Kiritimati`
    (+14) và `Pacific/Pago_Pago` (−11) ngày 30/11 23:30 giờ địa phương.
  - `aiCycle`: có anchor → bằng `cycleAt(anchor, now)`; Free, không anchor, limit AI > 0, `lastEnd` 20/11 10:00 giờ VN → `{ start: lastEnd, end: đầu tháng 12 }`;
    `lastEnd` null → cả tháng; Pro không anchor → `null` (LA3E6); Free limit 0 → `null`.
- [ ] **Step 2:** FAIL → implement (cộng tháng trên chuỗi `YYYY-MM`) → PASS. Commit `feat(api): calendar-month ai cycle for the free plan`.

### Task 22: Mốc kết thúc nguồn AI và migration

**Files:**
- Create: `apps/api/src/entitlements/rules/source-ends.ts`, `source-ends.spec.ts`; `apps/api/prisma/migrations/20261105100000_free_ai_cycle/migration.sql`
- Modify: `apps/api/prisma/models/entitlements.prisma` (`Subscription.endedAt`, `UsageRecord.plan`), `rules/plan-rules.ts` (`SubscriptionSource.endedAt`),
  `sources/sources.repository.ts` (`toSubscription`)

**Interfaces:**
- Produces:

```ts
export type AiSourceEnd = { kind: 'subscription' | 'grant_plan' | 'grant_limits' | 'prepaid_period'; id: string; endedAt: Date };
export function aiSourceEnds(input: { subscriptions: SubscriptionSource[]; grants: GrantSource[]; ended: EndedSources; graceDays: number; now: Date }): AiSourceEnd[];
export function lastAiSourceEnd(ends: AiSourceEnd[], since: Date, now: Date): Date | null;
export function nextEndedAt(before: { status: SubscriptionStatus; endedAt: Date | null } & TimeFields, afterStatus: SubscriptionStatus, at: Date, graceDays: number): Date | null;
// EndedSources = { subscriptions: SubscriptionSource[]; grants: GrantSource[] }  (design B thêm prepaidPeriods sau)
```

- [ ] **Step 1: Failing tests:** mỗi hàng §6.3.2 một `it` (trialing/active quá hạn hủy cuối kỳ → `end`; không hủy → `end + graceDays`; `grace` → `graceEndsAt`;
  `on_hold`/`expired`/`revoked` → `endedAt`; `trialDenied` → không có (LA3E15); plan grant thu hồi trước `startsAt` → không có (LA3E16); plan grant thu hồi 12/11 09:00 →
  `endedAt` 12/11 09:00 (LA3#7); limits grant có AI hết 20/11 → có, `endedAt` 20/11 (LA3#9)); `lastAiSourceEnd`
  LA3E17, LA3E18; `nextEndedAt` LA3E9–LA3E14.
- [ ] **Step 2:** migration:

```sql
ALTER TABLE "subscriptions" ADD COLUMN "ended_at" TIMESTAMPTZ;
ALTER TABLE "usage_records" ADD COLUMN "plan" TEXT;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_plan_check" CHECK ("plan" IS NULL OR "plan" IN ('free', 'trial', 'pro'));
```

  model Prisma khớp; `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` sau `pnpm db:setup` trên DB mới → exit 0.
- [ ] **Step 3:** implement; PASS. Commit `feat(api): record when a pro source ends (ended_at) and the plan of a use`.

### Task 23: Ghi `ended_at` ở bốn chỗ và loader trả `ended`

**Files:** `apps/api/src/entitlements/billing/event-applier.service.ts:183-186, 237`, `billing-jobs.service.ts:87, 119`, `sources/sources.repository.ts`
(+ specs)

**Interfaces:**
- Produces: `SourcesRepository.load(db, userId, now, endedSince?: Date)` → `{ subscriptions, grants, ended: EndedSources }` (`ended` rỗng khi không truyền
  `endedSince`); `subscriptions`, `grants` không đổi (LA3E19).

- [ ] **Step 1: Failing tests:** mỗi chỗ ghi status gọi `nextEndedAt` và ghi `endedAt` (applier áp `expired` → `ended_at` = `occurredAt`; `timeTransitions` 10:07
  ghi `expired` cho kỳ hết 10:00 → `ended_at` 10:00); loader với `endedSince` trả subscription `expired` có `ended_at ≥ endedSince`, grant thu hồi/hết hạn
  trong khoảng; không trả cái trước `endedSince`.
- [ ] **Step 2:** implement theo §6.3.3–§6.3.4; PASS. Commit `feat(api): write ended_at on every status write and load ended sources`.

### Task 24: Ba setting Free

**Files:** `apps/api/src/settings/settings.definitions.ts` (năm chỗ), `entitlements/plan-numbers.ts:4-7`, `settings/app-config.view.ts`, `apps/web/src/app-shell/queries.ts`
(`AppConfig.plans.free`), `apps/admin/src/features/settings/settings-api.ts` (layout), `apps/admin/messages/{vi,en}.json`; specs: `settings.definitions.spec.ts`,
`app-config.view.spec.ts`, `apps/admin/src/features/settings/settings-api.test.ts`, `apps/admin/e2e/support/settings.ts`

- [ ] **Step 1: Failing tests:** LA3#14 (ba key, mặc định 15, 5, 500; `5001` → 400; `free_ai_daily_cap` không nhận `null`); `planNumbers(defaults).free` =
  `{ practice_sessions: 3, ai_practice: 15, ai_lookup: 5 }`; `appConfigView.plans.free` có `ai_practice_per_cycle: 15`, `ai_lookup_per_cycle: 5`; admin 52 key,
  tab entitlements 19.
- [ ] **Step 2:** implement; nhãn, `zeroMeaning`, `notes` nguyên văn §6.6; sửa nhãn "gói Pro và Dùng thử". PASS. Commit `feat(settings): free ai allowance and daily cap settings`.

### Task 25: Ledger, snapshot, refund, trần Free dùng `aiCycle`

**Files:** `apps/api/src/entitlements/usage/usage-ledger.service.ts`, `usage.queries.ts` (`capUsedFree`), `ledger-rules.ts`, `entitlements.service.ts`
(snapshot, dashboard), `entitlements.module.ts` (inject `IdentityService` vào ledger) + specs

**Interfaces:**
- Consumes: `aiCycle` (Task 21), `aiSourceEnds`/`lastAiSourceEnd` (Task 22), `load(…, endedSince)` (Task 23), settings (Task 24).
- Produces: `capUsedFree(db, day, now): Promise<number>`; `standing` trả thêm `plan`.

- [ ] **Step 1: Failing tests:** LA3#1–LA3#15 trừ LA3#14 (Task 24) — gồm LA3#6 (Pro hủy cuối kỳ hết 20/11 10:00, đã dùng 200 câu lúc Pro → cửa sổ 20/11 10:00 → 01/12, còn đủ 15),
  LA3#7, LA3#8 (limits grant 50 từ 10/11 → chu kỳ 10/11 → 10/12, limit 50), LA3#9, LA3#11 (`free_ai_practice_per_cycle = 0` → `plan-required`), LA3#12 (limits grant
  `ai_practice_per_cycle: 0` → `plan-required`); LA3E1, LA3E2, LA3E5 (Free → Pro một ngày → Free cùng tháng: cửa sổ mới sau lúc Pro hết, lại 15; ghim hành vi đã chấp nhận), LA3E7,
  LA3E8, LA3E20–LA3E22, LA3E23 (`ai_prefetch_count = 2`: hai câu làm sẵn trừ hai lượt lúc ghi câu); snapshot Free có `resets_at` đầu tháng sau theo zone; dashboard Pro không đổi;
  refund của Free trả `true` (code facts F9 cũ đổi). LA3E3, LA3E4 (đổi timezone dịch cửa sổ) là hành vi chấp nhận: không thêm test ngoài các zone của Task 21.
- [ ] **Step 2:** Cả bốn chỗ tính cycle gọi `aiCycle(resolved, zone, now, lastEnd)` (dashboard truyền `lastEnd = null`); `reserve` ghi `plan = resolved.plan`; dưới
  `lockAiDaily` kiểm trần chung rồi trần Free; `cap_reached` của Free = chung **hoặc** Free.
- [ ] **Step 3:** PASS; đổi các test cũ ghim "Free AI = 0" theo code facts free-ai §9. Commit `feat(entitlements): free plan gets a monthly ai allowance`.

### Task 26: Tắt trial

**Files:** `apps/api/src/entitlements/entitlements.service.ts:181`, spec `:74-94`; `apps/api/scripts/smoke-buoc-8.mjs:585-601`, `learner-test-setup.mjs:346-362`,
`smoke-buoc-5.mjs:239-240`

- [ ] **Step 1: Failing test:** snapshot người mới có `trial_eligible: false`.
- [ ] **Step 2:** trả `false`; sửa ba script theo §6.9 (B8E28 dùng SQL đếm `trial_history` = 0; `learner-test-setup --plan trial` in "trial bị từ chối: tài khoản
  đã dùng trial (D30)" khi gói không thành `trial`).
- [ ] **Step 3:** PASS. Commit `feat(entitlements): no new trials`.

### Task 27: Chữ web và landing

**Files:** `apps/web/src/features/learner/plans/PlansPage.tsx`, `CompareTable.tsx`, `practice/AiTypesToggle.tsx`, `add-word/AiLookupPanel.tsx`,
`components/landing/Plans.tsx`, `messages/{vi,en}.json`; tests: `plans.test.tsx`, `ai-toggle.test.tsx`, `ai-lookup.test.tsx`, `settings.test.tsx`,
`components/landing/sections.test.tsx`, `e2e/support/fixtures.ts`, `e2e/app/m5b.spec.ts`

- [ ] **Step 1: Failing tests:** thẻ Free ghi "15 câu AI và 5 lượt tra AI mỗi tháng" (lấy số từ `plans.free`); bảng so sánh ô AI của Free không phải `'—'`; công tắc AI
  được dùng thì không có chip "Pro"; tra AI không có chip "Dùng thử"; LA3#11 phía web: `plans.free.ai_practice_per_cycle = 0` → công tắc AI hiện dòng khóa như trước; LA3#16 landing
  ô Free "15/tháng", "5/tháng" (en "15/month", "5/month"); không còn câu trial; FAQ `a2` không nói Free không có AI.
- [ ] **Step 2:** implement (`Plans.tsx` kiểu `free: boolean | string`); fixture Free có pool AI; PASS. Commit `feat(web): show the free ai allowance, drop the trial line`.

### Task 28: Smoke của M3

**Files:** `apps/api/scripts/smoke-buoc-5.mjs`, `smoke-buoc-7.mjs:879-885`, `docs/audit/2026-11-04-dev-test-checklist.md`

- [ ] **Step 1:** `smoke-buoc-5`: người mới pool AI 15/5; Pro → Free hai cách (thu hồi plan grant; event `expired` cho subscription hủy cuối kỳ) — lượt dùng lúc Pro
  qua `pnpm entitlements:fake-ai` không tính vào Free; đặt `free_ai_daily_cap = 2`, người Free thứ ba nhận `ai-unavailable`.
- [ ] **Step 2:** `smoke-buoc-7`: Free dùng AI tới hết 15 câu, câu 16 bị từ chối (thay bước đòi 403).
- [ ] **Step 3:** checklist dev thêm Free hết lượt, sang tháng (câu SQL §9), refund, Pro → Free.
- [ ] **Step 4:** chạy `pnpm smoke:buoc-5` (hai chế độ fetchState) và `pnpm smoke:buoc-7` trên DB mới → PASS. Commit `test(api): smokes for the free ai allowance`.

### Task 29: Bản nháp pháp lý (nhánh `docs/web-launch-research`)

**Files:** `docs/preparation/legal-drafts/chinh-sach-bao-mat.draft.md`, `dieu-khoan-su-dung.draft.md`, `privacy-policy.en.draft.md`, `terms-of-use.en.draft.md`

- [ ] **Step 1:** Sửa đúng các câu của §6.10 (Chính sách mục 3, 4; Điều khoản mục 4, 9), bản vi và en; không ghi con số.
- [ ] **Step 2:** commit trên `docs/web-launch-research` `docs(research): legal drafts follow the free ai plan and no trial`.

### Task 30: Xong khi của đợt A

- [ ] **Step 1:** Tám smoke + `learner-test-setup` (gồm `--plan trial`) chạy qua trên DB mới với `TURNSTILE_MODE=fake`; lưu
  `docs/deliveries/chuan-bi-launch-a-smoke-output.txt`.
- [ ] **Step 2:** Lượt AI chạy tay §9 (hết 15 câu, câu SQL "sang tháng", Pro → Free bằng grant).
- [ ] **Step 3:** As-built cuối của `docs/deliveries/chuan-bi-launch-a.md`; `IMPROVEMENT_PLAN` R2–R4, R8, R11–R14; dòng trỏ trong `CLAUDE.md`.
- [ ] **Step 4:** commit `docs(deliveries): as-built of launch prep round a`; PR M3 bằng `ship-pr`.
