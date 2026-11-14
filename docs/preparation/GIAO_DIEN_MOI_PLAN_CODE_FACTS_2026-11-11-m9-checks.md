# Giao diện mới M9, chế độ tối và rà soát: code facts (11/11/2026)

**Source:** this worktree, HEAD `4bb42658` (`docs/giao-dien-moi-plan-9` = `origin/refactor/giao-dien-moi` @ `1c4c752e` plus the two docs commits of
plan part 8). Line numbers are on that tree unless a line says otherwise. `git fetch` on 11/11/2026 moved `origin/refactor/giao-dien-moi` to
`aecb4475` (merge of PR #265, M8a: FAQ API and admin screen), which is HEAD plus M8a only (`git diff --stat 4bb42658 origin/refactor/giao-dien-moi`:
32 files, all `apps/api`, `apps/admin` and three delivery docs; design and plan unchanged). Facts about M8a are read with `git show
origin/refactor/giao-dien-moi:<path>`. Local branch `feat/giao-dien-moi-m8b` (`41ee86eb`, worktree `distracted-dirac-2a4acc`) was read with
`git log` / `git diff` only.

**Method.** `git log`, `git diff`, `git show`, `git ls-remote`, `gh pr list`, `gh run view`, `gh api …/branches/*` (read-only); the Grep tool and
`grep -r` on `apps/web/src` (note: `git grep` with an exclude pathspec run from `apps/web` returned nothing for `@/app-ui/` while `grep -r` found
14 files, so every count below comes from `grep`/Grep, not `git grep`). The map path check of plan Task 0 Step 4 was re-run with its control. This
worktree has no `node_modules`, so no test, build or lint was run. Two Next internals were read (read-only) from the main checkout's
`apps/web/node_modules/next` (version 16.4.3, the same pin as this tree and the tag). Nothing was edited except this file.

## 0. Big picture

Surprises first.

1. **M9's final PR is gated by three things that are not M9's work and are not done.**
   - M8b: only Task M8.3 is committed, on an unpushed local branch (`git log origin/refactor/giao-dien-moi..feat/giao-dien-moi-m8b` = one commit
     `41ee86eb`, 29 files, +617/−63). `src/components/` (45 files) and the old public pages are still on the long branch.
   - M8c: needs the owner to approve Figma frames first (plan `:3678-3686`); not started.
   - The owner's polish round (delivery record `:165-201`): deletes `app-ui/` and the old token imports. Design §14 (`design:901`) makes both a
     condition of "Xong khi". No branch for it exists locally or on origin (`git branch -a | grep -i polish` lists only four older branches from
     October). The audit it works from is local only (`docs/audit/2026-11-11-ui-audit/` in the main checkout).
2. **The dark mockups have no recorded approval.** GM4 says the dark part is fixed only after the owner approves 5 dark mockups (`design:900`,
   decisions `:83-84`). The M1 as-built links the artifact and says "mockup tối chờ chủ dự án duyệt" (delivery `:239`, `:250`); plan `:573` says
   "The answer is needed before M9". No later line in the design, plan, delivery record, rulings or decisions records an approval (grep "GM4",
   "mockup tối", the artifact id). UNVERIFIED whether the owner answered in chat or on the artifact.
3. **Most hand-run checks of design §13 have no tooling yet.** No `compare-bundle-stats.mjs`, no unused-message-key script, no Lighthouse or
   Schema Markup Validator tooling, no `gm-m5*`, `gm-m8` or `gm-m9` shot set, no frame-rate on a real phone (§1). `pnpm shots` has never been run
   with the real stack for `gm-m3` and `gm-m4` (delivery `:329`, `:355`); every other milestone was shot with the mock API in `cf:docker` from a
   throwaway spec, light only, vi only, 390 and 1440 only.
4. **Design §5.7 lazy loading is only partly built, so the 10 % bundle budget is at risk.** `next/dynamic` is used for Thêm từ, Lịch and Ngày
   (`features/learner/add-word/add-word-context.tsx:8`, `features/learner/calendar/CalendarHost.tsx:12-13`) but not for Tùy chỉnh phiên
   (`features/learner/practice/use-practice-starter.tsx:15`, static import) or Giới thiệu Pro (`app/[locale]/app/(member)/layout.app.tsx:6`, static
   import into the layout of every member page). Hover prefetch exists only for the calendar month (`features/learner/calendar/calendar-api.ts:90`);
   tabs and group cards have none. UNVERIFIED how much JS this adds per route (nothing has measured it).
5. **The final PR is cheap to bring up to date today:** `origin/dev` (`3852f6cc`, 10/11 16:06) is fully inside the long branch
   (`git rev-list --count origin/refactor/giao-dien-moi..origin/dev` = 0). The PR would carry 231 commits, 542 files, +59.697 / −7.770.
6. **A PR into `dev` runs exactly the CI a PR into the long branch runs** (`ci.yml:5-6`, no branch filter); `dev` is protected but has **no
   required status check** (`gh api …/branches/dev`: `protected: true`, `required_status_checks.contexts: []`, `enforcement_level: off`). Under
   `~/.claude/rules/git-conventions.md` ("Repo chưa có required check nào thì hỏi trước") the final merge needs the owner's go-ahead.
7. **Dark mode has thin automated coverage on the newest screens:** journeys `m6`, `m7a`, `m7b` run axe in light only (no `colorScheme` in those
   files); stage, group and practice colours in dark are the light values or placeholders (`packages/design-tokens/web-dark.css:19-21, 23-78`);
   no dark shadow exists (`web-dark.css:2`; `web.css:38-47` defines the shadows once).

## 1. Design §13, row by row

| §13 row | Command / file on this tree | In `package.json` | Run by CI | Missing for M9 |
|---|---|---|---|---|
| Unit, component (web) | `vitest run`; include `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts` (`apps/web/vitest.config.ts:13`) | `apps/web/package.json:13` | `ci.yml:98-99` | — |
| Unit (API) | `vitest run` | `apps/api/package.json:24` | `ci.yml:67-68` | — |
| Pure functions | in the web unit suite | — | yes | — |
| Lint, typecheck, build (web) | `eslint . && node scripts/check-tailwind-raw.mjs`; `tsc --noEmit`; production build = `cf:build` inside `test:e2e` | `apps/web/package.json:11-12,19` | `ci.yml:92-96`; build only through e2e (`playwright.config.ts:19`) | — |
| Lint, typecheck, build (API) | `oxlint src/ test/`; no `typecheck` script, CI runs `tsc --noEmit -p tsconfig.json`; `nest build` | `apps/api/package.json:15,23` | `ci.yml:58-65`, plus schema drift `:55-56` | — |
| Render mode | `scripts/assert-render-mode.mjs` (reads `.next/prerender-manifest.json`, `:22`) | `apps/web/package.json:17` | `ci.yml:107-112` (design cites `:108`, matches) | — |
| Admin | `lint`, `typecheck`, `test`, `build`, `test:e2e`, `test:e2e:real` | `apps/admin/package.json:8-15` | jobs `admin` `ci.yml:114-163`, `admin-e2e-real` `:165-262` | — |
| e2e web | `playwright test`; webServer `pnpm cf:build && node scripts/e2e-cf.mjs && pnpm cf:dev` on :3100 (`playwright.config.ts:18-33`); Windows: `pnpm cf:docker` (`scripts/cf-docker.mjs:84-85` runs e2e then `assert:render-mode`) | `:15`, `:23` | `ci.yml:101-105` | — |
| Smoke API | `apps/api/scripts/smoke-giao-dien-moi.mjs` (header `:1-12`; `SMOKE_GM_SUFFIX` `:26-30`) | `apps/api/package.json:43` | **no** (no smoke step in `ci.yml`) | A run on the final tree on a fresh DB. Last run: M8a, `ALL OK — 15 steps`, built from an "uncommitted tree" of `feat/giao-dien-moi-m8a` (`origin/…:docs/deliveries/giao-dien-moi-smoke-output.txt:247-296`) |
| Shots vs Figma | `playwright test --config playwright.shots.config.ts`; base URL `SHOTS_BASE_URL` or :3001, not in CI (`playwright.shots.config.ts:3-11`) | `apps/web/package.json:16` | no | See §1.1 |
| Accessibility | `e2e/a11y.spec.ts` (public, light + dark, `:7-8`); `e2e/support/axe.ts` `seriousViolations` (`:13`) | — | yes (inside e2e) | See §1.2 |
| Unused message keys | **does not exist**. `src/i18n/messages.test.ts:34-41` (LP3) only checks vi/en key parity and empty values | — | — | A new check. `vi.json` has 1.497 keys (`App` 1.279, `Landing` 195). At least 27 `t(\`…\`)` / `t.rich(\`…\`)` calls with built keys in 20 non-test files (Grep `\bt\(\`` etc.) need the allow-list; `t(variable)` calls not counted (UNVERIFIED). A `*.test.ts` under `src/` or `scripts/` would run in CI automatically (`vitest.config.ts:13`) |
| Lighthouse, Schema Markup Validator | **no tooling**, no dependency, no notes (Grep `lighthouse|Lighthouse|schema` outside docs: none) | — | — | Manual run (design `:887`). Needs a production-like server: `pnpm bootstrap` serves `next build` + `next start` on :3001 (`Dockerfile:62-85`); `cf:docker` has no mode that keeps a production server up (`--dev`/`--dev-app` are `next dev`, `cf-docker.mjs:24-57`). SEO score on any local build loses the crawlable audit unless `NEXT_PUBLIC_INDEXABLE=true` (`lib/site.ts:3`, `lib/metadata.ts:29`, `app/robots.ts:4-7`). JSON-LD to validate is still the old `components/seo/JsonLd.tsx` until M8.8 |
| JS size | **`scripts/compare-bundle-stats.mjs` does not exist** (no `compare-bundle` anywhere outside docs; root `scripts/` holds only `bootstrap.mjs`) | — | — | See §1.3 |
| Frame rate | no tooling; measurements so far are headless only | — | — | See §1.4 |

### 1.1 `pnpm shots`

- Keys present: `gm-m1`, `gm-m2`, `gm-m3`, `gm-m6`, `gm-m4`, `gm-m7a`, `gm-m7b` (`e2e-shots/shots.spec.ts:45-72`); old keys `m1`…`m5b` still there
  (`:73-125`, functions `:514-795`). **Missing: `gm-m5a`, `gm-m5b`, `gm-m8`, `gm-m9`.** M5a, M5b, M6 and M7 shots were taken from throwaway specs
  with the mock API (delivery `:399-401`, `:440`, `:478`, `:582`), not committed.
- Default `WIDTHS = [390, 1024, 1440]` (`:6`), but every `gm-*` function overrides to `[390, 1440]` (`:132, 173, 199, 289, 330, 371, 430`).
- Dark: only `gm-m1` shoots light and dark (`:133-134`, `:160-161`); `gm-m2` forces light (`:174`); the others never call `emulateMedia`.
- The whole test skips without `SHOTS_EMAIL` / `SHOTS_PASSWORD` (`:43`), signed-out sets included.
- Recorded blocker for real-stack runs: port 3001 is held by the main checkout's `pnpm bootstrap`, and the API only allows CORS from 3000/3001
  (delivery `:295-297`, `:329`, `:355`).
- Not shot anywhere so far (per the as-built "Chưa kiểm" lines): dark for M2–M7 (`:300`, `:413`, `:455`, `:498`, `:522`, `:620`), English, 1024 px;
  the M5b drag shot after the selection fix (`:441`); the M6.9 session-bar button (`:508`).
- §9 frames M9 must shoot: M2 9 pages; M3 5 routes + picker + 5 dialogs; M4 2 routes + 5 overlays + 3 dialogs; M5 practice, Tùy chỉnh phiên (3
  frames), session (5 states), weak, review (4), recall (4); M6 Lịch, Ngày, reports; M7 6 routes + avatar menu + Pro dialog + Hủy gói; M8 5 public
  pages (`design:536-646`).

### 1.2 Accessibility per journey

`e2e/app/*.spec.ts`, counted with grep (`seriousViolations|AxeBuilder`, `colorScheme`):

| Journey | axe calls | light + dark loop |
|---|---|---|
| `b8-set-password`, `overflow` | 0 | no |
| `cai-thien-a-group`, `-practice`, `-speak`, `m1`, `m2`, `m3`, `m4b`, `m5a`, `m5b`, `recall` | 2–5 each | yes |
| `m4` | 3 | yes (two loops) |
| `m6` (`:64`, `:73`), `m7a` (`:28-85`, 5 calls), `m7b` (`:19-93`, 5 calls) | 2–6 | **no** |

Public pages: `a11y.spec.ts:7-18` (`/vi`, `/vi/privacy`, `/vi/terms`, `/vi/sources`, light and dark). M8.9 rewrites it (plan `:3655`).

### 1.3 Bundle comparison (§5.7)

- Next writes `.next/diagnostics/route-bundle-stats.json` only when the bundler is Turbopack (main checkout
  `apps/web/node_modules/next/dist/build/index.js:2922-2923`). Rows are `{ route, firstLoadUncompressedJsBytes, firstLoadChunkPaths }` with the
  route normalised by `normalizeAppPath` (`…/build/route-bundle-stats.js:42-58`, `:133-134`), so route groups (`(member)` vs `(member)/(chrome)`) do
  not change the key. Not a documented file (design `:266-268`).
- This tree builds with Turbopack: `"build": "next build"` with no `--webpack` (`apps/web/package.json:9`; Next 16 builds with Turbopack by default,
  `next/dist/docs/01-app/02-guides/upgrading/version-16.md:102,130`); M8b ruling R192 observed Turbopack under `opennextjs-cloudflare build`
  (`feat/giao-dien-moi-m8b:docs/deliveries/giao-dien-moi-rulings.md:209`).
- Baseline: tag `archive/giao-dien-cu-2026-11` = `50b632e7` (lightweight tag, on origin: `git ls-remote --tags origin`). The tag pins the same
  `next` 16.4.3, `@opennextjs/cloudflare` 1.20.13 and `"build": "next build"` (`git show archive/…:apps/web/package.json:9,19,26,31`), and has the
  same `cf-docker.mjs` and `Dockerfile` web target. Building it needs a checkout of the tag (cf-docker mounts the working tree, `cf-docker.mjs:14`).
- **`cf-docker --build` does not copy `.next/diagnostics/` out:** it copies only `prerender-manifest.json` and `.open-next` (`cf-docker.mjs:75,78`).
  The script must run in the container, or cf-docker must copy the file. `pnpm bootstrap`'s image also runs `next build` (`Dockerfile:83`) but
  keeps `.next` inside the image.
- Routes that exist only on one side: `/[locale]/app/settings/reports` is new; `/[locale]/app/practice/history` is now a server redirect
  (`app/[locale]/app/(member)/(chrome)/practice/history/page.app.tsx:1-15`). Both need a rule in the script.
- Location is ambiguous: design `:267` says `scripts/compare-bundle-stats.mjs`; repo root `scripts/` and `apps/web/scripts/` both exist.
- Fallback named by the design: Lighthouse "Total JavaScript" on Hôm nay, Nhóm, Phiên luyện (`design:268-269`).

### 1.4 Frame rate (§8.1, §8.5)

- Required before merging into `dev`: one Học session of 20 cards on a low-end Android and Safari iOS, DevTools Performance, CPU 4–6× slower
  (`design:482-483`); also Nhóm carousel (`design:522`). §14 wants "số khung hình trên điện thoại" recorded (`design:903`).
- Measured so far, both headless Chromium in a Linux container without GPU and the mock API: Nhóm carousel median 10,4 fps over 6 switches
  (delivery `:326`); Học 20 cards 40,8 fps, p95 50 ms (delivery `:434`). No real-phone number anywhere.
- ASSUMPTION (not checked this session): profiling Safari iOS needs Safari Web Inspector on macOS; this machine is Windows 11.

## 2. Design §14, item by item (state on HEAD unless noted)

| §14 item | State | Evidence |
|---|---|---|
| Every §9 frame has a screen | App routes: all 28 §9 paths have a route file (find `page*.tsx`: 5 public, 7 `(auth)`, 17 `(chrome)` incl. the `practice/history` redirect, 3 `(focus)`, 2 `(onboarding)`), rebuilt in M2–M7 per the as-builts. **Public pages are still the old ones**: `(site)/page.tsx:2-12` imports `@/components/*`. Favicon / OG (M8c) not started | plan `:3678-3709` |
| `/app/recall` per approved mockup | Built in M5b from Figma `208:*`/`209:*` (delivery `:428`; e2e `e2e/app/recall.spec.ts`) | design `:595` |
| 5 dark mockups approved, dark fixed | No approval recorded (§0.2). `web-dark.css:19-21` practice colours temporary (R124, rulings `:150`); `:23-78` stage and group colours = light values; grain in dark "tuned with the dark mockups in M9" (`globals.css:439-443`) | design `:405`, `:422` (dark group colours #7a55d3 3,32:1, #64708c 3,46:1) |
| `app-ui/` deleted | 13 files remain (`Button`, `Flag`, `Locked`, `PronunciationLine`, `Select`, `SpeakButtons`, `States`, `StreakToast`, `Toast`, `date-of-birth`, `test-utils`, 2 tests). Polish round's job | §3 |
| `components/` deleted | 45 files remain; M8.5/M8.7/M8.9 delete them (plan `:3459-3461`, `:3554`, `:3641`) | `find src/components -type f` |
| `HistoryPage.tsx` deleted | **Done**: no file named `HistoryPage*`; the route only redirects (M6.7, delivery `:468`) | `practice/history/page.app.tsx:1-15` |
| Old tokens unused deleted | `globals.css:2,4,6` still import `theme.css`, `dark.css`, `island.css`. Admin imports only `theme.css` (`apps/admin/src/styles/globals.css:2`; test `apps/admin/src/styles/tokens.test.ts:8`), so `dark.css`, `island.css`, `dark-pastel.css` can go once web drops them (design `:344`). Guards to change: `apps/web/src/styles/tokens.test.ts:9` reads `dark.css`, `:122` reads `dark-pastel.css`, `:142-144` asserts the `island.css` import; `packages/design-tokens/package.json:6-11` exports all six | — |
| Tag on GitHub | **Done**: `refs/tags/archive/giao-dien-cu-2026-11` → `50b632e7` (`git ls-remote --tags origin`) | — |
| `giao-dien-cu-map.md` complete | 164 backticked paths, **0 missing** in the tag (plan Task 0 Step 4 loop; control `apps/web/src/nope.tsx` reported missing). Covers 28 old app routes, layouts, chrome, `app-ui/`, `components/`, tokens, feature folders. **No public-page rows on HEAD**; M8b adds them (+22 lines: public routes, root layout, OG image, icons, manifest, `globals.css`) | `docs/deliveries/giao-dien-cu-map.md:8-167`; `git diff origin/refactor/giao-dien-moi...feat/giao-dien-moi-m8b -- docs/deliveries/giao-dien-cu-map.md` |
| Tests, lint, typecheck, build (web, API, admin) | In CI on every PR (§1); last green CI: PR #265 (M8a), run `43010323976`, web job 13 min 23 s; M7 run `42983222789` web 16 min 24 s (timeout 30 min, `ci.yml:73`) | `gh run view` |
| `smoke:giao-dien-moi` on a fresh DB | Not in CI; last pass M8a (15 steps) | §1 |
| Bundle, Lighthouse, Schema, frame rate | None done | §1.3, §1.4 |
| QR1–QR3, QR5 decided; QR4 parked | **Done**: design `:69-73`; decisions `:117-170`. QR4 "gác lại 10/11/2026", "trừ khi chủ dự án chốt trước PR cuối" (`design:904`) | — |
| Final PR CI green | Not opened | §6 |

## 3. Counts in the polish list, re-checked

- **14 `app-ui/` import sites outside tests: confirmed** (14 files, 15 import lines; `AppProviders.tsx:8-9` has two). Same files as delivery
  `:171-176`: `app-shell/AppProviders.tsx`, `app-shell/RequireSession.tsx:6`, `practice/{PracticePage.tsx:11, WeakWordsPage.tsx:14,
  CustomizeDialog.tsx:11}`, `practice/session/{PracticeSession.tsx:11, AlternativeFeedback.tsx:6, AnswerFeedback.tsx:6, use-practice-session.ts:9}`,
  `recall/{RecallSession.tsx:5, RecallSummary.tsx:7}`, `review/{ReviewSession.tsx:12, use-review-queue.ts:7}`.
- **60 test files: confirmed for `@/app-ui/test-utils`** (6 `app-chrome/`, 6 `ui/`, 48 `features/`). Two more inside `app-ui/` import
  `./test-utils` (`toast.test.tsx`, `streak-toast.test.tsx`), so 62 files use `renderApp` or `pickDate` (`app-ui/test-utils.tsx:15`, `:58`).
  `pickDate` alone: 5 files (`auth/auth-turnstile`, `auth/auth`, `auth/google-complete`, `settings/settings`, `ui/fields`). The M8 cleanup facts
  counted 63 on `df32b3b8` (before M7).
- **Not in the polish list:** test files also import other `app-ui/` modules: `ToastRegion` from `@/app-ui/Toast` (12 files), `StreakToast` (2),
  `parseBirthDate` from `@/app-ui/date-of-birth` (2). Deleting `app-ui/` touches them too.
- Spot check of old classes (partial list `bg-canvas|text-primary|bg-primary|bg-navy|…`, non-test, outside `components/` and `app-ui/`): 7 files
  (`(site)/not-found.tsx`, `app/layout.app.tsx`, `app-chrome/ThemeToggle.tsx`, `app-shell/AppProviders.tsx`, `groups/highlight.tsx`,
  `practice/session/ReportDialog.tsx`, `ui/PronunciationLine.tsx`). Not exhaustive (UNVERIFIED); `rounded-sm` sites in the polish list
  (`SessionNotice.tsx`, `GroupPage.tsx`) are not caught by this list.
- `globals.css` lines in the polish list moved: `body` reads `var(--color-surface)`, `var(--color-ink)` at `:513-515`; focus ring
  `var(--color-primary)` at `:526-527`, `:532-542` (the list says "khoảng 519–548").

## 4. Everything deferred to M9 or to "before the final PR"

From design, plan, delivery record, rulings, decisions (grep `M9`, `PR cuối`, `đợt cuối`) and code comments:

1. Fix dark per the approved mockups (design `:648`, `:900`; plan `:72`, `:353`, `:573`; decisions `:331-332`: grain `screen` 12 % to retune).
2. Dark values of stage colours, group colours, practice colours and shadows (design `:376`, `:405`, `:422`; delivery `:332`; rulings R124 `:150`;
   `web-dark.css:2,19,23`). M8b adds four more dark public tokens with no dark frame (R189, `feat/giao-dien-moi-m8b` rulings).
3. Delete `dark.css`, `island.css`, `dark-pastel.css` once admin is checked (design `:344`); never touch `theme.css` (design `:343`).
4. Rename `DotGridBackground` (design `:459`; `ui/DotGridBackground.tsx:3`; decisions `:331`).
5. Run every §13 check, shoot every screen against Figma, open the final PR through `ship-pr` (design `:144`, `:648-649`).
6. Lighthouse and Schema Markup Validator by hand (design `:887`); `compare-bundle-stats.mjs` and frame rate (plan `:72`).
7. Any screen `dev` gains meanwhile goes into M9 (design `:149`). None so far: `dev` has not moved since `3852f6cc`.
8. QR4 decision, if the owner wants one, before the final PR (design `:904`).
9. The polish round must finish before the final PR (delivery `:168`).
10. Items marked "until M8" that M8b/M8c or the polish round must clear, else they land on M9: `ui/Dialog` `wide` alias (`ui/Dialog.tsx:18`,
    `ui/overlays.test.tsx:87`; polish item 9); `app-ui/Toast` re-export (`ui/Toast.tsx:16`); comments `web.css:2`, `globals.css:7`;
    Lexend in the OG image (`app/[locale]/layout.tsx:13`, M8.11); `app-chrome/Logo.tsx:4` (deleted on the M8b branch).
11. Open risks that §15 lists for the whole round and nobody has closed: 768–1279 px checked at 768 and 1024 (`design:914`); real phone views
    (every as-built "Chưa kiểm"); `GET /v1/groups` 100 ms under its limit, "đo lại trên máy chủ thật trước launch" (delivery `:224`), which is
    **not** in `deploy-checklist.md`.

## 5. CI and deploy workflows

- `ci.yml`: `on: pull_request` with no branch or path filter (`:5-6`); concurrency per ref (`:8-10`). Jobs: `api` (`:13-68`: db setup, schema
  drift, lint, typecheck, build, unit), `web` (`:70-112`: lint, typecheck, unit, e2e which builds with `cf:build`, render mode), `admin`
  (`:114-163`: lint, typecheck, unit, production build, e2e build, mocked e2e), `admin-e2e-real` (`:165-262`: real API, worker, Postgres, Redis,
  Mailpit). **A PR into `dev` runs exactly these four jobs, same as a PR into the long branch.**
- Not in CI: `smoke:giao-dien-moi`, `pnpm shots`, `test:scale`, Lighthouse, Schema validator, bundle compare, frame rate.
- `deploy-web.yml` runs only on push to `main` or by hand (`:8-11`); nothing deploys on `dev`.
- Branch protection: `dev` protected, no required checks; long branch not protected (`gh api repos/quangtienngo661/english-flashcard/branches/…`).

## 6. Final PR readiness

- `git log --oneline origin/refactor/giao-dien-moi..origin/dev`: **empty**. Merge base = `origin/dev` = `3852f6cc` (PR #249, 10/11 16:06).
- `git diff --stat origin/dev...origin/refactor/giao-dien-moi | tail -1`: `542 files changed, 59697 insertions(+), 7770 deletions(-)`; 231 commits.
- Last merge of `dev` into the long branch: `6bfe9c87` "chore: merge dev into refactor/giao-dien-moi for the practice ai count" (10/11 16:33),
  landed by PR #255 (`309f1b07`, 10/11 18:44). No other merge has `dev` as second parent since the tag. Last PR merged into `dev`: #249
  (10/11 09:06 UTC, `gh pr list --state merged --base dev`).
- `origin/main` has one commit not in `dev` (`4683aac9`, the merge commit of PR #45); not a content difference.
- Open PRs: none at all (`gh pr list --base refactor/giao-dien-moi --state open` → `[]`; same for `--base dev` and any base).

## 7. Work in flight and file collisions with M9

### 7.1 M8b branch now (`feat/giao-dien-moi-m8b` @ `41ee86eb`, 11/11 18:25, not pushed)

`git diff --stat origin/refactor/giao-dien-moi...feat/giao-dien-moi-m8b` (merge base `4bb42658`): 29 files, +617/−63: `next.config.ts`,
`playwright.config.ts`, `scripts/cf-docker.mjs`, `scripts/read-landing-data.{mjs,d.mts,test.ts}`, `app-chrome/{CardFrame,PhoneHeader,TopBar}.tsx`,
`app-chrome/Logo.tsx` (deleted), `components/landing/LandingHeader.tsx`, `components/layout/SiteFooter.tsx`, `plans/{PlansPage.tsx,use-buy-order.ts}`,
`lib/period-offer{,.test}.ts` (moved), `site/landing/landing-data{,.fallback,.test}.ts`, `site/layout/ThemeToggle.tsx` and its test (moved),
`styles/web-tokens.test.ts`, `ui/{ButtonLink,Logo}.tsx`, `ui/actions.test.tsx`, `giao-dien-cu-map.md`, `giao-dien-moi-rulings.md` (R186–R193),
`packages/design-tokens/{web,web-dark}.css`. Uncommitted changes in that worktree: UNVERIFIED (not inspected, to leave it untouched).
Ruling numbers: M8a used R174–R180 (origin tip), M8b starts at R186, so R181–R185 are unused.

### 7.2 Files still listed for M8b/M8c (plan Part 8)

- M8.4 (`:3426-3429`): `S/layout/{SiteHeader,SiteFooter,SkipLink,Container}.tsx`, `PUB/(pages)/layout.tsx`, moves of public routes, `PUB/layout.tsx`.
- M8.5 (`:3455-3461`): `S/landing/*`, `PUB/(pages)/page.tsx`, `messages/{vi,en}.json`, `src/i18n/messages.test.ts`, deletes `components/landing/**`,
  `components/interactive/Reveal.tsx`, `App.*` keys only the old landing read.
- M8.6 (`:3501-3505`): `S/interactive/*`, **`src/app/globals.css`** (new `/* site motion */` keyframes).
- M8.7 (`:3548-3554`): `S/legal/*`, `S/sources/*`, `PUB/(pages)/{privacy,terms,sources}/page.tsx`, `PUB/not-found.tsx`, `messages/*`.
- M8.8 (`:3601-3609`): `lib/metadata.ts`, `(auth)` layouts, `app/sitemap.ts`, `app/manifest.ts`, **`app/[locale]/layout.tsx`** (`themeColor`),
  `S/seo/JsonLd.tsx`, `lib/landing-locale.test.ts`, `e2e/seo.spec.ts`.
- M8.9 (`:3640-3646`): delete `src/components/**`, maybe `src/i18n/navigation.ts`; `e2e/landing.spec.ts`, new `e2e/auth-layout.spec.ts`,
  `e2e/{privacy,chrome,a11y,csp,locale}.spec.ts`, **`e2e-shots/shots.spec.ts`** (`gm-m8`), `README.md:73`.
- M8.10–M8.11 (`:3678-3696`): Figma frames (owner gate); `app/icon.svg`, `app/apple-icon.tsx`, `app/[locale]/opengraph-image.tsx`,
  `scripts/gen-og-fonts.mjs`, `og-fonts.{generated,test}.ts`, `assets/fonts/*`, new per-page `opengraph-image.tsx`, `S/seo/og-image.tsx`.

### 7.3 Shared with M9's dark work (and with the polish round)

| File | M8b / M8c | Polish round | M9 dark |
|---|---|---|---|
| `packages/design-tokens/web.css`, `web-dark.css` | M8.3 (done on branch: public tokens, 4 dark values R189) | README (item 9) | stage, group, practice, shadow dark values |
| `packages/design-tokens/{dark,island,dark-pastel}.css`, `package.json` exports | — | drop imports (item 5) | delete files (design `:344`) |
| `apps/web/src/app/globals.css` | M8.6 keyframes | move `body`, focus ring, 9 animations, `color-scheme` off old vars (item 5) | grain `:439-443`, `.lk-paper` dark overrides `:834-837` (R71, R80), `color-scheme: dark` (only in `dark.css`) |
| `src/ui/*` | `ButtonLink`, `Logo` (M8.3) | new States, toast, `Dialog` alias (items 1, 9) | `DotGridBackground` rename |
| `src/styles/{tokens,text-classes,web-tokens}.test.ts` | `web-tokens` (M8.3) | items 7 | dark parity and contrast pins |
| `messages/{vi,en}.json` | M8.4, M8.5, M8.7 | keys of deleted pieces | unused-key script |
| `e2e/a11y.spec.ts`, `e2e-shots/shots.spec.ts` | M8.9 | — | dark axe, `gm-m9` |
| `docs/deliveries/giao-dien-moi{,-rulings}.md` | as-built, R186+ | own entries | ruling numbers |

## 8. `deploy-checklist.md` items that belong to the new UI

- Section "Giao diện mới M8: trang công khai" (`docs/deliveries/deploy-checklist.md:191-203`): `LANDING_DATA_REQUIRED=1` and the API URL in
  `deploy-web.yml`; redeploy web after price or FAQ changes; owner strips the duplicated head of the legal texts in admin (QM8-4); owner checks
  drafted copy (QM8-6); Worker size after the OG font change (M8.11).
- Worker size and startup of `apps/web` with the app on (`:164-173`): last numbers are from the old learner UI (M5b of 26/10, gzip 3.761,49 KiB);
  nothing measured for the new UI, three fonts or OG fonts.
- CSP and app-on build items that the new UI does not change but still gate launch: `:174-188`, `:295-300`.
- "Landing mới" (`:205-219`): written for the 03/11 landing that M8 replaces; M8.9 Step 4 is to mark what M8 did and note in
  `docs/deliveries/landing-redesign.md` that M8 replaced it (plan `:3672-3675`).
- Not in the checklist although recorded elsewhere: re-measure `GET /v1/groups` at 100 groups × 2.000 words on real hardware (delivery `:224`).

## 9. Unverified and open

- Owner approval of the 5 dark mockups (§0.2).
- Whether the owner's polish round has started in another clone (no branch found here).
- Uncommitted state of the M8b worktree.
- The JS size cost of the static `CustomizeDialog` and `HouseAd` imports, and of three fonts (no measurement exists).
- Whether `pnpm shots` with the real stack can run while the main checkout's bootstrap holds :3001 (recorded blocker, not re-checked).
- Safari iOS profiling needs macOS (ASSUMPTION).
