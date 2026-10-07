# Bước 1 — Identity Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Bước 0's fake `RequestUser` seam with real identity: registration, password login, OTP email verification, password change/reset, rotating refresh-token sessions (mobile body + web cookie), profile, and staff roles with permissions.

**Architecture:** A new `IdentityModule` under `apps/api/src/identity/` owns its own Prisma models (`prisma/models/identity.prisma`) and exports only `IdentityService` plus the auth decorators. A global `AuthGuard` verifies HS256 JWTs (via `jose`) without touching the DB; refresh tokens rotate by compare-and-set in Postgres. Every time comparison goes through an injectable `Clock`, every outbound mail goes through a `Mailer` port, and every app (server and e2e test) is configured by one `configureApp()` so tests run the real bootstrap.

**Tech Stack:** NestJS 12 (ESM), Prisma 7.10.0 + `@prisma/adapter-pg`, Postgres 17, Vitest 4 + Testcontainers, `jose` 6.2.12, `argon2` 0.45.1, `nodemailer` 10.0.15, `cookie-parser` 1.4.7, `zod` 4.6.5, Mailpit (`axllent/mailpit`) for local SMTP.

**Spec:** [`docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md`](../specs/2026-10-07-buoc-1-identity-core-design.md) (decisions D1–D13, criteria `B1#1–B1#33`, edge cases `B1E1–B1E31`). Option trade-offs: [`../decisions/2026-10-07-buoc-1-identity-core-decisions.md`](../decisions/2026-10-07-buoc-1-identity-core-decisions.md). Every test name below starts with the `B1#`/`B1E#` it proves.

## Global Constraints

- All paths are under `apps/api/` unless they start with `docs/` or are repo-root files. Run commands from `apps/api/` (`pnpm test`, `pnpm test:e2e`) unless stated.
- ESM: relative imports end in `.js`. JSON fields are `snake_case`. Every route is under `/v1`.
- Pin new dependencies exactly (no `^`): `jose@6.2.12`, `argon2@0.45.1`, `nodemailer@10.0.15`, `cookie-parser@1.4.7`, `zod@4.6.5`; dev: `@types/nodemailer`, `@types/cookie-parser` (exact current versions). Prisma stays `7.10.0`.
- Module boundary (D3): only `src/identity/**` reads/writes Identity tables; other code calls `IdentityService`. No Prisma `@relation` between models of different modules.
- Never compare against Postgres `now()` for expiry/locks/windows: compute with `Clock.now()` in code and pass the value in (design §8).
- Errors are Problem Details; `type` = `config.problemTypeBase + slug` with the slugs of design §7. Never return 500 for bad client input.
- Logs never contain a password, OTP code, access/refresh token, cookie value, raw IP, or the plain email of a failed sign-in/reset (B1#32). Every log line carries `operation_id`.
- Fixed numbers (design §4–§6): Argon2id `memoryCost 19456`, `timeCost 2`, `parallelism 1`; access token 900 s; refresh token 32 random bytes base64url; grace 10 s; idle 90 days; absolute 365 days; max 10 active chains; OTP 6 digits, 10 min, 5 attempts/code, 20 failures/24 h → lock 24 h; login lock after 10 failures for 15 min; mail budget default 1500/day, warn at 80 %; SMTP timeout 10 s; Argon2 semaphore 4; email ≤ 254; password 8–128 code points after NFC; `device_label` ≤ 100.
- Prisma TypedSQL (`prisma generate --sql`) needs a live migrated DB: `docker compose up -d postgres` then `pnpm db:setup` (Task 1). Generated output stays git-ignored.
- Commit after every task on `feat/buoc-1-identity-impl`, Conventional Commits, ending with the `Co-Authored-By` line. Never push without being asked.

## Review Focus

1. **Email typed differently at login** (`"  Foo@Example.COM "` after registering `foo@example.com`) must sign in — test added to Task 10.
2. **Two registrations for the same new email at the same instant** must create exactly one user and one 409, never a 500 — test added to Task 10.
3. **Malformed request bodies** (invalid JSON, `email: 42`, missing fields, extra fields) must give 400 `validation-failed`, never 500 — test added to Task 2 (invalid JSON) and Task 10 (wrong types).
4. **A refresh request carrying both a body token and a cookie** must take the body (mobile) path deterministically — test added to Task 8.
5. **A valid access token whose user row no longer exists** (DB restored/cleaned) must give 401 on `GET /v1/me`, not 500 — test added to Task 12.

---

### Task 1: Local infrastructure, dependencies and multi-file Prisma schema

**Files:**
- Create: `docker-compose.yml` (repo root), `apps/api/.env.example`, `apps/api/prisma/models/common.prisma`, `apps/api/test/support/mailpit.ts`, `apps/api/test/mailpit-container.e2e-spec.ts`
- Modify: `apps/api/prisma/schema.prisma` (keep only `generator` + `datasource`), `apps/api/prisma.config.ts` (`schema: 'prisma'`), `apps/api/package.json`, `CLAUDE.md` (module-boundary convention D3, Bước 1 in progress)

**Interfaces:**
- Produces: `startMailpit(): Promise<{ smtpHost: string; smtpPort: number; apiUrl: string; stop(): Promise<void> }>` and `listMailpitMessages(apiUrl: string): Promise<Array<{ to: string; subject: string; text: string }>>` in `test/support/mailpit.ts`.

- [ ] **Step 1:** Add `docker-compose.yml` with `postgres:17` (port 5432, db `english_learning`, user/password `dev`/`dev` — local only) and `axllent/mailpit` (SMTP 1025, UI/API 8025). Add `.env.example` with every variable of design §7 filled with local values (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, generated-looking placeholders for keys, e.g. `JWT_KEYS=k1:<base64url 32 bytes>`).
- [ ] **Step 2:** Install the pinned dependencies from Global Constraints with `pnpm --filter api add -E ...`.
- [ ] **Step 3:** Move `IdempotencyKey` and `RateLimitCounter` from `schema.prisma` to `prisma/models/common.prisma`; set `schema: 'prisma'` in `prisma.config.ts` (B1E31).
- [ ] **Step 4:** Verify the move lost nothing: `docker compose up -d postgres`, `DATABASE_URL=postgresql://dev:dev@localhost:5432/english_learning pnpm db:setup`, then `pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma --script` prints no statements, and `grep -c "idempotencyKey" src/generated/prisma/client.d.ts` (or the generated models file) is ≥ 1.
- [ ] **Step 5: Write the failing test** `test/mailpit-container.e2e-spec.ts`: `it('mailpit accepts SMTP and exposes the message over its API')` — start via `startMailpit()`, send one message with a bare `nodemailer.createTransport({ host, port, secure: false })`, then `expect(await listMailpitMessages(apiUrl)).toEqual([expect.objectContaining({ to: 'a@example.com', subject: 'ping' })])`.
- [ ] **Step 6:** Run `pnpm test:e2e -- mailpit-container` → FAIL (helper missing). Implement `test/support/mailpit.ts` with Testcontainers `GenericContainer('axllent/mailpit')`, exposed ports 1025/8025, wait for HTTP `GET /api/v1/messages` 200, startup timeout 30 s; `listMailpitMessages` maps Mailpit's `/api/v1/messages` + `/api/v1/message/{ID}` JSON to `{ to, subject, text }`. Run again → PASS. If the image cannot start under Testcontainers, stop and report (design §14 ASSUMPTION).
- [ ] **Step 7:** Add to `CLAUDE.md`: the D3 convention (one `.prisma` file per module, no cross-module relations, cross-module calls via exported service) and "Bước 1 implementation in progress on `feat/buoc-1-identity-impl`"; replace the stale "branches not merged/pushed" open decision with "Bước 0 and the Bước 1 design are on `main` (PR #1, #2)".
- [ ] **Step 8:** `pnpm test && pnpm test:e2e` → 5 unit + 25 e2e pass. Commit `chore(api): add local infra, identity deps and multi-file prisma schema`.

### Task 2: Config, Clock, request context, Problem Details and shared bootstrap

**Files:**
- Create: `src/common/config/app-config.ts`, `src/common/config/app-config.spec.ts`, `src/common/clock/clock.ts`, `src/common/logging/request-context.ts`, `src/app.setup.ts`, `test/support/test-config.ts`, `test/support/create-test-app.ts`, `test/app-setup.e2e-spec.ts`
- Modify: `src/main.ts`, `src/app.module.ts`, `src/common/problem-details/problem-details.exception.ts`, `src/common/problem-details/problem-details.filter.ts` (+ its spec), `src/common/logging/operation-id.middleware.ts`, `src/common/logging/redacting-logger.service.ts` (+ spec), `test/health.e2e-spec.ts`, `test/request-user-not-wired-by-default.e2e-spec.ts`

**Interfaces:**
- Produces:
  - `interface AppConfig { databaseUrl: string; jwt: { keys: Array<{ kid: string; secret: Uint8Array }>; issuer: string; audience: string; accessTtlSeconds: number }; otpHmacKey: Buffer; rateLimitHmacKey: Buffer; refreshGraceKey: Buffer; smtp: { host: string; port: number; user?: string; pass?: string; from: string; secure: boolean }; mailDailyBudget: number; mailBudgetKey: string; trustProxy: boolean; corsOrigins: string[]; problemTypeBase: string; maintenanceEnabled: boolean; limits: Record<RateLimitRuleName, RateLimitRuleConfig> }`, `loadConfig(env: NodeJS.ProcessEnv): AppConfig` (zod; throws one error naming every missing/invalid variable; secrets must decode to ≥ 32 bytes), `APP_CONFIG` injection token. `RateLimitRuleName`/`RateLimitRuleConfig`/`DEFAULT_LIMITS` are declared in `app-config.ts` and filled in Task 3.
  - `abstract class Clock { abstract now(): Date }`, `class SystemClock`, `class FakeClock { constructor(start?: Date); set(d: Date): void; advance(ms: number): void }` — `Clock` is the DI token.
  - `getOperationId(): string | undefined` (AsyncLocalStorage set by `operationIdMiddleware`); `RedactingLoggerService.log()` adds `operation_id` automatically and also redacts keys matching `cookie|authorization`.
  - `ProblemDetailsOptions` gains `extensions?: Record<string, unknown>` (spread into the body) and `retryAfterSeconds?: number` (filter sets `Retry-After`). `type` is a slug; `new ProblemDetailsFilter(problemTypeBase?: string)` renders `base + slug`, or `about:blank` when either is absent. Nest `HttpException`s whose status is 400 (body-parser JSON errors, `StandardSchemaValidationPipe`) render as slug `validation-failed` with `extensions.violations: string[]` taken from the exception's message list.
  - `AppModule.forRoot(config: AppConfig): DynamicModule` (provides `APP_CONFIG`, `Clock` → `SystemClock`, `PrismaModule.forRoot({ connectionString: config.databaseUrl })`).
  - `configureApp(app: NestExpressApplication, config: AppConfig): void` — `setGlobalPrefix('v1')`, `useGlobalFilters(new ProblemDetailsFilter(config.problemTypeBase))`, `useGlobalPipes(new StandardSchemaValidationPipe())`, `use(cookieParser())`, `set('trust proxy', config.trustProxy)`, `enableCors({ origin: config.corsOrigins, credentials: true, allowedHeaders: ['Authorization', 'Content-Type', 'X-CSRF-Protection'] })`.
  - `testConfig(overrides?: Partial<AppConfig>): AppConfig` (random keys, `inject('databaseUrl')`, `mailBudgetKey: randomUUID()`, every `ip` limit raised to 10 000 — B1E24, `maintenanceEnabled: false`); `createTestApp(opts?: { config?: Partial<AppConfig> }): Promise<TestApp>` where `TestApp = { app: NestExpressApplication; http: ReturnType<typeof request>; clock: FakeClock; prisma: PrismaClient; close(): Promise<void> }` — builds `AppModule.forRoot(testConfig(...))`, overrides `Clock` with a `FakeClock`, runs `configureApp`. Later tasks add fields (`mailer`, `logs`).

- [ ] **Step 1: Write failing unit tests** `app-config.spec.ts`: `it('rejects a missing JWT_KEYS and names it')` → `expect(() => loadConfig({...valid, JWT_KEYS: undefined})).toThrow(/JWT_KEYS/)`; `it('rejects a secret shorter than 32 bytes')`; `it('parses JWT_KEYS "k1:<b64>,k0:<b64>" in order, first key signs')` → `keys.map(k => k.kid)` equals `['k1','k0']`. Extend `problem-details.filter.spec.ts`: `it('renders base + slug, extensions and Retry-After')` → body `type === 'urn:test:problems/email-taken'`, `body.violations` present, header `Retry-After: '7'`; `it('maps a 400 HttpException with a message array to validation-failed')`.
- [ ] **Step 2:** `pnpm test` → FAIL. Implement the interfaces above.
- [ ] **Step 3: Write failing e2e** `test/app-setup.e2e-spec.ts` using `createTestApp()`: `it('Review Focus #3: invalid JSON body returns 400 validation-failed problem+json')` (POST `/v1/sample` with raw body `{"a":` and `Content-Type: application/json`) → status 400, `content-type` contains `application/problem+json`, `body.type` ends with `validation-failed`, `body.operation_id` defined; `it('logs carry operation_id')` — call `/v1/health` with a capturing logger sink and assert any line has `operation_id`; `it('D13: CORS preflight from a configured origin allows credentials and X-CSRF-Protection')` (`OPTIONS /v1/auth/refresh`, `Origin: https://app.example.test` in `corsOrigins` → `access-control-allow-credentials: true`, allow-headers contains `x-csrf-protection`; an unlisted origin gets no `access-control-allow-origin`).
- [ ] **Step 4:** Switch `main.ts` to `loadConfig(process.env)` + `AppModule.forRoot` + `configureApp`; switch `health` and `request-user-not-wired` e2e tests to `createTestApp()`. `pnpm test && pnpm test:e2e` → all pass.
- [ ] **Step 5:** Commit `feat(api): add app config, clock, request context and shared bootstrap`.

### Task 3: Rate limiting by named rules (fixes Bước 0 shared counters)

**Files:**
- Create: `src/common/rate-limit/rate-limiter.service.ts`, `prisma/migrations/<ts>_rate_limit_key/migration.sql`
- Modify: `prisma/models/common.prisma` (`RateLimitCounter { key String; windowStart DateTime; count Int; @@unique([key, windowStart]) }`), `src/common/config/app-config.ts` (limits), `src/common/rate-limit/rate-limit.decorator.ts`, `src/common/rate-limit/rate-limit.guard.ts`, `src/common/rate-limit/rate-limit.guard.e2e-spec.ts`, `src/sample/sample.controller.ts`

**Interfaces:**
- Consumes: `Clock`, `APP_CONFIG`, `ProblemDetailsOptions.retryAfterSeconds` (Task 2).
- Produces:
  - `type RateLimitRuleName = 'sample.create' | 'auth.register.ip' | 'auth.login.ip' | 'auth.otp.ip' | 'auth.otp.email.cooldown' | 'auth.otp.email.hourly' | 'auth.refresh.ip' | 'auth.refresh.chain' | 'auth.logout.ip' | 'mail.ip.daily' | 'user.write'`; `interface RateLimitRuleConfig { by: 'user' | 'ip' | 'email' | 'chain'; max: number; windowSeconds: number }`; `DEFAULT_LIMITS` = design §6 table (`sample.create` user 10/60; register ip 5/3600; login ip 20/60; otp ip 20/3600; otp email 1/60 and 5/3600; refresh ip 60/60 and chain 10/60; logout ip 60/60; mail ip 20/86400; user.write user 30/60). Max window 86 400 s.
  - `class RateLimiter { hit(rule: RateLimitRuleName, subject: string): Promise<void> }` — throws `ProblemDetailsException({ status: 429, type: 'rate-limited', retryAfterSeconds })`. Key = `${rule}:${by}:${by === 'user' || by === 'chain' ? subject : hmacHex(rateLimitHmacKey, subject).slice(0, 32)}`; window start from `Clock`; same atomic Prisma `upsert` + `increment` as Bước 0.
  - `@RateLimit(...rules: RateLimitRuleName[])`; `RateLimitGuard` resolves the subject per rule: `user` → `req.user?.userId`, `ip` → `req.ip`, `email` → `normalizeEmail(req.body?.email)` (skip if absent/invalid), `chain` → skipped (service-only). Subject absent → rule skipped.

- [ ] **Step 1:** Update `rate-limit.guard.e2e-spec.ts` to the new decorator (test module provides `APP_CONFIG` via `testConfig({ limits: { ...DEFAULT_LIMITS, 'sample.create': { by: 'user', max: 3, windowSeconds: 60 } } })` and `Clock`); keep both existing tests and add `it('B1#33: two rules with different windows never share a counter')` — controller A `@RateLimit('auth.login.ip')`-style rule with max 2/60 s and controller B rule max 2/3600 s on the same subject; after 2 calls to A, B still answers 200 twice. Add `it('window resets when the FakeClock crosses the window')`.
- [ ] **Step 2:** `pnpm test:e2e -- rate-limit` → FAIL. Write the migration (drop and recreate `rate_limit_counters` with `key text`; data is throwaway counters), regenerate, implement.
- [ ] **Step 3:** `pnpm test:e2e` → all pass (sample tests still green). Commit `fix(api): key rate-limit counters by named rule and move them to RateLimiter`.

### Task 4: Identity schema and password/email primitives

**Files:**
- Create: `prisma/models/identity.prisma`, `prisma/migrations/<ts>_identity/migration.sql`, `src/identity/identity.module.ts`, `src/identity/auth/email.ts`, `src/identity/auth/password-policy.ts`, `src/identity/auth/password-hasher.service.ts`, specs next to each
- Modify: `src/app.module.ts` (import `IdentityModule`)

**Interfaces:**
- Produces:
  - Prisma models with `@@map`/`@map` snake_case, exactly the columns of design §3: `User` (`users`; `email` unique, `staffRole String?`, `nativeLanguage String?`, `status String @default("active")`, `failedLoginCount Int @default(0)`, `loginLockedUntil DateTime?`), `PasswordCredential` (`password_credentials`, PK `userId`), `SessionChain` (`session_chains`), `RefreshToken` (`refresh_tokens`, `tokenHash` unique, `successorId String? @db.Uuid`, `successorCiphertext String?`, `graceUntil DateTime?`), `OtpCode` (`otp_codes`), `OtpFailureWindow` (`otp_failure_windows`, `@@id([userId, purpose])`, `lockedUntil DateTime?`), `MailBudgetBucket` (`mail_budget_buckets`, PK `bucket String` = `${mailBudgetKey}:${YYYY-MM-DD UTC}`, `sent Int`). Relations allowed only inside Identity; `onDelete: Cascade` from `User` to its rows.
  - `normalizeEmail(raw: unknown): string | null` — trim, lowercase, ≤ 254, one `@`, non-empty local/domain, no whitespace; else `null`.
  - `type PasswordViolation = 'min_length' | 'max_length' | 'uppercase' | 'lowercase' | 'digit' | 'special'`; `normalizePassword(pw: string): string` (NFC); `checkPasswordPolicy(pw: string): PasswordViolation[]` (on the NFC form, length in code points via `[...pw].length`, classes `\p{Lu}`, `\p{Ll}`, `\p{Nd}`, special = any code point not `\p{L}`/`\p{N}`).
  - `class PasswordHasher { hash(pw: string): Promise<string>; verify(hash: string, pw: string): Promise<boolean>; verifyDummy(pw: string): Promise<false>; needsRehash(hash: string): boolean }` — argon2id with the Global Constraints params, inputs NFC-normalized inside, at most 4 concurrent operations (simple promise semaphore), dummy hash created once at module init with the same params.

- [ ] **Step 1: Write failing unit tests:** `email.spec.ts` — `it('IE8: normalizes "  Foo@Example.com " to "foo@example.com"')`, `it('rejects 255-char, no-@ and whitespace addresses')`. `password-policy.spec.ts` — `it('B1#3: "abc" violates min_length, uppercase, digit, special')` → `toEqual(['min_length','uppercase','digit','special'])`; `it('B1#3: 129 code points violates max_length')`; `it('accepts "Mật-khẩu1"')` → `[]`; `it('B1E1: composed and decomposed é normalize to the same string')`. `password-hasher.service.spec.ts` — `it('hash produces $argon2id$v=19$m=19456,t=2,p=1$')`, `it('B1E1: verifies the decomposed form against a hash of the composed form')`, `it('verifyDummy resolves false')`, `it('B1E26: needsRehash is true for a hash made with t=1')`, `it('never runs more than 4 hashes at once')` (spy on argon2 with a deferred mock, start 6, assert 4 in flight).
- [ ] **Step 2:** `pnpm test` → FAIL. Implement; write the schema and migration (`prisma migrate dev --create-only --name identity` against the compose DB), run `pnpm db:setup`.
- [ ] **Step 3:** `pnpm test && pnpm test:e2e` → pass (migrations apply in Testcontainers). Commit `feat(identity): add identity schema and password/email primitives`.

### Task 5: Access tokens and the global auth guard

**Files:**
- Create: `src/identity/sessions/access-token.service.ts` (+ spec), `src/identity/sessions/auth.guard.ts`, `src/identity/sessions/public.decorator.ts`, `test/identity/auth-guard.e2e-spec.ts`
- Modify: `src/common/request-user/request-user.ts` (move `RequestWithUser` here; `RequestUser { userId: string; sessionChainId: string }`), `fake-request-user.middleware.ts` (+ spec: sets `sessionChainId: 'fake-session'`), `current-user.decorator.ts`, `rate-limit.guard.ts`, `idempotency.interceptor.ts` (import path only), `src/health/health.controller.ts`, `src/sample/sample.controller.ts` (`GET` is `@Public()`), `src/identity/identity.module.ts` (`APP_GUARD` → `AuthGuard`)

**Interfaces:**
- Consumes: `APP_CONFIG.jwt`, `Clock`.
- Produces: `class AccessTokenService { sign(user: RequestUser): Promise<string>; verify(token: string): Promise<RequestUser | null> }` — `jose` `SignJWT` with header `{ alg: 'HS256', kid }`, claims `sub`, `sid`, `iat`, `exp = iat + accessTtlSeconds`, `iss`, `aud`; `jwtVerify(token, keyResolverByKid, { algorithms: ['HS256'], issuer, audience, currentDate: clock.now() })`; any failure → `null`. `@Public()` (metadata key `isPublic`). `AuthGuard`: non-public route → valid Bearer or 401 `invalid-token`; public route → attaches `req.user` when a valid Bearer is present, otherwise continues anonymously.

- [ ] **Step 1: Write failing unit tests** `access-token.service.spec.ts`: `it('B1#14: round-trips sub and sid')`; `it('B1#14: rejects a token after exp using the FakeClock')` (advance 901 s → `null`); `it('B1E14: rejects alg none, an RS256 token, an unknown kid, a wrong aud and a wrong iss')`; `it('IE10: a token signed by the second configured key still verifies; removing that key rejects it')`.
- [ ] **Step 2: Write failing e2e** `test/identity/auth-guard.e2e-spec.ts` (`createTestApp`): `it('B1#14: POST /v1/sample without Authorization returns 401 invalid-token')`; `it('B1#14: POST /v1/sample with a signed token reaches the handler')` (sign via `app.get(AccessTokenService)`; send `Idempotency-Key`); `it('B1#31: X-Test-User-Id alone gets 401 on a protected route')`; `it('GET /v1/health and GET /v1/sample stay public')`.
- [ ] **Step 3:** Run → FAIL; implement; `pnpm test && pnpm test:e2e` → pass (Bước 0 fake-seam tests still pass because their test modules do not import `IdentityModule`). Commit `feat(identity): add HS256 access tokens and global auth guard`.

### Task 6: Mailer port, mail budget and dispatcher

**Files:**
- Create: `src/identity/mailer/mailer.ts`, `src/identity/mailer/fake-mailer.ts`, `src/identity/mailer/smtp-mailer.ts`, `src/identity/mailer/mail-budget.service.ts`, `src/identity/mailer/mail-dispatcher.service.ts`, `src/identity/mailer/templates.ts`, `test/identity/mailer.e2e-spec.ts`
- Modify: `src/identity/identity.module.ts`, `test/support/create-test-app.ts` (override `Mailer` with `FakeMailer`; expose `mailer` and `drainMail()`)

**Interfaces:**
- Produces:
  - `interface MailMessage { to: string; subject: string; text: string }`; `abstract class Mailer { abstract send(msg: MailMessage): Promise<void> }` (DI token); `class SmtpMailer extends Mailer` (nodemailer transport from `config.smtp`, `connectionTimeout`/`greetingTimeout`/`socketTimeout` 10 000 ms); `class FakeMailer extends Mailer { readonly sent: MailMessage[]; failNext(err?: Error): void; otpFor(to: string): string | undefined }` (last 6-digit code in mail to `to`).
  - `class MailBudget { assertAvailable(): Promise<void>; tryConsume(): Promise<boolean> }` — bucket `${mailBudgetKey}:${UTC date of clock.now()}`; `assertAvailable` throws 503 `mail-unavailable` when `sent >= mailDailyBudget`; `tryConsume` atomically increments and returns `false` (and does not send) when the incremented value exceeds the budget; logs `mail_budget_80` once per bucket when it first reaches `ceil(0.8 * budget)`.
  - `class MailDispatcher { dispatch(msg: MailMessage, event: string): void; drain(): Promise<void> }` — not awaited by callers; runs `tryConsume` then `mailer.send`; every failure is caught and logged as `mail_send_failed` (no rejection escapes).
  - `templates.ts`: `otpMail(to, purpose: OtpPurpose, code): MailMessage`, `passwordChangedMail(to): MailMessage`, `otpLockedMail(to, purpose): MailMessage` — bilingual Vietnamese + English short text (ASSUMPTION: mail language not specified).

- [ ] **Step 1: Write failing e2e** `mailer.e2e-spec.ts`: `it('SmtpMailer delivers to Mailpit')` (uses `startMailpit()` from Task 1); `it('B1#30: assertAvailable throws 503 mail-unavailable once the bucket is full')` (`testConfig({ mailDailyBudget: 2 })`); `it('B1#30: 80 % logs mail_budget_80 exactly once')` (budget 5, consume 5, count log lines); `it('B1E15: concurrent tryConsume never lets more than the budget through')` (budget 3, 10 parallel → exactly 3 `true`); `it('B1E16/IE6: a failing mailer is logged and does not reject drain()')`; `it('a new UTC day opens a new bucket')` (FakeClock).
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Commit `feat(identity): add mailer port, daily mail budget and dispatcher`.

### Task 7: Session chains — issue, rotate, grace, reuse, expiry, cap

**Files:**
- Create: `src/identity/sessions/session.service.ts`, `src/identity/sessions/grace-cipher.ts` (+ spec), `src/identity/sessions/refresh-token.ts`, `test/identity/session.service.e2e-spec.ts`

**Interfaces:**
- Consumes: `AccessTokenService`, `Clock`, `APP_CONFIG.refreshGraceKey`, `RateLimiter` (`auth.refresh.chain`), `PRISMA_CLIENT`.
- Produces:
  - `type ClientType = 'web' | 'mobile'`; `interface IssuedSession { accessToken: string; refreshToken: string; sessionChainId: string; client: ClientType; refreshExpiresAt: Date }` (`refreshExpiresAt` = min(now + 90 d, chain.createdAt + 365 d)).
  - `newRefreshToken(): { token: string; hash: string }` (32 bytes base64url; SHA-256 hex).
  - `seal(plain: string, key: Buffer): string` / `open(sealed: string, key: Buffer): string` (AES-256-GCM, random 12-byte IV, `iv.tag.ciphertext` base64url).
  - `class SessionService`:
    - `startChain(tx: Prisma.TransactionClient, input: { userId: string; client: ClientType; deviceLabel?: string }): Promise<IssuedSession>` — creates chain + first token; then revokes (reason `device_cap`) active chains beyond 10, oldest `lastUsedAt` first (B1#19).
    - `refresh(token: string, path: ClientType): Promise<IssuedSession>` — design §4 algorithm in one transaction: unknown hash → 401; chain revoked/expired → 401 (+ revoke reason `expired`, B1#18); `client_type !== path` → 401, nothing rotated (B1E10); compare-and-set `updateMany({ where: { id, rotatedAt: null }, data: { rotatedAt, successorId, successorCiphertext, graceUntil } })`; `count === 0` → re-read → grace (B1#16) or revoke chain `reuse_detected` + warn log (B1#17). Updates `lastUsedAt` on success. Applies `auth.refresh.chain`.
    - `revokeByRefreshToken(token: string, path: ClientType): Promise<void>` — idempotent; never throws for unknown/rotated/revoked tokens.
    - `revokeAllForUser(tx: Prisma.TransactionClient, userId: string, reason: string): Promise<void>`.
  - All errors: 401 `invalid-token`.

- [ ] **Step 1: Write failing tests** (`session.service.e2e-spec.ts`, real Postgres via `createTestApp`, users inserted directly with Prisma): `B1#15: refresh returns a new pair and the old token no longer rotates`; `B1#16/IE1: a rotated token within 10 s returns the identical successor refresh token`; `B1E5: two concurrent refreshes with the same token both succeed with the same refresh token and the chain has exactly 2 token rows`; `B1#17/IE2: the rotated token after 11 s revokes the chain (reason reuse_detected) and logs refresh_reuse_detected without the token value`; `B1E6: A→B→C within 10 s then A again revokes the chain`; `B1E7/IE14: after revokeAllForUser inside the grace window the grace path returns 401`; `B1#18: 90 days + 1 s without refresh → 401 and chain revoked expired`; `B1#18: 365 days + 1 s even with regular refreshes → 401`; `B1#19/IE3: the 11th chain revokes the least recently used one`; `B1E10: a web chain refreshed via path mobile → 401 and nothing rotated`; `revokeByRefreshToken twice resolves both times`. `grace-cipher.spec.ts`: round-trip and tamper → throws.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Commit `feat(identity): add rotating session chains with grace and reuse detection`.

### Task 8: Session transport — refresh and logout endpoints, web cookie, CSRF

**Files:**
- Create: `src/identity/sessions/session-transport.ts`, `src/identity/sessions/sessions.controller.ts`, `test/identity/sessions.e2e-spec.ts`, `test/support/auth-helpers.ts`

**Interfaces:**
- Consumes: `SessionService` (Task 7).
- Produces:
  - `writeSession(res: Response, session: IssuedSession, clock: Clock): TokenResponse` where `TokenResponse = { access_token: string; token_type: 'Bearer'; expires_in: 900; refresh_token?: string }`; for `web` sets cookie `refresh_token` with `httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/v1/auth'`, `maxAge = refreshExpiresAt - now` and omits `refresh_token` from the body.
  - `readRefreshToken(req: Request): { token: string; path: ClientType } | null` — body `refresh_token` (string) → mobile, wins over cookie (Review Focus #4); else cookie → web, and throws 403 `csrf-header-required` unless header `X-CSRF-Protection` is exactly `1`.
  - `clearSessionCookie(res: Response): void`.
  - `POST /v1/auth/refresh` (`@Public`, `@RateLimit('auth.refresh.ip')`) → 200 `TokenResponse`; `POST /v1/auth/logout` (`@Public`, `@RateLimit('auth.logout.ip')`) → 204, clears the cookie on the web path.
  - `test/support/auth-helpers.ts`: `seedUser(prisma, opts?: { email?: string; password?: string; verified?: boolean; staffRole?: StaffRole }): Promise<{ userId: string; email: string; password: string }>`, `cookieFrom(res): string | undefined` (reads `Set-Cookie`; supertest does not resend `Secure` cookies over http — design §8).

- [ ] **Step 1: Write failing e2e** `sessions.e2e-spec.ts` (sessions started through `SessionService.startChain`; registration arrives in Task 10): `B1#21: web refresh sets an HttpOnly; Secure; SameSite=Strict; Path=/v1/auth cookie with Max-Age ≈ 90 days and no refresh_token in the body`; `B1#21: cookie refresh without X-CSRF-Protection → 403 csrf-header-required and the token still rotates afterwards with the header`; `B1#20/I19: logout with a mobile token revokes only that chain; a second chain still refreshes`; `B1#20: logout twice and logout with an unknown token both return 204`; `B1E29: logout works while the FakeClock is 1 day past the access token's exp`; `B1#21: web logout without the CSRF header → 403; with it → 204 and Set-Cookie clears refresh_token`; `Review Focus #4: body token + cookie present → mobile path is used (web cookie token untouched)`.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Commit `feat(identity): add refresh and logout endpoints with web cookie transport`.

### Task 9: OTP issuance and email verification

**Files:**
- Create: `src/identity/auth/otp.service.ts`, `src/identity/auth/otp.controller.ts`, `prisma/sql/recordOtpFailure.sql`, `test/identity/otp.e2e-spec.ts`
- Modify: `src/identity/auth/auth.schemas.ts`

**Interfaces:**
- Consumes: `RateLimiter` (`auth.otp.email.cooldown`, `auth.otp.email.hourly`), `MailBudget`, `MailDispatcher`, templates, `Clock`, `APP_CONFIG.otpHmacKey`.
- Produces:
  - `type OtpPurpose = 'verify_email' | 'reset_password'`.
  - `recordOtpFailure.sql` (TypedSQL): params `$1 userId`, `$2 purpose`, `$3 now timestamptz`; one `INSERT ... ON CONFLICT (user_id, purpose) DO UPDATE` that starts a new window (`failures = 1, window_start = $3`) when `window_start < $3 - interval '24 hours'`, else `failures + 1`; `RETURNING failures, locked_until`.
  - `class OtpService`:
    - `issueForUser(userId: string, purpose: OtpPurpose): Promise<void>` — no-op when `verify_email` and already verified (IE7) or when the purpose is locked; else invalidate live codes of (user, purpose), insert code (`crypto.randomInt(0, 1_000_000)` padded to 6, `code_hmac = HMAC-SHA256(otpHmacKey, code)`, `expires_at = now + 10 min`), `dispatch(otpMail)`.
    - `requestVerifyEmail(user: RequestUser): Promise<void>`, `requestPasswordReset(rawEmail: string): Promise<void>` — both: `RateLimiter.hit('auth.otp.email.cooldown' | 'auth.otp.email.hourly', email)` on the normalized email **before** looking up the account, then `MailBudget.assertAvailable()`, then `issueForUser` only if the account exists. `verify_email` locked → 429 `rate-limited` with `Retry-After` (B1E17).
    - `checkCode(tx: Prisma.TransactionClient, userId: string, purpose: OtpPurpose, code: string): Promise<void>` — input trimmed, must match `^\d{6}$`; locked purpose → 400 `invalid-otp` for `reset_password`, 429 for `verify_email`; find live code; none → 400 `invalid-otp` (not counted); compare with `timingSafeEqual`; wrong → conditional `updateMany` increments `attempts` (`attempts < 5`, live, `expires_at > now`) and `recordOtpFailure`; on returned `failures === 21` set `locked_until = now + 24 h`, log `otp_locked`, dispatch `otpLockedMail` (B1#10); throw 400 `invalid-otp`; right → set `consumed_at`.
    - `verifyEmail(user: RequestUser, code: string): Promise<{ email_verified: true }>` — already verified → returns without checking (B1E22).
  - `POST /v1/auth/otp` (`@Public`, `@RateLimit('auth.otp.ip', 'mail.ip.daily')`) body `{ purpose: 'verify_email' } | { purpose: 'reset_password', email: string }` → 202 `{}`; `verify_email` without `req.user` → 401 `invalid-token`.
  - `POST /v1/auth/verify-email` (authenticated, `@RateLimit('user.write')`) body `{ code: string }` → 200 `{ email_verified: true }`.

- [ ] **Step 1: Write failing e2e** `otp.e2e-spec.ts`: `B1#4: a second verify_email request (after cooldown) invalidates the first code`; `B1#4: the stored row holds an HMAC, never the code`; `B1#5/I8: reset_password for known and unknown email return identical 202 bodies; mail only for the known one`; `B1#6/I6: a second request inside the same 60 s window → 429 with Retry-After, also for an unknown email`; `B1#6: the 6th request inside one hour window → 429`; `B1#7/I4: correct code verifies; reuse → 400 invalid-otp`; `B1#8/I5: 5 wrong codes then the right one → 400`; `B1#8: 10 concurrent wrong submissions increment attempts to exactly 5`; `B1#9/I7: a reset code submitted to verify-email → 400`; `B1#10/I28: 21 wrong codes across fresh codes within 24 h lock verify_email (429) and send one otp_locked mail`; `B1E17: a locked reset_password purpose still answers 202 to requests and sends nothing`; `B1E19: "012345" with spaces around it is accepted when it is the live code; "12345" → 400`; `B1E22: a verified user's verify_email request sends nothing and verify-email returns 200`; `verify_email without a token → 401`; `B1#30: budget exhausted → 503 for known and unknown emails alike`; `a code expires after FakeClock +10 min`.
- [ ] **Step 2:** Run → FAIL; implement (`pnpm db:setup` after adding the SQL file); run → PASS. Commit `feat(identity): add OTP issuance and email verification`.

### Task 10: Registration and password login

**Files:**
- Create: `src/identity/auth/auth.service.ts`, `src/identity/auth/auth.controller.ts`, `src/identity/auth/auth.schemas.ts`, `test/identity/register-login.e2e-spec.ts`
- Modify: `test/support/auth-helpers.ts` (`registerViaApi`, `loginViaApi`)

**Interfaces:**
- Consumes: `PasswordHasher`, `normalizeEmail`, `checkPasswordPolicy`, `SessionService.startChain`, `MailBudget.assertAvailable`, `MailDispatcher`, `OtpService.issueForUser` (Task 9).
- Produces:
  - zod schemas: `registerSchema = { email: string, password: string, timezone: string, client: 'web'|'mobile', device_label?: string ≤ 100 }`, `loginSchema = { email: string, password: string, client, device_label? }` (password length is checked in the service, not the schema — B1E2).
  - `POST /v1/auth/register` (`@Public`, `@RateLimit('auth.register.ip', 'mail.ip.daily')`) → 201 `TokenResponse`. Order: schema 400 → `normalizeEmail` null → 400 → policy violations → 400 `validation-failed` with `violations` → timezone invalid → 400 → `assertAvailable` → transaction (user + credential + `startChain`); Prisma `P2002` → 409 `email-taken` → after commit `dispatch(otpMail)` via `OtpService.issueForUser(userId, 'verify_email')`.
  - `POST /v1/auth/login` (`@Public`, `@RateLimit('auth.login.ip')`) → 200 `TokenResponse` or 401 `invalid-credentials`. Unknown email → `verifyDummy`; locked (`loginLockedUntil > now`) → run `verify` on the real hash, ignore the result, no counter change (B1E3); wrong password → `update` with `increment` returning the count; `>= 10` → set `loginLockedUntil = now + 15 min`, `failedLoginCount = 0`, log `login_locked`; success → reset counter, `needsRehash` → rehash (B1E26), `startChain`.
  - `isValidTimeZone(tz: string): boolean` in `src/identity/profile/timezone.ts` (`new Intl.DateTimeFormat('en', { timeZone })` in try/catch) — reused by Task 12.

- [ ] **Step 1: Write failing e2e** `register-login.e2e-spec.ts`: `B1#1/I1: register (mobile) returns 201 with access and refresh token; user unverified, native_language null, staff_role null; FakeMailer has a 6-digit code for the email after drainMail()`; `B1#1: register (web) returns the cookie and no refresh_token in the body`; `B1#2/I2: registering the same normalized email again → 409 email-taken, one user row, no second mail`; `B1#3/I3: weak password → 400 with violations ['min_length','uppercase','digit','special']`; `B1E23: timezone "Asia/Ho_Chi_Minh" accepted and stored as sent; "Mars/Base" → 400`; `B1#30: with mailDailyBudget 0 registration → 503 mail-unavailable and no user row`; `B1E20: retrying a register after success → 409`; `Review Focus #2: two concurrent registrations for one new email → statuses {201, 409}, one user row`; `Review Focus #3: email: 42 or missing password → 400 validation-failed`; `B1#11: login returns tokens and resets failed_login_count`; `Review Focus #1/IE8: login with "  Foo@Example.COM " after registering foo@example.com succeeds`; `B1#12/I10: unknown email, wrong password and locked account return identical 401 bodies (excluding operation_id/instance) and PasswordHasher.verify-or-verifyDummy is called exactly once each`; `B1E2: a 1 MB password at login → 401 without calling the hasher`; `B1#13/I11: 10 wrong passwords lock for 15 min; correct password during the lock → 401; after FakeClock +15 min → 200`; `B1E3: wrong passwords during the lock do not extend it`; `B1E26: a stored t=1 hash is rehashed after a successful login`; `B1#19: 11th login revokes the least recently used chain`; `B1E24/B1E25: with trustProxy true and auth.register.ip lowered to 2/3600, a third register from X-Forwarded-For 203.0.113.7 → 429 while 203.0.113.8 → 201`.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Commit `feat(identity): add registration and password login with lockout`.

### Task 11: Password change and reset

**Files:**
- Create: `src/identity/auth/password.service.ts`, `src/identity/auth/password.controller.ts`, `test/identity/password.e2e-spec.ts`

**Interfaces:**
- Consumes: `PasswordHasher`, `checkPasswordPolicy`, `SessionService.startChain`/`revokeAllForUser`, `OtpService.checkCode`, `MailDispatcher`, `writeSession`.
- Produces:
  - `POST /v1/auth/password/change` (authenticated, `@RateLimit('user.write')`) `{ current_password, new_password }` → 200 `TokenResponse` for a new chain with the caller's `client_type` and `device_label`. Locked → 429 `rate-limited`; wrong current password → 400 `invalid-current-password` and the same failure counter/lock as login (B1E4); policy → 400; success: replace hash, `revokeAllForUser(reason 'password_changed')`, `startChain`, dispatch `passwordChangedMail` (B1#22).
  - `POST /v1/auth/password/reset` (`@Public`, `@RateLimit('auth.login.ip')`) `{ email, code, new_password }` → 204. Policy violations → 400 first; unknown email → 400 `invalid-otp`; `checkCode(..., 'reset_password', ...)`; then in the same transaction: replace (or create) credential, `revokeAllForUser(reason 'password_reset')`, `emailVerifiedAt ??= now`, `failedLoginCount = 0`, `loginLockedUntil = null`; dispatch `passwordChangedMail` (B1#23).

- [ ] **Step 1: Write failing e2e** `password.e2e-spec.ts`: `B1#22/I20: change revokes every other chain, the old chain of the caller stops refreshing, and the returned session refreshes`; `B1#22: web caller gets a new cookie`; `B1#22/I26: a notification mail is sent`; `B1E4: wrong current password → 400 invalid-current-password and the 10th wrong one locks login`; `B1E4: change while locked → 429`; `B1E21: retrying a successful change → 400 invalid-current-password`; `B1#23/I9: reset with the live code → 204, old password fails at login, new one works, every chain revoked, email verified`; `B1#23: reset clears an active login lock`; `B1#23: unknown email and wrong code give identical 400 invalid-otp bodies`; `B1#3: weak new_password → 400 violations on both endpoints`.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Commit `feat(identity): add password change and reset`.

### Task 12: Profile and the IdentityService contract

**Files:**
- Create: `src/identity/profile/identity.service.ts`, `src/identity/profile/profile.controller.ts`, `test/identity/profile.e2e-spec.ts`
- Modify: `src/identity/identity.module.ts` (`exports: [IdentityService]`)

**Interfaces:**
- Consumes: `isValidTimeZone` (Task 10).
- Creates (owned here, extended by Task 13): `src/identity/staff/permissions.ts` with `StaffRole`, `Permission`, `ROLE_PERMISSIONS`, `permissionsFor` exactly as specified in Task 13's Produces block, plus `permissions.spec.ts`.
- Produces:
  - `type SupportedLanguage = 'vi' | 'en'`; `interface Profile { id: string; email: string; email_verified: boolean; native_language: SupportedLanguage | null; timezone: string; staff_role: StaffRole | null; permissions: Permission[] }`.
  - `class IdentityService { getProfile(userId: string): Promise<Profile | null>; isEmailVerified(userId: string): Promise<boolean> }`.
  - `GET /v1/me` → 200 `Profile`, 401 `invalid-token` when the user row is gone; `PATCH /v1/me` (`@RateLimit('user.write')`) `{ native_language?: 'vi'|'en', timezone?: string }` → 200 `Profile`.

- [ ] **Step 1: Write failing tests** `permissions.spec.ts`: `it('admin has roles.manage, editor and null have none')`. `profile.e2e-spec.ts`: `B1#24/SE5: native_language "fr" → 400 and nothing changes`; `B1#24: timezone "Mars/Base" → 400; "Asia/Ho_Chi_Minh" stored as sent`; `B1#24/S8: setting vi then en returns the latest value`; `B1#25/I24: isEmailVerified reflects the row before and after verification`; `B1#25: getProfile returns native_language null for a new user (I22 gate input)`; `Review Focus #5: a token for a deleted user row → GET /v1/me 401`.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Commit `feat(identity): add profile endpoints and IdentityService`.

### Task 13: Staff roles, permissions and the admin bootstrap command

**Files:**
- Create: `src/identity/staff/require-permission.decorator.ts`, `src/identity/staff/permission.guard.ts`, `src/identity/staff/staff.service.ts`, `src/identity/staff/staff.controller.ts`, `src/cli/admin-grant.ts`, `test/identity/staff.e2e-spec.ts`
- Modify: `package.json` (`"admin:grant": "node dist/cli/admin-grant.js"`), `src/identity/identity.module.ts`

**Interfaces:**
- Produces:
  - `type StaffRole = 'admin' | 'editor'`; `type Permission = 'roles.manage'`; `ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = { admin: ['roles.manage'], editor: [] }`; `permissionsFor(role: StaffRole | null): Permission[]`.
  - `@RequirePermission(p: Permission)` + `PermissionGuard` (route-level, after `AuthGuard`): loads `staffRole` and the chain `req.user.sessionChainId`; missing permission or revoked chain → 403 `forbidden` (B1#26, B1E13).
  - `class StaffService`:
    - `findByEmail(email: string): Promise<StaffUserView | null>`; `listStaff(pageSize: number, pageToken?: string): Promise<{ items: StaffUserView[]; next_page_token: string | null }>` (Bước 0 `page-token.util`, order by `email`); `StaffUserView = { id, email, email_verified, staff_role }`.
    - `setStaffRole(actorId: string, targetId: string, role: StaffRole | null): Promise<StaffUserView>` — one transaction: `$executeRaw` `SELECT pg_advisory_xact_lock(hashtext('identity.staff_role')::bigint)`; target missing → 404; target unverified and `role !== null` → 409 `staff-role-rule`; demoting an admin when it is the last admin → 409 `staff-role-rule`; log `staff_role_changed` with actor/target ids.
    - `grantAdminByEmail(email: string): Promise<'granted' | 'not_found' | 'unverified'>` (used by the CLI).
  - Routes (all `@RequirePermission('roles.manage')`): `GET /v1/admin/users?email=` → 200 `StaffUserView` or 404; `GET /v1/admin/staff?page_size&page_token` → 200 page; `PUT /v1/admin/users/:id/staff-role` `{ staff_role: 'admin'|'editor'|null }` → 200 `StaffUserView`.
  - `src/cli/admin-grant.ts`: `NestFactory.createApplicationContext(AppModule.forRoot(loadConfig(process.env)))`, calls `grantAdminByEmail(process.argv[2])`, prints the outcome, exit code 0 only for `granted`; `not_found` prints "register this email first" (B1E27).

- [ ] **Step 1: Write failing tests** `staff.e2e-spec.ts`: `B1#26/I21: an editor and a learner get 403 on every admin route`; `B1#26/B1E13: an admin whose chain was revoked (logout) gets 403 with a still-valid access token`; `B1#27: admin makes a verified user editor; that user's next GET /v1/me shows staff_role editor without re-login`; `B1#27: granting to an unverified user → 409 staff-role-rule`; `B1#28: demoting the only admin (self) → 409`; `B1E12: two admins demoting each other concurrently leave exactly one admin and one 409`; `B1#29: grantAdminByEmail returns granted / unverified / not_found and changes nothing in the latter two`; `GET /v1/admin/staff pages with page_size 1`.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Also run the built CLI once against the compose DB: `pnpm build && DATABASE_URL=... <other env from .env.example> pnpm admin:grant nobody@example.com` → prints "register this email first", exit code 1.
- [ ] **Step 3:** Commit `feat(identity): add staff roles, permission guard and admin:grant`.

### Task 14: Maintenance cleanup, log audit and end-to-end verification

**Files:**
- Create: `src/common/maintenance/maintenance.service.ts`, `test/identity/maintenance.e2e-spec.ts`, `test/identity/log-audit.e2e-spec.ts`
- Modify: `test/support/create-test-app.ts` (`logs: unknown[]` capturing sink), `CLAUDE.md`, `docs/superpowers/specs/2026-10-07-buoc-1-identity-core-design.md` (only if implementation forced a deviation — record it)

**Interfaces:**
- Produces: `class MaintenanceService { runOnce(): Promise<{ counters: number; graceSecrets: number; otpCodes: number; chains: number }> }` — deletes rate-limit counters with `window_start < now - 24 h`, nulls `successor_ciphertext` where `grace_until < now`, deletes `otp_codes` with `expires_at < now - 24 h`, deletes chains (cascade tokens) whose `revoked_at` or computed expiry is older than 30 days; `onModuleInit` starts `setInterval(runOnce, 3_600_000)` only when `config.maintenanceEnabled`, cleared `onModuleDestroy`.

- [ ] **Step 1: Write failing e2e** `maintenance.e2e-spec.ts`: one test per cleanup rule using FakeClock (rows just inside the boundary survive, just outside are removed); `B1E30: a refresh token whose chain was cleaned up → 401 invalid-token`. `log-audit.e2e-spec.ts`: drive register → OTP → verify → failed login → refresh reuse → password change → reset through the API with the capturing sink, then `B1#32: no log line contains the password, the OTP code, any issued token, the cookie value, "127.0.0.1", or the plain email used in the failed login`, and every line has `operation_id`.
- [ ] **Step 2:** Run → FAIL; implement; run → PASS. Full suite: `pnpm test && pnpm test:e2e && pnpm lint && pnpm build` → all green; record the counts.
- [ ] **Step 3: Manual verification** (rule `verification.md`): `docker compose up -d`, `pnpm db:setup`, `pnpm start:dev` with `.env` copied from `.env.example`; with `curl` go through: register (mobile) → read the code in Mailpit UI `http://localhost:8025` → `POST /v1/auth/otp` + `verify-email` → `refresh` → `password/change` → `logout` → refresh with the logged-out token returns 401. Then `pnpm admin:grant <that email>` → `GET /v1/admin/staff` with a fresh login shows the user as admin. Paste the command outputs into the task report.
- [ ] **Step 4:** Update `CLAUDE.md` "as-built" for Bước 1 (what exists, test counts, open items from design §14). Commit `feat(api): add maintenance cleanup and log audit; document bước 1 as-built`.
