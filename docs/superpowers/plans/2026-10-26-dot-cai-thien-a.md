# Đợt cải thiện nhóm A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bắt buộc xác nhận email trước khi có phiên, thêm từ từ trang nhóm, gọn lại màn Luyện tập (chữ thứ tự, hai nút sau khi trả lời, điền từ từ câu đã lưu cho mọi gói), sửa lỗi "Xem đáp án", và thêm nút loa UK · US.

**Architecture:** Năm PR vào `dev` (sau Task 0), ba phiên song song theo file (design §3). C13 đổi luồng Identity: đăng ký không cấp phiên, đăng nhập của tài khoản chưa xác nhận trả 403, nhập mã thành API công khai cấp phiên như đăng nhập. Các mục còn lại là web, trừ hai chỗ nhỏ ở Practice API (luật chặn gói của câu `own`, bỏ qua câu điền từ trước lần thử).

**Tech Stack:** NestJS + Prisma + zod (`apps/api`), Vitest; Next 16 + next-intl + TanStack Query + React Aria (`apps/web`), Vitest + Testing Library, Playwright + axe; Node 24.11.0, pnpm 11.6.0.

**Spec:** [`../specs/2026-10-26-dot-cai-thien-a-design.md`](../specs/2026-10-26-dot-cai-thien-a-design.md). Đọc kèm: decision record
[`../decisions/2026-10-26-dot-cai-thien-a-decisions.md`](../decisions/2026-10-26-dot-cai-thien-a-decisions.md), code facts
[`../../preparation/DOT_CAI_THIEN_A_CODE_FACTS_2026-10-26.md`](../../preparation/DOT_CAI_THIEN_A_CODE_FACTS_2026-10-26.md) (mọi `path:line`). Cách làm, quy ước test và
lệnh trên Windows của app người học: [`../../deliveries/giao-dien-nguoi-hoc-handoff-2026-10-23.md`](../../deliveries/giao-dien-nguoi-hoc-handoff-2026-10-23.md).

## Global Constraints

- Mỗi PR một nhánh cắt từ `origin/dev`, PR vào `dev`; Conventional Commits `type(scope): subject`, chữ thường, không chấm cuối; commit kèm dòng
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sửa lỗi = hai commit: test lỗi trước, sửa sau.
- Không đọc, không in `.env`. Không gọi nhà cung cấp AI thật, không gọi cổng thanh toán thật.
- Lỗi API là `application/problem+json`; `type` mới của đợt: `email-not-verified`. Mọi thất bại nhập mã: `400 invalid-otp` (cùng body).
- Rate limit mới (`DEFAULT_LIMITS`): `'auth.verify.ip': { by: 'ip', max: 20, windowSeconds: 3600 }`, `'auth.verify.email': { by: 'email', max: 10, windowSeconds: 3600 }`.
- Giữ: 5 lần thử mỗi mã, mã sống 600 000 ms, khoá 24 giờ ở lần sai thứ 21, `auth.otp.email.cooldown` 1/60 s, `auth.otp.email.hourly` 5/3600 s, `ACCESS_TOKEN_TTL_SECONDS` 900.
- Bản chữ: `apps/web/messages/vi.json` và `en.json` cùng key, không rỗng; không "vui lòng", "please", "sorry"; "…" một ký tự (`src/i18n/messages.test.ts`). Chữ chính xác: design §8.
- `sessionStorage` key `wordmet-web.pending-email`; không đưa email lên URL.
- Web e2e trên Windows chạy bằng `pnpm cf:docker` ở `apps/web` (container Linux); ở Linux / CI là `pnpm test:e2e`. Màn đổi phải qua axe và không cuộn ngang × vi/en ×
  sáng/tối × 1440/390.
- Không thêm thư viện mới.

## Review Focus

1. **Tài khoản cũ đang có phiên khi C13 lên:** phiên đó phải bị đẩy ra ở lần làm mới đầu tiên, không treo app trên trang trắng. Test ở Task 5 (refresh) và Task 9 (web về đăng nhập khi refresh 401).
2. **Email có chữ hoa / khoảng trắng** ở đăng ký, đăng nhập, nhập mã, gửi lại mã: cùng một tài khoản (đều qua `normalizeEmail`). Test ở Task 3 và Task 4.
3. **Hai tab:** tab A đang ở trang nhập mã, tab B nhập mã xong → tab A nộp mã cũ nhận `invalid-otp`, chữ hướng dẫn đăng nhập; không vòng lặp. Test ở Task 9.
4. **Nhấn Enter giữ lâu (key repeat) trên màn kết quả Luyện tập:** chỉ một lời gọi review / next cho một câu. Test ở Task 13.
5. **`speechSynthesis` tồn tại nhưng `getVoices()` trả rỗng mãi** (một số trình duyệt nhúng): không nút nào hiện, không lỗi. Test ở Task 16.

---

## Task 0: Đưa M5b và tài liệu của đợt lên `dev` (trước mọi nhánh)

Review plan (`../reviews/2026-10-26-dot-cai-thien-a-plan-review.md`, C1): mọi `path:line` của plan đọc trên nhánh M5b; `origin/dev` chưa có M5b (PR #131 còn mở)
và chưa có design / plan / decision record / code facts (chưa commit).

- [ ] **Step 1:** Merge PR #131 (M5b) vào `dev` khi CI xanh (chủ dự án cho merge PR xanh không cần hỏi, 16/10/2026).
- [ ] **Step 2:** Nhánh `docs/dot-cai-thien-a-design` từ `origin/dev` mới: commit file câu hỏi, code facts, design, decision record, plan, plan tóm tắt, review plan,
  `CLAUDE.md`, `IMPROVEMENT_IDEAS`, `deploy-checklist.md`, hai ghi chú AI 24/10; PR vào `dev`, merge khi CI xanh. **Commit cần chủ dự án duyệt** (luật git của chủ dự án).
- [ ] **Step 3:** Mọi nhánh PR 1–5 cắt từ `origin/dev` **sau** Step 2.
- Mỗi phiên ghi mục riêng của mình vào `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md`; xung đột ở file này và `vi.json` / `en.json` gộp lúc merge (phiên merge sau rebase).

## PR 1 — A-C13: xác nhận email trước khi có phiên (phiên 1, nhánh `feat/dot-cai-thien-a-c13`)

### Task 1: Đăng nhập từ chối tài khoản chưa xác nhận

**Files:**
- Modify: `apps/api/src/identity/auth/auth.service.ts` (hàm `login`, 84-126)
- Modify: `apps/api/src/identity/auth/auth.controller.ts` (truyền `res` vào `login`)
- Modify: `apps/api/src/identity/auth/otp.service.ts` (thêm hàm gửi mã lặng)
- Test: `apps/api/src/identity/auth/auth.service.spec.ts`, `otp.service.spec.ts`, `auth.controller.spec.ts`

**Interfaces:**
- Produces: `AuthService.login(body: LoginBody, res: Response): Promise<IssuedSession>`; `OtpService.tryLimitEmail(email: string): Promise<boolean>` (true = được gửi; gọi
  `limitEmail`, bắt `rate-limited` trả false); `OtpService.sendVerifyCodeQuietly(userId: string, email: string, res: Response): Promise<void>` (dùng `tryLimitEmail` và
  `budget.assertAvailable`; bị giới hạn thì không gửi, không ném lỗi; không thì hẹn `issueInTx(..., 'verify_email')` sau khi trả lời như đăng ký).
- Problem: `403 { type: 'email-not-verified', title: 'Email not verified' }`.

- [ ] **Step 1: Viết test lỗi** trong `auth.service.spec.ts`:
  - `A13-3: login with the right password on an unverified account → 403 email-not-verified, no chain, failed count reset, quiet code sent` (assert
    `sessions.startChain` không được gọi; `failedLoginCount` cập nhật về 0; `otp.sendVerifyCodeQuietly` gọi với `(userId, email, res)`).
  - `A13-5: wrong password on an unverified account → 401 invalid-credentials, count incremented, no code`.
  - `A13-6: locked account with the right password, unverified → 403 account-locked`.
  - Sửa `B1#11` (login cấp phiên) để fixture có `emailVerifiedAt` (đã xác nhận).
  - Trong `otp.service.spec.ts`: `sendVerifyCodeQuietly: within the 60 s cooldown → no mail, no throw`.
- [ ] **Step 2: Chạy** `pnpm --filter api test src/identity/auth/auth.service.spec.ts src/identity/auth/otp.service.spec.ts` — Expected: FAIL (403 chưa có, hàm chưa có).
- [ ] **Step 3: Cài.** (Review M2: đọc lại `emailVerifiedAt` **trong** transaction, sau `withUserLock`, không dùng bản đọc ngoài lock; fixture của spec mặc định
  đã xác nhận; `sendVerifyCodeQuietly` cũng nuốt lỗi ngân sách mail 503, nên đăng nhập chưa xác nhận luôn là 403.) Trong transaction của `login`, sau `decideCredential` trả `ok` và trước `startChain`: `user.emailVerifiedAt === null` → trả kết quả
  `unverified` (không tạo chuỗi); ngoài transaction ném 403 `email-not-verified` sau khi gọi `sendVerifyCodeQuietly`. Thứ tự kiểm theo design §4.2.
- [ ] **Step 4: Chạy lại** lệnh Step 2 và `pnpm --filter api test src/identity` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): refuse sign-in until the email is verified`.

### Task 2: Đăng ký không cấp phiên; đăng ký lại vào email chưa xác nhận

**Files:**
- Modify: `apps/api/src/identity/auth/auth.service.ts` (`register`, 40-82), `auth.controller.ts` (`register`)
- Test: `auth.service.spec.ts` (B1#1, B1#2, B1#38), `auth.controller.spec.ts` (33-44, 59-67)

**Interfaces:**
- Produces: `AuthService.register(body: RegisterBody, res: Response): Promise<{ email: string }>`; controller trả `201 { email, verification_required: true }`, không gọi `writeSession`.
- Consumes: `OtpService.tryLimitEmail(email)` (Task 1).

- [ ] **Step 1: Sửa / viết test**:
  - `A13-1: register creates an unverified user and no chain; 201 { email, verification_required: true }; no refresh cookie; code mailed after close` (thay assert
    `toEqual(issued)` của B1#1; controller spec: body không có `access_token`, không `Set-Cookie: refresh_token` cho web, không `refresh_token` cho mobile).
  - `A13-2: email of a verified (or locked) account → 409 email-taken` (sửa B1#2).
  - `A13-2b: email of an unverified active account → same 201; password hash, given/family name, birth date, timezone, terms accepted at/version replaced; live verify_email
    codes invalidated; new code mailed; still one users row`.
  - `A13-2c: re-register within the email cooldown → 201, data replaced, no mail`.
  - `first registration of a new email does not consult the email limiter` (giữ hành vi cũ).
- [ ] **Step 2: Chạy** `pnpm --filter api test src/identity/auth` — Expected: FAIL.
- [ ] **Step 3: Cài**: bỏ `sessions.startChain`; trước khi tạo, tra `users` theo email trong transaction + `withUserLock(tx, existing.id)`: không có → tạo như cũ (giữ bắt
  `P2002` cho trường hợp hai lần đăng ký email mới cùng lúc → 409); có, đã xác nhận hoặc không `active` → 409 `email-taken`; có, chưa xác nhận và `active` → cập nhật
  các trường trên + upsert mật khẩu, huỷ mã `verify_email` còn sống, `tryLimitEmail` ngoài transaction quyết định có hẹn gửi mã hay không. Giữ rate limit IP, ngân sách.
  Review I1, M3:
  - **Đọc lại dòng `users` sau `withUserLock`**, và ghi bằng `updateMany({ where: { id, emailVerifiedAt: null, status: 'active' } })`; `count === 0` (vừa được xác
    nhận ở tab khác) → 409 `email-taken`. Test `A13-2d: verification commits between the read and the lock → 409, password unchanged`.
  - Khi thay dữ liệu: `revokeAllForUser(tx, id, 'reregistered')` (chuỗi phiên có từ trước C13), `failedLoginCount: 0`, `loginLockedUntil: null`; **không** xoá cửa
    sổ khoá OTP (`otpFailureWindow`). Test kèm.
  - Lần đăng ký **đầu tiên** của email mới cũng gọi `tryLimitEmail` (chỉ để đếm, không chặn gửi lần đầu), để "đăng ký rồi gọi `/auth/otp`" không phân biệt được email
    mới với email chưa xác nhận. Sửa test `first registration …` thành `first registration counts the email cooldown and still mails`.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): stop signing in at registration and let unverified emails register again`.

### Task 3: Nhập mã công khai cấp phiên

**Files:**
- Modify: `apps/api/src/identity/auth/otp.schemas.ts`, `otp.controller.ts` (34-44), `otp.service.ts` (bỏ `verifyEmail(user, …)` 139-165), `auth.service.ts` (thêm `verifyEmail`)
- Modify: `apps/api/src/common/config/app-config.ts` (`RateLimitRuleName`, `DEFAULT_LIMITS`)
- Test: `otp.controller.spec.ts` (78-92), `otp.service.spec.ts`, `auth.service.spec.ts`, `common/config/app-config.spec.ts` nếu có test liệt kê luật

**Interfaces:**
- Produces: `verifyEmailSchema = registerSchema.pick({ email: true, client: true, device_label: true }).extend({ code: z.string().max(20) })` (strict);
  `AuthService.verifyEmail(body: VerifyEmailBody, res: Response): Promise<IssuedSession>`; route `POST /v1/auth/verify-email` `@Public()`
  `@RateLimit('auth.verify.ip', 'auth.verify.email')`, 200 + `writeSession(...)` (body token; cookie cho web).
- Consumes: `OtpService.checkInTx(tx, userId, 'verify_email', code)`, `SessionService.startChain(tx, { userId, client, deviceLabel })`.

- [ ] **Step 1: Viết test lỗi** (`auth.service.spec.ts` trừ khi ghi khác):
  - `A13-7: right code → emailVerifiedAt set and a chain started in the same transaction; returns the session`.
  - `A13-8: wrong code → 400 invalid-otp, attempt counted`.
  - `A13-9: 21st failure → 429 rate-limited with Retry-After; lock mail scheduled`.
  - `A13-10: unknown email | not active | already verified → the same 400 invalid-otp body` (một `it.each` ba ca; so body bằng nhau).
  - `A13-11: expired code → 400 invalid-otp`.
  - `email with capitals and spaces → same account` (Review Focus 2).
  - `otp.controller.spec.ts`: `verify-email is public: no token → handled` (thay B1#7), `body { email, code, client } strict, extra key → 400`,
    `A13-12: the route declares @RateLimit with the verify rules` (kiểm metadata của decorator và `DEFAULT_LIMITS`; test harness mock Prisma và spy
    `RateLimiter.hit`, không có limiter thật — review M1). Luật theo email tuỳ câu trả lời I2 của chủ dự án.
- [ ] **Step 2: Chạy** `pnpm --filter api test src/identity/auth src/common/config` — Expected: FAIL.
- [ ] **Step 3: Cài.** Mẫu theo `PasswordService.reset` (`password.service.ts:97-129`): chuẩn hoá email, tìm tài khoản, transaction + `withUserLock`; mọi nhánh không ok
  → `invalid-otp`; ok → `emailVerifiedAt = now` + `startChain`; khoá → 429 + mail khoá (chuyển phần lập mail khoá từ `OtpService.verifyEmail` cũ). Thêm hai luật
  rate limit (Global Constraints). Xoá `OtpService.verifyEmail(user, …)`.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): verify the email without a session and sign in on success`.

### Task 4: Gửi lại mã công khai

**Files:**
- Modify: `otp.schemas.ts` (`otpRequestSchema`), `otp.controller.ts` (`requestOtp`), `otp.service.ts` (`requestVerifyEmail`)
- Test: `otp.controller.spec.ts` (52-57), `otp.service.spec.ts`

**Interfaces:**
- Produces: `otpRequestSchema` nhánh `{ purpose: 'verify_email', email: z.string().max(320) }` (strict); `OtpService.requestVerifyEmail(rawEmail: string, res: Response): Promise<void>`
  theo đúng cách của `requestPasswordReset` (88-106): chuẩn hoá, `limitEmail`, ngân sách, tra tài khoản sau khi trả lời; `issueInTx` tự bỏ qua tài khoản đã xác nhận.

- [ ] **Step 1: Viết test lỗi**: `A13-13: verify_email with an unknown or verified email → 202 {}, nothing mailed`; `verify_email for an unverified account → 202, code mailed
  after close`; `old body { purpose: 'verify_email' } without email → 400`; `same email twice within 60 s → 429` (như nhánh reset); email chữ hoa (Review Focus 2).
- [ ] **Step 2: Chạy** `pnpm --filter api test src/identity/auth` — Expected: FAIL.
- [ ] **Step 3: Cài** theo Interfaces; controller không còn nhánh `req.user`.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): resend the verification code by email`.

### Task 5: Làm mới phiên từ chối tài khoản chưa xác nhận

**Files:**
- Modify: `apps/api/src/identity/sessions/session.service.ts` (`RefreshOutcome` dòng 28-30, `refreshLocked` 140-158)
- Test: `apps/api/src/identity/sessions/session.service.spec.ts`

**Interfaces:**
- Produces: `RefreshOutcome` thêm `reason: 'unverified'`; chuỗi bị thu hồi với `revokeReason: 'unverified'`; ra ngoài vẫn là `invalidToken()` như các lý do khác.

- [ ] **Step 1: Viết test lỗi** `A13-14: refreshing a chain whose user is unverified → rejected, chain revoked with reason unverified, 401 invalid-token`.
- [ ] **Step 2: Chạy** `pnpm --filter api test src/identity/sessions` — Expected: FAIL.
- [ ] **Step 3: Cài**: `include` của `refreshLocked` chọn thêm `emailVerifiedAt`; kiểm ngay sau kiểm `locked`, cùng kiểu `updateMany` thu hồi.
- [ ] **Step 4: Chạy lại** cùng `pnpm --filter api test` (toàn bộ) và `pnpm --filter api lint`, `pnpm --filter api build` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): end sessions of unverified accounts on refresh`.

### Task 6: Script, smoke và admin e2e-real theo luồng mới

**Files:**
- Modify: `apps/api/scripts/learner-test-setup.mjs` (156-178, 148-153), `smoke-buoc-0-3-fixes.mjs` (M2 215-229), `smoke-buoc-2.mjs` (57-107), `smoke-buoc-4.mjs` (104-125),
  `smoke-buoc-5.mjs` (173-220), `smoke-buoc-6.mjs` (174-205), `smoke-buoc-7.mjs` (190-208, 376-378)
- Modify: `apps/admin/e2e-real/support/api.ts` (36-43)

**Interfaces:**
- Consumes: `POST /v1/auth/register` → `{ email }`; mã lấy ở Mailpit như các script đang làm; `POST /v1/auth/verify-email { email, code, client: 'mobile' }` → token (mobile để có
  `refresh_token` trong body như các script đang dùng; nếu script dùng web thì `client: 'web'`).

- [ ] **Step 1:** Trong mỗi file, thay mọi chỗ dùng token trả về từ đăng ký bằng: đăng ký → đọc mã ở Mailpit → `verify-email` công khai → token. Người học trước đây cố ý để
  chưa xác nhận (`registerLearner`) nay cũng xác nhận. `learner-test-setup.mjs` nhánh 409 vẫn `loginToken`; tài khoản cũ chưa xác nhận → 403 thì **đọc mã đăng nhập vừa gửi ở Mailpit**
  (không gọi `/auth/otp` ngay, sẽ dính cooldown 60 s và bị 429 — review M4) rồi nhập mã.
- [ ] **Step 2: Chạy thật** trên DB mới theo cách chạy smoke trong `CLAUDE.md` (API + worker build từ nhánh này, `AI_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true`):
  `pnpm learner:setup -- --admin <email> --learner <email> --plan pro`, rồi `pnpm smoke:buoc-0-3-fixes`, `smoke:buoc-2`, `smoke:buoc-4`, `smoke:buoc-5`
  (`SMOKE_FETCH_STATE=false`), `smoke:buoc-6`, `smoke:buoc-7` (mỗi smoke trên DB mới như hướng dẫn của nó) — Expected: mỗi smoke in dòng tổng kết qua hết như trong
  `docs/deliveries/buoc-*-smoke-output.txt`.
- [ ] **Step 3: Chạy** `pnpm --filter admin test:e2e:real` (theo cách job `admin-e2e-real` dựng stack) — Expected: PASS.
- [ ] **Step 4: Commit** `test: verify accounts through the public code in scripts and admin e2e`.

### Task 7: Kho phiên web: đăng ký không vào app, nhập mã cấp phiên

**Files:**
- Create: `apps/web/src/app-shell/session/pending-email.ts`
- Modify: `apps/web/src/app-shell/session/session-store.ts` (124-142)
- Test: `apps/web/src/app-shell/session/session-store.test.ts` (219-266), `pending-email.test.ts`

**Interfaces:**
- Produces: `readPendingEmail(): string | null`, `writePendingEmail(email: string): void`, `clearPendingEmail(): void` (try/catch, key `wordmet-web.pending-email`);
  `SessionStore.register(body: RegisterBody): Promise<{ email: string }>` (không đổi state); `SessionStore.verifyEmail(email: string, code: string): Promise<void>`
  (`POST /v1/auth/verify-email` với `{ email, code, ...DEVICE }` qua `startSession`); `SessionStore.login` ném `ApiError` với `type: 'email-not-verified'` như lỗi khác.

- [ ] **Step 1: Sửa / viết test**: `register: posts the form and stays signed out, returns the email` (thay 230-258); `verifyEmail: keeps the token and signs in, broadcasts login`;
  bỏ test 219-228 ("unverified email still enters the app"); `login 403 email-not-verified → throws, stays signed out`; `pending-email` đọc / ghi / xoá, chịu được
  `sessionStorage` ném lỗi.
- [ ] **Step 2: Chạy** `pnpm --filter web test src/app-shell/session` — Expected: FAIL.
- [ ] **Step 3: Cài** theo Interfaces.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): sign in only after the email code`.

### Task 8: Form đăng ký và đăng nhập theo luồng mới

**Files:**
- Modify: `apps/web/src/features/learner/auth/RegisterForm.tsx` (33-57), `LoginForm.tsx` (38-50), `apps/web/messages/vi.json`, `en.json` (`email-taken` dòng 892 en)
- Test: `apps/web/src/features/learner/auth/auth.test.tsx` (46-58), `AuthGate.test.tsx` (23-44)

**Interfaces:**
- Consumes: Task 7 (`register` trả `{ email }`, `writePendingEmail`).

- [ ] **Step 1: Sửa / viết test**: `register → writes the pending email → /vi/app/verify-email` (không `?sent=1`); `register 409 email-taken → the new hint with Forgot password`;
  `login 403 email-not-verified → writes the pending email → /vi/app/verify-email?next=<next>`; AuthGate: đăng ký trên trang không vào `signed-in`.
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner/auth` — Expected: FAIL.
- [ ] **Step 3: Cài**; chữ `email-taken` mới (design §8).
- [ ] **Step 4: Chạy lại** cùng `pnpm --filter web test src/i18n` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): send new and unverified accounts to the code page`.

### Task 9: Trang nhập mã không cần phiên; bỏ lời mời ở Cài đặt

**Files:**
- Move: `apps/web/src/app/[locale]/app/(member)/verify-email/page.app.tsx` → `apps/web/src/app/[locale]/app/(auth)/verify-email/page.app.tsx`
- Modify: `apps/web/src/features/learner/auth/VerifyEmailForm.tsx`, `apps/web/src/app-shell/RequireSession.tsx` (16, 57-75), `apps/web/src/features/learner/settings/SettingsPage.tsx` (91-97),
  `messages/vi.json`, `en.json`
- Test: `auth.test.tsx` (153-206), `RequireSession.test.tsx` (105-118), `SettingsPage` test hiện có

**Interfaces:**
- Consumes: Task 7 (`verifyEmail`, `readPendingEmail`, `clearPendingEmail`), `POST /v1/auth/otp { purpose: 'verify_email', email }`.

- [ ] **Step 1: Sửa / viết test** (`auth.test.tsx`):
  - `reads the pending email and shows it; no email → shows an email field (A13-15)`.
  - `submit → verifyEmail(email, code) → clears the pending email → /vi/app/welcome when no language, else next or /vi/app`.
  - `invalid-otp → the new wrong-code text (design §8)`; `429 → wait text with seconds` (như hiện nay).
  - `resend posts { purpose: 'verify_email', email } and restarts the 60 s countdown`; `no auto-send on open`.
  - `"Typed the wrong email?" link clears the pending email and goes to register (A13-16)`.
  - `opened while signed in → AuthGate sends to the app`.
  - Review Focus 3: `submitting an old code after another tab verified → invalid-otp text, stays on the page`.
  - `A13-19: double submit → one verify call (useSubmitOnce)`.
  - Review Focus 1: `refresh 401 on load → signed-out → login page` (thêm vào `RequireSession.test.tsx` nếu chưa có ca này).
  - `RequireSession`: `signed-in with email_verified false → /vi/app/verify-email`.
  - `SettingsPage`: không còn nút mời xác nhận.
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner/auth src/app-shell src/features/learner/settings` — Expected: FAIL.
- [ ] **Step 3: Cài**; chữ mới design §8 (dòng "Bạn cần xác nhận…" khi tới từ đăng nhập, mã sai, link email khác); `NO_LANGUAGE_PAGES` bỏ `verify-email`. Review M5:
  - Đăng nhập chuyển sang `/app/verify-email?reason=login&next=…` (không có email trên URL); trang dùng `reason=login` để hiện dòng "Bạn cần xác nhận…".
  - Chữ "mã sai" của trang này là key **riêng** (không sửa key `invalid-otp` dùng chung với trang đặt lại mật khẩu).
  - Sau khi chuyển sang nhóm `(auth)`, trang chỉ còn một khung `AppShell` (khung của nhóm `(auth)`); kiểm không có hai khung lồng nhau.
  - Tab khác đăng nhập xong (BroadcastChannel `login`) → trang nhập mã thấy `signed-in` và đưa vào app. Thêm test.
- [ ] **Step 4: Chạy lại** cùng `pnpm --filter web test`, `pnpm --filter web lint`, `pnpm --filter web typecheck` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): verify the email from a signed-out page`.

### Task 10: e2e và chạy thật của PR 1

**Files:**
- Modify: `apps/web/e2e/app/m1.spec.ts` (10-48, 94-117), `apps/web/e2e/support/mock-api.ts`
- Modify: `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md` (mục mới "Đợt cải thiện A — xác nhận email")

- [ ] **Step 1: Sửa e2e**: `sign-up → code → language → Today` theo luồng mới (đăng ký trả `{ email, verification_required }`, nhập mã trả token); `sign-in unverified → code page
  → Today`; `verify-email` chuyển khỏi `MEMBER_PAGES` sang danh sách trang khi chưa đăng nhập; axe + không cuộn ngang × vi/en × sáng/tối × 1440/390.
- [ ] **Step 2: Chạy** `pnpm cf:docker` (Windows) hoặc `pnpm test:e2e` (Linux) ở `apps/web` — Expected: PASS cả bộ.
- [ ] **Step 3: Chạy thật** (API + worker + Postgres + Redis + Mailpit, DB mới, web `pnpm dev:app`): đăng ký → mã ở Mailpit → vào app; đăng xuất, đăng ký tài khoản thứ hai, đóng tab
  trước khi nhập mã, đăng nhập lại → trang nhập mã → vào app. Ghi các bước vào test flow.
- [ ] **Step 4: Commit** `test(web): cover the verification-first sign-up and sign-in`; push, mở PR vào `dev`.

---

## PR 2 — A-C14: thêm từ từ trang nhóm (phiên 2, nhánh `feat/dot-cai-thien-a-group-add`)

### Task 11: Tấm Thêm từ khoá nhóm

**Files:**
- Modify: `apps/web/src/features/learner/add-word/add-word-context.tsx`, `AddWordSheet.tsx` (39, 59-60, 89, 107-125), `EditSuggestionForm.tsx` (ô "Lưu vào nhóm"), `messages/*.json`
- Test: `apps/web/src/features/learner/add-word/add-word.test.tsx`, `m5b-review.test.tsx`

**Interfaces:**
- Produces: `type AddWord = { open: (word?: string, opts?: { groupId?: string }) => void; setScope: (groupId: string | null) => void }`;
  `useAddWordScope(groupId: string | null): void` (đặt khi mount, xoá khi unmount); khi mở: `opts.groupId ?? scope` thành prop
  `AddWordSheet({ initialWord?, lockedGroupId?, onClose })`. Phím N dùng `scope`.
- Khi `lockedGroupId`: không render `GroupPicker`; dòng "Lưu vào nhóm: {name}"; nhóm lưu = `lockedGroupId`; nghĩa có trong
  `useGroupQueue(lockedGroupId, 'all')` (cùng query key với trang nhóm) hiện "Đã có trong nhóm" thay cho nút chọn.

- [ ] **Step 1: Viết test lỗi**: `A14-1: locked → quick-add posts group_id of the locked deck; toast; closes`; `A14-2: a sense already in the deck shows "Already in this deck" and cannot
  be picked`; `A14-3: AI suggestion → edit before saving shows the fixed deck line, saves to it`; `A14-5: group-full keeps the sheet open`; `A14-6: 404 deck → "This deck no longer
  exists." with close`; `A14-4: with a scope set, key N opens locked`; `without scope: unchanged (last group preselected)` (A14-9).
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner/add-word` — Expected: FAIL.
- [ ] **Step 3: Cài** theo Interfaces; chữ design §8. Review M6: 404 của `quick-add` chỉ hiện "Nhóm này không còn." khi `type` của Problem Details cho biết là
  nhóm (đọc `type` thật trong `apps/api/src/learning/**` lúc cài); 404 vì nghĩa không còn thì dùng thông báo lỗi chung hiện có.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add words to a fixed deck`.

### Task 12: Nút trên trang nhóm và thêm cả loạt theo chủ đề

**Files:**
- Modify: `apps/web/src/features/learner/groups/GroupPage.tsx` (57, 101-137), `TopicPickerPage.tsx` (38-39, 90), `add-word/AddWordSheet.tsx` (dòng "Thêm nhiều từ theo chủ đề"), `messages/*.json`
- Test: `groups/group-page.test.tsx`, `groups/topic-picker.test.tsx`, `add-word/add-word.test.tsx`
- Create: `apps/web/e2e/app/cai-thien-a-group.spec.ts`

**Interfaces:**
- Consumes: Task 11 (`useAddWordScope`, `open(word, { groupId })`); `GET /v1/topics`. Gọi `useAddWordScope(id)` trong `GroupBody` (nơi có id nhóm đã nạp), không
  trong `GroupPage` (review M6).
- Produces: `TopicPickerPage` đọc `params.get('group')`: id có trong `groups` → `target` mặc định; không có → như hiện nay (A14-8). Link:
  `/{locale}/app/topic?code=<code>&level=<level>&group=<id>`.

- [ ] **Step 1: Viết test lỗi**: `group page shows [Add word] and opens the sheet locked to this deck`; `phone: the + button opens it locked` (AppShell `fab`); `group page sets the scope;
  leaving clears it`; `sheet (locked): "Add several words by topic" → pick topic and level → See words → /vi/app/topic?code=…&level=…&group=<id>`; `A14-7: topic picker with
  group=<id> targets that deck`; `A14-8: unknown group id → current default`.
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner/groups src/features/learner/add-word` — Expected: FAIL.
- [ ] **Step 3: Cài.**
- [ ] **Step 4: e2e** `cai-thien-a-group.spec.ts`: thêm `deploy` từ trang nhóm; "Đã có trong nhóm"; thêm cả loạt qua chủ đề; axe + không cuộn ngang × vi/en × sáng/tối × 1440/390.
  Chạy `pnpm cf:docker` / `pnpm test:e2e` — Expected: PASS.
- [ ] **Step 5: Chạy thật** với `learner:setup` (người học có nhóm): A14-1, A14-2, A14-7 trên giao diện; ghi mục "Đợt cải thiện A — thêm từ từ nhóm" vào test flow.
- [ ] **Step 6: Commit** `feat(web): add words from the deck page`; push, mở PR vào `dev`.

---

## PR 3 — fix "Xem đáp án" (phiên 3, nhánh `fix/cloze-reveal-before-try`)

### Task 13: Bỏ qua câu điền từ trước lần thử đầu

**Files:**
- Modify: `apps/api/src/practice/answers/answers.service.ts` (93-105)
- Test: `apps/api/src/practice/answers/answers.service.spec.ts` (hoặc file spec đang test `skip`)

**Interfaces:**
- Produces: `skip` cho `cloze` khi `tries === 0`: `writeFinal(tx, item, { result: 'wrong', answerRaw: null, answerNormalized: null, answersTried: [], tries: 0, skipped: true })`
  (review M7: không có lần gõ nào thì lưu `null`; kiểm cột và kiểu của `writeFinal` cho phép `null`, không thì dừng và báo);
  `type_word` với `tries === 0` vẫn 409 `skip-not-allowed`.

- [ ] **Step 1: Viết test tái hiện** `cloze skipped before any try → wrong result with the answer shown (K/78a)` và giữ `type_word skipped before any try → 409 skip-not-allowed`.
- [ ] **Step 2: Chạy** `pnpm --filter api test src/practice/answers` — Expected: FAIL với 409 `skip-not-allowed` (xác nhận lỗi có thật). **Nếu test không fail, dừng và báo lại:
  lỗi trong design §6.1 không có thật.**
- [ ] **Step 3: Commit** `test(api): reproduce the cloze reveal before any try`.
- [ ] **Step 4: Cài** theo Interfaces; kiểm `resultOf` / view không giả định có câu đã gõ.
- [ ] **Step 5: Chạy lại** cùng `pnpm --filter api test src/practice` — Expected: PASS.
- [ ] **Step 6: Commit** `fix(api): allow showing the cloze answer before any try`; push, mở PR vào `dev`.

---

## PR 4 — A-luyện tập: C15, C16 + C2, C3 (phiên 3, nhánh `feat/dot-cai-thien-a-practice`, cắt sau khi PR 3 merge)

### Task 14: Chữ thứ tự

**Files:**
- Modify: `apps/web/messages/vi.json` (1075-1084), `en.json` (1075-1084)
- Test: test hiện có của `CustomizeDialog` nếu khẳng định chữ thứ tự

- [ ] **Step 1:** Đổi 5 key `App.practice.customize.sorts.{level_asc, overdue_first, new_first, least_practiced, most_wrong}` theo design §6.2; giữ `queue`, `random`,
  `priority_oldest`.
- [ ] **Step 2: Chạy** `pnpm --filter web test src/i18n src/features/learner/practice` — Expected: PASS (sửa test nào khẳng định chữ cũ).
- [ ] **Step 3: Commit** `feat(web): shorten the practice order labels`.

### Task 15: Hai nút sau khi trả lời

**Files:**
- Modify: `apps/web/src/features/learner/practice/session/AnswerFeedback.tsx`, `PracticeSession.tsx` (47-106), `messages/*.json` (`App.practice.session.*`)
- Test: `practice-session.test.tsx`, `ai-questions.test.tsx`, `ai-states.test.tsx`, `apps/web/e2e/app/m4.spec.ts`, `m5a.spec.ts`

**Interfaces:**
- Produces: `feedbackCase(result: AnswerResult): 1 | 2 | 3 | 4` trong `AnswerFeedback.tsx` (export để test): 1 = `correct && show_known`; 3 = `correct && hint_level > 0`;
  2 = `correct` còn lại; 4 = `wrong && highlight_needs_review`; `wrong` mà không `highlight_needs_review` (từ không còn trong nhóm) → chỉ **[Câu tiếp]** (review M7).
  Nút chính: 1 → `onReview('known')`; 2, 3 → `onNext()`; 4 → `onReview('needs_review')`. Phím: Enter = nút chính; 1 = Cần ôn lại; 2 = Đã biết chỉ ở trường hợp 1.
  Sửa luôn chữ phím tắt của Enter trong phiên. Thêm test: kết quả sau "Xem đáp án" (PR 3) hiện trường hợp 4; axe trên màn kết quả đã đổi (review M8).

- [ ] **Step 1: Viết / sửa test** (`practice-session.test.tsx`; A16-5 lỗi mạng và A16-6 `known-not-allowed` giữ test hiện có): `A16-1` (TH1, Enter → review known → next); `A16-2` (TH4, Enter → review needs_review → next); `A16-3` (TH4,
  [Next question] → next only); `A16-4` (TH2, TH3, Enter → next only); `A16-7` (focus on the secondary button + Enter → that button); Review Focus 4: `held Enter (repeat)
  → one review and one next per question`; ghi chú đúng theo trường hợp (design §8). Sửa các test đang ghim ba nút (code facts B.7).
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner/practice` — Expected: FAIL.
- [ ] **Step 3: Cài**; bỏ `noteRight`, `noteRightNoKnow`, thêm hai ghi chú mới, sửa `noteWrong`.
- [ ] **Step 4: Chạy lại** — Expected: PASS. Sửa `m4.spec.ts`, `m5a.spec.ts` (chỗ bấm / Enter ở code facts B.7), chạy e2e — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): two buttons after each practice answer`.

### Task 16: Câu `own` không cần quyền AI (API)

**Files:**
- Modify: `apps/api/src/practice/ai/ai-session-planner.service.ts` (`gate`, 42-44), `apps/api/src/practice/sessions/sessions.service.ts` (`ruleTypesOf`, 483-488)
- Test: `ai-session-planner.service.spec.ts` (61-65 B7E1), `sessions.ai.spec.ts` (325 B7E123)

**Interfaces:**
- Produces: `gate` chỉ đòi `ai.practice` khi `types.some((type) => isAiType(type, clozeSource))`; `ruleTypesOf` không còn bỏ `cloze` theo `ai.practice` (câu `own` là luật).

- [ ] **Step 1: Sửa / viết test**: `A3-1: Free with ['cloze'] own and a rule type → session opens, aiPlanned 0` (thay B7E1 phần own); `Free with ['cloze'] ai → still 403 entitlement-required`;
  `A3-4: own cloze stays after ai.practice is lost mid-session` (thay B7E123); `A3-3: Pro with own + meaning_in_sentence → only meaning_in_sentence charged`.
- [ ] **Step 2: Chạy** `pnpm --filter api test src/practice` — Expected: FAIL.
- [ ] **Step 3: Cài**; sửa chú thích của `gate` và `ruleTypesOf` (bỏ "cloze from saved sentences too"). Sửa luôn test B7E4 (`ai-session-planner.service.spec.ts:67`,
  `:138`) nếu nó khẳng định câu `own` cần `ai.practice` (review M7).
- [ ] **Step 4: Chạy lại** cùng `pnpm --filter api test`, `lint`, `build` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): open saved-sentence cloze to every plan`.

### Task 17: Công tắc "Điền từ vào câu bạn đã lưu" (web)

**Files:**
- Create: `apps/web/src/features/learner/practice/OwnSentencesToggle.tsx`
- Modify: `CustomizeDialog.tsx` (81, 106, 139-150, 199), `AiTypesToggle.tsx` (ô "Điền từ" khi `own` bật), `practice-api.ts` (`StartBody`, 34-42, chú thích 13), `messages/*.json`
- Test: `ai-toggle.test.tsx` (83-97), `customize` test hiện có
- Modify: `apps/web/e2e/app/m5a.spec.ts` hoặc thêm vào `cai-thien-a-practice.spec.ts` (Create)

**Interfaces:**
- Produces: `StartBody.cloze_source?: 'own'`; `OwnSentencesToggle({ on, onChange })` (localStorage key `wordmet-web.own-sentences`, try/catch như `AiTypesToggle`); bật →
  `types` có `cloze`, body có `cloze_source: 'own'`; `AiTypesToggle` nhận `ownOn: boolean`: khi true, ô `cloze` tắt và mờ + dòng "Fill-in uses your saved sentences…".

- [ ] **Step 1: Viết / sửa test**: `Free: the own switch is enabled; start sends types with cloze and cloze_source own` (A3-1); `Free, only own, API 409 no-word-fits-types → the existing
  message` (A3-2); `Pro, AI on + own on → AI cloze box off and dimmed with the line; body has cloze_source own and the other AI types` (A3-3); `own off → AI cloze box back to the
  learner's earlier choice`; `switch state remembered on this device`. Thay test "never cloze_source".
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner/practice` — Expected: FAIL.
- [ ] **Step 3: Cài**; chữ design §8. Review M7: sửa luôn `noTypes` (chỉ bật công tắc mới cũng tính là đã chọn kiểu câu) và `aiUsage` (câu `own` không tính lượt AI)
  trong `CustomizeDialog.tsx`.
- [ ] **Step 4: Chạy lại**; e2e (Tùy chỉnh phiên với công tắc mới, gói Miễn phí và Pro; axe + không cuộn ngang × vi/en × sáng/tối × 1440/390) — Expected: PASS.
- [ ] **Step 5: Chạy thật**: người học Miễn phí có câu đã lưu → phiên có câu điền từ từ câu đã lưu; "Xem đáp án" trước lần thử (PR 3) trên câu đó; hai nút sau khi trả lời. Ghi
  mục "Đợt cải thiện A — Luyện tập" vào test flow.
- [ ] **Step 6: Commit** `feat(web): practise with your saved sentences on every plan`; push, mở PR vào `dev`.

---

## PR 5 — A-C1: nút loa (phiên 3, nhánh `feat/dot-cai-thien-a-speak`, cắt sau khi PR 4 merge)

### Task 18: Component đọc

**Files:**
- Create: `apps/web/src/app-ui/speech.ts`, `apps/web/src/app-ui/SpeakButtons.tsx`
- Test: `apps/web/src/app-ui/speech.test.ts`, `SpeakButtons.test.tsx`

**Interfaces:**
- Produces: `useVoices(): { uk: SpeechSynthesisVoice | null; us: SpeechSynthesisVoice | null; usLocal: SpeechSynthesisVoice | null; ready: boolean }` (chọn theo `lang`
  bắt đầu bằng `en-GB` / `en-US`, ưu tiên `localService`; nghe `voiceschanged`; không có `speechSynthesis` → tất cả null); `speak(text: string, voice: SpeechSynthesisVoice): void`
  (`cancel()` rồi `speak`); `<SpeakWord text />` (hai nút UK · US, nút nào thiếu giọng thì ẩn); `<SpeakSentence text private? />` (một nút US; `private` → chỉ `usLocal`).
  Nút: `onKeyDown` chặn lan Space / 1 / 2 lên phiên ôn; `aria-label` theo design §8.

- [ ] **Step 1: Viết test lỗi** với `speechSynthesis` giả: `A1-1` (UK đọc bằng giọng en-GB trên máy); `A1-2` (không en-GB → không nút UK); `A1-3` (không giọng tiếng Anh → không nút);
  Review Focus 5 (`getVoices()` rỗng mãi → không nút, không lỗi); `A1-4` (bấm khi đang đọc → `cancel` trước); `A1-5` (chỉ giọng từ xa → `SpeakSentence private` không render,
  `SpeakWord` vẫn có); `A1-7` (`voiceschanged` tới sau → nút hiện); `A1-6` (Space trên nút không lan ra ngoài).
- [ ] **Step 2: Chạy** `pnpm --filter web test src/app-ui` — Expected: FAIL.
- [ ] **Step 3: Cài** theo Interfaces; chỉ chạy ở client.
- [ ] **Step 4: Chạy lại** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add pronunciation buttons`.

### Task 19: Gắn nút loa vào trang từ, thẻ ôn, kết quả luyện tập

**Files:**
- Modify: `apps/web/src/features/learner/word/WordPage.tsx` (67), `SenseBlock.tsx` (83), `LearningBlock.tsx` (39-43), `SavedSentencesDialog.tsx` (72),
  `apps/web/src/features/learner/review/Flashcard.tsx` (40, 53, 68-83), `practice/session/AnswerFeedback.tsx` (28), `messages/*.json`
- Test: test hiện có của các component trên; Create `apps/web/e2e/app/cai-thien-a-speak.spec.ts`

**Interfaces:**
- Consumes: Task 18. Câu đã lưu dùng `<SpeakSentence private />`; câu ví dụ của kho dùng `<SpeakSentence />`.

- Review I3: mặt trước thẻ ôn **cả mặt là một nút lật** (`Flashcard.tsx:36-40`). Nút loa phải nằm **ngoài** nút lật (ví dụ cùng hàng `Badges`, tách khỏi `<button
  onClick={onFlip}>`); không lồng nút trong nút (axe `nested-interactive`), bấm loa không lật thẻ.
- [ ] **Step 1: Viết test**: mặt trước thẻ ôn: nút loa không nằm trong nút lật, bấm loa không gọi `onFlip`; trang từ có `SpeakWord` cạnh lemma, `SpeakSentence` cạnh ví dụ và câu đã lưu (private); thẻ ôn hai mặt có `SpeakWord`, mặt sau có câu; kết quả luyện tập có
  `SpeakWord` **chỉ sau khi chấm**; câu hỏi trước khi chấm không có loa.
- [ ] **Step 2: Chạy** `pnpm --filter web test src/features/learner` — Expected: FAIL.
- [ ] **Step 3: Cài.**
- [ ] **Step 4: e2e** với `speechSynthesis` giả cài bằng `page.addInitScript` (ghi lại lời gọi): bấm UK / US ở trang từ, thẻ ôn, kết quả luyện tập; axe + không cuộn ngang × vi/en × sáng/tối ×
  1440/390. Chạy — Expected: PASS.
- [ ] **Step 5: Chạy thật** trên Windows (Edge và Chrome): nghe được UK và US ở trang từ; ghi máy nào có / không có `en-GB` vào test flow (mục "Đợt cải thiện A — nút loa").
- [ ] **Step 6: Commit** `feat(web): pronounce words and sentences`; push, mở PR vào `dev`.

---

## Task 20: Đóng đợt (sau khi PR 1–5 merge)

**Files:**
- Modify: `docs/deliveries/dot-cai-thien-a.md` (mục "as-built" nối sau "plan tóm tắt"); output smoke `docs/deliveries/dot-cai-thien-a-smoke-output.txt`
- Modify: `CLAUDE.md` (một dòng trỏ sang delivery), `docs/preparation/IMPROVEMENT_IDEAS_2026-10-23.md` (trạng thái C1, C2, C3, C13–C16)

- [ ] **Step 1:** Trên `dev` đã merge, DB mới: chạy `pnpm smoke:buoc-7` và các smoke đã sửa ở Task 6; lưu output.
- [ ] **Step 2:** Viết as-built (PR, số test, khác plan, Minor để lại) và cập nhật các file trên.
- [ ] **Step 3: Commit** `docs: record the group a improvements as built` trên nhánh `docs/dot-cai-thien-a-as-built`; push, mở PR vào `dev`.
