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
| 8 | `feat/giao-dien-moi-m8` | §9 M8, §10.6 web side, §11 | `site/`; prices read at build; OG fonts; old tokens dropped from web; `app-ui/`, `components/` deleted |
| 9 | `feat/giao-dien-moi-m9` | §9 M9, §13 rows run by hand | dark fixes; `scripts/compare-bundle-stats.mjs`; Lighthouse, frame-rate numbers; PR `refactor/giao-dien-moi` → `dev` |
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
