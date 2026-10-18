# Admin refresh keepalive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The admin sends `POST /v1/auth/refresh` with `keepalive: true`, so a reload or a page leave while a refresh is in flight no longer ends the session.

**Architecture:** One option added to the refresh request in `SessionStore.runRefresh()`; every refresh path (page start, 401, 403 `forbidden`, B25E30 retries) already goes through it. Unit tests pin the option per path, one real-stack Playwright test pins the browser behaviour, a one-off manual run checks the 429 path. No API change.

**Tech Stack:** React 19 admin (Vite 8), Vitest 4.1.11 + scripted `fetch` (`test-support.ts`), Playwright 1.63.0 (Chromium) against the real NestJS API.

**Spec:** `docs/superpowers/specs/2026-10-15-admin-refresh-keepalive-design.md` (approved 15/10/2026, RK1–RK8, RKC1–RKC5, RKE1–RKE10). Evidence: `docs/tasks/2026-10-15-refresh-fast-reload/`.

## Global Constraints

- Only `POST /v1/auth/refresh` gets `keepalive: true`; login, `/me`, logout, password change and content calls stay as they are (RK2).
- No change under `apps/api` (RK3). No feature detection or fallback (RK8).
- Tests: unit + exactly one real-stack e2e; the 429 path is a manual run, not CI (RK4). Chromium only (RK5).
- E2E leave: `page.goto('about:blank')` as soon as `page.waitForRequest` sees the page's refresh; wait `12_000` ms (> the 10 s grace) before reopening (RK7).
- Defect fix = two commits: the failing tests first, the fix second (owner rule). Conventional Commits, lower case, imperative, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch `fix/admin-refresh-keepalive`; PR base `feat/ui-b-admin` (stacked on PR #23), retarget to `dev` after #23 merges (RK6). Push and opening the PR need no approval; merging does. Scan for secrets before every push.
- Real-stack runs on this machine: ports `3000` and `5173` must be free (they are often held by other worktrees' servers; those belong to other sessions, so ask the owner, never kill them). Always run with `CI=1`, which turns off Playwright's `reuseExistingServer`, so a run can never test another worktree's admin.

## Review Focus

- A reviewer can mistake a green real-stack run for proof when Playwright reused another worktree's server on 5173: pinned by `CI=1` in the run command (Task 1, Step 4).
- Mid-session refresh after a 401 that first gets 429: every try must carry `keepalive`, not only the page-start one: pinned in the RKC1 retry test (Task 1, Step 2).
- The 12 s leave must not break later tests of the serial story (B25#6 uses the same editor page; a failure skips everything after it): pinned by running the whole real suite, not the single test (Task 1, Steps 4 and 8).
- The reload storm that hits 429 must end signed in after the B25E30 wait (the original incident): manual run in Task 2, Step 2.
- The new e2e may pass on unfixed code when the API answers before the page unloads (RKE8): Task 1, Step 4 records three red runs before the fix.

---

### Task 1: Refresh with keepalive, test first

**Files:**
- Modify: `apps/admin/src/auth/test-support.ts` (type `Call` and `makeFetch`)
- Modify: `apps/admin/src/auth/session-store.test.ts` (new tests at the end of `describe('SessionStore')`)
- Modify: `apps/admin/e2e-real/admin.real.spec.ts` (new test right after `B25#4: reloading keeps the editor signed in…`)
- Modify: `apps/admin/src/auth/session-store.ts` (`runRefresh()`, the `this.raw('/v1/auth/refresh', …)` call)

**Interfaces:**
- Consumes: `SessionStore` (unchanged public API), `makeFetch`, `tokenResponse`, `problem`, `rateLimited`, `makeMe`, `BASE` from `test-support.ts`.
- Produces: `Call.keepalive: boolean | undefined` in `test-support.ts` (the `init.keepalive` the store passed to `fetch`).

- [ ] **Step 1: Record `keepalive` in the scripted fetch**

In `test-support.ts`, add `keepalive: boolean | undefined` to `type Call` and set it from `init.keepalive` in `makeFetch` when building `call`. No other change.

- [ ] **Step 2: Write the failing unit tests**

Add to `session-store.test.ts` (import `type Call` from `./test-support`):

```ts
const refreshTries = (calls: Call[]) =>
  calls.filter((c) => c.method === 'POST' && c.path === '/v1/auth/refresh').map((c) => c.keepalive);

it('RKC1: the page-start refresh is sent with keepalive', async () => {
  // routes: refresh → tokenResponse('tok-1'), GET /v1/me → makeMe(); await store.bootstrap()
  expect(refreshTries(calls)).toEqual([true]);
});

it('RKC1: the refresh after a 401 is sent with keepalive', async () => {
  // routes: login → tok-1, /me → makeMe(), GET /v1/x → 401 invalid-token then 200, refresh → tok-2
  // await store.login(...); await store.send('/v1/x', { method: 'GET', headers: {} })
  expect(refreshTries(calls)).toEqual([true]);
});

it('RKC1: the refresh after a 403 forbidden is sent with keepalive', async () => {
  // routes as in "B25#6: 403 forbidden and the role is kept"; the ApiError is expected
  expect(refreshTries(calls)).toEqual([true]);
});

it('RKC1: every try after a 429 is sent with keepalive, at page start and mid-session', async () => {
  // A: bootstrap, refresh → rateLimited(2) then tok-1        → expect(refreshTries(a.calls)).toEqual([true, true])
  // B: login, GET /v1/thing → 401 then 200, refresh → rateLimited(3) then tok-2; store.send('/v1/thing', …)
  //                                                          → expect(refreshTries(b.calls)).toEqual([true, true])
  // both stores: new SessionStore({ baseUrl: BASE, fetch, channel: null, wait: async () => {} })
});

it('RKC2: login, /me, password change, other API calls and logout are sent without keepalive', async () => {
  // routes: login → tok-1, /me → makeMe({ must_change_password: first call only }), POST /v1/auth/password/change → tok-2,
  //         GET /v1/x → 200, POST /v1/auth/logout → 204
  // login → changePassword → send('/v1/x') → logout
  const others = calls.filter((c) => c.path !== '/v1/auth/refresh');
  expect(new Set(others.map((c) => c.path))).toEqual(
    new Set(['/v1/auth/login', '/v1/me', '/v1/auth/password/change', '/v1/x', '/v1/auth/logout']),
  );
  expect(others.every((c) => c.keepalive === undefined)).toBe(true);
});
```

`toEqual([true])` checks both the count and the value, so a test cannot pass on zero refresh calls.

- [ ] **Step 3: Run the unit tests and check which fail**

Run: `pnpm -C apps/admin exec vitest run src/auth/session-store.test.ts`
Expected: the four `RKC1` tests FAIL (`expected [ undefined ] to deeply equal [ true ]` or similar); `RKC2` and every existing test PASS (RKC2 is a guard against widening the change).

- [ ] **Step 4: Write the e2e test and see it fail three times on the unfixed code**

Add right after the `B25#4` test in `admin.real.spec.ts`:

```ts
test('RKC3: leaving the page while its refresh is in flight keeps the session when the editor comes back 12 s later', async () => {
  await editorPage.goto('/uploads');
  await expect(editorPage.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();
  const refresh = editorPage.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/v1/auth/refresh'));
  await editorPage.reload({ waitUntil: 'commit' });
  await refresh;
  await editorPage.goto('about:blank'); // RK7: the page unloads while its refresh is on the wire
  await editorPage.waitForTimeout(12_000); // longer than the 10 s refresh grace (Bước 1, B1#16)
  await editorPage.goto('/uploads');
  await expect(editorPage).toHaveURL(/\/uploads$/);
  await expect(editorPage.getByRole('heading', { level: 1, name: vi.nav.uploads })).toBeVisible();
});
```

Check the ports first: `netstat -ano | grep LISTENING | grep -E ":(3000|5173) "` must print nothing; otherwise stop and ask the owner. Then run the whole real suite against an API built from this worktree, with the CI job's environment (no `.env` file; secrets generated per run). Run in the background, from the repo root in Git Bash:

```bash
RUN=keepalive_e2e_$(date +%s); LOG="$TEMP/$RUN"; mkdir -p "$LOG"
docker exec english-learning-postgres-1 psql -U dev -d postgres -c "create database $RUN;"
secret() { node apps/api/scripts/gen-secret.mjs; }
export DATABASE_URL=postgresql://dev:dev@localhost:5434/$RUN REDIS_URL=redis://localhost:6380 \
  JWT_KEYS="k1:$(secret)" JWT_ISSUER=ci-issuer JWT_AUDIENCE=ci-audience OTP_HMAC_KEY=$(secret) \
  RATE_LIMIT_HMAC_KEY=$(secret) REFRESH_GRACE_KEY=$(secret) MAIL_BUDGET_KEY=$RUN MAIL_DAILY_BUDGET=1500 \
  SMTP_HOST=localhost SMTP_PORT=1025 SMTP_FROM=no-reply@localhost SMTP_SECURE=false \
  CORS_ORIGINS=http://localhost:5173 ADMIN_APP_URL=http://localhost:5173 PROBLEM_TYPE_BASE=http://localhost:3000/problems/ \
  TRUST_PROXY=false MAINTENANCE_ENABLED=false JOB_QUEUE_PREFIX=$RUN \
  IMPORT_RECONCILE_SECONDS=1 IMPORT_LEASE_SECONDS=6 IMPORT_HEARTBEAT_SECONDS=2
(cd apps/api && pnpm db:setup > "$LOG/setup.log" 2>&1 && pnpm build > "$LOG/build.log" 2>&1) || exit 1
(cd apps/api && { node dist/main.js > "$LOG/api.log" 2>&1 & echo $! > "$LOG/api.pid"; node dist/worker.js > "$LOG/worker.log" 2>&1 & echo $! > "$LOG/worker.pid"; })
until curl -fsS http://localhost:3000/v1/health > /dev/null; do sleep 1; done
(cd apps/admin && CI=1 pnpm test:e2e:real); STATUS=$?
kill $(cat "$LOG/api.pid") $(cat "$LOG/worker.pid"); echo "exit $STATUS, logs in $LOG"
```

Expected: `RKC3` FAILS at `toHaveURL(/\/uploads$/)` (the page is on `/login`), and `refresh_reuse_detected` appears in `$LOG/api.log`; the tests after it are skipped (the file runs in `serial` mode). Run it 3 times (a fresh database each run). Record how many of the 3 runs failed at RKC3 for the delivery record (RKE8). If none failed, stop and report: the test does not reproduce the bug on this machine.

If the owner cannot free the ports, push this commit alone (Step 5), open the PR (Task 2, Step 4) and use the CI job `admin-e2e-real` as the red run, re-running the failed job twice (`gh run rerun <id> --failed`).

- [ ] **Step 5: Commit the failing tests**

```bash
git add apps/admin/src/auth/test-support.ts apps/admin/src/auth/session-store.test.ts apps/admin/e2e-real/admin.real.spec.ts
git commit -m "test(admin): reproduce a reload during refresh ending the session"
```

- [ ] **Step 6: Send the refresh with keepalive**

In `runRefresh()` of `session-store.ts`, pass `{ ...json('POST', {}, this.csrf()), keepalive: true }` as the `init` of the `/v1/auth/refresh` call, with a one-line comment that a reload or page leave must not drop the rotated cookie (link the design). `raw()` already forwards `init` to `fetch`; nothing else changes.

- [ ] **Step 7: Run the unit suite, lint and typecheck**

Run: `pnpm -C apps/admin test` then `pnpm -C apps/admin lint` then `pnpm -C apps/admin typecheck`
Expected: all tests pass (the count before this plan + 5 new); lint and typecheck exit 0.

- [ ] **Step 8: Run the real suite on the fixed code**

Same command and port check as Step 4. Expected: every test passes, including `RKC3`, `B25#4`, `B25#6` and `B25#8 + B25E1` (RKC5); `refresh_reuse_detected` does not appear in `$LOG/api.log`.

- [ ] **Step 9: Commit the fix**

```bash
git add apps/admin/src/auth/session-store.ts
git commit -m "fix(admin): send the session refresh with keepalive"
```

### Task 2: Manual check of the 429 path, docs, PR

**Files:**
- Modify: `docs/deliveries/admin-refresh-keepalive.md` (as-built section after the plan summary)
- Modify: `docs/superpowers/specs/2026-10-14-buoc-2-5-admin-web-design.md` (row `B25E30`)
- Modify: `docs/superpowers/specs/2026-10-15-ui-refresh-b-design.md` (row `UBE34`)
- Modify: `docs/deliveries/ui-refresh-b.md` (admin "Còn mở", the item "B25E30 vẫn có thể mất phiên khi tải lại thật nhanh")
- Modify: `docs/superpowers/specs/2026-10-15-admin-refresh-keepalive-design.md` and `docs/tasks/2026-10-15-refresh-fast-reload/report.md` (status lines)

**Interfaces:**
- Consumes: the fixed `session-store.ts` from Task 1; the evidence scripts in `docs/tasks/2026-10-15-refresh-fast-reload/evidence/`.
- Produces: nothing other tasks use.

- [ ] **Step 1: Start the evidence stack on the fixed code**

Copy `stack.mjs`, `browser-repro.mjs` and `leave-repro2.mjs` from the evidence folder into the session scratchpad (they write `state.json` and logs next to themselves, which must not land in the repo), check ports `3300` and `5273` are free, then run `node stack.mjs` in the background until it prints `READY <email>`. It serves this worktree's admin (Vite dev, port 5273) and API (port 3300, database `english_learning_reload_repro`, which needs `pnpm db:setup` with that `DATABASE_URL` if it was dropped).

- [ ] **Step 2: Run the 429 path and the leave path without any simulation**

Run: `node browser-repro.mjs inflight 0 14 all` (no `KEEPALIVE` variable: the real code is under test)
Expected: `first 429 on last page` shows a cookie row with an empty `rotated_at`; `outcome: SIGNED IN`; `refresh_reuse_detected 0` (RKC4).

Run: `LEAVE_URL=about:blank node leave-repro2.mjs 12` three times
Expected: `back after 12s: SIGNED IN` each time.

Stop the stack (stop the background task and check ports 3300 and 5273 are free again).

- [ ] **Step 3: Write the as-built record and the doc pointers**

- `docs/deliveries/admin-refresh-keepalive.md`: append `# Admin refresh keepalive — as-built (<date>)` with the commits, the three red runs of Step 4 in Task 1 (how many failed), the green runs, the outputs of Task 2 Step 2 (verbatim, short), and any deviation from the plan.
- B25E30 row (Bước 2.5 design) and UBE34 row (UI-B design): add one sentence: "Tải lại hoặc rời trang khi refresh đang chạy: refresh gửi với `keepalive` (`2026-10-15-admin-refresh-keepalive-design.md`)".
- `docs/deliveries/ui-refresh-b.md`, admin "Còn mở": replace the B25E30 fast-reload item with a pointer to the delivery record.
- Status lines of the keepalive design and of the investigation report: "đã làm, PR <link>".

- [ ] **Step 4: Commit, push and open the PR**

```bash
git add docs
git commit -m "docs(admin): record the keepalive refresh as built"
```

Scan for secrets in the branch (tracked file names and the diff against `origin/feat/ui-b-admin`), then `git push -u origin fix/admin-refresh-keepalive` and `gh pr create --base feat/ui-b-admin` with a Vietnamese summary (cause, fix, tests, evidence links) ending with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Report the branch, its upstream, `git log --oneline origin/feat/ui-b-admin..HEAD` and the PR link. Do not merge.

- [ ] **Step 5: Read the CI result**

Expected: jobs `admin` and `admin-e2e-real` green on the PR. If `admin-e2e-real` fails at `RKC3`, read its report artifact before changing anything.
