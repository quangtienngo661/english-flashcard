# Giao diện mới — Implementation Plan, part 1 (setup, API, M1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation of the new web UI: archive the old UI and open the long branch, ship every API the design adds (§10), and build milestone M1 (tokens, fonts, `src/ui/`, the app chrome moved into route-group layouts) so M2–M9 rebuild screens on it.

**Architecture:** API: Learning owns the calendar and streak endpoints and reads Practice counts through a string-token port that Practice provides from its `@Global()` ports module; `GET /v1/groups` gains two fields from two extra queries and one Content batch; Practice adds `GET /v1/practice/sessions/last`; Settings adds a public prices endpoint. Web: new `wm-` token files beside the old ones, three `next/font` families, a `src/ui/` kit on react-aria-components, and the chrome moved out of 17 `<AppShell>` call sites into the layouts `(chrome)`, `(onboarding)`, `(focus)`.

**Tech Stack:** NestJS 12, Prisma 7.10.1, Zod 4.6.7 (API); Next 16.4.3 App Router, next-intl 4.14.9, Tailwind 4.3.3, react-aria-components 1.22.1, TanStack Query, OpenNext Cloudflare 1.20.13 (web); Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md`, with `docs/superpowers/decisions/2026-11-09-giao-dien-moi-decisions.md` and the code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-{api,web}.md` (cited below as "API facts §n", "web facts §n"). Every web task starts by reading design §3 (sources of UI and motion context, how to read a Figma frame) and the Figma frames it names, through the Figma MCP (`get_screenshot`, `get_design_context`, `get_variable_defs`).

**Plan parts:** this file is part 1. Each of M2–M9 gets its own part, written from the same design and approved by the owner just before that milestone starts, appended here as "Part 2" … "Part 9". The roadmap fixes their scope and order. QR4 (ads) was set aside by the owner on 10/11/2026 ("tạm thời gác lại, mình tính sau"): DB38 stays, Task Q4 is a placeholder.

## Global Constraints

- Git: long branch `refactor/giao-dien-moi`; work branches `feat/giao-dien-moi-api`, `feat/giao-dien-moi-m1` … cut from its tip; every PR targets `refactor/giao-dien-moi`, opened with the `ship-pr` skill with that base given explicitly; the hook asks the owner before each merge. Merge `origin/dev` into the long branch weekly and before the final PR. Never force push.
- Commits: Conventional Commits, scopes `api`, `web` (also for `packages/design-tokens`), `docs`; subject lower case, ≤ 72 characters; a defect fix is a red-test commit followed by the fix commit.
- New behaviour is test-first: write the test, run it, see it fail for the stated reason, then write the code.
- `packages/design-tokens/theme.css` is never edited. Whenever `packages/design-tokens` changes, run admin `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` in `apps/admin` too.
- Colours are declared only in `packages/design-tokens`. New tokens carry `wm-`. Radius, shadow and type sizes in `wm-` tokens are written in `rem` (px ÷ 16). Rebuilt screens use only `wm-` tokens.
- No Tailwind arbitrary value and no `style=` in `src/**/*.tsx` unless the line directly above holds `// raw-ok: <reason>` (`apps/web/scripts/check-tailwind-raw.mjs`).
- App route files end in `.app.tsx` (D21). `/app` stays client-rendered with React Query. No Server Actions. `NEXT_PUBLIC_LEARNER_APP` gating unchanged.
- Copy comes from the Figma frame into `messages/vi.json`; `en.json` gets the same key by meaning in the same commit; Vietnamese follows `~/.claude/rules/vietnamese-writing.md`; keys no screen uses are deleted in the same PR.
- Web tests query by role and visible text, never by class or test id.
- API module boundaries (D3): Learning SQL reads only Learning tables (plus Content's exported `visibleSenseCondition`); Practice data reaches Learning only through `PRACTICE_DAY_COUNTS`; errors are Problem Details; `page_size` defaults to 20, max 100; page tokens use `encodeBoundToken` / `decodeBoundToken` (`apps/api/src/common/pagination/page-token.util.ts`).
- No backend e2e (D38): SQL is exercised by `pnpm smoke:giao-dien-moi` on real API, worker and Postgres.
- Windows: web e2e runs with `pnpm cf:docker [playwright args]` from `apps/web`; run `docker info` before blaming code when a Docker-backed command fails.
- Subagents never run on the Fable model.

## Shared names

| Name | What | Defined in | Used in |
|---|---|---|---|
| `PRACTICE_DAY_COUNTS` (`'LEARNING_PRACTICE_DAY_COUNTS'`), `PracticeDayCounts`, `PracticeDayCount`, `PracticeDaySession` | port token and types | A1 | A2, A3, A4 |
| `ReviewRow`, `DayItem`, `DayCursor`, `CalendarMonthView`, `CalendarDayView` | calendar types | A1 (`DayView` in A4) | A3, A4 |
| `monthBounds`, `classify`, `resultOf`, `aggregateMonth`, `aggregateDay`, `pageAfter` | pure functions | A1 | A3, A4 |
| `CalendarService` | Learning service | A3 | A4 |
| `GroupSummary.next_lemma`, `GroupSummary.last_reviewed` | response fields | A6 | M3 (web) |
| `LastSessionView`, `LastSessionService` | Practice | A7 | M3 (web) |
| `public.prices.ip` | rate-limit rule | A8 | — |
| `--color-wm-*`, `--radius-wm-*`, `--shadow-wm-*`, `--text-wm-*`, `--blur-wm-*`, `--transition-duration-wm-*`, `--ease-wm-close` | tokens | M1.1 | every web task |
| `font-wm-sans`, `font-wm-display`, `font-wm-mono`, `dot-grid` | utilities | M1.2 | M1.6 on |
| `lib/speech/*` | moved helpers | M1.4 | M4, M5 |
| `Button`, `ButtonLink`, `TextButton`, `Kbd`, `Card`, `Tag`, `ProBadge`, `DotGridBackground`, `TextField`, `Checkbox`, `Select`, `Switch`, `Segmented`, `Dialog`, `Toast`, `Skeleton`, `SkeletonPage` | `src/ui/` | M1.6–M1.8 | M1.9 on |
| `TopBar`, `PhoneHeader`, `MobileTabBar`, `AvatarMenu`, `BackLink`, `PageColumns`, `AddFab`, `CardFrame`, `AppChrome` | `src/app-chrome/` | M1.9 | M1.10 on |
| `renderApp(ui, { chrome?: boolean, … })` | test helper | M1.10 | every screen test |
| `chromeShape(pathname)` | pure function | M1.11 | `RequireSession` |

## Review Focus

1. A learner at UTC+7 in the first hours of a month or day: "today" and the month come from the learner's zone, never the server clock's date. Pinned by the A5 test at `2026-10-31T17:30:00Z` → `2026-11-01`, and by A1's `monthBounds`, which uses only the `month` string.
2. A day dialog paged with a token from another date or another `kind`: 400, never rows of the wrong list. Pinned in A4.
3. A group whose first queued card's sense was hidden: `next_lemma` is the next visible card's lemma, not `null`. Pinned in A6; the smoke (A9) cross-checks `next_lemma` against `GET /v1/groups/:id/queue?mode=due`.
4. An old screen inside the new chrome on a phone: exactly one `main`, one header, one tab bar. Pinned in M1.10.
5. Pressing `N` in a practice session or on onboarding: no Thêm từ dialog (the provider lives only in `(chrome)`). Pinned in M1.10.

## Roadmap

| Part | Branch | Scope (design) | Components and APIs it brings |
|---|---|---|---|
| 1 | docs branch, then `refactor/giao-dien-moi` | Task 0 (§4) | archive tag, map of old files, rulings file |
| 1 | `feat/giao-dien-moi-api` | §10.2–§10.6, Tasks A1–A9 | every new endpoint, the index, `smoke:giao-dien-moi` |
| 1 | `feat/giao-dien-moi-m1` | §9 M1, Tasks M1.1–M1.13 | tokens, fonts, generic `ui/`, chrome, layouts, loading and error, dark mockups |
| 2 | `feat/giao-dien-moi-m2` | §9 M2 | `(auth)` → `(split)` + `(card)`; `OtpField`, `GoogleButton`; `TurnstileWidget` moves to `features/learner/auth/`; "Nhập lại mật khẩu" fields |
| 3 | `feat/giao-dien-moi-m3` | §9 M3 | stage tokens (§7.3), group colour (§7.4: `groupColorIndex`, tokens), `StageChip`, `StageBar`, `WordChip`, carousel and FLIP motion; web reads `next_lemma`, `last_reviewed`, `sessions/last`; route loading files for Hôm nay, Nhóm, Một nhóm |
| 4 | `feat/giao-dien-moi-m4` | §9 M4 | `SpeakButton`; TopBar search box replaces `SearchStrip`; add-word dialogs |
| 5 | `feat/giao-dien-moi-m5` | §9 M5 | `AnswerOption`, `ProgressBar`; Tùy chỉnh phiên with the `own_then_ai` tasks (`docs/deliveries/cloze-own-then-ai.md`); Học and Ôn screens |
| 6 | `feat/giao-dien-moi-m6` | §9 M6, §10.4 | `CalendarButton`, `?lich=` / `?ngay=` parser, Lịch and Ngày dialogs, history redirect, `/app/settings/reports` |
| 7 | `feat/giao-dien-moi-m7` | §9 M7 | `ChoiceCard`; settings, account, plans, orders, `HouseAd` |
| 8 | `feat/giao-dien-moi-m8a`, `-m8b`, `-m8c` (Part 8) | §9 M8, §10.6, §10.7, §11 | admin-managed FAQ; `site/`; prices and FAQ read at build; new icons and OG images; `components/` deleted. `app-ui/` and the old tokens move to the owner's polish round (QM8-9) |
| 9 | `feat/giao-dien-moi-m9` (Part 9: M9a then M9b, one PR) | §9 M9, §13 | `check-message-keys.mjs` and `compare-bundle-stats.mjs` (CI), `pnpm lighthouse`, shot set `gm-m9`, phone guide; Tùy chỉnh phiên and Giới thiệu Pro loaded on demand; `AppBackground`; dark values from the approved mockup; level colour tokens |
| 10 | `feat/giao-dien-moi-polish` (Part 10: PL-a, PL-b, PL-c) | §9 "Đợt polish", QM9-9 | `ui/levels.ts`, `LevelBar`, `LevelChip`, `Tabs`, `PageTitle`, `SectionTitle`, `TargetWord`, radius C, Noto Sans labels, session copy in English, multi-group picker, arc carousel; `app-ui/` and old tokens deleted; then the PR `refactor/giao-dien-moi` → `dev` |
| Q4 | — | QR4 | placeholder below |

---

## Task 0: Archive tag, long branch, records

**Files:**
- Create: `docs/deliveries/giao-dien-cu-map.md`, `docs/deliveries/giao-dien-moi-rulings.md`
- Existing: `docs/deliveries/giao-dien-moi.md` (plan summary, committed with this plan)

- [ ] **Step 1: Bring the docs branch up to date**

Run: `git fetch origin && git switch docs/giao-dien-moi-design && git merge origin/dev`
Expected: "Already up to date" or a merge with no conflict (the branch touches only `docs/`).

- [ ] **Step 2: Tag the old UI and push the tag**

Run: `git tag archive/giao-dien-cu-2026-11 origin/dev` then `git push origin refs/tags/archive/giao-dien-cu-2026-11`
Expected: `* [new tag] archive/giao-dien-cu-2026-11 -> archive/giao-dien-cu-2026-11`. The `refs/tags/` form is required: the hook reads a bare name as a branch.

- [ ] **Step 3: Write `giao-dien-cu-map.md`**

Header: the tag, its commit (`git rev-parse archive/giao-dien-cu-2026-11`), the two commands `git show archive/giao-dien-cu-2026-11:<path>` (view) and `git checkout archive/giao-dien-cu-2026-11 -- <path>` (restore). Table: one row per old screen of web facts §8.1, plus chrome (§9.1), `app-ui/*`, `components/*`, `packages/design-tokens/{theme,dark,island,dark-pastel}.css`, with every file path of that screen in backticks starting `apps/` or `packages/`.

- [ ] **Step 4: Check every path in the map exists in the tag**

Run: ``grep -oE '`(apps|packages)/[^`]+`' docs/deliveries/giao-dien-cu-map.md | tr -d '`' | while read -r p; do git cat-file -e "archive/giao-dien-cu-2026-11:$p" 2>/dev/null || echo "MISSING $p"; done``
Expected: no output. Control: add `` `apps/web/src/nope.tsx` `` to the map, run again, see `MISSING apps/web/src/nope.tsx`, remove it.

- [ ] **Step 5: Write `giao-dien-moi-rulings.md`**

Purpose line, the format `R<n> (dd/mm/yyyy, Task <id>): <chỗ lệch> → <chọn> → <vì sao>`, and an empty list.

- [ ] **Step 6: Commit, open the long branch, push**

```bash
git add docs/deliveries/giao-dien-cu-map.md docs/deliveries/giao-dien-moi-rulings.md
git commit -m "docs(web): map old ui files and open the new ui rulings"
git switch -c refactor/giao-dien-moi
git push -u origin refactor/giao-dien-moi
```
Report the branch, its upstream and `git log --oneline origin/dev..HEAD`. This push publishes the design docs; that is the flow the owner chose (GM3).

---

## API block (branch `feat/giao-dien-moi-api`)

Run: `git switch -c feat/giao-dien-moi-api refactor/giao-dien-moi`. Paths below are under `apps/api/`. Test command for one file: `pnpm vitest run <path>`.

### Task A1: Port types and pure calendar functions

**Files:**
- Create: `src/learning/practice-day-counts.port.ts`, `src/learning/calendar/calendar.ts`, `src/learning/calendar/calendar.spec.ts`
- Modify: `src/learning/index.ts` (re-export the port, like `PRIVATE_SENSES_CLEANUP` at `:6`)

**Interfaces:**
- Produces (port):
  ```ts
  export const PRACTICE_DAY_COUNTS = 'LEARNING_PRACTICE_DAY_COUNTS';
  export type PracticeDayCount = { date: string; sessions: number; questions: number; correct: number };
  export type PracticeDaySession = { sessionId: string; firstPosition: number; lastPosition: number; questions: number; correct: number };
  export interface PracticeDayCounts {
    countByLocalDate(userId: string, from: string, to: string): Promise<PracticeDayCount[]>;
    sessionsOfDay(userId: string, date: string): Promise<PracticeDaySession[]>;
  }
  ```
- Produces (`calendar.ts`):
  ```ts
  export type DayKind = 'learned' | 'reviewed';
  export type ReviewRow = { localDate: string; itemId: string; senseId: string; groupId: string | null; levelBefore: number | null; levelAfter: number | null; rating: 'Good' | 'Again' | null; at: Date };
  export type DayItem = { kind: DayKind; itemId: string; senseId: string; groupId: string | null; result: 'known' | 'again' | null; times: number; lastAt: Date };
  export type DayCursor = { at: string; id: string; k: DayKind };
  export type CalendarMonthView = { month: string; days: { date: string; learned: number; reviewed: number; practice_sessions: number }[]; totals: { study_days: number; learned: number; reviewed: number; practice_sessions: number } };
  export function monthBounds(month: string): { from: string; to: string };
  export function classify(row: Pick<ReviewRow, 'levelBefore' | 'levelAfter'>): DayKind;
  export function resultOf(rating: ReviewRow['rating']): 'known' | 'again' | null;
  export function aggregateMonth(month: string, rows: ReviewRow[], practice: PracticeDayCount[], studyDays: number): CalendarMonthView;
  export function aggregateDay(rows: ReviewRow[]): { counts: { learned: number; reviewed: number; reviewed_known: number; reviewed_again: number; learned_groups: number }; items: DayItem[] };
  export function pageAfter(items: DayItem[], kind: 'all' | DayKind, cursor: DayCursor | null, pageSize: number): { page: DayItem[]; next: DayCursor | null };
  ```
- Rules (design §10.2 table): rows are already `kind='review'`. `classify` is `learned` iff `levelBefore === 0 && levelAfter !== null && levelAfter >= 1`, else `reviewed`. A day's `learned` counts distinct `itemId`s classified learned; `reviewed` counts rows classified reviewed. `days` holds only dates where `learned + reviewed + practice_sessions > 0`, ascending. `totals.learned`, `totals.reviewed` and `totals.practice_sessions` are sums of the day values (a session across midnight counts on both days, as each day does); `totals.study_days` is the argument. `aggregateDay` returns one item per `(itemId, kind)`: `times` = row count; `result`, `groupId`, `lastAt` from the newest row (`at`). Items are sorted `lastAt` desc, then `itemId` asc, then `learned` before `reviewed`. `reviewed_known` / `reviewed_again` count reviewed rows by rating `Good` / `Again`. `learned_groups` counts distinct non-null `groupId` among learned rows. `pageAfter` filters by `kind` first, then returns the items strictly after `cursor` in the sort order (the cursor item itself may be gone), and `next` = cursor of the last returned item when more remain, else `null`.

- [ ] **Step 1: Write the failing tests** in `calendar.spec.ts`, each with exact expected values:
  - `monthBounds`: `'2026-11'` → `{ from: '2026-11-01', to: '2026-11-30' }`; `'2026-02'` → to `'2026-02-28'`; `'2028-02'` → to `'2028-02-29'`; `'2026-12'` → to `'2026-12-31'`.
  - `classify`: `(0,1)` → learned; `(0,0)` → reviewed; `(1,2)` → reviewed; `(3,0)` → reviewed; `(null,1)` → reviewed.
  - `resultOf`: `'Good'` → `'known'`, `'Again'` → `'again'`, `null` → `null`.
  - "learned then reviewed the same day": item A `0→1 Good` then `1→2 Good` on `2026-11-08` → day `{ date: '2026-11-08', learned: 1, reviewed: 1, practice_sessions: 0 }`.
  - "reviewed three times, last Again": `aggregateDay` → one item `{ kind: 'reviewed', times: 3, result: 'again' }`, counts `reviewed: 3, reviewed_known: 2, reviewed_again: 1`.
  - "first study answered Again" (`0→1 Again`) → `learned: 1, reviewed: 0`.
  - "relearned word learned twice in the month" (`0→1` on the 1st and on the 5th) → two days with `learned: 1`, `totals.learned: 2`.
  - "practice-only day": no rows, practice `[{ date: '2026-11-09', sessions: 1, questions: 6, correct: 4 }]` → that day listed with `practice_sessions: 1`.
  - "studied day without rows" (`studyDays` 1, no rows, no practice) → `days: []`, `totals: { study_days: 1, learned: 0, reviewed: 0, practice_sessions: 0 }`.
  - `learned_groups`: learned rows with groups `g1`, `g1`, `null` → `1`.
  - `pageAfter`: 25 items, size 20 → 20 items and `next` = the 20th item's cursor; with that cursor → 5 items, `next: null`; `kind: 'learned'` on a mixed list returns learned only; a cursor whose item is absent continues at the next item by sort order.
  - Invariant over 50 generated rows (fixed seed): per day, `reviewed_known + reviewed_again === reviewed` and the sum of `days[].reviewed` equals the number of rows classified reviewed.
- [ ] **Step 2: Run** `pnpm vitest run src/learning/calendar/calendar.spec.ts` → FAIL (module `./calendar.js` not found).
- [ ] **Step 3: Implement** the port file and `calendar.ts`; dates via `src/common/time/local-date.ts` helpers, no new date library.
- [ ] **Step 4: Run** the spec → PASS.
- [ ] **Step 5: Commit** `feat(api): add pure calendar aggregation and the practice day port`.

### Task A2: Practice provides the day counts

**Files:**
- Create: `src/practice/maintenance/practice-day-counts.provider.ts`, `src/practice/maintenance/practice-day-counts.provider.spec.ts`
- Modify: `src/practice/maintenance/private-senses-cleanup.provider.ts:57-63` (`PracticePortsModule`: add the provider, `{ provide: PRACTICE_DAY_COUNTS, useExisting: PracticeDayCountsProvider }`, export the token)

**Interfaces:**
- Consumes: the port (A1).
- Produces: `@Injectable() class PracticeDayCountsProvider implements PracticeDayCounts`, injecting `PRISMA_CLIENT` only.
- Both methods count `practice_session_items` rows with `result IN ('correct','wrong')` whose session has `kind = 'practice'` (the history filter, `practice/history/history.service.ts:103`) and `local_date` in range. `countByLocalDate` groups by `local_date` ascending: `sessions` = distinct `session_id`, `questions` = rows, `correct` = rows with `result = 'correct'`. `sessionsOfDay` groups by `session_id`, ordered by the earliest `answered_at` of that day: `firstPosition` / `lastPosition` = min / max `position`. Dates leave as `'YYYY-MM-DD'` strings, counts as numbers.

- [ ] **Step 1: Write the failing spec** with `$queryRaw` stubbed by SQL text (pattern of `src/learning/queue/queue-list.spec.ts:28-46`): the SQL contains `result IN ('correct', 'wrong')` and `kind = 'practice'`; the bound values are `[userId, '2026-11-01', '2026-11-30']`; rows `{ date: 2026-11-08 (Date), sessions: 1n, questions: 18n, correct: 12n }` map to `{ date: '2026-11-08', sessions: 1, questions: 18, correct: 12 }`; `sessionsOfDay` maps `{ session_id, first_position, last_position, questions, correct }` to the camel-case type with the same numbers.
- [ ] **Step 2: Run** the spec → FAIL (module not found).
- [ ] **Step 3: Implement** the provider and register it in `PracticePortsModule`.
- [ ] **Step 4: Run** the spec → PASS; `pnpm vitest run src/practice` → PASS.
- [ ] **Step 5: Commit** `feat(api): count graded practice answers per local day for learning`.

### Task A3: `GET /v1/me/calendar` and the index

**Files:**
- Modify: `prisma/models/learning.prisma:76-77` (add `@@index([userId, localDate])`)
- Create: `prisma/migrations/20261113100000_learning_log_user_local_date/migration.sql` with exactly `CREATE INDEX "learning_log_user_id_local_date_idx" ON "learning_log"("user_id", "local_date");` (if a newer folder exists when you run this, stamp after it)
- Create: `src/learning/calendar/calendar.schemas.ts`, `calendar.queries.ts`, `calendar.service.ts`, `calendar.controller.ts`, with `calendar.schemas.spec.ts`, `calendar.service.spec.ts`, `calendar.controller.spec.ts`
- Modify: `src/learning/learning.module.ts:31-39` (controller, service)

**Interfaces:**
- Consumes: A1 functions and types; `PRACTICE_DAY_COUNTS` (A2 provides it at runtime).
- Produces:
  - `calendarMonthQuery = z.strictObject({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine((m) => m >= '2026-01' && m <= '2100-12') })`.
  - `CalendarService(prisma: PRISMA_CLIENT, practice: PracticeDayCounts)`: the port injected with `@Inject(PRACTICE_DAY_COUNTS)` and **no** `@Optional()`. Method `month(userId: string, month: string): Promise<CalendarMonthView>` = `aggregateMonth(month, rows, practice.countByLocalDate(userId, from, to), studyDays)`.
  - `monthReviewRowsQuery(userId, from, to): Prisma.Sql`: the `ReviewRow` columns of `learning_log` with `kind = 'review'` and `local_date` between `from` and `to`. `studyDays` = `learningActivityDay.count({ where: { userId, studied: true, localDate: { gte, lte } } })`.
  - `@Controller('me/calendar') @LearnerContent()`, `@Get() month(@CurrentLearner() learner: Learner, @Query({ schema: calendarMonthQuery }) q)`.

- [ ] **Step 1: Write the failing specs:**
  - schema: `'2026-11'` and `'2100-12'` pass; `'2026-13'`, `'26-11'`, `''`, `'2025-12'`, `'2101-01'` and a missing `month` fail with an issue whose path is `['month']`.
  - service (Prisma faked as in `src/learning/reviews/reviews.service.spec.ts:14-42`): `month('u1', '2026-11')` calls the port with `('u1', '2026-11-01', '2026-11-30')`, binds the same bounds into the SQL, and returns the exact view for two fixture rows plus one practice day.
  - injection: `Reflect.getMetadata(OPTIONAL_DEPS_METADATA, CalendarService) ?? []` does not contain the port's parameter index (`OPTIONAL_DEPS_METADATA` from `@nestjs/common/constants`, value `'optional:paramtypes'`).
  - controller: the learner guard is applied (pattern of `src/settings/me-app-config.controller.spec.ts:19-23`).
- [ ] **Step 2: Run** the three specs → FAIL (modules not found).
- [ ] **Step 3: Implement** schema, query, service, controller, module wiring, model index and migration.
- [ ] **Step 4: Run** specs → PASS; then `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm build` → all pass.
- [ ] **Step 5: Check the migration on a fresh database** (the smoke database of Task A9, created the way earlier smoke rounds did): `pnpm db:setup` → applies the new migration; `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` → exit 0, empty script.
- [ ] **Step 6: Commit** `feat(api): add the monthly study calendar endpoint`.

### Task A4: `GET /v1/me/calendar/days/:date`

**Files:**
- Modify: `src/learning/calendar/calendar.schemas.ts`, `calendar.queries.ts`, `calendar.service.ts`, `calendar.controller.ts` and their specs

**Interfaces:**
- Consumes: A1, A3; `ContentService.cardContent(viewerId, senseIds, nativeLanguage)` (`src/content/content.service.ts:228-231`, visible senses only).
- Produces:
  - `calendarDayParam = z.strictObject({ date })`, with the regex and round-trip refine of `src/practice/history/history.controller.ts:11-13`; `calendarDayQuery = z.strictObject({ kind: z.enum(['all', 'learned', 'reviewed']).default('all'), page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional() })`.
  - `CalendarService.day(learner: Learner, date: string, q): Promise<CalendarDayView>`, with
    `CalendarDayView = { date: string; counts: { learned; reviewed; reviewed_known; reviewed_again; learned_groups; practice_questions }; items: { kind: DayKind; item_id: string; lemma: string | null; group_id: string | null; result: 'known' | 'again' | null; times: number }[]; practice_sessions: { session_id; first_position; last_position; questions; correct }[]; next_page_token: string | null }`.
  - `counts` come from every row of the day whatever `kind` is; `practice_questions` = sum of `questions` from `sessionsOfDay`. Token = `encodeBoundToken({ at, id, k }, `${date}|${kind}`)`. A token that does not decode is the same 400 `validation-failed` without `violations` as `history.service.ts:94-99`; copy that helper, because Learning cannot import Practice. Lemmas: one `cardContent` call per request, for the page's sense ids; a sense not returned gives `lemma: null`.
  - `@Get('days/:date') day(@CurrentLearner() learner, @Param({ schema: calendarDayParam }) p, @Query({ schema: calendarDayQuery }) q)`.

- [ ] **Step 1: Write the failing specs:** param `'2026-02-30'` fails with path `['date']`, `'2026-11-08'` passes; the same fixture day returns identical `counts` (exact numbers) for `kind=all` and `kind=reviewed`; a token minted for `kind=learned` sent with `kind=reviewed` → 400 `validation-failed`; a token minted for `2026-11-08` sent for `2026-11-09` → 400; `cardContent` is called once, with exactly the page's sense ids; a hidden sense gives `lemma: null`; port sessions `[{ questions: 10 }, { questions: 8 }]` give `practice_questions: 18` and snake_case `practice_sessions`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS, then `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): add the study calendar day endpoint`.

### Task A5: `GET /v1/me/streak`

**Files:**
- Create: `src/learning/activity/streak.controller.ts`, `streak.controller.spec.ts`
- Modify: `src/learning/learning.module.ts`

**Interfaces:**
- Produces: `@Controller('me/streak') @LearnerContent()`, `@Get() streak(@CurrentLearner() learner): Promise<{ days: number; studied_today: boolean }>`. Today = `localDate(profile.timezone, clock.now())` with `IdentityService.getProfile` and the global `Clock` (as `queue.service.ts:118-122`), then `LearningService.streakAsOf(userId, today)` mapped to snake_case.

- [ ] **Step 1: Write the failing spec:** `FakeClock` at `2026-10-31T17:30:00Z`, profile timezone `Asia/Ho_Chi_Minh` → `streakAsOf` called with `'2026-11-01'`; its `{ days: 3, studiedToday: false }` returns `{ days: 3, studied_today: false }`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): add the learner streak endpoint`.

### Task A6: `next_lemma` and `last_reviewed` on `GET /v1/groups`

**Files:**
- Modify: `src/learning/queue/queue.queries.ts` (add `nextCardsQuery`, `lastReviewedQuery`; `groupStatsQuery` untouched), `src/learning/queue/queue.service.ts:16-21,48-61`, `src/learning/groups/groups.controller.ts:19-22`, `src/learning/queue/queue-list.spec.ts`

**Interfaces:**
- Produces:
  - `GroupSummary` gains `next_lemma: string | null` and `last_reviewed: { lemma: string | null; at: string } | null`.
  - `QueueService.list(learner: Learner)` (was `userId: string`; the controller is the only caller, check with `grep -rn "queue.list\|\.list(learner" src/learning`).
  - `nextCardsQuery(userId, today, caps, backlogDays): Prisma.Sql` → rows `{ group_id, sense_id, rank }`, `rank` 1–5: the first five cards of each group in the order `QueueService.queue` returns for `mode='due'`. That order is priority by `added_at, id`, then due by `due_date, level, added_at, id` within the reviews left today, then new by `added_at, id` within the new left today (`queue.queries.ts:70-90`). It is built in one statement from the CTEs of `todayIdsQuery` (`src/learning/practice/practice-reads.queries.ts:29-67`), adding the order and the group id.
  - `lastReviewedQuery(userId): Prisma.Sql` → `{ group_id, sense_id, at }` via `SELECT DISTINCT ON (group_id) … WHERE kind = 'review' AND group_id IS NOT NULL ORDER BY group_id, at DESC`.
  - `list()` runs the stats query, both new queries, then **one** `content.cardContent(userId, uniqueSenseIds, nativeLanguage)`. `next_lemma` is the lemma of the lowest-rank row whose sense came back, else `null`. `last_reviewed.lemma` is `null` when its sense did not come back.

- [ ] **Step 1: Write the failing specs** in `queue-list.spec.ts`: group g1 ranks `[s1 hidden, s2 'mitigate']` → `next_lemma: 'mitigate'`; g2 with no rows → `null`; g3 with five hidden senses → `null`; g1 last review `(s3 'allocate', 2026-11-08T03:00:00Z)` → `{ lemma: 'allocate', at: '2026-11-08T03:00:00.000Z' }`; a hidden last-review sense → `{ lemma: null, at: … }`; a group never reviewed → `last_reviewed: null`; `cardContent` called exactly once, with the union of sense ids.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS, then `pnpm test`.
- [ ] **Step 5: Scale check** (Docker): `pnpm test:scale` → the 100 groups × 2,000 items case stays under 500 ms. Copy the timing line into the delivery record.
- [ ] **Step 6: Commit** `feat(api): add next card and last review to the group list`.

### Task A7: `GET /v1/practice/sessions/last`

**Files:**
- Create: `src/practice/sessions/last-session.service.ts`, `last-session.service.spec.ts`
- Modify: `src/practice/sessions/sessions.controller.ts` (add the route), `src/practice/practice.module.ts:52-57` (provider)

**Interfaces:**
- Produces: `LastSessionView = { id: string; group_id: string | null; local_date: string; last_answer_at: string; finished: boolean; questions: number; correct: number; wrong_count: number; wrong_lemmas: string[] }`; `LastSessionService.last(userId): Promise<LastSessionView | null>`; `@Get('last') last(@CurrentLearner() learner, @Res({ passthrough: true }) res: Response)` sets status 204 and returns nothing when `null`.
- Definitions (design §10.5): the session is the one with the newest graded item (`result IN ('correct','wrong')`, session `kind='practice'`, order `answered_at DESC, id DESC`). `local_date` and `last_answer_at` come from that item. `finished = status === 'finished'`. `questions` = correct + wrong items of the session and `correct` = correct items, counted by one grouped query as `summary` counts them (`practice-reviews.service.ts:84-85`). Do not call `summary`: it goes through `reviewableSession` locking. Record this as a ruling. `wrong_count` = wrong items. `wrong_lemmas` = up to 4 distinct lemmas of wrong items in answer order, read from `practice_questions.answer_key->'reveal'->>'lemma'` as `history.service.ts:135-141` does.

- [ ] **Step 1: Write the failing spec:** no graded item → service `null` and controller sets 204; a session with 2 correct, 3 wrong whose wrong lemmas in order are `a, b, a` → `wrong_count: 3, wrong_lemmas: ['a', 'b'], questions: 5, correct: 2`; five distinct wrong lemmas → the first four; status `abandoned` → `finished: false`; `group_id: null` for a session without a group.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(api): add the last practice session endpoint`.

### Task A8: `GET /v1/public/prices`

**Files:**
- Create: `src/settings/public-prices.controller.ts`, `public-prices.controller.spec.ts`
- Modify: `src/settings/settings.module.ts:9-15`, `src/common/config/app-config.ts:24,184` (rule name in the union; `'public.prices.ip': { by: 'ip', max: 60, windowSeconds: 60 }`), and any spec that pins the rule list

**Interfaces:**
- Produces: `@Controller('public/prices')`, `@Get() @Public() @RateLimit('public.prices.ip') prices(): Promise<{ currency: 'VND'; prices: { '1': number; '3': number; '12': number } }>` from `settings.get()` keys `proPrice1mVnd`, `proPrice3mVnd`, `proPrice12mVnd`. Copy the `@Public()` import and pattern from `src/legal/public-legal.controller.ts`.

- [ ] **Step 1: Write the failing spec:** with `SETTINGS_DEFAULTS` → exactly `{ currency: 'VND', prices: { '1': 79000, '3': 199000, '12': 599000 } }`; `identity.public` metadata is `true`; the rate-limit metadata (as stored by `src/common/rate-limit/rate-limit.decorator.ts:7`) lists `'public.prices.ip'`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS, then `pnpm test`.
- [ ] **Step 5: Commit** `feat(api): add public pro prices for the landing page`.

### Task A9: Smoke, checks, PR

**Files:**
- Create: `scripts/smoke-giao-dien-moi.mjs`, `docs/deliveries/giao-dien-moi-smoke-output.txt` (repo root path)
- Modify: `package.json` (`"smoke:giao-dien-moi": "node scripts/smoke-giao-dien-moi.mjs"`)

Helpers are copied from `scripts/smoke-dot-cai-thien-c.mjs` (`step/ok/check`, `api`, `want`, `wantProblem`, `registerLearner`, `psql`, `today`, the env refusal). Database constant `english_learning_smoke_gm`, `JOB_QUEUE_PREFIX=wordmet-gm-smoke`, timezone `Asia/Ho_Chi_Minh`, one registration. Words are added to the group the way the round C smoke adds them.

- [ ] **Step 1: Write the smoke** with these exact checks, in order:
  1. `GET /v1/public/prices` without a token → 200, body exactly `{ currency: 'VND', prices: { '1': 79000, '3': 199000, '12': 599000 } }`.
  2. Learner creates group "GM smoke" with 3 catalog words. `GET /v1/groups`: `next_lemma` equals the lemma of the first card of `GET /v1/groups/:id/queue?mode=due`, `last_reviewed` is `null`. `GET /v1/practice/sessions/last` → 204. `GET /v1/me/streak` → `{ days: 0, studied_today: false }`.
  3. Learn 2 words (`POST /v1/reviews`, `known`), then flip the first one again from `?mode=all` (`known`).
  4. Practice one session over the group, answer 2 items (one right, one wrong), finish it.
  5. `GET /v1/me/calendar?month=<this month>` → today's row `{ learned: 2, reviewed: 1, practice_sessions: 1 }`, `totals.study_days: 1`.
  6. `GET /v1/me/calendar/days/<today>` → `counts` `{ learned: 2, reviewed: 1, reviewed_known: 1, reviewed_again: 0, learned_groups: 1, practice_questions: 2 }`, 3 items with non-null lemmas. `?kind=reviewed` → 1 item, same `counts`. `?page_size=1` → a `next_page_token`; that token with `kind=learned` → 400 `validation-failed`.
  7. `sessions/last` → `questions: 2, correct: 1, wrong_count: 1, finished: true`, `wrong_lemmas` = `[<the wrong word>]`.
  8. `GET /v1/groups` → `last_reviewed.lemma` = the re-flipped word; `next_lemma` again equals the first card of `queue?mode=due`.
  9. Streak `{ days: 1, studied_today: true }`; insert yesterday into `learning_activity_days` (`studied = true`) with `psql` → `{ days: 2, studied_today: true }`.
  10. `GET /v1/me/calendar?month=2026-13` → 400, `violations` contains a string starting `month`.
- [ ] **Step 2: Run** against a real API and worker on the fresh database (`AI_FAKE_ENABLED=true`, `TURNSTILE_MODE=fake`, the prefix above): `pnpm smoke:giao-dien-moi` → every step `ok`. Save the output to `docs/deliveries/giao-dien-moi-smoke-output.txt`. Run `pnpm smoke:dot-cai-thien-c` on its own fresh database to show the groups change broke nothing; append its last lines.
- [ ] **Step 3: Full API checks:** `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm test`, `pnpm build` → pass; record the unit test count.
- [ ] **Step 4: Commit** `test(api): add the giao dien moi smoke` and a docs commit for the output and the delivery record's API as-built section.
- [ ] **Step 5: PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(api): add calendar, streak, last session, group hints and prices`. Merge after green CI and the owner's yes at the hook prompt.

---

## M1 — Nền (branch `feat/giao-dien-moi-m1`)

Run: `git switch -c feat/giao-dien-moi-m1 refactor/giao-dien-moi`. Paths are under `apps/web/` unless they start with `packages/`. Test command for one file: `pnpm vitest run <path>`.

### Task M1.1: `wm-` token files

**Files:**
- Create: `packages/design-tokens/web.css`, `packages/design-tokens/web-dark.css`, `apps/web/src/styles/web-tokens.test.ts`
- Modify: `packages/design-tokens/package.json:5-10` (exports `./web.css`, `./web-dark.css`), `packages/design-tokens/README.md` (section for the `wm-` set; fix the two stale lines of web facts S9)

**Interfaces:**
- Produces, `web.css`: one `@theme { }` block.
  - Colours, light values of design §7.2: `--color-wm-{bg, surface, ink, muted, ghost, line, accent, accent-soft, on-accent, mark, mark-ink, pass, pass-soft, fail, fail-soft}`.
  - Radius: `--radius-wm-sm 0.375rem`, `-md 0.625rem`, `-lg 0.875rem`, `-xl 1.25rem`, `-2xl 1.75rem`, `-pill 62.4375rem`, `-button 0.625rem`, `-modal 1rem`.
  - Shadows (§7.2, Figma styles read 10/11/2026), lengths in rem, colours `rgb(27 36 68 / a)`: `--shadow-wm-card`, `-row`, `-pop`, `-soft`, `-lift` (`0 50px 110px -40px` at 0.38 and `0 12px 32px -16px` at 0.18), `-btn` (navy), `-btn-pass`, `-btn-fail`.
  - Text, from the Figma text styles (read 10/11/2026), as `--text-wm-<name>` with `--line-height`, `--letter-spacing`, `--font-weight` sub-tokens:

    | Name | Size | Line height | Letter spacing | Weight |
    |---|---|---|---|---|
    | `hero` | 5rem | 1.2 | -0.0313em | 700 |
    | `section` | 3.25rem | 1.24 | -0.0385em | 700 |
    | `lemma` | 2.25rem | 1.3 | -0.0278em | 700 |
    | `card-title` | 1.5rem | 1.3 | -0.0417em | 700 |
    | `logo` | 1.375rem | 1.2 | -0.0455em | 800 |
    | `word` | 1.1875rem | 1.3 | 0 | 700 |
    | `lead` | 1.1875rem | 1.6 | 0 | 400 |
    | `base`, `base-strong` | 1rem | 1.6 | 0 | 400, 600 |
    | `button` | 0.9375rem | 1.4 | 0 | 600 |
    | `small`, `small-strong` | 0.875rem | 1.5 | 0 | 400, 600 |
    | `label`, `caption` | 0.8125rem | 1.4 | 0 | 600, 400 |
    | `mono` | 0.75rem | 1.4 | 0 | 400 |

    The first six are Bricolage styles (the component adds `font-wm-display`); `mono` is the JetBrains Mono label (§3.3). Sizes a screen needs that no Figma style has (page titles at 800, GM18) are added as `--text-wm-*` in the milestone that first needs them, with a ruling.
  - Motion (§8.1): `--blur-wm-sm 6px`, `--blur-wm-md 12px`, `--blur-wm-lg 18px`, `--blur-wm-glass 24px` (Figma `Glass/Header`); `--transition-duration-wm-out 160ms`, `--transition-duration-wm-in 320ms`, `--transition-duration-wm-close 150ms`; `--ease-wm-close` = the accelerating close curve of `motion-va-chuyen-canh.md` §5.
- Produces, `web-dark.css`: `[data-theme='dark'] { … }` with the dark colour values of §7.2 for the same `--color-wm-*` keys. Dark shadows wait for the dark mockups (GM4, M9).

- [ ] **Step 1: Write the failing test** `web-tokens.test.ts` (`// @vitest-environment node`; read both files with `createRequire(import.meta.url).resolve('@wordmet/design-tokens/web.css')`):
  - `web-dark.css` has exactly the `--color-wm-*` keys of `web.css`.
  - Text contrast ≥ 4.5 in light and in dark for `ink/bg`, `ink/surface`, `muted/bg`, `muted/surface`, `on-accent/accent`, `accent/surface`, `pass/pass-soft`, `fail/fail-soft`, `mark-ink/mark`.
  - No `\dpx` in any `--radius-wm-*`, `--shadow-wm-*`, `--text-wm-*` value.
  - Exact pins: `--color-wm-accent` is `#1e3a8a` light and `#8da2ff` dark; `--radius-wm-button` is `0.625rem`; `--text-wm-base` is `1rem`.
- [ ] **Step 2: Run** `pnpm vitest run src/styles/web-tokens.test.ts` → FAIL (`ERR_PACKAGE_PATH_NOT_EXPORTED` or file not found).
- [ ] **Step 3: Write** both files, the exports and the README section.
- [ ] **Step 4: Run** the test → PASS; `pnpm vitest run src/styles` → PASS (old token tests unchanged); admin `pnpm test` → PASS.
- [ ] **Step 5: Commit** `feat(web): add the wm design tokens for the new ui`.

### Task M1.2: Wire tokens, font tokens and utilities into globals

**Files:**
- Modify: `src/app/globals.css` (import `@wordmet/design-tokens/web.css` and `web-dark.css` after `:6`; `@theme inline` block; `@utility dot-grid`; `@media (width < 48rem) { :root { --blur-wm-lg: 12px } }`; base `body` font at `:402-409` → `var(--font-wm-sans)`), `src/styles/text-classes.test.ts:9-19` (also read `web.css` colour and text names), `src/lib/cn.ts:5-13` (add every `wm-` size to the `font-size` group)
- Create: `src/lib/cn.test.ts`

**Interfaces:**
- Produces: `@theme inline { --font-wm-sans: var(--font-noto-sans), ui-sans-serif, system-ui, sans-serif; --font-wm-display: var(--font-bricolage), var(--font-noto-sans), sans-serif; --font-wm-mono: var(--font-jetbrains-mono), ui-monospace, monospace; }`. `@utility dot-grid`: 20px dot grid fading towards the edges, a navy glow top-left and a yellow glow bottom-right (design §3.3 "Nền"; look from Figma `95:315`, `95:321`), colours only through `var(--color-wm-*)` and `color-mix`.

- [ ] **Step 1: Write the failing test** `cn.test.ts`: `cn('text-wm-base text-wm-ink')` → `'text-wm-base text-wm-ink'`; `cn('text-wm-base text-wm-small')` → `'text-wm-small'`; `cn('shadow-wm-card shadow-wm-pop')` → `'shadow-wm-pop'`.
- [ ] **Step 2: Run** → FAIL on the first case (the size is dropped).
- [ ] **Step 3: Implement** `cn.ts`, `globals.css`, `text-classes.test.ts`.
- [ ] **Step 4: Run** `pnpm test` → PASS (UBC1 still holds: `globals.css` declares no `--color-*`); `pnpm lint` → PASS.
- [ ] **Step 5: Commit** `feat(web): wire the wm tokens, font tokens and dot grid into globals`.

### Task M1.3: Fonts in the root layout

**Files:**
- Modify: `src/app/[locale]/layout.tsx:5,12-16,41-42`, `e2e/chrome.spec.ts:4-15`

**Interfaces:**
- Produces: `Noto_Sans({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-noto-sans' })`, `Bricolage_Grotesque({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-bricolage' })` (no `axes`), `JetBrains_Mono({ subsets: ['latin', 'vietnamese'], display: 'swap', variable: '--font-jetbrains-mono', preload: false })`; `<html className>` joins the three variables; `<body className="min-h-dvh font-wm-sans">`. Lexend stays only in the OG image until M8. Old screens inherit Noto Sans from `body`.

- [ ] **Step 1: Change the e2e test first:** rename it "H1 renders in Noto Sans with Vietnamese glyphs", expect the first family to match `/Noto Sans/`, and `document.fonts.check('800 16px "Noto Sans"', 'Tiếng Việt')` true.
- [ ] **Step 2: Run** `pnpm cf:docker e2e/chrome.spec.ts` → FAIL (Lexend).
- [ ] **Step 3: Implement** the layout change.
- [ ] **Step 4: Run** the same command → PASS; `pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): load noto sans, bricolage and jetbrains mono with next/font`.

### Task M1.4: Move speech helpers to `lib/speech/`

**Files:**
- Move with `git mv`: `src/app-ui/speech.ts`, `audio-player.ts`, `speech-test-support.ts`, `speech.test.ts` → `src/lib/speech/`; `src/features/learner/word/pronunciation.ts`, `pronunciation.test.ts` → `src/lib/speech/`
- Modify: every importer listed in web facts §11.1, plus `src/app-ui/SpeakButtons.tsx:7-8`

- [ ] **Step 1:** Record `pnpm test` totals before the move.
- [ ] **Step 2:** Move the files and update the imports (`@/lib/speech/<file>`).
- [ ] **Step 3:** `pnpm test` → the same totals, all passing; `pnpm typecheck`, `pnpm lint` → PASS; `grep -rn "app-ui/speech\|app-ui/audio-player\|word/pronunciation" src` → no output.
- [ ] **Step 4: Commit** `refactor(web): move speech and pronunciation helpers to lib/speech`.

### Task M1.5: Folder import rules

**Files:**
- Modify: `eslint.config.mjs` (append four disjoint objects after `...nextTs`)
- Create: `scripts/import-rules.test.ts`

**Interfaces:**
- Produces: `no-restricted-imports` with `patterns`, per design §6:
  - `src/ui/**/*.{ts,tsx}` (ignores `src/ui/**/*.test.{ts,tsx}`) bans `@/features/*`, `@/app-shell/*`, `@/app-chrome/*`, `@/site/*`.
  - `src/site/**` bans `@/features/*`, `@/app-chrome/*`.
  - `src/app-chrome/**` bans `@/site/*`.
  - `src/features/learner/**` bans `@/site/*`.
  - Each rule carries a message naming design §6.

- [ ] **Step 1: Write the failing test** with `new ESLint({ cwd: <apps/web> }).lintText(code, { filePath })` on virtual paths (nothing written to disk), timeout 30 000 ms:
  - `src/ui/Probe.tsx` importing `@/features/learner/x` → one message, `ruleId` `no-restricted-imports`; the same for `@/app-shell/config`.
  - `src/ui/Probe.test.tsx` importing `@/app-shell/session/x` → no message.
  - `src/site/Probe.tsx` → `@/features/x` flagged, `@/app-shell/theme/ThemeProvider` not.
  - `src/app-chrome/Probe.tsx` → `@/site/x` flagged, `@/features/learner/add-word/add-word-context` not.
  - `src/features/learner/Probe.tsx` → `@/site/x` flagged.
- [ ] **Step 2: Run** `pnpm vitest run scripts/import-rules.test.ts` → FAIL (no messages).
- [ ] **Step 3: Implement** the config.
- [ ] **Step 4: Run** → PASS; `pnpm lint` on the real tree → PASS.
- [ ] **Step 5: Commit** `build(web): enforce folder import rules for ui, site, chrome and features`.

### Task M1.6: `ui/` actions and surfaces

**Files:**
- Create: `src/ui/Button.tsx`, `ButtonLink.tsx`, `TextButton.tsx`, `Kbd.tsx`, `Card.tsx`, `Tag.tsx`, `ProBadge.tsx`, `DotGridBackground.tsx`, `src/ui/actions.test.tsx`

**Interfaces:**
- Produces:
  - `Button(props: AriaButtonProps & { variant?: 'primary' | 'secondary' | 'pass' | 'danger'; size?: 'md' | 'lg'; isPending?: boolean; className?: string })`. RAC `Button`, `rounded-wm-button`, `text-wm-button`. Shadows by variant: `shadow-wm-btn`, `shadow-wm-soft`, `shadow-wm-btn-pass`, `shadow-wm-btn-fail`; none when disabled. Hover `brightness(1.12)` over 200ms; pressed `scale(.97)` over 150ms (GM14). Minimum height 2.75rem. Figma `3:12`.
  - `ButtonLink`: Next `Link` with the same variants and sizes.
  - `TextButton(props: AriaButtonProps & { tone?: 'add' | 'normal' | 'muted' | 'delete' })`: no fill, no underline (`166:326`).
  - `Kbd({ children })` → `<kbd>` (`3:17`).
  - `Card({ as?: 'div' | 'section' | 'article' | 'li'; className?; children })` with surface, `shadow-wm-card` and the card radius of Figma Hôm nay `117:4425`.
  - `Tag({ tone?: 'neutral' | 'accent' | 'pass' | 'fail'; mono?: boolean; children })` with `rounded-wm-sm`.
  - `ProBadge()`, restyled from `app-ui/Locked.tsx:8`.
  - `DotGridBackground()` → `<div aria-hidden>` with `dot-grid`, fixed behind content.

- [ ] **Step 1: Write the failing test** `actions.test.tsx` (`// @vitest-environment jsdom`):
  - `Button` is a `button` named by its text and calls `onPress`.
  - With `isPending` it does not call `onPress`.
  - With `isDisabled` it is disabled.
  - `ButtonLink` is a `link` with its `href`.
  - `TextButton` is a `button`.
  - `Kbd` renders `N`.
  - `Tag` renders its text.
  - `DotGridBackground` is hidden from the accessibility tree (`container.firstChild` has `aria-hidden="true"`).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**, reading each Figma component first. **Step 4: Run** → PASS; `pnpm lint` → PASS (no raw values).
- [ ] **Step 5: Commit** `feat(web): add buttons, key cap, card, tag and dot grid to ui`.

### Task M1.7: `ui/` fields

**Files:**
- Create: `src/ui/TextField.tsx`, `Checkbox.tsx`, `Select.tsx`, `Switch.tsx`, `Segmented.tsx`, `src/ui/fields.test.tsx`

**Interfaces:**
- Produces: the exact props of the `app-ui` versions (web facts §11 table; `Switch` keeps `locked?`, which renders `ProBadge`), with the Figma look of `34:345`, `34:355`, `96:315`, `46:326`, `138:324`, `138:319`: label above, constraint below, error right under the field. The `app-ui` versions stay until their screens move (M2–M8).

- [ ] **Step 1: Write the failing test** by porting the five matching cases of `src/app-ui/ui-kit.test.tsx` to the new imports, and adding:
  - `TextField` with `error` → the input has `aria-invalid="true"` and the error text is its description.
  - `Segmented` selects an option by click and by arrow key.
  - `Select` picks an item and calls `onChange` with its id.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): add text field, checkbox, select, switch and segmented to ui`.

### Task M1.8: `ui/` overlays and loading

**Files:**
- Create: `src/ui/Dialog.tsx`, `Toast.tsx`, `Skeleton.tsx`, `src/ui/overlays.test.tsx`
- Modify: `src/app-ui/Toast.tsx` (becomes `export * from '@/ui/Toast';` until M8), `src/app/globals.css` (`--animate-wm-overlay-in`, `-wm-dialog-in`, `-wm-sheet-in`, `-wm-pop-out` with their keyframes)

**Interfaces:**
- Produces:
  - `Dialog`: same props as `app-ui/Dialog.tsx` (`isOpen, onOpenChange, title, titleAside?, closeLabel?, wide?, children?, footer?, isDismissable = true`). From 48rem up it is a centred modal (`rounded-wm-modal`, `shadow-wm-pop`); below that, a bottom sheet. Layout comes from CSS only.
  - Dialog motion (GM15, §8.2): backdrop fades in over 200ms; the modal enters in 240ms on `--ease-out-strong` from `translateY(12px)` and opacity 0; the sheet enters from `translateY(60px)` while fading in; both close in 150ms on `--ease-wm-close`. Reduced motion falls to the global rule.
  - `Toast`: `app-ui/Toast.tsx`'s API (`toastQueue`, `showToast`, `ToastRegion`) with the new look; keep its `// raw-ok` view-transition line.
  - `Skeleton({ className? })`: an `aria-hidden` block with `motion-safe:animate-pulse`.
  - `SkeletonPage({ shape: 'chrome' | 'bare' })`: `role="status"`, visually hidden text `App.common.loading`. The shape `chrome` draws the bars of the top bar and the tab bar.

- [ ] **Step 1: Write the failing test** `overlays.test.tsx` (jsdom, `renderApp` for messages):
  - An open `Dialog` is a `dialog` named by `title`; Esc calls `onOpenChange(false)`; the close button named by `closeLabel` closes it.
  - With `isDismissable={false}`, clicking outside does not close it.
  - `SkeletonPage` is a `status` with text `Đang tải…`.
  - `showToast('Đã lưu', 'success')` shows `Đã lưu` in the region.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; the 12 test files that import `app-ui/Toast` still pass (`pnpm test`).
- [ ] **Step 5: Commit** `feat(web): add dialog, toast and skeleton to ui with the new motion`.

### Task M1.9: The new chrome components

**Files:**
- Modify (rewrite to Figma): `src/app-chrome/TopBar.tsx` (`54:502`), `MobileTabBar.tsx` (`54:637`), `AvatarMenu.tsx` (`181:316`), `PlanChip.tsx`, `Logo.tsx` (`3:14`), `SearchStrip.tsx:40-46` (reset only when `q` or `level` changes), `src/app-chrome/chrome.test.tsx`
- Create: `src/app-chrome/PhoneHeader.tsx` (`54:503`), `BackLink.tsx`, `PageColumns.tsx`, `AddFab.tsx`, `CardFrame.tsx`, `AppChrome.tsx`
- Modify: `src/app-chrome/AppShell.tsx` (temporary: renders `AppChrome` so every page keeps compiling until M1.10 deletes it)

**Interfaces:**
- Produces:
  - `TopBar()`, shown from 48rem: logo; tabs as links with `aria-current="page"` on the tab of `currentTab(pathname)`; "Thêm từ" button with `Kbd` N calling `useAddWord().open()`; quiet `PlanChip`; `AvatarMenu`. Glass background `backdrop-blur-wm-glass` with the Figma fill; no shadow (§3.1).
  - `PhoneHeader()`: logo, a search link to `/{locale}/app/lookup`, `AvatarMenu`.
  - `MobileTabBar()`: no tab current when `currentTab` returns `null` (variant `Tab=Không`, `149:4381`).
  - `AvatarMenu()`: items and order of `181:316`. "Báo lỗi của tôi" links to `/{locale}/app/practice/history?tab=reports` until M6 adds `/app/settings/reports` (ruling).
  - `ThemeToggle` goes where Figma `54:502` or `181:316` places it; if neither frame has it, it becomes an `AvatarMenu` item (ruling).
  - `BackLink({ href, label })`: a link with an arrow, Nút chữ look.
  - `PageColumns({ children, aside })`: one column, plus the aside as a second column from 80rem (1280px).
  - `AddFab()`: the phone "+" of Hôm nay (`117:4712`), calling `useAddWord().open()`.
  - `CardFrame({ children })`: the centred card on `DotGridBackground`, replacing `AuthFrame` (`AppShell.tsx:131-144`).
  - `AppChrome({ children })`: skip link to `#main`; `<header>` holding `TopBar` (md+) and `PhoneHeader` (below md); `SearchStrip` under the header, as today, until M4 replaces it with the TopBar search box (ruling); `<main id="main" tabIndex={-1}>` at the 1160px content width; `MobileTabBar`; `DotGridBackground`. No footer: the Figma app frames have none.

- [ ] **Step 1: Write the failing tests** in `chrome.test.tsx`, keeping its `next/link` and `next/navigation` mocks:
  - On `/vi/app/groups`, link "Nhóm" has `aria-current="page"`; on `/vi/app/word`, "Tra từ" has it; on `/vi/app/settings`, no link has it (TopBar and MobileTabBar).
  - "Thêm từ" opens the dialog inside `AddWordProvider`.
  - The avatar menu lists the Figma items in order, with their exact Vietnamese labels.
  - `BackLink` is a link with its label.
  - `SearchStrip` keeps typed text when `?id=` changes and clears it when `?q=` changes (red first: today it clears on both).
- [ ] **Step 2: Run** `pnpm vitest run src/app-chrome` → FAIL.
- [ ] **Step 3: Implement** each component after reading its Figma frame; copy goes into `messages/{vi,en}.json` (`App.chrome.*`).
- [ ] **Step 4: Run** → PASS; `pnpm test`, `pnpm lint`, `pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the app chrome to the new design`.

### Task M1.10: Route groups and removal of `AppShell`

**Files:**
- Move (`git mv`, paths under `src/app/[locale]/app/(member)/`): every page into `(chrome)/`, except `complete-profile/`, `welcome/` → `(onboarding)/` and `practice/session/`, `review/`, `recall/` → `(focus)/`
- Create: `(member)/(chrome)/layout.app.tsx` (`<AddWordProvider><AppChrome>{children}</AppChrome></AddWordProvider>`), `(member)/(onboarding)/layout.app.tsx` (`<CardFrame>`), `(member)/(focus)/layout.app.tsx` (`<main id="main" tabIndex={-1}>{children}</main>` on `DotGridBackground`)
- Modify: the 17 call sites of web facts §9.3. `back` becomes `<BackLink>` at the top of the page content; `aside` becomes `<PageColumns aside>`; `fab` stays only on Today, as `<AddFab/>` (Figma has "+" on Hôm nay only, §5.4). `AuthGate` uses `CardFrame`. `complete-profile` and `welcome` pages drop their `AppShell`. `PlansPage`, `OrderReturnPage` drop their own `<header>` and `<main>`. `PracticeSession`, `ReviewSession`, `RecallSession` drop their own `<main id="main">`. `ReviewSession` swaps `StudyPattern` for nothing (the layout draws the background).
- Delete: `src/app-chrome/AppShell.tsx`, `src/app-chrome/AppFooter.tsx` and their test cases (both stay in the tag).
- Modify: `src/app-ui/test-utils.tsx` (`renderApp` option `chrome?: boolean` wraps the UI in `AddWordProvider` + `AppChrome`), `features/learner/groups/group-list.test.tsx:56-57`, `group-page.test.tsx:60,69,300,307,319` and every other screen test that breaks.
- Create: `src/app-chrome/layouts.test.tsx`

- [ ] **Step 1: Write the failing test** `layouts.test.tsx`:
  - For `TodayPage`, `GroupPage` and `SettingsPage` under `renderApp(<Page/>, { chrome: true })`: `getAllByRole('main')` has length 1 and `getAllByRole('banner')` has length 1 (Review Focus 4).
  - The `(chrome)` layout opens the "Thêm từ" dialog on key `n`.
  - The `(focus)` layout with a session page shows no dialog on key `n` (Review Focus 5).
- [ ] **Step 2: Run** → FAIL (pages still render `AppShell`, the layouts do not exist).
- [ ] **Step 3: Implement** the moves, the layouts and the 17 call-site edits; then fix the screen tests (`group-page.test.tsx:69` now asserts the in-page "Thêm từ" control, not a phone fab).
- [ ] **Step 4: Run:**
  - `pnpm test`, `pnpm lint`, `pnpm typecheck` → PASS.
  - `grep -rn "AppShell\|AppFooter\|StudyPattern" src` → no output.
  - `pnpm cf:docker` (all e2e) → PASS; journeys that relied on the footer or old chrome copy are updated in this task.
- [ ] **Step 5: Commit** in two parts: `refactor(web): split the member routes into chrome, onboarding and focus` and `feat(web): move the app chrome into layouts and drop app shell`.

### Task M1.11: Loading, error and the hard-load skeleton

**Files:**
- Create: `src/app/[locale]/app/(member)/(chrome)/loading.app.tsx` (neutral skeleton: title and three blocks); `error.app.tsx` in `(member)/(chrome)/`, `(member)/(focus)/`, `(member)/(onboarding)/`, `(auth)/`, each rendering `ErrorView`; `src/app-chrome/ErrorView.tsx` and `error-view.test.tsx`; `src/app-shell/skeleton-shape.ts` and `skeleton-shape.test.ts`
- Modify: `src/app-shell/RequireSession.tsx:54-55` (spinner → `SkeletonPage shape={chromeShape(pathname)}`); `messages/{vi,en}.json`

**Interfaces:**
- Produces:
  - `chromeShape(pathname: string): 'chrome' | 'bare'`: `bare` for `/{vi|en}/app/practice/session`, `/app/review`, `/app/recall`, `/app/complete-profile`, `/app/welcome` and the auth paths; `chrome` otherwise.
  - Error view: title "Không tải được trang này." and a "Thử lại" button that calls `retry()`. Check the props of the error file in Next 16.4 with context7 before writing; use `reset()` only if `retry` is absent, and record that as a ruling.
  - Per-route skeletons (Hôm nay, Nhóm, Một nhóm, Tra từ, Một từ, Luyện tập) come with their milestones (M3–M5).

- [ ] **Step 1: Write the failing tests:**
  - `chromeShape` table, exact: `/vi/app` → chrome; `/vi/app/groups` → chrome; `/en/app/practice/session` → bare; `/vi/app/review` → bare; `/vi/app/welcome` → bare; `/vi/app/login` → bare; `/vi/app/practice` → chrome.
  - The error view calls `retry` when "Thử lại" is pressed.
  - `RequireSession.test.tsx:57-63` keeps passing unchanged.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `pnpm test` → PASS; `src/i18n/messages.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): add skeletons and error views to the app layouts`.

### Task M1.12: Dark mockups and source sync

**Files:**
- Create: `docs/mockups/2026-11-05-redesign-concepts/toi-5-man.html`
- Modify: `docs/mockups/2026-11-05-redesign-concepts/ui-best-practices.md`, `motion-va-chuyen-canh.md` §6, `app-redesign-plan.md:5`, following design §3.1 "Chỗ lệch đã biết"

- [ ] **Step 1:** Build the five dark screens (Hôm nay, Nhóm băng chuyền, Phiên luyện trả lời sai, hộp Thêm từ, Đăng nhập) from the Figma Dark variable values (§7.2). Each screen is light and dark side by side, so the owner compares. Publish it as an artifact and send the owner the link (GM4). The answer is needed before M9, not before the M1 PR.
- [ ] **Step 2:** Edit the three docs to the "Lấy" column of the §3.1 table: entrance durations follow the motion doc; fully round elements follow Figma; no top-bar shadow; accent `#1e3a8a`.
- [ ] **Step 3: Commit** `docs(web): sync ui sources and add dark mockups for review`.

### Task M1.13: M1 check, screenshots, PR

**Files:**
- Modify: `e2e-shots/shots.spec.ts:43-82` (add set `gm-m1`: login signed out; Today, Groups, Group, Settings signed in; widths 390 and 1440), `docs/deliveries/giao-dien-moi.md` (M1 as-built), `docs/deliveries/giao-dien-moi-rulings.md`

- [ ] **Step 1: Full checks:**
  - web: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm cf:docker` (all e2e), then `pnpm assert:render-mode` on the `.next` that run left.
  - admin: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
  - All pass. Record the test counts.
- [ ] **Step 2: Screenshots:** `SHOTS_MILESTONE=gm-m1 pnpm shots` against `pnpm dev:app` with a real learner. Put the images in the delivery record next to the Figma frame IDs: old screens inside the new chrome.
- [ ] **Step 3: Commit** `test(web): add the gm-m1 screenshot set` and `docs(web): record m1 as built`.
- [ ] **Step 4: PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): lay the new ui foundation and move the chrome into layouts`. Merge after green CI and the owner's yes.

---

## Task Q4 (placeholder): ads and page reloads

QR4 is set aside (owner, 10/11/2026); the options and their trade-offs are in the decision record (QR4, round 2), on the artifact https://claude.ai/artifact/V8Yd4w2qDBmR9GVuTdT3Yq and in `docs/preparation/AD_ALTERNATIVES_TO_ADSENSE_2026-11-10.md`:
- A: keep DB38 as it is.
- B: AdSense vignette on tab switches.
- C: Google Ad Manager web interstitial.
- B first, then C if the owner gets Ad Manager.

Until the owner chooses, no task touches `features/learner/ads/AdsenseLoader.tsx` or `(member)/layout.app.tsx`'s ad slots, and M3–M7 keep the DB38 behaviour. Once the owner chooses:
1. Update design §5.4, §8.2 and §15, and the decision record (QR4 row and options table).
2. Write this task with files, tests and steps.
3. Place it in the earliest open milestone part.

---

## Self-review notes (10/11/2026)

- Coverage: §4 → Task 0. §5.4 → M1.9, M1.10. §5.5 → M1.11. §5.8 → M1.3. §6 → M1.4, M1.5. §7.1–§7.2 → M1.1, M1.2. §7.5 generic parts → M1.6–M1.8. §8.1, GM15 → M1.1, M1.8. §9 M1 dark mockups and doc sync → M1.12. §10.2–§10.3 → A1, A3, A4. §10.5 → A5, A6, A7. §10.6 API side → A8. §13 API smoke → A9.
- Deferred by design to later parts: §5.6, §5.7, §7.3, §7.4, §8.2 per screen, §8.5, §9 M2–M9, §10.4, §10.6 web side, §11, the §13 rows run by hand.
- Decisions this part makes that the design left open, each recorded as a ruling when executed:
  - Calendar totals are sums of day values.
  - `result` may be `null` (a `review` row without `rating`, which no writer makes today).
  - `next_lemma` looks at the first five cards per group.
  - `sessions/last` counts without `summary`.
  - Fields, dialogs and toast are built in M1; `OtpField`, `GoogleButton`, `ChoiceCard` come with their screens.
  - `SearchStrip` stays until M4.
  - The FAB is only on Today.
  - The footer is removed from the app.

---

# Part 2 — M2 Đăng nhập và tài khoản (branch `feat/giao-dien-moi-m2`)

**Goal:** Rebuild the nine sign-in and account pages (design §9 M2) on the M1 kit:
- `(auth)` splits into `(split)` and `(card)`.
- The auth forms move off the old `app-ui/` kit.
- The new fields Figma draws: password reveal, the 6-box code, confirm password.
- The brand panel of the two split pages.

**Inputs:**
- Design §3, §5.4, §7.5, §9 M2.
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-m2.md`, cited as "M2 code §n".
- Figma facts `docs/preparation/GIAO_DIEN_MOI_PLAN_FIGMA_FACTS_2026-11-10-m2.md`, cited as "M2 Figma §n".
- Figma page `35:307`.

Paths below are under `apps/web/`. `R/` = `src/app/[locale]/app/`.

Run `git switch -c feat/giao-dien-moi-m2 origin/refactor/giao-dien-moi` once the M1 PR is merged. Then run `git merge docs/giao-dien-moi-plan-2` to bring in this part and its two facts files.

## Part 2 constraints

- The API does not change.
- Every request body that existing tests pin with `toEqual` stays exactly the same: M2 code §7.1 tests 2, 32 and 33; `google-complete.test.tsx:54`; `e2e/app/b8-set-password.spec.ts`.
- The accessible names the tests rely on stay:
  - field labels: "Email", "Mật khẩu", "Mật khẩu mới", "Tên", "Họ (không bắt buộc)", "Ngày sinh";
  - OTP boxes: "Chữ số N";
  - button names;
  - one `h1` per page;
  - `role="alert"` only for errors (M2 code §7.1 test 40).
- No field has a `placeholder`. This is pinned by `auth.test.tsx:59-64` (owner 03/11/2026).
- The birth date stays the browser's date box (owner 27/10/2026). Figma draws it as `dd/mm/yyyy` text; the code does not follow that.
- Turnstile follows QM2-1, which the owner answers before M2.4 runs:
  - "luôn hiện" keeps today's render options;
  - "chỉ hiện khi cần" adds `appearance: 'interaction-only'`.
  - In both cases Figma's hand-drawn "Đã xác minh" box is not built; the real widget renders in its place.
- When M2 ends, `features/learner/auth/**` imports nothing from `@/app-ui/*`. Tests may still import `@/app-ui/test-utils`.

## Part 2 Review Focus

1. A signed-in Google-only learner opens Quên mật khẩu or Đặt mật khẩu mới. The page must stay open (B8-2) after `CardFrame` moves out of `AuthGate`. Pinned by `AuthGate.test.tsx:27` and `b8-set-password.spec.ts`, both unchanged.
2. Pasting "48 1205" into any box of the reset code fills all six boxes and leaves focus on box 6. Pinned in M2.2, and again in M2.8 for the reset page.
3. Confirm password typed wrong, then fixed:
   - the first press sends nothing and shows the error under "Nhập lại mật khẩu";
   - the second press sends the old body, with no extra field.
   Pinned in M2.7 and M2.8.
4. Pressing the eye button inside a form shows the password and does not submit the form. Pinned in M2.1.
5. At 1024 px, a width between the two Figma sizes: no brand panel, card layout, no horizontal scroll. Pinned in M2.5 by `overflow.spec.ts`, which adds a 1024 width.

### Task M2.1: `PasswordField` and a link in the label row

**Files:**
- Modify: `src/ui/TextField.tsx`; `messages/{vi,en}.json`, adding `App.common.showPassword` ("Hiện mật khẩu" / "Show password") and `App.common.hidePassword` ("Ẩn mật khẩu" / "Hide password").
- Create: `src/ui/PasswordField.tsx`.
- Test: `src/ui/fields.test.tsx`.

**Interfaces:**
- `TextField` gains `labelAside?: ReactNode`, rendered at the right end of the label row (Figma `Ô nhập`, "có liên kết").
- `PasswordField(props: Omit<TextFieldProps, 'type'>)` renders a `TextField` whose `type` is `password` or `text`, with a 20 px eye button inside the box. The button has `type="button"` and `aria-pressed`, and takes its name from the two new keys.

- [ ] **Step 1: Write the failing tests:**
  - The eye button reveals and hides: the `type` attribute goes `password` → `text` → `password`, and the button name goes "Hiện mật khẩu" → "Ẩn mật khẩu".
  - Pressing it inside `<form onSubmit={spy}>` leaves `spy` uncalled.
  - `getByLabelText('Mật khẩu')` finds only the input.
  - `labelAside` renders a link in the same row as the label.
- [ ] **Step 2: Run** `pnpm vitest run src/ui/fields.test.tsx`. Expected: FAIL, because `PasswordField` does not exist.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add a password field with reveal to ui`.

### Task M2.2: `OtpField`

**Files:**
- Create: `src/ui/OtpField.tsx`.
- Test: `src/ui/otp-field.test.tsx`.

**Interfaces:**
- Signature: `OtpField({ label, digitLabel, value, onChange, length = 6, autoFocus }: { label: string; digitLabel: (n: number) => string; value: string; onChange: (digits: string) => void; length?: number; autoFocus?: boolean })`.
- Renders a `role="group"` named `label`, holding `length` inputs named `digitLabel(n)`.
- The behaviour moves from `VerifyEmailForm.tsx:133-149` (M2 code §6):
  - `inputMode="numeric"`;
  - `autoComplete="one-time-code"` on box 1;
  - `maxLength={2}`, keeping the last digit typed;
  - focus moves to the next box after a digit;
  - Backspace on an empty box moves back one box;
  - paste strips non-digits and fills from box 1.
- Looks follow the Figma `Ô mã` states (M2 Figma §2): Thường, Đang nhập, Có số (`wm-accent-soft` fill, Bricolage 28).

- [ ] **Step 1: Write the failing tests:**
  - Paste "48 1205" → `onChange('481205')` and box 6 has focus.
  - Type `4` then `8` → box 3 has focus.
  - From an empty box 3, press Backspace twice → box 1 has focus.
  - Type `7` into a filled box → the box holds `7`.
  - The group's accessible name is `label`.
- [ ] **Step 2: Run** `pnpm vitest run src/ui/otp-field.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the six box code field to ui`.

### Task M2.3: `GoogleButton`, `Flag`, `DateOfBirthField` in the new kit

**Files:**
- Create: `src/ui/GoogleButton.tsx`; `src/ui/DateOfBirthField.tsx`.
- Move with `git mv`:
  - `src/app-ui/date-of-birth.ts` and its test → `src/lib/date-of-birth.ts`;
  - `src/app-ui/Flag.tsx` → `src/ui/Flag.tsx`.
- The old paths `app-ui/date-of-birth.ts` and `app-ui/Flag.tsx` become one-line re-exports, like `app-ui/Toast.tsx`, until M8.
- Test: `src/ui/fields.test.tsx`.

**Interfaces:**
- `GoogleButton({ onPress, children })` draws the Figma `Nút Google` (`34:366`) with the four-path mark, `aria-hidden`. It does not navigate, because `ui/` may not import `@/app-shell/config` (M2 code §8.4).
- `DateOfBirthField` keeps the props of `app-ui/DateOfBirthField.tsx` and wraps `ui/TextField`.

- [ ] **Step 1: Write the failing tests:**
  - The Google button's `svg` is `aria-hidden` and has 4 `path`s; pressing the button fires `onPress`.
  - An under-13 date shows "Bạn cần đủ 13 tuổi để dùng Wordmet." and calls `onChange(null)`.
  - `serverError="tooYoung"` shows the same text.
- [ ] **Step 2: Run** `pnpm vitest run src/ui/fields.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement**, moving the two files with `git mv`.
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS; the old importers still work through the re-exports.
- [ ] **Step 5: Commit** `feat(web): add google button, flag and birth date field to ui`.

### Task M2.4: Turnstile moves to `features/learner/auth/`

**Files:**
- Move: `src/app-ui/TurnstileWidget.tsx` and its test, and `src/app-shell/use-turnstile.tsx`, into `src/features/learner/auth/`.
- Modify: the 4 importers and the two `vi.mock` paths (M2 code §4, §7.4).
- Restyle the widget's fallback text with `wm-` tokens.

- [ ] **Step 1: Write the test for the QM2-1 answer:**
  - "chỉ hiện khi cần": a failing test that the `turnstile.render` options contain `appearance: 'interaction-only'`.
  - "luôn hiện": a test that pins today's options: `sitekey`, `refresh-expired: 'auto'`, and no `appearance`.
- [ ] **Step 2: Run** the new test. Expected: FAIL for "chỉ hiện khi cần"; PASS for "luôn hiện", which pins existing behaviour.
- [ ] **Step 3: Move the files and implement.**
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS, including `auth-turnstile.test.tsx` with its new mock path.
- [ ] **Step 5: Commit** `refactor(web): move turnstile into the auth feature`.

### Task M2.5: `(split)` and `(card)` layouts, the brand panel, heading tokens

**Files:**
- Create: `R/(auth)/(split)/layout.app.tsx`; `R/(auth)/(card)/layout.app.tsx`.
- Move `login/` and `register/` into `(split)`.
- Move `verify-email/`, `forgot-password/`, `reset-password/`, `google/complete/` and `account-deleted/` into `(card)`.
- Modify: `features/learner/auth/AuthGate.tsx` so it returns `children` with no frame.
- Modify: `app-chrome/CardFrame.tsx` to match the Figma card:
  - `max-w-120`, `p-6`, `md:p-10`, `rounded-wm-2xl`, a border, `shadow-wm-lift`;
  - logo at the top left;
  - two glows behind the card.
  - The `(onboarding)` pages get the same card.
- Create: `features/learner/auth/SplitFrame.tsx` (client component); `features/learner/auth/AuthShowcase.tsx`.
- Modify: `packages/design-tokens/web.css` and `web-tokens.test.ts`. Add these tokens, taking letter-spacing from M2 Figma §3:
  - `--text-wm-page-title`: 44 px, lh 1.18;
  - `--text-wm-page-title-mobile`: 38 px, lh 1.22 (Figma `Display/Page title mobile`);
  - `--text-wm-card-heading`: 30 px, lh 1.3;
  - `--text-wm-card-heading-mobile`: 26 px, lh 1.3.
- Tests: `app-chrome/layouts.test.tsx`, `e2e/landing.spec.ts:550-563`, `e2e/app/overflow.spec.ts`.

**Behaviour:**
- `SplitFrame` picks the panel variant with `usePathname()` (M2 Figma §3.1–3.2): `/register` gets the "Đề 12" cards; every other path gets the "ngăn" cards.
- From `xl` (1280 px), it draws a 640 px panel in `wm-accent-soft` holding:
  - the dot grid;
  - the three cards;
  - the review path;
  - the chips.
  The whole panel is `aria-hidden`.
- The form column is 400 px wide: logo on top, form, then a footer at the bottom ("© {year} Wordmet", "Chính sách bảo mật", "Điều khoản sử dụng").
- Below `xl`, it uses the card layout with no footer.
- The page `h1` uses `text-wm-page-title-mobile md:text-wm-page-title`.

- [ ] **Step 1: Write the failing tests:**
  - Layouts: a page under `(card)` has exactly one `main` and one logo link to `/vi`.
  - `AuthGate` keeps its existing tests, now with no frame: it still redirects a signed-in visitor of `/vi/app/login`, and still leaves forgot and reset open.
  - Rewrite the e2e at `landing.spec.ts:550-563`:
    - at 1440, the brand panel is visible and the `h1` sits in the left half;
    - at 1024 and at 390, there is no panel and the card is centred within 2 px.
  - `overflow.spec.ts` adds a 1024 width.
  - The web-tokens test pins the four new sizes.
- [ ] **Step 2: Run** the unit tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run:**
  - `pnpm test` → PASS;
  - `pnpm cf:docker e2e/landing.spec.ts e2e/app/overflow.spec.ts` → PASS;
  - the admin checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` in `apps/admin`), because `packages/design-tokens` changed.
- [ ] **Step 5: Commit** `feat(web): split the auth layouts and add the brand panel`.

### Task M2.6: Shared auth pieces and Đăng nhập

**Files:**
- Rename: `features/learner/auth/AuthCard.tsx` → `AuthHeading.tsx`. It holds the back link (the `BackLink` look with today's behaviour), the `h1`, the intro and the banner. It draws no card.
- Modify: restyle `FormError` and `PasswordRules` with `wm-` tokens.
- Create: `features/learner/auth/GoogleSignIn.tsx`, which pairs `ui/GoogleButton` with today's `/v1/auth/google/start` URL logic (M2 code §5).
- Add `OrDivider` and `SwitchAuthLink` to `AuthHeading.tsx`.
- Modify: `LoginForm.tsx`.
- Test: `auth.test.tsx`.

**Behaviour:**
- Login follows `35:308` / `37:485`.
- "Quên mật khẩu?" moves into the label row of "Mật khẩu" (`labelAside`). It keeps a 44 px tall hit area on phones, pinned by `landing.spec.ts:822-834`.
- Button variants map from the old kit: `sticker` → `primary`, `quiet` → `secondary`.

- [ ] **Step 1: Write the failing test:** the login password field has a "Hiện mật khẩu" button, and the link "Quên mật khẩu?" sits in its label row with `href=/vi/app/forgot-password`. Existing login tests 9–15 and 36–40 stay unchanged.
- [ ] **Step 2: Run** `pnpm vitest run src/features/learner/auth`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild sign in on the new kit`.

### Task M2.7: Đăng ký with "Nhập lại mật khẩu"

**Files:**
- Modify: `RegisterForm.tsx`.
- Modify tests: `auth.test.tsx` (`fillRegister` also fills "Nhập lại mật khẩu"); `auth-turnstile.test.tsx:126`; `e2e/app/m1.spec.ts:10-52`.
- Modify `messages/{vi,en}.json`:
  - add `App.auth.register.confirmPassword`: "Nhập lại mật khẩu" / "Re-enter password";
  - add `App.auth.passwordMismatch`: "Mật khẩu nhập lại chưa khớp." / "The passwords don't match.";
  - delete the unused `givenNamePlaceholder` and `familyNamePlaceholder`, and `App.ui.dob.placeholder` if nothing reads it.

**Behaviour:** follows `35:405` / `37:533`.
- The name row has two columns from `sm`.
- Two `PasswordField`s; only the first has the hint.
- Uses the new kit's `Checkbox` and `DateOfBirthField`.
- The Turnstile widget sits where Figma draws the "Đã xác minh" box.
- Pressing submit with mismatched passwords sends nothing. The error appears under the confirm field (`aria-invalid`) and focus moves there.
- Typing in the confirm field clears the error.

- [ ] **Step 1: Write the failing tests:**
  - Mismatch → zero `POST /v1/auth/register`, and the text "Mật khẩu nhập lại chưa khớp." describes the confirm field.
  - After the fix → one request, whose body still `toEqual`s test 2's body.
- [ ] **Step 2: Run** `pnpm vitest run src/features/learner/auth`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the auth tests → PASS; `src/i18n/messages.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild sign up with a confirm password field`.

### Task M2.8: Xác minh email, Quên mật khẩu, Đặt mật khẩu mới

**Files:**
- Modify: `VerifyEmailForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`.
- Modify tests: `auth.test.tsx` (tests 33, 35); `e2e/app/b8-set-password.spec.ts`.
- Modify `messages/{vi,en}.json`: add `App.auth.reset.confirmPassword`, "Nhập lại mật khẩu mới" / "Re-enter new password".

**Behaviour:**
- Verify uses `OtpField`, with each box named by `verify.digit`. Its text and flow do not change, so tests 16–30 keep passing.
- Reset follows `36:447`:
  - the single code field becomes an `OtpField` labelled "Mã 6 số trong email";
  - it gains "Nhập lại mật khẩu mới", with the same mismatch rule as M2.7.
- Forgot changes style only.

- [ ] **Step 1: Write the failing tests:**
  - Reset has a group "Mã 6 số trong email" with boxes "Chữ số 1" to "Chữ số 6".
  - Reset: paste "48 1205", type a matching confirm, submit → the body `toEqual`s `{email, code:'481205', new_password}`.
  - Reset: a mismatch sends nothing.
  - The b8 e2e fills the boxes and the confirm field, and keeps its body check.
- [ ] **Step 2: Run** `pnpm vitest run src/features/learner/auth`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the auth tests → PASS; then `pnpm cf:docker e2e/app/b8-set-password.spec.ts e2e/app/m1.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild email code and password reset pages`.

### Task M2.9: Google hoàn tất, Đã xóa tài khoản, Bổ sung hồ sơ, Chào mừng

**Files:**
- Modify: `GoogleComplete.tsx`, `AccountDeleted.tsx`, `CompleteProfile.tsx`, `WelcomeLanguage.tsx`.
- Create: `features/learner/auth/account-deleted.test.tsx`.
- Modify: `e2e/app/m1.spec.ts:124-151`, adding `account-deleted` (signed out) and `complete-profile` (signed in) to the axe pages.

**Behaviour:**
- Google: the email chip (`36:490`) and the two-column name row.
- Deleted (`36:549`): a success circle, 64 px on desktop and 56 px on phones; "Về trang đăng nhập" as a secondary `ButtonLink`.
- Welcome: `ui/Select` with `ui/Flag`.
- Complete profile: style only.

- [ ] **Step 1: Write the failing tests:**
  - Deleted shows `heading "Tài khoản của bạn đã được xóa."` and `link "Về trang đăng nhập"` to `/vi/app/login`.
  - With `?pending=1` it shows "Tài khoản đang được xóa".
  - Existing `google-complete.test.tsx` and `CompleteProfile.test.tsx` stay unchanged.
- [ ] **Step 2: Run** `pnpm vitest run src/features/learner/auth`. Expected: FAIL, because the deleted page has no test file yet.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild google completion, deleted, profile and welcome pages`.

### Task M2.10: M2 check, screenshots, PR

**Files:**
- Modify: `e2e-shots/shots.spec.ts`, adding set `gm-m2`: the 9 pages at 390 and 1440, light theme.
- Modify: `docs/deliveries/giao-dien-moi.md` (M2 as-built); `docs/deliveries/giao-dien-moi-rulings.md`.

- [ ] **Step 1: Run the checks:**
  - `rg "@/app-ui/" src/features/learner/auth --glob '!*.test.*'` → no output.
  - Web: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm cf:docker` (all e2e).
  - Admin: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
  - Expected: all pass. Record the test counts.
- [ ] **Step 2: Take screenshots:** `SHOTS_MILESTONE=gm-m2 pnpm shots`. Put them in the delivery record next to their Figma frame IDs.
- [ ] **Step 3: Commit** `test(web): add the gm-m2 screenshot set`, then `docs(web): record m2 as built`.
- [ ] **Step 4: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild the sign in and account pages`. Merge after CI is green and the owner says yes.

## Part 2 self-review notes (10/11/2026)

**Coverage:**
- Design §9 M2 table (9 routes) → M2.5–M2.9.
- §5.4 `(split)` / `(card)` and the B8-2 exception → M2.5.
- §7.5 `OtpField` → M2.2; `GoogleButton` → M2.3.
- Moving Turnstile (§6) → M2.4.
- "Nhập lại mật khẩu" (Figma audit, item 4) → M2.7, M2.8.

**Decisions this part makes.** Each is recorded as a ruling when executed.
- The split layout replaces LR43 (owner 03/11/2026: no navy panel). The approved design and Figma `35:308` / `35:405` bring the panel back, in `wm-accent-soft` rather than navy. `landing.spec.ts:550-563` is rewritten to match.
- The panel shows from 1280 px; narrower screens get the card layout.
- The reset code becomes six boxes, as Figma draws them.
- The mismatch message text, and that it shows when submit is pressed.
- The birth date stays the browser's date box.
- `GoogleButton` is split: the look goes in `ui/`, the navigation in `features`.
- `date-of-birth` and `Flag` move to the new kit, with re-exports at the old paths until M8.
- The mobile title of Đăng ký uses 38 px, like Đăng nhập, unless 38 px wraps at 390 px. Figma draws it at 32 px.

**Open:** QM2-1 (Turnstile), asked 10/11/2026.

---

# Part 3 — M3 Hôm nay và Nhóm (branch `feat/giao-dien-moi-m3`)

**Goal:** Rebuild Hôm nay, Nhóm (the "Trượt mờ" carousel and the group picker), Một nhóm, Từ lâu chưa ôn and Chủ đề, plus their five dialogs. Group colours by ID, stage colours, the Học · Ôn pair, and the new API fields `next_lemma`, `last_reviewed` and `sessions/last`.

**Inputs:**
- Design §3, §5.5, §7.3, §7.4, §8.2, §8.4, §8.5, §9 M3.
- Motion doc `docs/mockups/2026-11-05-redesign-concepts/motion-va-chuyen-canh.md` §1, §3, §8. It is the only source for motion numbers.
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-m3.md` ("M3 code §n").
- Figma facts `…_FIGMA_FACTS_2026-11-10-m3-a.md` (Hôm nay, carousel, picker; "M3 Figma A §n") and `…-m3-b.md` (Một nhóm, Từ lâu chưa ôn, Chủ đề, confirm card; "M3 Figma B §n").
- The chosen prototype `docs/mockups/2026-11-05-redesign-concepts/vong-7-chong-the-tu-dien.html`: carousel, picker and open/close behaviour (M3 code §8). Today: `vong-10-con-lai.html:526-546`. Backlog and topic: `vong-15-polish-9-trang.html:761-812`.

Paths below are under `apps/web/`; `L/` = `src/features/learner/`, `C/` = `src/app/[locale]/app/(member)/(chrome)/`.

Run `git switch -c feat/giao-dien-moi-m3 origin/refactor/giao-dien-moi` once M2 is merged. Then `git merge docs/giao-dien-moi-plan-3`.

## Part 3 constraints

- **No API change.** Web types gain `next_lemma?` and `last_reviewed?` as optional fields, so old fixtures still compile. Every `GET /v1/practice/sessions/last` the web makes is answered in tests:
  - `renderApp` defaults it to 204;
  - `e2e/support/mock-api.ts` `signedInAs` scripts it as 204.
- **Học · Ôn** follows `deckPlan` (`L/groups/deck-actions.ts`, unchanged):
  - the primary button is `ui/ButtonLink` `primary` (navy); the other is `secondary`;
  - both keep `data-google-vignette="false"` and today's hrefs.
- **Group colour** always comes from `groupColorIndex(id)` through static class maps; never from the list position.
- **Motion:**
  - numbers come from tokens, never written inside components;
  - with reduced motion: no translate, scale or blur; opacity and colour only, ≤ 200 ms; the carousel changes at once; no FLIP.
- **One-letter keys** (`F`, `N`, `/`) do nothing when focus is in an input, a select, a contenteditable element or a dialog. Use the same filter as `add-word-context.tsx:36`.
- **i18n:** keys that no screen reads any more are deleted in the same PR, and the e2e `copy` references to them are updated.

## Part 3 Review Focus

1. The carousel with one group, then with two. One: only the centre stack, no arrows, `←` `→` do nothing. Two: one side stack, never the same group on both sides. Pinned in M3.2 (`carouselSlots`) and M3.6.
2. `sessions/last` answers 204 or 500: Hôm nay renders every other block, with no error view and no "Lần luyện gần nhất" block. Pinned in M3.5.
3. Pressing `F`, `←` or `→` while typing in the picker search or in "Thêm từ vừa gặp": the carousel does not move and the picker does not reopen. Pinned in M3.6.
4. A done group (total > 0, nothing waiting) and an empty group:
   - the done group shows "✓ Xong hôm nay" and "ôn gần nhất <word>";
   - the empty group shows "nhóm trống", "Chưa có từ" and "Thêm từ để bắt đầu";
   - both appear under the right captions in the picker;
   - neither shows a primary Học/Ôn unless `deckPlan` gives one.
   Pinned in M3.3 and M3.6.
5. A 60-character unbroken group name on a 150 px Hôm nay card and on the 210 px phone carousel card: no horizontal scroll. Pinned by `overflow.spec.ts`, extended in M3.5 and M3.6.

### Task M3.1: Stage, group and motion tokens

**Files:**
- Modify: `packages/design-tokens/web.css`, `web-dark.css` (the same light values until M9), `apps/web/src/styles/web-tokens.test.ts`.

**Values:**
- **Stage colours** (design §7.3):
  - `--color-wm-stage-{0..5}-{bg,dot,ink}`;
  - stage 5's bg and dot are gradients;
  - add `--color-wm-stage-5-solid` = `#b28bff` for the flat squares of "Từ theo ngăn" (M3 Figma A §5).
- **Group colours** (design §7.4):
  - `--color-wm-group-{0..6}` and `--color-wm-group-empty` `#64708c`.
  - `-soft` (border of the cards behind; Figma ≈ 50 % on white) = `color-mix(in srgb, <colour> 50%, #ffffff)`.
  - `-wash` (selected picker row, halo) = `color-mix(in srgb, <colour> 12%, #ffffff)`.
  - `-ink` (numbers on white) takes Figma's darker inks: 0 `#984941`, 1 `#17696c`, 2 `#56429d`, 3 `#916d28`, 5 `#8c3765`.
  - Group 4 (green) and group 6 (blue) have no drawn ink. Each is `color-mix(in oklab, <colour> 65%, #1b2444)`, computed once and written as hex.
  - This replaces design §7.4's "the colour itself, ≥ 3:1" with ≥ 4.5:1. Record it as a ruling.
- **Motion** (motion doc §3, §1):
  - `--ease-wm-out` = `cubic-bezier(0.23,1,0.32,1)` (the main curve, now in `web.css`);
  - `--ease-wm-carousel` `(.3,1.25,.5,1)`;
  - `--ease-wm-flip` `(.3,1.15,.5,1)`;
  - `--ease-wm-rise` `(.3,1.3,.5,1)`;
  - `--ease-wm-count` `(.3,1.4,.5,1)`;
  - durations `carousel` 620, `fade` 450, `blur` 500, `halo` 700, `rise` 460, `count` 520, `flip` 380, `page-in` 340, `lift` 170 ms (`--transition-duration-wm-<name>`).

- [ ] **Step 1: Write the failing tests:**
  - Every new token exists, with the exact values above.
  - Each `--color-wm-group-N-ink` has ≥ 4.5:1 contrast on `#ffffff`, computed in the test with the WCAG formula.
  - `web-dark.css` declares the same names.
- [ ] **Step 2: Run** `pnpm vitest run src/styles/web-tokens.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same test → PASS. Then run the admin checks.
- [ ] **Step 5: Commit** `feat(web): add stage, group and carousel motion tokens`.

### Task M3.2: Pure helpers

**Files:**
- Create: `src/lib/group-color.ts` and `src/lib/group-color.test.ts`.
- Create: `L/groups/carousel.ts` and `L/groups/carousel.test.ts`.

**Interfaces:**
- `groupColorIndex(id: string): number`:
  - FNV-1a 32-bit over the UTF-8 bytes of `id.toLowerCase()`, then `mod 7`;
  - offset basis `2166136261`, prime `16777619`.
- `groupTone(id: string, total: number): GroupTone` returns static class strings `{ border, soft, wash, ink, bg }`. `total === 0` gives the `empty` tone.
- `stackDepth(waiting: number): 0|1|2|3`: the prototype rule `layers` (`vong-7…html:666`), > 16 → 3, > 6 → 2, > 0 → 1, else 0. The Hôm nay cards cap it at 2.
- `carouselSlots(count: number, centre: number): { index: number; k: -2|-1|0|1|2 }[]`:
  - each group appears at most once;
  - `k` is the shortest wrap-around distance;
  - the right side takes precedence when both sides tie.
- `stepTo(from: number, to: number, count: number): number`: the signed shortest step.
- `rhythm(cells): { level: number; total: number; due: number }[]`: one segment per stage. Segment width ∝ `total`, fill ∝ `due` (prototype `rhythm`, `:663`). This matches Figma: 6 + 9 + 9 = 24.
- `carouselOrder(groups)`: `sortForToday`, then empty groups last.

- [ ] **Step 1: Write the failing tests:**
  - `groupColorIndex`:
    - pin the exact index for 7 sample IDs (at least two UUIDs, `g-food`, an uppercase copy of one UUID). The expected values come from a separate reference FNV-1a run in Node, noted in the test;
    - the result is always an integer in [0, 6] over 1 000 random strings.
  - `stackDepth`:
    - 0 → 0, 1 → 1, 6 → 1, 7 → 2, 16 → 2, 17 → 3.
  - `carouselSlots`:
    - `(1, 0)` → `[{0,k:0}]`;
    - `(2, 0)` → `[{0,0},{1,1}]`;
    - `(5, 0)` → k for 3 is −2, k for 4 is −1;
    - `(8, 7)` → index 0 gets k = 1.
  - `stepTo(7, 0, 8)` → 1, and `stepTo(0, 5, 8)` → −3.
  - `rhythm`:
    - widths add up to the group total;
    - the fills add up to the sum of `cells[n].due`.
- [ ] **Step 2: Run** both test files. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** both test files. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add group colour, stack depth and carousel helpers`.

### Task M3.3: Shared group pieces

**Files:**
- Create: `L/groups/GroupStack.tsx` (card face and the cards behind it).
- Create: `src/ui/StageBar.tsx` (segments with fill, optional labels).
- Create: `L/groups/DeckButtons.tsx`, rewritten on `ui/ButtonLink`.
- Create: `L/groups/group-pieces.test.tsx`.

**Interfaces:**
- `GroupStack({ group, size: 'today'|'carousel'|'page', depth?, as? })`:
  - draws M3 Figma A §2.3. One design is scaled with font-size in `em`; the base size is set per `size`;
  - border uses `groupTone`; the cards behind use `-soft`, with fixed ratios .94/.88/.82, opacities .85/.55/.3, and blur only when `size='carousel'`.
- The face has three states:
  - **normal**: "N từ · M đã thuộc", name, count in `-ink` + "thẻ chờ", "tiếp theo <next_lemma>";
  - **done**: "✓ Xong hôm nay", "ôn gần nhất <last_reviewed.lemma>";
  - **empty**: "nhóm trống", "Chưa có từ", "Thêm từ để bắt đầu".
  - When `next_lemma` or `last_reviewed` is missing, the footer line is left out.
- `StageBar({ segments: { size: number; fill: number; tone: string }[], labels?: ReactNode[] })` is a `figure`. Its `aria-label` is passed in.

- [ ] **Step 1: Write the failing tests:**
  - The normal face shows "24" and "tiếp theo mitigate".
  - The done face shows "✓ Xong hôm nay" and "ôn gần nhất take for granted".
  - The empty face shows "nhóm trống", "Chưa có từ" and has no cards behind.
  - The number of behind cards equals `stackDepth`.
  - DeckButtons, for each `deckPlan` case in `deck-actions.test.ts`:
    - exactly one link has the primary class set, or none when `primary` is null;
    - hrefs keep the `review?group=…&mode=` and `recall?group=` forms;
    - both links carry `data-google-vignette="false"`.
- [ ] **Step 2: Run** `pnpm vitest run L/groups/group-pieces.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the group stack, stage bar and new deck buttons`.

### Task M3.4: New data on the web

**Files:**
- Modify: `L/groups/groups-api.ts` (types).
- Create: `L/today/last-session.ts` with `useLastSession()` (key `['practice','sessions','last']`).
- Modify: `src/app-ui/test-utils.tsx` (default route `GET /v1/practice/sessions/last` → 204).
- Modify: `e2e/support/mock-api.ts` (`signedInAs` scripts the same 204).
- Test: `L/today/last-session.test.tsx`.

**Interfaces:**
- `GroupSummary` gains:
  - `next_lemma?: string | null`;
  - `last_reviewed?: { lemma: string | null; at: string } | null`.
- `LastSessionView = { id; group_id: string | null; local_date: string; last_answer_at: string; finished: boolean; questions: number; correct: number; wrong_count: number; wrong_lemmas: string[] }`.
- `useLastSession()` returns `LastSessionView | null`. A 204 becomes `null` (`ApiClient.get` resolves `undefined`).

- [ ] **Step 1: Write the failing tests:**
  - 204 → `data === null`;
  - 200 → the exact object;
  - 500 → `isError`.
- [ ] **Step 2: Run** `pnpm vitest run L/today/last-session.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same test, then `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): read next card, last review and last session`.

### Task M3.5: Hôm nay

**Files:**
- Move: `C/page.app.tsx` → `C/(today)/page.app.tsx`.
- Create: `C/(today)/loading.app.tsx` (skeleton of `117:4425`).
- Rewrite: `L/today/TodayPage.tsx`, `QuickAddBox.tsx`.
- Modify: `L/groups/TopicSuggestions.tsx` (rows instead of cards, first 4).
- Modify: `L/today/today.test.tsx`, `e2e/app/m2.spec.ts:86-99`, `e2e/app/overflow.spec.ts:67-84`, `messages/{vi,en}.json` (`App.today`).

**Behaviour:** follows `117:4425` / `117:4712` and M3 Figma A §1. Phone order is M3 Figma A §1.2.
- **Hero "Ôn tiếp"**: the first group of `sortForToday` with waiting > 0.
  - Border and big number use `groupTone`.
  - The bar shows priority / due / new, with a legend.
  - Học · Ôn buttons.
  - Big number with "thẻ chờ hôm nay".
- **"Lần luyện gần nhất"**: only when `useLastSession()` has data.
  - The date comes from `local_date`.
  - The group name comes from `useGroups` by `group_id`; it is left out when not found.
  - Correct/wrong bar and pills.
  - "Sai: …" lists `wrong_lemmas`.
  - Links "Luyện lại từ sai →" (`/app/practice/weak`) and "Mở lịch học" (`/app/practice/history` until M6).
- **"Nhóm của bạn"**:
  - up to 4 `GroupStack size="today"` cards of the other groups with waiting > 0; each card is a link to `/app/group?id=`;
  - "Xem tất cả N nhóm →";
  - the line "Xong hôm nay: … · Chưa có từ: …".
- **"Tạo nhóm nhanh theo chủ đề"**: topic rows.
- **Side column** from `xl` (`PageColumns`):
  - "Thêm từ vừa gặp";
  - "Từ lâu chưa ôn";
  - "Từ theo ngăn": flat squares in `stage-N-solid`, bar width = due / total, as the code does today.
- **No groups**: the empty block, with `ui/Button` "Tạo nhóm đầu tiên".
- **All done**: "Xong hết thẻ hôm nay. Mai ôn tiếp."
- The card ⋯ menu is gone (rename and delete live on Một nhóm).

- [ ] **Step 1: Write the failing tests in `today.test.tsx`:**
  - `sessions/last` 200 → text "14/20", "Sai: deteriorate, allocate, viable, scrutiny", and link "Luyện lại từ sai →" to `/vi/app/practice/weak`.
  - `sessions/last` 204 → no text "Lần luyện gần nhất"; the hero still shows.
  - `sessions/last` 500 → the hero still shows and there is no `alert`.
  - 8 groups → exactly 4 cards in the list "Nhóm của bạn", none of them the hero group; link "Xem tất cả 8 nhóm" to `/vi/app/groups`.
  - The note line lists the done and empty group names.
  - The hero's Ôn link has the primary class when `deckPlan` gives `recall`.
  - Delete the tests of the removed menu and the 6-card cap.
- [ ] **Step 2: Run** `pnpm vitest run L/today`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run:**
  - `pnpm vitest run L/today` → PASS;
  - `pnpm cf:docker e2e/app/m2.spec.ts e2e/app/m3.spec.ts e2e/app/overflow.spec.ts` → PASS. Overflow adds the long name on a Hôm nay card at 390.
- [ ] **Step 5: Commit** `feat(web): rebuild today with the next review and last practice`.

### Task M3.6: Nhóm: carousel and group picker

**Files:**
- Rewrite: `L/groups/GroupListPage.tsx` as the carousel page.
- Create: `L/groups/GroupCarousel.tsx`, `L/groups/GroupPicker.tsx`, `C/groups/loading.app.tsx`.
- Modify: `L/groups/group-list.test.tsx` (rewrite), `e2e/app/m2.spec.ts:101-138`, `messages/{vi,en}.json` (`App.groups`).

**Behaviour** (M3 Figma A §2, §3; motion doc §3; prototype `n2*` functions):
- **Header**:
  - title "Nhóm của bạn";
  - mono line "{due} thẻ chờ trong {groups} nhóm · …" (desktop and phone texts differ);
  - picker button showing the centre group, with its colour square;
  - "+ Tạo nhóm" opens the create dialog.
- **Carousel** (`role="region"`, labelled):
  - slots from `carouselSlots`;
  - transforms `translateX(k·step) scale(1/.83/.66)`, opacity 1/.7/.4, blur 0/3.6/7.2 px; step 230 px desktop, 128 px phone; phone shows `k = ±1` only;
  - side stacks are `inert` and `aria-hidden`; only the centre stack is a link (to `/app/group?id=`);
  - halo in the centre group's `-wash`.
- **Changing group**:
  - arrows (desktop), `←` `→`, swipe > 40 px, horizontal wheel (`|deltaX| ≥ 12`, at most once per 380 ms);
  - picking a group further than 3 steps away jumps with no animation;
  - an `aria-live="polite"` line reads "{name}, {waiting} thẻ chờ".
- **Below the carousel**:
  - "nhịp ôn: mới → 30 ngày" with `StageBar` from `rhythm` in the group colour;
  - Học · Ôn;
  - "Xem nhóm →";
  - "Thêm từ" (desktop) opens add-word locked to that group;
  - rows rise in with the motion doc numbers.
- **Picker** (key `F`, or the button) is a react-aria `Popover` + `ListBox`:
  - search "Tìm trong N nhóm", diacritic-insensitive;
  - captions "còn thẻ chờ", "xong hôm nay", "chưa có từ";
  - the selected row has the `-wash` background and a check;
  - `↑` `↓`, `Enter` goes to the group, `Esc` closes and returns focus to the button;
  - desktop footer "↑ ↓ chọn · ↵ tới nhóm · Esc đóng".
- **Key `↓`** opens the centre group.
- The old filter, search box, dashed tile and per-card menu are removed. `TopicSuggestions` stays only on Hôm nay.

- [ ] **Step 1: Write the failing tests:**
  - 5 groups: the centre link is the first of `carouselOrder`.
  - `→` makes the next group the centre, and the live line reads "Đề 9 · Listening, 18 thẻ chờ".
  - `←` from the first group wraps to the last.
  - Exactly one link inside the region; side stacks have the `inert` attribute.
  - `F` opens the picker. Typing "de 9" leaves "Đề 9 · Listening". `Enter` makes it the centre and closes the picker.
  - `F` typed into the picker search does not reopen it.
  - `←` typed into the quick-add input does not move the carousel.
  - 1 group: no arrow buttons.
  - 2 groups: exactly 2 stacks are rendered.
  - "+ Tạo nhóm" → dialog "Tạo nhóm". Keep the create, rename-conflict, limit, name-taken and double-submit tests of the old `group-list.test.tsx:119-204`.
- [ ] **Step 2: Run** `pnpm vitest run L/groups/group-list.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same test → PASS; then `pnpm cf:docker e2e/app/m2.spec.ts e2e/csp.spec.ts e2e/app/overflow.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the group list as a carousel with a picker`.

### Task M3.7: Một nhóm and the open/close FLIP

**Files:**
- Rewrite: `L/groups/GroupPage.tsx`.
- Create: `L/groups/flip.ts` with `rememberRect(key, el)`, `useFlipFrom(key, ref)` and `useCloseFlip(key)`.
- Create: `C/group/loading.app.tsx`.
- Modify: `L/groups/group-page.test.tsx`, `e2e/app/cai-thien-a-group.spec.ts`, `e2e/app/overflow.spec.ts:36-47`, `messages/{vi,en}.json` (`App.group`).

**Behaviour** (`84:3552` / `84:3749`, M3 Figma B §1):
- **Page head**:
  - back link "Nhóm của bạn";
  - group halo;
  - `GroupStack size="page"`;
  - meta "N từ · tạo ngày … · M đã thuộc";
  - title with the colour square;
  - chips "4 ưu tiên", "14 đến hạn", "6 mới" with numbers in `-ink`;
  - `StageBar` from `rhythm`, with stage labels on desktop.
- **Actions**: Học · Ôn, "Thêm từ" (muted text button), ⋯ menu (rename, "Học tất cả N từ", delete; unchanged).
- **Word list**:
  - "Toàn bộ N từ";
  - filter chips replace the `Select`: toggle buttons with `aria-pressed`, labels and counts as `filterCount` gives today. They wrap on desktop and form one horizontal-scroll row on phones;
  - rows: 5 columns on desktop (word, POS, meaning, stage dot + "Ngăn …", status); phone keeps word, meaning and status;
  - "Xem thêm từ · còn N từ".
- **"Bỏ … khỏi nhóm"** stays as a muted icon text button at the end of each row, even though Figma draws none: the design keeps this dialog. Record it as a ruling.
- **The card preview (3D flip) is removed**, as Figma draws it (owner QM3-1, 10/11/2026: "Bỏ như Figma").
- **FLIP:**
  - the carousel calls `rememberRect('group-stack', centreStack)` before navigating;
  - the page head runs the 380 ms FLIP from that rect, and the other parts enter from `blur(12px) translateY(12px)`, 340 ms, 22 ms apart;
  - the back link plays the reverse (150 ms dissolve, FLIP back);
  - no remembered rect, or reduced motion: no animation.

- [ ] **Step 1: Write the failing tests:**
  - Chips: pressing "Ngăn 1 ngày2" sets `aria-pressed="true"` and the rows become `['deploy','release']`. Pressing "Đến hạn" calls `…&section=due` once.
  - The page head shows the three chips with the right numbers.
  - `figure` "nhịp ôn": 6 segments, with fills matching `cells[n].due`.
  - No `preview-slide` (the preview is removed). The old preview tests are deleted.
  - `useFlipFrom` with no remembered rect does not call `element.animate`. With a rect and motion allowed, it calls it once, with duration 380.
  - The remove, menu, empty, not-found and key-`N` tests of `group-page.test.tsx` keep passing, adapted from `Select` to chips.
- [ ] **Step 2: Run** `pnpm vitest run L/groups/group-page.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same test → PASS; then `pnpm cf:docker e2e/app/cai-thien-a-group.spec.ts e2e/app/overflow.spec.ts e2e/app/m2.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the group page with the carousel flip`.

### Task M3.8: Từ lâu chưa ôn and Chủ đề

**Files:**
- Rewrite the views of `L/groups/BacklogPage.tsx` and `L/groups/TopicPickerPage.tsx` (behaviour, queries and writes unchanged).
- Create: `L/groups/FloatingBar.tsx`.
- Modify: `backlog.test.tsx`, `topic-picker.test.tsx` (both now `chrome: true`), `e2e/app/m2.spec.ts:140-169`.

**Behaviour:** variants 8A and 9A (`97:3085` / `97:3239`, `98:3127` / `98:3297`; M3 Figma B §2–3).
- Header with the big count. The backlog count uses `wm-fail`; the topic count uses `wm-ink`.
- Explainer with the three bold terms (backlog).
- List card with select-all.
- Rows:
  - the backlog shows the overdue bar on desktop and "NN ngày";
  - the topic shows a disabled row "đang học · <group>" with a group-colour dot.
- "đang có 6 / N từ" and "Xem thêm".
- `FloatingBar` (`radius/modal`, `shadow-wm-pop`) at the bottom, above the phone tab bar:
  - backlog: "Đã chọn N từ", "Bỏ khỏi việc học" (delete tone), "Học lại N từ";
  - topic: "thêm vào" + `ui/Select` + "Thêm N từ đã chọn →".
  - The bar shows only while something is selected.
  - The backlog "Học lại cả N từ" stays in the header.

- [ ] **Step 1: Write the failing tests:**
  - The bar is absent with nothing selected.
  - After ticking 2 rows the bar shows "Đã chọn 2 từ".
  - A topic row already learned has no checkbox and shows text "đang học · Công việc".
  - The old assertions (batches of 100, keys, partial failure keeps the dialog) keep passing.
- [ ] **Step 2: Run** `pnpm vitest run L/groups/backlog.test.tsx L/groups/topic-picker.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same tests → PASS; then the e2e lines above → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the backlog and topic pages with floating bars`.

### Task M3.9: The five group dialogs

**Files:**
- Modify: `L/groups/GroupDialogs.tsx`, and the inline dialogs in `GroupPage.tsx` (remove a word) and `BacklogPage.tsx` (forget N words), moving them to `ui/Dialog`, `ui/TextField` and `ui/Button`.
- Test: the existing dialog tests.
- Delivery record: one screenshot of each dialog at 390 and 1440.

**Behaviour:**
- Motion GM15, through `ui/Dialog`.
- The confirm dialogs follow the "Xác nhận xóa" card (M3 Figma B §4):
  - Bricolage 20 title;
  - a `wm-fail-soft` warning block for what is lost;
  - the danger button;
  - the keep or cancel action as a `ui/Button` `secondary`.
- The copy stays the same.
- Create and rename keep the 60-character counter.

- [ ] **Step 1: Write the failing test:** the delete dialog's warning block has `role="note"` and the text /12 từ chỉ có trong nhóm này/. All existing dialog assertions keep passing.
- [ ] **Step 2: Run** `pnpm vitest run L/groups`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm vitest run L/groups` → PASS; `rg "@/app-ui/" src/features/learner/{today,groups} --glob '!*.test.*'` → no output.
- [ ] **Step 5: Commit** `feat(web): move the group dialogs to the new kit`.

### Task M3.10: M3 check, screenshots, PR

**Files:**
- Modify: `e2e-shots/shots.spec.ts` (set `gm-m3`: Hôm nay, Nhóm, Nhóm with picker open, Một nhóm, Từ lâu chưa ôn, Chủ đề, five dialogs; 390 and 1440).
- Modify: `docs/deliveries/giao-dien-moi.md` (M3 as-built), `docs/deliveries/giao-dien-moi-rulings.md`.

- [ ] **Step 1: Run the checks.**
  - Web: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm cf:docker`.
  - Admin: the four checks.
  - Record the counts.
  - Measure the carousel frame rate on Nhóm with DevTools Performance at 4× CPU slowdown (design §8.5), and record the number.
- [ ] **Step 2: Take screenshots:** `SHOTS_MILESTONE=gm-m3 pnpm shots`, placed next to their Figma frame IDs.
- [ ] **Step 3: Commit** `test(web): add the gm-m3 screenshot set` and `docs(web): record m3 as built`.
- [ ] **Step 4: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild today and groups with the carousel`. Merge after CI is green and the owner says yes.

## Part 3 self-review notes (10/11/2026)

**Coverage:**
- §9 M3 table:
  - Hôm nay → M3.5; Nhóm and picker → M3.6; Một nhóm → M3.7; Từ tồn đọng and Chủ đề → M3.8.
  - The five dialogs without frames → M3.9.
  - Học · Ôn (GM17) → M3.3.
  - The QR2 fields → M3.4, M3.5, M3.6.
  - "Luyện lại từ sai →" → M3.5.
- §7.3, §7.4 → M3.1, M3.2.
- §8.2 Nhóm, §8.4, §8.5 → M3.6, M3.7.
- The roadmap's route loading files → M3.5, M3.6, M3.7.

**Decisions this part makes.** Each is recorded as a ruling when executed.
- Stack depth follows the chosen prototype (`layers`); Hôm nay caps it at 2.
- "nhịp ôn": segment width ∝ the stage's word count, fill ∝ its due cards. This is the prototype `rhythm`, and it matches the Figma numbers.
- "Từ theo ngăn" keeps the code's due/total width. Figma's fills do not follow its own numbers.
- Group `-ink` takes Figma's darker inks (≥ 4.5:1), not design §7.4's "same colour, ≥ 3:1". Green and blue are mixed with ink.
- Carousel order: `sortForToday`, with empty groups last.
- Side stacks are `inert`: design §8.5 wins over the prototype's click-to-switch.
- Hôm nay shows 4 other groups. Done and empty groups go into one text line, as Figma draws.
- The card menu leaves Hôm nay and Nhóm. Rename and delete stay on Một nhóm.
- The Nhóm list's filter, search box and dashed "Tạo nhóm mới" tile are replaced by the picker and "+ Tạo nhóm".
- "Bỏ … khỏi nhóm" stays on Một nhóm rows, though Figma draws none.
- The card preview on Một nhóm is removed: owner decision QM3-1 (10/11/2026), not a ruling. Say so in the M3 PR description.
- StageChip and WordChip are not built in M3: none of these frames uses them (M3 Figma A §7). They come with M5 if Học or Ôn needs them.

**Open:** none.

---

# Part 4 — M4 Tra từ, trang một từ, Thêm từ (branch `feat/giao-dien-moi-m4`)

**Goal:** Rebuild Tra từ as "Từ hóa thẻ", the one-word page, the five add-word overlays and the three word dialogs without frames. Move search into the top bar. Add `ui/SpeakButton`. Add the three fields Tra từ needs to `GET /v1/words`.

**Inputs:**
- Design §5.4 (search box), §5.5, §5.7, §7.5, §8.2 (Tra từ), §9 M4.
- Motion doc §4 ("Từ hóa thẻ", toast 2.4 s) and §5 (dialogs).
- The owner's motion artifact `https://claude.ai/artifact/6z635GjwYNpctydnMoNHJD`: read it with the Artifact tool's `read` action. The motion doc wins where the two differ.
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-m4.md` ("M4 code §n").
- Figma facts `…_FIGMA_FACTS_2026-11-10-m4-a.md` (Tra từ, word page; "M4 Figma A §n") and `…-m4-b.md` (overlays; "M4 Figma B §n").
- Paths below are under `apps/web/` unless they start with `apps/api/`. `C/` = `src/app/[locale]/app/(member)/(chrome)/`.

**Depends on M3:** Tra từ and the Chọn nhóm overlay reuse `GroupStack`, `groupTone`, `carouselOrder` and `StageBar`.
- Run `git switch -c feat/giao-dien-moi-m4 origin/refactor/giao-dien-moi` once M3 is merged.
- Then run `git merge docs/giao-dien-moi-plan-4`.

## Part 4 constraints

- **API:**
  - The only API change is additive, on `GET /v1/words`: `ipa`, `example`, `total` (M4.1). This follows the owner's QR2 ("toàn bộ thêm API" for data Figma needs).
  - Every other request body and endpoint is unchanged.
  - Request bodies pinned by tests stay identical: quick-add, sentences, bulk, picker add, my-word patch and delete.
- **Copy:**
  - Overlay 1's save button becomes "Lưu" through a new key, `App.addWord.saveShort`.
  - The landing page keeps `App.addWord.save` ("Lưu {word}", `components/landing/copy.ts:52`).
- **Speech:**
  - Speaker buttons keep today's chain: the pre-made file, then the browser voice on failure, then dimmed "Đang tạo giọng đọc".
  - Review and practice keep working through re-exports at the old `app-ui` paths until M5.
- **One-letter keys** (`/`, `N`) do nothing when focus is in an input, a select, a contenteditable element or a dialog (`[role=dialog]`).

## Part 4 Review Focus

1. **Search box in the top bar.**
   - Text typed there stays when Lan switches tabs.
   - It resets when the URL's `q` or `level` changes. This is the M1 rule, pinned today by `chrome.test.tsx:100-121`; move those tests over.
   - `/` pressed inside an open dialog does not move focus to the box.
   - Pinned in M4.3.
2. **Clicking a group stack on Tra từ.**
   - A double click sends one `POST`.
   - A group that already has the shown sense reads "✓ đã có" and cannot be clicked.
   - After a successful add, the caption turns to "✓ đã có" and the toast stays 2.4 s.
   - Pinned in M4.5.
3. **A dictionary entry with no IPA or no example:** the entry renders without those lines and without empty gaps. Pinned in M4.5.
4. **The learner's own word.**
   - On Tra từ it shows "của tôi".
   - On the word page it shows a single US speaker, and "Sửa từ" and "Xóa từ" are reachable.
   - Deleting it lands on Tra từ.
   - Pinned in M4.6.
5. **AI lookup in Overlay 4 for a Free learner.**
   - When the quota runs out: "Hết lượt tra AI." with the refill time, and no save button.
   - `entitlement-required` shows the locked state.
   - A `409 ai-in-progress` resend reuses the same key.
   - Today's tests in `ai-lookup.test.tsx` stay green. Pinned in M4.7.

### Task M4.1: API — three fields on `GET /v1/words`

**Files:**
- Modify the Content module's words list: the service, query and schema behind `GET /v1/words` under `apps/api/src/content/`. Find them through the route.
- Modify the Content module's unit tests.
- Modify `scripts/smoke-giao-dien-moi.mjs`, adding a check, and `apps/web/src/features/learner/lookup/lookup-api.ts` (types).

**Interfaces:** response `{ items: WordRow[], next_page_token, total: number }`. `WordRow` gains:
- `ipa: string | null`: the first visible sense's UK IPA, else its US IPA, else the custom IPA of a private sense.
- `example: string | null`: the first example of that sense.
- `total`: the number of words matching the filters, counted with the same visibility rule as the list.

- [ ] **Step 1: Write the failing unit tests:**
  - A catalog word with UK and US IPA returns the UK one.
  - A word with only US IPA returns the US one.
  - A private word returns its custom IPA.
  - A word with no IPA returns `null`.
  - `example` is the first example; with no example it is `null`.
  - `total` equals the number of matching visible words for a filter whose results span 3 pages of 20.
- [ ] **Step 2: Run** the Content unit tests. Expected: FAIL.
- [ ] **Step 3: Implement** in the Content module only, following D3 (no reads of other modules' tables).
- [ ] **Step 4: Run:**
  - `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build` in `apps/api` → PASS;
  - `pnpm smoke:giao-dien-moi` on a fresh DB → PASS, with the new check comparing `total` and one row's `ipa` and `example` against `GET /v1/words/{lemma}`. Append its output to `docs/deliveries/giao-dien-moi-smoke-output.txt`.
- [ ] **Step 5: Commit** `feat(api): add ipa, example and total to the word list`.

### Task M4.2: `ui/SpeakButton`, pronunciation line, dialog sizes, toast timeout

**Files:**
- Move: `src/app-ui/SpeakButtons.tsx` → `src/ui/SpeakButton.tsx` (`Pronounce` renamed `SpeakButton`; `SpeakWord`, `SpeakSentence` kept).
- Move: `src/app-ui/PronunciationLine.tsx` → `src/ui/PronunciationLine.tsx`.
- Move both test files with them. The old paths become re-exports.
- Modify: `src/ui/Dialog.tsx` (`size?: 'md' | 'lg' | 'xl'`, which replaces `wide`; `xl` = 860 px for Overlay 4).
- Modify: `src/ui/Toast.tsx` (per-call `timeout`).

**Interfaces:**
- `SpeakButton({ text, voice: 'uk'|'us', audioUrl, size?: 28|32 })` draws Figma `Nút loa` (`54:657`): `wm-accent-soft` circle, speaker icon 17.
- `showToast(text, tone, { timeout?: number })`. The default stays 5000 ms.
- `Dialog` keeps the `wide` prop as an alias for `lg` until M8, so untouched callers compile.

- [ ] **Step 1: Write the failing tests:**
  - `size="xl"` gives a dialog whose class names contain the 860 px max width.
  - `showToast('x', 'success', { timeout: 2400 })` is gone after 2 400 ms and still present at 2 399 ms (fake timers).
  - The 14 moved speech tests keep passing at the new paths.
- [ ] **Step 2: Run** `pnpm vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS; review and practice still import through the re-exports.
- [ ] **Step 5: Commit** `feat(web): add speak button, dialog sizes and toast timeout to ui`.

### Task M4.3: Search in the top bar

**Files:**
- Create: `src/app-chrome/TopSearch.tsx`.
- Modify: `TopBar.tsx` (put the box inside its own `Suspense`); `AppChrome.tsx` (remove `SearchStrip`).
- Delete: `SearchStrip.tsx`.
- Move: the strip's tests to `app-chrome/top-search.test.tsx` (`chrome.test.tsx:100-121`, `lookup.test.tsx:97-124`, `m3-review.test.tsx:168-179`).
- Modify: `e2e/app/m3.spec.ts:136-144`.

**Behaviour:** desktop only (frame `54:502`).
- "Tìm từ" box with a "/" key cap; no level select. Enter goes to `/app/lookup?q=…`.
- On Tra từ, the page's own big box takes `/` and the top-bar box is hidden.
- Phones keep the magnifier link to Tra từ (`PhoneHeader`).
- The level filter lives only on Tra từ (M4.5).

- [ ] **Step 1: Write the failing tests:**
  - From `/vi/app/groups`: `/` focuses the box; typing "left" and Enter leads to exactly `/vi/app/lookup?q=left`.
  - Typed text stays when `?id=` changes and resets when `q` changes.
  - `/` inside an open dialog leaves focus in the dialog.
  - On `/vi/app/lookup` the top-bar box is not rendered.
- [ ] **Step 2: Run** `pnpm vitest run src/app-chrome`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same tests → PASS; then `pnpm cf:docker e2e/app/m3.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): move word search into the top bar`.

### Task M4.4: The five overlays

**Files:**
- Modify: `L/add-word/{AddWordSheet,AddSentenceSheet,BulkAddSheet,AiLookupPanel,AiLookupResult,DeckPickerDialog,GroupPicker,EditSuggestionForm}.tsx` → `ui/*` and `wm-` tokens.
- Modify: `add-word-context.tsx` (load `AddWordSheet` with `next/dynamic` on the first open; design §5.7).
- Modify: `messages/{vi,en}.json` (`saveShort`).
- Tests: the add-word test files (M4 code §7).

**Behaviour:** M4 Figma B.
- **All five:** title row with a 36 px close button; footer "Hủy" (TextButton muted) + primary button.
- **Save labels:**
  - Overlay 1 "Lưu";
  - Overlay 2 "Lưu câu";
  - Overlay 3 "Thêm cả loạt";
  - Overlay 4 "Sửa rồi lưu";
  - Overlay 5 "Lưu vào nhóm" (or "Tạo nhóm và lưu", as today).
- **Overlay 1:**
  - the inflection row "went → go · quá khứ của go" with the highlighted word;
  - meaning rows with a radio, "pos · level" and the meaning;
  - "đã có trong nhóm" rows have a check and no radio;
  - group select.
- **Overlay 4:**
  - `size="xl"`, two columns on desktop: left, the meaning list with "từ điển" / "AI gợi ý" badges and the quota line "đã dùng 1 lượt tra AI · còn N"; right, the preview card "thẻ sẽ lưu · xem trước";
  - the warning "AI có thể sai…";
  - one column on phones, with no rotation.
- **Overlay 5:**
  - search "Tìm hoặc tạo nhóm…";
  - "dùng gần đây", then "tất cả nhóm (N), A–Z";
  - rows with the colour square (`groupTone`), name, a six-segment mini `StageBar` (none when 0 words) and "N từ";
  - the list scrolls inside the dialog.
- **Overlay 3:** filter summary, "Vào nhóm" select, two notes.

- [ ] **Step 1: Write the failing tests:**
  - Overlay 1's button name is "Lưu"; pressing it sends the unchanged quick-add body.
  - Overlay 5 rows show a colour square and a `figure` for a group with words, and no `figure` for "Du lịch Nhật" with 0 words.
  - Overlay 4 at desktop width renders the preview card region "thẻ sẽ lưu · xem trước".
  - Opening the add-word dialog for the first time renders it, through `next/dynamic` (await `findByRole('dialog')`).
  - Update every test that pins "Lưu {word}" in the add flow (M4 code §7.5).
  - Landing tests stay unchanged.
- [ ] **Step 2: Run** `pnpm vitest run L/add-word`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm vitest run L/add-word` → PASS; `pnpm test` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the add word, sentence, bulk, ai and group dialogs`.

### Task M4.5: Tra từ "Từ hóa thẻ"

**Files:**
- Rewrite: `L/lookup/LookupPage.tsx`, `LookupFilters.tsx`.
- Create: `L/lookup/DictionaryPage.tsx`, `L/lookup/LiftedCard.tsx`, `L/lookup/StackTargets.tsx`, `C/lookup/loading.app.tsx`.
- Modify: `L/lookup/lookup.test.tsx`, `messages/{vi,en}.json` (`App.lookup`).

**Behaviour** (`85:3218` / `85:3667`, M4 Figma A §1). Phones show the card and stacks first, the dictionary page after.
- **Search box:** the big "Tìm từ, ví dụ: mitigate" box with a "/" key cap.
- **Filter sentence:** "{total} từ trình độ {level}, chủ đề {topic}, loại từ {pos}." Each value is a button that opens a react-aria menu (`Popover` + `ListBox`); today's `URL` params are kept.
- **Tools row:**
  - "chỉ từ của tôi" (`mine`);
  - "Thêm cả loạt vào nhóm" (Overlay 3, under today's `canBulk` rule);
  - "Xóa lọc".
- **Dictionary page:**
  - running header: first word · "trang N" · last word;
  - letter headers;
  - entries: headword, `ipa`, POS in italics, level, "của tôi" tag; "1" + meaning; the example in italics with the form highlighted (`highlightWord`);
  - footer "— N —" and "Trang sau →"; "← Trang trước" from page 2 (cursor tokens kept on a client-side stack).
- **Selection:**
  - hover, focus or click selects an entry; `↑` `↓` move within the list;
  - the selected entry stays as a dashed ghost;
  - the first entry is selected by default.
- **Lifted card**, for the selected entry, from `GET /v1/words/{lemma}`:
  - "pos · level · topic";
  - headword;
  - UK / US with `SpeakButton`;
  - meaning;
  - example;
  - footer "<group> · ngăn N ngày" from `GET /v1/items?sense_ids=` of the first visible sense.
- **Stacks:** "Thả vào chồng để thêm", the first 6 groups of `carouselOrder` as `GroupStack` at a 0.55 scale.
  - Caption "+ thêm vào đây", or "✓ đã có" when the item's `group_ids` contain the group.
  - A click sends `POST /v1/groups/{id}/items { sense_id }` for the card's sense (`useSubmitOnce`), then the toast "Đã thêm “…” vào nhóm “…”." (2 400 ms).
- **Links:**
  - "Nhóm khác hoặc tạo nhóm mới" opens Overlay 5 for that sense;
  - "Mở trang từ →".
- **Motion:** the motion doc's §4 lift and arrive; with reduced motion, no lift.
- **Empty result:** today's empty state ("Thêm từ này" opens Overlay 1).

- [ ] **Step 1: Write the failing tests:**
  - The URL filters are sent as today, and the sentence reads "24 từ trình độ B1, chủ đề Công việc, loại từ tất cả." (`total` 24).
  - Choosing "A2" from the level menu replaces the URL.
  - Entries are grouped under letter headings "B", "C".
  - An entry without `ipa` and `example` has no empty line.
  - `↓` moves the selection, and the card's headword changes.
  - Clicking the "Đề 12 · Writing" stack posts one body `{ sense_id }`; a double click still posts once; then its caption reads "✓ đã có".
  - The "Công việc · B1" stack (already has the sense) is disabled.
  - "Trang sau →" requests `page_token=p2`; "← Trang trước" returns to page 1 without a request (cached).
- [ ] **Step 2: Run** `pnpm vitest run L/lookup`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same tests → PASS; then `pnpm cf:docker e2e/app/m3.spec.ts e2e/app/overflow.spec.ts` → PASS. Overflow adds a 60-character lemma on the card at 390.
- [ ] **Step 5: Commit** `feat(web): rebuild lookup as a dictionary page with group stacks`.

### Task M4.6: Trang một từ and the three word dialogs

**Files:**
- Rewrite: `L/word/{WordPage,SenseBlock,FormsLine,LearningBlock}.tsx`.
- Restyle: `MyWordDialogs.tsx`, `SavedSentencesDialog.tsx`.
- Create: `C/word/loading.app.tsx`.
- Modify: `L/word/word-page.test.tsx`, `my-word.test.tsx`, `messages/{vi,en}.json` (`App.word`).

**Behaviour** (`118:4413` / `118:4714`, M4 Figma A §2):
- **Head:**
  - back link "Tra từ";
  - title, 84 px desktop / 56 px phone;
  - per part of speech, rows "UK /…/" and "US /…/", each with a `SpeakButton` (one US speaker for a private sense);
  - row "dạng chia", headword in SemiBold.
- **Tabs:** anchor links "Nghĩa N", "Câu đã gặp N", "Dạng chia", "Cùng chủ đề". On phones they wrap to 2 rows.
- **Meanings:** by part of speech ("noun · 2 nghĩa"). Each sense row has:
  - number, meaning, English definition (catalog only), example with highlight and a sentence speaker;
  - "N câu đã gặp", which opens Câu đã gặp;
  - the stage tag "Ngăn 3 ngày · Đề 12 · Writing", or a TextButton add "Thêm vào nhóm" (Overlay 5).
- **"Câu bạn đã gặp":**
  - every sentence of the learned senses, from `GET /v1/senses/{id}/sentences`, one request per learned sense;
  - meta "nghĩa N · <meaning> · ghi ngày dd/mm/yyyy";
  - "Thêm câu đã gặp" opens Overlay 2. When more than one sense is learned, Overlay 2 shows a sense `Select`.
- **Right column** from `lg`; on phones "Bạn đang học" moves after the head and "Cùng chủ đề" goes last.
  - "Bạn đang học": stage bar with labels, "Ôn tiếp", each group's stage tag, "Thêm vào nhóm khác".
  - "Cùng chủ đề": topic tile, "trình độ A2–B1", 8 word chips, "Xem chủ đề … →" to `/app/topic?code=&level=`.
- **Own word:** "Từ của tôi" and "AI gợi ý" chips in the head. "Sửa từ" and "Xóa từ" are TextButtons in the head (not drawn; record as a ruling). The three dialogs (Sửa từ, Xóa từ, Câu đã gặp) follow `ui/Dialog` and M3's confirm look.
- **Not found:** today's empty state.

- [ ] **Step 1: Write the failing tests:**
  - The head shows "UK", "/ˈrek.ɔːd/", and two speaker buttons named "Nghe giọng Anh" / "Nghe giọng Mỹ" (`App.speak.uk|us`) per part of speech.
  - Tab "Câu đã gặp 2" is a link to `#cau-da-gap`.
  - A learned sense shows "Ngăn 3 ngày · Đề 12 · Writing".
  - An unlearned sense has the button "Thêm vào nhóm", which opens dialog "Lưu vào nhóm".
  - "Câu bạn đã gặp" lists 2 sentences with "ghi ngày 05/11/2026".
  - Own word: buttons "Sửa từ" and "Xóa từ"; deleting calls `DELETE /v1/my-words/{entry_id}` then `hardReplace('/vi/app/lookup')`.
  - The old dialog tests keep passing.
- [ ] **Step 2: Run** `pnpm vitest run L/word`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same tests → PASS; then the e2e specs that open `/app/word` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the word page with uk and us voices`.

### Task M4.7: M4 check, screenshots, PR

**Files:**
- Modify: `e2e-shots/shots.spec.ts` (set `gm-m4`: Tra từ, word page (catalog and own), the five overlays, the three dialogs; 390 and 1440).
- Modify: `docs/deliveries/giao-dien-moi.md` (M4 as-built), `giao-dien-moi-rulings.md`.

- [ ] **Step 1: Run the checks:**
  - `rg "@/app-ui/" src/features/learner/{lookup,word,add-word} --glob '!*.test.*'` → no output;
  - web: lint, typecheck, test, `cf:docker`; API: lint, typecheck, test, build; admin: the four checks.
  - All pass. Record the counts.
- [ ] **Step 2: Take screenshots:** `SHOTS_MILESTONE=gm-m4 pnpm shots`, next to their Figma frame IDs.
- [ ] **Step 3: Commit** `test(web): add the gm-m4 screenshot set` and `docs(web): record m4 as built`.
- [ ] **Step 4: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild lookup, the word page and add word dialogs`. Merge after CI is green and the owner says yes.

## Part 4 self-review notes (10/11/2026)

**Coverage:**
- §9 M4 table: Tra từ → M4.5; trang một từ → M4.6; Overlays 1–5 → M4.4.
- Sửa từ, Xóa từ and Câu đã gặp → M4.6.
- Roadmap row 4: `SpeakButton` → M4.2; top-bar search replacing `SearchStrip` → M4.3; add-word dialogs → M4.4.
- §5.5 loading files → M4.5, M4.6. §5.7 `next/dynamic` → M4.4. §8.2 Tra từ motion → M4.5.

**Decisions this part makes.** Each is recorded as a ruling when executed.
- `GET /v1/words` gains `ipa`, `example` and `total`, under the owner's QR2 ("toàn bộ thêm API"). The Figma dictionary page shows IPA, an example and a count; today's list has none of them.
- A stack click adds the sense shown on the card. Other senses go through "Mở trang từ →".
- The 6 stacks are the first 6 groups of `carouselOrder`.
- Pagination: "Trang sau →" plus "← Trang trước" on cursor tokens. The cursor API has no page numbers to jump to.
- The level filter leaves the top bar: Figma's top bar has none, and Tra từ's filter sentence carries it.
- On Tra từ the top-bar box hides, and `/` focuses the page's box.
- Overlay 1's "Lưu" uses a new key, so the landing demo keeps "Lưu {word}".
- `wide` stays as an alias of `size="lg"` until M8.
- Sửa từ and Xóa từ are TextButtons in the word head: Figma draws no own-word page.
- With more than one learned sense, Overlay 2 shows a sense select.
- The overlay backdrop keeps M1's 3 px blur (R10). Figma's overlays show 1.5 px.

**Open:** none.

---

# Part 5 — M5 Luyện tập, Học, Ôn (branches `feat/giao-dien-moi-m5a`, `feat/giao-dien-moi-m5b`)

**Goal:** Rebuild practice. M5a covers the home page, Tùy chỉnh phiên, the session, the summary and Từ hay sai, plus the shared question pieces Ôn also uses. M5b covers Học (the dissolving card stack) and Ôn (recall).

**Inputs:**
- Design §5.5, §7.5 (`AnswerOption`, `ProgressBar`), §8.1–§8.5, §9 M5, §10.4.
- Motion doc §2 (card stack), §5–§7 and §8.
- `docs/deliveries/cloze-own-then-ai.md` §"Việc cho đợt dựng hộp mới".
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-m5-practice.md` ("M5 code P §n") and `…-m5-review.md` ("M5 code R §n").
- Figma facts `…FIGMA_FACTS_2026-11-10-m5-a.md` ("M5 Figma A") and `…-m5-b.md` ("M5 Figma B").
- Prototypes:
  - `vong-13-hai-cot-gon.html` and `vong-14-so-cau-ai.html` (Tùy chỉnh phiên);
  - `vong-15-polish-9-trang.html` (session 4E, summary, weak words);
  - `chong-the-mo.html` (Học stack).

Paths are under `apps/web/` unless they start with `apps/api/`. `P/` = `src/features/learner/practice/`.

**Order:**
- Both M5 branches start once M3 is merged into `refactor/giao-dien-moi`. They use `groupTone`, the stage tokens and `StageBar`.
- M5b starts after M5a is merged, because Ôn renders `PracticeSession` (M5 code R surprise 1).
- Speaker buttons come from `@/app-ui/SpeakButtons` and `@/app-ui/PronunciationLine`. Those paths re-export `ui/` after M4 merges, so M5 does not wait for M4. M8 switches the imports.
- **QM5-1** (owner, before M5.3): if PR #249 (learners choose the number of AI questions) is merged into `dev`, merge `origin/dev` into `refactor/giao-dien-moi` first, and Tùy chỉnh phiên follows Figma (round 14: "Câu AI viết" stepper, "Xếp câu AI"). If not, M5.3 builds the round 13 box (AI switch), and the stepper waits for a later task.
- **QM5-2** (owner, before M5.8): see M5.8.

## Part 5 constraints

- **API changes:**
  - the one in M5.1, under QR2;
  - whatever #249 brings, if QM5-1 is yes.
- The session create body keeps today's fields, plus `cloze_source: 'own_then_ai'` (`cloze-own-then-ai.md`).
- **Ôn** never shows the AI label or the report button (`app-redesign-plan.md:512`).
- **Học:**
  - keeps the same-`review_id` retry on network errors (E19) and one review in flight at a time;
  - keys 1 and 2 keep working;
  - "Cần ôn lại" and "Đã biết" stay as buttons, so dragging is never required (design §8.5).
- **Typing in Ôn** must be exact (GM19). The API already grades that way; M5.9 pins it in a UI test.
- **Reduced motion:** opacity only, ≤ 200 ms, run through WAAPI (`element.animate`), because the global CSS rule zeroes CSS durations (M5 code R surprise 9).
- The report confirmation keeps today's text until M6 builds `/app/settings/reports`. M6 changes it (QR1).

## Part 5 Review Focus

1. **A session reloaded halfway:**
   - the bar's ✓/✗ counts come back from the server (M5.1, M5.4), not from zero;
   - "câu 7 / 20" is right.
2. **Tùy chỉnh phiên for a Free learner with 3 AI questions left asking for 5:**
   - the red notice "Không đủ lượt câu AI";
   - start is disabled;
   - "Bỏ kiểu câu có AI" fixes it.
   Pinned in M5.3 (for round 14; for round 13, the locked and quota lines that exist today).
3. **Học, pressing 2 twice fast** (or 1 then 2): exactly one review is sent per card, and the second press acts on the next card only after the first resolves (or as QM5-2 decides). Pinned in M5.8.
4. **Ôn, typing "deteriorated" for "deteriorate":** graded wrong, no partial credit (GM19), and the compare line shows the difference. Pinned in M5.9.
5. **A tall back face on a phone (several saved sentences):** the card can still scroll vertically (`touch-action: pan-y`), and a horizontal drag still rates it. Pinned in M5.8 with a pointer test.

### Task M5.1 (M5a): API — stage move and live counts for a practice session

**Files:**
- Modify the Practice module's answer view and session view (`apps/api/src/practice/sessions/session-views.ts` and the answer service). Find them through `POST /v1/practice/sessions/:id/answers` and `GET /v1/practice/sessions/:id`.
- Modify the unit tests.
- Modify `scripts/smoke-giao-dien-moi.mjs` (a check).

**Interfaces:**
- The answer result gains `level: number | null`: the item's current stage, 0–5, read through the existing Learning port.
- The session view gains `correct: number` and `wrong: number`.

The web shows "Ngăn 1 ngày → Ngăn 3 ngày" from `level` (Figma `100:3164`), and the bar's ✓/✗ after a reload.

- [ ] **Step 1: Write the failing tests:**
  - An answer on an item at level 1 returns `level: 1`.
  - An item that left learning returns `null`.
  - After 2 correct and 1 wrong answers, the session view returns `correct: 2, wrong: 1`.
- [ ] **Step 2: Run** the Practice unit tests. Expected: FAIL.
- [ ] **Step 3: Implement** within D3 (Practice reads Learning only through its port).
- [ ] **Step 4: Run** the API checks and the smoke on a fresh DB. Expected: PASS. Append the output to `docs/deliveries/giao-dien-moi-smoke-output.txt`.
- [ ] **Step 5: Commit** `feat(api): return the item stage and live counts in practice sessions`.

### Task M5.2 (M5a): `AnswerOption`, `ProgressBar`, `Stepper`, `KeyLegend`

**Files:**
- Create: `src/ui/AnswerOption.tsx`, `src/ui/ProgressBar.tsx`, `src/ui/Stepper.tsx`, `src/ui/KeyLegend.tsx`.
- Test: `src/ui/practice-kit.test.tsx`.

**Interfaces:**
- `AnswerOption({ state: 'idle'|'correct'|'wrong'|'dim', label, kbd?, note? })` draws Figma `Lựa chọn` `3:51`:
  - wrong shows the note "Bạn chọn";
  - correct shows "Đáp án đúng";
  - dim is opacity .6.
- `ProgressBar({ value, max, label })`: `role="progressbar"`, continuous fill (`app-redesign-plan.md:447`).
- `Stepper({ label, value, min, max, onChange })`: minus and plus buttons, each disabled at its limit; 44 px on phones.
- `KeyLegend({ items: { keys: string[]; label: string }[] })`: desktop only.

- [ ] **Step 1: Write the failing tests:**
  - Each `AnswerOption` state shows its note text.
  - The progress bar has `aria-valuenow` 7 and `aria-valuemax` 20.
  - The stepper's minus button is disabled at `min`, its plus button at `max`, and each press changes the value by exactly one.
- [ ] **Step 2: Run** `pnpm vitest run src/ui/practice-kit.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add answer option, progress bar, stepper and key legend to ui`.

### Task M5.3 (M5a): Tùy chỉnh phiên

**Files:**
- Rewrite: `P/CustomizeDialog.tsx`.
- Delete or replace: `AiTypesToggle.tsx`, `OwnSentencesToggle.tsx`.
- Modify: `use-practice-starter.tsx`.
- Modify tests: `practice-home.test.tsx:262-319`, `ai-toggle.test.tsx`, `e2e/app/m5a.spec.ts`; `messages/{vi,en}.json`.

**Behaviour:** Figma `131:3890` / `131:4232` (dialog `140:4049`, sheet `141:4147`, scrolled to the end `141:4320`, states `131:4522`), M5 Figma A §2.
- **Container:** `ui/Dialog size="xl"` (840 px) on desktop; a sheet with a sticky footer on phones.
- **"Từ" (words):**
  - desktop: group rows with a `groupTone` square, a count and a check;
  - phone: a group dropdown;
  - "Chỉ một ngăn" menu with stage squares and counts;
  - word-filter segment "Mọi từ / Cần ôn / Ưu tiên".
- **"Câu hỏi" (question types):**
  - Trắc nghiệm;
  - Đúng/sai;
  - Gõ từ, with a "Theo nghĩa / Theo câu / Trộn" segment on its row;
  - "Điền từ vào câu bạn đã lưu".
- **"Câu AI viết" (AI questions):**
  - QM5-1 yes: `Stepper` plus caption "Tối đa N câu AI · còn M lượt"; rows "Điền từ vào câu" and "Trắc nghiệm theo câu" (with "Chọn nghĩa / Chọn từ / Trộn", which maps to `meaning_in_sentence` / `mcq_sentence`); "Xếp câu AI: Rải đều / Ngẫu nhiên".
  - QM5-1 no: one AI switch (round 13).
- **Footer:**
  - "Số câu" `Stepper` (max = `max_questions_per_session`, or the scope's word count when the admin chose that);
  - "Thứ tự" menu;
  - "Bắt đầu N câu →";
  - "Dùng 1 trong N phiên còn lại hôm nay."
- **States:** every row of M5 Figma A §2, items 2–10: not enough AI questions, quota spent, Free, at least one type, "Theo số từ".
- **Free plan follows the API:** AI usable until the quota runs out. Record it as a ruling. The locked look stays only for `entitlement-required` / `plan-required`.
- **The `own_then_ai` tasks** (`cloze-own-then-ai.md`):
  - send `cloze_source: 'own_then_ai'` when both saved sentences and AI fill-in are on;
  - `againBody` resends the new source (and `ai_count` / `ai_placement` with QM5-1 yes);
  - remove the `ownReplacesAi` line.
- **Memory:**
  - keep remembering the saved-sentence choice (`wordmet-web.own-sentences`);
  - the AI count starts at 0 each time, as in round 14. Drop `wordmet-web.ai-types` with QM5-1 yes.

- [ ] **Step 1: Write the failing tests:**
  - Saved sentences on and AI fill-in on → the create body has `cloze_source: 'own_then_ai'`.
  - Saved sentences on and AI fill-in off → `cloze_source: 'own'`.
  - With QM5-1 yes, asking for 5 AI questions with 3 left shows "Không đủ lượt câu AI" and disables start; "Bỏ kiểu câu có AI" sets the count to 0 and enables start.
  - Turning off every type shows "Chọn ít nhất một kiểu câu." and disables start.
  - The Free plan with quota left can set AI questions (no lock).
  - Choosing "Ngăn 3 ngày" shows "10 từ".
- [ ] **Step 2: Run** `pnpm vitest run P`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm vitest run P` → PASS; then `pnpm cf:docker e2e/app/m5a.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the session options dialog`.

### Task M5.4 (M5a): The session screen (shared with Ôn)

**Files:**
- Rewrite the views of `P/session/{PracticeSession,QuestionCard,McqQuestion,TypeWordQuestion,TrueFalseQuestion,SentenceQuestions,AnswerFeedback,AlternativeFeedback,HintPanel,RoundPrompt,SessionNotice,PreparingState,AiUnavailableState,ReportDialog}.tsx`.
- Modify: `use-practice-session.ts` (`Item.ai`; counts from the session view).
- Create: `src/app/[locale]/app/(member)/(focus)/loading.app.tsx`.
- Modify tests: `practice-session.test.tsx`, `ai-questions.test.tsx`, `ai-states.test.tsx`, `e2e/app/m4.spec.ts`, `m5a.spec.ts` (fixtures gain `ai`).

**Behaviour:** Figma `100:3164`, `178:5326`, `178:5546`, `178:5755` (+ phone), M5 Figma A §3, round 15 4E.
- **Bar:** close; "câu n / N" in mono; `ProgressBar`; ✓/✗ chips.
- **Card:**
  - kind chip;
  - the "câu AI" chip and the "Báo lỗi" button follow `item.ai`;
  - the sentence with the blank, filled correct, or struck through when wrong ("lần 2").
- **Answering:** MCQ uses `AnswerOption`.
- **Result panel tucked under the card:**
  - "Đúng rồi" with "Ngăn 1 ngày → Ngăn 3 ngày" from `level` (M5.1), and the Enter note;
  - "Chưa đúng" with the English definition and notes;
  - buttons: "Cần ôn lại [1]", "Đã biết [Enter]" (`pass`), "Làm lại", "Gợi ý", "Xem đáp án", "Câu tiếp".
- `KeyLegend` on desktop.
- No `bg-canvas` wrapper (the `(focus)` dot grid shows).
- **Motion:** `card-rise`, `pop-in` and `wiggle-soft` stay (design §8.2).
- **Report dialog:** restyle only; the text stays.
- **Old variants:** `sticker` → `primary`; `quiet` → `secondary`; "Đã biết" → `pass`. Tests stop asserting `data-variant`; they assert the button name and role instead.

- [ ] **Step 1: Write the failing tests:**
  - An item with `ai: true` shows "câu AI" and "Báo lỗi"; `ai: false` shows neither, even when `reportable`.
  - A right answer at `level: 1` shows "Ngăn 1 ngày" and "Ngăn 3 ngày".
  - After reloading a session whose view says `correct: 5, wrong: 2`, the bar reads ✓5 ✗2 and "câu 8 / 20".
  - MCQ wrong: the picked option reads "Bạn chọn" and the right one "Đáp án đúng".
  - Keys 1, Enter, H and Esc keep today's actions.
- [ ] **Step 2: Run** `pnpm vitest run P/session`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm vitest run P/session` → PASS; then `pnpm cf:docker e2e/app/m4.spec.ts e2e/app/m5a.spec.ts e2e/app/cai-thien-a-practice.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the practice session screen`.

### Task M5.5 (M5a): Summary, Luyện tập home, Từ hay sai

**Files:**
- Rewrite: `P/session/SessionSummary.tsx`, `P/{PracticePage,PracticeHero,SourceCard,CurrentSessionCard,OutOfSessions,WeakWordsPage}.tsx`.
- Create: `C/practice/loading.app.tsx`.
- Modify tests: `practice-home.test.tsx`, `weak-history.test.tsx`, `e2e/app/m4.spec.ts:236-241`.

**Behaviour:**
- **Summary** (`119:4608` / `119:4701`):
  - ring chart (SVG) "16/20 câu đúng";
  - "Xong 20 câu.";
  - the "Cần ôn lại · N từ" list with "Đã đưa vào ưu tiên" or a "Cần ôn lại" text button;
  - "Luyện thêm một phiên", "Đưa N từ còn lại vào ưu tiên", "Về Luyện tập";
  - blocks enter at 400 ms, 90 ms apart (design §8.3; this changes `STAGGER`, also used by Học and Ôn).
- **Home** (`99:3169` / `99:3391`):
  - sessions count "2/30";
  - quick start "luyện nhanh · từ cần ôn hôm nay" with "Bắt đầu 20 câu" and "Tùy chỉnh";
  - current-session card "Làm tiếp câu 9 →";
  - "Luyện theo nguồn khác" (Theo nhóm / Từ hay sai / Đang ưu tiên / Luyện tất cả);
  - "Gần đây" with "Mở lịch học" (`/app/practice/history` until M6);
  - key legend.
- **Từ hay sai** (`119:4317` / `119:4482`):
  - big count;
  - group menu "tất cả nhóm ▾";
  - card "Luyện từ hay sai" with "Tùy chỉnh";
  - table with ✓/✗ chips: ✓ = `counted − wrong`, ✗ = `wrong`; order is not shown, because the API has none;
  - stage square;
  - "sai gần nhất";
  - "đang có 5 / 12 từ" with "Xem thêm".

- [ ] **Step 1: Write the failing tests:**
  - The summary ring reads "16/20".
  - "Đưa 3 từ còn lại vào ưu tiên" posts the 3 items.
  - The home page's current-session card links "Làm tiếp câu 9".
  - A weak-word row with `counted 5, wrong 3` shows ✓2 ✗3.
  - Replace the old "sai 3/5" assertions.
- [ ] **Step 2: Run** `pnpm vitest run P`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm vitest run P` → PASS; then the e2e lines above → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the practice home, summary and weak words`.

### Task M5.6 (M5a): M5a check and PR

- [ ] **Step 1: Run the checks:**
  - API: lint, typecheck, test, build, smoke.
  - Web: lint, typecheck, test, `cf:docker`.
  - Admin: the four checks.
  - `SHOTS_MILESTONE=gm-m5a pnpm shots`: home, the dialog in 4 states, the session in 4 states, the summary, Từ hay sai; 390 and 1440.
- [ ] **Step 2: Commit** the shots, and the as-built in `docs/deliveries/giao-dien-moi.md`.
- [ ] **Step 3: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild practice, its options dialog and session`. Merge after CI is green and the owner says yes.

### Task M5.7 (M5b): Card stack pieces

Branch: `git switch -c feat/giao-dien-moi-m5b origin/refactor/giao-dien-moi` once M5a is merged.

**Files:**
- Create: `src/ui/WordChip.tsx`.
- Create: `src/features/learner/review/{CardStack,useCardDrag,Pile}.tsx`.
- Create: `src/lib/stack-motion.ts` (WAAPI helpers, reduced-motion paths).
- Test: `review/card-stack.test.tsx`.

**Interfaces:**
- `WordChip({ word, tone: 'normal'|'review', groupId? })` draws Figma `Chip từ` `96:322`.
- `useCardDrag(ref, { onRate(rating), threshold: 110, velocity: 0.55 })`:
  - pointer events with `touch-action: pan-y`;
  - returns `dx` and the stamp ("Đã biết", "Cần ôn lại") once past half the threshold.
- `CardStack({ cards, current, flipped, onFlip, onRate })`:
  - only the top card renders full content;
  - the cards behind render a light front, with no `useForms` call and no speakers (M5 code R surprise 14).
- Motion numbers come from motion doc §2: flip 300 ms on the main curve, perspective 1400 px (new token), dissolve, the next card from blur to sharp, chip into the pile, counter bump.

- [ ] **Step 1: Write the failing tests:**
  - A drag of 120 px to the right calls `onRate('known')`.
  - A drag of 80 px calls nothing and the card returns.
  - A fast flick (dx 60 px in 100 ms) calls `onRate`.
  - Only one card in the stack calls `GET /v1/words/{lemma}`.
  - With reduced motion, `element.animate` is called only with `opacity` keyframes of ≤ 200 ms.
- [ ] **Step 2: Run** `pnpm vitest run src/features/learner/review/card-stack.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): add the review card stack, drag and piles`.

### Task M5.8 (M5b): Học

**Files:**
- Rewrite: `review/{ReviewSession,Flashcard,ReviewSummary}.tsx`, `use-review-queue.ts`.
- Modify tests: `review-session.test.tsx`, `e2e/app/m2.spec.ts:171-236`, `e2e/app/cai-thien-a-speak.spec.ts:122-157`.

**Behaviour:** Figma `80:3228`, `80:3321`, `80:3429`, `80:3557` / `80:3601`; prototype `chong-the-mo.html`.
- **Session bar** with `ProgressBar`.
- **Stack:**
  - front: lemma, part of speech, IPA, speaker;
  - back: meaning, example, stage.
- **Piles** "Cần ôn lại" / "Đã biết" with word chips and counters.
- **Buttons with key caps:** "Cần ôn lại [1]", "Đã biết [2]".
- **Following the chosen prototype** (rulings):
  - Space flips both ways ("Xem mặt trước");
  - ← and → also rate;
  - pressing a rating before flipping shakes the card (300 ms) and shows "Lật thẻ để xem nghĩa trước đã.";
  - the buttons are `aria-disabled` until the card is flipped.
- **Summary** (`80:3557`):
  - ring chart;
  - the words in each pile;
  - "Ôn lại N thẻ cần ôn";
  - "Học";
  - "Về trang chủ".
- **QM5-2** (owner): when Lan presses "Đã biết", either
  - **(a)** the card dissolves at once and the review is saved in the background. On a network failure the card comes back with "Chưa lưu được, thử lại" and the same `review_id`. Or:
  - **(b)** the card waits until the save returns, then dissolves (today's order: about 0.2–0.5 s later on a normal connection).
  - Implement the chosen one. Keep the E19 tests, adapted to (a) or unchanged for (b).

- [ ] **Step 1: Write the failing tests:**
  - Space twice returns the card to its front.
  - Pressing 2 before flipping sends nothing and shows "Lật thẻ để xem nghĩa trước đã.".
  - → after flipping sends `rating: 'good'` once.
  - Two fast presses send one review per card (QM5-2 decides when the second card can be rated).
  - The summary lists the words of the "Cần ôn lại" pile.
  - With network failure and option (a), the card comes back and the retry sends the same `review_id`.
- [ ] **Step 2: Run** `pnpm vitest run src/features/learner/review`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same tests → PASS; then the e2e lines above → PASS.
- [ ] **Step 5: Measure:** a 20-card Học session in DevTools Performance with 4× CPU slowdown (design §8.1, §8.5). Record the frame numbers in the delivery record.
- [ ] **Step 6: Commit** `feat(web): rebuild learn as a dissolving card stack`.

### Task M5.9 (M5b): Ôn and the M5b PR

**Files:**
- Modify: `recall/{RecallSession,RecallSummary}.tsx`.
- Create: `recall/CompareLine.tsx`.
- Create: `e2e/app/recall.spec.ts`. No Playwright test visits `/app/recall` today.

**Behaviour:** Figma `208:5655`, `209:5683`, `209:5902`, `209:6089` (+ phone).
- **MCQ by meaning:** `AnswerOption` with keys 1–4.
- **Type the word:** the field, "Kiểm tra", "Gợi ý".
- **Wrong:** `CompareLine` shows the typed word against the answer, letter by letter (added and missing letters marked), as soon as the answer is known to the page (after reveal).
- **Done screen:** ring chart and four result tiles.
- No AI label, no report button.

- [ ] **Step 1: Write the failing tests:**
  - `CompareLine("deteriorated", "deteriorate")` marks the final "d" as extra.
  - `CompareLine("detoriorate", "deteriorate")` marks the substituted letter.
  - Typing "deteriorated" sends the text unchanged and shows the wrong state (GM19).
  - Ôn with `reportable: true` shows no report button.
  - New e2e: Ôn on the mocked API, answer one MCQ and one typed question, axe clean at 390 and 1440, no horizontal scroll.
- [ ] **Step 2: Run** the recall tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full checks (web, admin); then `SHOTS_MILESTONE=gm-m5b pnpm shots` for Học (4 states) and Ôn (4 states). Expected: all pass.
- [ ] **Step 5: Commit** the work, the shots and the as-built.
- [ ] **Step 6: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild learn as a card stack and the recall screens`.

## Part 5 self-review notes (10/11/2026)

**Coverage:**
- §9 M5 table: Luyện tập → M5.5; Tùy chỉnh phiên → M5.3; session states → M5.4; summary → M5.5; Từ hay sai → M5.5; Học → M5.8; Ôn → M5.9.
- The "đợt dựng hộp mới" tasks → M5.3.
- The practice-ai-count rule → QM5-1.
- Free AI → M5.3.
- The report dialog and current-session card → M5.4, M5.5.
- §7.5 `AnswerOption`, `ProgressBar` → M5.2.
- §8 motion and the frame-rate measurement → M5.7, M5.8.
- §5.5 loading files → M5.4, M5.5.

**Decisions this part makes.** Each is recorded as a ruling when executed.
- The answer result gains `level`, and the session view gains `correct` / `wrong` (QR2).
- M5 is two PRs: M5a, then M5b.
- Speech imports stay on the `app-ui` paths until M8.
- Free AI follows the API.
- The AI count starts at 0 each time; the saved-sentence choice is remembered.
- ✓ in Từ hay sai = `counted − wrong`.
- The summary enters at 400 ms / 90 ms. This changes all three summaries (GM14 decided "the new numbers").
- Học follows the chosen prototype: flip back, arrow keys, the nudge before flipping.
- The cards behind the top one render light.
- `touch-action: pan-y` on the card.
- Ôn's compare line appears once the answer is revealed.
- Design §8.2's "Ôn (flashcard)" row means Học (GM17 renamed it). Fix the design text in the M5b PR.

**Open:**
- QM5-1: merge PR #249 before M5?
- QM5-2: when the card dissolves in Học.

---

# Part 6 — M6 Lịch học (branch `feat/giao-dien-moi-m6`)

**Goal:** Add the study calendar to the web: the floating calendar button with the streak, the Lịch and Ngày dialogs driven by `?lich=` / `?ngay=`, and the redirect that replaces the old practice history page. Move "Báo lỗi của tôi" to `/app/settings/reports` in the same PR, so its entry never disappears (QR1).

**Inputs:**
- Design §5.4 (layouts, floating button), §5.6 (URL dialogs, three history rules), §5.7, §7.5 (`CalendarButton`), §8.2 row "Lịch, Ngày", §8.4, §9 M6, §10.2–§10.5.
- Motion doc `motion-va-chuyen-canh.md` §5; prototype `docs/mockups/2026-11-05-redesign-concepts/vong-9-lich.html` (behaviour and keys; its hash URLs are superseded by §5.6).
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-m6-calendar.md` ("M6 code C §n") and `…-m6-reports.md` ("M6 code R §n").
- Figma facts `…_FIGMA_FACTS_2026-11-10-m6-a.md` (button, Lịch, Ngày; "M6 Figma A §n") and `…-m6-b.md` (reports page, Settings row, avatar menu; "M6 Figma B §n").

Paths are under `apps/web/` unless they start with `apps/api/`. `L/` = `src/features/learner/`, `M/` = `src/app/[locale]/app/(member)/`, `C/` = `M/(chrome)/`.

**Order:**
- The API of §10.2–§10.5 is built (Part 1, A1–A5). M6 adds one API change (M6.1).
- Start once M4 (PR #257) is merged: M4 changes `TopBar`, `ui/Dialog` (`size`), `ui/Toast`, `app-shell/format.ts` (`'numeric'`) and `ui/States.tsx`, which M6 uses (M6 code C §9, R §9). Run `git switch -c feat/giao-dien-moi-m6 origin/refactor/giao-dien-moi`, then `git merge docs/giao-dien-moi-plan-6`.
- M6.4 retargets the "Mở lịch học" link that M5.5 adds to Luyện tập. If M5a is not merged when M6.4 runs, leave that link to M5 and note it in the as-built.
- M6.9 (calendar button in the session bar on phones) runs after M5a and M5b are merged, because M5 rebuilds the session, Học and Ôn bars. If the rest of M6 is ready first, ship M6.1–M6.8 and M6.10 as the M6 PR, and M6.9 as a second PR from `feat/giao-dien-moi-m6-session`.
- **QM6-1** (owner, before M6.8): see M6.8.

## Part 6 constraints

- **API:** the only change is M6.1 (QR2: the reports list gains the data the Figma rows show). Every other endpoint is unchanged.
- **Dates:** "today", the current month, "/8", future days and the FAB's day number come from `me.timezone`, never from the device clock's zone or the server (design §10.4). One shared helper (M6.2), not a fourth `localDay` copy (M6 code C §4).
- **URL dialogs** follow design §5.6 exactly: `window.history.pushState` / `replaceState`, never `router.push`; a `history.state` marker decides whether closing goes back or strips the params; readers of `useSearchParams` sit in `Suspense`.
- **Esc:** in Ngày it goes back to Lịch; in Lịch it closes. `L` toggles the calendar from anywhere except inputs, selects, contenteditable and other dialogs (the `N` guard of `add-word-context.tsx:32-42`).
- **Reduced motion:** opacity and colour only, ≤ 200 ms (design §8.4).
- **Tests:** every test that renders the chrome gets a default `GET /v1/me/streak` route in `renderApp` and in `e2e/support/mock-api.ts` (M6.2), or it throws "unscripted request" (M6 code C §9.2).
- The report confirmation changes to "Đã gửi báo lỗi. Xem kết quả trong Cài đặt → Báo lỗi của tôi." in M6.8 (QR1); M5 leaves it alone.

## Part 6 Review Focus

1. **Lan at UTC+7 opens the calendar at 2026-10-31T17:30:00Z.** She sees "Tháng 11, 2026", 01/11 marked "hôm nay", "/1", and "Tháng sau" disabled. The FAB reads "T11" and "1". Pinned in M6.2 (helper) and M6.5 (dialog).
2. **Lan follows a link to `/vi/app/practice?ngay=2026-11-05`, then presses the browser's Back twice.**
   - The first Back shows Lịch for November.
   - The second leaves the dialogs: `/vi/app/practice` without params.
   - Closing a dialog opened from a link never leaves the app.
   Pinned in M6.4 (unit) and M6.10 (e2e, real browser).
3. **A day with two practice sessions and 130 graded answers.**
   - Two score blocks, in session order.
   - Each block lists its own answers.
   - "Xem đủ N câu" loads the rest of that session's answers across history pages.
   Pinned in M6.6.
4. **A learned word whose sense was hidden later** (`lemma: null`): the chip reads "Từ không còn trong kho", is not a link, and the counts are unchanged. Pinned in M6.6.
5. **Phone, Hôm nay:**
   - the calendar button sits 12 px above the "+" button, and neither covers the other;
   - on Từ tồn đọng and Chủ đề the calendar button is hidden;
   - pressing `L` inside the add-word input types an "l".
   Pinned in M6.3.

### Task M6.1: API — word, question type and AI flag in "Báo lỗi của tôi"

**Files:**
- Modify: `apps/api/src/practice/reports/reports.service.ts` (`myReportView`, `listMine`), its spec, `apps/api/scripts/smoke-giao-dien-moi.mjs`.

**Interfaces:**
- Produces: each item of `GET /v1/practice/reports` gains:
  - `lemma: string | null`, from one `ContentService.cardContent` call for the page's sense ids; `null` when the sense is not returned;
  - `question_type: QuestionType | null` (`practice.types.ts:8`), the `type` of `questionSnapshot` (`snapshot.ts:39-40`); `null` when the snapshot has none;
  - `ai: boolean`, true when `questionSource = 'ai'` (`practice.prisma:123,133`).
- Existing fields, order, paging and the bound token stay the same (M6 code R §1.3).

- [ ] **Step 1: Write the failing tests** in the service spec:
  - A page of three reports makes exactly one `cardContent` call, with the three sense ids.
  - A hidden sense gives `lemma: null`.
  - An AI cloze report gives `question_type: 'cloze'`, `ai: true`.
  - A rule report gives `ai: false`.
- [ ] **Step 2: Run** `pnpm vitest run src/practice/reports` in `apps/api` → FAIL.
- [ ] **Step 3: Implement.** Practice already depends on Content: use its exported service, not a SQL join (D3).
- [ ] **Step 4: Run** → PASS. Extend `smoke:giao-dien-moi`: report one answered item, then `GET /v1/practice/reports` shows its `lemma` and `question_type`. Run it on a fresh DB → PASS.
- [ ] **Step 5: Commit** `feat(api): add word, question type and ai flag to my reports`.

### Task M6.2: Learner dates, streak query and test defaults

**Files:**
- Create: `src/lib/learner-date.ts`, its test; `L/calendar/calendar-api.ts`, its test.
- Modify: `src/app-shell/format.ts` (style `'monthYear'`), its test.
- Modify the answer handlers that call `showStreak`:
  - the practice session hook (`L/practice/session/use-practice-session.ts`, around `:280`), which Ôn reuses;
  - the Học queue (`L/review/use-review-queue.ts`, around `:63`).
- Modify the test defaults: `src/app-ui/test-utils.tsx`, `e2e/support/mock-api.ts`.

**Interfaces:**
- Produces (`learner-date.ts`, pure):
  - `useLearnerZone(): string` (`me.timezone`, or `'UTC'` when signed out);
  - `todayIn(zone: string, now: Date): string` (`YYYY-MM-DD`) and `monthOf(date: string): string` (`YYYY-MM`);
  - `addDays(date, n)`, `addMonths(month, n)`, `daysInMonth(month)`, `weekdayMon0(date)` (Monday = 0);
  - `elapsedDays(month, today)`: the "/8" figure. It is the day of today in the current month, the month's length for a past month, and 0 for a future month.
- Produces (`calendar-api.ts`):
  - `STREAK_KEY = ['me', 'streak']`, `useStreak()`;
  - `useCalendarMonth(month)` with key `['me', 'calendar', month]`;
  - `useCalendarDay(date)`: `useInfiniteQuery` with key `['me', 'calendar', 'day', date]`, `?kind=all&page_size=100`;
  - `useDayAnswers(date)`: `useInfiniteQuery` with key `['practice', 'history', date]`, `?date=&page_size=100`;
  - `writeStreak(queryClient, days)`: sets `{ days, studied_today: true }`.
- Types copy the API shapes of M6 code C §1.1–§1.3 and §2.
- `format.date(at, 'monthYear')`: vi "Tháng 11, 2026", en "November 2026".

- [ ] **Step 1: Write the failing tests:**
  - `todayIn('Asia/Ho_Chi_Minh', new Date('2026-10-31T17:30:00Z'))` is `'2026-11-01'`; with `'UTC'` it is `'2026-10-31'`.
  - `elapsedDays('2026-11', '2026-11-08')` = 8; `('2026-10', '2026-11-08')` = 31; `('2026-12', '2026-11-08')` = 0.
  - `addDays('2026-02-28', 1)` = `'2026-03-01'`; `addMonths('2026-01', -1)` = `'2025-12'`.
  - `weekdayMon0('2026-11-01')` = 6 (Sunday).
  - An answer carrying `streak: { days: 6 }` makes `STREAK_KEY` hold `{ days: 6, studied_today: true }`, and no `GET /v1/me/streak` follows. Write this once for the practice hook and once for the Học queue.
  - `renderApp(<p/>, { chrome: true })` with no extra routes does not throw on `/v1/me/streak`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/learner-date.test.ts L/calendar src/app-shell` → FAIL.
- [ ] **Step 3: Implement.** Use `Intl.DateTimeFormat('en-CA', { timeZone })` as `L/practice/days.ts` does. The three existing `localDay` copies stay untouched (surgical).
  - Default routes: `GET /v1/me/streak` → `{ days: 0, studied_today: false }` in both `test-utils.tsx` and `mock-api.ts`.
  - `useStreak` uses `staleTime: 60_000` and `refetchOnWindowFocus: true`, so a tab left open past midnight corrects itself (M6 code C R5).
- [ ] **Step 4: Run** → PASS, then the whole web unit suite → PASS.
- [ ] **Step 5: Commit** `feat(web): add learner dates, the streak query and calendar queries`.

### Task M6.3: `CalendarButton` and the floating stack

**Files:**
- Create: `src/app-chrome/CalendarButton.tsx`, `src/app-chrome/FloatingButtons.tsx`, test `src/app-chrome/calendar-button.test.tsx`.
- Modify: `C/layout.app.tsx` (render `FloatingButtons`); `M/(focus)/layout.app.tsx` (desktop button); `src/app-chrome/AppChrome.tsx` (`main` bottom padding); `L/today/TodayPage.tsx` (stop rendering `AddFab`); `messages/{vi,en}.json` (`App.calendar.fab`).

**Interfaces:**
- Consumes: `useStreak()`, `useLearnerZone()`, `todayIn` (M6.2); `useCalendar()` (M6.4: `isOpen`, `openMonth(month?)`, `close()`).
- Produces: `CalendarButton({ size: 'lg' | 'sm' })`. `FloatingButtons()` renders the bottom-right stack of `(chrome)`:
  - phone: the calendar button, and below it `AddFab` on Hôm nay only (pathname `/{locale}/app`);
  - desktop: the calendar button only.

**Behaviour** (`95:343`, M6 Figma A §6):
- **Sizes:** `lg` is 62 × 66 on desktop, `sm` is 54 × 58 on phones.
- **Look:**
  - surface, radius 16, `Shadow/Pop`;
  - an accent strip with the month: vi "T11", en "Nov" via `Intl`;
  - today's day number;
  - a `--mark` streak badge (flame + days) on the top-right corner, hidden when `days` is 0 or the query has no data.
- **Position:**
  - desktop: 32 px from the right and the bottom;
  - phone: 16 px from the right, 14 px above the tab bar;
  - on Hôm nay (phone), the stack is the calendar button, a 12 px gap, then "+".
- **Hidden:**
  - on phones at `/app/group/backlog` and `/app/topic`, where their floating bar sits;
  - while Lịch or Ngày is open (opacity 0, `pointer-events: none`, 200 ms).
- **Focus layout:** desktop only (`hidden md:block`). Phones get the session-bar button in M6.9.
- **Label and tooltip:** accessible name "Lịch học", `aria-keyshortcuts="L"`. Hover and focus-visible show the tooltip "Lịch học" with a `Kbd` "L". Hover lifts the button 2 px (180 ms); press scales it to .95. Pointer-enter and focus prefetch the current month (design §5.7).
- **Content padding:** `main` keeps 124 px of bottom padding on desktop. On phones it keeps the tab bar height + 100 px (Figma note, M6 Figma A §6), so the last row of every screen can scroll clear of the buttons.

- [ ] **Step 1: Write the failing tests** (`renderApp(…, { chrome: true })`, streak `{ days: 6 }`, zone `Asia/Ho_Chi_Minh`, now `2026-11-08T03:00:00Z`):
  - The button named "Lịch học" shows "T11", "8" and "6".
  - With `{ days: 0 }` there is no "0" in the button.
  - Clicking the button calls `openMonth()`; so does `L` on `document.body`. `L` typed in a `textbox` does not.
  - On `/vi/app` at 390 px both "Lịch học" and "Thêm từ" are present, in that DOM order. On `/vi/app/group/backlog` at 390 px there is no "Lịch học".
  - `TodayPage` alone no longer renders "Thêm từ".
- [ ] **Step 2: Run** `pnpm vitest run src/app-chrome L/today` → FAIL.
- [ ] **Step 3: Implement.** Any Tailwind arbitrary value carries `// raw-ok:`.
- [ ] **Step 4: Run** → PASS; `today.test.tsx`, `layouts.test.tsx` → PASS.
- [ ] **Step 5: Commit** `feat(web): add the floating calendar button with the streak`.

### Task M6.4: Calendar host, URL parameters and "Mở lịch học"

**Files:**
- Create: `L/calendar/calendar-params.ts` (pure), `L/calendar/CalendarHost.tsx` (client: context, keys, lazy dialogs), `L/calendar/CalendarLink.tsx`, tests `calendar-params.test.ts`, `calendar-host.test.tsx`.
- Modify: `M/layout.app.tsx` (mount `<Suspense><CalendarHost/></Suspense>`); `L/today/TodayPage.tsx:197-200` and its test `:81`; `L/practice/PracticePage.tsx` ("Gần đây" link, if M5a is merged).

**Interfaces:**
- Produces (`calendar-params.ts`):
  - `parseCalendar(search: URLSearchParams, today: string)` returns `{ view: 'none' } | { view: 'month', month } | { view: 'day', month, date } | { view: 'invalid' }`.
  - `?lich` with an empty value means the current month.
  - `?ngay=` wins over `?lich=`; the day's `month` is `monthOf(date)`.
  - A malformed value or one outside `2026-01…2100-12` is `invalid`.
  - Future months and days are valid; the dialogs show them empty.
- Produces (`CalendarHost`):
  - `useCalendar()` returns `{ isOpen, openMonth(month?), openDay(date), backToMonth(), close() }`;
  - `CalendarLink({ children })` is an `<a href="?lich=<month>">` whose plain click calls `openMonth()`.
- **History rules** (design §5.6), using `pushState` / `replaceState` on the current path:
  - Opening Lịch, or going from Lịch to Ngày, pushes a step with `history.state.wmCalendar = true`.
  - Changing month, day or filter replaces.
  - `close()` and `backToMonth()` call `history.back()` when the current entry carries the marker. Otherwise they replace (strip params, or set `?lich=`).
  - Arriving on `?ngay=` without the marker first replaces it with `?lich=<month>`, then pushes `?ngay=`.
  - `invalid` strips the params by replacing; no dialog opens.
- `L` toggles: closed → `openMonth()`; open → `close()`.

- [ ] **Step 1: Write the failing tests:**
  - `parseCalendar('lich=2026-13')` → `invalid`.
  - `('ngay=2026-02-30')` → `invalid`.
  - `('lich=2026-11&ngay=2026-11-05')` → `day`, month `'2026-11'`.
  - `('lich=')` with today `2026-11-08` → `month` `'2026-11'`.
  - Host, with a `useSearchParams` mock that reads `window.location.search`:
    - opening from the FAB, then a day, then `backToMonth()`, then `close()` calls `pushState` twice and `history.back` twice;
    - mounting on `?ngay=2026-11-05` calls `replaceState('?lich=2026-11')` then `pushState('?ngay=2026-11-05')`;
    - mounting on `?lich=2026-13` replaces the URL with the bare path and shows no dialog.
  - Hôm nay: "Mở lịch học" is a link with `href` `/vi/app?lich=2026-11`, and clicking it opens a dialog titled "Tháng 11, 2026".
- [ ] **Step 2: Run** `pnpm vitest run L/calendar L/today` → FAIL.
- [ ] **Step 3: Implement.** The host renders `null` until a dialog is open. The dialogs load through `next/dynamic` (design §5.7).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): open the calendar from the url and the today link`.

### Task M6.5: Hộp Lịch

**Files:**
- Create: `L/calendar/MonthDialog.tsx`, `L/calendar/month-grid.ts` (pure), tests `month-grid.test.ts`, `month-dialog.test.tsx`.
- Modify: `src/ui/Dialog.tsx` (two widths: `size="month"` 45rem, `size="day"` 40rem); `messages/{vi,en}.json` (`App.calendar.month`, copy of M6 Figma A §10).

**Interfaces:**
- Produces: `monthGrid(month, today, days)` returns week rows (Monday first, 4–6 rows as the month needs). Each cell is:
  `{ date, inMonth, isToday, isFuture, dots: { learn, review, practice }, band: 'none' | 'start' | 'middle' | 'end' | 'single' }`.
  - Dots come from that date's `days[]` row (`learned > 0`, `reviewed > 0`, `practice_sessions > 0`).
  - A band joins consecutive dates present in `days[]` and is cut at row edges.
  - Days of the adjacent months show only a ghost number: no dots, no band. One request per month; a ruling (M6 Figma A Unresolved 3).

**Behaviour** (`102:3278` / `102:3948`, M6 Figma A §2–§3, §8):
- **Head:**
  - "lịch học" over "Tháng 11, 2026";
  - streak pill "6 ngày liên tiếp" (hidden at 0);
  - "Về hôm nay", shown only when the selected day is not today or the month is not the current one;
  - "Tháng trước", disabled at 2026-01, the API's floor (`/v1/me` has no creation date);
  - "Tháng sau", disabled in the current month;
  - "Đóng lịch". On phones the close button is a 34 × 34 button at the sheet's top right.
- **Totals:** "7" + "/8" ngày có học (`totals.study_days`, `elapsedDays`), "55" từ mới đã học, "130" lượt ôn, "4" phiên luyện, in the raw number colours of the frame through `wm-` tokens.
- **Grid:**
  - "T2 … CN" header;
  - each day is a `button` named "Thứ Năm 5/11: học 10 từ, ôn 22 lượt, luyện 20 câu", "…: không học" or "…: chưa tới";
  - states Thường, Chọn, Hôm nay ("hôm nay" label on desktop, underline on phones), Tương lai (disabled), Ngoài tháng (ghost, not focusable);
  - bands `--accent-soft` with radius 14 at run ends.
- **Legend**, and a key footer on desktop only: "← → ↑ ↓ chọn ngày · Enter xem ngày · Esc đóng".
- **Keys:**
  - roving focus on the selected day;
  - `←→` move ±1 day, `↑↓` move ±7 days (crossing a month replaces `?lich=`);
  - `Enter` or a click opens Ngày;
  - `Esc` and `L` close;
  - month arrows keep focus on the arrow and select the new month's last day, or today if it is earlier.
- **Opening:** selects today, or the day in the URL. Focus goes to that day and returns to the opener on close.
- **Loading, error:**
  - a grid skeleton inside the dialog;
  - on error, "Không tải được lịch." with "Thử lại" (`ui/States` `ErrorState`).
- **Motion:**
  - scrim 200 ms;
  - desktop dialog from `translateY(12px) scale(.97)`, opacity 0, 240 ms `--ease-wm-out`;
  - phone sheet from `translateY(60px)`, opacity .4, 240 ms;
  - close 150 ms with the closing curve;
  - cell hover and selection 150 ms;
  - reduced motion: opacity only.
  - The scrim keeps M1's 3 px blur (R10).

- [ ] **Step 1: Write the failing tests:**
  - `monthGrid('2026-11', '2026-11-08', days)` has 6 rows. The first cell is `'2026-10-26'` with `inMonth: false` and no dots.
  - With `days` for 3–8/11, 03/11 is `start` and 08/11 is `end`; with 7 and 8 in different rows, each run is cut at the row edge.
  - `monthGrid('2026-02', …)` has 4 rows.
  - Dialog (fixture of M6 Figma A §2):
    - title "Tháng 11, 2026";
    - "6 ngày liên tiếp";
    - "7", "/8", "55", "130", "4";
    - button "Tháng sau" disabled;
    - day button "Thứ Năm 5/11: học 10 từ, ôn 22 lượt, luyện 20 câu";
    - 09/11 disabled.
  - Keys: `ArrowLeft` from 08/11 focuses 07/11; `ArrowUp` focuses 01/11; `Enter` calls `openDay('2026-11-01')`.
  - "Tháng trước" replaces the URL with `?lich=2026-10` without a new history entry.
  - A 500 shows "Không tải được lịch." and "Thử lại" refetches.
- [ ] **Step 2: Run** `pnpm vitest run L/calendar src/ui` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): add the month calendar dialog`.

### Task M6.6: Hộp Ngày

**Files:**
- Create: `L/calendar/DayDialog.tsx`, `L/calendar/day-view.ts` (pure), tests `day-view.test.ts`, `day-dialog.test.tsx`.
- Modify: `messages/{vi,en}.json` (`App.calendar.day`).

**Interfaces:**
- Consumes: `useCalendarDay`, `useDayAnswers` (M6.2); `useGroups` (`L/groups/groups-api.ts:101`); `groupTone(id, total)` (`src/lib/group-color.ts:36`); `wordHref` (`L/word/word-api.ts:35`).
- Produces: `dayView(day, answers)` returns:
  `{ learned: DayItem[], known: DayItem[], again: DayItem[], sessions: { session: PracticeSession, answers: HistoryItem[] }[] }`.
  - Sessions follow `practice_sessions[]` order.
  - Answers are grouped by `session_id` and keep the API order (newest first).

**Behaviour** (`103:3820` / `103:4248`, M6 Figma A §4–§5, §8):
- **Head:**
  - "Lịch tháng 11" goes back to Lịch, as Esc does;
  - "Ngày trước" and "Ngày sau" replace `?ngay=`. They are disabled at 2026-01-01 and at today.
- **Date:** weekday in lower case ("thứ năm", plus " · hôm nay" when it is today), "05/11", and the line "Học 10 từ mới · ôn 22 lượt · luyện 20 câu", which leaves out parts that are 0.
- **Filter:** Tất cả / Học N / Ôn N / Luyện N. It is client-side, a tab with 0 is disabled, and the counts never change.
- **Học card:** "Học 10 từ mới", hint "{learned_groups} nhóm", one chip per learned item.
- **Ôn card:**
  - "Ôn 22 lượt", hint "lật thẻ và câu ôn";
  - "16 Đã biết, lên một ngăn" with the known chips;
  - "6 Cần ôn lại, về ngăn 1 ngày" with the again chips (`Cần ôn` variant).
  - The headings count lượt (`reviewed_known` / `reviewed_again`); the chips are one per word, as drawn.
- **Chips:**
  - colour square from `group_id` (none when `null`); lemma linking to the word page;
  - `lemma: null` reads "Từ không còn trong kho" and is not a link.
  - Each list shows 10 chips, then a TextButton "+N từ" that shows the rest, fetching the next page when `next_page_token` is set.
- **Luyện card:**
  - title "Luyện tập · N phiên";
  - per session: hint "câu a–b", score "17/20 đúng", the pass/fail bar, chips ✓ 17 and ✗ 3;
  - up to 5 answer rows per session: time in the learner's zone, lemma, "bạn trả lời …" (wrong rows add " · đáp án: …" and the `--fail-soft` ✗ badge);
  - "Xem đủ N câu" expands that session in place, loading history pages until all its answers of the day are in.
- **Empty states** (prototype copy, dashed box):
  - future day: "Chưa tới ngày này.";
  - no activity: "Ngày này không có lần học nào.";
  - an empty section under a filter: "Ngày này không có.".
  - A day older than 6 months shows the Luyện card only when the day has sessions.
- **Loading, error, motion:**
  - loading and error as in Lịch;
  - desktop Lịch → Ngày slides +22 px (back −22 px), 220 ms;
  - phone content rises 4 px, 200 ms;
  - day change re-animates only the detail (4 px, 180 ms);
  - the detail area is `aria-live="polite"`;
  - focus as in M6 Figma A §8.

- [ ] **Step 1: Write the failing tests:**
  - `dayView` with two sessions and their answers mixed in time returns two groups, each with only its own answers.
  - Dialog (fixture of M6 Figma A §4):
    - "thứ năm", "05/11", "Học 10 từ mới · ôn 22 lượt · luyện 20 câu";
    - "4 nhóm";
    - "16" and "6";
    - "17/20";
    - 5 answer rows;
    - "Xem đủ 20 câu".
  - The filter "Ôn 22" hides the Học and Luyện cards and keeps the counts.
  - A null lemma shows "Từ không còn trong kho" with no link.
  - 12 learned chips show 10 and "+2 từ"; clicking it shows 12.
  - A session with 130 answers across two history pages: "Xem đủ 130 câu" requests the second page and then shows 130 rows.
  - `?ngay=2026-11-09` with today 08/11 shows "Chưa tới ngày này." and makes no day request.
  - "Ngày sau" is disabled on today.
  - Esc calls `backToMonth()`.
- [ ] **Step 2: Run** `pnpm vitest run L/calendar` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): add the day dialog of the calendar`.

### Task M6.7: Replace the practice history page

**Files:**
- Rewrite: `C/practice/history/page.app.tsx` as an async server page that only redirects.
- Delete: `L/practice/HistoryPage.tsx`, `L/practice/MyReportsTab.tsx` (rebuilt in M6.8), the `App.practice.history.*` keys (vi and en).
- Modify: `L/practice/weak-history.test.tsx` (keep the Từ hay sai tests; move the report tests to M6.8); `e2e/app/m4.spec.ts:252-261,285-286`; `e2e-shots/shots.spec.ts:393-394`.
- Create: `C/practice/history/history-redirect.test.ts`.

**Interfaces:**
- Produces `historyTarget(locale, search): string`, a pure function in the page file's folder:
  - `?tab=reports` → `/{locale}/app/settings/reports`;
  - `?date=YYYY-MM-DD` (valid) → `/{locale}/app/practice?ngay=<date>`;
  - otherwise `/{locale}/app/practice?lich`.
  The page awaits `params` and `searchParams` (Next 16 promises) and calls `redirect()`.

- [ ] **Step 1: Write the failing tests:**
  - `historyTarget('vi', 'tab=reports')` is `/vi/app/settings/reports`.
  - `('en', 'date=2026-11-05')` is `/en/app/practice?ngay=2026-11-05`.
  - `('vi', 'date=2026-02-30')` and `('vi', '')` are `/vi/app/practice?lich`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**, delete, and move the tests. `rg "practice/history" src` returns only the redirect folder. `rg "practice\.history\." src messages` returns nothing.
- [ ] **Step 4: Run** the web unit suite → PASS. Then run `pnpm cf:docker e2e/app/m4.spec.ts`: the rewritten case opens `/vi/app/practice/history?date=2026-11-05`, lands on `/vi/app/practice?…ngay=2026-11-05` with the Ngày dialog open, and the Worker build serves the dynamic redirect → PASS.
- [ ] **Step 5: Commit** `feat(web): redirect the practice history page to the calendar`.

### Task M6.8: "Báo lỗi của tôi" page and its two entries

**Files:**
- Create: `C/settings/reports/page.app.tsx`, `L/settings/reports/{MyReportsPage,ReportRow}.tsx`, `L/settings/reports/reports-api.ts`, test `my-reports.test.tsx`.
- Modify:
  - `src/app-chrome/AvatarMenu.tsx:65` (href) and its doc comment, `chrome.test.tsx` (an href assertion);
  - `L/settings/SettingsPage.tsx` (a row after "Lịch sử giao dịch");
  - `src/app-shell/format.ts` (style `'monthLabel'`: vi "tháng 11, 2026");
  - `messages/{vi,en}.json` (`App.practice.reports.*` new keys; `App.practice.session.report.done`);
  - `L/practice/session/practice-session.test.tsx:504`;
  - `e2e/app/overflow.spec.ts:15` (add `/settings/reports`).

**Interfaces:**
- Consumes: M6.1 fields; `format.date(at, 'numeric')` (M4); `ui/States`.
- Produces: `useMyReports()` with key `['practice', 'my-reports']` and the URL of M6 code R §1.1. The N+1 `GET /v1/senses/{id}` goes away.

**Behaviour** (`211:5827` / `211:6061`, M6 Figma B §1):
- **Page:** back link "Cài đặt", title "Báo lỗi của tôi" (44 / 30 px).
- **Months:** one group per month in the learner's zone, newest first. The label is "tháng 11, 2026", and each group sits in a card with radius 20.
- **Row:**
  - date `dd/mm/yyyy` (desktop);
  - "<từ> · <lý do>";
  - line 2: the question type label with a lower-case first letter, then " · câu AI" for an AI question. A refunded report shows " · Đã trả lại 1 lượt câu AI" instead of " · câu AI". A confirmed report still refunding, or not refundable, keeps today's two lines.
  - status with an 8 px dot: Đang xem (`open`, accent), Đã xác nhận lỗi (`confirmed`, pass), Đã sửa (`fixed`, pass), Không có lỗi (`no_error`, muted).
  - `lemma: null` reads "—".
  - Rows are not interactive.
  - **QM6-1** (owner) decides whether phone rows show the date: Figma has none (the month header only), and the design text says every row shows "ngày gửi".
- **Rows of one card:** separated by a 1 px `--line` border, as on the transactions page (M6 Figma B Conflict 3; a ruling).
- **Footnote:** "ngày theo múi giờ của bạn · câu do AI viết mà đúng là lỗi thì được trả lại 1 lượt câu AI".
- **States:** "Xem thêm" pages. The empty state keeps "Bạn chưa báo lỗi câu nào." with "Về Luyện tập". The error state uses `ErrorState` with "Thử lại".
- **Settings:** a row "Báo lỗi của tôi" right after "Lịch sử giao dịch". It uses the old page's row style (chevron), because M7 rebuilds Settings with the Figma "Xem" button.
- **Avatar menu:** the "Báo lỗi của tôi" item links to `/{locale}/app/settings/reports`.
- **Toast after sending a report:** vi "Đã gửi báo lỗi. Xem kết quả trong Cài đặt → Báo lỗi của tôi.", en "Report sent. See the outcome in Settings → My reports.".

- [ ] **Step 1: Write the failing tests** (fixture of M6 Figma B §1.6, with the M6.1 fields):
  - Groups "tháng 11, 2026" then "tháng 10, 2026".
  - Row "deteriorate · Đáp án sai" has "điền từ vào câu · câu AI" and "Đang xem".
  - Row "allocate · Câu khó hiểu" has "chọn nghĩa trong câu · Đã trả lại 1 lượt câu AI" and "Đã xác nhận lỗi".
  - Desktop shows "08/11/2026".
  - Empty and error states as above.
  - Settings has a link "Báo lỗi của tôi" with `href` `/vi/app/settings/reports`. The menu item has the same `href`.
  - The practice session toast reads the new text.
- [ ] **Step 2: Run** `pnpm vitest run L/settings src/app-chrome L/practice` → FAIL.
- [ ] **Step 3: Implement.** Move the report tests from `weak-history.test.tsx` here.
- [ ] **Step 4: Run** → PASS. Then `pnpm cf:docker e2e/app/m4.spec.ts e2e/app/m4b.spec.ts e2e/app/overflow.spec.ts`: the reports case opens `/vi/app/practice/history?tab=reports` and lands on `/vi/app/settings/reports` → PASS.
- [ ] **Step 5: Commit** `feat(web): move my reports to settings`.

### Task M6.9: Calendar button in the session bar (phone)

**Order:** after M5a and M5b are merged into `refactor/giao-dien-moi`.

**Files:**
- Create: `src/app-chrome/CalendarBarButton.tsx`.
- Modify: the session bars M5 builds for the practice session, Học and Ôn (`L/practice/session/*`, `L/review/*`, `L/recall/*`), and their tests.

**Behaviour** (Figma "Nút lịch trong thanh" `95:344`; read its size and states before coding, M6 Figma A §6 marks them UNVERIFIED):
- The button sits in the session's top bar below `md`: month strip and day number, no streak badge.
- It opens Lịch through `useCalendar()`.
- Desktop keeps the floating button of the `(focus)` layout (M6.3).
- `L` works in sessions except inside the answer input.

- [ ] **Step 1: Write the failing tests:**
  - At 390 px, the practice session, Học and Ôn each show one button "Lịch học" in the top bar, and pressing it opens "Tháng 11, 2026".
  - At 1440 px, the bar has no calendar button and the floating one is present.
  - `L` typed in the Ôn answer box types "l".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): add the calendar button to the session bar`.

### Task M6.10: M6 check, journey, screenshots, PR

**Files:**
- Create: `e2e/app/m6.spec.ts`.
- Modify: `e2e-shots/shots.spec.ts` (set `gm-m6`: Hôm nay with the button, Lịch, Ngày (with a wrong answer and two sessions), Ngày empty, reports page, Settings with the row; at 390 and 1440); `docs/deliveries/giao-dien-moi.md` (M6 as-built); `giao-dien-moi-rulings.md`.

- [ ] **Step 1: Write the journey** (design §13):
  - Hôm nay → the button "Lịch học" → Lịch → 05/11 → Ngày;
  - Back → Lịch; Back → no dialog, same path;
  - `L` opens and Esc closes;
  - `/vi/app/practice?ngay=2026-11-05` opened directly, then Back → Lịch;
  - axe on both dialogs; no sideways scroll at 390 px.
- [ ] **Step 2: Run the checks:**
  - web lint, typecheck, test, `pnpm cf:docker` (all specs);
  - API lint, typecheck, test, build, `smoke:giao-dien-moi` on a fresh DB;
  - admin: the four checks.
  - All pass. Record the counts.
- [ ] **Step 3: Take screenshots:** `SHOTS_MILESTONE=gm-m6 pnpm shots`, next to their Figma frame IDs.
- [ ] **Step 4: Commit** `test(web): add the calendar journey and the gm-m6 screenshot set` and `docs(web): record m6 as built`.
- [ ] **Step 5: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): add the study calendar and move my reports to settings`. Merge after CI is green and the owner says yes.

## Part 6 self-review notes (10/11/2026)

**Coverage:**
- §9 M6: Lịch → M6.5; Ngày → M6.6; floating button and its hidden places → M6.3; streak → M6.2, M6.3; "Mở lịch học" → M6.4; history page removed → M6.7; QR1 page, Settings row, menu, toast copy, `?tab=reports` → M6.7, M6.8.
- §5.6 URL rules and edge table → M6.4 (unit), M6.10 (browser).
- §5.4 session row "nút lịch nằm trên thanh của phiên ở điện thoại, nổi góc phải dưới ở máy tính" → M6.3 (desktop), M6.9 (phone).
- §5.7 `next/dynamic` and hover prefetch → M6.3, M6.4.
- §8.2 calendar motion → M6.5, M6.6. §13 journey → M6.10.

**Decisions this part makes.** Each is recorded as a ruling when executed.
- The reports list gains `lemma`, `question_type` and `ai`, under QR2. The Figma rows show the word and the question type, and today the web fetches the lemma once per row.
- Days of the adjacent months show only a ghost number, without dots or bands: one request per month.
- "Tháng trước" stops at 2026-01, the API's floor. `/v1/me` has no creation date.
- A band joins consecutive dates present in `days[]`. The month response has no per-day "studied" flag.
- Several sessions in one day show one score block per session, and "Xem đủ N câu" expands in place. Figma draws one session.
- Chips show 10 per list, then "+N từ".
- The streak badge and pill are hidden at 0. The FAB month reads "T11" in Vietnamese and "Nov" in English.
- `AddFab` moves from `TodayPage` into the `(chrome)` floating stack, still on Hôm nay only, so the two buttons can stack 12 px apart.
- The calendar button hides only for the calendar dialogs. Other dialogs cover it with their scrim.
- The day grid is our own roving-focus grid as in the prototype, not react-aria `Calendar`: that one needs `@internationalized/date` as a direct dependency.
- The new reports page keeps the `App.practice.reports` keys. The question type reuses `App.practice.types` with a lower-case first letter, and the "theo nghĩa" sub-type of the Figma sample is not shown (the API has no field for it).
- Rows in a reports card are separated by a line, as on the transactions page.
- The Settings row uses the old page's chevron until M7.
- The scrim keeps 3 px blur (R10). The dialog radius is 16 (Figma).

**Open:**
- QM6-1: date on phone rows of "Báo lỗi của tôi".

---

# Part 7 — M7 Cài đặt, tài khoản, gói học (branches `feat/giao-dien-moi-m7a`, `feat/giao-dien-moi-m7b`)

**Goal:** Rebuild Cài đặt, Tài khoản, Xóa tài khoản and Lịch sử giao dịch with its detail (M7a). Then rebuild Gói học with `ChoiceCard`, the order page and the Giới thiệu Pro dialog (M7b). Fix four defects the survey found, and delete the old `app-ui` pieces nothing imports any more.

**Inputs:**
- Design §3.3, §5.4–§5.6, §7.5 (`ChoiceCard`), §8.2 rows "Mọi hộp thoại" and "Đơn hàng", §8.4, §9 M7, §12, §13.
- Motion doc `motion-va-chuyen-canh.md` §6: the order dot goes opacity 1 → .3 → 1 in 1.4 s ease-in-out until the status changes; the red "đã dừng" dot is still.
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m7-settings.md` ("M7 code S §n") and `…-m7-plans.md` ("M7 code P §n").
- Figma facts `…_FIGMA_FACTS_2026-11-11-m7-a.md` (Cài đặt, avatar menu, Tài khoản, Xóa tài khoản, giao dịch; "M7 Figma A §n") and `…-m7-b.md` (Gói học, Đơn hàng, Giới thiệu Pro, "Thẻ chọn"; "M7 Figma B §n").

Paths are under `apps/web/` unless they start with `apps/api/` or `packages/`. `L/` = `src/features/learner/`, `C/` = `src/app/[locale]/app/(member)/(chrome)/`, `M/` = `src/app/[locale]/app/(member)/`.

**Order:**
- No API change in M7.
- **M7a** starts once the M6 PR (M6.1–M6.8, M6.10) is merged. M6.8 edits the files M7a rewrites (`SettingsPage`, `AvatarMenu`, `format.ts`, `chrome.test.tsx`, `overflow.spec.ts`), and M6 adds the default streak route that every chrome test needs (M7 code S §10). The M6.9 PR does not block. Run `git switch -c feat/giao-dien-moi-m7a origin/refactor/giao-dien-moi`, then `git merge docs/giao-dien-moi-plan-7`.
- **M7b** starts once M7a is merged: `git switch -c feat/giao-dien-moi-m7b origin/refactor/giao-dien-moi`. M7b uses `StatusDot`, `SkeletonBlocks` and `proLastDay` from M7a, and M7.12 deletes old pieces only after both halves stop importing them.
- Rulings continue from the highest `R<n>` in `giao-dien-moi-rulings.md`. M5b and M6 both started at R108; if both landed with those numbers, leave them and continue from the highest.

## Part 7 constraints

- **API:** unchanged. Request bodies pinned by tests stay identical:
  - `PATCH /v1/me` sends only changed fields; `PATCH /v1/me/reminders { enabled }` carries an `Idempotency-Key`.
  - `POST /v1/me/account/delete { confirm_email, acknowledged: true, password? }` and `POST /v1/auth/google/reauth { locale }`.
  - `POST /v1/me/subscriptions/{id}/cancel` carries an `Idempotency-Key`.
  - `POST /v1/me/orders { period_months, expected_amount, locale }` uses one `Idempotency-Key` per press, then `window.location.assign(checkout_url)`.
  - `POST /v1/me/orders/:id/check` runs once; `GET /v1/me/orders/:id` repeats every 3 s for at most 2 min.
- **Paths the API writes** keep their shape:
  - `/{locale}/app/settings` (reminder emails);
  - `/{locale}/app/settings/delete-account?reauth=ok|wrong-account|failed` (Google re-auth, `smoke-buoc-8`);
  - `/{locale}/app/plans/order?order=<uuid>` (payOS return).
  Readers of `useSearchParams` stay inside `Suspense`.
- **Purchase copy stays on Gói học**, in this order after the buy button:
  1. one payment per period and no auto-renew;
  2. no automatic refund, with the support email;
  3. the link "Điều khoản sử dụng". Figma drops it; M7.9 keeps it.
  The Hủy gói dialog keeps "Không hoàn tiền cho thời gian còn lại." No VAT line, no payOS or VietQR wording (M7 code P §8.3).
- **QR4:** M7 edits only `L/house-ad/HouseAd.tsx` and its test. `L/ads/AdsenseLoader.tsx`, `SHOWS_ON`, `house-ad-counter.ts` and the two ad lines of `M/layout.app.tsx` stay untouched.
- **Dates and money:**
  - Full dates on these screens are `dd/mm/yyyy` (`format.date(…, 'numeric')`), as every M7 frame draws them. Tests that pin `'full'` dates ("6/12/2026") change to "06/12/2026".
  - `lastDay` (end − 1 ms, DB35) stays for "tới hết" and "đến hết".
  - Money goes through `format.money`.
  - Month groups and "today" use the learner's zone (`useFormat`, `lib/learner-date`).
- **Kit:** rebuilt screens use only `ui/`, `app-chrome/` and `wm-` tokens.
  - End of M7a: `rg "@/app-ui/" src/features/learner/{settings,transactions} --glob '!*.test.*'` prints nothing.
  - End of M7b: the same for `plans` and `house-ad`.
- **Fields and controls** use the kit (`ui/TextField`, `PasswordField`, `DateOfBirthField`, `Checkbox`, `Select`, `Segmented`, `Switch`). The local fields, select, segmented and switch drawn on Cài đặt, Tài khoản and Xóa tài khoản are not copied (M7 Figma A Conflicts 1–4). A ruling records it.
- **Copy:**
  - Text comes from the frames, per the copy tables in M7 Figma A §8 and B §7, and `en.json` gets the same keys by meaning.
  - Keys no screen reads any more are deleted in the same PR. The exception is `App.deleteAccount.{doneTitle,doneBody,pendingTitle,pendingBody,toLogin}`, which `AccountDeleted` (M2) reads.
- **Tests** query by role and visible text. `e2e-shots/shots.spec.ts` `setLanguage()` changes together with the Settings language control (M7.3), because 19 shots call it.
- **Defect fixes** are a red-test commit, then the fix commit (M7.2).

## Part 7 Review Focus

1. **Lan buys Pro 3 tháng.**
   - The button reads "Mua gói Pro 3 tháng".
   - One press, or a double click, sends one `POST /v1/me/orders` with `expected_amount` equal to the 3-month price shown on the card.
   - 409 `price-changed` reloads the prices and shows "Giá vừa đổi, xem lại trước khi mua".
   Pinned in M7.8 (hook) and M7.9 (page).
2. **Lan's Pro comes from payOS:** a `prepaid` source, `pro_until` set, no subscription.
   - Cài đặt, Lịch sử giao dịch and Gói học show the same last day: `pro_until` − 1 ms in her zone.
   - Today the transactions card shows no date.
   Pinned in M7.2, M7.3, M7.6, M7.9.
3. **Minh signs in only with Google and deletes his account.**
   - "Xác nhận bằng Google" goes to the API's `start_url`.
   - Back with `?reauth=ok`, the delete button enables once he ticks the box and types the email.
   - 403 `reauth-required` re-enables the Google button.
   - With a renewing subscription, the block and the link to Gói học replace the form.
   Pinned in M7.2 (messages) and M7.5.
4. **Lan leaves the order page open while payOS confirms.**
   - The waiting card's dot blinks.
   - When the status turns `paid`, the new text is announced (`role="status"`).
   - Reading stops after 2 minutes.
   - With reduced motion the dot is still.
   Pinned in M7.10.
5. **A long name and a long email at 390 px** (R20) on Cài đặt, Tài khoản, Xóa tài khoản, Lịch sử giao dịch and Gói học: no sideways scroll; the sign-in methods row and the avatar menu wrap or truncate. Pinned in `overflow.spec.ts` (M7.7, M7.13).

### Task M7.1 (M7a): Page title, status dot, month groups, skeleton blocks

**Files:**
- Modify: `packages/design-tokens/web.css` (two type tokens), `src/app-chrome/PageTitle.tsx`, `src/ui/Skeleton.tsx`, `C/loading.app.tsx`.
- Create: `src/ui/StatusDot.tsx`, `src/ui/StatusDot.test.tsx`, `src/lib/month-groups.ts`, `src/lib/month-groups.test.ts`.
- Modify: `L/settings/reports/MyReportsPage.tsx` (its raw `TITLE` becomes `PageTitle`; its inline grouping at `:31-36` becomes `groupByMonth`), `L/settings/reports/ReportRow.tsx` (its dot becomes `StatusDot`).

**Interfaces:**
- Produces:
  - Tokens `--text-wm-app-title: 2.75rem` (line-height 1.1, letter-spacing -0.0255em, weight 800) and `--text-wm-app-title-mobile: 1.875rem` (1.1, -0.023em, 800). These are the Figma page titles 44 / 30 (M7 Figma A §1.1; M5 Figma A line 31).
  - `PageTitle({ children, aside?, meta? })`, same props. The `h1` becomes `font-wm-display text-wm-app-title-mobile md:text-wm-app-title text-wm-ink`, without the highlighter stroke. Its users: Cài đặt, Tài khoản, Xóa tài khoản, Lịch sử giao dịch, Báo lỗi của tôi, Luyện tập, Từ hay sai.
  - `StatusDot({ tone: 'pass' | 'accent' | 'muted' | 'ghost' | 'fail', children })`: an 8 px round dot (`aria-hidden`) and the label in Noto Sans SemiBold 14. The label takes the tone's colour, except `ghost`, whose label is `--muted`.
  - `groupByMonth<T>(items: T[], at: (item: T) => string, zone: string): { key: string; items: T[] }[]`. `key` is `YYYY-MM` in `zone`. Input order is kept, and a new group starts whenever the month changes.
  - `SkeletonBlocks()` in `ui/Skeleton.tsx`: the `role="status"` "Đang tải…" title block and three card blocks that `C/loading.app.tsx` draws today. `C/loading.app.tsx` renders it.

- [ ] **Step 1: Write the failing tests:**
  - `groupByMonth([], …)` is `[]`; one item gives one group.
  - Items at `2026-11-08T10:00:00Z`, `2026-10-31T17:30:00Z`, `2026-10-28T10:00:00Z`:
    - with zone `Asia/Ho_Chi_Minh`, the keys are `['2026-11', '2026-10']` with 2 and 1 items;
    - with `UTC`, they are `['2026-11', '2026-10']` with 1 and 2 items.
  - November, October, November in that order gives three groups (no merge).
  - `<StatusDot tone="pass">Thành công</StatusDot>`: `getByText('Thành công')` exists, and the wrapper's accessible text is exactly "Thành công".
  - `my-reports.test.tsx` keeps passing.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/month-groups.test.ts src/ui/StatusDot.test.tsx L/settings/reports` → FAIL (the files do not exist).
- [ ] **Step 3: Implement.** The month of an item is `monthOf(todayIn(zone, new Date(at(item))))` from `lib/learner-date` (M6.2).
- [ ] **Step 4: Run** → PASS. Then run the whole web unit suite → PASS. `packages/design-tokens` changed, so also run the four admin checks → PASS.
- [ ] **Step 5: Commit** `feat(web): add the app page title, status dot and month groups`.

### Task M7.2 (M7a): Four defects found by the survey

**Defects** (M7 code S §1.3–§1.5, §11):
1. Xóa tài khoản: when `GET /v1/me/entitlements` fails, `ErrorState message=""` shows only "Thử lại", with no text.
2. Xóa tài khoản: 409 `renewal-not-cancelled` has no message, so it shows `App.errors.generic`.
3. Lịch sử giao dịch: the plan card ignores `prepaid` sources and `pro_until`. A payOS Pro learner sees "Gói Pro" with no date.
4. Chi tiết giao dịch: `provider: 'payos'` prints "payos".

**Files:**
- Modify: `L/settings/DeleteAccountPage.tsx`, `L/settings/delete-account.test.tsx`, `L/transactions/TransactionsPage.tsx` (`TransactionsAside`), `L/transactions/TransactionDetail.tsx`, `L/transactions/transactions.test.tsx`, `messages/{vi,en}.json`.
- Create: `L/plans/pro-last-day.ts`, `L/plans/pro-last-day.test.ts`.

**Interfaces:**
- Produces `proLastDay(entitlements): string | null` (the entitlements type of `app-shell/queries.ts`). It returns the ISO time 1 ms before the first of these that exists, else `null`:
  - `pro_until`;
  - the `ends_at` of a `grant_plan` source;
  - the `renews_at ?? ends_at` of a `subscription` source.
  M7.3 and M7.6 print it with `'numeric'`. Gói học keeps its own `pro_until ?? source.ends_at` rule, which its tests pin.
- New keys:
  - `App.errors.renewal-not-cancelled`: vi "Gói của bạn đang tự gia hạn. Hủy gói ở trang Gói học rồi thử lại.", en "Your plan still renews. Cancel it on the Plans page, then try again.";
  - `App.transactions.providers.payos`: "payOS".

- [ ] **Step 1: Write the failing tests:**
  - Xóa tài khoản with entitlements answering 500: the page shows the text of `App.errors.generic` (read from `messages/vi.json` in the test) and the button "Thử lại".
  - Xóa tài khoản: the POST answers 409 `renewal-not-cancelled`, and the form shows "Gói của bạn đang tự gia hạn. Hủy gói ở trang Gói học rồi thử lại."
  - `proLastDay`:
    - `{ pro_until: '2027-02-07T17:00:00Z' }` → `'2027-02-07T16:59:59.999Z'`;
    - a `grant_plan` with `ends_at` and no `pro_until` → its end − 1 ms;
    - a renewing subscription → `renews_at` − 1 ms;
    - Free with no sources → `null`.
  - Lịch sử giao dịch, learner with a `prepaid` source and `pro_until: '2027-02-07T17:00:00Z'`, zone `Asia/Ho_Chi_Minh`: the plan card shows the date 7/2/2027. The old card's `'full'` style is kept here; M7.6 changes the look.
  - A `payos` transaction's detail shows "payOS".
- [ ] **Step 2: Run** `pnpm vitest run L/settings L/transactions L/plans/pro-last-day.test.ts` → the four page cases fail for the stated reasons, and `pro-last-day` fails to import.
- [ ] **Step 3: Commit** the tests alone: `test(web): pin four settings and transactions defects`.
- [ ] **Step 4: Fix:**
  - `ErrorState` takes `useErrorMessage()(entitlements.error)`.
  - Add the two keys.
  - `TransactionsAside` reads `proLastDay`.
  - The provider label reads `providers.<provider>` when that key exists, else the raw value.
- [ ] **Step 5: Run** → PASS. **Commit** `fix(web): fix four settings and transactions defects`.

### Task M7.3 (M7a): Cài đặt and the avatar menu

**Files:**
- Modify:
  - `L/settings/SettingsPage.tsx` (rewrite), `L/settings/UsageSection.tsx`, `L/settings/Shortcuts.tsx` (`ui/Kbd`), `L/settings/settings.test.tsx`;
  - `src/app-chrome/AvatarMenu.tsx` (active item; the doc comment cites R11, R12), `src/app-chrome/chrome.test.tsx`;
  - `messages/{vi,en}.json` (`App.settings`);
  - `e2e-shots/shots.spec.ts:32-38` (`setLanguage`), `e2e/app/m1.spec.ts:114-120` (usage texts), `e2e/app/b8-set-password.spec.ts` if the link name changes.
- Create: `L/settings/SettingsRows.tsx` (`SettingsSection`, `SettingsRow`), `L/settings/SettingsToc.tsx`.

**Interfaces:**
- Consumes: `proLastDay` (M7.2), `PageTitle` (M7.1), `ui/Select` `size="sm"`, `ui/Segmented` `compact` / `fullWidth`, `ui/Switch`, `ui/TextButton`, `ui/Tag`, `ui/Kbd`.
- Produces:
  - `SettingsSection({ id, title, children })`: an `h2` card.
  - `SettingsRow({ label, hint?, value?, control?, wide? })`: one row. `wide` puts the bar or the segmented on line 2 on phones.

**Behaviour** (`120:4295` / `120:4559`, M7 Figma A §1–§3):
- **Desktop:**
  - Title "Cài đặt", no back link.
  - A sticky `nav` "Mục lục" (200 px) with six links to the section ids. The entry of the section nearest the top has `aria-current="true"`, the `--surface` fill and `Shadow/Card`; it is tracked with an IntersectionObserver. Clicking an entry scrolls to the section (instantly under reduced motion) and moves focus to its heading.
  - Sections sit in the remaining column, 16 px apart.
- **Phone:** no Mục lục and no Phím tắt section. Rows stack: label and control on line 1; value, bar or segmented on line 2.
- **Section card:** `--surface`, 1 px `--line`, `rounded-wm-xl` (20, not Figma's 18; R8), `Shadow/Card`, padding 24 / 24 / 6 (phone 16 / 16 / 6). The heading is Bricolage Bold 20. Every row has a top hairline and `py-4`.
- **Rows in order:**
  - **Thông tin cá nhân:**
    - Họ và tên, with text button "Sửa" → `/app/settings/account`;
    - Ngày sinh in `dd/mm/yyyy`, no action;
    - Email.
  - **Gói và mức sử dụng:**
    - Gói hiện tại: "Pro · tới hết 07/02/2027" from `proLastDay` (plan name only when it is `null`), or "Miễn phí"; text button "Xem gói học" → `/app/plans`;
    - the three usage rows.
  - **Học tập:**
    - Ngôn ngữ: `Select size="sm"`, no flags, options "Tiếng Việt", "English";
    - Giao diện: `Segmented compact`, `fullWidth` below `md`.
  - **Thông báo:** the reminder switch.
  - **Phím tắt:** desktop only.
  - **Tài khoản:**
    - Đăng nhập bằng: a list with one item per method (check icon, `--pass`). A Google-only account gets the row "Đặt mật khẩu" → `/app/forgot-password` right after it (B8-2).
    - Lịch sử giao dịch: "Xem".
    - Báo lỗi của tôi: "Xem".
    - Đăng xuất: a text button with an icon on both sizes, calling `store.logout()`.
    - Xóa tài khoản: a red text button → the delete page. Staff see the text "Liên hệ admin để xóa tài khoản" instead.
- **Usage bars:**
  - Keep `role="meter"`. Track `--line` 6 px, radius 3; fill `--accent`.
  - Each bar fills by the number its text shows, as today: used for practice, remaining for AI (M7 Figma A Conflict 7; a ruling).
  - `limit 0` keeps the "Cần gói Pro" tag.
  - The refill day keeps the `dayMonth` style ("1/12"); Figma's "01/12" is sample text, and no new date style is added for one line.
- **Link names:** "Xem" and "Sửa" read with their row: "Xem Lịch sử giao dịch", "Xem Báo lỗi của tôi", "Sửa Họ và tên". The visible text is unchanged.
- **Copy** (M7 Figma A §8):
  - `themeHint` "Sáng, tối hoặc theo máy";
  - `remindersHint` "Lúc {time} giờ của bạn, chỉ khi có từ đến hạn";
  - `practiceLeft`, `aiPracticeRefill(Time)`, `aiLookupRefill(Time)` drop the final ".";
  - new keys `planUntil` "{plan} · tới hết {date}", `view` "Xem", `toc` "Mục lục", `languageVi` "Tiếng Việt", `languageEn` "English" (labels were hard-coded);
  - keys of the old phone language dialog are deleted.
- **Avatar menu:** the item of the open page gets `aria-current="page"` and the `--bg` fill (note on `181:316`).
- **Shots helper:** `setLanguage(page, 'en')` opens the "Ngôn ngữ" select on Cài đặt and picks "English".

- [ ] **Step 1: Write the failing tests** (`settings.test.tsx`, `chrome.test.tsx`):
  - Section headings, in order: "Thông tin cá nhân", "Gói và mức sử dụng", "Học tập", "Thông báo", "Phím tắt", "Tài khoản".
  - The `navigation` "Mục lục" has six links with `href` `#personal`, `#plan`, `#learning`, `#notifications`, `#shortcuts`, `#account`. Pressing "Tài khoản" gives it `aria-current="true"`.
  - Gói hiện tại reads "Pro · tới hết 07/02/2027" (with `pro_until: '2027-02-07T17:00:00Z'` and zone `Asia/Ho_Chi_Minh`), and "Miễn phí" for Free. Link "Xem gói học" → `/vi/app/plans`.
  - Usage texts: "đã dùng 1/3", "Còn 2 phiên, mở lại lúc 0:00" (no "."), "còn 12/15", "Lượt câu AI mới vào 1/12", and "Cần gói Pro" ×2 for the Free-without-AI fixture.
  - Ngôn ngữ: open the button "Ngôn ngữ", pick option "English" → `PATCH /v1/me` body `{ native_language: 'en' }`, then `replace('/en/app/settings')`.
  - Radio "Tối" → storage `dark`. Switch /Nhắc học qua email/ → body and key as today.
  - Tài khoản rows in document order: "Đăng nhập bằng", "Lịch sử giao dịch", "Báo lỗi của tôi", "Đăng xuất", "Xóa tài khoản".
  - The list "Đăng nhập bằng" has items "Mật khẩu" and "Google".
  - Links:
    - "Xem Lịch sử giao dịch" → `/vi/app/settings/transactions`;
    - "Xem Báo lỗi của tôi" → `/vi/app/settings/reports`;
    - "Xóa tài khoản" → `/vi/app/settings/delete-account`.
  - Exactly one button "Đăng xuất"; pressing it posts `/v1/auth/logout` once.
  - Google-only: link "Đặt mật khẩu" → `/vi/app/forgot-password`, and the list has only "Google". Staff: the text "Liên hệ admin để xóa tài khoản" and no delete link.
  - Avatar menu opened on `/vi/app/settings`: menuitem "Cài đặt" has `aria-current="page"`, the others do not.
- [ ] **Step 2: Run** `pnpm vitest run L/settings src/app-chrome` → FAIL.
- [ ] **Step 3: Implement.** Update `m1.spec.ts` usage texts and `setLanguage()`.
- [ ] **Step 4: Run** → PASS. Then `pnpm cf:docker e2e/app/m1.spec.ts e2e/app/b8-set-password.spec.ts e2e/app/overflow.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild settings and mark the open page in the avatar menu`.

### Task M7.4 (M7a): Tài khoản

**Files:**
- Modify: `L/settings/AccountPage.tsx`, `L/settings/settings.test.tsx` (AccountPage block), `messages/{vi,en}.json` (`App.account`).
- Create: `L/settings/CurrentPlanCard.tsx`, shared with M7.6.

**Interfaces:**
- Produces `CurrentPlanCard({ title, line, href, linkLabel })`:
  - a card with radius 14 and padding 20 × 16 (phone 16);
  - a 40 px `--accent-soft` tile with a star icon;
  - title Noto Sans Bold 16, line Regular 14 `--muted`;
  - a `TextButton`-styled link with `linkLabel`.

**Behaviour** (`121:4297` / `121:4404`, M7 Figma A §4):
- Back link "Cài đặt", title "Tài khoản". One 720 px column, left-aligned; full width on phones. No aside: the shortcut list stays on Cài đặt only.
- Card (radius 20, padding 24 / 16, gap 28):
  - **"Hồ sơ"** (`h2`):
    - Tên and Họ (không bắt buộc) side by side from `sm`, stacked on phones;
    - Ngày sinh (`DateOfBirthField`, 220 px wide from `sm`, description "Wordmet dành cho người từ 13 tuổi.");
    - "Lưu thay đổi" (`ui/Button` primary, left-aligned, not full width).
  - **"Email đăng nhập"** (`h2`): the email as text (SemiBold 16, `break-all`), then `Tag tone="pass"` with a check "Đã xác minh", only when `email_verified`.
- `CurrentPlanCard` under the card:
  - Pro: "Gói Pro" / "{count} phiên luyện mỗi ngày";
  - Free: "Gói Miễn phí" / the Free count;
  - link "Xem gói →" → `/app/plans`.
- Save behaviour is unchanged: only changed fields are sent; under 13 shows the inline line; success toasts "Đã lưu thay đổi.".
- Keys:
  - new `profile` "Hồ sơ", `loginEmail` "Email đăng nhập", `ageHint`, `planTitle` "Gói {plan}", `planSessions` "{count, number} phiên luyện mỗi ngày", `seePlan` "Xem gói →";
  - `planCard`, `planLine` and the field label `email` are deleted if nothing else reads them.

- [ ] **Step 1: Write the failing tests:**
  - Headings "Hồ sơ" and "Email đăng nhập" exist.
  - No textbox "Email"; the text "lan@example.com" and "Đã xác minh" are shown. An unverified fixture has no "Đã xác minh".
  - "Wordmet dành cho người từ 13 tuổi." is shown.
  - A Pro learner sees "Gói Pro" and "30 phiên luyện mỗi ngày", and link "Xem gói →" → `/vi/app/plans`.
  - No `complementary` region.
  - The existing save cases pass: button disabled until a change, `PATCH` body `{ given_name: 'Mai' }`, the under-13 line.
- [ ] **Step 2: Run** `pnpm vitest run L/settings` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the account page`.

### Task M7.5 (M7a): Xóa tài khoản

**Files:** `L/settings/DeleteAccountPage.tsx`, `L/settings/delete-account.test.tsx`, `messages/{vi,en}.json` (`App.deleteAccount`).

**Behaviour** (`121:4503` / `121:4634`, M7 Figma A §5):
- Back link "Cài đặt", title "Xóa tài khoản".
- **Order:** the DOM has the info card first, then the confirm card, so the reading order is the same on every size.
  - From `md`, a 960 px row: CSS `order` moves the confirm card to the left (400 px); the info card takes the rest.
  - Phones keep the DOM order, which is the Figma phone order.
- **Info card:**
  - two `h3` lists, "Những gì bị xóa" and "Những gì còn được giữ";
  - markers "×" (`--fail`) and "·" (`--muted`) are `aria-hidden`;
  - on phones the second list has a top hairline.
- **Confirm card "Xác nhận xóa"** (`h2`), in order:
  1. A warning note (`role="note"`, `--fail-soft`, alert icon) "Thời gian Pro còn lại sẽ mất, không hoàn tiền.", only when `pro_until`.
  2. `ui/Checkbox` "Tôi hiểu dữ liệu sẽ mất và không khôi phục được".
  3. `TextField` "Gõ lại email của bạn".
  4. `PasswordField` "Mật khẩu", or for a Google-only account:
     - secondary button "Xác nhận bằng Google";
     - "Đã xác nhận bằng Google" once `?reauth=ok`;
     - alert lines for `wrong-account` and `failed`.
  5. `FormError`.
  6. `ui/Button variant="danger"` "Xóa vĩnh viễn", left-aligned, disabled until ready.
- **Renewing subscription:** the confirm card holds the block text and the link "Đến trang Gói" instead of the form.
- **States:** pending shows `SkeletonBlocks`; error shows `ErrorState` (message from M7.2).
- Copy: new `confirmTitle` "Xác nhận xóa"; `understand` becomes "Tôi hiểu dữ liệu sẽ mất và không khôi phục được" if it differs. The other lines already match.

- [ ] **Step 1: Write the failing tests:**
  - Heading "Những gì bị xóa" precedes heading "Xác nhận xóa" in document order.
  - The `note` "Thời gian Pro còn lại sẽ mất, không hoàn tiền." is present only with `pro_until`.
  - "Xóa vĩnh viễn" has `data-variant="danger"`.
  - Every existing case passes:
    - the labels;
    - the POST body;
    - `replace('/vi/app/account-deleted[?pending=1]')`;
    - signed-out store;
    - the `?reauth=` states;
    - 403 re-enabling the Google button;
    - the blocked case for `active|grace|on_hold|trialing`;
    - the `AccountDeleted` block.
- [ ] **Step 2: Run** `pnpm vitest run L/settings/delete-account.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the delete account page`.

### Task M7.6 (M7a): Lịch sử giao dịch and Chi tiết giao dịch

**Files:**
- `L/transactions/{TransactionsPage,TransactionRow,TransactionDetail}.tsx`, `L/transactions/transactions-api.ts`, `L/transactions/transactions.test.tsx`;
- `messages/{vi,en}.json` (`App.transactions`);
- `e2e/app/m4b.spec.ts`.

**Behaviour** (`122:4203` / `122:4354`; detail `122:4484` / `182:5856`; M7 Figma A §6–§7):
- **Page:**
  - Back link "Cài đặt", title.
  - Month groups from `groupByMonth`. The label is `format.date(first, 'monthLabel')` in an `h2` (mono 12, `--muted`).
  - Each month is a card (radius 20; padding 12 × 6, phone 16 × 4) holding a `ul`. Rows are separated by a top hairline.
- **Row:** a react-aria `Button` filling the `li`, which opens the detail as today.
  - **Desktop:**
    - the date (100 px, mono 12);
    - line 1 "{kind} · {plan}[ · {interval}]" (SemiBold 15) over line 2 "dùng {period}" or "không có kỳ" (Regular 14, `--muted`);
    - the amount (110 px, right-aligned, Bold 15). Refunds show "−" before the amount, in `--pass`. A grant without money shows "0 ₫";
    - `StatusDot` (130 px);
    - a chevron.
  - **Phone:**
    - line 2 is mono 12 and starts with the date: "01/11/2026 · dùng 08/11/2026 – 07/02/2027";
    - the amount sits over the status on the right.
- **Status tones:** `succeeded` pass, `pending` accent, `refunded` ghost, `reversed` muted.
- **Interval:** payOS shows `prepaidIntervals` ("3 tháng"); other providers show `intervals`, as today.
- **Period:**
  - Within one year: `dd/mm – dd/mm/yyyy` ("08/08 – 07/11/2026").
  - Across years: two full dates ("08/11/2026 – 07/02/2027").
  - English: "Aug 8 – Nov 7, 2026".
  - The end is minus one day for paid periods and minus 1 ms for grants, as today.
- **Footnote** (mono 12, `--muted`, both sizes): "ngày theo múi giờ của bạn · bấm một dòng để xem cổng thanh toán và mã giao dịch".
- **`CurrentPlanCard`:**
  - title "{plan} tới hết {date}" from `proLastDay`; "Gói Miễn phí" when Free; the plan name alone when it is `null`;
  - line "Gói học hiện tại";
  - link "Xem gói học →".
- **States:** "Xem thêm" (`ui/Button secondary`), `EmptyState`, `ErrorState` with retry, `SkeletonBlocks` while pending.
- **Detail** (`ui/Dialog`, `md`):
  - title "Chi tiết giao dịch" with the × close;
  - the receipt: mono line 1 in lower case ("mua · pro · 3 tháng"), the amount (Bricolage ExtraBold 40), `StatusDot`;
  - a dashed `--line` rule;
  - rows Thời điểm ("01/11/2026, 20:14"), Kỳ được dùng, Cổng thanh toán (hidden without a provider), Mã giao dịch (hidden without an id). Mã giao dịch is mono 13 with a button "Chép mã giao dịch": it calls `navigator.clipboard.writeText` and toasts "Đã chép mã giao dịch.";
  - the help text (not for grants);
  - footer "Đóng" (secondary).
- **Row accessible name:** "{line 1}, {date}, {amount}, {line 2}, {status}. Xem chi tiết".
- **Keys:**
  - `used` becomes "dùng {period}";
  - new `noPeriod`, `foot` (replaces `footWeb` and `footPhone`), `currentPlan` "Gói học hiện tại", `planUntil` "{plan} tới hết {date}", `seePlans` "Xem gói học →", `detail.copy`, `detail.copied`;
  - delete `cols.*`, `aboutTitle`, `about1..3`, `planGrant`, `planOnly` and the detail rows folded into the receipt (`detail.kind`, `detail.plan`, `detail.amount`, `detail.status`) once nothing reads them.

- [ ] **Step 1: Write the failing tests** (zone `Asia/Ho_Chi_Minh`):
  - Month headings in order: "tháng 11, 2026", "tháng 8, 2026", "tháng 7, 2026".
  - A payOS quarter purchase row is named `Mua · Pro · 3 tháng, 01/11/2026, 199.000 ₫, dùng 08/11/2026 – 07/02/2027, Thành công. Xem chi tiết`.
  - A same-year period reads "dùng 08/08 – 07/11/2026".
  - A refund row shows "−79.000 ₫" and "không có kỳ".
  - A grant row shows "Cấp gói · Pro" and "0 ₫".
  - The card reads "Pro tới hết 07/02/2027", with link "Xem gói học →" → `/vi/app/plans`.
  - **Detail:** the dialog "Chi tiết giao dịch" contains:
    - "mua · pro · 3 tháng", "199.000 ₫", "Thành công";
    - "01/11/2026, 20:14", "payOS" and the id.
  - Button "Chép mã giao dịch" calls the clipboard with the id, and the toast reads "Đã chép mã giao dịch.".
  - Esc closes it, and focus returns to the row button.
  - A grant's detail has no "Cổng thanh toán", no "Mã giao dịch" and no help text.
  - The paging, empty, error and English cases keep passing, with the new names.
- [ ] **Step 2: Run** `pnpm vitest run L/transactions` → FAIL.
- [ ] **Step 3: Implement.** In `m4b.spec.ts`, find rows with `getByRole('button', { name: /^Gia hạn/ })` instead of `getByRole('list').getByRole('button')`: there is now one list per month.
- [ ] **Step 4: Run** → PASS. Then `pnpm cf:docker e2e/app/m4b.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the transactions page and its detail`.

### Task M7.7 (M7a): M7a check, journey, screenshots, PR

**Files:**
- Create: `e2e/app/m7a.spec.ts`.
- Modify:
  - `e2e/app/overflow.spec.ts` (add `/settings/delete-account`, `/settings/transactions`);
  - `e2e/support/mock-api.ts` (scripted `POST /v1/me/account/delete` → 204);
  - `e2e-shots/shots.spec.ts` (set `gm-m7a`: Cài đặt, Cài đặt with the menu open, Tài khoản, Xóa tài khoản, Lịch sử giao dịch, Chi tiết giao dịch; 390 and 1440);
  - `docs/deliveries/giao-dien-moi.md` (M7a as-built), `docs/deliveries/giao-dien-moi-rulings.md`.

- [ ] **Step 1: Write the journey:**
  - Cài đặt → "Xem Lịch sử giao dịch" → a row → the detail → Esc → focus on that row.
  - Cài đặt → "Ngôn ngữ" → "English" → `/en/app/settings` with the English title.
  - Xóa tài khoản with a password: tick the box, type the email and the password, press "Xóa vĩnh viễn" → `/vi/app/account-deleted`.
  - axe on Cài đặt, Tài khoản, Xóa tài khoản, Lịch sử giao dịch and the detail.
  - No sideways scroll at 390.
- [ ] **Step 2: Run the checks:**
  - web lint, typecheck, test, `pnpm cf:docker` (all specs);
  - admin: the four checks (M7.1 changed tokens).
  - All pass. Record the counts.
- [ ] **Step 3: Take screenshots:** `SHOTS_MILESTONE=gm-m7a pnpm shots` with a learner set up by `pnpm learner:setup --plan pro --transactions`, next to their Figma frame IDs.
- [ ] **Step 4: Commit** `test(web): add the m7a journey and the gm-m7a screenshot set` and `docs(web): record m7a as built`.
- [ ] **Step 5: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild settings, account and transactions`. Merge after CI is green and the owner says yes.

### Task M7.8 (M7b): `ChoiceCard`, period offers, the buy hook

**Files:**
- Create: `src/ui/ChoiceCard.tsx`, `src/ui/ChoiceCard.test.tsx`, `L/plans/period-offer.ts`, `L/plans/period-offer.test.ts`, `L/plans/use-buy-order.ts`.
- Modify: `L/plans/PlansPage.tsx`: `BuyBlock` calls the hook, with no visible change.

**Interfaces:**
- Produces `ChoiceCardGroup({ label, hideLabel?, value, onChange, children })` (react-aria `RadioGroup`, vertical, gap 16) and `ChoiceCard({ value, title, note?, trailing?, isDisabled? })` (react-aria `Radio`).
  - Layout: flex row, gap 12, padding 16 × 12, `rounded-wm-lg` (14).
  - An 18 px radio: unselected has a `--ghost` ring; selected has an `--accent` ring and dot.
  - `title` is SemiBold 15 `--ink`. `note` is mono Bold 11 `--pass`, beside the title from `md` and under it on phones. `trailing` sits at the right end.
  - Unselected: 1.5 px `--line`. Selected: 1.5 px `--accent` and `bg-wm-accent/4`.
  - Focus-visible: the 3 px accent ring (§3.3). Disabled: 50 % opacity.
  - `ui/` may not import `app-shell`, so prices arrive already formatted inside `trailing`.
- Produces `periodOffer(prices: Record<'1' | '3' | '12', number>, months: '1' | '3' | '12'): { price: number; struck: number | null; saving: number | null; perMonth: number }`:
  - `struck` = `months × prices['1']` when that is greater than `price`, else `null`;
  - `saving` = `Math.round((1 − price / struck) × 100)` when `struck`, else `null`;
  - `perMonth` = `price / months` rounded to the nearest 100.
- Produces `bestPeriod(prices): '3' | '12' | null`: the period with the largest `saving`, or `null` when none saves.
- Produces `useBuyOrder(): { buy(months: '1' | '3' | '12', price: number): void; isPending: boolean; error: string | null }`. It moves today's logic out of `PlansPage.tsx:207-266` without changing it:
  - `useSubmitOnce` with the payload id `${months}:${price}`;
  - `POST /v1/me/orders`, then `window.location.assign`;
  - 409 `price-changed` invalidates `APP_CONFIG_KEY` and shows `priceChanged`;
  - 503 or `provider-unavailable` shows `buyUnavailable`;
  - anything else shows `useErrorMessage`;
  - `isPending` stays `true` while leaving for payOS.

- [ ] **Step 1: Write the failing tests:**
  - `periodOffer` with `{ 1: 79000, 3: 199000, 12: 599000 }`:
    - `'1'` → `{ price: 79000, struck: null, saving: null, perMonth: 79000 }`;
    - `'3'` → `{ price: 199000, struck: 237000, saving: 16, perMonth: 66300 }`;
    - `'12'` → `{ price: 599000, struck: 948000, saving: 37, perMonth: 49900 }`;
    - `bestPeriod` → `'12'`.
  - With `{ 1: 79000, 3: 240000, 12: 948000 }`: `'3'` and `'12'` both give `struck: null`, and `bestPeriod` → `null`.
  - With `{ 1: 100000, 3: 199050, 12: 900000 }`: `'3'` gives `perMonth` 66400 (66 350 rounds up).
  - `ChoiceCard`, three cards in a group "Kỳ hạn":
    - three `radio`s;
    - pressing the second checks it and calls `onChange('3')`;
    - Arrow Down moves the selection;
    - the `trailing` text is part of the radio's name;
    - a disabled card cannot be checked.
  - Run `plans.test.tsx` before the extraction and record the pass count.
- [ ] **Step 2: Run** `pnpm vitest run src/ui/ChoiceCard.test.tsx L/plans/period-offer.test.ts` → FAIL.
- [ ] **Step 3: Implement**, then move the buy logic into `useBuyOrder`.
- [ ] **Step 4: Run** → PASS. `plans.test.tsx` passes with the same count as before.
- [ ] **Step 5: Commit** `feat(web): add choice cards, period offers and the buy hook`.

### Task M7.9 (M7b): Gói học and the Hủy gói dialog

**Files:**
- Modify: `L/plans/{PlansPage,PlanCard,CompareTable,SubscriptionRows}.tsx`, `L/plans/plans.test.tsx`, `messages/{vi,en}.json` (`App.plans`), `e2e/app/m4.spec.ts` (plans case), `packages/design-tokens/web.css` (`--shadow-wm-pro`).

**Interfaces:**
- Consumes: `ChoiceCardGroup`, `ChoiceCard`, `periodOffer`, `bestPeriod`, `useBuyOrder` (M7.8); `SkeletonBlocks` (M7.1); `ui/Dialog`, `Button`, `ButtonLink`, `TextButton`, `Tag`, `Card`, `States`.
- Produces token `--shadow-wm-pro: 0 40px 70px -40px rgb(27 36 68 / 0.42)` (Figma Pro card).

**Behaviour** (`123:4196` / `123:4401`, M7 Figma B §1):
- **Header**, centred:
  - `h1`: Free "Học đều mỗi ngày, lên Pro khi cần"; Pro "Bạn đang dùng gói Pro"; trial as today;
  - lead "Trả một lần cho mỗi kỳ, không tự gia hạn. Hết kỳ, bạn về gói Miễn phí." (`--muted`, 16 / phone 15).
  - The eyebrow and the period segmented go away.
- **Two cards:** in a row from `md` (Free 470 px, Pro takes the rest, top-aligned), stacked on phones. Radius 20 (R8), padding 28 / 20.
  - **Free** (a `section` named by its `h2` "Miễn phí"), in order:
    1. tag "gói hiện tại" for a Free learner;
    2. "0 ₫" with "không thu tiền";
    3. the four check rows, numbers from the API. When both Free AI numbers are 0, the `aiOff` row shows as today;
    4. "Có thể có quảng cáo.";
    5. mono "bạn đang dùng gói này" for a Free learner.
  - **Pro** (2 px `--accent` border, `shadow-wm-pro`), in order:
    1. `h2` "Pro", tag "có AI", and also "gói hiện tại" for a Pro learner;
    2. "Luyện nhiều hơn, có AI soạn câu và tra từ cùng bạn.";
    3. for a Pro learner, "Tới hết {date}" and the upcoming periods, as today, with numeric dates;
    4. `ChoiceCardGroup` "Kỳ hạn" (label hidden) with three `ChoiceCard`s, "12 tháng" checked by default. Each card has:
       - title "1 tháng", "3 tháng", "12 tháng";
       - note "−16%", or "−37% · tiết kiệm nhất" on `bestPeriod` only;
       - trailing: the struck price (`--muted`, line-through, `aria-hidden`; Figma's `--ghost` is about 1.6:1), the price (Bricolage Bold 18), then "mỗi tháng" for 1 month or "≈ {perMonth} mỗi tháng".
    5. the six check rows (M7 Figma B §1.2), numbers from the API;
    6. the full-width primary button. It reads "Mua gói Pro {period}" for Free. A Pro learner keeps today's `periodState` labels: "Đang dùng kỳ này", "Nâng cấp lên {period}", or "Mua gói Pro {period}";
    7. the error line;
    8. the small print: "Trả một lần, dùng {period}, không tự gia hạn. Không hoàn tiền tự động; cần hỗ trợ, liên hệ <mail>{email}</mail>." and the link "Điều khoản sử dụng"; `startsOn` for a Pro learner as today.
- **Comparison:** "So sánh chi tiết các gói" (`h2`, Bricolage Bold 22) and the table in a card, always shown (no toggle).
  - The `table` is named by that heading (`aria-labelledby`).
  - The header row "tính năng" · "Miễn phí" · "Pro" is mono 11.
  - Values are the texts "Có" and "Không"; the Pro column is SemiBold `--accent`. Numbers come from the API.
- **`SubscriptionRows`** (fake-provider subscriptions only, M7 code P §1.2 item 3) keeps its texts and moves to the kit:
  - a `Card` row with `TextButton tone="delete"` "Hủy gói";
  - `ui/Dialog` "Hủy gói?" with the `--fail-soft` warning block of the M3 confirm dialogs;
  - `Button secondary` "Giữ gói" and `Button danger` "Hủy gia hạn".
- **States:** pending shows `SkeletonBlocks`; error shows `ErrorState`.
- **Keys:**
  - new `lead`, `freePriceNote` "không thu tiền", `freeAds`, `proBadge` "có AI", `perMonth`, `perMonthApprox`, `saving`, `savingBest`;
  - changed `buy` "Mua gói Pro {period}", `oneTime` "Trả một lần, dùng {period}, không tự gia hạn.", `noRefund` "Không hoàn tiền tự động; cần hỗ trợ, liên hệ <mail>{email}</mail>.", `proLine`;
  - `proList` becomes six items, `yours` "gói hiện tại", `usingThis` "bạn đang dùng gói này", `compareTable.feature` "tính năng";
  - deleted: `eyebrow`, `granted`, `renews`, `endsOn`, `backToFree`, `yoursGift` and the old `proList` keys.

- [ ] **Step 1: Write the failing tests.** Rewrite the `plans.test.tsx` cases whose markup changes, and keep the behaviour cases:
  - **Free learner:**
    - region "Miễn phí" has "gói hiện tại", "0 ₫", "Có thể có quảng cáo." and "bạn đang dùng gói này";
    - region "Pro" has the radiogroup "Kỳ hạn" with radio `/^12 tháng/` checked, and the button "Mua gói Pro 12 tháng".
  - **Offers:**
    - radio `/^3 tháng/` contains "−16%", "199.000 ₫" and "≈ 66.300 ₫ mỗi tháng";
    - `/^12 tháng/` contains "−37% · tiết kiệm nhất" and "≈ 49.900 ₫ mỗi tháng";
    - `/^1 tháng/` contains "mỗi tháng" and no "−".
  - **Choose and buy:**
    - checking `/^3 tháng/` → the button reads "Mua gói Pro 3 tháng", and the small print starts "Trả một lần, dùng 3 tháng, không tự gia hạn.";
    - pressing it → `POST /v1/me/orders` body `{ period_months: 3, expected_amount: 199000, locale: 'vi' }`, a UUID `Idempotency-Key`, and `window.location.assign(checkout_url)`.
  - The small print and the link "Điều khoản sử dụng" come after the buy button in document order.
  - **Comparison:** a `table` named "So sánh chi tiết các gói" exists, and no button has that name. The Free cell of "Phiên luyện mỗi ngày" is "3".
  - **Pro learner** (prepaid, `pro_until: '2026-12-31T17:00:00Z'`):
    - `h1` "Bạn đang dùng gói Pro";
    - region "Pro" has "gói hiện tại" and "Tới hết 31/12/2026";
    - region "Miễn phí" has no "gói hiện tại".
  - The LB1E28 price-changed case, the 503 case, the English case and the five Hủy gói cases keep passing (their texts do not change).
- [ ] **Step 2: Run** `pnpm vitest run L/plans` → FAIL.
- [ ] **Step 3: Implement.** In `m4.spec.ts`, the plans case expects radio `/12 tháng/` checked and button "Mua gói Pro 12 tháng".
- [ ] **Step 4: Run** → PASS. Then `pnpm cf:docker e2e/app/m4.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the plans page with choice cards`.

### Task M7.10 (M7b): Đơn hàng

**Files:**
- Modify: `L/plans/OrderReturnPage.tsx`, `L/plans/order-return.test.tsx`.
- Modify `packages/design-tokens/web.css`: add `--animate-wm-pulse` and `@keyframes wm-pulse` next to the other `wm-` animations.

**Behaviour** (`123:4598` / `123:4690`, `123:4774`; M7 Figma B §2–§3; motion doc §6):
- **Layout:**
  - One card, centred: 560 px from `md`, full width on phones; radius 20, padding 24 / 16.
  - No page title besides the card's `h1`, and no back link.
  - The card sits inside one `role="status"` element that stays mounted across states, so a change is announced.
- **Paid:**
  1. a 40 px `--pass-soft` circle with a check;
  2. `h1` "Thanh toán thành công";
  3. "Gói Pro có hiệu lực đến hết **{date}**." (`'numeric'`, `lastDay`);
  4. the detail block (`--bg`, radius 14): Gói, Số tiền, Mã đơn hàng;
  5. `ButtonLink` "Bắt đầu học" → `/app`, then `TextButton` "Xem gói" → `/app/plans`.
- **Waiting** (checking, `pending`, `needs_review`, `closed`):
  - a 10 px `--accent` dot with `animate-wm-pulse` (opacity 1 → .3 → 1, 1.4 s ease-in-out, infinite);
  - `h1` in Bricolage Bold 22, and the body as today; `contact` gives the support email for review.
  - The global reduced-motion rule (`globals.css`, one iteration of 0.01 ms) leaves the dot still.
- **Ended and not found** (`expired`, `cancelled`, `failed`, 404, no or bad `?order=`): a still 10 px `--fail` dot, the `h1`, the body, and `ButtonLink` "Đến trang Gói học". Not found keeps its own title.
- **Error:** `ErrorState`.
- Polling, the single `check` and the invalidations on `paid` are unchanged. The dot keeps blinking while the status is `pending`, also after the 2-minute stop, because the motion doc ends the blink at a status change (a ruling).

- [ ] **Step 1: Write the failing tests:**
  - The 11 cases keep passing, with "Gói Pro có hiệu lực đến hết 05/12/2026.".
  - The waiting card is inside an element with `role="status"`.
  - A pending read followed by a `paid` read leaves the same `status` element (same node) holding "Thanh toán thành công".
  - Not found has the link "Đến trang Gói học".
- [ ] **Step 2: Run** `pnpm vitest run L/plans/order-return.test.tsx` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the order page with the waiting dot`.

### Task M7.11 (M7b): Giới thiệu Pro

**Files:** `L/house-ad/HouseAd.tsx`, `L/house-ad/house-ad.test.tsx`, `src/ui/Dialog.tsx` (prop `tone`), its test, `messages/{vi,en}.json` (`App.houseAd`).

**Interfaces:** `ui/Dialog` gains `tone?: 'default' | 'pro'`. `pro` adds a 2 px `--accent` border on every side, top corners only on the sheet. Nothing else changes.

**Behaviour** (`75:2094` / `75:2373`, M7 Figma B §5):
- **Dialog:** `ui/Dialog tone="pro"` with `shadow-wm-pop` (§3.3; Figma's own shadow is a leftover raw value), centred from `md` like every other dialog (Figma draws it under the top bar; a ruling).
- **Content**, in order:
  1. Tags "Pro" and "có AI" above the title (`Tag tone="accent" mono`).
  2. Title "Học nhiều hơn với Pro" and the × "Đóng" (44 px hit area on phones).
  3. The lead.
  4. The three check rows.
  5. The price line: one paragraph "Từ {price} cho 1 tháng", with the price in Bricolage ExtraBold 40.
- **Footer**, right-aligned: `TextButton tone="muted"` "Để sau" (closes), then `ButtonLink` "Xem gói Pro →" → `/app/plans` (closes).
- When and where it opens, and the counter, stay as they are.
- Keys: new `later` "Để sau", `badgePro` "Pro", `badgeAi` "có AI".

- [ ] **Step 1: Write the failing tests:**
  - The 14 cases keep passing. The price case matches the paragraph's full text "Từ 79.000 ₫ cho 1 tháng".
  - The dialog contains the texts "Pro" and "có AI".
  - "Để sau" closes it, and the stored counter keeps the count written when it opened.
  - `ui/Dialog` with `tone="pro"` has the same accessible name and closes on Esc.
- [ ] **Step 2: Run** `pnpm vitest run L/house-ad src/ui` → FAIL.
- [ ] **Step 3: Implement.** Do not touch `SHOWS_ON`, the effect or `house-ad-counter.ts`.
- [ ] **Step 4: Run** → PASS. Check: `git diff --stat origin/refactor/giao-dien-moi -- src/features/learner/ads 'src/app/[locale]/app/(member)/layout.app.tsx'` → empty.
- [ ] **Step 5: Commit** `feat(web): restyle the pro dialog`.

### Task M7.12 (M7b): Delete the old pieces M7 orphaned

**Files:**
- Delete each of `src/app-ui/{Button,Dialog,Segmented,Switch,Checkbox,TextField,DateOfBirthField}.tsx` that nothing imports.
- Remove their cases from `src/app-ui/ui-kit.test.tsx`.
- `app-ui/States` and the `Toast` re-export stay for M8.

- [ ] **Step 1: Find importers:** for each name run `git grep -l "app-ui/<Name>'" -- src e2e ':!src/app-ui/ui-kit.test.tsx'`. Delete the files with no output. List the others in the as-built with their importers.
- [ ] **Step 2: Check:** `rg "@/app-ui/" src/features/learner/{settings,transactions,plans,house-ad} --glob '!*.test.*'` prints nothing. `pnpm typecheck` and `pnpm test` pass.
- [ ] **Step 3: Commit** `refactor(web): delete old ui pieces that m7 orphaned`.

### Task M7.13 (M7b): M7b check, journey, screenshots, PR

**Files:**
- Create: `e2e/app/m7b.spec.ts`.
- Modify:
  - `e2e/support/mock-api.ts`: scripted `POST /v1/me/orders`, `POST /v1/me/orders/:id/check`, `GET /v1/me/orders/:id`, `POST /v1/me/subscriptions/:id/cancel`;
  - `e2e/support/fixtures.ts`: `entitlementsBody` takes optional `ads`, `pro_until`, `sources`;
  - `e2e/app/overflow.spec.ts`: add `/plans` and `/plans/order?order=<uuid>`;
  - `e2e-shots/shots.spec.ts`: set `gm-m7b` with Gói học (Free and Pro), Đơn hàng (paid and pending) and Giới thiệu Pro, at 390 and 1440. No seed makes an order or turns ads on, so the order and Pro dialog shots answer `/v1/me/orders/*` and `ads.show` with `page.route`; the record says so;
  - `docs/deliveries/giao-dien-moi.md` (M7 as-built), `docs/deliveries/giao-dien-moi-rulings.md`.

- [ ] **Step 1: Write the journey:**
  - **Buy:**
    1. Gói học (Free) → radio "3 tháng" → "Mua gói Pro 3 tháng".
    2. The mocked `checkout_url` is `/vi/app/plans/order?order=<uuid>`, so the order page opens.
    3. "Đang chờ xác nhận thanh toán" shows, then the next read is `paid` and "Thanh toán thành công" shows.
    4. "Bắt đầu học" → `/vi/app`.
  - **Pro dialog:** a Free learner with `ads.show: true` goes from Hôm nay → tab "Nhóm" → the dialog "Học nhiều hơn với Pro" opens → "Để sau" closes it. No request goes to `pagead2.googlesyndication.com`.
  - **Cancel:** a learner with a renewing fake subscription goes Gói học → "Hủy gói" → "Hủy gia hạn" → one POST, then "Đã gửi yêu cầu hủy gia hạn".
  - axe on Gói học, Đơn hàng (paid and pending), Giới thiệu Pro and the Hủy gói dialog.
  - No sideways scroll at 390.
- [ ] **Step 2: Run the checks:**
  - web lint, typecheck, test, `pnpm cf:docker` (all specs), `pnpm assert:render-mode`;
  - admin: the four checks (M7.9 and M7.10 changed tokens).
  - All pass. Record the counts.
- [ ] **Step 3: Take screenshots:** `SHOTS_MILESTONE=gm-m7b pnpm shots`, next to their Figma frame IDs.
- [ ] **Step 4: Commit** `test(web): add the m7b journey and the gm-m7b screenshot set` and `docs(web): record m7 as built`.
- [ ] **Step 5: Open the PR** with `ship-pr`: base `refactor/giao-dien-moi`, title `feat(web): rebuild plans, orders and the pro dialog`. Merge after CI is green and the owner says yes.

## Part 7 self-review notes (11/11/2026)

**Coverage:**
- §9 M7:
  - Cài đặt and the avatar menu → M7.3;
  - Tài khoản → M7.4;
  - Xóa tài khoản → M7.5;
  - giao dịch and its detail → M7.6;
  - Gói học → M7.9;
  - Đơn hàng and its other states → M7.10;
  - Giới thiệu Pro → M7.11;
  - Hủy gói → M7.9 (see the decisions).
- §7.5 `ChoiceCard` → M7.8. §8.2 order dot → M7.10; dialog motion (GM15) through `ui/Dialog` in M7.6, M7.9, M7.11. §8.4 → M7.10.
- §12 copy → each task's keys. §13 journeys with axe, overflow and shots → M7.7, M7.13. §14 per milestone → M7.7, M7.13.
- Roadmap row 7 ("`ChoiceCard`; settings, account, plans, orders, `HouseAd`") → all of the above.
- The survey's defects → M7.2. Old pieces orphaned → M7.12.

**Decisions this part makes.** Each is recorded as a ruling when executed.
- **Two PRs:** M7a for the settings side, M7b for the plans side, as M5 was split.
- **Hủy gói stays on Gói học** and is rebuilt there.
  - Cài đặt has no cancel code and no Figma row; design §9 M7 named `SettingsPage.tsx` by mistake.
  - The dialog appears only for fake-provider subscriptions, because payOS sells prepaid periods.
- **`ChoiceCard`** follows the period cards drawn on Gói học (price on the right, saving note, 18 px radio), not component `34:383`, which cannot hold a price. Radius 14, since there is no 12 token.
- **Kit fields, select, segmented and switch** replace the local versions drawn on Cài đặt, Tài khoản and Xóa tài khoản.
- **Radii:** cards 20 (R8), not Figma's 18; tags 6, not 5.
- **Struck prices** use `--muted` and are hidden from screen readers; the saving is in the note.
- **The link "Điều khoản sử dụng"** stays in the small print, although Figma drops it.
- **The comparison table** is always shown, as in Figma; the toggle goes away.
- **Shadows:** the Pro card gets token `--shadow-wm-pro`. The Pro dialog uses `--shadow-wm-pop` and is centred like the other dialogs.
- **Usage bars** fill by the number their text shows. The refill day keeps "1/12".
- **`PageTitle`** takes the Figma 44 / 30 look for every user, Luyện tập and Từ hay sai included. Báo lỗi của tôi drops its raw title.
- **Xóa tài khoản:** the DOM order is info, then form, on every size. Desktop moves the form left with CSS `order`.
- **Transactions:**
  - grants show "0 ₫";
  - status tones: pass, accent, ghost, muted;
  - the transaction id has a copy button with a toast;
  - "payos" prints "payOS".
- **Order page:** the dot blinks while the status is `pending`, also after polling stops. The card lives in one `role="status"` element.
- **Settings:**
  - Mục lục follows the scroll and moves focus on click (Figma is static);
  - "Xem" and "Sửa" carry their row label in the accessible name;
  - text buttons keep each frame's "→" as drawn.

**Open:** none. QR4 stays parked, and M7 does not touch the ads code.

---

# Part 8 — M8 Trang công khai và SEO (branches `feat/giao-dien-moi-m8a`, `feat/giao-dien-moi-m8b`, `feat/giao-dien-moi-m8c`)

**Goal:**
- M8a: an admin-managed FAQ for the home page (API module, admin screen).
- M8b: rebuild the public site from Figma page `0:1` in `src/site/`: home, Chính sách bảo mật, Điều khoản sử dụng, Nguồn dữ liệu, 404.
  - Prices and FAQ are read at build time; the motion follows landing bản 3.
  - SEO per design §11; delete `components/`.
- M8c: the new favicon, app icon and share images, after the owner approves Figma frames drawn for them.

**Inputs:**
- Design §5.2, §5.8, §6, §8.2 row "Trang chủ, 404", §9 M8, §10.6, §10.7, §11, §15.
- Decisions QM8-1…QM8-9 in `docs/superpowers/decisions/2026-11-09-giao-dien-moi-decisions.md`.
  - Pictures of every option: `docs/mockups/2026-11-05-redesign-concepts/m8-cau-hoi.html`, artifact `H5V7kY8SrvQpNT47Lnmr67`.
- Motion source: `docs/mockups/2026-11-05-redesign-concepts/landing-mo.html` (landing bản 3, artifact `LxqBqZYrXejQt8cci67ucF`) and Figma page `2:3` scenes. Numbers are in "M8 Figma A §5" and "M8 Figma B §6.3".
- Facts files `docs/preparation/GIAO_DIEN_MOI_PLAN_*_2026-11-11-m8-*.md`:
  - code `site` ("M8 code S §n");
  - code `cleanup` ("M8 code C §n"; only its public-site rows apply, see Order);
  - code `faq` ("M8 code F §n");
  - Figma `a` (home and motion, "M8 Figma A §n");
  - Figma `b` (legal, sources, 404, "M8 Figma B §n").

Paths are under `apps/web/` unless they start with `apps/api/`, `apps/admin/` or `packages/`. `S/` = `src/site/`, `PUB/` = `src/app/[locale]/(site)/`.

**Order:**
- **Out of M8 (QM8-8, QM8-9):**
  - deleting `app-ui/` and dropping the old token imports. They move to the owner's polish round before M9; the list is in the delivery record, section "Việc dọn chuyển sang đợt polish".
  - fixes from the UI audit of 11/11 (`docs/audit/2026-11-11-ui-audit/` in the main checkout, local).
  - M8 changes no screen under `/app`, except the import path of the logo (M8.3) and of `periodOffer` (M8.3).
- **M8a** (`feat/giao-dien-moi-m8a` from `origin/refactor/giao-dien-moi`, then `git merge docs/giao-dien-moi-plan-8`) and **M8b** (`feat/giao-dien-moi-m8b`, same start) share no files. They can run in parallel. Until M8a is merged, M8b builds with the fallback FAQ.
- **M8c** (`feat/giao-dien-moi-m8c`) starts after M8b merges, and only after the owner approves the Figma frames of M8.10. M8.10 itself can be drawn while M8b is in progress.
- Rulings continue from the highest `R<n>` in `giao-dien-moi-rulings.md` (R173 on 11/11/2026).

## Part 8 constraints

- **Render mode:** `/vi` and `/en` stay prerendered (`scripts/assert-render-mode.mjs`).
  - No page under `PUB/` reads prices or FAQ at request time. They come only from `process.env.WORDMET_LANDING_DATA`, inlined at build (M8.3).
  - `/privacy`, `/terms`, `/sources` keep `force-dynamic` and their per-request API reads (GM11).
- **Folder rules:** `S/**` may not import `@/features/*` or `@/app-chrome/*` (`eslint.config.mjs:11`). Anything `site/` needs from there moves to `ui/`, `lib/` or `site/` first (M8.3).
- **Links into the app** (`/{locale}/app/…`) are full page loads: plain `<a>` (`ButtonLink reload`). This is because of the per-document CSP nonce, `e2e/csp.spec.ts` LB3E6.
- **No client messages on public pages:** `messages={null}` stays. Client islands get their copy as props, and no `ui/` component that calls `useTranslations` is used inside them (M8 code S §2.3).
- **Copy:**
  - Every visible string comes from the Figma copy tables (M8 Figma A §7, B §8), except the drafts this part writes on purpose (M8.1 seed, M8.5 claims), which the PR lists for the owner to check.
  - `Landing` keeps the same keys in `vi.json` and `en.json`, and `en` keeps Vietnamese text (L4).
  - Keys no screen reads any more are deleted in the same PR.
- **Type:** public display styles follow Figma, Bricolage **Bold 700** (Display/Hero 80/1.2/−2.5 %, Display/Section 52/1.24/−2 %, Display/Page title 64/1.18/−2.5 %, mobile 35, 30, 38). "404" and the logo stay 800.
  - Letter-spacing is a percent of the size, written in `em`. A ruling records this against design §3.1 ("800 cho tiêu đề").
- **Tokens:** raw Figma values become `wm-` tokens in `packages/design-tokens/web.css` and `web-dark.css` (M8.3). Changing the package means the four admin checks.
- **Motion:** M8.6 lists every number. Phone blur at most 12 px. No pause control (QM8-3′). Reduced motion shows the end state at once.
- **Tests** query by role and visible text. Each defect fix found while working is a red-test commit, then the fix commit.

## Part 8 Review Focus

1. **Build with no API** (CI, `cf:docker`, a dev machine with the API stopped):
   - `next build` finishes, logs one warning, and the home page shows the fallback prices (79.000 / 199.000 / 599.000 ₫) and the 6 fallback questions.
   - With `LANDING_DATA_REQUIRED=1`, the build fails and the message names the URL it tried.
   - Pinned in M8.3 (`read-landing-data.test.ts`) and M8.9 (e2e on the fallback build).
2. **An admin edits the FAQ:**
   - unpublished items never reach `GET /v1/public/faq`;
   - the order follows `position`, then creation time;
   - a stale `expected_version` gets 409 `faq-version-conflict`;
   - an empty published list gives `{ items: [] }`, and the home page then has no FAQ section and no `#hoi-dap`.
   - Pinned in M8.1 and M8.5.
3. **Prices that change:**
   - an admin sets 3 months to 240.000 (more than 3 × 79.000): that row shows no saving pill;
   - the percentages always equal Gói học's, because both call `lib/period-offer.ts`.
   - Pinned in M8.3 and M8.5.
4. **Lan on a 390 px phone:**
   - the top bar holds the logo, Đăng nhập and Đăng ký at 44 px height with no sideways scroll;
   - the theme switch sits in the footer and her choice carries into `/vi/app/login` (`wordmet-web.theme`).
   - Pinned in M8.4 and M8.9.
5. **JavaScript off or reduced motion:**
   - every section is visible with its final text;
   - the FAQ opens natively;
   - the legal table of contents is plain links that work.
   - Pinned in M8.6, M8.7 and M8.9 (no-JS and reduced-motion e2e).

### Task M8.1 (M8a): FAQ module in the API

**Files:**
- Create:
  - `apps/api/prisma/models/faq.prisma`;
  - `apps/api/prisma/migrations/20261114090000_landing_faq/migration.sql` (named after the newest folder `20261113100000`, M8 code F §0);
  - `apps/api/src/faq/{faq.module,faq.service,faq.schemas,admin-faq.controller,public-faq.controller}.ts`;
  - `apps/api/src/faq/{faq.service,public-faq.controller}.spec.ts`.
- Modify:
  - `apps/api/src/app.module.ts` (import `FaqModule`);
  - `apps/api/src/common/config/app-config.ts` and its spec (rule `public.faq.ip`);
  - `apps/api/src/identity/deletion/account-data-map.ts` (`landing_faq_items.created_by`, `.updated_by` → `keep-id`);
  - `apps/api/scripts/smoke-giao-dien-moi.mjs` (a FAQ step).
- Pattern to copy: `apps/api/src/legal/*` and `settings/public-prices.controller{,.spec}.ts` (M8 code F §1). FAQ is its own module, not part of Legal. Legal's version number is the terms version that learners re-accept (M8 code F §2).

**Interfaces:**
- Produces, Prisma model `LandingFaqItem` → table `landing_faq_items`:
  - `id` uuid (default `gen_random_uuid()`);
  - `position Int`, `question String`, `answer String`;
  - `published Boolean @default(false)`;
  - `rowVersion Int @default(1)` (`row_version`);
  - `createdBy`, `updatedBy` `String? @db.Uuid`, where null means "seeded by the migration";
  - `createdAt`, `updatedAt` `@db.Timestamptz`, written from `Clock`;
  - index on `(published, position)`.
- Produces the HTTP contract (design §10.7):
  - `GET /v1/public/faq`, `@Public()`, `@RateLimit('public.faq.ip')` (60 per minute per IP): `{ items: { question: string; answer: string }[] }`. Only published items, ordered by `position` then `created_at`.
  - Admin routes, class `@RequirePermission('settings.manage')`, writes `@RateLimit('user.write')`:
    - `GET /v1/admin/faq`: `{ items: AdminFaqItem[] }`, all items, same order.
    - `POST /v1/admin/faq` (201, `@Idempotent()`): body `{ question, answer, position, published? }`.
    - `PATCH /v1/admin/faq/:id` (`@Idempotent()`): body `{ expected_version, question?, answer?, position?, published? }`, at least one field.
    - `DELETE /v1/admin/faq/:id` (204).
  - `AdminFaqItem = { id, position, question, answer, published, row_version, updated_at, updated_by: { id, email } | null }`.
  - Validation (zod 4, `z.strictObject`):
    - `question` trimmed, 1–300 characters; `answer` trimmed, 1–2000 characters, plain text with line breaks;
    - `position` an integer 0–10 000; `expected_version` an integer ≥ 1.
  - Problems: 404 `not-found`; 409 `faq-version-conflict` (an `updateMany where { id, rowVersion }` that changes 0 rows of an item that exists); 400 `validation-failed` with `violations`.
- Produces the seed: the migration inserts 6 published items. Their text is the draft below, which the owner checks later (QM8-6). `S/landing/landing-data.fallback.ts` (M8.3) carries the same 6.

| position | question | answer (draft) |
|---|---|---|
| 10 | Gói Pro có tự gia hạn không? | Không. Bạn trả một lần cho mỗi kỳ 1, 3 hoặc 12 tháng. Hết kỳ, tài khoản về gói Miễn phí và Wordmet không tự trừ tiền. |
| 20 | Hết Pro thì từ và lịch ôn có mất không? | Không. Từ, nhóm và lịch ôn của bạn vẫn còn. Bạn học tiếp với giới hạn của gói Miễn phí, ví dụ 3 phiên luyện mỗi ngày. |
| 30 | Dùng trên điện thoại được không? | Được. Wordmet chạy trên trình duyệt của điện thoại và máy tính, không cần cài ứng dụng. Từ và lịch ôn giống nhau trên mọi máy. |
| 40 | Mua thêm khi Pro còn hạn thì sao? | Kỳ mới bắt đầu ngay sau khi kỳ đang dùng kết thúc, nên bạn không mất ngày nào. |
| 50 | Có được hoàn tiền không? | Wordmet không hoàn tiền tự động. Nếu thanh toán gặp sự cố, gửi email tới support@wordmet.com kèm email tài khoản và mã chuyển khoản. |
| 60 | AI có chấm bài của tôi không? | Không. AI chỉ soạn câu luyện. Đáp án được chấm theo quy tắc cố định, nên cùng một câu trả lời luôn có cùng kết quả. |

- [ ] **Step 0: Check each draft claim against the code** before it goes into the migration. Rewrite any answer that is not true, and record the change as a ruling:
  - row 20: what a learner keeps when Pro ends (`apps/api/src/entitlements/**`: groups, words, schedule, any Free cap such as a group limit);
  - row 40: `upcoming_periods` and prepaid periods chaining (`entitlements`, launch prep B design §3.8);
  - row 50: the refund clause of the Terms text (the published version in the local DB, or `docs/preparation/legal-drafts/` on branch `docs/launch-b-legal-drafts`), and the app's own sentence in `messages/vi.json` `App.plans`;
  - row 60: grading is rule-based (`apps/api/src/practice/**` grading).
- [ ] **Step 1: Write the failing tests** (`faq.service.spec.ts` with an in-memory fake Prisma, as `legal.service.spec.ts`):
  - `published()` returns only published items, ordered by `position` then `createdAt`. Two items at the same position keep creation order. An empty table gives `[]`.
  - `create` writes `rowVersion 1`, `createdBy` = `updatedBy` = the actor, and times from `FakeClock`.
  - `update` with the right `expected_version` bumps `row_version` to 2 and sets `updatedBy`. A stale version gives 409 `faq-version-conflict`; an unknown id gives 404 `not-found`.
  - `remove` of an unknown id gives 404.
  - `public-faq.controller.spec.ts`:
    - the exact body `{ items: [{ question, answer }] }` with no ids;
    - `Reflect.getMetadata(IS_PUBLIC_KEY, …) === true`;
    - the rate-limit metadata is exactly `['public.faq.ip']`.
  - `app-config.spec.ts` table gains `'public.faq.ip': { by: 'ip', max: 60, windowSeconds: 60 }`. `account-data-map.spec.ts` passes with the two new columns.
- [ ] **Step 2: Run** `pnpm --filter api test src/faq src/common/config src/identity/deletion` → FAIL (module missing, rule missing).
- [ ] **Step 3: Implement.** The `.prisma` file and the SQL must agree, because CI checks drift. The migration ends with the 6 `INSERT`s above, `published = true`, `created_by` NULL.
- [ ] **Step 4: Run** the API unit suite, lint, typecheck, build → PASS. Then on a fresh DB run `pnpm --filter api db:setup` → the migration applies, and `SELECT count(*) FROM landing_faq_items WHERE published` → 6.
- [ ] **Step 5: Smoke.** Add a step after Setup in `smoke-giao-dien-moi.mjs`:
  1. `GET /v1/public/faq` with no token → the 6 seeded questions in order;
  2. the admin creates `{ position: 15, published: false }` → the public list is unchanged;
  3. `PATCH published: true` → the public list has 7 items, the new one second;
  4. a stale `expected_version` → 409 `faq-version-conflict`;
  5. `DELETE` → back to 6.

  Run it on a fresh `english_learning_smoke_gm` as its header says → PASS.
- [ ] **Step 6: Commit** `feat(api): add an admin-managed faq for the home page`.

### Task M8.2 (M8a): FAQ screen in admin

**Files:**
- Create: `apps/admin/src/features/faq/{faq-api.ts,FaqPage.tsx,FaqDialog.tsx,FaqPage.test.tsx}`, `apps/admin/e2e/faq.spec.ts`.
- Modify:
  - `apps/admin/src/app/routes.tsx` (route `faq`);
  - `apps/admin/src/app/nav.ts` (`{ group: 'system', path: '/faq', labelKey: 'nav.faq', needs: ['settings.manage'], available: true }`, after `/legal`);
  - `apps/admin/src/app/nav-icons.ts` (`'/faq': MessageCircleQuestion`);
  - `apps/admin/src/api/problem.ts` (`faq-version-conflict` in `KNOWN_ERROR_SLUGS`);
  - `apps/admin/messages/{vi,en}.json`;
  - nav counts 27 → 28 in `src/app/nav.test.ts` and `e2e/shell.spec.ts`;
  - `e2e/a11y.spec.ts` (page list).
- Pattern: `features/legal/LegalPage.tsx` (list, `PageActions`, `Banner`, `DataList`) and `features/reports/ReasonDialog.tsx` (dialog with a number field for `position`) (M8 code F §3).

**Interfaces:**
- Consumes the routes of M8.1.
- Copy (vi; `en` by meaning):
  - nav "Hỏi đáp trang chủ"; page title "Hỏi đáp trang chủ";
  - banner "Trang chủ chỉ hiện câu đã đăng, và cập nhật sau lần deploy web tiếp theo.";
  - columns "Thứ tự", "Câu hỏi", "Trạng thái" (badges "Đã đăng" / "Nháp");
  - buttons "Thêm câu hỏi", "Sửa", "Xóa";
  - dialog fields "Câu hỏi", "Câu trả lời", "Thứ tự" (help "Số nhỏ đứng trước."), checkbox "Đăng lên trang chủ";
  - delete confirm "Xóa câu hỏi này?", error `faq-version-conflict` "Câu hỏi vừa được người khác sửa. Tải lại rồi thử lại."

- [ ] **Step 1: Write the failing tests** (`FaqPage.test.tsx`, handlers as `LegalPage.test.tsx`):
  - the list shows the rows in API order with their badges;
  - "Thêm câu hỏi" → fill → save sends `POST /v1/admin/faq` with the exact body and an `Idempotency-Key` header;
  - "Sửa" → tick "Đăng lên trang chủ" sends `PATCH` with `expected_version` equal to the row's `row_version` and `published: true`;
  - a 409 shows the conflict text;
  - "Xóa" asks first, then sends `DELETE`;
  - an editor (no `settings.manage`) does not see the nav item.
  - `nav.test.ts` and `shell.spec.ts` pin 28 items.
- [ ] **Step 2: Run** `pnpm --filter admin test src/features/faq src/app` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the four admin checks and the mocked e2e `faq.spec.ts`, `shell.spec.ts`, `a11y.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(admin): add the home page faq screen`. Then write the M8a as-built (delivery record), run every check of M8.1–M8.2, and open the PR `feat(api): add an admin-managed home page faq` into `refactor/giao-dien-moi`.

### Task M8.3 (M8b): Shared pieces and landing data at build

**Files:**
- Move (update every importer in the same commit):
  - `src/features/learner/plans/period-offer.ts` (+ test) → `src/lib/period-offer.ts`;
  - `AppLogo` from `src/app-chrome/Logo.tsx` → `src/ui/Logo.tsx`. Importers: `TopBar`, `PhoneHeader`, `CardFrame`. The old landing `Logo` export is deleted with its file;
  - `ThemeToggleButton` from `src/app-chrome/ThemeToggle.tsx` → `S/layout/ThemeToggle.tsx`, restyled to `wm-` (44 px square, `--line` border). The unused `ThemeToggle` wrapper is deleted, and `theme-toggle-button.test.tsx` moves with it.
- Modify:
  - `src/ui/ButtonLink.tsx` (prop `reload`);
  - `next.config.ts`;
  - `playwright.config.ts` and `scripts/cf-docker.mjs` (pass `LANDING_DATA_SOURCE=fallback` to the e2e build);
  - `packages/design-tokens/{web,web-dark}.css` (public tokens below) and `src/styles/web-tokens.test.ts`;
  - `docs/deliveries/giao-dien-cu-map.md` (rows for the public routes, root layout, OG image, icons, `globals.css`: M8 code C §5.2).
- Create:
  - `scripts/read-landing-data.mjs` (+ `.d.mts`, `read-landing-data.test.ts`);
  - `S/landing/landing-data.ts`, `S/landing/landing-data.fallback.ts`, `S/landing/landing-data.test.ts`.

**Interfaces:**
- `ButtonLink({ …existing, reload?: boolean })`: with `reload`, it renders a plain `<a href>` with the same look, not `next/link`.
- `readLandingData({ baseUrl: string, required: boolean, offline: boolean, timeoutMs?: number = 5000, fetchImpl?: typeof fetch }): Promise<string | undefined>`:
  - it gets `${baseUrl}/v1/public/prices` and `${baseUrl}/v1/public/faq`;
  - it returns `JSON.stringify({ prices: { '1', '3', '12' }, faq: [{ question, answer }] })` when both answer 200 with the right shape;
  - otherwise it returns `undefined` and logs one warning that names the URL;
  - with `required` it throws `Error('Landing data required but unavailable: <url> (<reason>)')`;
  - `offline` returns `undefined` without fetching.
- `next.config.ts` becomes `export default async function config(phase: string): Promise<NextConfig>`. The existing top-level checks are kept. It calls `readLandingData` only when `phase === PHASE_PRODUCTION_BUILD`, with:
  - `baseUrl` = `API_INTERNAL_BASE_URL ?? NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'`;
  - `required` = `LANDING_DATA_REQUIRED === '1'`;
  - `offline` = `LANDING_DATA_SOURCE === 'fallback'`.

  It returns `withNextIntl({ ...nextConfig, env: { WORDMET_LANDING_DATA: data ?? '' } })`. Next replaces `process.env.WORDMET_LANDING_DATA` at build (Next 16 docs `next.config.js` `env`, async config).
- `type LandingData = { prices: Prices; faq: { question: string; answer: string }[]; source: 'api' | 'fallback' }` (`Prices` from `lib/period-offer`).
  - `parseLandingData(raw: string | undefined): LandingData` gives the fallback on empty, bad JSON or a bad shape.
  - `landingData(): LandingData` = `parseLandingData(process.env.WORDMET_LANDING_DATA)`.
  - `FALLBACK_LANDING_DATA` holds prices 79 000 / 199 000 / 599 000 and the 6 items of M8.1 verbatim, with `source: 'fallback'`.
- New tokens (light and dark, `rem`), the Figma raw values of M8 Figma A §1, §2, §3 and B §2:
  - `--shadow-wm-lift` (`0 50px 110px -40px` ink 38 %, `0 12px 32px -16px` ink 18 %);
  - `--shadow-wm-stage` (hero mock-up);
  - `--shadow-wm-pro-glow` (`0 0 48px 2px` accent 30 % plus the lift);
  - `--color-wm-ai-from` `#1e3a8a`, `--color-wm-ai-to` `#3d78ff`;
  - `--color-wm-glow-accent`, `--color-wm-glow-mark` (halos);
  - `--container-wm-site: 72.5rem`;
  - text styles `--text-wm-site-hero` (5rem/1.2/−0.025em/700), `-hero-mobile` (2.1875rem/1.24/−0.02em), `--text-wm-site-section` (3.25rem/1.24/−0.02em), `-section-mobile` (1.875rem/1.28/−0.015em), `--text-wm-site-page` (4rem/1.18/−0.025em), `-page-mobile` (2.375rem/1.22/−0.02em), `--text-wm-site-doc-heading` (1.75rem/1.3/−0.01em).

- [ ] **Step 1: Write the failing tests:**
  - `read-landing-data.test.ts` with a fake fetch:
    - both 200 → the exact JSON string;
    - prices 500 → `undefined` and one `console.warn` containing `/v1/public/prices`;
    - FAQ times out after `timeoutMs` → `undefined`;
    - `required` and a network error → rejects with the message above;
    - `offline` → no fetch call;
    - a FAQ body with an item missing `answer` → `undefined`.
  - `landing-data.test.ts`:
    - `parseLandingData(undefined).source === 'fallback'` and its prices equal the three numbers above;
    - `''` and `'{'` → fallback;
    - a valid string → `source: 'api'`, and its FAQ order is kept;
    - `FALLBACK_LANDING_DATA.faq.length === 6`, and the first question is "Gói Pro có tự gia hạn không?".
  - `lib/period-offer.test.ts` keeps its cases. Add `{ '1': 79000, '3': 240000, '12': 599000 }` → months `'3'` gives `struck: null`, `saving: null`.
  - `ui/actions.test.tsx`: `ButtonLink reload` renders an `<a>` whose `href` is exact and which has no `next/link` client handler. Assert that a click is not `preventDefault`ed.
  - `web-tokens.test.ts` pins the new values and the light/dark key parity.
- [ ] **Step 2: Run** `pnpm vitest run scripts/read-landing-data.test.ts src/site src/lib/period-offer.test.ts src/ui src/styles` → FAIL.
- [ ] **Step 3: Implement.** In `next.config.ts`, import `PHASE_PRODUCTION_BUILD` from `next/constants`.
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS; the four admin checks → PASS. Then `pnpm cf:docker` builds with `LANDING_DATA_SOURCE` unset and no API:
  - the build log has the one warning;
  - `pnpm assert:render-mode` passes;
  - `grep -c "599.000" .next/server/app/vi.html` (or the prerendered `/vi` file the manifest names) is ≥ 1 after M8.5. Before M8.5, check that `process.env.WORDMET_LANDING_DATA` is inlined: grep the server chunk for the JSON.
  - **UNVERIFIED until this step:** that the `env` inline reaches server components under Turbopack. If it does not, stop and record it.
- [ ] **Step 5: Commit** `feat(web): read prices and faq at build and share the logo and theme switch`.

### Task M8.4 (M8b): Site header, footer and route groups

**Files:**
- Create: `S/layout/{SiteHeader,SiteFooter,SkipLink,Container}.tsx`, `S/layout/site-chrome.test.tsx`; route group `PUB/(pages)/layout.tsx`.
- Move: `PUB/page.tsx`, `privacy/`, `terms/`, `sources/` into `PUB/(pages)/` (URLs unchanged). `PUB/[...rest]/page.tsx` and `PUB/not-found.tsx` stay at `PUB/`, so the 404 renders without the header (Figma `16:317`).
- Modify: `PUB/layout.tsx` keeps `THEME_SCRIPT`, `ThemeProvider`, `JsonLd`, `SkipLink` and `<main id="main">`. The header and footer move to `(pages)/layout.tsx`; the 404 renders its own footer.

**Interfaces:**
- `SiteHeader({ locale, onHome: boolean })` (server):
  - sticky, `--bg` at 72 % with `backdrop-blur` (Figma component note `5:2`), height 68 (phone 60), `Container`;
  - logo `ui/Logo` → `/{locale}`;
  - desktop (`md`+): links "Nhóm từ" `#nhom-tu`, "Cách học" `#cach-hoc`, "Giá" `#gia` (on legal pages `/{locale}#…`), `ThemeToggle`, "Đăng nhập" (white secondary, `reload`) → `/{locale}/app/login`, "Đăng ký" (navy primary, `reload`) → `/{locale}/app/register`;
  - phone: logo, "Đăng nhập", "Đăng ký" only, each ≥ 44 px tall (QM8-1a, QM8-1a′, QM8-1b′).
- `SiteFooter({ locale })`:
  - Figma `7:209` / `9:100`: logo, links "Chính sách bảo mật", "Điều khoản sử dụng", "Nguồn dữ liệu", "Liên hệ" (`mailto:` `site.contactEmail`), "© {year} Wordmet";
  - phone only: a "Giao diện" control with "Sáng" / "Tối", a client island over `ThemeProvider`, the same storage key `wordmet-web.theme`.
- Copy keys: `Nav` gains `login` "Đăng nhập", `signup` "Đăng ký", `groups` "Nhóm từ", `howTo` "Cách học", `pricing` "Giá", `theme` "Giao diện", `light` "Sáng", `dark` "Tối". `Landing.nav.*` and `Landing.footer.*` go.

- [ ] **Step 1: Write the failing tests** (`site-chrome.test.tsx`, by role and text):
  - the header has links "Đăng nhập" → `/vi/app/login` and "Đăng ký" → `/vi/app/register`, both plain anchors;
  - "Giá" → `#gia` on the home and `/vi#gia` with `onHome=false`;
  - the footer has the four links and "© 2026 Wordmet" (fake date);
  - the phone theme control switches `data-theme` and writes `wordmet-web.theme`.
  - `e2e/locale.spec.ts` LPE4 (`/vi/khong-ton-tai` → 404 with heading "Không tìm thấy trang") keeps passing.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS.
- [ ] **Step 5: Commit** `feat(web): add the new public header and footer`.

### Task M8.5 (M8b): Home page sections

**Files:**
- Create: `S/landing/{Hero,WordStrip,GroupsSection,LearnSection,PricingSection,FaqSection,FinalCta,copy}.tsx|ts`, `S/landing/landing.test.tsx`.
- Modify: `PUB/(pages)/page.tsx`, `messages/{vi,en}.json` (`Landing` rewritten), `src/i18n/messages.test.ts` (LP30 goes: the FAQ now comes from data).
- Delete:
  - `components/landing/**`;
  - `components/interactive/Reveal.tsx` and its test (replaced in M8.6);
  - the `App.*` keys only the old landing read (`App.review.flip`, `App.addWord.save`, others `getAppCopy` used): grep `t('…')` first.

**Interfaces:**
- The page renders, in this order (Figma `5:13` / `9:108`, M8 Figma A §2, §4):
  1. `Hero`: topic pill with the 5 topics, title with "trong câu" in accent, lead, buttons "Bắt đầu miễn phí" (primary, `reload` → register) and "Xem cách học" (secondary → `#cach-hoc`), stage mock-up and floating cards (desktop 2, phone 1);
  2. `WordStrip`: two rows from §2.2;
  3. `GroupsSection` `id="nhom-tu"`;
  4. `LearnSection` `id="cach-hoc"`: 4 cards, "Nghe và đọc phiên âm" on desktop only;
  5. `PricingSection` `id="gia"`;
  6. `FaqSection` `id="hoi-dap"`, rendered only when `faq.length > 0`;
  7. `FinalCta`.

  The hidden paragraph section (`6:117`) is not built. Mock-ups are static markup with the copy of §2. Nothing comes from `App.*`.
- `PricingSection({ prices })` (QM8-2):
  - Free card per §2.6, with "Tạo tài khoản miễn phí" (secondary, `reload` → register) and "Có thể có quảng cáo.";
  - Pro card: "Pro" plus chip "Có AI" (gradient tokens), the Pro line, then **three static rows**, one per period. Each row has its label, a pill `−{saving}%` when `periodOffer(prices, m).saving` ≥ 1, the price (`format.money`), and "≈ {perMonth} mỗi tháng" for 3 and 12 ("mỗi tháng" for 1);
  - then the AI block, the check rows, one primary button "Tạo tài khoản" (`reload` → register), and the note "Không hoàn tiền tự động." (draft, QM8-6).
  - No struck price, no selection, no script.
- `FaqSection({ items })`: native `<details name="faq">`, first open, question SemiBold 17, answer Body/Base `--muted`; title "Câu hỏi thường gặp" and the lead line with support@wordmet.com.
- Drafted copy changes for the owner to check (QM8-6), listed in the PR body:
  - "Mỗi nhóm có lịch ôn riêng." → "Mỗi từ có lịch ôn riêng.";
  - "Thẻ từ · ngăn 3 ngày" → "Thẻ từ · ôn lại sau 3 ngày";
  - "lên ngăn · 7 ngày" → "ôn lại sau · 7 ngày";
  - "2 từ lên ngăn 7 ngày" → "2 từ ôn lại sau 7 ngày";
  - "Không hoàn tiền sau khi đã thanh toán." → "Không hoàn tiền tự động."

- [ ] **Step 1: Write the failing tests** (`landing.test.tsx`, with `landingData()` stubbed):
  - headings in order: hero h1 "Ôn từ đúng lúc, luyện từ trong câu.", then "Từ của mỗi đề thành một nhóm.", "Từ lúc gặp tới lúc dùng được", "Hai gói, không tự gia hạn.", "Câu hỏi thường gặp", "Bắt đầu với đề bạn vừa làm.";
  - pricing with the fallback prices shows "79.000 ₫", "199.000 ₫", "599.000 ₫", "−16%", "−37%", "≈ 66.300 ₫ mỗi tháng", "≈ 49.900 ₫ mỗi tháng";
  - with `{ '1': 79000, '3': 240000, '12': 599000 }`, the 3-month row has no "%";
  - FAQ with 6 items gives 6 `group` (details) elements, the first open; with `[]` there is no "Câu hỏi thường gặp" heading;
  - every link into `/vi/app/` is a plain anchor;
  - `copy.test.ts`: `vi` and `en` have the same `Landing` keys, with no "!" and no "Vui lòng".
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** in `S/landing/` with `wm-` classes only (no old token class in `S/**`).
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the home page from figma`.

### Task M8.6 (M8b): Motion of the home page and the 404

**Files:**
- Create: `S/interactive/{motion.ts,SplitWords.tsx,Reveal.tsx,Marquee.tsx,FlyIn.tsx,Parallax.tsx,TopicTicker.tsx,Sweep.tsx,DemoLoops.tsx}`, `S/interactive/motion.test.tsx`; keyframes in `src/app/globals.css` under a `/* site motion */` block, every value from `wm-` tokens.
- Source to port: `docs/mockups/2026-11-05-redesign-concepts/landing-mo.html`, CSS lines 51–257 and script lines 384–546.
  - Without the "Xem motion" panel (`.ctl`, line 257 on, markup line 373) and the `--slow` multiplier.
  - The mapping onto Figma's layout follows M8 Figma A §6.

**Interfaces** (numbers, `E` = `cubic-bezier(0.23, 1, 0.32, 1)` = `--ease-wm-out`):
- **Words** (hero title, section titles): split per word. Each word goes opacity 0 → 1 in 650 ms, `filter: blur(12px)` → 0 and `translateY(.3em)` → 0 in 800 ms, `E`, stagger 60 ms. It starts on load (hero) or on scroll-in (titles).
- **Reveal** (blocks): blur 16 px → 0, `translateY(18px) scale(.985)` → none in 900 ms, opacity in 700 ms, `E`. IntersectionObserver threshold .22, `rootMargin 0 0 -8% 0`, once.
- **Halos:** drift 16 s / 19 s `ease-in-out infinite alternate`, translate as in bản 3. Off below 760 px.
- **Wave bars:** `scaleY(.3)` ↔ 1, 900 ms `ease-in-out infinite`, offsets −150 ms per bar.
- **Floating cards:** bob 6 s `infinite alternate` (−5 px ↔ 6 px, keeping the card's rotation); pointer parallax on the hero (depth per card as bản 3, transition 400 ms `E`), fine pointers only.
- **Word strip:** two tracks, 52 s and 64 s (the second reversed), linear infinite, the list duplicated for a seamless loop.
- **Groups fly-in:** bản 3's fly-in (3D start positions, blur, scale .82) with Figma scene 2's timing:
  - transform 1150 ms, opacity 517 ms, `E`, 55 ms apart in Figma's shuffled order;
  - each card's border flashes to `--color-wm-accent` in 240 ms and back in 860 ms (not `#2445D6`);
  - the caption pill comes in last, 500 ms.
- **Demo cards** (LearnSection) run while on screen:
  - typing with a caret blinking 1 s `steps(1)`;
  - the listen button ping 2.4 s;
  - the bins light in turn, 300 ms transitions.
- **Topic ticker** (Figma scene 1): 20 px rows, each move 350 ms `cubic-bezier(.5,0,.5,1)`, hold 750 ms; the first row duplicated at the end for a seamless wrap.
- **Final card:** bản 3's glow running around the card (`conic-gradient` on `--ang`, 6 s linear infinite, `blur(40px)`).
- **Pro card** (Figma scene 6):
  - a light sweeping around the border, one lap per 6000 ms linear, corner turns 200 ms;
  - the four AI badges scale 1 → 1.18 in 250 ms (`E`) and back in 350 ms, starting 900 / 1150 / 1400 / 1650 ms, again every 3000 ms.
- **404** (Figma scene 5):
  - card: opacity 0 → 1 in 700 ms, `translateY(28px) scale(.96)` → none in 1000 ms;
  - "404": y −22 → 0, starts at 250 ms, 800 ms (opacity 600);
  - title, body, button: y 14 → 0 starting at 450 / 550 / 680 ms, 800 ms (opacity 600);
  - halos drift 5 s `ease-in-out infinite alternate`.
- **Phone (< 768 px):** every blur above 12 px uses 12 px (one CSS variable, `--wm-blur-cap`).
- **Reduced motion:** no transition, no animation; every element at its end state from the first paint (bản 3's 240 ms fade is dropped).
- **Before JS:** the server HTML is the end state. A `js` class set by the inline theme script (the public CSP allows it) is the only thing that hides elements before they animate.

- [ ] **Step 1: Write the failing tests** (`motion.test.tsx`):
  - `SplitWords` keeps the exact accessible text of the title (one `h1` whose name is the sentence) and marks the word spans `aria-hidden`, with an `sr-only` copy;
  - with `matchMedia('(prefers-reduced-motion: reduce)')` true, no element has the hidden start class after mount;
  - without the `js` class, no element is hidden;
  - `Marquee` duplicates its children once and marks the copy `aria-hidden`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS. Look at `/vi` in `pnpm dev:app` at 1440 and 390, side by side with `landing-mo.html`; note any difference as a ruling.
- [ ] **Step 5: Commit** `feat(web): add the home page motion from landing round 3`.

### Task M8.7 (M8b): Chính sách, Điều khoản, Nguồn dữ liệu, 404

**Files:**
- Create:
  - `S/legal/{LegalLayout,LegalArticle,LegalToc,ReadingProgress,LegalCallout,LegalDraft}.tsx`;
  - `S/sources/SourcesPage.tsx`;
  - `S/legal/legal.test.tsx`, `S/sources/sources.test.tsx`.
- Modify: `PUB/(pages)/{privacy,terms,sources}/page.tsx`, `PUB/not-found.tsx`, `messages/{vi,en}.json` (`Legal`, `Sources`, `NotFound`).
- Delete: `components/sections/**`.

**Interfaces:**
- `LegalLayout({ title, lead, version, effectiveDate, kind: 'privacy' | 'terms', markdown })` (Figma `14:172` / `17:260`, `15:190` / `17:355`, M8 Figma B §2–§4):
  - header block: meta "Phiên bản {version} · Có hiệu lực từ {date}" (QM8-4; Điều khoản adds " · Áp dụng cho wordmet.com"), title `--text-wm-site-page`, lead;
  - `ReadingProgress`: 3 px bar under the header, sticky with it, width = article scroll progress;
  - `LegalToc`, from the `##` headings (`lib/legal-outline.ts`):
    - desktop: a 260 px sticky card on the **left**, current section filled `--accent-soft`;
    - phone: a sticky pill "Mục lục" + the current section + a chevron. It opens an inline list under the pill (disclosure; the open state is not drawn, ruling) and closes on a link click;
    - without JS: plain anchor links, no current state.
  - `LegalArticle`: Markdown per M8 Figma B §3:
    - h2 `--text-wm-site-doc-heading` (phone 24), 32 px above;
    - p 17/1.7 (phone 16/1.7);
    - `strong` 600;
    - lists with a disc, 6 px apart;
    - links SemiBold accent, underlined;
    - h3, blockquote, table and code (not drawn) styled from §3.3 rules and recorded as a ruling;
    - bare emails stay links.
  - `LegalCallout` (desktop and phone): privacy "Còn câu hỏi về dữ liệu của bạn?" / "Gửi từ chính email của tài khoản. Phản hồi trong 02 ngày làm việc."; terms "Có vấn đề với thanh toán?" / "Gửi email tài khoản, mã chuyển khoản (bắt đầu bằng WM) và ảnh biên nhận."; button "support@wordmet.com →" (`mailto:`).
  - `LegalDraft` (nothing published): the header block without meta, the notice `Legal.draftNotice`, the contact email.
- `SourcesPage({ items })` (Figma `16:210` / `18:283`, M8 Figma B §5):
  - title, lead in `--ink`, the note "Trang này tự cập nhật…" (desktop only), count heading "{count} nguồn đang dùng";
  - one card per source: desktop two columns (name 28, version line, "Giấy phép: …", attribution, "Trang gốc" + icon + display URL); phone one column **with** the attribution (QM8-5), without the display URL;
  - **no "Dùng cho" pill**;
  - cards alternate `--surface` + card shadow and `--accent-soft`, as Figma;
  - `null` or `[]` → `Sources.empty`.
- `PUB/not-found.tsx` (Figma `16:317` / `18:358`): no header, card 600 / 358 wide, "404" (Bricolage ExtraBold 104/80, accent, `aria-hidden`), h1 "Không tìm thấy trang", body, button "Về trang chủ →" → `/`, halos, footer. Motion from M8.6.
- New keys: `Legal.privacyLead`, `Legal.termsLead`, `Legal.versionLine`, `Legal.termsScope`, `Legal.contentsOpen` (accessible name of the phone pill), `Legal.{privacy,terms}Help{Title,Body}`, `Sources.autoUpdate`, `Sources.count`. The `Legal` key list pinned by `copy.test.ts:46` changes with them.

- [ ] **Step 1: Write the failing tests:**
  - `legal.test.tsx`:
    - with a published privacy text, the page has exactly one `h1` "Chính sách bảo mật", the line "Phiên bản 3 · Có hiệu lực từ 20/11/2026" (data `version: 3`, `effective_date: '2026-11-20'`), a `navigation` named "Mục lục" whose links point at the `##` ids, and the callout link `mailto:support@wordmet.com`;
    - draft state: the notice text and no "Phiên bản";
    - the phone pill toggles `aria-expanded`.
  - `sources.test.tsx`:
    - 3 items → "3 nguồn đang dùng" and 3 headings;
    - attribution text present at every width (one DOM, no `hidden` on phone);
    - no text starting "Dùng cho";
    - `[]` → the empty sentence.
  - `locale.spec.ts` LPE4 keeps passing.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS.
- [ ] **Step 5: Commit** `feat(web): rebuild the legal, sources and not-found pages`.

### Task M8.8 (M8b): SEO and metadata

**Files:**
- Modify:
  - `src/lib/metadata.ts` (+ `pageMetadata`);
  - `PUB/(pages)/{privacy,terms,sources}/page.tsx`;
  - the `(auth)` layouts under `src/app/[locale]/app/` (title and description, still `noindex`);
  - `src/app/sitemap.ts`, `src/app/manifest.ts`;
  - `src/app/[locale]/layout.tsx` (`viewport.themeColor`; delete the Lexend comment);
  - `components/seo/JsonLd.tsx` → `S/seo/JsonLd.tsx`;
  - `src/lib/landing-locale.test.ts`, `e2e/seo.spec.ts`.

**Interfaces** (design §11):
- `pageMetadata(locale, { path, title, description, index: boolean }): Metadata`:
  - canonical `/{locale}{path}`;
  - `alternates.languages` `{ vi: '/vi{path}', en: '/en{path}' }` for the legal and sources pages;
  - `openGraph { url, title, description }`;
  - `robots` from `index && site.indexable`.

  Descriptions: privacy `Legal.privacyLead`, terms `Legal.termsLead`, sources `Sources.intro`. Terms and Sources stay `noindex`.
- `JsonLd({ prices })` with `WebSite`, `SoftwareApplication`, `Organization`:
  - `SoftwareApplication.offers` has three `Offer`s (`priceCurrency: 'VND'`, `price` from `landingData().prices`, names "Pro 1 tháng", "Pro 3 tháng", "Pro 12 tháng") plus Free at `0`;
  - `Organization { name: 'Wordmet', url: site.url, logo: site.url + '/icon.svg' }`.
- Sitemap:
  - `/vi` always when indexable;
  - `/vi/privacy` when indexable, with `lastModified` from `getLegal()?.effective_date` when the read succeeds;
  - Terms and Sources not listed while they are `noindex`.
- `viewport.themeColor`: light `#f6f7fa`, dark `#0f1220`. `manifest` `background_color` and `theme_color` `#f6f7fa`.

- [ ] **Step 1: Write the failing tests:**
  - `seo.spec.ts` LP10: the `ld+json` types are exactly `['WebSite', 'SoftwareApplication', 'Organization']`, and the offers have `priceCurrency` `VND` and prices `[0, 79000, 199000, 599000]` on the fallback build;
  - `/vi/privacy` has canonical `/vi/privacy` and hreflang `vi` and `en`, and its `og:url` ends `/vi/privacy`;
  - `/vi/app/login` has a title other than the home title and `noindex`;
  - `landing-locale.test.ts`: the sitemap paths are `['/vi']` when not indexable, and `['/vi', '/vi/privacy']` with `NEXT_PUBLIC_INDEXABLE=true` (module reset).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS.
- [ ] **Step 5: Commit** `feat(web): add page metadata, sitemap rules and offers in vnd`.

### Task M8.9 (M8b): Delete `components/`, e2e, shots, PR

**Files:**
- Delete: `src/components/**` (what remains after M8.5, M8.7, M8.8), `src/i18n/navigation.ts` if `git grep` finds no importer.
- Modify:
  - `e2e/landing.spec.ts`: rewrite. The M2.5 auth-layout block (`:550–576`) moves unchanged to `e2e/auth-layout.spec.ts`; the `components/` import (`:2`) goes.
  - `e2e/{privacy,chrome,a11y,csp,locale}.spec.ts`;
  - `e2e-shots/shots.spec.ts` (set `gm-m8`, signed out);
  - `README.md:73`.

- [ ] **Step 1: Rewrite the e2e first; they fail on the old markup:**
  - LR20: "Đăng ký" in the header and the hero go to `/vi/app/register`.
  - LR21: `/en` → 307 `/vi`.
  - LR22: no sideways scroll at 320, 390, 768, 1440.
  - LR23 and LR24: the theme carries into `/vi/app/login`, and dark paints first.
  - LR25: with reduced motion, `getAnimations()` is empty after load.
  - LR26, JavaScript off: every section heading, the 3 prices, an open FAQ and the legal contents links are present.
  - LR27, LP25: axe with no serious or critical violation on `/vi`, `/vi/privacy`, `/vi/terms`, `/vi/sources`, `/vi/khong-ton-tai`, light and dark.
  - LR28, E23: no CSP violation.
  - LB3E6: the first visible `a[href^="/vi/app"]` does a full page load.
  - LR50: every control ≥ 44 px.
  - New:
    - at 390 the header holds the logo, Đăng nhập and Đăng ký with each `boundingBox().height >= 44` and no overflow;
    - the footer "Giao diện" control exists only below 768;
    - pricing shows "−16%" and "−37%" on the fallback build;
    - the FAQ has 6 items;
    - the 404 has no `banner` landmark;
    - `chrome.spec.ts`: the H1 is Bricolage Grotesque, weight 700.
- [ ] **Step 2: Run** `pnpm cf:docker` with the e2e named above → PASS. Then the whole web suite: unit, lint, typecheck, build, `assert:render-mode`, full e2e.
- [ ] **Step 3: Shots:** add set `gm-m8` (no sign-in) to `shots.spec.ts`:
  - pages: `/vi`, `/vi/privacy`, `/vi/terms`, `/vi/sources`, `/vi/khong-ton-tai`;
  - light and dark, at 390, 1024 and 1440.

  Run it against `pnpm dev:app`. Put each shot next to its Figma frame in the as-built.
- [ ] **Step 4: Docs:**
  - M8b as-built in the delivery record, rulings from R174, and the PR body lists every drafted string for the owner (QM8-6);
  - `deploy-checklist.md`: the "Landing mới" items done by M8, plus "set `LANDING_DATA_REQUIRED=1` with the API URL in `deploy-web.yml` at Deploy";
  - `docs/deliveries/landing-redesign.md` gets a note that M8 replaced it.
- [ ] **Step 5: Commit and PR** `feat(web): rebuild the public pages from figma` into `refactor/giao-dien-moi`, through `ship-pr`.

### Task M8.10 (M8c): Figma frames for the favicon and share images (owner gate)

- [ ] **Step 1:** load the `figma-use` skill. Every `use_figma` call starts on page 1 (owner's file habit), so switch to page `0:1` first. On page `0:1` draw:
  - frame "Favicon": the mark at 16, 32, 180 (apple) and 512 px, light and dark, built from Logo `3:14` (for example the "w" with the accent full stop);
  - frame "Ảnh chia sẻ 1200 × 630": `--bg` ground, the logo, the hero title of the page;
  - three variants for Chính sách, Điều khoản, Nguồn dữ liệu (title and lead of each page).

  Variables and text styles of the file only.
- [ ] **Step 2:** take screenshots and send them to the owner. **Stop here until the owner approves or asks for changes.** Record the approved node ids in the rulings.

### Task M8.11 (M8c): Icons, share images and their fonts

**Files:**
- Modify:
  - `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/app/[locale]/opengraph-image.tsx`;
  - `scripts/gen-og-fonts.mjs`, `src/app/[locale]/og-fonts.generated.ts`, `og-fonts.test.ts`;
  - `assets/fonts/{OFL.txt,README.md}`.
- Create: `PUB/(pages)/{privacy,terms,sources}/opengraph-image.tsx`, a shared renderer `S/seo/og-image.tsx`.
- Delete: `assets/fonts/Lexend-*.ttf`.

**Interfaces:**
- `renderOgImage({ title, lead }): ImageResponse` (1200 × 630, from the approved frame).
- Fonts are static TTFs, which `next/og` needs: Noto Sans Regular with Vietnamese, and Bricolage Grotesque ExtraBold. If upstream ships only variable files, make the static instances with `fonttools varLib.instancer` from the OFL sources. Record the source URL, licence and byte size in `assets/fonts/README.md`.
- `og-fonts.generated.ts` exports `notoSansRegular`, `bricolageExtraBold`.

- [ ] **Step 1: Write the failing tests:**
  - `og-fonts.test.ts`: both exports start with the TTF magic `00 01 00 00`;
  - `seo.spec.ts`: `/vi/opengraph-image`, `/vi/privacy/opengraph-image` → `image/png` 1200 × 630, and `og:image:alt` set per page.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Measure the Worker size before and after with the command in `deploy-checklist.md` (Worker section) and write both numbers there.
- [ ] **Step 4: Run** the whole web suite in `cf:docker` → PASS. Look at the four images beside the Figma frames.
- [ ] **Step 5: Commit, as-built, PR** `feat(web): add the new icons and share images` into `refactor/giao-dien-moi`.

## Decisions this part makes

The owner's decisions are QM8-1…QM8-9 in the decision record. Claude settled these while writing the part; the owner approves them with the plan:
- **Three PRs.** M8a (API and admin) and M8b (web) share no files, so they can run in parallel. M8c waits for the Figma approval.
- **FAQ is its own module**, `faq`, not part of Legal (M8 code F §2):
  - it is read at build time with the prices;
  - it is vi only, because the English home page is not served (L4);
  - its answers are plain text;
  - ordering is by a number field, as report reasons do; the admin has no drag-and-drop anywhere.
- **The 6 drafted answers are seeded published.** The home page then shows them from the first deploy. The owner checks them in admin (QM8-6), and M8.1 Step 0 checks each claim against the code first.
- **Build-time read through `next.config.ts` and `env`:**
  - no generated file and no request-time `fetch`, so `/vi` stays prerendered whatever OpenNext does at run time;
  - `LANDING_DATA_SOURCE=fallback` keeps e2e builds deterministic on a machine whose API is running;
  - `LANDING_DATA_REQUIRED=1` is set only at Deploy.
- **Route group `(pages)`**, so the 404 renders without the header, as Figma draws it.
- **`periodOffer` moves to `lib/`**, so the home page and Gói học compute the same percentages; `AppLogo` moves to `ui/`; the theme button moves to `site/layout/`.
- **Public display type is Bold 700** as Figma draws it (design §3.1 says 800). "404" and the logo stay 800.
- **The phone table of contents** opens an inline list (not drawn in Figma).
- **h3, blockquote, table and code** in the legal texts get styles from §3.3, because Figma draws none.
- **Legal callouts** show on phone too, although Figma's phone frames are cut before them.
- **The Điều khoản scope line** shows on phone too.
- **No struck price on the home page.** QM8-2 (c) keeps rows simple; Gói học keeps its struck prices.

**Open:** none. The drafted copy (FAQ answers, the five claim fixes, the refund note) is checked by the owner in the PRs, not before.

---

# Part 9 — M9 Kiểm thử và chế độ tối (branch `feat/giao-dien-moi-m9`)

**Goal:**
- M9a: turn the hand checks of design §13 into scripts kept in the repo. Unused message keys and JS size run in CI; Lighthouse and the shot set run by
  hand. Lazy-load Tùy chỉnh phiên and Giới thiệu Pro (§5.7), rename `DotGridBackground`, write the phone measurement guide.
- M9b: dark mode per the approved mockup (QM9-2, QM9-3): dark values for soft tints, group colours, shadows, scrim, paper, mesh and the "Chưa đúng"
  box; level colour tokens for the polish round; `color-scheme` and the browser bar following the in-app choice.
- One PR into `refactor/giao-dien-moi`, after M9b (QM9-1).

**Inputs:**
- Design §5.7, §7.1–§7.5, §8.1, §9 M9, §13, §14, §15.
- Decisions QM9-1…QM9-9 in `docs/superpowers/decisions/2026-11-09-giao-dien-moi-decisions.md`.
- Mockup bản chốt `docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html` (artifact `Ccnn3iPkr3srNv7diobFkL`). Its `.wm` and
  `.wm[data-mode="dark"]` blocks (lines 72–108), `--grain-raw` (line 19), `.mesh` (lines 109–115) and `.result` (lines 332–348) are the source of
  every dark number below. Comparison page `m9-toi-so-sanh.html`, questions 6–11.
- Facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-11-m9-{checks,dark}.md` ("M9 checks §n", "M9 dark §n"). Their line numbers predate
  M8b; the line numbers in this part were read on `57b3f71c`.
- Answers file `docs/preparation/GIAO_DIEN_MOI_M9_TRA_LOI_2026-11-11.md`.

Paths are under `apps/web/` unless they start with `packages/`, `docs/` or `.github/`.

**Order:**
- `feat/giao-dien-moi-m9` from `origin/refactor/giao-dien-moi` (`57b3f71c` or later), then `git merge docs/giao-dien-moi-plan-9`.
- M9a is M9.1 → M9.7, then M9b is M9.8 → M9.10, one task after another. M9.3 measures with the tool of M9.2; M9.10 runs on the finished tree.
- M8c (favicon, share images) is not needed first: it edits `app/icon.svg`, the OG files and fonts, which M9 does not touch. If it merges first,
  merge `origin/refactor/giao-dien-moi` before M9.10.
- Rulings continue from R251 (the highest is R250 on 12/11/2026).
- **Not in M9** (the polish round, QM9-9; plan part written after M9):
  - Nhóm arc carousel, Học motion, the font swap, radius C;
  - chips and tabs (11B), the Một nhóm table and level bars, the session copy in English, "Bậc" naming, the multi-group picker;
  - deleting `app-ui/` and `dark.css`, `island.css`, `dark-pastel.css`;
  - the seven `bg-wm-ink` fills (M9 dark §0.8);
  - practice and stage colours (dark values unchanged);
  - the dead `dot-grid` class of `AuthShowcase.tsx`.

## Part 9 constraints

- **Light mode looks the same after M9**, except the "Chưa đúng" panels (fail 9 % background, 62 % border; QM9-3). Every token M9 adds keeps the old
  light literal where one existed: scrim `rgb(27 36 68 / 0.3)`, paper `#fbfaf6` and `#e8e4d8`, mark halo 34 %, the three paper and stack shadows.
- **Dark values only under `[data-theme='dark']`**: `packages/design-tokens/web-dark.css`, plus the grain override already in `globals.css`. No
  Tailwind `dark:` variant: it follows the OS, not the in-app choice (M9 dark §0.11).
- **Colour values only in `packages/design-tokens`.** Two exceptions: the raw noise SVG of the grain (no colour), and `THEME_COLOR` for the browser
  bar, which `layout.tsx` already writes as hex. A dark colour that a contrast test reads is written as hex, because `luminance` in
  `web-tokens.test.ts` parses `#rrggbb`. The comment beside it gives the mix it came from.
- **Admin:** changing `packages/design-tokens` means the four admin checks. Admin does not import `web*.css`, so they must pass unchanged.
- **Scripts** are Node ESM `.mjs` in `scripts/`, each exporting a pure function tested in `scripts/*.test.ts` (vitest already includes
  `scripts/**/*.test.ts`). No new dependency; Lighthouse runs as `pnpm dlx lighthouse@13.6.0`.
- **Ads (QR4 parked):** `AdsenseLoader`, `SHOWS_ON` and `house-ad-counter.ts` stay untouched. M9.3 changes only how `HouseAd` is loaded.
- **Copy:** no new visible copy in the app. The guide for the owner is in Vietnamese.
- **Tests** query by role and visible text. A colour check reads the computed style of an element found by role.

## Part 9 Review Focus

1. **Light mode stays as it was.** A learner in light mode sees the same scrim, Tra từ paper, mesh and shadows as before M9. Pinned in M9.8 (light
   values of the new tokens equal the old literals) and M9.10 (light shots beside the earlier sets).
2. **The in-app choice against the OS.** "Tối" stored with the OS light, and "Sáng" with the OS dark: page, form controls (`color-scheme`), browser
   bar and dialog scrim follow the stored choice. Pinned in M9.9 (`ThemeProvider.test.tsx`, `e2e/app/m9-dark.spec.ts`).
3. **Group colours in dark.** The title on the Nhóm halo and the Một nhóm head, the name on the selected picker row, and the waiting numbers stay
   readable for all seven colours and the empty group. Pinned in M9.8 (contrast tests on the dark washes and the dark surface).
4. **A key used through a built key or from another file** (`t(\`noWords.${known}\`)`, a key named in one file and translated in another) is not
   deleted as unused; an allow entry that matches no key fails. Pinned in M9.1.
5. **The bundle gate reads the right file.** A missing file, an empty one, or one with no `/[locale]/app` row is an error, never a pass. A route only
   the new UI has (`/[locale]/app/settings/reports`) is listed, not failed. Pinned in M9.2.

### Task M9.1 (M9a): Unused message keys

**Files:**
- Create: `scripts/check-message-keys.mjs`, `scripts/check-message-keys.test.ts`, `scripts/message-keys-allow.json`.
- Modify: `messages/vi.json`, `messages/en.json` (delete the keys found unused).

**Interfaces:**
- `findUnusedKeys({ messages, sources, allow }): { unused: string[]; staleAllow: string[] }`
  - `messages`: the parsed `vi.json`; its leaf keys as dotted paths (1.519 on `57b3f71c`).
  - `sources: Array<{ path: string; text: string }>`; `allow: Array<{ key: string; why: string }>`.
  - A key is used when, for some split `P.R` of it, **one** source file holds both a namespace call for `P` and the string `R` in quotes (`'R'`,
    `"R"` or `` `R` ``). Namespace calls: `useTranslations('P')`, `getTranslations('P')`, `getTranslations({ …, namespace: 'P' })` (the three forms
    in `src/`). `P` may be empty: `useTranslations()` with the full key quoted.
  - An allow `key` is a dotted path, or a prefix ending `.*` that matches the prefix and everything under it. A key an allow entry matches is used. An
    allow entry that matches no key goes to `staleAllow`.
  - Both lists sorted.
- CLI `node scripts/check-message-keys.mjs`: reads `messages/vi.json`, every `src/**/*.{ts,tsx}` except `*.test.*`, and the allow file. It prints each
  unused key and stale entry and exits 1 if there is any; otherwise it prints `message keys: <n> used, 0 unused`.
- `en.json` parity stays with LP3 (`src/i18n/messages.test.ts`).

- [ ] **Step 1: Write the failing tests** (`check-message-keys.test.ts`, fixtures inline):
  - `{ A: { b: 'x', c: 'y' } }` with one file `useTranslations('A'); t('b')` → `{ unused: ['A.c'], staleAllow: [] }`;
  - `useTranslations('A.b')` with `t('c.d')` marks `A.b.c.d`;
  - `getTranslations({ locale, namespace: 'Legal' })` with `t('title')` marks `Legal.title`;
  - the namespace in one file and `'b'` only in another → `A.b` unused;
  - `` t(`noWords.${k}`) `` alone → the `A.noWords.*` keys unused; with allow `A.noWords.*` → used;
  - allow `A.gone.*` with no such key → `staleAllow: ['A.gone.*']`;
  - `{}` → `{ unused: [], staleAllow: [] }`;
  - **the repo:** `messages/vi.json`, `src/` and the allow file give `{ unused: [], staleAllow: [] }`. This is the CI gate.
- [ ] **Step 2: Run** `pnpm test scripts/check-message-keys` → FAIL (module missing).
- [ ] **Step 3: Implement**, then run the CLI on the repo. For each key it reports, grep `src/` for the key's last segment:
  - unused → delete it from `vi.json` and `en.json` in this commit;
  - used through a built key or from another file → an allow entry whose `why` names the file and line.

  Write both counts (deleted, allowed) in the as-built.
- [ ] **Step 4: Run** `pnpm test` (the whole web unit suite, LP3 included), `pnpm lint`, `pnpm typecheck` → PASS. Control: add `App.zzUnused` to both
  message files, run the repo test → FAIL naming it; remove it.
- [ ] **Step 5: Commit** `feat(web): check for unused message keys`.

### Task M9.2 (M9a): JS size against the old UI

**Files:**
- Create: `scripts/compare-bundle-stats.mjs`, `scripts/compare-bundle-stats.test.ts`, `bundle-baseline.json`.
- Modify: `scripts/cf-docker.mjs` (mode `--bundle-stats`).

**Interfaces:**
- `compareBundles(baseline, stats, opts?): { rows, added, removed }`
  - `baseline: Record<string, number>` (route → bytes); `stats: Array<{ route: string; firstLoadUncompressedJsBytes: number }>` (the rows of
    `.next/diagnostics/route-bundle-stats.json`, M9 checks §1.3); `opts = { prefix: '/[locale]/app', limit: 1.1 }`.
  - `rows: Array<{ route; before; after; ratio; over }>` for routes in both, sorted by route; `ratio = after / before`; `over` when
    `after > before * limit`.
  - `added`: app routes only in `stats`; `removed`: only in `baseline`. Neither fails.
  - Throws `Error('no app routes in stats')` when `stats` has no route starting with `prefix`.
- `bundle-baseline.json`: `{ "source": "archive/giao-dien-cu-2026-11", "commit": "50b632e7", "next": "16.4.3", "built": "<yyyy-mm-dd>", "routes": { … } }`,
  app routes only.
- CLI:
  - `node scripts/compare-bundle-stats.mjs [stats]`, default `.next/diagnostics/route-bundle-stats.json`: prints route, before KB, after KB and
    percent, then the added and removed routes. Exit 1 when a row is `over`, or the file is missing or unreadable.
  - `node scripts/compare-bundle-stats.mjs --write-baseline <stats> --commit <sha>` writes `bundle-baseline.json`.
- `pnpm cf:docker --bundle-stats`: in the container, `pnpm cf:build` with the env of the first web server in `playwright.config.ts` (`NEXT_PUBLIC_SITE_URL`
  `http://localhost:3100`, `NEXT_PUBLIC_LEARNER_APP` `on`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_AUDIO_BASE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `LANDING_DATA_SOURCE` `fallback`), then copies `.next/diagnostics/route-bundle-stats.json` to `.docker-out/route-bundle-stats.json`.

- [ ] **Step 1: Write the failing tests:**
  - before 100 000, after 110 000 → `over: false`; after 110 001 → `over: true`;
  - `/[locale]/app/settings/reports` only in stats → in `added`, no row;
  - `/[locale]/app/practice/history` only in baseline → in `removed`;
  - `/[locale]` and `/[locale]/privacy` give no row;
  - `[]`, or stats with public routes only → throws `no app routes in stats`.
- [ ] **Step 2: Run** `pnpm test scripts/compare-bundle-stats` → FAIL.
- [ ] **Step 3: Implement** the script and the cf-docker mode.
- [ ] **Step 4: Prove Next writes the file under OpenNext:** `pnpm cf:docker --bundle-stats` on this branch → `.docker-out/route-bundle-stats.json`
  exists and has at least one `/[locale]/app` row. If it does not, stop: write a ruling, leave the CI step out of M9.3, and compare with Lighthouse
  "Total JavaScript" on Hôm nay, Nhóm and Phiên luyện (design §5.7 fallback).
- [ ] **Step 5: Baseline.**
  1. `git worktree add --detach ../gm-baseline archive/giao-dien-cu-2026-11`.
  2. Copy this branch's `scripts/cf-docker.mjs` into it (untracked there, never committed) and run `pnpm cf:docker --bundle-stats` in its `apps/web`.
  3. From this branch: `node scripts/compare-bundle-stats.mjs --write-baseline ../gm-baseline/apps/web/.docker-out/route-bundle-stats.json --commit 50b632e7`.
  4. `git worktree remove ../gm-baseline`.
- [ ] **Step 6: Measure this branch before M9.3:** `node scripts/compare-bundle-stats.mjs .docker-out/route-bundle-stats.json`. Write the whole table in
  the as-built, whatever it shows; the exit code is not a gate yet.
- [ ] **Step 7: Commit** `feat(web): compare app route js size with the old ui` (script, test, cf-docker mode, baseline).

### Task M9.3 (M9a): Load Tùy chỉnh phiên and Giới thiệu Pro on demand; JS size in CI

**Files:**
- Modify:
  - `src/features/learner/practice/use-practice-starter.tsx` (`:15` import, `:110` render);
  - `src/app/[locale]/app/(member)/layout.app.tsx` (`:6` import, `:24` render);
  - `.github/workflows/ci.yml` (job `web`).
- Create: `src/features/learner/house-ad/HouseAdLoader.tsx`.

**Interfaces:**
- `use-practice-starter.tsx`: `const CustomizeDialog = dynamic(() => import('./CustomizeDialog').then((m) => m.CustomizeDialog), { ssr: false })`, as
  `add-word-context.tsx:8`. It renders only while `customize` is set (`{customize && <CustomizeDialog target={customize} … />}`), so the code loads on
  the first open. `CustomizeTarget` becomes an `import type`.
- `HouseAdLoader()` (`'use client'`): `dynamic(() => import('./HouseAd').then((m) => m.HouseAd), { ssr: false })`. The member layout is a server
  component, where `ssr: false` is not allowed, so it renders `<HouseAdLoader />` in place of `<HouseAd />`.
- CI job `web`: a step "JS size against the old UI", after "E2E tests" (whose `cf:build` leaves `.next/diagnostics/` in `apps/web`):
  `run: node scripts/compare-bundle-stats.mjs`.

- [ ] **Step 1: Run the guards before the change** (behaviour does not change, so the existing tests are the guard): `pnpm test
  src/features/learner/practice src/features/learner/house-ad`, then `pnpm cf:docker e2e/app/m5a.spec.ts e2e/app/m7b.spec.ts` → PASS.
- [ ] **Step 2: Change the two imports**, run the same tests → PASS. They pin: Tùy chỉnh phiên opens on the first press with focus inside;
  "Học nhiều hơn với Pro" opens after Hôm nay → Nhóm; Esc closes both.
- [ ] **Step 3: Measure:** `pnpm cf:docker --bundle-stats`, then the compare → every app route ≤ 110 %. Write the before and after bytes of
  `/[locale]/app`, `/[locale]/app/practice` and `/[locale]/app/groups` in the as-built. If a route is still over: list the `firstLoadChunkPaths` it
  has and its baseline route lacks, and stop for the owner. Do not raise the limit.
- [ ] **Step 4: Commit** `refactor(web): load the customize and pro dialogs on demand`. Then add the CI step and commit
  `ci(web): fail the web job when an app route grows over 10%`.

### Task M9.4 (M9a): `AppBackground` and the deploy checklist

**Files:**
- Rename: `src/ui/DotGridBackground.tsx` → `src/ui/AppBackground.tsx`, export `AppBackground`.
- Modify:
  - importers `app-chrome/AppChrome.tsx:5,23`, `app-chrome/CardFrame.tsx:6,26`, `app/[locale]/app/(member)/(focus)/layout.app.tsx:3,10`,
    `features/learner/auth/SplitFrame.tsx:9,20`, test `ui/actions.test.tsx:5,76-82`;
  - "dot grid" wording in the comments of those files and the M9 comment of `app-mesh` in `globals.css`;
  - `docs/deliveries/deploy-checklist.md`, section "Đo tải trước launch": re-measure `GET /v1/groups` with 100 groups × 2.000 words on the real server
    (delivery record M3: 100 ms under its limit, measured on this machine).

- [ ] **Step 1:** make `actions.test.tsx` import `AppBackground` (test names "AppBackground is hidden…", "AppBackground draws the mesh…") → run → FAIL
  (module missing).
- [ ] **Step 2:** rename, update the importers → `pnpm test`, `pnpm lint`, `pnpm typecheck` PASS. `git grep -n DotGridBackground apps/web` → no output
  (control: run it before the rename and see the importers and the test listed).
- [ ] **Step 3: Commit** `refactor(web): rename the app background component`, then the checklist line as `docs(web): add the groups timing to the
  deploy checklist`.

### Task M9.5 (M9a): `pnpm lighthouse`

**Files:**
- Create: `scripts/lighthouse.mjs`, `scripts/lighthouse.test.ts`.
- Modify: `package.json` (`"lighthouse": "node scripts/lighthouse.mjs"`), `.gitignore` (`.lighthouse/`).

**Interfaces:**
- `summarise(report: { categories: Record<string, { score: number | null }> }): { performance: number | null; accessibility: number | null;
  bestPractices: number | null; seo: number | null }`: each score × 100, rounded; a missing category or a `null` score gives `null`.
- CLI `pnpm lighthouse [baseUrl]`, default `http://localhost:3001`:
  - pages `/vi` and `/vi/privacy`; form factors mobile (Lighthouse default) and desktop (`--preset=desktop`);
  - each run: `pnpm dlx lighthouse@13.6.0 <url> --output=json --output=html --output-path=.lighthouse/<page>-<form> --chrome-flags=--headless=new
    --quiet`, with `CHROME_PATH` passed through when set;
  - prints one row per page and form factor: the four scores.
- The run itself is in M9.10. The JSON-LD shape is already pinned by `src/site/seo/JsonLd.test.tsx` (M8.8, 3 tests), so M9 adds no JSON-LD test.

- [ ] **Step 1: Write the failing test:** scores `0.915` → `92`, `1` → `100`, `null` → `null`; a report with no `seo` category → `seo: null`.
- [ ] **Step 2: Run** `pnpm test scripts/lighthouse` → FAIL (module missing).
- [ ] **Step 3: Implement**, then run the test → PASS.
- [ ] **Step 4: Commit** `feat(web): add a lighthouse command for the public pages`.

### Task M9.6 (M9a): Shot set `gm-m9`

**Files:** Modify `e2e-shots/shots.spec.ts`.

**Interfaces:**
- `type ShotOpts = { dir: string; widths: number[]; scheme: 'light' | 'dark' }`. `shoot(page, name, fullPage, opts)` writes
  `test-results/shots/<dir>/<name>-<scheme>-<width>.png`.
- Every `gmMn(page, opts?)` takes `ShotOpts`. Without `opts` it keeps today's widths and scheme, so `SHOTS_MILESTONE=gm-m1` … `gm-m8` shoot what they
  shoot now (`gm-m1` still runs its light and dark loop).
- New `gmM5(page, opts)`, the practice screens (§9 M5): Luyện tập; Tùy chỉnh phiên in its three Figma frames (`131:3890`, `140:4049`, `141:4147`); a
  session with a typed-word question, the "Chưa đúng" panel, the hint panel open, the round prompt and the summary; Từ hay sai; Ôn (question,
  answer, result, summary); Học (front, back, summary). Each frame waits for its heading or dialog by role.
- `gmM9(page)`: for each scheme of `['light', 'dark']`, `page.emulateMedia({ colorScheme })`, then every set in the order the sets need (signed-out
  pages first, one sign-in), each with `{ dir: 'gm-m9/<set>', widths: [390, 768, 1024, 1440], scheme }` (QM9-5).
- `test('milestone screenshots')` dispatches `gm-m9`. The `gm-m8` branch stays first (no account needed).

- [ ] **Step 1:** refactor, add `gmM5` and `gmM9` → `pnpm lint`, `pnpm typecheck` PASS. The run is in M9.10 (it needs the stack).
- [ ] **Step 2: Commit** `test(web): add the gm-m9 shot set for every screen`.

### Task M9.7 (M9a): Phone measurement guide

**Files:** Create `docs/deliveries/giao-dien-moi-do-dien-thoai.md` (Vietnamese, for the owner; QM9-7).

Content:
- What to measure (design §8.1, §8.5): one Học session of 20 cards and 6 switches of the Nhóm carousel, on a low-end Android and on Safari iOS. Write
  the median frame rate and the worst frame (ms).
- **Way A, same Wi-Fi (QM9-7).** The API on the PC (`pnpm run:dev` in `apps/api`) with `http://<IP máy tính>:3001` added to `CORS_ORIGINS`; the web with
  `NEXT_PUBLIC_API_BASE_URL=http://<IP máy tính>:3000 pnpm dev:app -H 0.0.0.0`; the phone opens `http://<IP máy tính>:3001/vi/app`. Limits, said
  plainly:
  - the web runs in dev mode, so frame rates come out lower than production;
  - the Windows firewall must allow ports 3000 and 3001 inbound, which is the owner's own setting;
  - `ASSUMPTION`: the sign-in cookie is `Secure` (`apps/api/src/identity/sessions/session-transport.ts:14`), so over `http://<IP>` it may not be
    kept. Check first: sign in, reload; if signed out, use way B.
- **Way B, Android over USB.** Chrome on the PC, `chrome://inspect` → Port forwarding `3000 → localhost:3000`, `3001 → localhost:3001`. The phone
  opens `http://localhost:3001/vi/app`: the production build of `pnpm bootstrap`, no change to any setting, and the Performance panel in the same
  DevTools window.
- **iOS:** `ASSUMPTION`: Safari's Web Inspector needs a Mac. Without one, write "chưa đo" for iOS.
- A table to fill: máy, trình duyệt, màn, khung hình trung vị, khung chậm nhất (ms), ghi chú.

- [ ] **Step 1:** write the guide. **Step 2: Commit** `docs(web): add the phone frame rate guide`.

### Task M9.8 (M9b): Dark values and level tokens

**Files:**
- Modify: `packages/design-tokens/web.css`, `packages/design-tokens/web-dark.css`, `packages/design-tokens/README.md` (dark section),
  `src/styles/web-tokens.test.ts`.

**Interfaces (Produces):**

New colour keys, in both files:

| Key | Light (`web.css`) | Dark (`web-dark.css`) | Used by |
|---|---|---|---|
| `scrim` | `rgb(27 36 68 / 0.3)` | `rgb(0 0 0 / 0.55)` | M9.9: `ui/Dialog.tsx`, `CalendarModal.tsx` |
| `paper`, `paper-line` | `#fbfaf6`, `#e8e4d8` | `#1e2334`, `#2e3449` | M9.9: `.lk-paper`, `.lk-rule` |
| `halo-mark` | `rgb(255 216 74 / 0.34)` | `rgb(255 216 74 / 0.12)` | M9.9: `app-mesh` |
| `wrong-soft` | `#fbedeb` (fail 9 % on white, oklab) | `#352731` (`#e5603f` 16 % on `#171b2a`, oklab) | M9.9: "Chưa đúng" panels |
| `wrong-line` | `rgb(184 53 42 / 0.62)` | `rgb(229 96 63 / 0.55)` | same |
| `wrong-ink` | `#b8352a` | `#e87052` | same (title, badge) |
| `level-0` … `level-5` | `#a3abbd`, `#b9e4c7`, `#7ccd9b`, `#3fae6c`, `#218c4f`, `#106a39` | `#56607a`, `#1f4d35`, `#27704a`, `#319c60`, `#4cc283`, `#8ae4b0` | the polish round |
| `level-priority`, `level-due` | `#c4372c`, `#e0a21b` | `#ff8d80`, `#f0c04a` | the polish round |

Dark values that change (`web-dark.css`):
- `accent-soft` `#2c334f` (`#8da2ff` 20 % on `#171b2a`, oklab), `pass-soft` `#24373c` (`#62c98f` 18 %), `fail-soft` `#3c2f3a` (`#ff8d80` 18 %).
- Group `-ink`: 0 `#e87052`, 1 `#37a396`, 2 `#9d81de`, 3 `#d99a17`, 4 `#62a451`, 5 `#dc6c97`, 6 `#4c99d8`, empty `#8992a8`.
- Group `-wash` (16 % of the colour on `#171b2a`, srgb) / `-soft` (34 %): 0 `#38262d` / `#5d3231`, 1 `#172e38` / `#164449`, 2 `#272445` / `#392f63`,
  3 `#362f27` / `#594624`, 4 `#1f2f2c` / `#28452e`, 5 `#352137` / `#572845`, 6 `#1a2c45` / `#1d3f63`, empty `#23293a` / `#31384b`. These are the
  mockup's values (lines 102–108, 465).
- `color-scheme: dark;` first in the `[data-theme='dark']` block. The header comment and the practice and stage comments say what M9 kept: "unchanged
  in M9; the polish round replaces stage colours with level colours".

New shadow keys in `web.css`, light values equal to the raw values they replace in `globals.css`:
- `--shadow-wm-paper: 0 1.5rem 3rem -1.75rem rgb(27 36 68 / 0.45)` (`.lk-paper`);
- `--shadow-wm-paper-card: 0 1.875rem 3.75rem -1.875rem rgb(27 36 68 / 0.55)` (`.lk-card`);
- `--shadow-wm-contact: 0 0.0625rem 0.125rem rgb(27 36 68 / 0.06)` (first layer of `.gstack-face`).

Dark value of every `--shadow-wm-*` key: same geometry as light, black. Mockup lines 88–91 where it draws one.
- `card` `0 0.0625rem 0.125rem rgb(0 0 0 / 0.4), 0 0.625rem 1.75rem -0.875rem rgb(0 0 0 / 0.6)`
- `row` `0 0.0625rem 0.125rem rgb(0 0 0 / 0.35), 0 0.25rem 0.75rem -0.5rem rgb(0 0 0 / 0.6)`
- `pop` `0 0.125rem 0.375rem rgb(0 0 0 / 0.4), 0 1.5rem 3.5rem -1.5rem rgb(0 0 0 / 0.7)`
- `soft` `0 0.0625rem 0.125rem rgb(0 0 0 / 0.4), 0 0.875rem 2.125rem -0.875rem rgb(0 0 0 / 0.7)`
- `lift` `0 3.125rem 6.875rem -2.5rem rgb(0 0 0 / 0.85), 0 0.75rem 2rem -1rem rgb(0 0 0 / 0.4)`
- `btn`, `btn-pass`, `btn-fail` `none` (QM9-3, question 6B)
- `pro` `0 2.5rem 4.375rem -2.5rem rgb(0 0 0 / 0.7)`
- `stage` `0 2.5rem 6.25rem -3.125rem rgb(0 0 0 / 0.6), 0 3.125rem 6.875rem -2.5rem rgb(0 0 0 / 0.7)`
- `pro-glow` `0 0 3rem 0.125rem rgb(141 162 255 / 0.18), 0 2.5rem 6.25rem -3.125rem rgb(0 0 0 / 0.6), 0 3.125rem 6.875rem -2.5rem rgb(0 0 0 / 0.7)`
- `paper` `0 1.5rem 3rem -1.75rem rgb(0 0 0 / 0.7)`, `paper-card` `0 1.875rem 3.75rem -1.875rem rgb(0 0 0 / 0.85)`, `contact`
  `0 0.0625rem 0.125rem rgb(0 0 0 / 0.4)`

- [ ] **Step 1: Write the failing tests** (`web-tokens.test.ts`):
  - `TEXT_PAIRS` gains `['wrong-ink', 'wrong-soft']`, `['accent', 'accent-soft']`, `['ink', 'paper']`, `['muted', 'paper']`, `['accent', 'paper']`; the
    existing test runs them in light and dark (dark: 4.62, 5.16, 13.47, 6.98, 6.50).
  - Light values equal the old literals: `scrim`, `paper`, `paper-line`, `halo-mark`, and the three new shadows, exactly as in the tables above.
  - Shadows: `tokens(web, 'shadow-wm').size` is 14 (was 11); `tokens(webDark, 'shadow-wm')` has the same keys; no dark shadow contains `27 36 68` or
    `30 58 138`; dark `btn`, `btn-pass`, `btn-fail` are `none`.
  - Groups in dark, for 0–6 and `empty`: `-wash` and `-soft` equal the hex list above; group `-ink` reaches 4.5:1 on its `-wash` and on `surface`;
    dark `ink` reaches 4.5:1 on every `-wash` (the title on the halo).
  - Levels: the eight keys are `#rrggbb` in both files; in light the luminance of `level-1` … `level-5` strictly falls, in dark it strictly rises.
  - `web-dark.css` contains `color-scheme: dark`.
- [ ] **Step 2: Run** `pnpm test src/styles/web-tokens` → FAIL (keys missing, shadow count 11, dark washes near white).
- [ ] **Step 3: Implement** the tables in the two token files and the README dark section.
- [ ] **Step 4: Run** web `pnpm test`, `pnpm lint`, `pnpm typecheck`, and the four admin checks → PASS.
- [ ] **Step 5: Commit** `feat(web): add dark shadows, raised dark tints and level colour tokens`.

### Task M9.9 (M9b): Dark on the background, paper, scrim, "Chưa đúng" and the browser bar

**Files:**
- Modify:
  - `src/app/globals.css`:
    - `app-mesh`: the mark halo reads `var(--color-wm-halo-mark)`;
    - dark grain: `html[data-theme='dark'] &::before` gets `opacity: 0.07`, `mix-blend-mode: soft-light` and `background-image` = the same SVG without
      its `feColorMatrix` (mockup `--grain-raw`, line 19); its "tuned in M9" comment becomes a statement of what it is (QM9-3, question 10B);
    - `.lk-paper`: `background: var(--color-wm-paper)`, `border: 1px solid var(--color-wm-paper-line)`, `box-shadow: var(--shadow-wm-paper)`,
      `color: var(--color-wm-ink)`; delete the four dark overrides and their comment (`:833-837`, R71, R80);
    - `.lk-rule`: `border-color: var(--color-wm-paper-line)`;
    - `.lk-entry[aria-current='true']`: outline `color-mix(in srgb, var(--color-wm-ink) 35%, transparent)`, background
      `color-mix(in srgb, var(--color-wm-ink) 4%, transparent)` (same as today in light, where `ink` is `#1b2444`);
    - `.lk-card`: `box-shadow: var(--shadow-wm-paper-card)`; `.gstack-face`: the first shadow layer becomes `var(--shadow-wm-contact)`.
  - `src/ui/Dialog.tsx:43`, `src/features/learner/calendar/CalendarModal.tsx:31`: `bg-wm-mark-ink/30` → `bg-wm-scrim`.
  - The two "Chưa đúng" panels: `practice/session/AnswerFeedback.tsx:88-95` (wrong branch) and `practice/session/TypeWordQuestion.tsx:80-84`.
    Panel `border-wm-wrong-line bg-wm-wrong-soft`; badge `bg-wm-wrong-ink`; title `text-wm-wrong-ink`. `git grep -n "border-wm-fail bg-wm-fail-soft" src`
    also lists `LoginForm.tsx:94` (sign-in error), `SentenceQuestions.tsx:61`, `ui/AnswerOption.tsx:13` and `site/landing/parts.tsx:78`: they keep
    `fail`, as do the small chips of Ngày, `CompareLine` and tags.
  - `src/app-shell/theme/theme.ts`: export `THEME_COLOR = { light: '#f6f7fa', dark: '#0f1220' } as const`; `src/app/[locale]/layout.tsx:37` reads it.
  - `src/app-shell/theme/ThemeProvider.tsx`: in the effect that writes `data-theme`, also set `content` of every `meta[name="theme-color"]` to
    `THEME_COLOR[resolved]`. The inline `THEME_SCRIPT` stays as it is, so its CSP hash does not change; the bar follows the OS until hydration.
- Test:
  - `src/styles/app-background.test.ts`;
  - `src/app-shell/theme/ThemeProvider.test.tsx`;
  - create `e2e/app/m9-dark.spec.ts`;
  - `e2e/app/m6.spec.ts`, `e2e/app/m7a.spec.ts`, `e2e/app/m7b.spec.ts` (axe in dark).

- [ ] **Step 1: Write the failing tests:**
  - `app-background.test.ts`: the halos are `['accent 20', 'pass 18', 'accent 12']` plus `var(--color-wm-halo-mark)` in second place; the dark grain block
    has `soft-light`, `opacity: 0.07`, and a data URI with `feTurbulence` and no `feColorMatrix`.
  - `ThemeProvider.test.tsx`, with two `meta[name="theme-color"]` in the document (one with `media="(prefers-color-scheme: dark)"`, as Next renders them):
    stored `dark` and OS light → both `#0f1220`; stored `light` and OS dark → both `#f6f7fa`; `system` follows the OS.
  - `m9-dark.spec.ts` (mocked session as `e2e/app/m2.spec.ts`), at 390 and 1440:
    - stored `dark` (`addInitScript` on `wordmet-web.theme`) with `colorScheme: 'light'`: `/vi/app/groups` → `html` has `data-theme="dark"`, computed
      `color-scheme` `dark`, every theme-color meta `#0f1220`. Press `L`: the nearest `position: fixed` ancestor of the Lịch `dialog` has background
      `rgba(0, 0, 0, 0.55)`. Axe has no serious violation.
    - stored `light` with `colorScheme: 'dark'`: `light`, `#f6f7fa`, `rgba(27, 36, 68, 0.3)`.
  - Axe in dark: in `m6.spec.ts` (test 1), `m7a.spec.ts` (tests 1, 3, 4) and `m7b.spec.ts` (tests 1–3), wrap the test in
    `for (const colorScheme of ['light', 'dark'] as const) test.describe(colorScheme, () => { test.use({ colorScheme }); … })`. These add coverage; they
    may pass before the change.
- [ ] **Step 2: Run** the unit tests and `pnpm cf:docker e2e/app/m9-dark.spec.ts` → FAIL (halo literal 34 %, grain `screen`, bar unchanged, scrim navy
  in dark).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** web unit, lint, typecheck, then `pnpm cf:docker` with `e2e/app/{m9-dark,m6,m7a,m7b,m2,m4,m5a,cai-thien-a-group}.spec.ts` and
  `e2e/a11y.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): apply the approved dark mode to background, paper and dialogs`, then the axe loops as `test(web): run axe in dark on
  the calendar, settings and plans journeys`.

### Task M9.10 (M9b): Full run, shots, Lighthouse, as-built, PR

- [ ] **Step 1: Whole suite.** Web unit, lint, typecheck, `pnpm cf:docker` (full e2e and render mode); admin's four checks; `pnpm cf:docker
  --bundle-stats` and the compare → PASS. Write the final JS size table in the as-built.
- [ ] **Step 2: Stack of this branch.** Tell the owner first: `pnpm bootstrap` uses the fixed project name `english-learning`, so it replaces the
  containers the main checkout runs (switch back by running it from the main checkout). Run `pnpm bootstrap`, then `pnpm bootstrap seed` from the
  worktree root. The seeded learner's email and password go to `SHOTS_EMAIL` / `SHOTS_PASSWORD` in the shell only, never into a file or a reply.
- [ ] **Step 3: Shots.** `SHOTS_MILESTONE=gm-m9 SHOTS_BASE_URL=http://localhost:3001 pnpm shots` → `test-results/shots/gm-m9/**` (not committed). Look at
  every dark shot beside the mockup's dark frames, and every light shot beside the earlier sets. Each difference is a ruling: fixed in M9, or listed
  for the polish round. Frames the seed data cannot reach are listed as "chưa chụp", never faked.
- [ ] **Step 4: Lighthouse and Schema.**
  - `pnpm lighthouse` against `http://localhost:3001` → the table into the as-built. The bootstrap web is built without `NEXT_PUBLIC_INDEXABLE`, so
    the "is-crawlable" audit fails by design: write the SEO score with that audit named; do not change the build for it.
  - Schema Markup Validator (validator.schema.org, code snippet mode) with the `ld+json` of `/vi`: errors and warnings into the as-built.
- [ ] **Step 5: Phone.** The owner measures with the guide (M9.7) and fills its table. Not a gate for this PR; design §14 needs the numbers before
  the final PR into `dev`.
- [ ] **Step 6: Docs.**
  - M9 as-built in `docs/deliveries/giao-dien-moi.md`; rulings from R251;
  - design §7.2: the dark values M9 set (shadows, soft tints, scrim, paper, groups, levels);
  - remove the "until M9" notes this part settled (M9 dark §8).
- [ ] **Step 7: Commit and PR** `feat(web): add the approved dark mode and the m9 checks` into `refactor/giao-dien-moi`, through `ship-pr`.

## Decisions this part makes

The owner's decisions are QM9-1…QM9-9 in the decision record. Claude settled these while writing the part; the owner approves them with the plan:
- **Dark is fixed in tokens.** Components change only where they write a colour themselves (two scrims, two "Chưa đúng" panels) or a raw shadow.
- **Token names:** `scrim`, `paper`, `paper-line`, `halo-mark`, `wrong-soft`, `wrong-line`, `wrong-ink`, `level-0…5`, `level-priority`, `level-due`;
  shadows `paper`, `paper-card`, `contact`. "wrong" because the box is the wrong-answer panel; `fail` stays for errors and small chips.
- **Dark shadows the mockup does not draw** (`lift` second layer, `pro`, `stage`, `pro-glow`, the three new ones) keep their light geometry in black,
  0.4 for contact layers and 0.6–0.85 for the long ones, as the mockup's drawn ones do. `pro-glow` keeps a faint dark-accent glow.
- **Light changes only in the "Chưa đúng" panels.** Its approved light look (fail 9 %, 62 %) comes with the dark coral in one set of tokens.
- **Precomputed hex** for every oklab or srgb mix that a contrast test reads.
- **Message-key rule:** namespace call and quoted rest in the same file; everything else goes through the allow file with a reason.
- **CI:** unused keys run in the unit suite; JS size is a step after e2e; Lighthouse, Schema and shots stay by hand (they need a stack or an outside
  tool).
- **Baseline from the tag with the same build command and env as CI's e2e build**, through a `--bundle-stats` mode of `cf-docker`.
- **Tùy chỉnh phiên mounts only while open**; Giới thiệu Pro loads through a client wrapper, because the member layout is a server component.
- **The browser bar follows the in-app choice after hydration** (ThemeProvider), not at first paint, so the CSP hash of `THEME_SCRIPT` stays.
- **Shots run on `pnpm bootstrap` from the M9 worktree**, the only way so far to get this branch's web on :3001 with the real API (M3, M4 blockers).
- **The phone guide offers way B (USB port forwarding)** beside the decided Wi-Fi way, because of the `Secure` cookie and the dev-mode build.

**Open:**
- **QM9-7, phone way:** Wi-Fi (decided) needs the web in dev mode and may not keep the sign-in over `http://<IP>` (`Secure` cookie, `ASSUMPTION`). USB
  port forwarding on Android has neither problem. The owner picks before M9.10 Step 5.
- **iOS frame rate** needs a Mac (`ASSUMPTION`).
- Not M9: chỗ 24 (real skeleton shot), "mỗi trang chỉ gửi phần chữ trang đó cần", `group_ids` for the multi-group picker (polish plan), QR4.

---

# Part 10 — Đợt polish (branch `feat/giao-dien-moi-polish`)

**Goal:** make the learner app match the approved mockup bản chốt (QM9-9) everywhere, and remove the old UI layer. Three milestones on one branch:
- **PL-a, hệ thống:** level colours and the names "Mới, Bậc 1 … Bậc 5"; Noto Sans for every label (JetBrains Mono out); radius scale C; the shared
  pieces the audit found missing (page and section title, card, tabs, level chips, dialog frame, target-word mark, arrow); `app-ui/`, `theme.css`
  import, `dark.css`, `island.css`, `dark-pastel.css` deleted.
- **PL-b, các màn:** Hôm nay, Một nhóm, trang một từ, Tra từ, Luyện tập, Từ hay sai, Phiên luyện, Ôn, Học, the Thêm từ dialogs with the
  multi-group picker, Đăng nhập / Đăng ký.
- **PL-c, motion:** Nhóm "Vòng cung" carousel; Học "Chồng thẻ tan mờ" layout.
- Then the check of the 25 audit picks, the full shot set and one PR into `refactor/giao-dien-moi` (P.18).

**Inputs:**
- Decisions QM9-1 … QM9-9 (decision record, end), and the answers file `docs/preparation/GIAO_DIEN_MOI_M9_TRA_LOI_2026-11-11.md`, sections "Đã chốt
  cho mockup đầy đủ" and "Chỗ bổ sung" (cited "Chỗ bổ sung"). The 25 audit picks are read from the db `picks` of artifact `87DRK6yvkNo6vc9jm571FU`
  (read 12/11; same as the answers file). Audit `docs/audit/2026-11-11-ui-audit/README.md` is in the **main checkout only** (local, not committed).
- Mockup bản chốt `docs/mockups/2026-11-05-redesign-concepts/m9-ban-chot.html` (artifact `Ccnn3iPkr3srNv7diobFkL`), cited "mockup L<n>". It is the
  source of every number and every piece of copy below. Where it ports an artifact, the port wins over the artifact: Nhóm L462–508 and L866–947
  (artifact `6z635GjwYNpctydnMoNHJD`, local copy `vong-7-chong-the-tu-dien.html`, phone values L192–201 and L703–704 there); Học L219–311 and
  L993–1206 (artifact `TrbJBKg6VFE3x6YkjD1XT7`, local copy `chong-the-mo.html`).
- Code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-12-polish-{kit,screens}.md` ("kit §n", "screens §n"), read on `2c885e75`.
- Delivery record `docs/deliveries/giao-dien-moi.md`: "việc dọn chuyển sang đợt polish" (cited "dọn n") and "as-built M9", "Minor để lại".
- Design §7.1–§7.5, §9 "Đợt polish", §13, §14.

Paths are under `apps/web/` unless they start with `apps/api/`, `packages/`, `docs/` or `.github/`.

**Order:**
- `feat/giao-dien-moi-polish` from `origin/refactor/giao-dien-moi` (`cdcab4aa` or later: PR #268, M9, merged 12/11/2026 with CI green), then
  `git merge docs/giao-dien-moi-plan-polish`.
  If M8c merges first, merge `origin/refactor/giao-dien-moi` again before P.18.
- PL-a (P.1 → P.6), then PL-b (P.7 → P.15), then PL-c (P.16, P.17), then P.18. One task after another: every PL-b task uses the PL-a pieces, and
  P.11 changes the copy the later session tasks test against.
- **One PR** into `refactor/giao-dien-moi` after P.18 (owner, O2). Each milestone still ends with the whole web suite green.
- Rulings continue from R265 (R264 is the highest on 12/11/2026).

## Part 10 constraints

- **The mockup is the reference, not Figma.** Figma `JKnyUUtGjpGpfKK4PqBfdY` is not redrawn; where the two differ, the mockup wins (QM9-2).
- **Keep what the owner chose to keep:** chỗ 8 (house icon on the Luyện tập tab), 12 (logo and dialog-title letter-spacing), 16 (session bar 760
  at Phiên and Ôn, 1024 at Học), 19 (Luyện tập source rows with icon box and [Tùy chỉnh]), 22 ("Tạo nhóm nhanh" cards with an icon box), 25 (the
  phone tab bar). No task changes these.
- **Colours only in `packages/design-tokens`.** No new colour value in `globals.css` or `.tsx`. A `color-mix` the mockup uses becomes a token with
  a precomputed hex in both files (as M9.8 did), with the mix in a comment.
- **Level, not stage, in code and copy that the polish touches.** SRS `level` 0–5 stays the data name. The copy says "Mới", "Bậc 1" … "Bậc 5"
  (vi) and "New", "Level 1" … "Level 5" (en); "ngăn" and "box"/"stage" leave the copy. Interval copy: "ôn lại sau N ngày" / "review in N days".
  Colour is never the only signal: a level always has its name or number next to it (WCAG 1.4.1; Bậc 1–3 are light greens).
- **Labels are cased in the message files**, never by CSS (`uppercase`, `lowercase`, `first-letter:*` leave `src`).
- **Session copy is English** in Học, Phiên luyện and Ôn for every locale (QM9-9). Kept in Vietnamese: the Vietnamese meaning, the sentence
  translation, the Ôn question by meaning, group names (data, not copy).
- **Motion:** every new animation has a `prefers-reduced-motion: reduce` branch that ends in the final state at once; transform and opacity only,
  plus `filter: blur` where the mockup uses it (Học depth, Nhóm side cards). No motion library is added (screens §0.6): CSS and the Web Animations
  API, as `lib/stack-motion.ts` does.
- **Admin:** `theme.css` is not edited and stays exported. Any change in `packages/design-tokens` runs admin `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build`.
- **Ads (QR4 parked):** `AdsenseLoader`, `SHOWS_ON` and `house-ad-counter.ts` stay untouched.
- **API (P.12 only):** additive within v1, the same zod `strictObject` style, `@Idempotent`, `user.write` rate limit; no backend e2e (D38).
- **Tests** query by role and visible text. A test that pinned old copy or an old shape changes in the same commit as the behaviour, with the
  reason in the commit body.

## Part 10 Review Focus

1. **A learner whose browser is in Vietnamese opens a session.** All chrome is English and plural-correct ("1 card left", "2 cards left"), while
   the meaning, the translation and the group name stay Vietnamese, and "Back to home" goes to `/vi/app`, not `/en/app`. Pinned in P.11.
2. **Saving one word into three groups when one group is full.** The learner is told which group did not take it, and is never left believing all
   three saved: nothing is saved and the full group is named. Pinned in P.12.
3. **Levels for a colour-blind learner, and in dark mode.** Every level chip, bar segment and table cell carries its name or number; level text on
   its tint reaches 4.5:1 in light and dark. Pinned in P.1 (contrast test) and P.8.
4. **Nothing reads an old token after the imports go.** A class or `var(--…)` from `theme.css`, `dark.css` or the old `@theme` block left in `src`
   would silently resolve to nothing. Pinned in P.6 (the "no old token" test covers `.tsx`, `.ts` and `globals.css`).
5. **Fast input in the motion screens.** Pressing → five times on Nhóm, or 1/2 faster than the dissolve on Học, never leaves a card stuck between
   two positions or counts an answer twice. Pinned in P.16 and P.17.

## Owner decisions on this part (12/11/2026)

Asked after the plan was written; the owner answered first, then Claude gave its view. Recorded as QP1–QP4 in the decision record.
- **O1, saving one word into several groups → (a) `group_ids` in `POST /v1/quick-add`.** One transaction: every group saves or none does; one write
  of the 30-per-minute `user.write` limit. Claude agrees: no half-saved state to explain, and the service already runs one transaction
  (`quick-add.service.ts:57-81`).
- **O2 → one PR** after P.18. Claude agrees; the cost is one large review, eased by the milestone order of the commits.
- **O3 → keep `e___`** for fill-in sentences (CS20, D9 Bước 7); the API does not change. Claude agrees: the mockup's `e_______` was drawn without
  the Bước 7 decision in view. Non-AI typed questions keep their current hint.
- **`warn` colour → add it** (owner: "vậy thì bổ sung"): a new token, darkened until it reaches 4.5:1 (P.1).
- Not open (chụp rồi hỏi): **chỗ 24.** The owner asked to see the loading skeleton first. P.6 Step 1 shoots it on this branch and stops for the
  owner's choice before the skeleton part of Step 4.

## PL-a — Hệ thống

### Task P.1: Level colours and the names "Mới, Bậc 1–5"

**Files:**
- Create: `src/ui/levels.ts`, `src/ui/levels.test.ts`.
- Modify: the seven `STAGE_DOT` copies (kit §12: `add-word/GroupPicker.tsx:120`, `groups/GroupPage.tsx:53`, `practice/CustomizeDialog.tsx:58`,
  `practice/WeakWordsPage.tsx:26`, `practice/session/AnswerFeedback.tsx:14`, `today/TodayPage.tsx:256`, `word/LearningBlock.tsx:16`);
  `groups/stages.ts` (becomes a re-export, then deleted when its 10 importers move); `messages/{vi,en}.json` (the 34 "ngăn" keys, screens §2);
  `packages/design-tokens/web.css`, `web-dark.css` (delete `--color-wm-stage-*`), `README.md`; `src/styles/web-tokens.test.ts`.

**Interfaces (Produces):**
- `type Level = 0 | 1 | 2 | 3 | 4 | 5`.
- `LEVEL_FILL: Record<Level, string>` = `bg-wm-level-0` … `bg-wm-level-5`; `LEVEL_TEXT: Record<Level, string>` = `text-wm-level-*`;
  `STATE_TEXT = { priority: 'text-wm-level-priority', due: 'text-wm-warn', new: 'text-wm-muted', ok: 'text-wm-pass' }` (mockup L375).
- New colour `--color-wm-warn` (mockup L73, L87: light `#b07a12`, dark `#f0c04a`). Light `#b07a12` is 3.72:1 on white, under 4.5:1 for 13 px
  text: darken it until the test passes and record the hex as a ruling (dark is 10:1).
- `LEVEL_INTERVAL_DAYS: Record<Exclude<Level, 0>, 1 | 3 | 7 | 14 | 30>` = `{1:1, 2:3, 3:7, 4:14, 5:30}`.
- `useLevelName(): (level: Level) => string` → vi "Mới", "Bậc 1"…; en "New", "Level 1"… (`App.levels.name`, ICU `select`).
- `useLevelInterval(): (level: Level) => string | null` → `null` for 0, else "ôn lại sau 1 ngày" / "review in 1 day" (`App.levels.interval`,
  ICU `plural`).
- Copy: `App.stages.*` is replaced by `App.levels.{name,interval,new}`; every other key in screens §2's list is rewritten without "ngăn"
  (vi) / "stage", "box" (en). Example: `App.group.filterStage` "Ngăn {stage}" → `App.group.filterLevel` "Bậc {level}".

- [ ] **Step 1: Failing tests** (`levels.test.ts`): `useLevelName()(0)` is "Mới" (vi) and "New" (en); `(3)` is "Bậc 3" / "Level 3";
  `useLevelInterval()(4)` is "ôn lại sau 14 ngày" / "review in 14 days", `(1)` is "review in 1 day", `(0)` is `null`; `LEVEL_FILL[5]` is
  `bg-wm-level-5`. In `web-tokens.test.ts`: `warn` ≥ 4.5:1 on `surface` in light and dark; pin the eight light and eight dark level hexes of M9.8 (the M9 minor); level ink on its 18 % tint
  (`color-mix` precomputed in the test with the existing `mix` helper, or the hex written beside it) ≥ 4.5:1 in light and dark; drop the
  "declares the six stage colours" test. A test in `src/i18n/messages.test.ts`: no value in `vi.json` contains "ngăn" and no value in `en.json`
  contains "stage" or "-day box".
- [ ] **Step 2: Run** `pnpm vitest run src/ui/levels.test.ts src/styles/web-tokens.test.ts src/i18n/messages.test.ts` → FAIL (module missing;
  "ngăn" found in 34 keys).
- [ ] **Step 3: Implement** `levels.ts`; move the seven arrays and the 10 `STAGE_KEYS` importers onto it; rewrite the 34 keys (vi follows
  `~/.claude/rules/vietnamese-writing.md`; en by meaning); delete the stage tokens and their README lines.
- [ ] **Step 4: Run** web unit, lint, typecheck → PASS. Screen tests that matched "ngăn" text change with this commit. Admin's four checks.
- [ ] **Step 5: Commit** `feat(web): name review levels and colour them by level`.

### Task P.2: Noto Sans for labels, cased copy

**Files:**
- Modify: `src/app/[locale]/layout.tsx` (drop `JetBrains_Mono`), `src/app/globals.css:13-17` (drop `--font-wm-mono`), `packages/design-tokens/web.css:165-168`
  (`--text-wm-mono` → `--text-wm-meta`, same 0.75rem / 1.4, weight 500), `src/lib/cn.ts:14`, `src/ui/Tag.tsx` (`mono` prop → gone), the 50 files of
  kit §1, the 8 case-transform sites of kit §15 and their message keys, the 4 `raw-ok` comments naming JetBrains.
- Test: `src/styles/web-tokens.test.ts`, a new `src/styles/no-mono.test.ts`.

**Interfaces (Produces):** utility `text-wm-meta` (labels, counts, keycaps, IPA, per mockup L15–16, L128); `font-wm-sans` is the default body font
already, so labels drop `font-wm-mono` without a replacement class. `tabular-nums` stays where counts sit in columns (mockup L169, L491).

- [ ] **Step 1: Failing test** `no-mono.test.ts`: `git`-free scan of `src/**/*.{ts,tsx,css}` (except tests) finds no `font-wm-mono`, `text-wm-mono`,
  `JetBrains`, and no `lowercase` / `uppercase` / `first-letter:` class; `layout.tsx` imports exactly `Noto_Sans` and `Bricolage_Grotesque` from
  `next/font/google`.
- [ ] **Step 2: Run** → FAIL (103 + 96 hits, 8 case sites).
- [ ] **Step 3: Implement.** Labels and chips start with a capital in `vi.json` and `en.json` ("Fill in the blank", "AI sentence", "Studying", "Hôm
  nay"; Chỗ bổ sung). Tests that matched lower-case text change with this commit.
- [ ] **Step 4: Run** web unit, lint, typecheck; `pnpm cf:docker e2e/app/m2.spec.ts e2e/a11y.spec.ts` → PASS. Admin's four checks.
- [ ] **Step 5: Commit** `feat(web): use noto sans for labels and case copy in the message files`.

### Task P.3: Radius scale C

**Files:**
- Modify: `packages/design-tokens/web.css:48-58`, `README.md`; `src/styles/web-tokens.test.ts:52-70`; every `rounded-wm-*` site (≈350, kit §2),
  the arbitrary radii of kit §2 and `rounded-lg`, `rounded-xs`, `rounded-sm`, `rounded-control`, `rounded-card`, `rounded-inner` outside `app-ui/`.
- Create: `src/styles/radius-classes.test.ts`.

**Interfaces (Produces):** radius tokens by role, mockup L81–82 (owner 12/11: inner always smaller than its container):

| Token | Value | Use |
|---|---|---|
| `--radius-wm-key` | `0.25rem` (4) | keycaps, small labels, counts, word chips in piles |
| `--radius-wm-control` | `0.5rem` (8) | buttons, inputs, selects, chips, icon buttons, × |
| `--radius-wm-row` | `0.625rem` (10) | list rows, menus, popovers, toasts, the hint and translation blocks |
| `--radius-wm-card` | `0.875rem` (14) | cards, panels, the "Chưa đúng" box |
| `--radius-wm-dialog` | `1rem` (16) | dialogs, sheets, the Học card, Nhóm stack cards |
| `--radius-wm-pill` | unchanged | progress bars, avatar, phone tab pill |

`xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `button`, `modal` are deleted. A 6 px count box inside a 36 px chip (mockup L168) is `key`.

- [ ] **Step 1: Failing tests:** `web-tokens.test.ts` pins the six values above and a count of 6 radius keys; `radius-classes.test.ts` scans `src`
  (non-test) and finds no `rounded-wm-(xs|sm|md|lg|xl|2xl|button|modal)`, no `rounded-(xs|sm|lg|control|card|inner)\b`, no `rounded-[`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the tokens, then the sweep by the role table (not by the old size). Each file's diff is reviewed against its element's
  role; the three arbitrary radii of the calendar buttons and month dialog become `control` / `dialog`.
- [ ] **Step 4: Run** web unit, lint, typecheck; `pnpm cf:docker e2e/app/m1.spec.ts e2e/app/m4.spec.ts` → PASS. Admin's four checks.
- [ ] **Step 5: Commit** `feat(web): move radii to scale c by element role`.

### Task P.4: Shared pieces: titles, card, tabs, level chips, dialog frame, target word, arrow

**Files:**
- Create: `src/ui/PageTitle.tsx` (moved from `app-chrome/PageTitle.tsx`), `src/ui/SectionTitle.tsx`, `src/ui/Tabs.tsx`, `src/ui/LevelChip.tsx`,
  `src/ui/TargetWord.tsx` (replaces `groups/highlight.tsx`, `DictionaryPage.tsx:133-150` `marked`, `AiLookupResult.tsx:119-127`,
  `AddWordSheet.tsx:386`, `AuthShowcase.tsx:81-83`), tests beside each in `src/ui/*.test.tsx`.
- Modify: `src/ui/Card.tsx`, `src/ui/Dialog.tsx`, `src/ui/overlays.test.tsx`, `src/lib/cn.ts`, `src/lib/cn.test.ts`,
  `packages/design-tokens/web.css` (section title sizes), `messages/{vi,en}.json` (15 "→" each, kit §8).

**Interfaces (Produces):**
- `PageTitle({ children, eyebrow? })`: h1, `text-wm-app-title-mobile md:text-wm-app-title` (44 / 30, mockup L124–125). Used by every app page h1
  (chỗ 3), including Hôm nay and Nhóm.
- `SectionTitle({ as = 'h2', children })`: Bricolage 700, 1.375rem desktop / 1.25rem phone, line-height 1.25,
  letter-spacing −0.012em (mockup L126–127, L589), as new keys `--text-wm-block-title` and `--text-wm-block-title-mobile` (`--text-wm-section`
  is the landing's 52 px, `web.css:88`).
- `Card`: `rounded-wm-card bg-wm-surface shadow-wm-card p-5 md:p-6`, no border (mockup L140, L589). Every hand-built card of kit §4 (50 lines,
  33 files) moves onto it in the screen task that owns the file (P.7–P.15), not here.
- `Tabs({ items: { id, label, count? }[], selected, onSelect | hrefs })`: underline tabs, 24 px gap, 2 px accent underline on the selected tab,
  count in `text-wm-meta` (mockup L174–177). `role="tablist"` with buttons, or a `nav` of links when `hrefs` is given (word page anchors).
- `LevelChip({ tone: Level | 'all' | 'priority' | 'due', label, count, pressed, onPress })`: 36 px, `rounded-wm-control`, background 18 % of the
  tone colour on surface, border 45 %, pressed 40 % and a 1 px inset ring of the tone; count in a 24 px `rounded-wm-key` box on surface
  (mockup L161–173). Tints are tokens `--color-wm-level-*-tint`, `-tint-strong`, `-line` with precomputed hex in both files (light and dark),
  plus `all` on `accent`. `aria-pressed`.
- `TargetWord({ text, lemma, forms? })`: bold 700, underline 2 px, offset 3 px, accent decoration (mockup L136). One matcher: the lemma and its
  `forms` as whole words, case-insensitive, else the old `\b(word)[a-z]*\b` fallback. Yellow `bg-wm-mark` stays only for the Tra từ filter
  sentence (P.9).
- `Dialog`: × always shown (`closeLabel` becomes required), 36 px box, `rounded-wm-control`, 1 px `border-wm-line`, surface background (mockup L383);
  `wide` deleted (R62 ends); the cancel action of every dialog is a muted `TextButton` (mockup L725 note). The 9 outline "Hủy" buttons of kit §7
  move in this task (dialog files only).
- Arrow: the 15 "→" leave the message files; `ArrowRight` (lucide, `size-4`, stroke 1.75) is rendered after the link text where the copy had it
  (chỗ 14). First check on a fresh build whether Noto Sans's `latin` subset lacks U+2192 (kit §8, `ASSUMPTION`); write the finding as a ruling.
- `cn.ts`: the 13 missing size names (kit §4) in the `font-size` group. **Defect:** red test first, separate commit (dọn 8).

- [ ] **Step 1: Red test for `cn`** (`cn.test.ts`): `cn('text-wm-card-heading-mobile text-wm-ink')` keeps both classes; same for
  `text-wm-page-title`, `text-wm-app-title-mobile`, `text-wm-site-hero`. Run → FAIL. Commit `test(web): pin the missing font sizes in cn`.
- [ ] **Step 2: Fix `cn.ts`**, run → PASS, commit `fix(web): keep wm title sizes when cn merges a text colour`.
- [ ] **Step 3: Failing tests** for the pieces: `Tabs` (arrow keys move selection; the selected tab has `aria-selected`), `LevelChip` (name "Bậc 3
  11" read as one button with `aria-pressed`; pressing calls `onPress`), `TargetWord` (`'They mitigated the risk'` with lemma `mitigate` wraps
  "mitigated" in one `strong`; `'Mitigate it'` matches case-insensitively; no match leaves the text unchanged), `Dialog` (the × is a button named by
  `closeLabel`; no `wide` prop in its props type: a `// @ts-expect-error` line in the test).
- [ ] **Step 4: Run** → FAIL. **Step 5: Implement.** **Step 6: Run** web unit, lint, typecheck → PASS. Admin's four checks.
- [ ] **Step 7: Commit** `feat(web): add shared titles, tabs, level chips and the target word mark`, then `feat(web): give every dialog the same
  close button and cancel link`.

### Task P.5: `app-ui/` out

**Files:**
- Create: `src/ui/OfflineScreen.tsx`, `src/ui/NotFoundState.tsx`, `src/ui/StreakToast.tsx` (+ `showStreak`), `src/test-utils/render-app.tsx`
  (`renderApp`, `pickDate`); move `app-ui/toast.test.tsx` → `ui/toast.test.tsx`, `app-ui/streak-toast.test.tsx` → `ui/streak-toast.test.tsx`.
- Modify: the 14 imports of kit §9; the 63 test files using `renderApp` and 6 using `pickDate` (import path only); `eslint.config.mjs` only if the
  new folder needs a rule.
- Delete: `src/app-ui/` entirely.

**Interfaces (Produces):**
- `FullScreenSpinner` users get the route's `SkeletonPage` / `SkeletonBlocks` (design: skeletons, not spinners; chỗ 9).
- `StreakToast`: mockup L306–310: surface, 1 px line, `rounded-wm-row`, `shadow-wm-pop`, flame in a 22 px accent-soft square, "2-day streak"
  style copy from `App.streak`. Position is a prop: `placement: 'bottom' | 'session-corner'` (the session corner is used by P.17). Behaviour of
  `streak-toast.test.tsx` kept (3 s, no pointer, replace).
- `renderApp(ui, opts)` and `pickDate` keep their signatures; only the path changes to `@/test-utils/render-app`.

- [ ] **Step 1:** move the two tests to `ui/` and point them at the new files → FAIL (modules missing).
- [ ] **Step 2: Implement** the four pieces; move the 14 imports; codemod the test imports.
- [ ] **Step 3:** delete `src/app-ui/`; `pnpm typecheck` (not only `git grep`, dọn 4) → PASS; web unit, lint → PASS.
- [ ] **Step 4: Commit** `refactor(web): move the last app-ui pieces into ui and delete app-ui`.

### Task P.6: Old tokens out, skeleton, phone top bar

**Files:**
- Modify: `src/app/globals.css` (kit §10: body L514-516, focus L527-544, animations L128-224, L254-263, L384-389, `--ease-out-strong` L209,
  `--spacing-header` L109/L510, `@utility pressed` L400, `tilt-card` L410), `src/app/[locale]/app/layout.app.tsx:20`, `app-shell/AppProviders.tsx:67-69`,
  `ui/PronunciationLine.tsx:28,31`, `practice/session/SessionNotice.tsx:64`, `practice/session/ReportDialog.tsx:133`, the seven `bg-wm-ink` fills
  (kit §6) and the two public ones, `ui/Skeleton.tsx`, `app-chrome/PhoneHeader.tsx:14`, `app-chrome/AppChrome.tsx:12`, `app-chrome/FloatingButtons.tsx:11`,
  `features/learner/auth/AuthShowcase.tsx:17` (dead `dot-grid`), comments in `styles/app-background.test.ts`, `ui/actions.test.tsx`;
  `src/styles/tokens.test.ts`, `src/styles/text-classes.test.ts`; `packages/design-tokens/package.json` (`exports`), `README.md`.
- Delete: `packages/design-tokens/dark.css`, `island.css`, `dark-pastel.css`.
- Create: `src/styles/no-old-tokens.test.ts`.

**Interfaces (Produces):**
- `--ease-wm-out-strong` (same curve as `--ease-out-strong`) in `web.css`; the 14 `ease-out-strong` uses move to `ease-wm-out-strong`.
- The kept animations (`menu-in`, `toast-in`, `feedback-in`, `pop-in`, `card-rise`, `wiggle-soft`, `panel-drop`, `summary-in`, the toast close,
  `theme-icon-in/out`) move into the `wm` part of `globals.css`, reading only `--*-wm-*` variables.
- `bg-wm-ink` fills: Hôm nay "đến hạn" (`TodayPage.tsx:104,121`) → `level-due` tint; Day dialog filter and Một nhóm chips → `LevelChip` / `Tabs`
  (P.4; Một nhóm itself in P.8); `HintPanel.tsx:47,57` → the hint grid of P.13; the calendar tooltip → `bg-wm-surface` with `shadow-wm-pop`.
- Phone header 56 px (`h-14`), offsets in `AppChrome`, `FloatingButtons`, `Skeleton` follow (chỗ 25, header only).
- `SkeletonPage`: mesh background (`AppBackground`), top bar 64 px desktop and 56 px phone, the same column widths as the page it stands for,
  so content does not jump (chỗ 24, audit: 72 vs 64, flat vs mesh, 8 px jump).

- [ ] **Step 1: Shoot chỗ 24 for the owner.** On this branch's stack (`pnpm bootstrap` from the worktree; tell the owner it replaces the main
  checkout's containers), hard-load `/vi/app`, `/vi/app/groups`, `/vi/app/practice` at 390 and 1440 with the network throttled so the skeleton
  shows; save the frames under `test-results/shots/polish-skeleton/` (not committed) and send them to the owner. **Stop until the owner says which
  way the skeleton goes** (the token part of Steps 2–4 may go on meanwhile). The steps below assume "match the real page" (the audit's three points); a different answer is a ruling.
- [ ] **Step 2: Failing test** `no-old-tokens.test.ts`: from the custom properties declared in `packages/design-tokens/theme.css` and the old
  `@theme` block (read the names from those files, not a hand list), build the utility names (`bg-`, `text-`, `border-`, `shadow-`, `rounded-`,
  `animate-`, `ease-`, `font-` + name) and `var(--name)`; scan `src/**/*.{ts,tsx,css}` (non-test) and expect none. Tailwind defaults that collide
  (`rounded-sm`, `max-w-prose`, `shadow-sm`…) are matched only if `theme.css` redefines them (kit §2: `--radius-sm`). `tokens.test.ts`: the
  `island.css`, `dark-pastel.css`, `dark.css` blocks are deleted; LP31 keeps only what still applies to `theme.css` (admin); the brace-balance
  test stays. `text-classes.test.ts` allows only `wm-` names.
- [ ] **Step 3: Run** → FAIL (72 colour hits, 14 `ease-out-strong`, body, focus…).
- [ ] **Step 4: Implement**; drop `@import` of `theme.css`, `dark.css`, `island.css` from `globals.css`; delete the three files and their
  `exports` lines; rewrite the package README to describe `web.css` / `web-dark.css` (and `theme.css` for admin only).
- [ ] **Step 5: HouseAd count (M9 minor), a defect.** Red test in `house-ad/house-ad.test.tsx`: a navigation while `me` is still loading is
  counted once `me` arrives. Commit `test(web): count a page change made before the account loads`; fix `HouseAd.tsx:39-44` (update `previous` only
  after the guard); commit `fix(web): count page changes made while the account loads`.
- [ ] **Step 6: Run** web unit, lint, typecheck; `pnpm cf:docker` full e2e and render mode → PASS. Admin's four checks.
- [ ] **Step 7: Commit** `refactor(web): drop the old token files and move the last old classes to wm`, then `feat(web): match the loading
  skeleton and the phone header to the real chrome`.

## PL-b — Các màn

Each screen task: move its hand-built cards onto `Card`, its h1 onto `PageTitle`, its section headings onto `SectionTitle`, its tabs and filters
onto `Tabs` / `LevelChip`, and its example sentences onto `TargetWord` (chỗ 2, 3, 13, 15), besides the items listed.

### Task P.7: Hôm nay

**Files:** `today/TodayPage.tsx`, `groups/GroupStack.tsx:48`, `today/DeckRow.tsx`; tests `today/today.test.tsx`, `groups/group-pieces.test.tsx`.

- Group cards (here and on Nhóm) show only the word count: `App.stack.words` "{count} từ" (drop `{mastered}`); hero line "nhóm có {total} từ".
- "Lần luyện gần nhất": the `App.today.lastWrong` line goes (key deleted).
- The words-by-level aside: title "{n} từ theo bậc", one row per level with a `LEVEL_FILL` square, `useLevelName`, due / total, and a tooltip
  (`HelpTip`) with `useLevelInterval` (mockup L807–818, L819–865).

- [ ] **Step 1: Failing tests:** stack meta is exactly "48 từ" (`group-pieces.test.tsx` pin changes from "48 từ · 12 đã thuộc"); no text
  matching `/^Sai:/` with a non-empty wrong list; the aside lists "Mới", "Bậc 1" … "Bậc 5" with their counts.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit, `pnpm cf:docker e2e/app/m3.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): show word counts only and levels on hôm nay`.

### Task P.8: Một nhóm

**Files:** `groups/GroupPage.tsx`, `ui/StageBar.tsx` → `ui/LevelBar.tsx`, `groups/carousel.ts` (`rhythm`), tests `groups/group-page.test.tsx`.

**Interfaces (Produces):** `LevelBar({ counts: number[6], size?: 'md' | 'lg' })`: one segment per non-empty level, width ∝ count, 3 px gap, 10 px
high, `rounded-wm-key`, each segment `LEVEL_FILL[level]`, grow-in 700 ms from the left (mockup L185–189); legend below with the level name and
count (L190–193), not truncated (fixes chỗ 5 for the word page too); hovering or focusing a segment shows the name, count and interval. Used by
Một nhóm, Nhóm (P.16) and the word page (P.9).

- Head: no group-colour square before the title (Chỗ bổ sung); meta "48 từ · tạo ngày 12/10/2026" (no "đã thuộc").
- Filter chips: `LevelChip` row — Tất cả, Ưu tiên, Đến hạn, Mới, Bậc 1 … Bậc 5 (mockup L161–173, L948–992).
- Word list → a table on desktop: columns Từ vựng, Loại từ, Nghĩa, Bậc, Trạng thái (`th scope="col"`, mockup L363–375): word in Bricolage 700
  17 px with a link, pos in `text-wm-meta`, level as a 22×6 bar in `LEVEL_FILL` plus the level name, status coloured by `STATE_TEXT`; row action ×
  kept. Phone: compact rows that keep the column header line (mockup note at L645).

- [ ] **Step 1: Failing tests** (`group-page.test.tsx`): the heading has no colour square sibling (`getByRole('heading')` parent holds no
  `img`/presentation span); a `table` with the five column headers; a row's "Bậc" cell reads "Bậc 3"; the chips are buttons "Bậc 3 11" etc. with
  `aria-pressed`; pressing "Đến hạn" leaves only due rows; the level bar legend shows "Bậc 5 4" untruncated. The old pins (`:113`, `:152`, `:158`,
  `:168`) change.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit; `pnpm cf:docker e2e/app/m3.spec.ts e2e/app/cai-thien-a-group.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): show một nhóm as a table with level chips and a level bar`.

### Task P.9: Trang một từ and Tra từ

**Files:** `word/WordPage.tsx`, `word/LearningBlock.tsx`, `word/SenseBlock.tsx`, `word/SavedSentencesDialog.tsx`, `lookup/DictionaryPage.tsx`,
`lookup/LiftedCard.tsx`, `lookup/LookupFilters.tsx`; tests `word/word-page.test.tsx`, `word/my-word.test.tsx`, `lookup/lookup.test.tsx`.

- Pronunciation and forms sit between two 2 px hairlines of `--color-wm-rule` (ink 16 % on surface, precomputed hex, new token in both files;
  mockup L322–325); UK and US close together (gap 16 px, not `md:gap-x-6` spread).
- Part of speech: `unspecified` (API `PRIVATE_POS_UNSET`, `AI_POS_UNSET`) is never printed; the pos slot is empty there (chỗ 4, screens §8).
- "Bạn đang học" block: `LevelBar` with full names and "ôn lại sau N ngày" (chỗ 5).
- Tabs: `Tabs` with `hrefs` (chỗ 15). Every example sentence: `TargetWord` (chỗ 2).
- Tra từ: paper stays (dark paper from M9); examples `TargetWord`; the filter sentence's clickable parts get the yellow mark (`bg-wm-mark
  text-wm-mark-ink rounded-wm-key px-1`), replacing the accent underline (mockup L593–595).

- [ ] **Step 1: Failing tests:** a private word with pos `unspecified` shows no "unspecified" text anywhere (`queryByText(/unspecified/)` null);
  the learning block shows "Bậc 2" and "ôn lại sau 3 ngày"; the example's target is a `strong` element containing the word; the Tra từ filter
  buttons keep their names ("trình độ tất cả" etc.) and open their menus.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit; `pnpm cf:docker e2e/app/m4.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): polish the word page and lookup per the approved mockup`.

### Task P.10: Luyện tập and Từ hay sai

**Files:** `practice/PracticePage.tsx`, `practice/WeakWordsPage.tsx`, `practice/CustomizeDialog.tsx`, `app-chrome/PageColumns.tsx`; tests
`practice/practice-home.test.tsx`, `practice/weak-history.test.tsx`; `scripts/message-keys-allow.json`.

- The "Gần đây" box goes, with `useRecentHistory(3)` if nothing else uses it, and the `App.practice.recent.*` keys and their allow entry (chỗ 13).
- One section-title kind (`SectionTitle`) and one card kind (`Card`) for "other sources", usage and shortcuts (chỗ 13).
- Từ hay sai on a phone: the "Luyện từ hay sai" card right under the title (chỗ 10). `PageColumns` gains `asideFirstBelow?: boolean` (aside before
  the content under 1280 px), set only here.
- `CustomizeDialog`: drop the dead `if (!target) return null` (M9 minor); preload its chunk on pointer-enter and focus of the [Tùy chỉnh] button
  (M9 minor).

- [ ] **Step 1: Failing tests:** no region or heading "Gần đây"; at 390 px (`renderApp` with a phone viewport, as `weak-history.test.tsx:69`)
  the "Luyện 10 từ" button comes before the first word row in document order.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit, `node scripts/check-message-keys.mjs`; `pnpm cf:docker e2e/app/m5a.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): drop the recent box and lift the weak-words card on phones`.

### Task P.11: Session copy in English

**Files:**
- Modify: `src/app/[locale]/app/(member)/(focus)/layout.app.tsx` (wrap in `SessionIntl`), `messages/en.json` (session keys, mockup copy),
  the 11 files of screens §6 that call `useLocale()`; the session tests (≈475 lines of Vietnamese copy, screens §6).
- Create: `src/app-shell/SessionIntl.tsx`, `src/app-shell/route-locale.ts`, `src/app-shell/session-intl.test.tsx`.

**Interfaces (Produces):**
- `SessionIntl({ children })` (server): `NextIntlClientProvider locale="en" messages={{ App: (await getMessages({ locale: 'en' })).App }}`.
  English locale gives English plural rules ("1 card left"). Wraps everything under `(focus)`: Học, Ôn, Phiên luyện, their loading and error
  screens, and the calendar button there. `getMessages({ locale })` is an `ASSUMPTION` (screens §6): Step 1 proves it; if it fails, import
  `messages/en.json` in the server file instead (the file is already bundled server-side).
- `useRouteLocale(): 'vi' | 'en'` reads `useParams().locale`; it replaces `useLocale()` for links (`/${locale}/app…`), for the Vietnamese-only
  blocks (`AnswerFeedback.tsx:120` translation: shown when the route locale is `vi`) and for date formatting the learner sees outside the session.
- Copy (mockup L1170–1290, L1010–1026, L1153): "Still learning", "Flip card", "Know", "Next", "Review again", "Stop", "Not quite", "answer",
  "you typed", "Hint 1 of 2", "Show hint 2", "First letter", "Definition", "AI translation", "AI sentence", "Fill in the blank", "Type the word ·
  from meaning", "Level n · review in N days", "New word", "up to Level n", "Tap the card to flip", "Click the card or press Space to flip",
  "Flip the card to see the meaning first.", "n cards done.", "2-day streak", "Back to home". Design §7.1 ("Hint" with no total in English) is
  superseded by QM9-9: the design is updated in P.18.
- `vi.json` keeps the session keys (parity, LP3) with their Vietnamese text; they are not rendered while `SessionIntl` wraps the sessions. A ruling
  records this.

- [ ] **Step 1: Failing tests** (`session-intl.test.tsx`, a rendered `(focus)` subtree with route locale `vi`): the Học close button is named
  "Stop"… per the copy; "1 card left" and "2 cards left"; the Vietnamese meaning from the fixture stays Vietnamese; "Back to home" links to
  `/vi/app`; the translation block shows for route `vi` and not for route `en`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; rewrite the session tests' expected text to the English copy (one commit with the behaviour).
- [ ] **Step 4: Run** web unit, lint, typecheck; `pnpm cf:docker e2e/app/{m5a,m5b,m6,cai-thien-a-speak}.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): show session copy in english for every locale`.

### Task P.12: Thêm từ dialogs, the multi-group picker (QP1)

**Files:**
- Web: `add-word/GroupPicker.tsx` (`DeckList`), `add-word/AddWordSheet.tsx` (`deckField` :218-238, `deck` state :101, `save` :106-142,
  `writeLastGroup`), `add-word/last-group.ts`, `add-word/AiLookupResult.tsx` (chỗ 23), tests `add-word/add-word.test.tsx`,
  `add-word/locked-add-word.test.tsx`, `m4-overlays.test.tsx`, `ai-lookup.test.tsx`.
- API: `apps/api/src/learning/quick-add/quick-add.controller.ts:18-36`, `quick-add.service.ts:54-84`, their specs; the smoke
  `pnpm smoke:giao-dien-moi` gains one step.

**Interfaces (Produces):**
- `GroupPicker` (cách B, mockup L396–416, L1356–1391): a `listbox` with `aria-multiselectable="true"`; each row: a mini stack of two cards in the
  group colour (lifts on select: 300 ms), name, word count, ✓ at the end; selected row tinted `--g-wash`, name in `--g-ink`; no radio. Footer:
  "Đã chọn {n} nhóm" and the button "Lưu vào {n} nhóm". Rows toggle on click and Space; Enter confirms.
- `AddWordSheet` "Lưu vào nhóm" field: the chosen groups as chips in their colours (`gchip`, mockup L413–414). `lockedGroupId` (opened from a
  group page) preselects that group and still allows others. `last-group.ts` stores an array (old single-id values are read as `[id]`).
- API: body `group_ids: z.array(z.uuid()).min(1).max(10)` replaces `group_id` in a new strict schema accepted beside the old one
  (`group_id` still accepted, additive within v1); duplicates collapse; every id must be owned; `linkInTx` runs per group in the same transaction;
  one full group → 409 `group-full` with the group's id in the Problem Details `detail`, nothing saved. Max 10 is a ruling (no design number).
- Hộp 4 (Tra bằng AI) on desktop: two columns from the top of the dialog — left the inputs and the result, right the preview card level with the
  "Từ" field (chỗ 23, mockup L1346–1355 frame "hộp 4").

- [ ] **Step 1: Failing tests (web):** choosing "Đề 12" and "Đề 9" then pressing "Lưu vào 2 nhóm" sends one quick-add with `group_ids` holding both ids;
  the field shows two chips; reopening the dialog preselects both (last groups); a stored old single id still preselects one group; a 409 naming
  "Đề 9" shows "Đề 9 đã đầy. Chưa lưu từ." and no success toast. Copy follows the Vietnamese style rule.
- [ ] **Step 2: Failing API specs:** `group_ids` with two owned groups links both in one transaction; a foreign id → 404 and no link;
  a full second group → 409 and the first link rolled back; `group_id` alone still works; `group_ids` and `group_id` together → 400.
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement.** **Step 5: Run** web unit; API `pnpm lint`, `pnpm typecheck`, `pnpm test`; the smoke on a
  fresh DB; `pnpm cf:docker e2e/app/m4.spec.ts` → PASS.
- [ ] **Step 6: Commit** `feat(api): accept several groups in quick-add` first, then `feat(web): save a word into several groups`; then
  `feat(web): lay out the ai lookup dialog in two columns from the top`.

### Task P.13: Phiên luyện and Ôn

**Files:** `practice/session/{QuestionCard,SentenceQuestions,TypeWordQuestion,AnswerFeedback,HintPanel,PracticeSession}.tsx`,
`recall/CompareLine.tsx`, `recall/RecallSummary.tsx`; tests `practice-session.test.tsx`, `ai-questions.test.tsx`, `session-screen.test.tsx`,
`recall/recall-session.test.tsx`. No API change (QP3).

- The instruction line under the question chip goes (`App.practice.session.ask.*` deleted); the chip says the kind (QM9-9).
- Fill-in sentence: the blank is the input — an `input` inside the sentence, `min-width: 5ch`, growing with the text, accent underline 3 px and
  7 % tint (mockup L509–513); Enter grades; the result replaces the input in place (wrong word struck through in a dashed fail box, answer in a pass
  box; mockup L320–321). The separate `TypeWordInput` stays for "type the word · from meaning".
- "AI translation" after answering: its own block under the sentence inside the card — accent 7 % tint, 1 px accent 22 % line, `rounded-wm-row`,
  translate icon, text 17 px, "AI translation" chip at the right (mockup L326–331). Shown only for route locale `vi` (P.11).
- "Not quite" panel (`AnswerFeedback`, both Phiên and Ôn): the answer as a big line under the title in a pass-tinted block with the speak button;
  every gap 16 px; actions at the right (mockup L332–349, L1213–1225); light fail 9 % / 62 %, dark coral (M9 tokens `wrong-*`).
- Ôn: "you typed / answer" replaces the input inside the card (chỗ 18), not a card under the buttons.
- Key legend: centred, right under the panel (chỗ 17), desktop only.
- Hint box: a three-column grid 24 px / 112 px / 1fr (number, hint name, content); "Show hint 2" sits in the content column; progress dots at the
  right of the title; first-letter text in Bricolage 22 px with 0.12em tracking (mockup L352–361). `bg-wm-ink` circles → ink border, filled when on.
- First letter: unchanged (QP3): `e___` for fill-in sentences (CS20), the non-AI typed hint as today. Only its box and font change.
- Ôn summary on a phone keeps its title size (the `cn` fix of P.4) and the "Sai, giữ bậc" / "Cần ôn lại" boxes use the right colours (chỗ 7).
- Close X 32 px (`size-8`).

- [ ] **Step 1: Failing tests:** the sentence has a `textbox` named by the blank; typing "estimate" and Enter shows "correct" in the sentence and
  no separate textbox; a wrong answer shows the typed word struck and the answer; no "Gõ từ còn thiếu" / "Type the missing word" text; "AI
  translation" region after answering in `vi`; Ôn's "you typed" sits inside the question card (`within(card)`); hint grid: "Show hint 2" button
  inside the second row; CS20 (`c___` for `crucial`) still passes. The Ôn summary colours (chỗ 7) are pinned in the e2e step, since jsdom
  computes no CSS.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.**
- [ ] **Step 4: Run** web unit; `pnpm cf:docker e2e/app/{m5a,m5b,cai-thien-a-speak}.spec.ts` with a check that the Ôn summary boxes' colours match
  the tokens → PASS.
- [ ] **Step 5: Commit** `feat(web): type into the blank and reshape the answer and hint panels`.

### Task P.14: Đăng nhập and Đăng ký panel

**Files:** `features/learner/auth/AuthShowcase.tsx`, `auth/SplitFrame.tsx`, `app-chrome/CardFrame.tsx`, `ui/field-styles.ts`, `src/app/globals.css`
(showcase keyframes), `packages/design-tokens/web.css`, `web-dark.css` (showcase ground and input line tokens); `e2e/auth-layout.spec.ts`;
new `auth/auth-showcase.test.tsx`.

- Panel ground stronger: accent 13 % on bg with four radial glows (mockup L432–443) as tokens.
- The panel tells the learning loop (mockup L418–460, L1395–1480): a dashed memory path through nodes "Mới → Bậc 1 … Bậc 5" with "1, 3, 7, 14,
  30 ngày"; a word chip travels the path (`offset-path`, 14 s linear, its colour stepping through the level colours); the word card cycles mitigate,
  allocate, viable, deteriorate, coherent; the practice card types the word into the blank, presses Enter, turns green "Đúng · lên Bậc n"; the due
  count falls one by one. Background chips (deadline, negotiate) are faint and under the card (chỗ 20). All `aria-hidden`.
- Reduced motion: no travel, no typing; the final frame of each loop is shown.
- Inputs on the mesh: border `ink 22 %` on surface as a token (mockup L180), the card glow visible at xl (chỗ 21).

- [ ] **Step 1: Failing tests:** `auth-showcase.test.tsx` with fake timers: after one cycle the word card shows "allocate"; the practice card ends
  with "Đúng · lên Bậc 2"; with reduced motion the first render already shows the final practice state and no element has a running animation
  (`getAnimations()` empty where jsdom supports it, else the class flag). E2E `auth-layout.spec.ts` at 1440: the "negotiate" chip's box does not
  intersect the word card's box.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit; `pnpm cf:docker e2e/auth-layout.spec.ts e2e/a11y.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): tell the learning loop in the sign-up panel`.

### Task P.15: Dialog sweep and leftovers of PL-b

**Files:** the 15 dialog files of kit §7, `calendar/CalendarModal.tsx`, `calendar/DayDialog.tsx`, `calendar/MonthDialog.tsx`, `ui/Select.tsx`,
`groups/GroupPicker.tsx:108`, `practice/CustomizeDialog.tsx:270,315`.

- Every dialog: × box, cancel as text, options on white (chỗ 11; P.4 changed the frame, this task checks each dialog's own content).
- Day dialog filter → `LevelChip`-style chips or `Tabs` as fits its role (chỗ 15).
- Cards inside dialogs on `Card` where they are cards.

- [ ] **Step 1: Failing test** in `ui/overlays.test.tsx`: render each of the 15 dialogs with its minimal props and expect one button named by its
  close label and, where the dialog has a cancel action, that it is not styled as an outline button (role and name, plus the `TextButton` export
  check). **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit; `pnpm cf:docker e2e/app/{m4,m6,m7a}.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): give every dialog one frame and one cancel style`.

## PL-c — Motion

### Task P.16: Nhóm "Vòng cung"

**Files:** `groups/GroupCarousel.tsx`, `groups/GroupStack.tsx`, `groups/GroupListPage.tsx` (`Below`), `groups/carousel.ts`, `src/app/globals.css:577-770`
(`.gcar*`, `.gstack*`), `packages/design-tokens/web.css` (`--ease-wm-carousel`); tests `groups/carousel.test.ts`, `groups/group-list.test.tsx`.

**Interfaces (Produces):** `arcSlot(k: number, phone: boolean): { x: number; y: number; rotate: number; scale: number; opacity: number; z: number }`
in `carousel.ts`, pure: `step = phone ? 128 : 230`; `x = k·step·0.84`; `y = 16·k²`; `rotate = 8·k` deg; `scale = 1 − 0.1·|k|`;
`opacity = |k| > 2 ? 0 : 1 − 0.25·|k|`; `z = 10 − |k|` (mockup L881–884, `vong-7` L703–704). CSS reads them as custom properties.

- Card 290 px desktop / 210 px phone, `transform-origin: 50% 130%`; transition `transform 0.66s cubic-bezier(.34,1.56,.64,1), opacity .45s`
  (`--ease-wm-carousel` changes to this curve; mockup L477–478); a jump of more than 3 positions sets no transition for that frame (L922–927).
- Stack depth layers d1–d3 (translate, scale, blur 2.5 / 5 / 7 px, opacity .85 / .55 / .3; L483–485); the top card border 2 px in the group
  colour; empty group dashed (L486–487); `rounded-wm-dialog`.
- Card face: "{n} từ" meta only, name, "{due} thẻ chờ" in `--g-ink`, footer "tiếp theo · word" (L488–496, L885–890).
- Glow behind the track in the current group colour, 0.7 s colour transition (L468–469), replacing `.gcar-halo`.
- Below the track: eyebrow "nhịp ôn: Mới → Bậc 5", `LevelBar` 420 px, actions; the block staggers in (460 ms, 45 ms per child,
  `cubic-bezier(.3,1.3,.5,1)`; L939–945). Phone: no arrows, track 340 px (vong-7 L192–201).
- Keyboard, click on side cards, ↓ to open, reduced motion: behaviour of `group-list.test.tsx` kept.

- [ ] **Step 1: Failing tests:** `arcSlot(0,false)` = `{x:0,y:0,rotate:0,scale:1,opacity:1,z:10}`; `arcSlot(2,false)` = `{x:386.4,y:64,rotate:16,
  scale:0.8,opacity:0.5,z:8}`; `arcSlot(-1,true)` x = −107.52; `arcSlot(3,…)` opacity 0; five → presses in a row end on the fifth group with one
  `on` card and no card left with an inline `transition: none`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit; `pnpm cf:docker e2e/app/m3.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): move the group carousel onto the arc`.

### Task P.17: Học "Chồng thẻ tan mờ" layout

**Files:** `review/ReviewSession.tsx`, `review/CardStack.tsx`, `review/Pile.tsx`, `review/useCardDrag.ts`, `src/lib/stack-motion.ts`, `ui/StreakToast.tsx`
(placement); tests `review/card-stack.test.tsx`, `review/learn-stack.test.tsx`, `review/review-session.test.tsx`.

- Depth (mockup L235–238): d1 `translateY(16px) scale(.95) blur(5px) opacity .85`, d2 `30px .9 9px .5`, d3 `40px .86 12px 0`; reduced motion
  drops the blur (L305). Check `stack-motion.ts` values against L1119–1140 (dissolve 1.22, blur 18 px, 300 − speed·80 ms drag / 240 ms button;
  arrive from blur 10 px) and keep what already matches (screens §4).
- Stack higher (≈20 px under the session bar); the streak toast sits at the top right under the X (`placement: 'session-corner'`).
- Close: X only, 32 px, named "Stop" (no "Đóng phiên ôn Esc").
- Buttons (L268–293): 40 px, 14 px text, weight 700: "← Still learning [1]" fail text on surface (dark: fail 6 % on surface), "↻ Flip card
  [Space]" accent fill, "✓ Know [2] →" pass text on surface; disabled look at 50 % before the flip; key legend under them on desktop (Space, 1/←,
  2/→, Esc).
- Piles: number and label centred, no arrows in the labels; word chips drop into the piles on desktop only (L227–229).
- Phone (L287–304): piles under the card; side buttons are 52 px icon-only squares with `aria-label` "Still learning" / "Know"; Flip card keeps its
  own width (min 148 px); no key hints; card hint "Tap the card to flip".

- [ ] **Step 1: Failing tests:** at 390 px the side buttons have no visible text but accessible names "Still learning" and "Know"; no `kbd`
  elements; the piles come after the card in document order; on desktop the legend lists the four keys; pressing 2 twice within 100 ms after a flip
  records one answer (`learn-stack.test.tsx`); the X is named "Stop".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** web unit; `pnpm cf:docker e2e/app/m5b.spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(web): lay out the learn stack per the approved mockup`.

## P.18: Check, shots, docs, PR

- [ ] **Step 1: The 25 picks.** For each audit item, write one line in the as-built: picked side, what changed, the commit, or "kept" for 8, 12,
  16, 19, 22 and the tab bar of 25. An item the shots show still off is fixed here or listed as a ruling.
- [ ] **Step 2: Allow file.** Replace `App.errors.*`, `App.transactions.*`, `Landing.*` with exact keys or narrower prefixes read by variable
  (M9 minor; `App.practice.recent.*` went in P.10). `node scripts/check-message-keys.mjs` → 0 unused, 0 stale.
- [ ] **Step 3: Whole suite.** Web unit, lint, typecheck, `pnpm cf:docker` (full e2e and render mode), `pnpm cf:docker --bundle-stats` and the
  compare (limits 110 %, 118 % for the two plan pages) → PASS; admin's four checks; API lint, typecheck, unit and `pnpm smoke:giao-dien-moi` on a fresh DB.
- [ ] **Step 4: Shots.** `SHOTS_MILESTONE=gm-polish` (a copy of the gm-m9 set, same 4 widths, light and dark) on this branch's `pnpm bootstrap`
  stack; look at every frame beside the mockup frame of the same screen; differences become fixes or rulings. Frames the seed cannot reach are
  "chưa chụp".
- [ ] **Step 5: Docs.** Polish as-built in `docs/deliveries/giao-dien-moi.md` (rulings from R265); design §7.1 (session copy English, "Hint 1 of
  2"), §7.2 (levels, radius C, fonts), §9 (polish done), §14 (polish condition met); `packages/design-tokens/README.md`; mark "việc dọn chuyển sang
  đợt polish" done.
- [ ] **Step 6: PR** through `ship-pr` into `refactor/giao-dien-moi`, one PR for the whole round (QP2).

## Decisions this part makes

The owner's decisions are QM9-1 … QM9-9. Claude settled these while writing the part; the owner approves them with the plan:
- **Radius tokens by role** (`key`, `control`, `row`, `card`, `dialog`, `pill`) instead of re-valuing the size names; the sweep goes by role, and a
  test forbids the old names.
- **`text-wm-meta`** replaces `text-wm-mono` (same 12 px), so labels keep their size when the font changes.
- **Level helpers in `ui/levels.ts`**, one map for fills and names, replacing the seven copied arrays; stage tokens deleted.
- **`LevelChip` and level tints as tokens with precomputed hex**, because a contrast test must read them (M9.8 rule).
- **`TargetWord` is one matcher** (lemma and forms, whole words); the yellow mark stays only on the Tra từ filter sentence.
- **Dialogs always show ×**; `closeLabel` becomes required.
- **The arrow is an icon**, not a glyph, after checking the subset on a fresh build.
- **Session English via a nested provider with `locale="en"`**, and a route-locale hook for links and the Vietnamese-only blocks; `vi.json` keeps
  the session keys.
- **Test helpers move to `src/test-utils/`**, outside `ui/` (its lint rule forbids feature imports) and outside `app-ui/` (deleted).
- **`--ease-wm-out-strong`** keeps the curve new code depends on before the old block goes.
- **The skeleton task stops for the owner** after the shot (chỗ 24 note "chụp lại chỗ này mình xem").
- **`group_ids` is capped at 10** (no design number).

**Open:** none for the owner before execution (chỗ 24 is asked inside P.6). Not in this part: "mỗi trang chỉ gửi phần chữ trang đó cần" and splitting the message files (QM9-8), the OG image font
(M8c), QR4 (ads), the phone frame-rate measurement (QM9-7, owner).

# Part 11 — Sửa sau khi test tay (branch `feat/giao-dien-moi-polish`)

**Goal:** the 19 fixes the owner locked on the review page after testing Part 10 by hand (artifact `TdRauzhidkQBLUss11Y5j2`, version 10,
db `picks` f01–f19, read 13/11/2026), then the close-out of the whole polish round: the P.18 docs still open, one clean e2e run, one PR into
`refactor/giao-dien-moi`. Plan approved by the owner 13/11/2026.

**Inputs:**
- Drawings: `.superpowers/sdd/2026-11-10-giao-dien-moi/polish-fixes/index.html` (git-ignored; the published page is the artifact above). Each task
  names its drawing function.
- Code facts: `fix-facts-A.md`, `fix-facts-B.md`, `fix-facts-C.md` in the same folder, read on `6f332eb6`.
- Decisions: QF in the decision record (f01–f19 picks, D1–D9).

**Order:** three lanes from the commit that adds this part: A (app, F.1–F.11), B (sessions, F.12–F.15), C (public pages and the sign-up
panel, F.16–F.22), in worktrees `polish-fix-a`, `polish-fix-b`, `polish-fix-c` on branches `feat/giao-dien-moi-polish-fix-{a,b,c}`. Then F.23
merge, F.24 docs, F.25 verify, F.26 ship. Rulings continue after the last one Part 10 used.

## Owner decisions on this part (13/11/2026)

- **D1 (f03 copy):** in Thêm từ, the deck step only picks decks and goes back to the form; its button reads "Xong" / "Done". The form's real
  save buttons (Nhập nghĩa, Sửa gợi ý) read "Lưu vào n nhóm" with "Đã chọn n nhóm" on the left. DeckPickerDialog (Tra từ, word page) keeps
  "Lưu vào n nhóm".
- **D2 (f05):** the Right panel and the try-again panel use the same ticket shell; Right in pass tones. AlternativeFeedback unchanged this round.
- **D3 (f05):** an open hint box stays between the card and the panel; the panel tucks under the hint box.
- **D4 (f04):** "l___" is visual only; screen readers keep "l… · 4 letters".
- **D5 (f08):** the hero practice card becomes the typing card (no choices, no key row); five words as in F.18.
- **D6 (f11):** the caption pill goes; four wordings change (F.22).
- **D7 (f12):** cards placed per showcaseC in the real 640×868 scene; ghost chips kept and moved off the path; node labels away from cards.
- **D8 (extra):** "1 cards waiting" → "1 card waiting" (en).
- **D9 (later, not this round):** 32 px close X on phones; no Check button for the blank on phones; session close names; phone corner toast;
  "Tiếp theo"/"Ôn gần nhất" casing; grey trays in Tùy chỉnh phiên; "Lần luyện gần nhất" in the side column; audit2 after this round merges.
- **Open risk:** field border #c7cad3 on white ≈1.6:1, under the 3:1 WCAG 1.4.11 asks of field boundaries; a separate a11y round.

## Global constraints (every task)

- Repo rules in `.superpowers/sdd/2026-11-10-giao-dien-moi/implementer-context.md`:
  - wm tokens only.
  - Colours only in `packages/design-tokens` (`web.css`, `web-dark.css`; `theme.css` stays frozen for admin).
  - Radius roles; Noto Sans labels; Bricolage titles.
  - Copy in vi + en, following the Vietnamese style rule. Session UI copy is English (QM9-9).
  - Tests query by role and visible text.
  - Conventional Commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Red first:
  - New behaviour: a failing test seen red, then the code.
  - Defect fix: two commits, the red test then the fix.
- Pure visual CSS changes (f01, f18, spacing) get no unit test. Each one is checked in the browser in light and dark, at desktop and 390 px, and the task report names the screenshot paths. Record this as a ledger ruling so reviewers do not flag "no test".
- Every new motion has a reduced-motion branch: nothing moves and the final state shows.
- Remove message keys a task orphans, in both vi and en. The key checks in `pnpm --filter web test` must stay green.

## Batch A — app (lane A)

**F.1 Nhóm glow (f01).** Files: `apps/web/src/app/globals.css` `.gcar-glow` (563–590), `groups/GroupCarousel.tsx:~117`.
- Delete the `::after` full-box linear gradient. It is the visible rectangle.
- Make the glow one radial, per `.car .glowA` in the drawing:
  - background `radial-gradient(closest-side, tone 30%, tone 10% 55%, transparent)`;
  - `mask-image: radial-gradient(60% 60% at 50% 45%, #000 40%, transparent 80%)`;
  - box `inset: -2.5rem -10%`, so the glow fades out inside its own box on every side.
- Keep the 0.7 s colour change and the existing tone classes.
- Check in the browser: no edge at 1280 or 390, light or dark.

**F.2 Block under the carousel (f02).** Files: `groups/GroupListPage.tsx` `Below` (187–214), `groups/DeckButtons.tsx`, `ui/LevelBar.tsx` (legend 62–68).
- Row 1: Học then Ôn, both the same width (`w-37.5`, 150 px). The primary stays chosen by `deckPlan`. No key chip: the page has no Enter shortcut, and f14 removes chips.
- Row 2, centred, gap 4/18 px: "Xem nhóm →" and the muted "Thêm từ". "Thêm từ" stays hidden below md, as now.
- Legend: gap 4/12 px, `max-w-115`, items do not wrap internally. The six entries then fit on one line at md and wider.
- Test (`group-list.test.tsx:132`): the buttons come before the two links in reading order. With only one deck action available, one button shows.

**F.3 Fit by height (f13).** Files: `globals.css` `.gcar-track` (515–525), `.gcar-slot` (526–544), `--gcar-step`, `.gstack[data-size='carousel']` (410–418), `GroupListPage.tsx` `Carousel` (152–180), `app-chrome/FloatingButtons.tsx:11`.
- `@media (min-width:48rem) and (max-height:51.25rem)`: a smaller stack font size and track height, so the title, carousel and Below fit 1280×800 and 1024×768 without scrolling.
- `@media (orientation:landscape) and (max-height:30rem)`: Nhóm switches to two columns (carousel left, Below right) with a compact card.
- The calendar button never overlaps a visible card.
- New `e2e/app/viewports.spec.ts` at 844×390, 768×1024, 1024×768 and 1280×800:
  1. No horizontal scroll on Hôm nay, Nhóm, Một nhóm, Tra từ, Luyện tập, Từ hay sai, Cài đặt and Lịch.
  2. On Nhóm, Học and Ôn are fully on the first screen without scrolling.
  3. On Nhóm, the calendar button's box does not intersect any card box.
- Control: the spec first asserts the carousel is visible, so a zero-overlap result means "no overlap" and not "nothing was rendered".
- Fix everything the spec finds and list each fix in the report.

**F.4 Hôm nay deck hover (f18).** File: `globals.css` near `.deck-row-cell` (769–783).
- Under `@media (hover:hover)`, `.deck-row-cell .gstack:hover` and `:has(a:focus-visible)` get:
  - `translate: 0 -6px`;
  - a stronger shadow tinted with the deck's own colour;
  - a 0.3 s transition with the ease-out token.
- `:active` uses scale 0.98.
- The existing 170 ms press lift (`wm-card-lift`) keeps working.
- Reduced motion: only the shadow changes.

**F.5 Dialog footer and Thêm từ copy (f03, D1).** Files: `ui/Dialog.tsx:72`, `add-word/AddWordSheet.tsx` (picker footer 311–329, edit 345–356, manual 371–382), `App.addWord`.
- Every dialog footer: `border-t border-wm-line pt-3.5` and a 12 px gap.
- Picker view: the confirm button uses a new key `pickDone` ("Xong" / "Done").
- Manual and edit views: the save button uses `saveToCount`, with `SelectedCount` on the left.
- Delete `pickDeck`, `pickDecks` and `saveManual` once nothing uses them.
- Tests: with 2 decks chosen, the manual view's "Lưu vào 2 nhóm" saves. The picker's "Xong" returns to the form and sends no request.

**F.6 Picker lists a deck twice (f03, defect, 2 commits).** File: `add-word/GroupPicker.tsx:51, 91–94`.
- Red test: a deck under "Dùng gần đây" appears exactly once.
- Fix: the A–Z list leaves out the recent decks.
- Heading, ruling: the A–Z list is headed by a new key `others` ("Nhóm khác ({count})" / "Other decks ({count})") when there are recent decks, and by `all` otherwise.

**F.7 Typed number steppers (f16).** Rewrite `ui/Stepper.tsx` on react-aria `NumberField`.
- Behaviour read this session in the installed react-aria 3.53.1 and react-stately 3.51.0:
  - Enter and blur commit the value, and the commit clamps to min/max (`snap`).
  - Text that does not parse resets to the current value.
  - Empty text calls `onChange(NaN)`.
  - The input is a textbox named by its label.
- The props stay the same. `onChange` ignores NaN, so the last valid value stays.
- `incrementAriaLabel` and `decrementAriaLabel` come from `App.ui.stepper.*`.
- Look per `.stepA` in the drawing:
  - one 36 px control with a 1 px border;
  - − and + buttons 32 px wide;
  - a 48 px input with centred tabular figures;
  - inner dividers.
- Size is 36 px on phones too. This is the approved size and it meets the WCAG AA 24 px minimum.
- Tests (`ui/practice-kit.test.tsx`, `practice/customize-dialog.test.tsx`):
  - type 7 and press Enter → 7;
  - type 99 and blur with max 30 → 30;
  - empty and blur → the previous value;
  - ArrowUp → +1;
  - − disabled at min and + disabled at max;
  - a disabled field cannot be typed into.

**F.8 Count boxes in the scope switch (f17).** Files: `ui/Segmented.tsx`, `practice/CustomizeDialog.tsx:243–258`, `ui/LevelChip.tsx:53`.
- Move LevelChip's count-box classes into `ui/count-box.ts` and reuse them in LevelChip, with no visual change there.
- Segmented options gain `count?: number`, rendered as `{label}{' '}<span>{count}</span>`.
- When an option is selected, its box is `bg-wm-accent-soft text-wm-accent` with no ring.
- Delete `filterOption`. The accessible names stay "Tất cả 61" and so on, so the current tests hold.

**F.9 Day dialog without practice (f19).** File: `calendar/DayDialog.tsx` (Filter 35, tabs 170–175, block 215–233, `SessionBlock` ~300).
- Remove the `practice` filter and the practice block.
- "Tất cả" counts learned + reviewed. The summary line still says "N câu luyện".
- A day with practice only shows the summary and `sectionNone`.
- Remove the props, fetches and keys that only the practice block used.
- Tests: `day-dialog.test.tsx` and e2e `m6.spec.ts:57/100/113`.

**F.10 Tra từ "Nhóm khác" while items load (defect, 2 commits).** File: `lookup/LookupPage.tsx:~106–114`.
- Red test: while the items are loading, "Nhóm khác" is disabled.
- Fix: disable it until `items.isSuccess`, the same rule `StackTargets` uses.

**F.11 "1 cards waiting" (D8, defect, 2 commits).** Files: `groups/GroupStack.tsx:63`, `App.stack.waiting`.
- Red test: in en, one waiting card reads "1 card waiting".
- Fix: en becomes `{count, plural, one {card waiting} other {cards waiting}}`, vi stays "thẻ chờ", and the count is passed in.

## Batch B — sessions (lane B)

**F.12 No key chips on buttons (f14).** Files: `review/ReviewSession.tsx` (`AnswerButton` 239–268, Flip 160–173), `practice/session/QuestionCard.tsx` (`ButtonKey`), `AnswerFeedback.tsx`, `TypeWordQuestion.tsx`, `HintPanel.tsx:89`, `PracticeSession.tsx:399–400`.
- Remove every chip that sits inside a button, and delete `ButtonKey`.
- The legends stay, and the shortcuts keep working.
- Tests to update:
  - `learn-stack.test.tsx:221/230`: buttons carry only their label, and the legend still lists Space, 1/←, 2/→ and Esc;
  - the `practice-session.test.tsx` it.each names;
  - `ai-states.test.tsx:171` and `ai-questions.test.tsx:120`;
  - e2e `m4.spec.ts:330` and `m5a.spec.ts:217`, which now assert the legend instead of the chips.
- `m2.spec.ts:178` (the keyboard flow) must still pass.

**F.13 First-letter hint "l___" (f04, D4).** File: `practice/session/HintPanel.tsx:82`.
- Legacy hints `{first_letter, length}`:
  - show `first_letter + '_'.repeat(max(0, length-1))` in the `MASK` font with `tracking-[0.02em]`, marked `aria-hidden`;
  - the screen-reader text stays `hint.letters`.
- AI hints are unchanged ("e___", QP3).
- Tests first (no test covers this shape today):
  - `{first_letter:'l', length:4}` shows "l___" and screen readers get "l… · 4 letters";
  - `length:1` shows only the letter.

**F.14 Result ticket (f05, D2, D3).** Files: `AnswerFeedback.tsx`, `TypeWordQuestion.tsx` (`TryAgainPanel`), `HintPanel.tsx`, `PracticeSession.tsx` (`blankFill` 261–268), `globals.css` (panel-drop ~79/139), `packages/design-tokens/web.css`, `src/styles/web-tokens.test.ts`.
- Position:
  - the panel tucks under the card or hint box above it: `-mt-5.5`, `mx-4.5`, `rounded-b-wm-card`, no top border, padding 38/24/16 px;
  - the card and the hint box are `relative z-10`.
- Entrance:
  - 420 ms ease-out from `translateY(-2.25rem)` and opacity 0, with no overshoot;
  - `motion-safe` only.
- Wrong panel (`panelC`):
  - Stub row: a 24 px x badge and "Not quite" (Bricolage 800, 1.25rem, `wrong-ink`). On the right, the note that applies to the case; on phones it wraps under the title.
  - A dashed perforation (1.5 px, fail at 40 %) with two 16 px notches in the page background colour.
  - Lead line: the meaning (Bricolage 800, 1.7rem, ink), with the English definition beside it in muted text when it differs.
  - Then the answer word (pass colour, 700) with the listen button.
  - Footer: the secondary action as a muted TextButton, then the primary button. The buttons and their keys do not change.
  - The nested green answer box goes away.
- Right panel: the same shell in pass tones (`pass-soft`, pass border, check badge). The stub's note shows the level move "Bậc 1 → Bậc 2" when there is one.
- TryAgainPanel: the wrong shell, with `tryAgainBody` and `tryAgainNote`. It shows no answer. Footer: reveal (muted), Hint, Try again.
- Tokens, light only (dark is unchanged):
  - `--color-wm-wrong-soft: #fae7e4` (fail at 12 % on surface, mixed in oklab);
  - `--color-wm-wrong-line: rgb(184 53 42 / 0.55)`;
  - pin both in `web-tokens.test.ts`.
- Contrast on #fae7e4, computed this session: wrong-ink 4.93, muted 5.71, pass 4.51, ink 12.77.
- Sentence above the panel: a wrong pick in `mcq_sentence` is struck through in the sentence before the correct word. `blankFill` sets `wrong` from `prompt.options[chosen.choice_index]`. Write the test first.
- Tests to update: `practice-session.test.tsx:139/180/299`, `session-screen.test.tsx:97/106/133`, `ai-questions.test.tsx:94/190–215`, `recall-session.test.tsx:83/104`.
- New tests: the struck MCQ pick, and focus still landing on the primary action.
- The e2e `m4` axe checks must pass in light and dark.

**F.15 Inline blank sized to its text (f15).** File: `TypeWordQuestion.tsx` `BlankInput` (76–105).
- Wrap the input in an `inline-grid` with an invisible mirror (`<span aria-hidden class="whitespace-pre">` of the shown text, same font, padding and border).
- The input sits in the same grid cell: `w-full min-w-[5ch]`.
- Remove `size` and `mx-0.5`.
- This works in every browser; it does not rely on `field-sizing`.
- e2e (the cloze run in `m5a.spec.ts`):
  - the input is narrower with 3 letters than with 12;
  - the input's width minus the mirror's text width is no more than its padding plus border.

## Batch C — public pages and the sign-up panel (lane C)

**F.16 Shared typing engine and an answer box that fits (f12, item 19).** New `src/lib/word-cycle.ts` and `src/ui/TypingBlank.tsx`; changes in `auth/AuthShowcase.tsx` (36–83, 170–184).
- Move `Step`, `next()` and the timer hook out of AuthShowcase as `cycleNext(step, wordLengths, dueStart)` and `useWordCycle({ lengths, motion, start: 'first' | 'final' })`.
- Timings do not change: 900 ms, 100 ms per letter, 320 ms, 260 ms, 1700 ms. The due count resets each round.
- `TypingBlank({ word, typed, done, motion })`:
  - an invisible copy of the full word reserves exactly the word's width;
  - the box therefore fits the word while typing and once green;
  - `min-w-21` goes away.
- Tests: unit tests for `cycleNext` (each phase's duration and next state, the wrap after word 5, the due reset). `auth-showcase.test.tsx` passes without changes.

**F.17 Showcase layout (f12, D7).** Files: `AuthShowcase.tsx` (cards 127–198, ghost chips 123–125, node labels 91–103), `e2e/auth-layout.spec.ts`.
- The 640×868 scene, PATH and NODES stay the same.
- Starting values, checked this session against points sampled on the real path:

  | Element | Classes | Rotation |
  |---|---|---|
  | Word card | `left-6 top-15 w-70` | −2.5° |
  | Hôm nay card | `left-95 top-105 w-60` | 3° |
  | Practice card | `left-66 top-150 w-88` | −1.5° |

- Ghost chips:
  - "commute" moves above the word card;
  - "negotiate" moves to the right of the path, between Bậc 4 and the Hôm nay card;
  - "deadline" is rotated 4°.
- Each node label sits on the side of its dot away from the cards, and inside the scene.
- e2e at 1440×900 with reduced motion: no card, ghost chip or caption box may intersect:
  - any node dot or label;
  - the path corridor: points every 8 px along the path, each grown to 46×16 px for a travelling chip.
- Control: the test first asserts 6 nodes and at least 100 path points. Keep the existing test at L18.

**F.18 Hero word cycle and pill (f08, f09, D5).** Files: `site/landing/Hero.tsx`, new `site/landing/HeroCycle.tsx` (`'use client'`), `site/landing/copy.ts`, `Landing.hero` and `Landing.stage` (vi and en, both Vietnamese). Delete `site/interactive/TopicTicker.tsx`.
- Pill: the label only, with `pl-3.5`. Delete TopicTicker and `hero.topics`.
- `HeroCycle` renders the word card and the practice card from `stage.cycle`: 5 entries of `{lemma, pos, ipa, definition, meaning, example, before, after, days, level}`.
- Server HTML is the final frame of mitigate: typed in, green, "Đúng · lên Bậc 3". The first paint matches today's, minus the choices.
- When `motionAllowed()` is true, the cycle starts from that final frame: lemma blur-fade, typing, Enter, green.
- It pauses off screen (`whileInView`). With reduced motion or no JS it stays on the final frame.
- Data:
  - Row 1 is today's `stage` copy, the sentence "Cities need clear plans to ___ the risk of flooding.", and 3 days.
  - Rows 2–5 take AuthShowcase's `WORDS` with the meanings phân bổ, khả thi, xấu đi, mạch lạc and 7/3/1/14 days.
  - `cardLabel` becomes "Thẻ từ · ôn lại sau {days} ngày".
- Practice card: title row, `Progress`, the sentence with `TypingBlank`, the result line. Delete `stage.choices`, `right`, `keyNext` and `keyHint`.
- Tests:
  - `landing.test.tsx:59` stays green;
  - new: the server render shows mitigate filled in with "Đúng · lên Bậc 3";
  - new: with motion allowed and fake timers, the card moves on to allocate;
  - new: with reduced motion it stays on the final frame.
- LR25, LR35 and "React never runs" (L253) must pass.

**F.19 Glow drift behind the prices (f06).** Files: `PricingSection.tsx:26–27`, `parts.tsx`, `globals.css` (1077–1092, 926–935), `web.css`, `web-dark.css`.
- Replace the two halos with one drift layer, per `.final .drift` in the drawing:
  - `absolute -inset-[30%] -z-1`;
  - three radial gradients: accent 22 % at 30 %/40 %, mark 26 % at 70 %/55 %, pass 16 % at 50 %/90 %, each fading to `transparent 70%`;
  - blur 28 px, capped at 12 px below 768 px;
  - animation 18 s ease-in-out infinite alternate: 0 % `translate(-6%,-4%) scale(1)`, 50 % `translate(5%,3%) scale(1.08)`, 100 % `translate(-3%,6%) scale(1.02)`.
- It only animates under `html.js` with motion allowed, and stays off below 760 px as now.
- New tokens `--color-wm-drift-accent`, `--color-wm-drift-mark` and `--color-wm-drift-pass` in both themes.
- The Pro card's Sweep, badge and inner glow stay.

**F.20 "Luyện trong câu" demo at the top (f07).** File: `LearnSection.tsx:101` (`mt-auto`).
- The demo follows the description at the normal gap. Any spare height goes below the demo.
- Check at 1280 and 390.

**F.21 Nav links (f10).** File: `SiteHeader.tsx:17–18`.
- `font-bold text-wm-ink hover:text-wm-accent`. The size stays `text-wm-button` (15 px) and there is no active style.
- `site-chrome.test.tsx:55` stays as is.

**F.22 Not only IELTS (f11, D6).** Files: `GroupsSection.tsx:44–47`, `interactive/FlyIn.tsx`, keys `Landing.groups`, `stage.addedTitle`, `learn.note.eyebrow` and `final.title`, plus comments in `WordStrip.tsx` and `GroupsSection.tsx`.
- Remove the caption pill and its two keys. FlyIn now ends on the last card.
- Apply the D6 wording.
- First grep the whole `Landing` namespace and `landing-data.fallback.ts` for `IELTS|đề|Writing|TOEIC|band`. Control: the four known keys must show up. Report any other hit with a proposed wording; do not change it silently.
- Test: `landing.test.tsx:49–57`, the region name.

## Close-out (main session)

**F.23 Merge the lanes** into `feat/giao-dien-moi-polish`.
- Expect conflicts only in `globals.css`, `messages/*.json` and the token files.
- After each merge, run unit tests, lint and typecheck.

**F.24 Docs:**
- Part 11 in the plan document.
- In the delivery record: the summary, written at approval, plus the as-built for both Part 10 and Part 11.
- The remaining P.18 work:
  - rulings R265 onwards;
  - design §7.1, §7.2, §9 and §14;
  - plan line ~4554, where `detail` should be `extensions.group_id`;
  - narrow the allow-file for `App.errors.*`, `App.transactions.*` and `Landing.*`.
- A decision record section QF:
  - f01–f19, with the options shown, the ✅ pick and your notes;
  - D1–D9.
- New items for you in `docs/deliveries/giao-dien-moi-polish-checklist.md`.

**F.25 Verify:**
- Web unit tests, lint, typecheck and the message key check.
- Admin's four checks, because tokens change.
- `pnpm cf:docker` full e2e once, with nothing else running. Earlier runs were inconclusive because of load.
- Screenshots in light and dark at 1280 and 390 of every changed screen, attached to the as-built.
- A whole-branch review on the most capable model, then one fix round.

**F.26 Ship:**
- Through `ship-pr`: push the branch and open one PR into `refactor/giao-dien-moi` with a four-section English body.
- Report CI's actual verdict, and merge when it is green.
- Then run `pnpm bootstrap` and seed for your manual pass.

## Review focus (cases the tests above do not cover)

1. The ticket at 320 px with a hint box open and a long meaning: the stub note wraps, and the notches stay on the perforation.
2. The scope switch changes `sessionMax` while the field holds a typed value that is not committed yet: the commit clamps to the new max.
3. The hero cycle when the tab is hidden, scrolled away and back: no burst of steps, and no layout jump. `TypingBlank` reserves the width and the word card has a minimum height.
4. Nhóm in two columns at 844×390: the arrow keys and the live region still work, and nothing hides under the phone's home bar.
5. A day with practice only: the summary, the empty line and disabled chips, with no crash.

## Verification (end to end)

- Commands: the web unit tests, lint and typecheck; admin's four checks; `pnpm cf:docker`. Then run `pnpm bootstrap` and seed, and do a browser pass at 1280×800, 844×390, 768×1024, 1024×768 and 390×844.
- Screens for that pass:
  - Nhóm and Hôm nay.
  - Thêm từ: Nhập nghĩa and the deck picker.
  - Tùy chỉnh phiên.
  - Lịch → Ngày.
  - Phiên luyện: wrong, right, try again, and with a hint open.
  - Học and Ôn.
  - Home page: hero, prices, Luyện trong câu, nav, the Nhóm từ block.
  - Sign-up and sign-in at 1440×900.
- Done when every check is green, CI on the PR is green, and the screenshots are in the as-built.
