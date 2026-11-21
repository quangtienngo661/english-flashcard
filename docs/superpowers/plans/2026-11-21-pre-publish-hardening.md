# Pre-Publish Hardening & Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all confirmed pre-publish P1/P2 defects (`F-03`–`F-09`, `F-11`–`F-12`), add the emergency Pro checkout pause toggle (`D8`) and allowlisted Gmail preview mode (`D5`), package the 20/11 doc sync (`F-16`), and complete isolated + production verification (`F-01`, `F-02`, `F-10`, `F-15`, `D4`–`D13`) so Wordmet can launch publicly with both Free and Pro enabled on day 1.

**Architecture:** All code changes stay strictly within the existing NestJS modular monolith (`apps/api`), Next.js learner web (`apps/web`), Vite admin SPA (`apps/admin`), and Docker/Caddy ops scripts (`deploy/`) with **zero new database migrations**. Every fix reuses existing primitives (`withUserLock`/`lockUserForDataWrite`/`USER_DATA_TX`, `app_settings`, `PracticeSession.aiStopped`/`aiNoticeShown`, `BillingInbox`, Caddy `format filter`), and all code work runs in an isolated git worktree branched from `origin/dev` so the main checkout's 8 uncommitted files are never touched.

**Tech Stack:** Node `24.11.0`, pnpm `11.6.0`, NestJS `12.x`, Prisma `7.10.1`, PostgreSQL `17`, Redis `7.4`, Caddy `2.11.9`, Next.js `16.4.3`, Vite `8.3` / React `19.3`, Vitest `4.1.11`, WAL-G `3.0.9`.

**Spec:** [`docs/superpowers/specs/2026-11-20-pre-publish-audit-design.md`](../specs/2026-11-20-pre-publish-audit-design.md) · **Decisions:** [`docs/superpowers/decisions/2026-11-20-pre-publish-audit-decisions.md`](../decisions/2026-11-20-pre-publish-audit-decisions.md)

## Global Constraints

- **No code changes in the main checkout's 8 pre-existing uncommitted files** (`.gitignore`, `PlansPage.tsx`, `plans.test.tsx`, 5 files under `docs/preparation/judge-compare-2026-11-07/`); do all implementation in an isolated git worktree branched from `origin/dev` (`using-git-worktrees`).
- **Zero database migrations** for this hardening batch (`prisma migrate diff` must stay clean).
- **Zero PII or secrets in git, logs, or reports:** never write the owner's study email, user IDs, OTPs, OAuth codes/states/tickets, bank references, or API/R2 keys into repo files or commit messages.
- **No Cloudflare MFA in this release (`D3`)**, **no AI eval gate (`D12`)**, **no temporary public block during QA (`D9`)**, **keep Google third-party auto-link (`D10a`) and admin `/transactions` modal copy (`D10b`) unchanged**.
- **Preserve module boundaries and lock ordering:** `identity.user` lock MUST be acquired before `entitlements.pool` and `entitlements.ai_daily` locks, using `USER_DATA_TX` (`timeout: 125_000`) whenever waiting on `withUserLock`.
- **Keep VI/EN i18n key parity** (`apps/web/messages/{vi,en}.json` and `apps/admin/messages/{vi,en}.json`).
- **Git branching:** topic branches PR into `dev` (CI 4/4 green required: `api`, `web`, `admin`, `admin-e2e-real`); `dev` → `main` PR opens only on owner approval.
- **Keep production DB & owner's study account intact (`D6`);** run real-R2 PITR + Deletion Journal drill strictly on isolated local Docker with a read-only R2 token and wipe local volumes immediately after recording RTO/RPO (`D11`).
- **Load go/no-go bar (`D13`):** 30 simultaneous burst and 50 staggered (~10 s) non-AI API load p95 < 500 ms, unexpected errors < 1%, no Postgres pool exhaustion.

## Review Focus

1. **Logout on rotated token must not affect sibling device chains (`F-03`):** revoking via a just-rotated `T1` kills `T1`'s chain (invalidating `T2`) while a second active device chain of the same user remains valid. *(Pinned in Task 2.)*
2. **Admin AI refund after account deletion + deadlock-free lock hierarchy (`F-04`):** `UsageLedgerService.refund` must also guard with `lockUserForDataWrite` so confirming a report right after deletion cannot insert an orphan `kind='credit'` row, and `reserve`/`refund` must acquire `identity.user` lock before `lockPool`. *(Pinned in Task 3.)*
3. **`codeTaken` failed order must stay excluded from 24 h reconcile retry (`F-11`):** `claimForReconcile` MUST filter `AND review_reason IS NULL` on `status = 'failed'` so a code-collision order (`review_reason = 'provider-mismatch'`) is never polled even after the 1 h retry interval elapses. *(Pinned in Task 4.)*
4. **AI fallback boundary vs personal quota and unchecked `type_word` (`F-08`):** (a) `own_then_ai` with saved sentences still builds own-sentence cloze when AI is unavailable; (b) mixed session where learner unchecked `type_word` and remaining rule types don't fit returns `no-word-fits-types` instead of injecting `type_word`; (c) insufficient personal AI quota still throws `403 ai-quota-insufficient` / returns `ai_unavailable` (`quota-exhausted` / `plan-required`). *(Pinned in Task 6.)*
5. **Caddy `/v1/admin` exact+prefix blocking and `daily-report.sh` JSON schema (`F-06`, `F-07`):** `api.wordmet.com` blocks both `/v1/admin` and `/v1/admin/*` with `404`, while the filtered JSON log keeps numeric `.ts`, `.status`, and `.duration` parseable by `deploy/scripts/daily-report.sh`. *(Pinned in Task 7.)*

---

## File Structure

| Area | Files | Responsibility |
|---|---|---|
| Docs sync (Task 1) | 9 tracked docs + `docs/superpowers/{specs,decisions}/2026-11-20-pre-publish-audit-*` + this plan | Commit 20/11 doc sync and design/plan to `dev`; merge `#322` (`origin/main`) back into `dev` |
| Session race (Task 2) | `apps/api/src/identity/sessions/session.service.ts`, `session.service.spec.ts` | Always revoke active chain on logout even if token already rotated |
| Post-delete guards (Task 3) | `apps/api/src/practice/ai/word-checks.repository.ts`, `word-checks.repository.spec.ts`; `apps/api/src/entitlements/usage/usage-ledger.service.ts`, `usage-ledger.service.spec.ts` | Guard `practice_word_checks` and `usage_records` writes with `lockUserForDataWrite` + `USER_DATA_TX` |
| Payment reconcile (Task 4) | `apps/api/src/entitlements/orders/{orders.repository.ts,orders.service.ts,orders.repository.spec.ts,orders.service.spec.ts}`; `apps/api/src/cli/orders-probe-payos.ts` | Poll `needs_review/amount-short` (7 d), retry `failed` no-link with `review_reason IS NULL` (24 h / 1 h gap), update CLI runbook comment |
| Checkout pause toggle (Task 5) | `apps/api/src/settings/{settings.definitions.ts,app-config.view.ts,*.spec.ts}`; `apps/api/src/entitlements/orders/{orders.service.ts,orders.service.spec.ts}`; `apps/admin/{src/features/settings/settings-api.ts,settings-api.test.ts,messages/{vi,en}.json,e2e/support/settings.ts}`; `apps/web/{src/app-shell/queries.ts,src/features/learner/plans/{PlansPage.tsx,use-buy-order.ts,plans.test.tsx},messages/{vi,en}.json}` | `entitlements.pro_checkout_enabled` setting (`503 checkout-paused` when off; webhook/reconcile untouched) |
| AI fallback (Task 6) | `apps/api/src/practice/ai/{ai-session-planner.service.ts,ai-session-planner.service.spec.ts}`; `apps/api/src/practice/sessions/{sessions.service.ts,sessions.ai.spec.ts,sessions.service.spec.ts}`; `apps/web/src/features/learner/practice/session/ai-states.test.tsx` | Auto-fallback on system AI unavailability (start & mid-session, mixed & AI-only) while preserving personal quota refusals |
| Caddy, worker & alerts (Task 7) | `deploy/{Caddyfile,compose.prod.yml}`; `apps/api/src/{worker.ts,health/worker-heartbeat.ts,health/worker-heartbeat.spec.ts}`; `deploy/scripts/{watch.sh,daily-report.sql}` | Query redaction + `/v1/admin` split in Caddy, worker heartbeat healthcheck, billing/needs_review alerts |
| Gmail allowlist preview (Task 8) | `apps/api/src/cli/{mail-preview.ts,mail-preview-samples.ts,mail-preview.spec.ts}` | Safe opt-in `--allow-remote-to <email>` + `--all-locales` (21 VI/EN samples) for Resend → Gmail check |
| Verification & Cutover (Tasks 9–10) | Local Docker verification + load test; `docs/audit/2026-11-21-pre-publish-go-nogo.md` | Full test/CI gate, production deploy, real Gmail/OAuth/payOS/HSTS checks, local real-R2 PITR + Deletion Journal drill, go/no-go report |

---

### Task 1: Sync Documentation PR & Merge `main` (#322) Back Into `dev`

**Files:**
- Commit (from isolated worktree branched from `origin/dev`): `CLAUDE.md`, `PRODUCT.md`, `deploy/README.md`, `docs/ARCHITECTURE.md`, `docs/deliveries/{deploy-checklist.md,restore-safety.md,chuan-bi-launch-a-checklist.md,chuan-bi-launch-b-checklist.md,dot-cai-thien-c-checklist.md}`, `docs/superpowers/specs/2026-11-20-pre-publish-audit-design.md`, `docs/superpowers/decisions/2026-11-20-pre-publish-audit-decisions.md`, `docs/superpowers/plans/2026-11-21-pre-publish-hardening.md`

**Interfaces:**
- Consumes: `origin/dev` (`13ce8e9a`), `origin/main` (`0970665a`), updated doc files in main checkout.
- Produces: Merged docs PR + `#322` merge-back on `origin/dev` so Task 2–8 branch cleanly from an up-to-date `dev`.

- [ ] **Step 1: Create an isolated worktree from `origin/dev` for docs sync**

Run: `git worktree add ../wt-pre-publish-docs -b docs/sync-pre-publish-2026-11-21 origin/dev`
Expected: Clean worktree at `13ce8e9a` without touching main checkout's 8 uncommitted files.

- [ ] **Step 2: Copy the 12 updated doc files into the worktree and scan for secrets/PII**

Copy only the 12 doc paths listed above from main checkout into `../wt-pre-publish-docs`, then verify `git status --short` shows only those 12 markdown files and run PII scan (`Select-String` for owner email, user IDs, bank refs, keys).
Expected: `0` PII/secret hits and `0` non-doc files modified.

- [ ] **Step 3: Commit, push, open PR into `dev`, and merge once CI is green**

```bash
git add CLAUDE.md PRODUCT.md deploy/README.md docs/ARCHITECTURE.md docs/deliveries/ docs/superpowers/
git commit -m "docs: sync pre-publish status, design, decisions, and plan"
git push -u origin docs/sync-pre-publish-2026-11-21
gh pr create --base dev --title "docs: sync pre-publish status, design, and hardening plan" --body "Syncs 20/11 production status docs and records approved pre-publish design, decisions (D1-D13), and plan."
```
Expected: CI 4/4 green and PR merged into `dev`.

- [ ] **Step 4: Merge `origin/main` (`#322`) back into `dev` via PR (repo convention) and remove the docs worktree**

```bash
git fetch origin
git worktree add ../wt-merge-main -b chore/merge-main-back-21-11 origin/dev
git -C ../wt-merge-main merge --no-edit origin/main
git -C ../wt-merge-main push -u origin chore/merge-main-back-21-11
gh pr create --base dev --head chore/merge-main-back-21-11 --title "chore: merge main (#322) back into dev" --body "Keeps dev synced with main per repo convention."
```
Expected: PR merged into `dev` when CI is green; remove temporary worktrees (`git worktree remove`).

---

### Task 2: Fix Refresh vs. Logout Race (`F-03`)

**Files:**
- Modify: `apps/api/src/identity/sessions/session.service.ts:114-126`
- Test: `apps/api/src/identity/sessions/session.service.spec.ts:420-432`

**Interfaces:**
- Consumes: `origin/dev` (after Task 1) in a new worktree `../wt-pre-publish-fixes` on branch `fix/pre-publish-hardening`.
- Produces: `SessionService.revokeByRefreshToken(token: string, path: ClientType): Promise<void>` revokes the `session_chain` even when `row.rotatedAt !== null`, provided `!row.chain.revokedAt && row.chain.clientType === path`.

- [ ] **Step 1: Write failing tests in `apps/api/src/identity/sessions/session.service.spec.ts`**

Replace `'rotated'` in the `B1#20` `it.each` (keeping `'revoked'` and `'path_mismatch'` as read-only no-ops) and add two explicit tests:

```ts
it('F-03: logout with an already-rotated token still revokes the active session chain (refresh-vs-logout race)', async () => {
  const s = setup();
  s.row.rotatedAt = new Date(s.clock.now().getTime() - 5);
  await s.service.revokeByRefreshToken(s.original.token, 'mobile');
  expect(s.chainUpdateMany).toHaveBeenCalledExactlyOnceWith({
    where: { id: s.chain.id, revokedAt: null },
    data: { revokedAt: s.clock.now(), revokeReason: 'logout' },
  });
});

it('F-03 Review Focus 1: logout with a rotated token only targets row.chainId, leaving sibling device chains untouched', async () => {
  const s = setup();
  s.row.rotatedAt = s.clock.now();
  await s.service.revokeByRefreshToken(s.original.token, 'mobile');
  const [{ where }] = s.chainUpdateMany.mock.calls[0];
  expect(where).toEqual({ id: s.chain.id, revokedAt: null });
  expect(where).not.toHaveProperty('userId');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wordmet/api exec vitest run src/identity/sessions/session.service.spec.ts`
Expected: FAIL on `F-03: logout with an already-rotated token still revokes the active session chain` (`chainUpdateMany` called 0 times).

- [ ] **Step 3: Update `SessionService.revokeByRefreshToken` in `apps/api/src/identity/sessions/session.service.ts:121`**

Remove `row.rotatedAt ||` from the guard so line 121 reads:
`if (!row || row.chain.revokedAt || row.chain.clientType !== path) return;`

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @wordmet/api exec vitest run src/identity/sessions/`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/identity/sessions/session.service.ts apps/api/src/identity/sessions/session.service.spec.ts
git commit -m "fix(api): revoke session chain on logout even when refresh token just rotated"
```

---

### Task 3: Guard Post-Deletion AI & Usage Writes (`F-04`)

**Files:**
- Modify: `apps/api/src/practice/ai/word-checks.repository.ts:1-24`
- Create: `apps/api/src/practice/ai/word-checks.repository.spec.ts`
- Modify: `apps/api/src/entitlements/usage/usage-ledger.service.ts:48-92,153-174`
- Modify: `apps/api/src/entitlements/usage/usage-ledger.service.spec.ts`

**Interfaces:**
- Consumes: `lockUserForDataWrite(tx: Prisma.TransactionClient, userId: string): Promise<boolean>` and `USER_DATA_TX` from `apps/api/src/identity/user-lock.ts`.
- Produces:
  - `WordChecksRepository.put(userId, senseId, contentKey, verdict, now): Promise<boolean>` (returns `true` if written, `false` if user deleted/deleting — callers ignoring the boolean keep compiling unchanged).
  - `UsageLedgerService.reserve(userId, pool, operationId): Promise<ReserveResult>` returns `{ state: 'refused', reason: 'ai-unavailable', retry_after_seconds: null }` and inserts 0 rows when `lockUserForDataWrite` returns `false`.
  - `UsageLedgerService.refund(userId, pool, operationId, reportId): Promise<{ refunded: boolean }>` returns `{ refunded: false }` and inserts 0 rows when `lockUserForDataWrite` returns `false`.

- [ ] **Step 1: Write failing tests for `WordChecksRepository.put` and `UsageLedgerService.{reserve,refund}`**

Create `apps/api/src/practice/ai/word-checks.repository.spec.ts`:
```ts
describe('WordChecksRepository.put (F-04)', () => {
  it('skips upsert and returns false when user is missing or deleting', async () => {
    // mock tx.$executeRaw (advisory lock) + tx.user.findUnique returning null or { status: 'deleting' }
    expect(await repo.put('u-del', 's-1', 'k1', 'ok', now)).toBe(false);
    expect(tx.practiceWordCheck.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction.mock.calls[0][1]).toEqual(USER_DATA_TX);
  });

  it('upserts and returns true for an active user (positive control)', async () => {
    // tx.user.findUnique returns { status: 'active' }
    expect(await repo.put('u-ok', 's-1', 'k1', 'ok', now)).toBe(true);
    expect(tx.practiceWordCheck.upsert).toHaveBeenCalledTimes(1);
  });
});
```

Add tests to `apps/api/src/entitlements/usage/usage-ledger.service.spec.ts` (and update its test helper's default `tx.user.findUnique` mock to return `{ status: 'active' }`):
```ts
it('F-04: reserve acquires identity.user lock before pool lock and refuses without inserting when user is deleted/deleting', async () => {
  // tx.user.findUnique returns null (and test { status: 'deleting' })
  const res = await service.reserve('u-del', 'ai_practice', 'op-1');
  expect(res).toEqual({ state: 'refused', reason: 'ai-unavailable', retry_after_seconds: null });
  expect(tx.$executeRaw).toHaveBeenCalledTimes(1); // only identity.user lock; no lockPool, no INSERT
  expect(prisma.$transaction.mock.calls[0][1]).toEqual(USER_DATA_TX);
});

it('F-04 Review Focus 2: refund refuses without inserting a credit row when user is deleted/deleting', async () => {
  const res = await service.refund('u-del', 'ai_practice', 'op-1', 'rep-1');
  expect(res).toEqual({ refunded: false });
  expect(tx.$executeRaw).toHaveBeenCalledTimes(1); // only identity.user lock; no INSERT
});

it('F-04 Review Focus 2: active user reserve acquires identity.user lock before entitlements.pool lock', async () => {
  // assert call order: identity.user advisory lock precedes lockPool
  expect(lockOrder).toEqual(['identity.user', 'entitlements.pool']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @wordmet/api exec vitest run src/practice/ai/word-checks.repository.spec.ts src/entitlements/usage/usage-ledger.service.spec.ts`
Expected: FAIL on the new `F-04` cases.

- [ ] **Step 3: Implement `lockUserForDataWrite` + `USER_DATA_TX` in `WordChecksRepository.put` and `UsageLedgerService.{reserve,refund}`**

- In `apps/api/src/practice/ai/word-checks.repository.ts`: wrap `upsert` in `this.prisma.$transaction(async (tx) => { if (!(await lockUserForDataWrite(tx, userId))) return false; await tx.practiceWordCheck.upsert(...); return true; }, USER_DATA_TX)`.
- In `apps/api/src/entitlements/usage/usage-ledger.service.ts`:
  - Import `lockUserForDataWrite, USER_DATA_TX` from `../../identity/user-lock.js`.
  - In `reserve()` (using `USER_DATA_TX`): call `if (!(await lockUserForDataWrite(tx, userId))) return { state: 'refused' as const, reason: 'ai-unavailable' as const, retry_after_seconds: null };` **before** `await lockPool(tx, userId, pool)`.
  - In `refund()` (using `USER_DATA_TX`): call `if (!(await lockUserForDataWrite(tx, userId))) return { refunded: false };` **before** `await lockPool(tx, userId, pool)`.

- [ ] **Step 4: Run tests and audit all `account-data-map.ts` AI/usage writers**

Run: `pnpm --filter @wordmet/api exec vitest run src/practice/ai/ src/entitlements/usage/ src/ai/runner/ src/identity/deletion/`
Expected: ALL PASS. Also confirm via `rg` across `apps/api/src/{ai,practice,entitlements}` that no other post-AI writer inserts into an `erase`/`anonymise` table without an existing locked parent row or `lockUserForDataWrite`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/practice/ai/word-checks.repository.ts apps/api/src/practice/ai/word-checks.repository.spec.ts apps/api/src/entitlements/usage/usage-ledger.service.ts apps/api/src/entitlements/usage/usage-ledger.service.spec.ts
git commit -m "fix(api): guard practice_word_checks and usage_records writes against deleted users"
```

---

### Task 4: Fix Payment Reconcile (`needs_review/amount-short` & `failed` No-Link Retry) and CLI Comment (`F-05`, `F-11`, `F-12`)

**Files:**
- Modify: `apps/api/src/entitlements/orders/orders.repository.ts:135-145,235-279`
- Modify: `apps/api/src/entitlements/orders/orders.service.ts:142-165`
- Modify: `apps/api/src/cli/orders-probe-payos.ts:10-18`
- Test: `apps/api/src/entitlements/orders/orders.service.spec.ts`, `apps/api/src/entitlements/orders/orders.repository.spec.ts` (create if absent)

**Interfaces:**
- Consumes: `OrdersReconcileService.reconcileOne`, `OrderApplierService` (already supports `needs_review/amount-short` → `paid` via `order-rules.ts`).
- Produces:
  - `OrderView` gains `reviewReason: ReviewReason | null` (internal repo type; public `OrderViewJson` stays unchanged).
  - `OrdersRepository.claimForCheck` matches `status = 'pending' OR (status = 'needs_review' AND review_reason = 'amount-short')`.
  - `OrdersRepository.claimForReconcile` adds 7-day / 10-min clause for `status = 'needs_review' AND review_reason = 'amount-short'` and updates `status = 'failed'` clause to `payment_link_id IS NULL AND review_reason IS NULL AND created_at > now - interval '24 hours' AND (checked_at IS NULL OR checked_at < now - interval '1 hour')`.
  - `OrdersService.check` polls payOS when `order.status === 'pending' || (order.status === 'needs_review' && order.reviewReason === 'amount-short')`.

- [ ] **Step 1: Write failing unit tests for `F-05` and `F-11`**

In `apps/api/src/entitlements/orders/orders.service.spec.ts`:
```ts
it('F-05: check() polls payOS when order is needs_review with reviewReason amount-short', async () => {
  // order status='needs_review', reviewReason='amount-short' → calls claimForCheck & reconcileOne
  expect(reconcileOne).toHaveBeenCalledTimes(1);
});

it('F-05: check() does NOT poll payOS for needs_review with other reasons (provider-mismatch, account-deleted)', async () => {
  // status='needs_review', reviewReason='provider-mismatch' → skips claimForCheck
  expect(reconcileOne).not.toHaveBeenCalled();
});
```

In `apps/api/src/entitlements/orders/orders.repository.spec.ts` (inspect SQL template fragments passed to `$queryRaw` or run against mock/in-memory check, plus verified on real Postgres 17 in Task 9):
```ts
it('F-05: claimForReconcile SQL includes needs_review + amount-short within 7 days and 10 minute gap', async () => { ... });
it('F-11 & Review Focus 3: claimForReconcile SQL retries failed no-link every 1h for 24h ONLY when review_reason IS NULL (excludes codeTaken provider-mismatch)', async () => { ... });
it('F-05: claimForCheck SQL accepts pending OR (needs_review AND review_reason = amount-short)', async () => { ... });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @wordmet/api exec vitest run src/entitlements/orders/`
Expected: FAIL on the new `F-05` and `F-11` tests.

- [ ] **Step 3: Implement `OrdersRepository`, `OrdersService.check`, and update `orders-probe-payos.ts` comment**

- In `orders.repository.ts`:
  - Add `reviewReason: ReviewReason | null` to `OrderView` and populate it in `findOwned`.
  - Update `claimForReconcile` SQL `WHERE` to:
    ```sql
    (status = 'pending' AND payment_link_id IS NOT NULL AND created_at < ${now}::timestamptz - interval '5 minutes'
      AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - interval '10 minutes'))
    OR (status = 'pending' AND payment_link_id IS NULL AND created_at < ${now}::timestamptz - interval '2 minutes'
      AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - interval '10 minutes'))
    OR (status = 'needs_review' AND review_reason = 'amount-short' AND created_at > ${now}::timestamptz - interval '7 days'
      AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - interval '10 minutes'))
    OR (status = 'failed' AND payment_link_id IS NULL AND review_reason IS NULL AND created_at > ${now}::timestamptz - interval '24 hours'
      AND (checked_at IS NULL OR checked_at < ${now}::timestamptz - interval '1 hour'))
    ```
  - Update `claimForCheck` SQL `WHERE` from `AND status = 'pending'` to `AND (status = 'pending' OR (status = 'needs_review' AND review_reason = 'amount-short'))`.
- In `orders.service.ts`:
  - Extract `toOrderViewJson(order: OrderView)` so `check()` reads `findOwned` once, returns early unless `order.status === 'pending' || (order.status === 'needs_review' && order.reviewReason === 'amount-short')`, then claims & reconciles as before.
- In `apps/api/src/cli/orders-probe-payos.ts:12-13`:
  - Update comment to clarify that if the `billing_orders` row was lost after a restore, staff verify ownership/transfer proof and grant Pro via **Cấp gói** (`entitlement_grants`) instead of "Xác nhận thanh toán".

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @wordmet/api exec vitest run src/entitlements/orders/ src/cli/orders-probe-payos*`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/entitlements/orders/ apps/api/src/cli/orders-probe-payos.ts
git commit -m "fix(api): reconcile needs_review/amount-short orders and retry transient failed no-link orders"
```

---

### Task 5: Add Emergency Pro Checkout Pause Toggle (`D8`: `entitlements.pro_checkout_enabled`)

**Files:**
- Modify: `apps/api/src/settings/settings.definitions.ts` (type, default `true`, schema, field map)
- Modify: `apps/api/src/settings/app-config.view.ts` (`plans.pro.checkout_enabled: boolean`)
- Modify: `apps/api/src/entitlements/orders/orders.service.ts:77-88`
- Modify: `apps/admin/src/features/settings/settings-api.ts:98-101`, `apps/admin/messages/{vi,en}.json`, `apps/admin/e2e/support/settings.ts`
- Modify: `apps/web/src/app-shell/queries.ts:58-63`, `apps/web/src/features/learner/plans/{PlansPage.tsx,use-buy-order.ts}`, `apps/web/messages/{vi,en}.json`
- Tests: `apps/api/src/settings/{settings.definitions.spec.ts,app-config.view.spec.ts}`, `apps/api/src/entitlements/orders/orders.service.spec.ts`, `apps/admin/src/features/settings/settings-api.test.ts`, `apps/admin/src/i18n/parity.test.ts`, `apps/web/src/features/learner/plans/plans.test.tsx`, `apps/web/src/i18n/parity.test.ts` (or existing web i18n parity test)

**Interfaces:**
- Consumes: `SettingsService.get()` (`entitlements.proCheckoutEnabled: boolean`, default `true`).
- Produces:
  - API setting key `entitlements.pro_checkout_enabled` (boolean, default `true`), stored in existing `app_settings` JSON/rows with zero DB migration.
  - `GET /v1/me/app-config` returns `plans.pro.checkout_enabled: boolean`.
  - `POST /v1/me/orders` throws `503` Problem Details `{ status: 503, title: 'Pro checkout paused', type: 'checkout-paused' }` when `!entitlements.proCheckoutEnabled` (before creating any order row or calling payOS); `POST /v1/billing/webhooks/payos`, `POST /v1/me/orders/:id/check`, and `OrdersReconcileService` remain 100% active.
  - Web `PlansPage`: when `plans.pro.checkout_enabled === false`, disables the Buy button and shows `t('checkoutPaused')`; if `POST /v1/me/orders` returns `slug === 'checkout-paused'`, invalidates `APP_CONFIG_KEY` and displays `t('checkoutPaused')`.

- [ ] **Step 1: Write failing tests across `api`, `admin`, and `web`**

- API (`settings.definitions.spec.ts`, `app-config.view.spec.ts`, `orders.service.spec.ts`):
  - Default `proCheckoutEnabled === true`, `appConfigView` exposes `plans.pro.checkout_enabled`.
  - `OrdersService.create` throws `503` with `problemType: 'checkout-paused'` when `proCheckoutEnabled === false`, inserts 0 orders and makes 0 payOS calls; `OrdersService.check` still reconciles an existing pending order when `proCheckoutEnabled === false`.
- Admin (`settings-api.test.ts`): `SETTINGS_LAYOUT.entitlements` includes `{ key: 'pro_checkout_enabled', kind: 'bool' }` and both `vi.json`/`en.json` have the label & help text.
- Web (`plans.test.tsx`):
  - When `appConfig.plans.pro.checkout_enabled === false`, Buy button is disabled and paused notice renders.
  - When `POST /v1/me/orders` fails with `503` `type: .../checkout-paused`, shows `checkoutPaused` copy and invalidates `APP_CONFIG_KEY`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @wordmet/api exec vitest run src/settings/ src/entitlements/orders/orders.service.spec.ts && pnpm --filter @wordmet/admin exec vitest run src/features/settings/settings-api.test.ts && pnpm --filter @wordmet/web exec vitest run src/features/learner/plans/plans.test.tsx`
Expected: FAIL on the new `pro_checkout_enabled` cases.

- [ ] **Step 3: Implement `pro_checkout_enabled` across API, Admin, and Web**

- `settings.definitions.ts`: add `proCheckoutEnabled: boolean` (default `true`), `pro_checkout_enabled: z.boolean().optional()`, map `['entitlements', 'pro_checkout_enabled', 'proCheckoutEnabled']`.
- `app-config.view.ts`: add `checkout_enabled: e.proCheckoutEnabled` under `plans.pro`.
- `orders.service.ts`: at the top of `create()`, right after `const { entitlements } = await this.settings.get();`, check `if (!entitlements.proCheckoutEnabled) throw new ProblemDetailsException({ status: 503, title: 'Pro checkout paused', type: 'checkout-paused' });`.
- Admin: add `{ key: 'pro_checkout_enabled', kind: 'bool' }` to `SETTINGS_LAYOUT.entitlements`, add matching VI/EN labels/descriptions in `apps/admin/messages/{vi,en}.json` (note clearly that turning off pauses new Pro orders only while existing webhooks/reconciliation keep running), and add `pro_checkout_enabled: true` in `apps/admin/e2e/support/settings.ts`.
- Web: add `checkout_enabled?: boolean` to `AppConfig['plans']['pro']` (default treated as `true` when absent for backward compatibility), pass `checkoutPaused={plans.pro.checkout_enabled === false}` to `BuyBlock` in `PlansPage.tsx`, handle `slug === 'checkout-paused'` in `use-buy-order.ts`, and add `checkoutPaused` key in both `apps/web/messages/{vi,en}.json`.

- [ ] **Step 4: Run tests + i18n parity + typecheck across all 3 apps**

Run: `pnpm --filter @wordmet/api exec vitest run src/settings/ src/entitlements/orders/ && pnpm --filter @wordmet/admin test && pnpm --filter @wordmet/web exec vitest run src/features/learner/plans/ src/i18n/`
Expected: ALL PASS (including VI/EN key parity in both `web` and `admin`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/settings/ apps/api/src/entitlements/orders/ apps/admin/ apps/web/
git commit -m "feat: add entitlements.pro_checkout_enabled emergency pause toggle"
```

---

### Task 6: Implement Automatic AI Fallback to Rule Questions (`F-08`, `D7`)

**Files:**
- Modify: `apps/api/src/practice/ai/ai-session-planner.service.ts:1-113`
- Modify: `apps/api/src/practice/sessions/sessions.service.ts:107-185,563-590,695-727`
- Tests: `apps/api/src/practice/ai/ai-session-planner.service.spec.ts`, `apps/api/src/practice/sessions/sessions.ai.spec.ts`, `apps/api/src/practice/sessions/sessions.service.spec.ts`, `apps/web/src/features/learner/practice/session/ai-states.test.tsx`

**Interfaces:**
- Consumes: `AiService.isReady(op)`, `EntitlementsService.snapshot(userId)`, `QuestionBuilder.build(...)`, existing `PracticeSession` columns `aiStopped` and `aiNoticeShown` (zero DB migration), and existing client notice `{ notice: 'ai-fallback', ai_reason: 'ai-unavailable' | 'ai-failed' }`.
- Produces:
  - `AiSessionPlanner.gate(userId, types, clozeSource): Promise<AiGateResult | null>` where `AiGateResult = { snapshot: EntitlementsSnapshot; availableAiTypes: QuestionType[]; fallbackReason: 'ai-unavailable' | null }`:
    - Still throws `403 plan-required` if `!snapshot || !snapshot.features['ai.practice'].allowed`.
    - When `!snapshot.ai_available.enabled || snapshot.ai_available.cap_reached`, returns `{ snapshot, availableAiTypes: [], fallbackReason: 'ai-unavailable' }` (never throws `503`).
    - Checks `this.ai.isReady(OPERATION[type]!)` per AI type: keeps ready ops in `availableAiTypes`; if any requested AI op is not ready, sets `fallbackReason: 'ai-unavailable'`.
  - `AiSessionPlanner.plan(...)` returns `AiSessionPlan & { fallbackReason: 'ai-unavailable' | null }`:
    - If a marked unchecked private word needs `check_private_word` and `isReady('check_private_word').ready === false`, removes unchecked private senses from `marked`, recomputes `planned`/`needed`, and sets `fallbackReason: 'ai-unavailable'` instead of throwing `503`.
    - Still throws `403 ai-quota-insufficient` when `pool.remaining < needed` (personal quota unchanged!).
  - `SessionsService.start(...)`:
    - Applies `gate.availableAiTypes`: drops unavailable AI types (downgrading `clozeSource: 'own_then_ai'` → `'own'` if `cloze` AI is dropped so saved-sentence cloze stays available!).
    - If NO types remain after dropping unavailable AI types (AI-only request): switches `types = ['type_word', 'mcq_definition']`, `clozeSource = null` (preferring `type_word`).
    - If mixed session had types dropped and `keepAvailable` yields 0 words (learner unchecked `type_word` and remaining chosen rule types don't fit): throws `409 practice-no-words` (`reason: 'no-word-fits-types'`) — does NOT silently inject `type_word` and does NOT close any open session!
    - When start-time fallback occurred (`fallbackReason !== null`):
      - If no AI questions remain (`!hasAiType(types, clozeSource)` or `ai.aiPlanned === 0`), store `aiStopped: 'ai-unavailable'` and `aiNoticeShown: false`, so the first `next()` delivers `{ notice: 'ai-fallback', ai_reason: 'ai-unavailable' }` once and sets `aiNoticeShown = true` (100% compatible with existing clients).
      - If partial AI questions remain (`ai.aiPlanned > 0`, e.g., 1 of 2 AI ops or `check_private_word` was not ready), return additive fields `{ session: sessionView(session, []), notice: 'ai-fallback', ai_reason: 'ai-unavailable' }` from `POST /v1/practice/sessions` (SR7 additive-only) and keep `aiStopped: null` so ready AI ops still run.
  - `SessionsService.advance(...)` & `failedSlot(...)`:
    - When `session.aiStopped` is a system failure (`'ai-unavailable'` | `'ai-failed'`), rule types default to `ruleTypes.length > 0 ? ruleTypes : ['type_word', 'mcq_definition']` (trying `type_word` first when auto-injected for AI-only sessions), attaching `ai: { notice: 'ai-fallback', ai_reason: publicReason(session.aiStopped) }` once when `!session.aiNoticeShown` and flipping `aiNoticeShown = true`.
    - When `failedSlot` handles a mid-session system/provider failure (`failure !== 'quota-exhausted' && failure !== 'plan-required'`) in an AI-only session (`ruleTypes.length === 0`), clears `pendingAiRequestId`, builds a fallback rule question preferring `type_word` then `mcq_definition`, attaches `word-not-recognized` (if `failure === 'word-not-recognized'`) or one-time `ai-fallback`, and continues without stopping at `ai_unavailable`!
    - Personal quota/plan stops (`'quota-exhausted'`, `'plan-required'`) continue returning `{ state: 'ai_unavailable', reason }` unchanged!

- [ ] **Step 1: Write failing unit tests covering every §4 row and Review Focus 4**

Add/update tests in `ai-session-planner.service.spec.ts`, `sessions.service.spec.ts`, and `sessions.ai.spec.ts`:
```ts
// ai-session-planner.service.spec.ts
it('F-08: gate returns availableAiTypes=[] and fallbackReason=ai-unavailable when aiEnabled=false or cap_reached (no 503)', ...);
it('F-08: gate keeps ready AI ops and flags fallbackReason when only one AI op lacks a model', ...);
it('F-08: gate still throws 403 plan-required when ai.practice is not allowed', ...);
it('F-08: plan excludes unchecked private word when check_private_word has no model instead of throwing 503', ...);
it('F-08 Review Focus 4: plan still throws 403 ai-quota-insufficient when personal remaining < needed', ...);

// sessions.service.spec.ts & sessions.ai.spec.ts
it('F-08: start mixed session with AI unavailable drops AI types, keeps chosen rule types, sets aiStopped=ai-unavailable, emits ai-fallback once on first next()', ...);
it('F-08 Review Focus 4: start mixed session (own_then_ai) with AI unavailable downgrades clozeSource to own and serves saved-sentence cloze', ...);
it('F-08 Review Focus 4: start mixed session where learner unchecked type_word and remaining rule type cannot fit throws no-word-fits-types and preserves existing open session', ...);
it('F-08: start AI-only session with AI unavailable opens with [type_word, mcq_definition], prefers type_word, emits ai-fallback once', ...);
it('F-08: mid-session AI-only provider error (ai-failed / ai-unavailable) falls back to type_word instead of ai_unavailable, keeping answered progress and not charging AI unit', ...);
it('F-08: mid-session AI-only word-not-recognized falls back to rule question with notice=word-not-recognized', ...);
it('F-08 Review Focus 4: mid-session AI-only quota-exhausted and plan-required STILL return state=ai_unavailable', ...);
it('F-08 control: healthy AI still plans and generates AI questions normally', ...);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @wordmet/api exec vitest run src/practice/ai/ai-session-planner.service.spec.ts src/practice/sessions/sessions.ai.spec.ts src/practice/sessions/sessions.service.spec.ts`
Expected: FAIL on the new `F-08` cases (and note existing tests expecting `503` / `ai_unavailable` on `ai-failed` in AI-only sessions will be updated in lockstep with D7).

- [ ] **Step 3: Implement `AiSessionPlanner` and `SessionsService` fallback behavior**

- Update `AiSessionPlanner.gate` and `AiSessionPlanner.plan` per the Interfaces block above.
- Update `SessionsService.start`, `advance`, and `failedSlot` per the Interfaces block above:
  - Helper `buildFallbackRuleItem(...)`: when `ruleTypes.length > 0`, calls `this.ruleItem(..., ruleTypes, ...)`; when `ruleTypes.length === 0` (AI-only fallback), tries `this.ruleItem(..., ['type_word'], ...)` first, then `this.ruleItem(..., ['mcq_definition'], ...)` if `type_word` returns `null`.
  - Helper `isSystemAiFailure(failure: AiFailure)`: returns `failure !== 'quota-exhausted' && failure !== 'plan-required'`.
  - Confirm `apps/web/src/features/learner/practice/session/ai-states.test.tsx` covers both `ai-fallback` with `ai_reason: 'ai-unavailable'` and `ai_unavailable` with `quota-exhausted`/`plan-required`.

- [ ] **Step 4: Run full practice tests (`api` + `web`)**

Run: `pnpm --filter @wordmet/api exec vitest run src/practice/ && pnpm --filter @wordmet/web exec vitest run src/features/learner/practice/`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/practice/ apps/web/src/features/learner/practice/
git commit -m "fix(api): auto-fallback practice sessions to rule questions when AI is unavailable"
```

---

### Task 7: Harden Caddyfile, Add Worker Heartbeat Healthcheck & Billing Alerts (`F-06`, `F-07`, `F-09`)

**Files:**
- Modify: `deploy/Caddyfile:1-19`
- Modify: `deploy/compose.prod.yml:20-78`
- Create: `apps/api/src/health/worker-heartbeat.ts`
- Create: `apps/api/src/health/worker-heartbeat.spec.ts`
- Modify: `apps/api/src/worker.ts:1-19`
- Modify: `deploy/scripts/watch.sh:18-115`
- Modify: `deploy/scripts/daily-report.sql:1-21`

**Interfaces:**
- Consumes: `ReadinessService.check()` (`apps/api/src/health/readiness.service.ts`), `deploy/scripts/common.sh` (`compose`, `env_get`, `send-alert.sh`), Caddy `2.11.9` built-in `filter` log encoder.
- Produces:
  - `deploy/Caddyfile`: two explicit site blocks (`{$CADDY_API_SITE:api.wordmet.com}` returning `404` for `/v1/admin` and `/v1/admin/*`; `{$CADDY_ADMIN_API_SITE:admin-api.wordmet.com}` proxying all routes to `api:3000`), sharing a snippet `(api_log)` with `format filter` redacting `code`, `state`, `ticket`, `email`, `q` to `REDACTED` while keeping `.ts`, `.status`, `.duration`.
  - `startWorkerHeartbeat(readiness, filePath = '/tmp/worker-heartbeat', intervalMs = 20_000)` in `apps/api/src/health/worker-heartbeat.ts`: writes current epoch ms to `filePath` only when `readiness.check()` succeeds; returns `stop()`.
  - `worker` service in `deploy/compose.prod.yml` has `healthcheck` failing when `/tmp/worker-heartbeat` is missing or older than 60 s (`interval: 20s`, `timeout: 5s`, `retries: 3`, `start_period: 45s`).
  - `watch.sh` alerts on `order_money_unapplied:1`, `billing_signature_invalid:1`, `order_provider_mismatch:1`, plus DB alerts `billing-needs-review` (`billing_orders` with `status = 'needs_review'` created/updated within 24 h) and `billing-event-failed` (`billing_events` with `status = 'failed'`).
  - `daily-report.sql` adds `needs_review_orders` and `failed_billing_events` columns.

- [ ] **Step 1: Write failing unit test for `worker-heartbeat.ts`**

Create `apps/api/src/health/worker-heartbeat.spec.ts`:
```ts
describe('startWorkerHeartbeat (F-09)', () => {
  it('writes heartbeat file when readiness succeeds and stops writing when readiness fails', async () => {
    // 1st tick readiness resolves ok → file exists & updated
    // 2nd tick readiness rejects → file mtime NOT updated
    // stop() clears timer cleanly
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wordmet/api exec vitest run src/health/worker-heartbeat.spec.ts`
Expected: FAIL (`worker-heartbeat.ts` not found).

- [ ] **Step 3: Implement `worker-heartbeat.ts`, wire `worker.ts`, update `deploy/Caddyfile`, `deploy/compose.prod.yml`, `deploy/scripts/watch.sh`, and `deploy/scripts/daily-report.sql`**

- `apps/api/src/health/worker-heartbeat.ts` + wire in `apps/api/src/worker.ts` (start right after `NestFactory.createApplicationContext`, stop on `SIGTERM`/`SIGINT` before exit).
- `deploy/Caddyfile`:
  ```caddyfile
  {
  	email {$ACME_EMAIL}
  }

  (api_log) {
  	log {
  		output file /var/log/caddy/access.log {
  			roll_interval 24h
  			roll_keep 7
  			roll_keep_for 168h
  		}
  		format filter {
  			wrap json
  			fields {
  				request>uri query {
  					replace code REDACTED
  					replace state REDACTED
  					replace ticket REDACTED
  					replace email REDACTED
  					replace q REDACTED
  				}
  			}
  		}
  	}
  }

  {$CADDY_API_SITE:api.wordmet.com} {
  	@admin path /v1/admin /v1/admin/*
  	respond @admin 404
  	reverse_proxy api:3000
  	import api_log
  }

  {$CADDY_ADMIN_API_SITE:admin-api.wordmet.com} {
  	reverse_proxy api:3000
  	import api_log
  }
  ```
- `deploy/compose.prod.yml`: replace `CADDY_SITES` (including header comment line 5) with `CADDY_API_SITE: ${CADDY_API_SITE:-api.wordmet.com}` and `CADDY_ADMIN_API_SITE: ${CADDY_ADMIN_API_SITE:-admin-api.wordmet.com}`; add `healthcheck` to `worker`:
  `test: ['CMD', 'node', '-e', "const fs=require('node:fs');const s=fs.statSync('/tmp/worker-heartbeat');process.exit(Date.now()-s.mtimeMs<60000?0:1)"]`
- `deploy/scripts/watch.sh`: extend section 1 `for spec` list with `order_money_unapplied:1 billing_signature_invalid:1 order_provider_mismatch:1`; add section 7 running read-only `psql` counts for `billing_orders WHERE status = 'needs_review'` and `billing_events WHERE status = 'failed'` and sending `alert billing-needs-review` / `alert billing-event-failed` when count > 0 (never printing customer emails/PII — only order/event counts and IDs).
- `deploy/scripts/daily-report.sql`: add `(SELECT count(*) FROM billing_orders o WHERE o.status = 'needs_review') AS needs_review_orders` and `(SELECT count(*) FROM billing_events e WHERE e.status = 'failed') AS failed_billing_events`.

- [ ] **Step 4: Verify unit test + live `caddy:2.11.9` container check (Review Focus 5) + `bash -n`**

Run:
1. `pnpm --filter @wordmet/api exec vitest run src/health/` → PASS.
2. `bash -n deploy/scripts/watch.sh` → exit 0.
3. Start an isolated `caddy:2.11.9` container with the new `deploy/Caddyfile` (overriding `CADDY_API_SITE=:8080`, `CADDY_ADMIN_API_SITE=:8081` against a mock responder), hit:
   - `GET :8080/v1/admin` → `404`
   - `GET :8080/v1/admin/users` → `404`
   - `GET :8081/v1/admin/users` → `200`
   - `GET :8080/v1/auth/google/callback?code=SECRET123&state=STATE456` and `GET :8081/v1/admin/orders?email=pii@example.com&q=WM123`
   Inspect the JSON log line: assert `0` occurrences of `SECRET123`, `STATE456`, `pii@example.com`, `WM123`, assert `REDACTED` present, and assert `jq -r '"\(.ts) \(.status) \(.duration)"'` parses cleanly (Review Focus 5). Clean up container immediately.

- [ ] **Step 5: Commit**

```bash
git add deploy/Caddyfile deploy/compose.prod.yml deploy/scripts/watch.sh deploy/scripts/daily-report.sql apps/api/src/worker.ts apps/api/src/health/worker-heartbeat.ts apps/api/src/health/worker-heartbeat.spec.ts
git commit -m "fix(ops): redact Caddy query logs, block /v1/admin on public host, add worker healthcheck and billing alerts"
```

---

### Task 8: Add Safe Allowlisted Remote Preview Option to `mail:preview` (`D5`)

**Files:**
- Modify: `apps/api/src/cli/mail-preview-samples.ts:9-45`
- Modify: `apps/api/src/cli/mail-preview.ts:1-37`
- Create: `apps/api/src/cli/mail-preview.spec.ts`

**Interfaces:**
- Consumes: `SmtpMailer`, `mailPreviewSamples`.
- Produces:
  - `mailPreviewSamples(opts: MailPreviewOptions & { allLocales?: boolean })`: when `allLocales` is `true`, emits **21** emails (all 13 identity/account emails + both `vi` and `en` variants of `regular` reminder, `inactive` reminder, `payment_receipt`, and `expiry_notice`).
  - `parseMailPreviewArgs(argv: string[])` & `resolveMailPreviewTarget(host, args)`: without `--allow-remote-to <email>`, non-local `SMTP_HOST` still exits `1` (preserving existing safety guard); with `--allow-remote-to <email>`, sends ONLY to that exact single address using `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE` (never reads DB, never touches real users).

- [ ] **Step 1: Write failing unit tests in `apps/api/src/cli/mail-preview.spec.ts`**

```ts
describe('mail-preview (D5)', () => {
  it('refuses non-local SMTP_HOST when --allow-remote-to is absent', () => { ... });
  it('allows non-local SMTP_HOST only when --allow-remote-to matches the exact target email', () => { ... });
  it('mailPreviewSamples with allLocales=true generates all 21 emails covering VI and EN for every localized template', () => {
    const samples = mailPreviewSamples({ to: 'test@example.com', learnerAppUrl: 'https://wordmet.com', adminAppUrl: 'https://admin.wordmet.com', supportEmail: 'support@wordmet.com', allLocales: true });
    expect(samples).toHaveLength(21);
    expect(samples.every((m) => m.to === 'test@example.com')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @wordmet/api exec vitest run src/cli/mail-preview.spec.ts`
Expected: FAIL (`allLocales` returns 17 instead of 21; `parseMailPreviewArgs` not defined).

- [ ] **Step 3: Implement `allLocales` in `mail-preview-samples.ts` and `--allow-remote-to` in `mail-preview.ts`**

Keep default `pnpm mail:preview [address]` behavior 100% identical for local Mailpit; only enable remote SMTP (`user: env.SMTP_USER`, `pass: env.SMTP_PASS`, `secure: env.SMTP_SECURE === 'true'`) when `--allow-remote-to <email>` is explicitly supplied and verified against every `mail.to`.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @wordmet/api exec vitest run src/cli/mail-preview.spec.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/cli/mail-preview.ts apps/api/src/cli/mail-preview-samples.ts apps/api/src/cli/mail-preview.spec.ts
git commit -m "feat(api): add allowlisted remote test recipient and all-locales flag to mail:preview"
```

---

### Task 9: Isolated Verification Gate, Load Regression Check & PR Merge Into `dev`

**Files:**
- Verification only (temporary scratch scripts in `<artifactDir>/scratch/`, never committed).

**Interfaces:**
- Consumes: All commits from Tasks 2–8 on `fix/pre-publish-hardening`.
- Produces: Green local + CI verification evidence for every finding (`F-03`–`F-09`, `F-11`, `D7`, `D8`, `D13`), merged PR into `dev`.

- [ ] **Step 1: Run full lint, typecheck, build, unit tests, and schema drift check across the monorepo**

Run inside `../wt-pre-publish-fixes`:
```bash
pnpm --filter @wordmet/api lint && pnpm --filter @wordmet/api typecheck && pnpm --filter @wordmet/api build && pnpm --filter @wordmet/api test
pnpm --filter @wordmet/api exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/models --exit-code
pnpm --filter @wordmet/web lint && pnpm --filter @wordmet/web typecheck && pnpm --filter @wordmet/web test
pnpm --filter @wordmet/admin lint && pnpm --filter @wordmet/admin typecheck && pnpm --filter @wordmet/admin test
```
Expected: 100% PASS, 0 schema drift.

- [ ] **Step 2: Run isolated Docker dynamic proofs (Postgres 17 + Redis 7.4 + Caddy 2.11.9 + built API & worker)**

Verify live against real Postgres 17 + Redis 7.4 + `wordmet_app` role (with positive controls for every check):
1. `F-03`: 20 staggered refresh-vs-logout races (2–20 ms) → **0/20 survive** (all `T2` return `401`); sibling device chain returns `200`.
2. `F-04`: AI finishes after `POST /v1/me/account/delete` → **0** orphan `practice_word_checks`, **0** orphan `usage_records` (`reserve` & `refund`), `ai_calls.user_id IS NULL`; active control user writes normally.
3. `F-05` & `F-11`: underpayment → top-up + lost 2nd webhook → `claimForReconcile` claims order → **1** period opened; `codeTaken` failed order (`provider-mismatch`) → `claimForReconcile` returns **0** rows even after 2 h; transient `failed` no-link order (`review_reason IS NULL`) retried after 1 h.
4. `D8`: toggle `pro_checkout_enabled = false` → `POST /v1/me/orders` returns `503 checkout-paused`; webhook and `/check` for an existing pending order still open Pro period.
5. `F-08`: mixed + AI-only sessions with `aiEnabled=false` and missing `check_private_word` model → open and serve rule questions with one-time `ai-fallback`, 0 AI units charged; personal quota exhaustion still returns `403 ai-quota-insufficient`.
6. `F-09`: `worker` container reports Docker `healthy` via `/tmp/worker-heartbeat`; pausing Redis/Postgres causes `unhealthy` after 60 s.
7. `D13` load regression check: run 30 simultaneous burst + 50 staggered (~10 s) non-AI API load test; verify p95 < 500 ms, unexpected errors < 1%, pool within limit. Tear down all isolated test containers and volumes.

- [ ] **Step 3: Push `fix/pre-publish-hardening`, open PR into `dev`, and merge when CI 4/4 is green**

```bash
git push -u origin fix/pre-publish-hardening
gh pr create --base dev --title "fix: pre-publish security, payment reconcile, AI fallback, and ops hardening" --body "Implements docs/superpowers/specs/2026-11-20-pre-publish-audit-design.md (F-03..F-09, F-11..F-12, D7, D8, D5)."
```
Expected: All 4 CI checks (`api`, `web`, `admin`, `admin-e2e-real`) green; merge into `dev` and remove `../wt-pre-publish-fixes`.

---

### Task 10: Production Cutover, Real-R2 Local PITR Drill & Final Go/No-Go Sign-Off (`D4`–`D6`, `D11`, `F-01`, `F-02`, `F-10`, `F-15`)

**Files:**
- Create: `docs/audit/2026-11-21-pre-publish-go-nogo.md` (sanitized evidence + RTO/RPO + go/no-go verdict; zero PII/secrets)
- Modify: `docs/deliveries/deploy-checklist.md` (tick newly verified production checks)

**Interfaces:**
- Consumes: Merged `dev` from Task 9, owner approval for `dev` → `main` release, owner's read-only R2 token, owner's designated test Gmail & test account.
- Produces: Deployed `main` SHA on production + complete evidence package for owner's final launch decision.

- [ ] **Step 1: Owner pre-cutover dashboard actions (`F-10`, `F-15`)**

1. Cloudflare Dashboard → zone `wordmet.com` → SSL/TLS → Edge Certificates → enable **HSTS** (`max-age=31536000`, `includeSubDomains`).
2. GitHub Settings → Rulesets → add ruleset for `dev` requiring PR + green `api`, `web`, `admin` checks.
3. Open `dev` → `main` PR once owner approves; merge and confirm `Deploy` workflow succeeds for API, web, and admin at the exact `main` SHA.
4. On VPS, rotate/remove old Caddy access logs from before the `format filter` rollout so historical unredacted OAuth/email lines are purged, and verify `worker` shows `healthy` in `docker ps`.

- [ ] **Step 2: Production smoke & live verification (`D5`, `D6`, `F-02`, `F-06`, `F-07`, `F-10`)**

1. **Owner study account & public legal/sources (`D6`, §5):** confirm saved words intact before and after deploy (no email written to repo); verify `/vi/privacy`, `/vi/terms`, and `/vi/sources` accurately reflect AI, Google Cloud TTS, analytics, and published catalog sources (tick `C-26` in `dot-cai-thien-c-checklist.md` & `deploy-checklist.md`).
2. **TLS/HSTS & host split (`F-07`, `F-10`):** verify `HEAD` on `wordmet.com/vi`, `admin.wordmet.com/`, `api.wordmet.com/v1/health`, `admin-api.wordmet.com/v1/health` all include `Strict-Transport-Security`; verify `/v1/admin/users` returns `404` on `api.wordmet.com` and works via `admin.wordmet.com` → `admin-api.wordmet.com`.
3. **All enabled Gmail templates (`D5`):** run `pnpm mail:preview --allow-remote-to <owner-test-gmail> --all-locales` against Resend SMTP + trigger live immediate flows (OTP register/reset, Google link, Pro receipt) on test account; record Inbox/Spam, VI/EN rendering, and working links/codes for all 21 templates.
4. **Google OAuth & payOS post-18/11 (`F-02`):** verify real Google sign-in + 1 real small Pro order using time-based `orderCode >= 1_100_000_000` + read-only `orders:probe-payos` over a 5-minute window + quick toggle test of `pro_checkout_enabled` off/on (then restore `true`).
5. **Canary creation/deletion for PITR (`D11`):** on production, create 1 designated canary test account (distinct from owner's study account), record pre-target timestamp `T1`, delete the canary account (generating real R2 Deletion Journal entry + post-`T1` WAL), wait ≥ 90 s for WAL segment push to R2.

- [ ] **Step 3: Isolated local Docker WAL-G PITR + Deletion Journal + manual grant drill (`F-01`, `D4`, `D11`)**

1. Using a **read-only R2 API token** (scoped solely to `wordmet-backups` and `wordmet-delete-journal`), run isolated local Docker `wordmet-postgres:17-walg-3.0.9`:
   - `wal-g backup-fetch` + WAL replay to target `T1` (before canary deletion).
   - Verify pre-`T1` canary exists and post-`T1` marker does NOT exist.
   - Run `accounts:replay-deletions --journal` reading real R2 Deletion Journal → verify deleted canary account is erased (`users=0`, `deleted_accounts` tombstone present) while owner's study account remains intact.
   - Start local API against restored DB (with all outbound mail/payOS/AI disabled or faked) and confirm `/v1/health/ready` returns `200`.
   - Rehearse manual post-restore Pro grant (`§3`): 1 valid proof case (`entitlement_grants` granted cleanly) + 1 missing-proof/duplicate case (held for investigation, 0 duplicate grants).
   - Record measured **RPO** and **RTO** (explicitly noting local network/workstation caveats vs VPS).
2. **Mandatory cleanup (`D11`):** immediately `docker compose down -v` and securely delete all local restored DB volumes, temp WAL files, and read-only R2 credentials file.

- [ ] **Step 4: Publish sanitized Go/No-Go report and present to owner**

Write `docs/audit/2026-11-21-pre-publish-go-nogo.md` containing: reviewed & deployed SHA, evidence table for every §3/§5 criterion, measured RPO/RTO, documented residual risks (`D3` no staff MFA, `D10` Google third-party auto-link, `D13` real-LLM/edge load caveats), and explicit Go/No-Go checklist for owner sign-off.
