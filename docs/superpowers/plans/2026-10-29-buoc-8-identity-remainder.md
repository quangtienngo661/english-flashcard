# Bước 8 — Google sign-in and account deletion — Implementation Plan

> **Status 29/10/2026:** written after the owner approved the design ("Duyệt, viết plan"). The owner asked for an independent review of this plan before
> execution. Execution method is already chosen (D4b): parallel sessions, one branch and one PR per milestone, a coordinating session, Claude reviews each PR and
> runs the real checks.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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
- **Branches:** one per milestone `feat/buoc-8-m<N>` from `origin/dev`; PR into `dev`; CI green; scan for secrets before every push. Order: M1 → (M2 ∥ M3 ∥ M4) →
  (M5 ∥ M6) → M7; Task 21 (M3) needs Task 14 (M2) merged first.
- **`.env.example`** gets every new variable with a safe local value; `docker-compose`/`pnpm bootstrap` env files too (see `docs/deliveries/docker-bootstrap.md`).

## Review Focus

1. **Google sends `name` but no `given_name` / `family_name`, or no name at all** → the complete page asks for given/family name; never a user with an empty given
   name. Test in Task 20.
2. **`next` like `//evil.example`, `https://evil.example/vi/app`, `/fr/app`, `/vi/apps`, `/vi/app/../../x`** → falls back to `/{locale}/app`. Test in Task 19.
3. **Typed confirmation email `" Lan@Gmail.com "`** → accepted after `normalizeEmail`; `lan@gmail.co` → `confirm-email-mismatch`. Test in Task 14.
4. **An eraser run twice, or after the `users` row is gone (retry, sweep, replay)** → no error, no second `deleted_accounts` row, rows written late are handled. Tests in
   Task 13 and Task 15.
5. **A refresh inside the 10 s grace window right after Tx A revoked the chain** → refused (chain revoked and account `deleting`). Test in Task 4.

---

## M1 — API foundation (`feat/buoc-8-m1`)

### Task 1: Schema for Bước 8

**Files:** Modify `apps/api/prisma/models/identity.prisma`; create `apps/api/prisma/migrations/20261029090000_buoc8_identity/migration.sql`.

**Interfaces (design §12):**
- `users`: CHECK `users_status_check` becomes `('active','locked','deleting')`; add `deleting_since timestamptz NULL`, `deleting_by varchar(16) NULL` CHECK
  `('self','admin','cleanup')` (who started a deletion, so the retry job writes the right `deleted_accounts.by`; not in the design table, needed by its §7.2 retry),
  `avatar_url varchar(2048) NULL`.
- `user_identities`: `id uuid PK default gen_random_uuid()`, `user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE`, `provider varchar(16) NOT NULL CHECK (provider IN
  ('google'))`, `subject varchar(255) NOT NULL`, `created_at timestamptz NOT NULL`; unique `(provider, subject)`, unique `(user_id, provider)`. Prisma model
  `UserIdentity`.
- `session_chains.auth_method varchar(16) NOT NULL DEFAULT 'password'` CHECK `('password','google')`.
- `deleted_accounts`: `user_id uuid PK` (no FK), `deleted_at timestamptz NOT NULL`, `by varchar(16) NOT NULL CHECK (by IN ('self','admin','cleanup'))`; index on
  `deleted_at`. Prisma model `DeletedAccount`.

- [ ] **Step 1:** Write the migration and the models.
- [ ] **Step 2:** On a fresh DB: `pnpm db:setup` succeeds; `pnpm prisma migrate diff --from-migrations prisma/migrations --to-schema prisma --exit-code` (the CI drift
  check) exits 0; `pnpm typecheck` passes.
- [ ] **Step 3: Commit** `feat(api): add the bước 8 identity schema`.

### Task 2: Account state on every request (D24, D29)

**Files:** Create `src/identity/sessions/account-status.reader.ts` (+ spec); modify `src/identity/sessions/auth.guard.ts` (+ `auth.guard.spec.ts`), the request
type the guard attaches to, `src/identity/identity.module.ts`, `test/support/create-test-app.ts`.

**Interfaces:**
- `abstract class AccountStatusReader { read(userId: string, chainId: string): Promise<AccountState | null> }` with
  `type AccountState = { status: 'active' | 'locked' | 'deleting'; authMethod: 'password' | 'google'; revoked: boolean }`. Prisma implementation: one query on
  `session_chains` by id joined to `users`, `null` when no row or the chain is not that user's.
- `AuthGuard` on non-`@Public` routes: after `tokens.verify`, `read()`; `null`, `revoked`, `locked` or `deleting` → 401 `invalid-token`; otherwise attach
  `request.account = { authMethod }`. `@Public` routes: unchanged (attach user if the token is valid, no DB read).
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
- `PermissionGuard`: chain `auth_method = 'google'` → 403 `password-login-required` (use `request.account` from Task 2, no second read).
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
revoked (reason `account-deleted`), like `locked`; `lockUser`, `unlockUser`, `setStaffRole`, `updateUser`, `resetPassword` on `deleting` → 409 `account-deleting`; grant
create/update/revoke for a `deleting` learner → 409 `account-deleting` (via `IdentityService.accountStatus`); registration into the email of a `deleting` account
keeps 409 `email-taken` and adds the extension `reason: 'account-deleting'` (design §6.2, Đề xuất).

- [ ] **Step 1: Failing tests:** one per path above; plus Review Focus 5: a refresh inside the grace window after the chain was revoked by deletion → rejected.
- [ ] **Step 2–4:** Implement; `pnpm test`.
- [ ] **Step 5: Commit** `fix(api): treat deleting accounts as unusable on login, refresh and admin actions`.

### Task 5: The "auto-renewing" predicate

**Files:** Create `src/entitlements/billing/auto-renewing.ts` (+ spec).

**Interfaces:** `isAutoRenewing(sub: { status: SubscriptionStatus; cancelAtPeriodEnd: boolean }): boolean` — true for `trialing`, `active`, `grace`, `on_hold`
with `cancelAtPeriodEnd === false`. `billing-jobs.service.ts:133` keeps its own rule (design §7.1).

- [ ] **Step 1: Failing test:** table over the six statuses × two flags.
- [ ] **Step 2–4:** Implement; `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): add the shared auto-renewing rule`.

---

## M2 — API account deletion (`feat/buoc-8-m2`, after M1)

### Task 6: Ports, registry and the "every column has an owner" test

**Files:** Create `src/identity/deletion/account-eraser.ts`, `src/identity/deletion/account-data-map.ts`, `src/identity/deletion/account-data-map.spec.ts`,
`src/common/idempotency/erase-idempotency-keys.ts` (+ spec); modify `src/identity/identity.module.ts`.

**Interfaces (design §7.4):**
- `interface AccountDataEraser { readonly module: ErasableModule; erase(tx, userId: string, anonId: string): Promise<void> }`, `type ErasableModule = 'practice' |
  'learning' | 'content' | 'notifications' | 'entitlements' | 'ai'`; `ERASE_ORDER: readonly ErasableModule[] = ['practice', 'learning', 'content', 'notifications',
  'entitlements', 'ai']`.
- `interface AccountDeletionPrecondition { renewing(tx, userId): Promise<boolean>; turnOffRenewalForAdminDelete(userId): Promise<'turned_off' | 'none' |
  'not_supported'> }`.
- `interface IdentitySettingsReader { unverifiedCleanupDays(): Promise<number> }`.
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

**Files:** Create `src/content/private/account-eraser.provider.ts` (+ spec); register it; add `ContentService.privateSenseIdsOf(userId, tx): Promise<string[]>` (used by Task 9).

**Interfaces:** under `content.private:<id>`: `DELETE FROM entries WHERE scope = 'private' AND owner_user_id = $1` (cascades senses, revisions, texts, levels,
inflections, sentences; trigger `entries_clear_form_kind` runs), then `context_sentences` by `user_id`. Staff audit columns untouched (D18).

- [ ] **Step 1: Failing tests:** private entries and the user's sentences on catalog senses are gone; another user's private entry and catalog senses stay;
  `privateSenseIdsOf` returns the private sense ids.
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

- [ ] **Step 1: Failing tests:** order (items before questions); private-sense reports deleted, others anonymised with note and answers cleared; second run is a no-op;
  a test keeps "own-sentence questions cannot be reported" (`reports.service.ts:106`, B8E55).
- [ ] **Step 2–4:** Implement (bulk `deleteMany` / one `UPDATE … SET question_snapshot = jsonb_set(...)`); `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): erase a deleted learner's practice data`.

### Task 10: Entitlements eraser, precondition and late webhooks

**Files:** Create `src/entitlements/account-deletion.provider.ts` (+ spec); modify `src/entitlements/billing/event-applier.service.ts` (+ spec).

**Interfaces:**
- Eraser under `entitlements.user:<id>`: if any subscription `isAutoRenewing` → throw `Error('renewing subscription')` (B8E52, retry path). Delete
  `entitlement_grants` (changes cascade; D30), `billing_events` where `user_id = X OR app_user_id = X OR subscription_id IN (user's subscriptions)`, `subscriptions`,
  `trial_history` (D12), `entitlement_notices` where `user_id = X OR recipient_user_id = X`, `fake_billing_subscriptions`; set `usage_records.user_id = anonId` (D16),
  `billing_transactions.user_id = anonId` (D15).
- Precondition: `renewing(tx, userId)` = any `isAutoRenewing`; `turnOffRenewalForAdminDelete(userId)` reuses the `turnOffPaidRenewals` logic of
  `grants.service.ts:384-396` (extract a shared function), returns `'none'` when nothing renews.
- Event applier: an event ignored as `unknown-user` is stored with `app_user_id = null`, `user_id = null`.

- [ ] **Step 1: Failing tests:** each table above; a `grace` subscription makes `renewing` true; anonymised usage rows keep `(pool, operation_id)` unique for the anon
  id; `turnOffRenewalForAdminDelete` → `'not_supported'` when the adapter has no `cancelAtPeriodEnd`; unknown-user event stored with null ids.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): erase a deleted learner's plans and anonymise usage and transactions`.

### Task 11: AI eraser

**Files:** Modify `src/ai/ai.service.ts` (+ `ai.service.spec.ts:93-107`), `src/cli/ai-fake-call*.ts`; create `src/ai/account-eraser.provider.ts`.

**Interfaces:** `AiService.deleteUserData(userId: string, tx?: Prisma.TransactionClient)`: with `tx` runs the three statements in it, without `tx` keeps its own
transaction (CLI, smoke B6#24). Eraser `{ module: 'ai', erase: (tx, userId) => deleteUserData(userId, tx) }`.

- [ ] **Step 1: Failing tests:** with `tx`, no `$transaction` is opened and the three statements run in order; without `tx`, current behaviour.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): run the ai data deletion inside the account deletion transaction`.

### Task 12: Two new settings and the settings reader

**Files:** Modify `src/settings/settings.definitions.ts` (+ spec); create `src/settings/identity-settings.provider.ts`; register it in the Settings module.

**Interfaces:** `AppSettings.identity = { unverifiedCleanupDays: number }` (default 7, int 1–365); `AppSettings.entitlements.transactionRetentionYears` (default 10, int
5–30). Provider registers `IdentitySettingsReader` reading `settings.get()`.

- [ ] **Step 1: Failing tests:** defaults; 0 and 366 rejected for days; 4 and 31 rejected for years; `PUT` of the `identity` group through the existing settings API
  records history.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): add the cleanup days and transaction retention settings`.

### Task 13: Account deletion service

**Files:** Create `src/identity/deletion/account-deletion.service.ts` (+ spec); modify `src/identity/mailer/templates.ts` (`accountDeletedMail`).

**Interfaces:**
- `delete(input: { userId: string; by: 'self' | 'admin' | 'cleanup'; mode: 'normal' | 'replay'; actorId?: string; res?: Response }): Promise<'done' | 'pending'>`.
- Tx A (skipped when `mode = 'replay'` checks, see below): if the target is staff, lock `identity.staff_role` first, then `withUserLock`; recheck §7.1 (self →
  `self-delete`, last admin counting admins whose status is not `deleting` → `last-admin`, learner self with `precondition().renewing` → `subscription-renewing`, staff
  self → `staff-account`); already `deleting`: `self` returns `'pending'`, `admin` goes on to Tx B; else set `deleting`, `deleting_since`, `deleting_by = by`, revoke chains with reason
  `account-deleted`, invalidate OTPs.
- Tx B (`timeout: 120_000`, `SET LOCAL statement_timeout = '120s'`): `withUserLock`; reread `users` (gone → `'done'`); read email; `anonId = randomUUID()`;
  `registry.erasers()` in order; `deleteIdempotencyKeysOf`; `INSERT … ON CONFLICT DO NOTHING` into `deleted_accounts`; delete `users`. Error → log, return `'pending'`.
- After commit: `accountDeletedMail(email, retentionYears)` via `MailDispatcher.afterResponse(res, …)` when `res` is given, else `runNow`; never for `cleanup`
  or `replay`.
- `mode = 'replay'` skips every §7.1 condition (B8E53).

- [ ] **Step 1: Failing tests:** ordering (Tx A commits before erasers run); `self-delete`, `last-admin`, `staff-account`, `subscription-renewing`; two admins
  deleting each other serialize on `identity.staff_role` (second gets `last-admin`, B8E40); an eraser throwing → `'pending'`, account still `deleting`, no
  `deleted_accounts` row; Review Focus 4: second run after success returns `'done'` without a second insert; mail sent once for `self`/`admin`, never for `cleanup`;
  anon id not equal to user id and identical across erasers of one run; a mail failure still returns `'done'` (B8E35); a second `self` request finding
  `deleting` returns `'pending'` without running Tx B (B8E54).
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): delete an account in two transactions with an anonymous id`.

### Task 14: Delete endpoints

**Files:** Create `src/identity/deletion/account-deletion.controller.ts` (+ spec); modify `src/identity/staff/staff.controller.ts` (+ spec),
`src/identity/deletion/delete.schemas.ts`.

**Interfaces:**
- `POST /v1/me/account/delete` body `{ confirm_email: string; acknowledged: true; password?: string }`; limits `user.write` + `auth.delete.user`. Checks: staff →
  409 `staff-account`; `normalizeEmail(confirm_email) !== email` → 400 `confirm-email-mismatch`; has password → verify with the same path as login (generic failure
  on mismatch, counts toward IR6 lockout); no password → 403 `reauth-required` (Task 21 adds the Google proof). Then `delete({ by: 'self' })` → 204 / 202
  `{ status: 'pending' }`.
- `POST /v1/admin/users/:id/delete` body `{ confirm_email }`, `@RequirePermission('roles.manage')`, `user.write`. Before Tx A, if `precondition().renewing`, call
  `turnOffRenewalForAdminDelete`; `'not_supported'` → 409 `renewal-not-cancelled`. Then `delete({ by: 'admin', actorId })`.
- `GET /v1/admin/users/:id` adds `auto_renewing: boolean` (through `registry.precondition().renewing`) for the admin dialog (Task 29).

- [ ] **Step 1: Failing tests:** Review Focus 3 (`" Lan@Gmail.com "` accepted, `lan@gmail.co` → mismatch); wrong password → generic 401; 6th request in an hour →
  429; editor → 403 on the admin route (B8E31); admin route on a `deleting` account reruns Tx B (B8E43); `renewal-not-cancelled` leaves the account untouched (B8E47).
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): let learners and admins delete accounts`.

### Task 15: Deletion and retention jobs

**Files:** Create `src/identity/deletion/deletion-jobs.service.ts` (+ spec), `src/entitlements/billing/transactions-expire.job.ts` (+ spec); modify
`src/common/maintenance/maintenance.scheduler.ts` (comment at lines 10–14 only).

**Interfaces:**
- `identity.deletion-retry`: accounts `deleting` with `deleting_since < now − 10 min` → `delete({ by: users.deleting_by, mode: 'normal' })`, which goes straight to Tx B for a `deleting` account;
  log `account_deletion_stuck` when `deleting_since < now − 24 h`.
- `identity.deletion-sweep`: for `deleted_accounts.deleted_at > now − 24 h`, run every eraser in one transaction with a fresh anon id (rows written late, R1).
- `identity.unverified-cleanup`: `email_verified_at IS NULL AND status IN ('active','locked') AND staff_role IS NULL AND COALESCE(terms_accepted_at, created_at) <
  now − N days` (N from `IdentitySettingsReader`), up to 200, `delete({ by: 'cleanup' })`.
- `billing.transactions-expire`: delete `billing_transactions` with `occurred_at` before 1 January of (current year − N) in `Asia/Ho_Chi_Minh`.

- [ ] **Step 1: Failing tests:** retry skips a 5-minute-old `deleting` (B8E50); a late `ai_calls` row of a deleted user is nulled by the sweep (M1); cleanup picks a
  locked unverified account and ignores one re-registered 6 days ago (B8E32, B8E51); a failed login does not move the cleanup clock; expiry keeps a transaction from
  the boundary year.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): retry, sweep and clean up deleted and unverified accounts`.

### Task 16: Export and replay after a restore (D21)

**Files:** Create `src/cli/accounts-deletions.ts` (+ spec); modify `apps/api/package.json` scripts.

**Interfaces:** `pnpm accounts:export-deletions [--out <file>]` writes JSON lines `{ "user_id", "deleted_at", "by" }` from `deleted_accounts`;
`pnpm accounts:replay-deletions [--from <file>]` takes ids from the file and from `deleted_accounts`, and for each id that still has a `users` row runs
`delete({ by: <by from the line, 'admin' when absent>, mode: 'replay' })` (no mail, conditions skipped). Prints counts.

- [ ] **Step 1: Failing tests:** argument parsing; replay of an id with a `users` row deletes it even if it is the last admin (B8E53); ids without a row are skipped.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): add export and replay of account deletions`.

---

## M3 — API Google sign-in (`feat/buoc-8-m3`, after M1; Task 21 after Task 14)

### Task 17: Configuration and sealed cookies

**Files:** Modify `src/common/config/app-config.ts` (+ spec), `apps/api/.env.example`; create `src/identity/google/sealed-cookie.ts` (+ spec).

**Interfaces:** env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (required when the client id is set), `OAUTH_COOKIE_KEY` (secret, required when
Google or the fake is on), `GOOGLE_FAKE_ENABLED` (boolean, default false; rejected together with `BILLING_PRODUCTION`, like `app-config.ts:238-246`).
`config.google = { mode: 'off' | 'real' | 'fake'; clientId; clientSecret; redirectUri }`. `seal(value: object, ttlSeconds): string` and `open<T>(sealed: string):
T | null` (AES-256-GCM, expiry inside the payload, `null` on tamper or expiry).

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
- Fake (only when `mode = 'fake'`): `GET /v1/dev/google/authorize?email&sub&name&email_verified&state&redirect_uri` redirects back with a code; `exchange` signs with a
  key generated at boot and verifies with `createLocalJWKSet`.

- [ ] **Step 1: Failing tests:** real verifier with a local key pair: wrong `aud`, wrong `iss`, expired, wrong nonce → error (B8E2); `email_verified: "true"` → true; timeout →
  error (B8E4); fake round trip returns the given identity; fake routes absent when `mode !== 'fake'`.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): add the google client and a fake for tests`.

### Task 19: Start and callback

**Files:** Create `src/identity/google/google-auth.controller.ts`, `google-auth.service.ts` (+ specs); modify `src/identity/mailer/templates.ts`
(`googleLinkedMail`), `src/identity/identity.module.ts`.

**Interfaces:**
- `GET /v1/auth/google/start?intent=login|reauth&locale=vi|en&next=…` (`@Public`, `auth.google.ip`): mode `off` → 302 to `/{locale}/app/login?error=google-unavailable`;
  `next` must match `/^\/(vi|en)\/app(?=[/?#]|$)/` and contain no `..`, else `/{locale}/app`; seal `{ state, nonce, codeVerifier, intent, locale, next, ticketUserId? }`
  into `google_oauth`; 302 to `authorizeUrl`.
- `GET /v1/auth/google/callback?code&state`: decision table of design §5.4 (identity by `sub`; verified active email → link + `googleLinkedMail`; locked/deleting
  email match → `account-locked` / `google-failed`, no link; unverified or none → seal `google_signup` with `{ sub, email, givenName, familyName, picture, locale, next }`
  and 302 to `/{locale}/app/google/complete`). Success → `startChain(..., authMethod: 'google')`, set `refresh_token`, 302 to `LEARNER_APP_URL + next +
  '?signed_in=google'`. Errors → 302 `/{locale}/app/login?error=<slug>`.

- [ ] **Step 1: Failing tests:** Review Focus 2 (each bad `next` → `/vi/app`); B8E1 (state mismatch, no exchange call); B8E5 link + mail; B8E58 (non-Gmail email links,
  recorded as the accepted behaviour, D26); B8E11/B8E48 locked → `account-locked`, no identity row; B8E7 lookup by `sub` after the email changed; new user → no
  `users` row created.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): sign in with google`.

### Task 20: Complete a Google sign-up

**Files:** Modify `google-auth.controller.ts`, `google-auth.service.ts` (+ specs); create `src/identity/google/google.schemas.ts`.

**Interfaces:** `GET /v1/auth/google/complete` (cookie) → `{ email, needs_name: boolean }` (`needs_name` when `givenName` is missing; `name` alone does not count) or 401
`invalid-token` when the cookie is missing/expired. `POST /v1/auth/google/complete` (cookie + `X-CSRF-Protection: 1`, `auth.register.ip`) body `{ birth_date,
accept_terms: true, timezone, given_name?, family_name? }` (`given_name` required when `needs_name`): under 13 → 400 `age-below-minimum` and the cookie cleared; in a
transaction locked by email: none → create user (verified now, names, `avatar_url = picture`, terms); unverified active → reuse id, overwrite profile, delete password,
revoke chains, mark verified (I15, B8E6); unverified locked → 403 `account-locked`; verified → 409 `email-taken`. Then insert `user_identities`, start a google chain,
set `refresh_token`, clear `google_signup`; response like a web login.

- [ ] **Step 1: Failing tests:** Review Focus 1 (token with only `name` → `needs_name: true`; POST without `given_name` → 400 `validation-failed`); B8E9 under 13 →
  nothing in DB; B8E6 reuse of an unverified account removes its password and chains; B8E10 verified race → 409; B8E8 expired cookie → 401.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): complete a google sign-up`.

### Task 21: Google confirmation before deletion (D25)

**Files:** Modify `google-auth.controller.ts`, `google-auth.service.ts`, `src/identity/deletion/account-deletion.controller.ts` (+ specs).

**Interfaces:** `POST /v1/auth/google/reauth` (Bearer, learner) → `{ start_url }` where `start_url` = `/v1/auth/google/start?intent=reauth&locale=…&ticket=<sealed {
userId }, 120 s>`; the callback with `intent = reauth` requires `sub` to be a Google identity of `ticket.userId`: ok → seal `google_reauth` `{ userId }` (300 s, path
`/v1/me/account`) and 302 `/{locale}/app/settings/delete-account?reauth=ok`; other account → `?reauth=wrong-account`. `prompt=select_account`, `login_hint=<sub>`.
`POST /v1/me/account/delete` for an account without a password accepts a valid `google_reauth` for the caller; missing/expired → 403 `reauth-required`.

- [ ] **Step 1: Failing tests:** B8E19 (no cookie, expired cookie), B8E20 (other `sub`), cookie of another user rejected, happy path deletes.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): confirm a google-only account before deleting it`.

---

## M4 — API cancel auto-renewal (`feat/buoc-8-m4`, after M1)

### Task 22: Cancel endpoint, entitlement fields, fake provider event

**Files:** Create `src/entitlements/api/me-subscriptions.controller.ts` (+ spec); modify `src/entitlements/entitlements.service.ts` (`snapshot`),
`src/entitlements/billing/fake/fake-billing.adapter.ts` (+ spec).

**Interfaces:** `GET /v1/me/entitlements` adds `subscription_id`, `renews_at`, `cancel_at_period_end` of the current paid subscription (null when none).
`POST /v1/me/subscriptions/:id/cancel` (`Idempotency-Key`, `user.write`): not the caller's or not `isAutoRenewing` → 409 `subscription-not-cancellable`; adapter
without `cancelAtPeriodEnd` → 409 `cancel-in-store`; adapter timeout/error → 503; success → 202 `{ status: 'requested' }`. Fake adapter `cancelAtPeriodEnd` also emits
a `cancel_scheduled` event through its wire so `subscriptions.cancel_at_period_end` becomes true through the normal applier.

- [ ] **Step 1: Failing tests:** cancel a `grace` subscription (D28); second cancel after the flag → 409 (B8E36); adapter timeout → 503, flag unchanged (B8E37); fake
  emits exactly one `cancel_scheduled`; snapshot fields.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(api): let learners cancel auto-renewal`.

---

## M5 — Learner web (`feat/buoc-8-m5`, after M2–M4)

### Task 23: "Tiếp tục với Google" and the return

**Files:** Modify `src/features/learner/auth/AuthCard.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`, `src/app-shell/session/session-store.ts` (+ tests),
`messages/{vi,en}.json`.

**Interfaces:** `GoogleButton({ next })` replaces `GoogleSoon`: clears the `logout-pending` flag (exported `clearLogoutPending()`), then
`window.location.assign(`${API}/v1/auth/google/start?intent=login&locale=${locale}&next=${encodeURIComponent(next)}`)`. On load with `?signed_in=google` the store
refreshes, broadcasts `login`, and removes the parameter. Login page maps `?error=` → vi copy of design §9.1 (`google-failed`, `google-unavailable`,
`google-email-unverified`; `account-locked` existing). Register page: `email-taken` with `reason: 'account-deleting'` → "Tài khoản này đang được
xóa, thử lại sau."

- [ ] **Step 1: Failing tests:** button href for `/vi/app/groups` (B8E46); flag cleared before navigation (B8E45); `signed_in` triggers refresh + broadcast; each error
  code shows its text.
- [ ] **Step 2–4:** Implement; `pnpm --filter web test`.
- [ ] **Step 5: Commit** `feat(web): sign in with google`.

### Task 24: Google sign-up completion page

**Files:** Create `src/app/[locale]/app/(auth)/google/complete/page.app.tsx`, `src/features/learner/auth/GoogleComplete.tsx` (+ test); reuse the fields of
`CompleteProfile.tsx` (extract a shared `BirthAndConsentFields` if needed).

**Interfaces:** `GET /v1/auth/google/complete` → shows email, name fields when `needs_name`, birth date, consent; "Tạo tài khoản" posts with
`X-CSRF-Protection: 1`; success → session started, then the usual `RequireSession` flow to `/app/welcome`; 401 → "Phiên đăng ký đã hết hạn" + Google button;
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
`src/app/[locale]/app/(auth)/account-deleted/page.app.tsx`; modify messages.

**Interfaces:** sections of design §9.4: deleted / kept lists (kept: "hồ sơ thanh toán {N} năm, không kèm tên", "báo lỗi không kèm tên"); auto-renewing (from
`/v1/me/entitlements`, `isAutoRenewing` mirrored client-side) → block card linking to `/app/plans`; tick + typed email + password, or "Xác nhận bằng Google"
(`POST /v1/auth/google/reauth` then navigate to `start_url`; `?reauth=ok|wrong-account` handled); "Xóa vĩnh viễn" enabled when all filled; 204/202 → clear the session
store, go to `/app/account-deleted` ("Tài khoản của bạn đã được xóa." / pending text).

- [ ] **Step 1: Failing tests:** block card for a renewing plan; button disabled until complete; mismatch error text; 202 shows the pending text; Google-only path shows the
  Google button instead of the password field.
- [ ] **Step 2–4.** **Step 5: Commit** `feat(web): delete the account from settings`.

### Task 27: "Hủy gói" on the plans page

**Files:** Modify `src/features/learner/plans/PlansPage.tsx` (+ `plans.test.tsx`), messages.

**Interfaces:** renewing → "Gia hạn ngày {date} · [Hủy gói]"; dialog copy of design §8.2; `POST /v1/me/subscriptions/{id}/cancel` with a fresh `Idempotency-Key`; 202
→ "Đã gửi yêu cầu hủy gia hạn" and refetch; `cancel_at_period_end` → "Gói kết thúc ngày {date}"; staff grants show no button.

- [ ] **Step 1: Failing tests:** button shown for `grace`; not for a grant; text after cancel. **Step 2–4.** **Step 5: Commit** `feat(web): cancel auto-renewal`.

---

## M6 — Admin (`feat/buoc-8-m6`, after M1, M2)

### Task 28: Google sessions, new error slugs, "Người dùng đã xóa"

**Files:** Modify `src/auth/session-store.ts` (+ test), `src/api/problem.ts` (+ test), `messages/{vi,en}.json`.

**Interfaces:** `auth_method === 'google'` from `/v1/me`, or 403 `password-login-required` anywhere → sign out with notice "Đăng nhập lại bằng mật khẩu để vào trang
quản trị" (B8E44); `KNOWN_ERROR_SLUGS` gains the design §13 slugs used by admin (`self-delete`, `last-admin`, `account-deleting`, `renewal-not-cancelled`,
`confirm-email-mismatch`, `password-login-required`); the three `unknownUser` strings become "Người dùng đã xóa" / "Deleted user" (D18).

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

## M7 — Smoke, documents, real runs (`feat/buoc-8-m7`, last)

### Task 32: `pnpm smoke:buoc-8`

**Files:** Create `apps/api/scripts/smoke-buoc-8.mjs`; modify `apps/api/package.json`.

**Interfaces:** runs against a real API and worker with `GOOGLE_FAKE_ENABLED=true`, `BILLING_FAKE_ENABLED=true`, a fresh DB and its own `JOB_QUEUE_PREFIX`; stops when
its env says otherwise (like the earlier smokes). Cases (design §17): Google new user, under 13, unverified email reuse, K8 link; delete with password; delete
Google-only via reauth; blocked by renewing then cancel then delete; admin delete; unverified cleanup (settings to 1 day, back-dated row); replay after inserting the
user row again; counts of every §7.3 table before and after (anon rows present, no real id except `deleted_accounts`, `rate_limit_counters`); a slow fake AI call
across a deletion then the sweep (M1); timing of a learner with 50 000 `learning_log` rows and 2 000 private words (B8E49), printed.

- [ ] **Step 1:** Write the script; **Step 2:** run twice, each on a fresh DB, output saved to `docs/deliveries/buoc-8-smoke-output.txt`; **Step 3: Commit**
  `test(api): add the bước 8 smoke`.

### Task 33: Documents and real runs

**Files:** Create `docs/deliveries/buoc-8-test-flow.md`; modify `docs/deliveries/buoc-8.md` (as-built), `docs/deliveries/deploy-checklist.md`, `CLAUDE.md`.

- [ ] **Step 1:** Test flow: the owner's Google Cloud steps of design §5.1 with screenshots, local `.env`, the manual pass (sign in with Google, delete, admin delete,
  cancel).
- [ ] **Step 2:** `deploy-checklist.md`: every item of design §18 (Google production + brand verification, privacy policy items, question 26 review, backup procedure and
  outside-DB list, log retention, mobile Google and Apple, real provider cancel).
- [ ] **Step 3:** Run `smoke:buoc-0-3-fixes`, `smoke:buoc-4`, `smoke:buoc-5` (both fetchState modes), `smoke:buoc-6`, `smoke:buoc-7`, `smoke:buoc-8`; Claude's browser
  pass on the Docker stack with screenshots; the owner's real Google sign-in (B8A8), result recorded. Note the `ASSUMPTION`s of design §19 (cookie after the redirect,
  PKCE with a Web client) as confirmed or not.
- [ ] **Step 4:** `CLAUDE.md`: Bước 8 section (one line to `docs/deliveries/buoc-8.md`), phase line, `.env` variables; `buoc-8.md` as-built.
- [ ] **Step 5: Commit** `docs(buoc-8): record the as-built, test flow and deploy items`.
