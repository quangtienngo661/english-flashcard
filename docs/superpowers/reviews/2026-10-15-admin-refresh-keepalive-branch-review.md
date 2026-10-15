# Code review: `fix/admin-refresh-keepalive` (6517a58..b79522c, PR #24)

> Fresh reviewer (opus), dispatched 15–16/10/2026 by the executing session after both plan tasks. Saved verbatim. How each
> finding was handled: `docs/deliveries/admin-refresh-keepalive.md`, section "Review cả nhánh".

I reviewed this in one pass myself: the product diff line by line, the docs for consistency, and the evidence files only for secrets and PII. Here is what I checked myself this session:
- `pnpm -C apps/admin exec vitest run src/auth/session-store.test.ts`: 31/31. The verbose run lists all 5 RKC tests.
- `gh pr checks 24` on head b79522c: all 4 jobs pass. In the CI `admin` job log, unit is 286/286 and the mocked e2e is 139 passed / 53 skipped, no flaky tests. That includes `UBC17 … (B25E30)` on desktop and mobile, which also shows that `page.route` still intercepts the keepalive refresh. In the `admin-e2e-real` log, RKC3 passes in 12.3 s and B25#6 passes.
- I read the API's refresh/grace logic (`session.service.ts`), the rate limiter and the CORS setup.
- External sources: MDN `RequestInit`, MDN browser-compat-data (`api.fetch.options_parameter.keepalive`) and the Chromium "Intent to Ship: Fetch API: keepalive" thread.

### Strengths
- The fix is one line at the single place every refresh goes through (`runRefresh()`, `session-store.ts:183`). It covers page start, 401, 403 `forbidden`, the B25E30 retries and the BroadcastChannel `login`→`bootstrap` path, and it leaves single-flight, 401/403 handling and broadcast untouched. No API change and no security loosening, and it removes false `refresh_reuse_detected` alarms.
- The investigation is evidence-driven with real controls: a DB row shows the token minted by the leave-time rotation being rotated normally 12.06 s later, and the chain rate counter (14 hits, then one after the minute boundary) confirms the 429 path in `fixed-inflight-all.out`.
- TDD was followed. The red commit came before the fix. The e2e failed 3/3 on unfixed code with `CI=1` and a fresh DB each run, each with one `refresh_reuse_detected` (Review Focus 1 and 5). The aborted run red3 was correctly not counted.
- The unit tests are well built. `toEqual([true])` pins both the count and the value. The 429 test covers page start and mid-session (Review Focus 2). RKC2 has a control: it asserts which 5 paths actually ran before asserting `keepalive === undefined`, so it cannot pass by checking nothing.
- The docs are consistent: status lines, B25E30/UBE34 pointers, the `ui-refresh-b.md` "Còn mở" item, the CLAUDE.md pointer and the decision record. The evidence contains no secrets or real emails (only `dev@localhost`, `no-reply@localhost`, and per-run generated keys).

### Issues

#### Critical (Must Fix)
None.

#### Important (Should Fix)

**I1. If the browser rejects the keepalive refresh, the user is signed out on every reload. That is not "behaves as today", which is what RK8/RKE5 assume.**
- **Where:** `apps/admin/src/auth/session-store.ts:183`, together with `:162-163` (bootstrap `catch` → `signed-out`) and `:209` (the `authed()` refresh has no catch). The premise is in the design (RK8 line 50, RKE5 line 114) and in decisions line 65 / line 87.
- **What's wrong:** RK8 assumes that a browser without `keepalive` support ignores the option. That is true only for an engine that has no `keepalive` at all (an unknown dictionary member is ignored). It is not true for an engine that supports `keepalive` but refuses it on a request that needs a CORS preflight. This refresh always needs one: it is cross-origin with `Content-Type: application/json` and `X-CSRF-Protection`.
  - Chromium itself shipped keepalive like that. Its Intent to Ship says keepalive was disabled for requests needing a CORS preflight and that "making fetch for such a request leads to a failure". The known error text is "Preflight request for request with keepalive specified is currently not supported".
  - Chromium 153 works (the owner's probe). In which Chromium version that limit was lifted, and how current Firefox (keepalive since 133) and Safari (since 13) handle keepalive with a preflight: **UNVERIFIED**. MDN's compat data has no notes on preflight either way.
- **Why it matters:** in such an engine `fetch` rejects with a `TypeError`, with two effects:
  - Every page start goes to `signed-out`, so the staff member is sent to `/login` without a notice on every reload.
  - Mid-session, after the 15-minute access token expires, every API call rejects with a network error instead of signing out.

  That makes the admin practically unusable in that browser. Today the same browser works, apart from the fast-reload edge case. The cookie itself stays valid, because the request never leaves the browser. The same failure path applies to any other keepalive rejection, such as a per-process in-flight cap (Chromium had a cap of 9 in 2018; its current state is unverified).
- **How to fix:** this needs an owner decision, because RK8 says "no fallback". Two options:
  - (a) Fall back once when the keepalive attempt rejects:
    ```ts
    try { return await this.raw('/v1/auth/refresh', { ...init, keepalive: true }, null); }
    catch (e) { if (!(e instanceof TypeError)) throw e; return this.raw('/v1/auth/refresh', init, null); }
    ```
    This is safe with the server's grace logic. If the first attempt never reached the server, the second one rotates normally. If it reached the server and only the answer was lost, the retry comes within 10 s and gets the same successor through the grace path (`refreshLocked`), so there is no reuse.
    Add one unit test: the first fetch throws `TypeError`, the second refresh has `keepalive: undefined`.
  - (b) Keep RK8, but re-record RK5/RK8/RKE5 with the real failure mode and run one manual page-start check on current Firefox and WebKit before deploy.

  I recommend (a): about 5 lines, and it turns the unverified assumption into a guaranteed "as today" outcome.

**I2. RKC3 uses up the editor chain's refresh budget, so B25#6 now runs at exactly the limit.**
- **Where:** `apps/admin/e2e-real/admin.real.spec.ts:163,166,170` together with `:182`. The limit is `apps/api/src/common/config/app-config.ts:82` (`auth.refresh.chain` max 10 per 60 s). The limiter (`rate-limiter.service.ts`) uses fixed minute windows and rejects on `count > max`.
- **What's wrong:** counting page loads on the editor's post-password-change chain:
  - B25#12/14: 4 `goto`s.
  - B25#4: 2.
  - RKC3: 3 (goto, reload, the return goto).
  - B25#6: the 403 `forbidden` refresh, which is the 10th.

  Before this PR B25#6 was the 7th. From B1 to B10 takes about 21 s (green run: 7.4 + 0.17 + 12.2 + 0.8 s), so in about 2 of 3 runs all 10 fall in one window. Today that still passes every time, because 10 is not more than 10. But there is zero headroom.
- **Why it matters:** this hits Review Focus 3 ("the 12 s leave must not break later tests of the serial story"). RKE9's reasoning ("it does not log out or change any account") misses this shared budget. One more editor navigation before B25#6 makes B25#6 fail in about 2 of 3 runs, depending on the time of the minute. The symptom would be a 429 countdown instead of `/login` "no access", far from the cause.
- **How to fix:** drop the redundant `await editorPage.goto('/uploads')` + heading check at the top of RKC3. B25#4 already leaves `editorPage` signed in on `/uploads` with the heading visible, and the story is serial anyway. Add a one-line comment on the 10/min chain budget. Optionally note the budget in RKE9 or the delivery record.

#### Minor (Nice to Have)

**M1. RKC3 can pass on unfixed code whenever the unload cancels the request before it reaches the API (RKE8). The red runs were local Windows only; CI (Linux) never showed a red run.**
- **Where:** `admin.real.spec.ts:165-172`.
- **Fix:** make the test deterministic in both directions by asserting that the browser stored the keepalive answer. The cookie is `refresh_token`, path `/v1/auth`, httpOnly, and Playwright can read it:
  ```ts
  const cookie = async () => (await editorPage.context().cookies('http://localhost:3000/v1/auth')).find((c) => c.name === 'refresh_token')?.value;
  const before = await cookie();            // read BEFORE reload, so a fast answer cannot race it
  // … reload, await refresh, goto('about:blank'), waitForTimeout(12_000) …
  expect(await cookie()).not.toBe(before);  // the leave-time rotation's Set-Cookie was stored
  ```
  On unfixed code this fails both when the answer was dropped and when the request never left the browser. On fixed code it always passes.

**M2. `toHaveURL(/\/uploads$/)` right after `goto('/uploads')` cannot fail.**
- **Where:** `admin.real.spec.ts:171`. The executor's ruling confirms it: the URL is `/uploads` before the app redirects.
- **Fix:** move it after the heading assertion, or replace it with `await expect(editorPage).not.toHaveURL(/\/login/)` placed after the heading check. The heading check is the real guard (`RequireSession` renders `SessionLoading` until signed in). The same pattern in B25#4 is older code (see Declined).

**M3. The delivery record is missing the CI evidence and the open risks.**
- **Where:** `docs/deliveries/admin-refresh-keepalive.md`.
- **What's missing:**
  - The CI result on b79522c: `admin` 286 unit + mocked e2e 139 passed / 53 skipped, including UBC17 B25E30; `admin-e2e-real` 8/8 with RKC3 at 12.3 s.
  - The fact that the mocked Playwright suite was not run locally. CI is what covered that part of RKC5.
- **Fix:** add those lines. Add I1's failure mode and I2's zero headroom to "Còn mở" unless they are fixed.

### Declined to judge
These are set aside as outside the plan or spec, one line each, for the executor to rule on:
- **Logout without keepalive (RK2).** Its rationale ("losing the answer only makes the user log in again") is wrong for logout. A logout cancelled by closing the tab leaves the chain alive and the cookie intact, so the next visit is signed in. This is older behaviour, explicitly out of scope by RK2, and not made worse here.
- **Browser killed or network lost mid-refresh (RKE4).** Out of scope by RK1/RK3 (that is option B).
- **Out-of-order `Set-Cookie` between concurrent keepalive answers in a reload storm.** A grace answer for T0 could arrive after a later T1→T2 rotation. This is the same race class that already exists between tabs (B1E5/B25E1), and the 14-reload run shows no reuse. Not judged further.
- **Chromium keepalive concurrency or byte caps today.** Unverified. Any such rejection is covered by I1's fallback, so I did not judge it separately.
- **Firefox bug 1935088** (keepalive cookies missing in cross-origin iframes, fixed in 136). The admin is a top-level page, so it does not apply. It does show that Firefox's keepalive path handles cookies separately, which is relevant to RK5's assumption.
- **B25#4's equally empty `toHaveURL` after `goto`.** Older test, not part of this diff.
- **The `BatchPanel` findBy flake under default workers.** Already documented in `ui-refresh-b.md`, and CI's unit run passed 286/286.
- **Plan Task 2 Step 2 names `browser-repro.mjs`, while the keepalive simulation lives in `browser-repro2.mjs`.** Harmless: the fixed-code run used the version without simulation, as intended.
- **Evidence `.mjs`/`.out` files.** Not product code. I only scanned them for secrets and PII (clean).
- **The executor's ruling to stop other worktrees' servers with the owner's consent.** A process decision, not code.
- **The Flutter app having no keepalive.** Out of scope, already noted in design §9.

### Recommendations
1. Settle I1 with the owner. I recommend the `TypeError` fallback plus one unit test. Otherwise, re-label RK8/RKE5 with the real failure mode and check Firefox/WebKit once by hand before deploy.
2. Apply the I2 trim (drop the redundant first `goto` in RKC3) and the M1 cookie assertion together. That gives the RKC3 test the same shape and makes it deterministic in CI.
3. Fill in the delivery record (M3).

### Assessment
**Ready to merge?** With fixes

**Reasoning:** The change is correct, minimal and well proven on Chromium, and CI is green. But the "unsupported browser behaves as today" premise behind RK8 does not hold for engines that reject keepalive on a preflighted request, where users would be signed out on every reload, so the owner should re-decide with that information. The new e2e also leaves the serial story with zero refresh-budget headroom.

Sources:
- [MDN — RequestInit (keepalive)](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
- [MDN browser-compat-data — fetch keepalive](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/_globals/fetch.json)
- [Chromium blink-dev — Intent to Ship: Fetch API: keepalive](https://groups.google.com/a/chromium.org/g/blink-dev/c/8vqcABTnDF4/m/ykhzwcggDgAJ)
- [WHATWG fetch discussion quoting the preflight+keepalive error (2020)](https://lists.w3.org/Archives/Public/public-webapps-github/2020Feb/0609.html)
- [Mozilla Bug 1935088 — keepalive cookies in cross-origin iframes](https://bugzilla.mozilla.org/show_bug.cgi?id=1935088)
