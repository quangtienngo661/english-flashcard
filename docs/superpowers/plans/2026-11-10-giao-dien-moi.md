# Giao diện mới — Implementation Plan, part 1 (setup, API, M1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the foundation of the new web UI: archive the old UI and open the long branch, ship every API the design adds (§10), and build milestone M1 (tokens, fonts, `src/ui/`, the app chrome moved into route-group layouts) so M2–M9 rebuild screens on it.

**Architecture:** API: Learning owns the calendar and streak endpoints and reads Practice counts through a string-token port that Practice provides from its `@Global()` ports module; `GET /v1/groups` gains two fields from two extra queries and one Content batch; Practice adds `GET /v1/practice/sessions/last`; Settings adds a public prices endpoint. Web: new `wm-` token files beside the old ones, three `next/font` families, a `src/ui/` kit on react-aria-components, and the chrome moved out of 17 `<AppShell>` call sites into the layouts `(chrome)`, `(onboarding)`, `(focus)`.

**Tech Stack:** NestJS 12, Prisma 7.10.1, Zod 4.6.7 (API); Next 16.4.3 App Router, next-intl 4.14.9, Tailwind 4.3.3, react-aria-components 1.22.1, TanStack Query, OpenNext Cloudflare 1.20.13 (web); Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md`, with `docs/superpowers/decisions/2026-11-09-giao-dien-moi-decisions.md` and the code facts `docs/preparation/GIAO_DIEN_MOI_PLAN_CODE_FACTS_2026-11-10-{api,web}.md` (cited below as "API facts §n", "web facts §n"). Every web task starts by reading design §3 (sources of UI and motion context, how to read a Figma frame) and the Figma frames it names, through the Figma MCP (`get_screenshot`, `get_design_context`, `get_variable_defs`).

**Plan parts:** this file is part 1. Each of M2–M9 gets its own part, written from the same design and approved by the owner just before that milestone starts, appended here as "Part 2" … "Part 9". The roadmap fixes their scope and order. QR4 (ads) is still open: Task Q4 is a placeholder.

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

QR4 is open. The options are on the artifact https://claude.ai/artifact/V8Yd4w2qDBmR9GVuTdT3Yq and in `docs/preparation/AD_ALTERNATIVES_TO_ADSENSE_2026-11-10.md`:
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
