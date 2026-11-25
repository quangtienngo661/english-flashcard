# Task C3 — Windows vs Linux Test Timing Run (2026-11-25)

**Branch:** `ci/audit-c-integration` (base `23f7f30f`)  
**Host:** Windows 11 (12 logical processors), Node `24.11.0`, pnpm `11.6.0`, Vitest `4.1.11`, Docker `node:24.11.0-bookworm`  
**Scope:** Compare `pnpm test` in `apps/admin` and `apps/web` run **alone** on Windows vs Linux at default timeouts, raise `testTimeout` to `15_000` on files that hit Vitest's `5000ms` timeout on Windows while passing in Linux, and report all findings.

## Summary

| App | Platform & config | Test files | Tests | Duration | Exit |
|---|---|---:|---:|---:|---:|
| `apps/web` | Windows alone (12 vCPUs) | 163 passed (163) | 1776 passed (1776) | 307.89s | 0 |
| `apps/web` | Linux `node:24.11.0-bookworm` (native ext4, 12 vCPUs) | 163 passed (163) | 1776 passed (1776) | 170.15s | 0 |
| `apps/admin` | Linux `node:24.11.0-bookworm` (native ext4, `--cpus=4`, CI parity) | 106 passed (106) | 1422 passed (1422) | 311.45s | 0 |
| `apps/admin` | Linux `node:24.11.0-bookworm` (native ext4, unconstrained 12 vCPUs) | 14 failed \| 92 passed (106)* | 14 failed \| 1396 passed (1410)* | 196.22s | 1 |
| `apps/admin` | Windows alone (12 vCPUs, default timeouts) | 15 failed \| 91 passed (106) | 28 failed \| 1394 passed (1422) | 395.62s | 1 |
| `apps/admin` | Windows re-run of the 9 files updated to `testTimeout: 15_000` | 9 passed (9) | 214 passed (214) | 95.90s | 0 |

\* In the earlier unconstrained 12-vCPU Linux run, `scripts/ai-config-publish.test.ts` (12 tests) failed to load because `apps/api/scripts` was not yet in the minimal archive; the remaining 13 files (14 tests) timed out under 12-worker hyperthread contention. Once `apps/api/scripts` was included and the container ran at `--cpus=4` (matching GitHub Actions `ubuntu-latest`), all **106/106 files and 1422/1422 tests passed at default timeouts**.

## Commands & Environment Notes

### Windows (run alone, host quiet)

```powershell
Set-Location "E:/Working/Working project/english-learning-wt-audit-c/apps/admin"; pnpm test
Set-Location "E:/Working/Working project/english-learning-wt-audit-c/apps/web"; pnpm test
```

### Linux (`node:24.11.0-bookworm`)

Two practical deviations from the literal command in the prompt were needed and verified:

1. **Corepack pnpm version:** Root `package.json` has no `packageManager` field, so bare `corepack enable && pnpm ...` downloaded `pnpm@12.23.0` and failed immediately with `Error: Cannot find module '/root/.cache/node/corepack/v1/pnpm/12.23.0/bin/pnpm.cjs'`. Activating the CI version via `corepack prepare pnpm@11.6.0 --activate` resolved it.
2. **Native Linux ext4 vs Docker Desktop NTFS bind mount:** Running directly over `-v "E:/...:/w"` (with anonymous volumes shadowing `node_modules` so Windows native binaries were untouched) caused severe NTFS/VirtioFS I/O overhead (`transform 666.37s, import 910.65s, Duration 378.16s`, 97 timeouts in `apps/admin`). Exporting tracked files via `git archive HEAD` into `/tmp/w` inside the container gave native Linux ext4 performance matching CI without touching the Windows worktree.

```bash
# Archive tracked files needed by admin, web, and cross-app tests (migrations + api scripts)
git archive -o repo.tar HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version apps/api/package.json apps/api/prisma/migrations apps/api/scripts apps/admin apps/web packages

# Linux CI-parity run (--cpus=4) for apps/admin
docker run --rm --cpus=4 -v "<scratch>:/scratch" -v c3-pnpm-store:/root/.local/share/pnpm/store node:24.11.0-bookworm bash -lc "
  set -euo pipefail
  mkdir -p /tmp/w && tar -C /tmp/w -xf /scratch/repo.tar && cd /tmp/w
  corepack enable && corepack prepare pnpm@11.6.0 --activate
  pnpm install --frozen-lockfile --filter admin...
  cd /tmp/w/apps/admin && pnpm test
"

# Linux run for apps/web
docker run --rm -v "<scratch>:/scratch" -v c3-pnpm-store:/root/.local/share/pnpm/store node:24.11.0-bookworm bash -lc "
  set -euo pipefail
  mkdir -p /tmp/w && tar -C /tmp/w -xf /scratch/repo.tar && cd /tmp/w
  corepack enable && corepack prepare pnpm@11.6.0 --activate
  pnpm install --frozen-lockfile --filter admin... --filter web...
  cd /tmp/w/apps/web && pnpm test
"
```

## Failing Tests by Platform

### `apps/web`

- **Windows alone:** None (163/163 files, 1776/1776 tests passed).
- **Linux:** None (163/163 files, 1776/1776 tests passed).
- **Why:** 38 jsdom test files in `apps/web` already configure `vi.setConfig({ testTimeout: 20_000 })` or `30_000`. No changes needed.

### `apps/admin` — Linux (`--cpus=4`, CI parity)

- **None** (106/106 files, 1422/1422 tests passed at default timeout). This confirms there are no functional test bugs.

### `apps/admin` — Windows alone (15 files, 28 tests)

#### A. Vitest `5000ms` timeouts (9 files — updated to `testTimeout: 15_000`)

All 9 files passed 100% on Linux (`--cpus=4`) at default timeout. On Windows alone under 12 parallel jsdom workers, these multi-interaction tests exceeded Vitest's `5000ms` default:

1. `src/features/ai/AiCostsBatches.test.tsx`
   - `cost batches > paginates, binds tokens to filters, and changes kind/status/operation in the URL` (`Test timed out in 5000ms`)
2. `src/features/ai/AiEvalPage.test.tsx`
   - `AiEvalPage examples (A/83) > [Thêm ví dụ] opens /ai/eval/new with a box per input field of the operation; it POSTs the input (empty → null) and the note` (`Test timed out in 5000ms`)
   - `AiEvalPage example dialog: the expected answer (nhóm B M1) > leaving the word and the part of speech fills the forms of the catalog; the admin removes two and the POST carries the rest` (`Test timed out in 5000ms`)
3. `src/features/ai/configs/AiConfigsPage.test.tsx`
   - `AiConfigsPage: the live config and creating a draft (M2-T6) > shows the live config with its model; [Tạo nháp] posts {} and opens the draft "Nháp · cấu hình 4 · lần sửa 0"` (`Test timed out in 5000ms`)
   - `AiConfigsPage: deleting the draft (M2-T6) > [Xóa nháp] asks "Xóa nháp cấu hình 4?"; confirming deletes it and the page goes back to the live config only` (`TestingLibraryElementError: Unable to find role="button" and name "Tạo nháp"` — 1000ms `findBy*` timeout)
4. `src/features/settings/SettingsPage.test.tsx`
   - `SettingsPage (A/70a–A/70f, design §6.7) > §6.7: switching tab while dirty asks nothing and keeps the change; a value set back clears the dot and leaving asks nothing` (`Test timed out in 5000ms`)
   - `SettingsPage (A/70a–A/70f, design §6.7) > §6.7: a violation on default_questions_per_session opens tab Luyện tập and focuses that field` (`Test timed out in 5000ms`)
   - `SettingsPage (A/70a–A/70f, design §6.7) > §6.7: version-conflict shows the copy and [Tải lại]; with changes it asks first, then reloads the new version` (`Test timed out in 5000ms`)
   - `Bước 8 settings (design §11) > the "Tài khoản" tab edits the unverified clean-up days and the plans tab edits the retention years, with the Luật Kế toán note` (`Test timed out in 5000ms`)
   - `nhóm B settings (design §5.1) > the AI tab edits the held-out share: the hint gives the range and the default as percents, and 0,25 is sent as 0.25` (cascading `AssertionError` from the preceding timed-out test's leftover state; passed on re-run once `testTimeout` was raised)
5. `src/features/transactions/TransactionsPage.test.tsx`
   - `TransactionsPage (A/90–A/90c) > filters become query params: email, kind, and the Vietnam day boundaries of Từ ngày / Tới ngày (inclusive)` (`Test timed out in 5000ms`)
6. `src/features/ai/TestRunPanel.test.tsx` (also hit `5000ms` in unconstrained 12-vCPU Linux; passed in 4-vCPU Linux at 1845ms)
   - `Chạy thử on the configs page (A/82, M2-T6) > §6.4 "Chạy với:" with a set: first five, then the chosen ones; example_ids sent; at most 5 can be chosen` (`Test timed out in 5000ms`)
7. `src/features/ai/configs/workspace.test.tsx` (also hit `5000ms` in unconstrained 12-vCPU Linux; passed in 4-vCPU Linux at 3182ms)
   - `AI workspace > opens dev selection in a dialog, caps selection at five, and keeps picks across filters and reopening` (`Test timed out in 5000ms`)
8. `src/features/ai/judges/AiJudgesPage.test.tsx` (one of the three also hit `5000ms` in unconstrained 12-vCPU Linux; all passed in 4-vCPU Linux at 1951ms–2563ms)
   - `AiJudgesPage: editing a judge (M3-T15) > "Sửa", "Fake · fake:ok", "Lưu bản mới" PUTs expected_revision 1 with every field and toasts "Đã lưu bản 2."` (`Test timed out in 5000ms`)
   - `AiJudgesPage: editing a judge (M3-T15) > the criteria are edited in place: add one, remove another; the body carries them in order` (`Test timed out in 5000ms`)
   - `AiJudgesPage: a new judge and a clone (M3-T15) > "Thêm judge" opens an empty editor; "Tạo judge" POSTs the whole definition and toasts "Đã tạo judge Tự nhiên."` (`Test timed out in 5000ms`)
9. `src/features/words/WordsPage.test.tsx` (also hit `5000ms` in unconstrained 12-vCPU Linux; passed in 4-vCPU Linux at 2401ms)
   - `WordsPage (A/87) > Sửa cách viết khác sends the whole set; Từ chức năng sends true/false/null and needs taxonomy.manage` (`Test timed out in 5000ms`)

#### B. Testing Library `1000ms` `findBy*` timeouts (6 files — unchanged, reported)

These files did **not** hit Vitest's `5000ms` `testTimeout`; they hit `@testing-library/dom`'s default `1000ms` `asyncUtilTimeout` during initial full-app mount under 12 parallel jsdom workers. Raising `testTimeout` does not affect `findBy*` timeouts, so these files were left unchanged per Task C3 scope (note: `SensesPage`, `SettingsPage`, `TopicsPage`, and `WordsPage` already call `configure({ asyncUtilTimeout: 4000 })`, and capping `maxWorkers` or raising `asyncUtilTimeout` in `vitest.setup.ts` would eliminate this class of flake on high-thread-count laptops):

- `src/features/ai/configs/ConfigHistory.test.tsx` — `"Tạo nháp từ bản này" posts { from_config_id } of that row and opens the draft`
- `src/features/entitlements/GrantsPage.test.tsx` — `§6.11: the list asks for 20, newest first, and shows learner, kind, numbers, dates, grantor and reason`
- `src/features/publish-jobs/PublishJobs.test.tsx` — `list: renders items from GET .../publish-jobs and "Tải thêm" follows next_page_token`; `create: filter level/topic/pos/batch_id is posted as { filter } with a key, and the job opens`
- `src/features/reports/ReportsPage.test.tsx` — `§6.8: the default request has status=open and the empty list says "Không còn báo lỗi chưa xử lý."`; all 4 tests in `report detail: add to the example set`
- `src/features/sources/SourcesPage.test.tsx` — `renders each source with version, license and priority`
- `src/features/users/UserEdit.test.tsx` — `an editor sees the list and the detail but no [Tạo người dùng], [Sửa], [Đặt lại mật khẩu] or [Khóa tài khoản]`

### `apps/admin` — Linux unconstrained 12 vCPUs (13 test files, 14 tests)

Under 12 simultaneous jsdom workers on the 6-core/12-thread host, Linux hit the same worker-contention timeouts (all passed when constrained to `--cpus=4`):

- `5000ms` `testTimeout` (5): `ForgotPasswordPage.test.tsx` (1), `TestRunPanel.test.tsx` (1), `WordsPage.test.tsx` (1), `workspace.test.tsx` (1), `AiJudgesPage.test.tsx` (1)
- `1000ms` `findBy*` `TestingLibraryElementError` (9): `AiEvalPage.test.tsx` (1), `AiModelsPage.test.tsx` (2), `GrantsPage.test.tsx` (1), `FaqPage.test.tsx` (1), `ReportsPage.test.tsx` (1), `UploadsPage.test.tsx` (1), `UserEdit.test.tsx` (1), `ConfigHistory.test.tsx` (1)

## What Changed

Added `vitest.setConfig({ testTimeout: 15_000 });` with a one-line comment explaining the Windows timing cause to each of the 9 `5000ms`-timeout files in `apps/admin` (one commit per file):

- `apps/admin/src/features/ai/AiCostsBatches.test.tsx`
- `apps/admin/src/features/ai/AiEvalPage.test.tsx`
- `apps/admin/src/features/ai/configs/AiConfigsPage.test.tsx`
- `apps/admin/src/features/settings/SettingsPage.test.tsx`
- `apps/admin/src/features/transactions/TransactionsPage.test.tsx`
- `apps/admin/src/features/ai/TestRunPanel.test.tsx`
- `apps/admin/src/features/ai/configs/workspace.test.tsx`
- `apps/admin/src/features/ai/judges/AiJudgesPage.test.tsx`
- `apps/admin/src/features/words/WordsPage.test.tsx`

Verification on Windows after the edits:
- Re-ran all 9 updated test files together: **9 passed (9), 214 passed (214)** in `95.90s`.
- `pnpm lint && pnpm typecheck` in `apps/admin`: **exit 0**.

## Output Tails (Last 20 Lines)

### Windows alone — `apps/admin` (`pnpm test`, before timeout edits)

```text
 FAIL  src/features/ai/judges/AiJudgesPage.test.tsx > AiJudgesPage: a new judge and a clone (M3-T15) > "Thêm judge" opens an empty editor; "Tạo judge" POSTs the whole definition and toasts "Đã tạo judge Tự nhiên."
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ src/features/ai/judges/AiJudgesPage.test.tsx:209:3
    207|
    208| describe('AiJudgesPage: a new judge and a clone (M3-T15)', () => {
    209|   it('"Thêm judge" opens an empty editor; "Tạo judge" POSTs the whole …
       |   ^
    210|     const r = await openPage(judgeRoutes({ [JURL.create]: () => Respon…
    211|     await userEvent.click(button('Thêm judge'));

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/28]⎯


 Test Files  15 failed | 91 passed (106)
      Tests  28 failed | 1394 passed (1422)
   Start at  17:56:59
   Duration  395.62s (transform 40.69s, setup 1411.32s, import 416.93s, tests 1558.93s, environment 824.05s)

[ELIFECYCLE] Test failed. See above for more details.
```

### Windows alone — `apps/web` (`pnpm test`)

```text
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act

 ✓ src/features/learner/auth/account-deleted.test.tsx (2 tests) 546ms
     ✓ says the account was deleted and links back to sign-in  470ms
 ✓ src/ui/StatusDot.test.tsx (5 tests) 133ms
 ✓ src/features/learner/calendar/calendar-api.test.tsx (3 tests) 390ms
 ✓ src/ui/LevelChip.test.tsx (3 tests) 632ms
     ✓ reads "Bậc 3 11" as one button with aria-pressed  415ms
 ✓ src/site/layout/site-live.test.tsx (1 test) 40ms
 ✓ src/ui/Tag.test.tsx (1 test) 61ms
 ✓ src/app-chrome/error-view.test.tsx (1 test) 387ms
     ✓ says what happened and retries on "Thử lại"  379ms

 Test Files  163 passed (163)
      Tests  1776 passed (1776)
   Start at  18:03:46
   Duration  307.89s (transform 34.25s, setup 385.30s, import 1043.00s, tests 805.55s, environment 909.34s)
```

### Linux (`--cpus=4`, CI parity) — `apps/admin` (`pnpm test`)

```text
 ✓ scripts/check-tailwind-raw.test.ts (5 tests) 12ms
 ✓ src/api/download.test.ts (1 test) 28ms
 ✓ src/features/jobs/status-badge.test.tsx (3 tests) 68ms
 ✓ src/app/shell-slots.test.tsx (2 tests) 608ms
     ✓ PageActions puts "Upload CSV" in the sheet header beside the h1  498ms
 ✓ src/config.test.ts (10 tests) 12ms
 ✓ src/features/ai/cost-range.test.ts (4 tests) 8ms
 ✓ src/auth/gate.test.ts (1 test) 5ms
 ✓ src/auth/password-policy.test.ts (4 tests) 12ms
 ✓ src/features/entitlements/BreakableEmail.test.tsx (2 tests) 97ms
 ✓ src/features/ai/operation-violations.test.ts (2 tests) 12ms
 ✓ src/api/idempotency.test.tsx (1 test) 40ms
 ✓ src/api/user-ref.test.ts (4 tests) 12ms
 ✓ src/i18n/parity.test.ts (1 test) 15ms

 Test Files  106 passed (106)
      Tests  1422 passed (1422)
   Start at  11:11:09
   Duration  311.45s (transform 9.55s, setup 107.42s, import 72.09s, tests 601.86s, environment 121.67s)
```

### Linux (unconstrained 12 vCPUs) — `apps/admin` (`pnpm test`)

```text
 FAIL  src/features/ai/judges/AiJudgesPage.test.tsx > AiJudgesPage: editing a judge (M3-T15) > the criteria are edited in place: add one, remove another; the body carries them in order
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ src/features/ai/judges/AiJudgesPage.test.tsx:151:3
    149|   });
    150|
    151|   it('the criteria are edited in place: add one, remove another; the b…
       |   ^
    152|     const both = [judgeView().latest.criteria[0]!, { code: 'natural', …
    153|     const r = await openEditor(judgeRoutes({ [JURL.save()]: () => Resp…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/15]⎯


 Test Files  14 failed | 92 passed (106)
      Tests  14 failed | 1396 passed (1410)
   Start at  10:50:00
   Duration  196.22s (transform 34.21s, setup 265.07s, import 171.44s, tests 1330.07s, environment 299.66s)

[ELIFECYCLE] Test failed. See above for more details.
```

### Linux — `apps/web` (`pnpm test`)

```text
 ✓ src/app-shell/timezone-sync.test.ts (4 tests) 117ms
 ✓ src/features/learner/auth/account-deleted.test.tsx (2 tests) 1548ms
     ✓ says the account was deleted and links back to sign-in  1322ms
 ✓ src/site/layout/theme-toggle-button.test.tsx (1 test) 900ms
     ✓ L1 a click stores dark and swaps its label to the light one  893ms
 ✓ src/ui/LevelChip.test.tsx (3 tests) 993ms
     ✓ reads "Bậc 3 11" as one button with aria-pressed  663ms
 ✓ src/app-shell/api/idempotency.test.tsx (1 test) 114ms
 ✓ src/app/[locale]/og-fonts.test.ts (1 test) 14ms
 ✓ src/features/learner/calendar/calendar-api.test.tsx (3 tests) 480ms
 ✓ src/ui/StatusDot.test.tsx (5 tests) 113ms
 ✓ src/site/layout/site-live.test.tsx (1 test) 27ms
 ✓ src/ui/Tag.test.tsx (1 test) 55ms
 ✓ src/app-chrome/error-view.test.tsx (1 test) 278ms

 Test Files  163 passed (163)
      Tests  1776 passed (1776)
   Start at  10:53:17
   Duration  170.15s (transform 45.49s, setup 104.75s, import 328.06s, tests 912.02s, environment 369.45s)
```

### Windows re-run — 9 updated `apps/admin` test files

```text
     ✓ 409 admin-usd-cap when starting a run with a judge reads its own sentence  575ms
     ✓ 409 model-price-missing when starting a run with a judge reads its own sentence  556ms
     ✓ 409 judge-pass-running when starting a run with a judge reads its own sentence  540ms
     ✓ shows 20 examples a page with "Trang 1/2"; [Trang sau] shows the last 5, [Trang trước] goes back  1463ms
     ✓ 20 examples or fewer: no page buttons  704ms
     ✓ choosing "Từ Z → A" sorts every example and goes back to page 1  1618ms
     ✓ "Held-out trước" puts the hidden held-out rows on top  632ms
     ✓ selects this page only, preserves choices across pages and filters, confirms dev/held-out counts and sends one bulk request  3732ms
     ✓ select all filtered targets only the search results, and cancel sends nothing  1583ms
     ✓ level and split filters exclude held-out content, and switching operation clears selection even when coming back  3222ms
     ✓ a network failure keeps the selection and retries the same confirmed payload with the same Idempotency-Key  1045ms
     ✓ held-out rows come first by default, then dev, each in the order received  453ms
     ✓ the selection bar is one row: count, [Bỏ chọn], [Chọn toàn bộ] and [Xóa đã chọn], with no explanation  636ms
     ✓ three sub-pages: the list is current at /ai/eval; versions and the run box are at /ai/eval/sets; runs at /ai/eval/runs  732ms

 Test Files  9 passed (9)
      Tests  214 passed (214)
   Start at  18:19:18
   Duration  95.90s (transform 25.36s, setup 81.25s, import 67.79s, tests 301.17s, environment 66.53s)
```
