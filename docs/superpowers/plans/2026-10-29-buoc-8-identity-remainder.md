# Bước 8 — Google sign-in and account deletion — Implementation Plan

> **Status 29/10/2026:** written after the owner approved the design ("Duyệt, viết plan"); revised after the independent plan review
> [`../reviews/2026-10-29-buoc-8-plan-review.md`](../reviews/2026-10-29-buoc-8-plan-review.md) (P1–P25, table "Plan review fixes" below). The two owner questions of that
> review are answered: **D31** (admin deletion of a renewing learner: record the cancel locally once the provider accepted it) and **D32** (real Google sign-in twice: right after M3,
> and at the end). **D33** replaces the parallel-sessions method of D4b: execution is sequential in one session, one branch per milestone chained on the previous one, commits stay local, push and PRs only when the owner says so.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, one session, D33) to implement this plan task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Learners sign in with Google and delete their own account; admins delete accounts; unverified accounts are cleaned up; learners can cancel
auto-renewal; every module erases or anonymises its own rows of a deleted user, and the API refuses locked, deleting and logged-out sessions on every request.

**Architecture:** Identity owns the flow (Google OAuth with redirects through the API, encrypted short-lived cookies, `user_identities`, a two-transaction
deletion with an anonymous id, `deleted_accounts`). Other modules plug in through ports registered into Identity (fail closed): `AccountDataEraser` (six
modules), `AccountDeletionPrecondition` (Entitlements), `IdentitySettingsReader` (Settings). The learner web and the admin get the screens. Seven milestones,
one branch and PR into `dev` each.

**Tech Stack:** API: NestJS, Prisma 7 (TypedSQL), zod 4, `jose` 6.2.12, Node `fetch`, `node:crypto`, Vitest 4.1.11. Web: Next 16.3.8, next-intl 4.14.9.
Admin: React 19.3.0, react-router 8.4.0, TanStack Query 5.104.2, use-intl 4.14.9, Playwright 1.63.0.

**Spec:** [`../specs/2026-10-28-buoc-8-identity-remainder-design.md`](../specs/2026-10-28-buoc-8-identity-remainder-design.md) ("design §N", edge cases
"B8E#", acceptance "B8A#"). Decisions D1–D30: [`../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md`](../decisions/2026-10-28-buoc-8-identity-remainder-decisions.md).
Design review: [`../reviews/2026-10-28-buoc-8-design-review.md`](../reviews/2026-10-28-buoc-8-design-review.md) ("R#", missing cases "M#"). Code facts:
[`../../preparation/BUOC_8_CODE_FACTS_2026-10-28.md`](../../preparation/BUOC_8_CODE_FACTS_2026-10-28.md) (`dev` @ `9e35eb5`). Line numbers in the design and here
are from `9e35eb5`; read the code again on `origin/dev` when a task starts.

## Global Constraints

- **No new dependency.** JWT/JWKS with `jose` 6.2.12 (`createRemoteJWKSet`, `createLocalJWKSet`, `jwtVerify`); token endpoint with `fetch`; cookie sealing with
  `node:crypto` AES-256-GCM.
- **Module boundaries (D3):** only `src/identity/**` touches Identity tables; Identity never imports `SettingsModule` or `EntitlementsModule` (they import Identity);
  `src/common/**` never imports `src/identity/**`. Cross-module needs go through the three ports (design §4).
- **Problem Details slugs (design §13), exact:** `google-failed`, `google-unavailable`, `google-email-unverified`, `password-login-required`, `staff-account`,
  `subscription-renewing`, `confirm-email-mismatch`, `reauth-required`, `self-delete`, `last-admin`, `account-deleting`, `renewal-not-cancelled`,
  `subscription-not-cancellable`, `cancel-in-store`. Existing slugs reused: `invalid-token` (401), `account-locked`, `email-taken`, `age-below-minimum`.
- **Delete responses:** 204 when done; 202 with body `{ "status": "pending" }` (not Problem Details) when the account is left `deleting`.
- **Rate limits (add to `DEFAULT_LIMITS`, `src/common/config/app-config.ts:108`):** `auth.google.ip` `{ by: 'ip', max: 20, windowSeconds: 60 }`; `auth.delete.user`
  `{ by: 'user', max: 5, windowSeconds: 3600 }`. Reuse `auth.register.ip` for `POST /v1/auth/google/complete`, `user.write` for every new authenticated write.
- **Cookies (API host, `HttpOnly`, `Secure`, `SameSite=Lax`, sealed with `OAUTH_COOKIE_KEY`):** `google_oauth` path `/v1/auth/google` 10 min; `google_signup` path
  `/v1/auth/google` 15 min; `google_reauth` path `/v1/me/account` 5 min. Reauth ticket in `start_url`: signed, 2 min. `refresh_token` cookie unchanged.
- **Timeouts:** Google token call 10 s; Tx B of a deletion 120 s (`timeout` and `SET LOCAL statement_timeout = '120s'`); billing adapter calls use the existing
  `BILLING_ADAPTER_TIMEOUT_MS`.
- **Settings (design §11):** `identity.unverifiedCleanupDays` default 7, integer 1–365; `entitlements.transactionRetentionYears` default 10, integer 5–30. API speaks
  snake_case (`unverified_cleanup_days`, `transaction_retention_years`).
- **Jobs (all registered with `MaintenanceScheduler`, hourly):** `identity.deletion-retry` (accounts `deleting` with `deleting_since` older than 10 min),
  `identity.deletion-sweep` (`deleted_accounts.deleted_at` within 24 h), `identity.unverified-cleanup` (≤ 200 accounts a run), `billing.transactions-expire`;
  log `account_deletion_stuck` (warn) for `deleting` older than 24 h.
- **"Auto-renewing" (D11, D28):** `status ∈ (trialing, active, grace, on_hold) AND cancel_at_period_end = false`, one function used everywhere.
- **Anonymous id:** one `randomUUID()` per deletion run, never stored next to the real id.
- **Logs** never carry passwords, tokens, codes, emails (SR10); log user ids only.
- **Copy:** every new screen string in vi and en, keys equal in both files (`apps/web/messages`, `apps/admin/messages`); vi text as quoted in the design.
- **Branches and order (D33):** sequential, one session. `feat/buoc-8-m1` from `origin/dev`; `m2` from `m1`; `m3` from `m2`; `m4` from `m3`; `m5` from `m4`; `m6` from `m5`; `m7` from `m6`
  (nothing is merged into `dev` yet). Code branches carry no documents of the doc branch `docs/buoc-8-brainstorm` (its own PR). Order: M1 → M2 → M3 → **stop point D32 round 1** → M4 → M5 → M6 → M7;
  M4 does not depend on Google, so it may run while the owner does round 1, but **M5 does not start before round 1 has a result**. Commits stay local; no push, no PR until the
  owner says so. Then push each branch and open PRs into `dev` in order; a later PR merges only after the earlier one merged and CI is green (rebase on `dev` if needed). Before each commit
  the session runs on the machine the steps of `.github/workflows/ci.yml` for the app touched: api = `db:setup` on a fresh DB, drift check
  (`prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script`), lint, typecheck, build, test; web = lint, typecheck, test, `test:e2e`; admin = lint, typecheck,
  test, `test:e2e`, plus `test:e2e:real` when admin or an API it uses is touched. Scan for secrets before every push. Lines several milestones share (rate-limit rules, mail templates,
  env keys) are added once in M1 (Task 5).
- **Tests:** API tests are unit tests with a fake Prisma (no DB in CI, D38). Behaviour that needs a real DB (cascades, the `entries_clear_form_kind` trigger, FK
  RESTRICT, `jsonb_set`, `ON CONFLICT`, advisory locks, races) is proven in `pnpm smoke:buoc-8` (Task 32); a unit test only proves which statements run and in which
  order.
- **Redirects to the learner web** are absolute: `toLearnerApp(path)` = `LEARNER_APP_URL` + path, built with `new URL` (never a bare `/vi/app/...` from the API host).
- **`.env.example`** (root and `apps/api`) gets every new variable with a safe local value; `docker-compose`/`pnpm bootstrap` env files too (see
  `docs/deliveries/docker-bootstrap.md`).

## Review Focus

1. **Google sends `name` but no `given_name` / `family_name`, or no name at all** → the complete page asks for given/family name; never a user with an empty given
   name. Test in Task 20.
2. **`next` like `//evil.example`, `https://evil.example/vi/app`, `/fr/app`, `/vi/apps`, `/vi/app/../../x`, `/vi/app/%2e%2e/x`** → falls back to `/{locale}/app`;
   `/vi/app/word?id=1#x` → returns to that page with `signed_in=google` in the query. Test in Task 19.
3. **Typed confirmation email `" Lan@Gmail.com "`** → accepted after `normalizeEmail`; `lan@gmail.co` → `confirm-email-mismatch`. Test in Task 14.
4. **An eraser run twice, or after the `users` row is gone (retry, sweep, replay)** → no error, no second `deleted_accounts` row, rows written late are handled. Tests in
   Task 13 and Task 15.
5. **A refresh inside the 10 s grace window right after Tx A revoked the chain** → refused (chain revoked and account `deleting`). Already true today
   (`session.service.ts:150` checks revocation before the grace branch); the Task 4 test guards against a regression.

## Plan review fixes (29/10/2026)

Review: [`../reviews/2026-10-29-buoc-8-plan-review.md`](../reviews/2026-10-29-buoc-8-plan-review.md). The main session re-read the evidence of P1–P3, P9 and P25 on the
code (web transport resends every 401, `session-store.ts:305-323`; `invalid-current-password` exists, `password.service.ts:92,136-137`; `sources[]` already has
`renews_at`, `cancel_at_period_end`, `entitlements.service.ts:30-38`; `grace-cipher.ts` exports `seal` / `open`): all true.

| # | Fixed in | Change |
|---|---|---|
| P1 | 13, 15 | `mode: 'resume'` for the retry job (Tx B only); `deleting_by` drives `deleted_accounts.by` and "no mail for cleanup" |
| P2 | 6, 10, 13, 16, 32 | Erasers take `checks: 'normal' \| 'skip'`; replay skips the renewing check |
| P3 | 14, 26 | Wrong password at deletion → 400 `invalid-current-password`, never 401 |
| P4 | 13, 15 | Cleanup rechecks its conditions under the lock (`'skipped'`) |
| P5 | 10, 14, 22 | Fake adapter applies `cancel_scheduled` before returning; the real-provider gap is closed by **D31** (record the cancel locally once the adapter accepted) |
| P6 | 6, 12, 13 | `IdentitySettingsReader.transactionRetentionYears()` for the mail |
| P7, P8 | Global Constraints, 19, 21 | `toLearnerApp` absolute redirects, `safeNext` by URL parsing, `signed_in` via `searchParams`, absolute `start_url` |
| P9 | 22, 26, 27 | No snapshot change; the web uses `sources[]` |
| P10 | Global Constraints, 1, 7, 9, 13, 15, 32 | Unit tests prove statements; DB-only behaviour and races proven in the smoke; smoke cases added |
| P11 | 33, stop point | Cross-site fake Google in the browser pass; real Google twice (**D32**: after M3 and at M7) |
| P12 | Global Constraints, 5, 14, 17, 19 | Shared lines (limits, mail templates, env keys) in M1 Task 5; merge M2 first; `list-routes.spec.ts` in Task 14 |
| P13 | 19 | Existing Google identity with another `sub` → `google-failed`, no 500 |
| P14 | 12 | Boot test for the registry |
| P15 | 2, 3 | `AccountState` carries `staffRole`, `mustChangePassword`; one read per request |
| P16 | 4 | `setStaffRole` ignores `deleting` admins in the last-admin count |
| P17, P18 | 17, 18 | Fake Google takes names, picture, nonce, PKCE; redirect URI required for the fake too |
| P19 | 20, 24 | Complete routes called with a plain `fetch` |
| P20 | 26, 27 | Web `KNOWN_ERROR_SLUGS` |
| P21 | 23 | `logout-pending` cleared only on `signed_in=google` (changes a design §9.1 Đề xuất) |
| P22, P23 | 10, 15 | Unknown-user events lose their payloads; pool locks; sweep covers `usage_records` |
| P24 | 19 | Four more callback tests |
| P25 | 1, 5, 11, 13–17, 28 | CI drift command, file create/modify, parameter order, CLI unchanged, reuse `grace-cipher`, root `.env.example`, evidence lines |

**Decided (owner, rule D1; decision record D31–D33):** **D31** (was Q1) after the provider accepted the cancel, Entitlements writes `cancel_at_period_end = true` itself and the admin
deletion goes on at once (Task 10, 14, 22, 32); **D32** (was Q2) real Google sign-in runs twice, after M3 (stop point below) and at M7 (Task 33); **D33** sequential execution.

---

## M1 — API foundation (`feat/buoc-8-m1`)

### Task 1: Schema for Bước 8

**Files:** Modify `apps/api/prisma/models/identity.prisma`; create `apps/api/prisma/migrations/20261029090000_buoc8_identity/migration.sql`.

**Interfaces (design §12):**
- `users`: CHECK `users_status_check` becomes `('active','locked','deleting')`; add `deleting_since timestamptz NULL`, `deleting_by varchar(16) NULL` CHECK
  `('self','admin','cleanup')` (who started a deletion: the retry job writes it to `deleted_accounts.by` and sends no mail for `cleanup`; added to design §12 when
  this plan was written),
  `avatar_url varchar(2048) NULL`.
- `user_identities`: `id uuid PK default gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE`, `provider varchar(16) NOT NULL CHECK (provider IN
  ('google'))`, `subject varchar(255) NOT NULL`, `created_at timestamptz NOT NULL`; unique `(provider, subject)`, unique `(user_id, provider)`. Prisma model
  `UserIdentity`.
- `session_chains.auth_method varchar(16) NOT NULL DEFAULT 'password'` CHECK `('password','google')`.
- `deleted_accounts`: `user_id uuid PK` (no FK), `deleted_at timestamptz NOT NULL`, `by varchar(16) NOT NULL CHECK (by IN ('self','admin','cleanup'))`; index on
  `deleted_at`. Prisma model `DeletedAccount`.

- [ ] **Step 1:** Write the migration and the models.
- [ ] **Step 2:** On a fresh DB: `pnpm db:setup` succeeds and the CI drift check passes (the exact command of `.github/workflows/ci.yml:56`: `prisma migrate diff
  --from-config-datasource --to-schema prisma --exit-code --script` after `db:setup`); on a DB that already holds data (after an earlier smoke) the migration also
  applies; `pnpm typecheck` passes.
- [ ] **Step 3: Commit** `feat(api): add the bước 8 identity schema`.

### Task 2: Account state on every request (D24, D29)

**Files:** Create `src/identity/sessions/account-status.reader.ts` (+ spec); modify `src/identity/sessions/auth.guard.ts` (+ `auth.guard.spec.ts`), the request
type the guard attaches to, `src/identity/identity.module.ts`, `test/support/create-test-app.ts`.

**Interfaces:**
- `abstract class AccountStatusReader { read(userId: string, chainId: string): Promise<AccountState | null> }` with
  `type AccountState = { status: 'active' | 'locked' | 'deleting'; authMethod: 'password' | 'google'; revoked: boolean; staffRole: StaffRole | null;
  mustChangePassword: boolean }`. Prisma implementation: one query on `session_chains` by id joined to `users`, `null` when no row or the chain is not that user's.
- `AuthGuard` on non-`@Public` routes: after `tokens.verify`, `read()`; `null`, `revoked`, `locked` or `deleting` → 401 `invalid-token`; otherwise attach
  `request.account: AccountState`. `@Public` routes: unchanged (attach user if the token is valid, no DB read).
- `createTestApp` overrides `AccountStatusReader` with a fake returning `{ status: 'active', authMethod: 'password', revoked: false }`, overridable per test.

- [ ] **Step 1: Failing tests** (`auth.guard.spec.ts`): active → passes and sets `request.account.authMethod`; `locked`, `deleting`, revoked chain, `null` → 401
  `invalid-token`; `@Public` route with a valid token of a locked user → passes, `request.user` set, reader **not** called. Reader spec: returns `null` for a chain of
  another user.
- [ ] **Step 2–4:** Implement; run `pnpm test`; every existing controller spec still passes through the `createTestApp` fake.
- [ ] **Step 5: Commit** `feat(api): check account state and revoked sessions on every request`.

### Task 3: Google sessions, `/v1/me` and admin user views

**Files:** Modify `src/identity/sessions/session.service.ts` (`startChain`), `src/identity/staff/permission.guard.ts` (+ spec), `src/identity/profile/profile.controller.ts`
and `identity.service.ts` (+ specs), `src/identity/staff/staff.service.ts` (admin user views), `src/identity/identity.types.ts`.

**Interfaces:**
- `startChain(tx, { userId, client, deviceLabel?, authMethod?: 'password' | 'google' })`, default `'password'`; rotation keeps the chain's method; password change
  (IR14) starts a new chain with `'password'`.
- `PermissionGuard` reads `request.account` (Task 2) instead of its own query (`permission.guard.ts:29-32`): `authMethod = 'google'` → 403 `password-login-required`;
  `staffRole`, `mustChangePassword` as today (design §21: one read per request).
- `GET /v1/me` adds `auth_method` (of the calling chain) and `sign_in_methods: Array<'password' | 'google'>` (password if a `password_credentials` row exists, google if a
  `user_identities` row exists). Admin user list and detail add `sign_in_methods` and may return `status: 'deleting'`.
- `IdentityService.accountStatus(userId): Promise<'active' | 'locked' | 'deleting' | null>` (used by Entitlements in Task 4).

- [ ] **Step 1: Failing tests:** permission guard 403 `password-login-required` for a google chain on a staff route, passes for password; `/v1/me` returns
  `sign_in_methods: ['password']` for a password user and `['google']` for a Google-only user; `startChain` stores `auth_method`.
- [ ] **Step 2–4:** Implement; `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): keep google sessions out of admin routes and expose sign-in methods`.

### Task 4: The `deleting` state on existing paths (design §6.2)

**Files:** Modify `src/identity/auth/credential-decision.ts`, `src/identity/sessions/session.service.ts`, `src/identity/staff/staff.service.ts`,
`src/entitlements/grants/grants.service.ts` (+ specs of each).

**Interfaces:** password login on `deleting` → the generic invalid-credentials failure (IE11); refresh of a chain whose user is `deleting` → rejected and the chain
revoked (reason `account-deleted`), like `locked`; `lockUser`, `unlockUser`, `setStaffRole`, `updateUser`, `resetPassword` on `deleting` → 409 `account-deleting`;
`setStaffRole`'s last-admin count ignores admins whose status is `deleting` (`staff.service.ts:336`); grant
create/update/revoke for a `deleting` learner → 409 `account-deleting` (via `IdentityService.accountStatus`); registration into the email of a `deleting` account
keeps 409 `email-taken` and adds the extension `reason: 'account-deleting'` (design §6.2, Đề xuất).

- [ ] **Step 1: Failing tests:** one per path above; the last-admin count with one admin `deleting`; plus Review Focus 5 (a regression guard: it already holds today).
- [ ] **Step 2–4:** Implement; `pnpm test`.
- [ ] **Step 5: Commit** `fix(api): treat deleting accounts as unusable on login, refresh and admin actions`.

### Task 5: Shared pieces: the auto-renewing rule, rate limits, mail templates, env keys

**Files:** Create `src/entitlements/billing/auto-renewing.ts` (+ spec); modify `src/common/config/app-config.ts` (`RateLimitRuleName` union and `DEFAULT_LIMITS`),
`src/identity/mailer/templates.ts` (+ spec), `.env.example`, `apps/api/.env.example`.

**Interfaces:**
- `isAutoRenewing(sub: { status: SubscriptionStatus; cancelAtPeriodEnd: boolean }): boolean` — true for `trialing`, `active`, `grace`, `on_hold` with
  `cancelAtPeriodEnd === false`. Existing code that asks the provider about overdue renewals (`billing-jobs.service.ts:133`) keeps its own rule.
- Rate limits `auth.google.ip`, `auth.delete.user` (Global Constraints).
- `accountDeletedMail(to: string, retentionYears: number): MailMessage` and `googleLinkedMail(to: string): MailMessage`, bilingual like the other templates, copy of
  design §14.
- Env keys `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `OAUTH_COOKIE_KEY`, `GOOGLE_FAKE_ENABLED` in both `.env.example` files (values only;
  parsing comes in Task 17).

- [ ] **Step 1: Failing tests:** table over the six statuses × two flags; both templates contain the vi and en lines and the retention years.
- [ ] **Step 2–4:** Implement; `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): add the shared pieces of bước 8`.

---

## M2 — API account deletion (`feat/buoc-8-m2`, from `feat/buoc-8-m1`)

### Task 6: Ports, registry and the "every column has an owner" test

**Files:** Create `src/identity/deletion/account-eraser.ts`, `src/identity/deletion/account-data-map.ts`, `src/identity/deletion/account-data-map.spec.ts`,
`src/common/idempotency/erase-idempotency-keys.ts` (+ spec); modify `src/identity/identity.module.ts`.

**Interfaces (design §7.4):**
- `interface AccountDataEraser { readonly module: ErasableModule; erase(tx, userId: string, anonId: string, opts: { checks: 'normal' | 'skip' }): Promise<void> }`
  (`'skip'` only for replay after a restore, plan review P2), `type ErasableModule = 'practice' |
  'learning' | 'content' | 'notifications' | 'entitlements' | 'ai'`; `ERASE_ORDER: readonly ErasableModule[] = ['practice', 'learning', 'content', 'notifications',
  'entitlements', 'ai']`.
- `interface AccountDeletionPrecondition { renewing(db: Prisma.TransactionClient | PrismaClient, userId: string): Promise<boolean>; turnOffRenewalForAdminDelete(userId): Promise<'turned_off' | 'none' |
  'not_supported'> }`.
- `interface IdentitySettingsReader { unverifiedCleanupDays(): Promise<number>; transactionRetentionYears(): Promise<number> }` (the second one for the mail of
  Task 13, plan review P6).
- `@Injectable() class AccountDeletionRegistry` with `registerEraser`, `registerPrecondition`, `registerSettingsReader`; `erasers(): AccountDataEraser[]` in
  `ERASE_ORDER`, `precondition()`, `settings()` — each throws `Error('Account deletion port not registered: …')` when missing (fail closed, like
  `EntryUsageRegistry`). Exported by `IdentityModule`.
- `deleteIdempotencyKeysOf(tx, userId): Promise<void>` (Common).
- `ACCOUNT_DATA_MAP: Record<string /* "table.column" */, 'erase' | 'anonymise' | 'keep-id' | 'null'>` covering every column of design §7.3 and code facts §1 (53
  columns).

- [ ] **Step 1: Failing tests:** registry throws naming the missing module; returns erasers in `ERASE_ORDER`; `account-data-map.spec.ts` parses every
  `prisma/models/*.prisma`, collects fields mapped to `user_id`, `*_user_id`, `*_by` and fails listing any column absent from `ACCOUNT_DATA_MAP` (B8A7);
  `deleteIdempotencyKeysOf` deletes by `userId` only.
- [ ] **Step 2–4:** Implement; `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): add account deletion ports and the column ownership check`.

### Task 7: Content eraser

**Files:** Create `src/content/private/account-eraser.provider.ts` (+ spec); register it; add `ContentService.privateSenseIdsOf(tx, userId): Promise<string[]>` (used by Task 9).

**Interfaces:** under `content.private:<id>`: `DELETE FROM entries WHERE scope = 'private' AND owner_user_id = $1` (cascades senses, revisions, texts, levels,
inflections, sentences; trigger `entries_clear_form_kind` runs), then `context_sentences` by `user_id`. Staff audit columns untouched (D18).

- [ ] **Step 1: Failing tests (unit, statements only):** the delete targets `scope = 'private' AND owner_user_id = $1` and `context_sentences.user_id`; nothing else;
  `privateSenseIdsOf` queries the user's private senses. Cascades and the trigger are proven in Task 32.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): erase a deleted learner's private words and sentences`.

### Task 8: Learning and Notifications erasers

**Files:** Create `src/learning/account-eraser.provider.ts`, `src/notifications/account-eraser.provider.ts` (+ specs); register them.

**Interfaces:** Learning under `learning.user:<id>`: delete `learning_items`, `learning_log`, `learning_groups` by `user_id`. Notifications: delete `reminder_prefs`,
`reminder_deliveries` by `user_id`.

- [ ] **Step 1: Failing tests:** each deletes only that user's rows; second run no-op.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): erase a deleted learner's learning and reminder data`.

### Task 9: Practice eraser

**Files:** Create `src/practice/maintenance/account-eraser.provider.ts` (+ spec); modify the Practice module to register it.

**Interfaces:** registers `{ module: 'practice', erase }`. Under `practice.user:<id>` lock: delete `practice_reports` whose `sense_id` is one of the user's private
senses (`ContentService.privateSenseIdsOf` from Task 7, read before Content erases them at run time; D27a); for remaining reports set `user_id = anonId`, `note = null`, and clear
`question_snapshot.learner.answer`, `.learner.option_index`, `.learner.answers_tried` (D27b); delete `practice_session_items`, then `practice_questions`,
`practice_sessions`, `practice_ai_requests`, `practice_word_checks` by `user_id`. Idempotent; works with no `users` row.

- [ ] **Step 1: Failing tests (unit, statements and order):** items before questions; private-sense reports deleted, others updated with anon id, null note and the
  three snapshot keys cleared; second run issues the same statements without error (real effects in Task 32);
  a test keeps "own-sentence questions cannot be reported" (`reports.service.ts:106`, B8E55).
- [ ] **Step 2–4:** Implement (bulk `deleteMany` / one `UPDATE … SET question_snapshot = jsonb_set(...)`); `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): erase a deleted learner's practice data`.

### Task 10: Entitlements eraser, precondition and late webhooks

**Files:** Create `src/entitlements/account-deletion.provider.ts` (+ spec); modify `src/entitlements/billing/event-applier.service.ts` (+ spec).

**Interfaces:**
- Eraser under `entitlements.user:<id>` then the three `entitlements.pool:<id>:<pool>` locks (design §7.2 lock order): when `opts.checks = 'normal'` and any subscription
  `isAutoRenewing` → throw `Error('renewing subscription')` (B8E52, retry path); with `'skip'` it erases anyway (B8E53, plan review P2). Delete
  `entitlement_grants` (changes cascade; D30), `billing_events` where `user_id = X OR app_user_id = X OR subscription_id IN (user's subscriptions)`, `subscriptions`,
  `trial_history` (D12), `entitlement_notices` where `user_id = X OR recipient_user_id = X`, `fake_billing_subscriptions`; set `usage_records.user_id = anonId` (D16),
  `billing_transactions.user_id = anonId` (D15).
- Precondition: `renewing(tx, userId)` = any `isAutoRenewing`; `turnOffRenewalForAdminDelete(userId)` reuses the `turnOffPaidRenewals` logic of
  `grants.service.ts:384-396` (extract a shared function), returns `'none'` when nothing renews.
- Event applier: an event ignored as `unknown-user` is stored with `app_user_id = null`, `user_id = null`, `payload = '{}'`, `raw_payload = null` (plan review P22).
- `turnOffRenewalForAdminDelete(userId)` (D31): for each auto-renewing subscription call the adapter's `cancelAtPeriodEnd` **outside any lock**, within `BILLING_ADAPTER_TIMEOUT_MS`;
  for each call that **returned successfully in time**, then under `entitlements.user:<id>` set `subscriptions.cancel_at_period_end = true` itself (log
  `subscription_cancel_recorded_locally`, subscription id only) so the eraser's `renewing` check passes at once; the `cancel_scheduled` event arriving later finds the flag already set and changes
  nothing. Timeout, error or an adapter without `cancelAtPeriodEnd` → `'not_supported'` (Task 14 answers 409 `renewal-not-cancelled`), and nothing is written for that subscription.

- [ ] **Step 1: Failing tests:** each table above; a `grace` subscription makes `renewing` true; anonymised usage rows keep `(pool, operation_id)` unique for the anon
  id; `checks: 'skip'` erases a renewing subscription; `turnOffRenewalForAdminDelete` → `'not_supported'` when the adapter has no `cancelAtPeriodEnd`, times out or errors, and
  then writes no flag (D31); adapter success in time → `cancel_at_period_end = true` written under the `entitlements.user` lock and `'turned_off'` returned, and the later `cancel_scheduled`
  event changes nothing; unknown-user event stored with null ids and empty payloads.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): erase a deleted learner's plans and anonymise usage and transactions`.

### Task 11: AI eraser

**Files:** Modify `src/ai/ai.service.ts` (+ `ai.service.spec.ts:93-107`); create `src/ai/account-eraser.provider.ts`. The CLI (`ai-fake-call-args.ts:85`) calls
`deleteUserData(user)` without `tx` and needs no change.

**Interfaces:** `AiService.deleteUserData(userId: string, tx?: Prisma.TransactionClient)`: with `tx` runs the three statements in it, without `tx` keeps its own
transaction (CLI, smoke B6#24). Eraser `{ module: 'ai', erase: (tx, userId) => deleteUserData(userId, tx) }`.

- [ ] **Step 1: Failing tests:** with `tx`, no `$transaction` is opened and the three statements run in order; without `tx`, current behaviour.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): run the ai data deletion inside the account deletion transaction`.

### Task 12: Two new settings and the settings reader

**Files:** Modify `src/settings/settings.definitions.ts` (+ spec); create `src/settings/identity-settings.provider.ts`; register it in the Settings module.

**Interfaces:** `AppSettings.identity = { unverifiedCleanupDays: number }` (default 7, int 1–365); `AppSettings.entitlements.transactionRetentionYears` (default 10, int
5–30). Provider registers `IdentitySettingsReader` (`unverifiedCleanupDays`, `transactionRetentionYears`) reading `settings.get()`.

- [ ] **Step 1: Failing tests:** defaults; 0 and 366 rejected for days; 4 and 31 rejected for years; `PUT` of the `identity` group through the existing settings API
  records history; **boot test** (plan review P14, like `admin-entries.controller.spec.ts:49-50`): an app built with `createTestApp` has all six erasers in
  `ERASE_ORDER`, the precondition and the settings reader registered (B8E23).
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): add the cleanup days and transaction retention settings`.

### Task 13: Account deletion service

**Files:** Create `src/identity/deletion/account-deletion.service.ts` (+ spec). Uses `accountDeletedMail` from Task 5.

**Interfaces:**
- `delete(input: { userId: string; by: 'self' | 'admin' | 'cleanup'; mode: 'normal' | 'resume' | 'replay'; actorId?: string; res?: Response; cleanupCutoff?: Date }):
  Promise<'done' | 'pending' | 'skipped'>`.
- **Tx A** (`mode` `'normal'` and `'replay'`; `'resume'` skips it): if the target is staff, lock `identity.staff_role` first, then `withUserLock`. Already `deleting`:
  `by = 'self'` → return `'pending'` (B8E54); `'admin'` and `'cleanup'` → go on to Tx B. `mode = 'normal'` rechecks under the lock: an admin deleting itself →
  `self-delete`; last admin (admins whose status is not `deleting`) → `last-admin`; learner self with `precondition().renewing` → `subscription-renewing`; staff self →
  `staff-account`; `cleanup` → still `email_verified_at IS NULL AND staff_role IS NULL AND status IN ('active','locked') AND COALESCE(terms_accepted_at, created_at) <
  cleanupCutoff`, else return `'skipped'` (plan review P4). `mode = 'replay'` skips every recheck (B8E53). Then set `deleting`, `deleting_since`, `deleting_by = by`,
  revoke chains with reason `account-deleted`, invalidate OTPs.
- **Tx B** (`timeout: 120_000`, `SET LOCAL statement_timeout = '120s'`): `withUserLock`; reread `users` (gone → `'done'`); read `email` and `deleting_by`;
  `anonId = randomUUID()`; `registry.erasers()` in order with `checks: mode === 'replay' ? 'skip' : 'normal'`; `deleteIdempotencyKeysOf`; `INSERT … ON CONFLICT DO
  NOTHING` into `deleted_accounts` with `by = deleting_by`; delete `users`. Error → log, return `'pending'`.
- **After commit:** unless `deleting_by = 'cleanup'` or `mode = 'replay'`: `accountDeletedMail(email, await settings().transactionRetentionYears())` via
  `MailDispatcher.afterResponse(res, …)` when `res` is given, else `runNow`.
- `mode = 'resume'` (the retry job, plan review P1) runs Tx B and the mail rule only.

- [ ] **Step 1: Failing tests (unit, fakes for registry, tx and mail):** Tx A commits before any eraser runs; `self-delete`, `last-admin`, `staff-account`,
  `subscription-renewing`; a staff target takes `identity.staff_role` before `identity.user` (call order; the real race B8E40 is in Task 32); cleanup returns
  `'skipped'` when the user became verified or re-registered after the job selected it (P4); an eraser throwing → `'pending'`, account still `deleting`, no
  `deleted_accounts` insert; Review Focus 4: a second run after success returns `'done'` without a second insert; `resume` of a `self` deletion runs Tx B and sends
  exactly one mail, of a `cleanup` one sends none; the mail carries the years from the settings reader (P6); a mail failure still returns `'done'` (B8E35); a second
  `self` request finding `deleting` returns `'pending'` without Tx B (B8E54); replay passes `checks: 'skip'`; the anon id differs from the user id and is identical
  across the erasers of one run.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): delete an account in two transactions with an anonymous id`.

### Task 14: Delete endpoints

**Files:** Create `src/identity/deletion/account-deletion.controller.ts`, `src/identity/deletion/delete.schemas.ts` (+ specs); modify
`src/identity/staff/staff.controller.ts`, `src/identity/staff/staff.service.ts` (+ specs), `test/support/list-routes.spec.ts` (the `roles.manage` route list,
`:46-54`).

**Interfaces:**
- `POST /v1/me/account/delete` body `{ confirm_email: string; acknowledged: true; password?: string }`; limits `user.write` + `auth.delete.user`. Checks: staff →
  409 `staff-account`; `normalizeEmail(confirm_email) !== email` → 400 `confirm-email-mismatch`; has password → verify with `decideCredential` as password change does:
  wrong → **400 `invalid-current-password`**, counted once toward the IR6 lockout (never 401: the web transport refreshes and resends every 401,
  `apps/web/src/app-shell/session/session-store.ts:305-323`; plan review P3); lockout active → the response password change gives today; no password → 403
  `reauth-required` (Task 21 adds the Google proof). Then `delete({ by: 'self', mode: 'normal', res })` → 204 / 202 `{ status: 'pending' }`.
- `POST /v1/admin/users/:id/delete` body `{ confirm_email }`, `@RequirePermission('roles.manage')`, `user.write`. Before Tx A, if `precondition().renewing`, call
  `turnOffRenewalForAdminDelete`; `'not_supported'` → 409 `renewal-not-cancelled`, nothing deleted. **D31:** when the adapter accepted in time, Task 10 has already written
  `cancel_at_period_end = true` itself, so `delete({ by: 'admin', mode: 'normal', actorId, res })` goes on at once and the route answers 204 without waiting for `cancel_scheduled`
  (B8A4 holds for a renewing learner too).
- `GET /v1/admin/users/:id` adds `auto_renewing: boolean` (through `registry.precondition().renewing(prisma, id)`) for the admin dialog (Task 29).

- [ ] **Step 1: Failing tests:** Review Focus 3 (`" Lan@Gmail.com "` accepted, `lan@gmail.co` → mismatch); wrong password → 400 `invalid-current-password` and one
  failed-login count; 6th request in an hour → 429; editor → 403 on the admin route (B8E31); admin route on a `deleting` account reruns Tx B (B8E43);
  `renewal-not-cancelled` leaves the account untouched (B8E47); a renewing learner whose adapter call succeeded → 204 in the same request, no 202 (D31); `list-routes.spec.ts` lists the new
  `roles.manage` route.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): let learners and admins delete accounts`.

### Task 15: Deletion and retention jobs

**Files:** Create `src/identity/deletion/deletion-jobs.service.ts` (+ spec), `src/entitlements/billing/transactions-expire.job.ts` (+ spec); modify
`src/common/maintenance/maintenance.scheduler.ts` (comment at lines 10–14 only: the scheduler runs in **both** the API and the worker, `src/worker.ts:11`,
`common.module.ts:27,31`; every job must be safe to run twice at once).

**Interfaces:**
- `identity.deletion-retry`: accounts `deleting` with `deleting_since < now − 10 min` → `delete({ userId, by: deleting_by, mode: 'resume' })` (plan review P1); log
  `account_deletion_stuck` (warn, user id only) when `deleting_since < now − 24 h`.
- `identity.deletion-sweep`: for `deleted_accounts.deleted_at > now − 24 h`, run every eraser with `checks: 'normal'` in one transaction per user with a fresh anon id
  (rows written late, R1, including `usage_records` written by an in-flight reserve or confirm, plan review P23).
- `identity.unverified-cleanup`: select up to 200 users with `email_verified_at IS NULL AND status IN ('active','locked') AND staff_role IS NULL AND
  COALESCE(terms_accepted_at, created_at) < cutoff` (cutoff = now − N days, N from `IdentitySettingsReader`), then `delete({ by: 'cleanup', mode: 'normal',
  cleanupCutoff: cutoff })` each (Task 13 rechecks under the lock).
- `billing.transactions-expire`: delete `billing_transactions` with `occurred_at` before 1 January of (current year − N) in `Asia/Ho_Chi_Minh`, N from
  `settings.get().entitlements.transactionRetentionYears` (Entitlements reads its own settings).

- [ ] **Step 1: Failing tests (unit):** retry skips a 5-minute-old `deleting` (B8E50) and calls `mode: 'resume'` with the stored `deleting_by`; sweep runs the erasers
  for a deletion 2 h old and not for one 25 h old (M1); cleanup selects a locked unverified account and passes the cutoff; a failed login does not move the cleanup clock
  (`terms_accepted_at` unchanged); expiry keeps a transaction from the boundary year. The real effects (retry finishing a stuck deletion with one mail, sweep nulling a
  late `ai_calls` row) are in Task 32.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): retry, sweep and clean up deleted and unverified accounts`.

### Task 16: Export and replay after a restore (D21)

**Files:** Create `src/cli/accounts-deletions.ts` (+ spec); modify `apps/api/package.json` scripts.

**Interfaces:** `pnpm accounts:export-deletions [--out <file>]` writes JSON lines `{ "user_id", "deleted_at", "by" }` from `deleted_accounts`;
`pnpm accounts:replay-deletions [--from <file>]` takes ids from the file and from `deleted_accounts`, and for each id that still has a `users` row runs
`delete({ by: <by from the line, 'admin' when absent>, mode: 'replay' })` (no mail, conditions skipped, erasers with `checks: 'skip'`). Prints counts and every id
that ended `'pending'`, so the operator runs it again (recorded in `deploy-checklist.md`, Task 33).

- [ ] **Step 1: Failing tests:** argument parsing; replay of an id with a `users` row calls `delete` with `mode: 'replay'` even if it is the last admin or its
  restored subscription row says renewing (B8E53, plan review P2); ids without a row are skipped; pending ids are printed.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): add export and replay of account deletions`.

---

## M3 — API Google sign-in (`feat/buoc-8-m3`, from `feat/buoc-8-m2`)

### Task 17: Configuration and sealed cookies

**Files:** Modify `src/common/config/app-config.ts` (+ spec); create `src/identity/google/sealed-cookie.ts` (+ spec). Env keys are already in both `.env.example`
files (Task 5).

**Interfaces:** env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (required whenever Google is real **or** fake: it is the callback the fake page returns to,
plan review P18), `OAUTH_COOKIE_KEY` (secret, required when Google or the fake is on), `GOOGLE_FAKE_ENABLED` (boolean, default false; rejected together with
`BILLING_PRODUCTION`, like `app-config.ts:238-246`; when both fake and a client id are set, `fake` wins). `config.google = { mode: 'off' | 'real' | 'fake'; clientId;
clientSecret; redirectUri; apiOrigin }` with `apiOrigin = new URL(redirectUri).origin` (the API does not know its own base URL otherwise; used for `start_url` in
Task 21). `sealJson(value: object, ttlSeconds: number, key: Buffer): string` and `openJson<T>(sealed: string, key: Buffer): T | null` wrap the existing AES-256-GCM
`seal` / `open` of `src/identity/sessions/grace-cipher.ts` (plan review P25) with JSON and an expiry inside the payload; `null` on tamper or expiry.

- [ ] **Step 1: Failing tests:** config rejects fake + production (B8E38) and a client id without redirect URI; `open` returns `null` after expiry and for a flipped
  byte.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): configure google sign-in and sealed cookies`.

### Task 18: Google client, real and fake

**Files:** Create `src/identity/google/google-client.ts`, `google-client.real.ts`, `google-client.fake.ts`, `fake-google.controller.ts` (+ specs).

**Interfaces:**
- `abstract class GoogleClient { authorizeUrl(p: { state; nonce; codeChallenge; prompt: 'select_account'; loginHint?: string }): string; exchange(code: string,
  codeVerifier: string): Promise<GoogleIdentity> }` with `type GoogleIdentity = { sub: string; email: string; emailVerified: boolean; givenName?: string; familyName?:
  string; name?: string; picture?: string }`.
- Real: token endpoint via `fetch` with `AbortSignal.timeout(10_000)`; verify the ID token with `createRemoteJWKSet` (Google JWKS URL from the discovery document,
  pinned constant), `issuer` ∈ {`accounts.google.com`, `https://accounts.google.com`}, `audience` = client id, nonce equal; `email_verified` accepted as `true` or
  `"true"`.
- Fake (only when `mode = 'fake'`): `GET /v1/dev/google/authorize?email&sub&name&given_name&family_name&picture&email_verified&state&nonce&code_challenge&redirect_uri`
  remembers the code with its `nonce` and `code_challenge` and redirects back with it; `exchange` refuses a `code_verifier` whose S256 does not match, signs an ID token
  carrying the given claims and the nonce with a key generated at boot, and verifies with `createLocalJWKSet` (plan review P17).

- [ ] **Step 1: Failing tests:** real verifier with a local key pair: wrong `aud`, wrong `iss`, expired, wrong nonce → error (B8E2); `email_verified: "true"` → true; timeout →
  error (B8E4); fake round trip returns the given identity with names and picture; fake refuses a wrong `code_verifier`; fake routes absent when `mode !== 'fake'`.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): add the google client and a fake for tests`.

### Task 19: Start and callback

**Files:** Create `src/identity/google/google-auth.controller.ts`, `google-auth.service.ts`, `src/identity/google/learner-redirect.ts` (+ specs); modify
`src/identity/identity.module.ts`. Uses `googleLinkedMail` from Task 5.

**Interfaces:**
- `learner-redirect.ts`: `toLearnerApp(path: string, params?: Record<string, string>): string` = `new URL(path, LEARNER_APP_URL)` with `params` set through
  `searchParams` (never string concatenation, plan review P7, P8); `safeNext(raw: string | undefined, locale: 'vi' | 'en'): string` parses `new URL(raw,
  LEARNER_APP_URL)`, keeps it only when its origin equals the learner origin and its normalised `pathname` matches `/^\/(vi|en)\/app(\/|$)/`, and returns
  `pathname + search + hash`; else `/{locale}/app`.
- `GET /v1/auth/google/start?intent=login|reauth&locale=vi|en&next=…` (`@Public`, `auth.google.ip`): mode `off` → 302 to `toLearnerApp('/{locale}/app/login', { error:
  'google-unavailable' })`; seal `{ state, nonce, codeVerifier, intent, locale, next: safeNext(next), ticketUserId? }` into `google_oauth`; 302 to `authorizeUrl`.
- `GET /v1/auth/google/callback?code&state`: decision table of design §5.4 (identity by `sub`; verified active email → link + `googleLinkedMail`; locked/deleting
  email match → `account-locked` / `google-failed`, no link; the matching user already has a Google identity with another `sub` → `google-failed`, no link, log
  `google_link_conflict` with the user id only (plan review P13); unverified or none → seal `google_signup` with `{ sub, email, givenName, familyName, picture,
  locale, next }` and 302 to `toLearnerApp('/{locale}/app/google/complete')`). Success → `startChain(..., authMethod: 'google')`, set `refresh_token`, 302 to
  `toLearnerApp(next, { signed_in: 'google' })`. Errors → 302 `toLearnerApp('/{locale}/app/login', { error: <slug> })`. Every `Location` is absolute.

- [ ] **Step 1: Failing tests:** Review Focus 2 (each bad `next` → `/vi/app`; `/vi/app/word?id=1#x` → `…/vi/app/word?id=1&signed_in=google#x`); every `Location`
  starts with `LEARNER_APP_URL`; B8E1 (state mismatch, no exchange call); B8E3 `email_verified` false → `google-email-unverified`; B8E4 client error or timeout →
  `google-failed`; B8E5 link + mail; B8E58 (non-Gmail email links, recorded as the accepted behaviour, D26); B8E11/B8E48 admin-locked → `account-locked`, no identity
  row; a password-lockout (IR6, 10 failed logins) does **not** block Google; identity by `sub` whose user is `deleting` → `google-failed`; P13 conflict →
  `google-failed`, no 500; B8E7 lookup by `sub` after the email changed; new user → no `users` row created (plan review P24).
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): sign in with google`.

### Task 20: Complete a Google sign-up

**Files:** Modify `google-auth.controller.ts`, `google-auth.service.ts` (+ specs); create `src/identity/google/google.schemas.ts`.

**Interfaces:** `GET /v1/auth/google/complete` (cookie) → `{ email, needs_name: boolean }` (`needs_name` when `givenName` is missing; `name` alone does not count) or 401
`invalid-token` when the cookie is missing/expired (the web calls both routes with a plain `fetch`, outside the session transport that refreshes on 401; Task 24, plan
review P19). `POST /v1/auth/google/complete` (cookie + `X-CSRF-Protection: 1`, `auth.register.ip`) body `{ birth_date,
accept_terms: true, timezone, given_name?, family_name? }` (`given_name` required when `needs_name`): under 13 → 400 `age-below-minimum` and the cookie cleared; in a
transaction locked by email: none → create user (verified now, names, `avatar_url = picture`, terms); unverified active → reuse id, overwrite profile, delete password,
revoke chains, mark verified (I15, B8E6); unverified locked → 403 `account-locked`; verified → 409 `email-taken`. Then insert `user_identities`, start a google chain,
set `refresh_token`, clear `google_signup`; response like a web login.

- [ ] **Step 1: Failing tests:** Review Focus 1 (token with only `name` → `needs_name: true`; POST without `given_name` → 400 `validation-failed`); B8E9 under 13 →
  nothing in DB; B8E6 reuse of an unverified account removes its password and chains; B8E10 verified race → 409; B8E8 expired cookie → 401.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): complete a google sign-up`.

### Task 21: Google confirmation before deletion (D25)

**Files:** Modify `google-auth.controller.ts`, `google-auth.service.ts`, `src/identity/deletion/account-deletion.controller.ts` (+ specs).

**Interfaces:** `POST /v1/auth/google/reauth` (Bearer, learner) → `{ start_url }`, an **absolute** URL `config.google.apiOrigin + '/v1/auth/google/start?intent=reauth&
locale=…&ticket=<sealed { userId }, 120 s>'` (Task 17); the callback with `intent = reauth` requires `sub` to be a Google identity of `ticket.userId`: ok → seal `google_reauth` `{ userId }` (300 s, path
`/v1/me/account`) and 302 `toLearnerApp('/{locale}/app/settings/delete-account', { reauth: 'ok' })`; other account → `{ reauth: 'wrong-account' }`. `prompt=select_account`, `login_hint=<sub>`.
`POST /v1/me/account/delete` for an account without a password accepts a valid `google_reauth` for the caller; missing/expired → 403 `reauth-required`.

- [ ] **Step 1: Failing tests:** B8E19 (no cookie, expired cookie), B8E20 (other `sub`), cookie of another user rejected, happy path deletes.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): confirm a google-only account before deleting it`.

---

### Stop point D32, round 1 (after M3, before M5)

The owner does design §5.1 (OAuth client "Web", `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` into `apps/api/.env`, `GOOGLE_REDIRECT_URI` = `http://localhost:3000/v1/auth/google/callback`,
`OAUTH_COOKIE_KEY`) and opens `{API}/v1/auth/google/start?intent=login&locale=vi&next=/vi/app` in the browser. Checks: the `refresh_token` cookie is still there after Google sends the
browser back; `/v1/auth/refresh` succeeds straight after; Google accepted PKCE S256 (the callback did not fail with `google-failed`). Failure → stop, tell the owner, apply the fallback of design §19
(one-time code exchanged by `fetch`) to M3 before M5. M4 may run while waiting; M5 may not start.

---

## M4 — API cancel auto-renewal (`feat/buoc-8-m4`, from `feat/buoc-8-m3`)

### Task 22: Cancel endpoint and the fake provider event

**Files:** Create `src/entitlements/api/me-subscriptions.controller.ts` (+ spec); modify `src/entitlements/billing/fake/fake-billing.adapter.ts` (+ spec).

**Interfaces:** `GET /v1/me/entitlements` is **not** changed: since Bước 5 every entry of `sources[]` already carries `id`, `kind`, `status`, `renews_at`,
`cancel_at_period_end` (`entitlements.service.ts:30-38`; plan review P9). The web applies `isAutoRenewing` to every `sources` entry with `kind = 'subscription'`.
`POST /v1/me/subscriptions/:id/cancel` (`Idempotency-Key`, `user.write`): not the caller's or not `isAutoRenewing` → 409 `subscription-not-cancellable`; adapter
without `cancelAtPeriodEnd` → 409 `cancel-in-store`; adapter timeout/error → 503; success → 202 `{ status: 'requested' }`. Fake adapter `cancelAtPeriodEnd` also stores **and applies** a `cancel_scheduled` event through the normal inbox and applier
**before it returns**, so `subscriptions.cancel_at_period_end` is true when the call ends (deterministic for CI and the smoke; plan review P5). A real provider sends the
event later; the learner route just answers 202 and the page refetches, while the admin deletion route records the flag itself once the adapter accepted (D31, Task 10).

- [ ] **Step 1: Failing tests:** cancel a `grace` subscription (D28); second cancel after the flag → 409 (B8E36); adapter timeout → 503, flag unchanged (B8E37); fake
  applied exactly one `cancel_scheduled` before returning.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): let learners cancel auto-renewal`.

---

## M5 — Learner web (`feat/buoc-8-m5`, from `feat/buoc-8-m4`, after the D32 round 1 result)

### Task 23: "Tiếp tục với Google" and the return

**Files:** Modify `src/features/learner/auth/AuthCard.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `src/app-shell/session/session-store.ts` (+ tests),
`messages/{vi,en}.json`.

**Interfaces:** `GoogleButton({ next })` replaces `GoogleSoon` and navigates with `window.location.assign` to `${API}/v1/auth/google/start?intent=login&locale=
${locale}&next=${encodeURIComponent(next)}`. It does **not** clear the `logout-pending` flag (a failed Google trip must not resume a session the learner just logged
out of, FE38; plan review P21, changing the design §9.1 Đề xuất). On load with `?signed_in=google` the store clears the flag (exported `clearLogoutPending()`),
refreshes, broadcasts `login`, and removes the parameter (B8E45 still holds). Login page maps `?error=` → vi copy of design §9.1 (`google-failed`, `google-unavailable`,
`google-email-unverified`; `account-locked` existing). Register page: `email-taken` with `reason: 'account-deleting'` → "Tài khoản này đang được
xóa, thử lại sau."

- [ ] **Step 1: Failing tests:** button href for `/vi/app/groups` (B8E46); the flag survives a return with `?error=`; `signed_in` with the flag set clears it, refreshes
  and broadcasts (B8E45); each error code shows its text; `email-taken` with `reason: 'account-deleting'` shows its text.
- [ ] **Step 2–4:** Implement; `pnpm --filter web test`.
- [ ] **Step 5: Commit** `feat(web): sign in with google`.

### Task 24: Google sign-up completion page

**Files:** Create `src/app/[locale]/app/(auth)/google/complete/page.app.tsx`, `src/features/learner/auth/GoogleComplete.tsx` (+ test); reuse the fields of
`CompleteProfile.tsx` (extract a shared `BirthAndConsentFields` if needed).

**Interfaces:** both `/v1/auth/google/complete` calls use a plain `fetch` with `credentials: 'include'` (not the session transport, plan review P19). `GET` → shows
email, name fields when `needs_name`, birth date, consent; "Tạo tài khoản" posts with `X-CSRF-Protection: 1`; success → session started, then the usual `RequireSession` flow to `/app/welcome`; 401 → "Phiên đăng ký đã hết hạn" + Google button;
`age-below-minimum` → the register page's text, then login page.

- [ ] **Step 1: Failing tests:** name fields only when `needs_name`; under-13 message; expired message.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(web): complete a google sign-up`.

### Task 25: Settings rows

**Files:** Modify `src/features/learner/settings/SettingsPage.tsx`, `AccountPage.tsx` (+ `settings.test.tsx`), messages.

**Interfaces:** read-only "Đăng nhập bằng: Mật khẩu · Google" from `sign_in_methods`; "Xóa tài khoản" links to `/app/settings/delete-account` for learners, shows
"Liên hệ admin để xóa tài khoản" for staff; Google-only accounts show "Đặt mật khẩu" linking to forgot-password instead of "Đổi mật khẩu".

- [ ] **Step 1: Failing tests:** the three variants. **Step 2–4.** **Step 5: Commit** `feat(web): show sign-in methods and the delete account entry`.

### Task 26: Delete account flow

**Files:** Create `src/app/[locale]/app/(member)/settings/delete-account/page.app.tsx`, `src/features/learner/settings/DeleteAccountPage.tsx` (+ test),
`src/app/[locale]/app/(auth)/account-deleted/page.app.tsx`; modify `src/app-shell/api/problem.ts` (`KNOWN_ERROR_SLUGS` + its test: `confirm-email-mismatch`,
`reauth-required`, `staff-account`, `subscription-renewing`; plan review P20), messages.

**Interfaces:** sections of design §9.4: deleted / kept lists (kept: "hồ sơ thanh toán {N} năm, không kèm tên", "báo lỗi không kèm tên"); auto-renewing (any
`sources` entry with `kind = 'subscription'` passing `isAutoRenewing`, mirrored client-side) → block card linking to `/app/plans`; tick + typed email + password, or "Xác nhận bằng Google"
(`POST /v1/auth/google/reauth` then navigate to `start_url`; `?reauth=ok|wrong-account` handled); "Xóa vĩnh viễn" enabled when all filled; 204/202 → clear the session
store, go to `/app/account-deleted` ("Tài khoản của bạn đã được xóa." / pending text).

- [ ] **Step 1: Failing tests:** block card for a renewing plan (also `grace`); button disabled until complete; mismatch error text; wrong password → 400
  `invalid-current-password` shows the generic text and the transport neither refreshes nor resends (plan review P3); 202 shows the pending text; Google-only path
  shows the Google button instead of the password field.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(web): delete the account from settings`.

### Task 27: "Hủy gói" on the plans page

**Files:** Modify `src/features/learner/plans/PlansPage.tsx` (+ `plans.test.tsx`), `src/app-shell/api/problem.ts` (`subscription-not-cancellable`, `cancel-in-store`),
messages.

**Interfaces:** one row per `sources` entry with `kind = 'subscription'`; renewing (`isAutoRenewing`) → "Gia hạn ngày {renews_at} · [Hủy gói]"; dialog copy of design §8.2; `POST /v1/me/subscriptions/{id}/cancel` with a fresh `Idempotency-Key`; 202
→ "Đã gửi yêu cầu hủy gia hạn" and refetch; `cancel_at_period_end` → "Gói kết thúc ngày {date}"; staff grants show no button.

- [ ] **Step 1: Failing tests:** button shown for `grace`; not for a grant; text after cancel. **Step 2–4.** **Step 5: Commit** `feat(web): cancel auto-renewal`.

---

## M6 — Admin (`feat/buoc-8-m6`, from `feat/buoc-8-m5`)

### Task 28: Google sessions, new error slugs, "Người dùng đã xóa"

**Files:** Modify `src/auth/session-store.ts` (+ test), `src/api/problem.ts` (+ test), `messages/{vi,en}.json`.

**Interfaces:** `auth_method === 'google'` from `/v1/me`, or 403 `password-login-required` anywhere → sign out with notice "Đăng nhập lại bằng mật khẩu để vào trang
quản trị" (B8E44); `KNOWN_ERROR_SLUGS` gains the design §13 slugs used by admin (`self-delete`, `last-admin`, `account-deleting`, `renewal-not-cancelled`,
`confirm-email-mismatch`, `password-login-required`); the remaining "Không rõ người dùng" (`messages/vi.json:85`) becomes "Người dùng đã xóa" (the other two
already say so) and the en strings "Deleted user" (D18). Signing out the admin tab revokes the shared Google chain, so the `/app` tab is signed out too (one cookie,
design §5.7): accepted, written in the test flow (Task 33).

- [ ] **Step 1: Failing tests:** gate signs out on `auth_method: 'google'`; 403 slug handled; slug texts present (existing loop); i18n parity.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(admin): handle google sessions and deleted users`.

### Task 29: Delete a user

**Files:** Create `src/features/users/DeleteUserDialog.tsx` (+ test); modify `UserDetail.tsx`, `UsersPage.tsx`, `users-api.ts` (+ tests), messages.

**Interfaces:** button "Xóa tài khoản" for `roles.manage`, hidden for self and for the last admin; dialog shows name, email, role, "Gõ lại email để xác nhận", and
"Gói tự gia hạn sẽ được tắt" when `auto_renewing` (Task 14) is true; `POST
/v1/admin/users/{id}/delete`; success → list with "Đã xóa tài khoản"; `renewal-not-cancelled` text of design §10. Labels "Mật khẩu" / "Google" from
`sign_in_methods`; badge "Đang xóa" for `deleting`, hiding lock, unlock, edit, reset, role actions.

- [ ] **Step 1: Failing tests:** button visibility rules; mismatch keeps the dialog open; badge hides actions.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(admin): delete user accounts`.

### Task 30: Settings fields

**Files:** Modify `src/features/settings/settings-api.ts` (`SECTIONS` adds `'identity'`, layout entries), `SettingsPage.tsx` (+ tests), messages.

**Interfaces:** tab "Tài khoản" with `unverified_cleanup_days` (1–365); `transaction_retention_years` (5–30) in the plans tab with hint "Luật Kế toán: tối thiểu 5–10 năm
tùy loại chứng từ".

- [ ] **Step 1: Failing tests:** both fields render and validate bounds. **Step 2–4.** **Step 5: Commit** `feat(admin): edit cleanup and retention settings`.

### Task 31: Real-stack admin case

**Files:** Add a spec under `apps/admin/e2e-real/` (job `admin-e2e-real`).

- [ ] **Step 1:** Test: admin creates a learner, deletes it from the detail page typing the email, the list no longer shows it, and the API returns 404 for its id.
- [ ] **Step 2:** `pnpm --filter admin test:e2e:real` passes locally against the real stack.
- [ ] **Step 3: Commit** `test(admin): delete a learner on the real stack`.

---

## M7 — Smoke, documents, real runs (`feat/buoc-8-m7`, from `feat/buoc-8-m6`, last)

### Task 32: `pnpm smoke:buoc-8`

**Files:** Create `apps/api/scripts/smoke-buoc-8.mjs`; modify `apps/api/package.json`.

**Interfaces:** runs against a real API and worker with `GOOGLE_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true`, a fresh DB and its own `JOB_QUEUE_PREFIX`; stops when
its env says otherwise (like the earlier smokes). Cases (design §17): Google new user, under 13, unverified email reuse, K8 link; delete with password; delete
Google-only via reauth; blocked by renewing then cancel then delete; admin delete; unverified cleanup (settings to 1 day, back-dated row); replay after inserting the
user row again (including a restored subscription row that says renewing, P2); counts of every §7.3 table before and after (anon rows present, no real id except
`deleted_accounts`, `rate_limit_counters`); a slow fake AI call across a deletion then the sweep (M1); timing of a learner with 50 000 `learning_log` rows and 2 000
private words, **asserted under 120 s** (B8E49). Added after the plan review (P10): a stuck deletion made with psql (`deleting`, `deleting_since` 11 min ago,
`deleting_by = 'self'`) then `pnpm maintenance:run` → deleted, exactly one mail in Mailpit (B8E22, M14); two admin deletions in parallel while psql holds
`identity.staff_role` (like FE29, `scripts/smoke-buoc-0-3-fixes.mjs:277-310`) → one 409 `last-admin` (B8E40); a renewal re-enabled between Tx A and Tx B → `pending`,
then done after cancel (B8E52); a confirmed report of the deleted learner keeps `refunded = false` (B8E27); re-registration gets a trial again (B8E28); Mailpit has the
"đã xóa" mail and `deleted_accounts.by = 'admin'` for the admin case (B8A3, B8A4); extra users are inserted with psql (`sqlUsers` of the 0–3 fixes smoke) so the
script stays under `auth.register.ip` (5 an hour). D31 case: an admin deletes a learner who is auto-renewing on the fake provider → 204 in the same request, subscription rows gone,
`cancel_at_period_end` was recorded locally before Tx B (log `subscription_cancel_recorded_locally`), and the "đã xóa" mail is in Mailpit.

- [ ] **Step 1:** Write the script; **Step 2:** run twice, each on a fresh DB, output saved to `docs/deliveries/buoc-8-smoke-output.txt`; **Step 3: Commit**
  `test(api): add the bước 8 smoke`.

### Task 33: Documents and real runs

**Files:** Create `docs/deliveries/buoc-8-test-flow.md`; modify `docs/deliveries/buoc-8.md` (as-built), `docs/deliveries/deploy-checklist.md`, `CLAUDE.md`.

- [ ] **Step 1:** Test flow: the owner's Google Cloud steps of design §5.1 with screenshots, local `.env`, the manual pass (sign in with Google, delete, admin delete,
  cancel).
- [ ] **Step 2:** `deploy-checklist.md`: every item of design §18 (Google production + brand verification, privacy policy items, question 26 review, backup procedure and
  outside-DB list, log retention, mobile Google and Apple, real provider cancel).
- [ ] **Step 3:** Run `smoke:buoc-0-3-fixes`, `smoke:buoc-4`, `smoke:buoc-5` (both fetchState modes), `smoke:buoc-6`, `smoke:buoc-7`, `smoke:buoc-8`; Claude's browser
  pass on the Docker stack with screenshots, with the fake Google page served from a cross-site host (`127.0.0.1` while the web runs on `localhost`) so the redirect
  chain is cross-site like real Google (plan review P11); the owner's **second** real Google sign-in (B8A8, D32; the first was the stop point after M3), result recorded. Note the
  `ASSUMPTION`s of design §19 (cookie after the redirect, PKCE with a Web client) as confirmed or not, with the result of round 1.
- [ ] **Step 4:** `CLAUDE.md`: Bước 8 section (one line to `docs/deliveries/buoc-8.md`), phase line, `.env` variables; `buoc-8.md` as-built.
- [ ] **Step 5: Commit** `docs(buoc-8): record the as-built, test flow and deploy items`.
