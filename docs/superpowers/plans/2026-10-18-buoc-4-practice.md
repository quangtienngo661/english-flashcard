# Bước 4 — Practice Implementation Plan (API only)

> **Status 18/10/2026:** written after the design was settled (D1–D36; the proposals added after the independent review were
> approved the same day, design §0 R1–R15). **API only**: no `apps/web`, no `apps/admin` screen (D24).
> **Execution (owner 18/10/2026):** parallel sessions, every task implemented by Claude, one coordinator session (D29); no Codex
> loop. Which tasks run side by side: "Parallel tracks". What the coordinator does: "Brief for the coordinator session".

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Learners practise their words through the API with multiple choice, true/false and typing (meaning prompts, and
sentence prompts for typing), see a "weak words" list and a dated history, report wrong content to staff, and send "Cần ôn tập"
/ "Đã biết" from a result into the Bước 3 schedule.

**Architecture:** A new **Practice** module owns four tables (`practice_sessions`, `practice_questions`,
`practice_session_items`, `practice_reports`) and keeps the session on the server: a question is built only when the app asks
for the next one. Practice reads Learning (word lists, group mates, item state) and Content (meaning, examples, accepted
answers, inflections) through their exported services, writes "Cần ôn tập"/"Đã biết" through one new Learning function that
runs in Practice's transaction, checks `practice.basic` through a new placeholder **Entitlements** module, and cleans up in the
existing hourly `MaintenanceScheduler`. Learning reaches Practice only through a port it declares (private-word deletion).

**Tech Stack:** unchanged — NestJS `12.1.2`, Prisma `7.10.0`, Postgres 17, Vitest 4 + Testcontainers, zod `4.6.5`. **No new
dependency.**

**Spec:** [`docs/superpowers/specs/2026-10-18-buoc-4-practice-design.md`](../specs/2026-10-18-buoc-4-practice-design.md) — read
the section named in each task. Decisions: [`../decisions/2026-10-18-buoc-4-practice-decisions.md`](../decisions/2026-10-18-buoc-4-practice-decisions.md).
Reviews: design [`../reviews/2026-10-18-buoc-4-design-review.md`](../reviews/2026-10-18-buoc-4-design-review.md), plan
[`../reviews/2026-10-18-buoc-4-plan-review.md`](../reviews/2026-10-18-buoc-4-plan-review.md) (29 findings, all applied 18/10). A test
that proves a design criterion starts with its `B4#`/`B4E#` (or `D#`) and asserts every clause of that criterion's Then,
including state read back by a fresh query after a refused request; other tests are named by the behaviour they pin.

**Branches:** this plan lives on `docs/buoc-4-design`, merged into `dev` before implementation starts (coordinator step 1).
Implementation: one branch per **track** (`feat/buoc-4-<track>`), each cut from the latest `dev`, each in its own git worktree
(`.claude/worktrees/buoc-4-<track>`), each PR merged into `dev` once CI is green. A track that needs another track's PR merges
`dev` into its branch after that PR is merged.

## Parallel tracks (checked 18/10/2026 against each task's Files and Interfaces)

| Track | Tasks, in order | Starts | Waits for |
|---|---|---|---|
| A — Platform | 1 → 2, **PR A1** | day one | nothing |
| B — Learning | 3 → 4, **PR B1**; 5, **PR B2** | day one | Task 5: PR A1 |
| C — Content | 6 → 7, **PR C1** | day one | nothing |
| D — Practice flow | 8 → 9 → 10 → 11 → 12, **PR D1**; 13 → 14 → 15 → 16 → 17, **PR D2** | day one | 13: PR A1, PR B1, PR C1 |
| E — Reports and upkeep | 18 → 19, **PR E1** | after PR D1 and PR A1 | 19: PR B1 |
| F — Gate | 20 | every PR merged | — |

Why (from the Interfaces blocks):
- **A** touches only Settings (the `practice` group; `learning` untouched), `app-config.ts` and a new `src/entitlements/**`.
- **B** touches `src/learning/**`, `learning.prisma` and `test/support/create-test-app.ts` (Task 4). Task 5 also makes the
  Settings review cap nullable (`settings.definitions.ts`, `test/settings/settings.e2e-spec.ts`), because the TypeScript type
  change and the Learning code that subtracts from the cap must land in one PR; it starts after PR A1, so the Settings files
  are never edited by two tracks at once.
- **C** touches only `src/content/**` and one new test helper.
- **D** Tasks 8–12 are the schema and pure functions; their input types are Practice's own (`QuestionWord`, `SortableWord`,
  `Attempt`), so they need no other track. Task 13 maps Content's `PracticeSense` (Task 6) onto `QuestionWord` and asks Learning
  for group mates (Task 3).
- **E** seeds sessions, questions and items directly in SQL with the shapes and `answer_raw` formats of Task 8, so it does not
  wait for Tasks 13–17; Task 20 adds the one test that runs D's answer path and E's report path together.

Files edited by more than one track (one-line conflicts, resolved by hand when merging): `src/app.module.ts` (Tasks 2, 8, 19),
`src/practice/practice.module.ts` (tracks D and E), new migration folders (rename rule in Global Constraints). Edited by one
track at different times (no conflict): `src/settings/settings.definitions.ts` and `test/settings/settings.e2e-spec.ts` (Task 1,
then Task 5 after PR A1), `src/learning/index.ts` (Tasks 3, 4), `src/content/index.ts` (Tasks 6, 7).

Critical path: C (6, 7) and B (3, 4) → D (13 → 14 → 15 → 16, 17) → F (20). At most four implementing sessions run at once (A,
B, C, D on day one; E replaces A once PR A1 is merged).

## Brief for the coordinator session (D29)

The coordinator implements no task. It:
1. Pushes `docs/buoc-4-design`, opens a PR into `dev`, merges it once CI is green (owner rule 16/10/2026), so every track reads
   this plan and the design from `dev`.
2. Creates one worktree and branch per track from the latest `dev`, and **gives each its own local database** (all tracks
   share one Postgres container, service `postgres`, host port 5434): `docker compose -p english-learning exec postgres
   createdb -U dev english_learning_b4_<track>` — always with `-p english-learning` or from the main checkout
   (`E:\Working\Working project\english-learning`), because `docker-compose.yml` sets no `name:` and a worktree folder would
   otherwise be read as another compose project with no running container; in the worktree `apps/api`: `pnpm install`, copy `.env` from `.env.example` with fresh
   secrets (`node scripts/gen-secret.mjs`, CLAUDE.md "Local setup") and `DATABASE_URL` pointing at that database, then `pnpm
   db:setup`. It starts one session per track with: this plan's path, the track's task list, the design and decision record
   paths, the database name, and this sentence: "Read Global Constraints and Review Focus first; commit after every task; open
   the track's PR when its last task is green; never edit a file another track owns except the conflicts listed in Parallel
   tracks." At most two tracks run `pnpm test:e2e` at the same moment (Testcontainers load slows every suite); the
   coordinator tells a track to wait when two are running.
3. Merges each PR when CI is green, in the order A1, C1, B1, D1, B2, E1, D2 (any order the dependencies allow), renaming
   migration folders first (Global Constraints) and re-running `pnpm db:setup; pnpm test; pnpm test:e2e` on the merged result
   when two migration-bearing PRs meet. After a rename, the track whose folder was renamed drops and recreates its own
   database (`dropdb`/`createdb` in the container) before `pnpm db:setup`, since `prisma migrate deploy` does not detect a
   renamed migration that already ran (`dropdb`/`createdb` with the same `-p english-learning` rule).
4. Tells a waiting track when the PR it waits for is merged, so it merges `dev` and goes on.
5. Answers a track's question only when the plan and design already decide it; a question that changes behaviour goes to the
   owner (owner answers first, Claude proposes after — design D27), and the answer is written into the design and decision
   record before the track goes on.
6. Runs Task 20 itself (or starts a session for it) once every PR is merged, then reports to the owner: the PR list, the
   numbers, the smoke output, open risks (design §16).
7. Reminds the owner that D33 (definitions ≤ 200 characters, Vietnamese meanings split by commas, in the content-writing
   prompt) is content work outside the app, wanted before the 20-word trial; no task here does it.

## Verified on 18/10/2026 (`origin/dev` @ `fa0533e`)

| Check | Result |
|---|---|
| Learning exports | `src/learning/index.ts` exports only `LearningModule`, `LearningService` (`cardsLeftToday`), `LearnerDay`. `ReviewsService.answer` requires a group link (`reviews.service.ts:45-48`) and answers 400 when a `review_id` is reused with another payload (`:88-91`). `learning_log.group_id` is nullable (`learning.prisma:57`); `review_id` is unique per `(user_id, review_id)` only where not null (migration `20261017210000_learning`, line 90). |
| Caps | Counted from log rows with `group_id IS NOT NULL` by `section` (`queue.queries.ts:46-52, 91-95`); applied in `queue.service.ts` `today()` (`:26-32`) and `queue()` (`:80-88`). |
| Locks | `withLearnerLock`, `lockItems` (`learning-lock.ts`); reviews lock the item row `FOR UPDATE` (`reviews.service.ts:39-40`); group deletion locks items first (`groups.service.ts:96-116`). |
| Private-word deletion | `QuickAddService.deleteMyWord` owns the transaction and calls `content.deletePrivateEntryContent(tx, …)` (`quick-add.service.ts:84-91`). Port precedent: `BATCH_SCOPE` (`content/batch-scope.port.ts`) provided by a `@Global()` module (`content-pipeline/import/batch-scope.provider.ts`) and injected with `@Optional()`. |
| Content | `cardContent` returns `WordSense` with `scope`, `meaning { text, language, translation_missing }`, `definition_en`, `examples` (`words.service.ts:13-18, 49-62`). Publish requires a Vietnamese gloss, one English example and a level (`publish.service.ts:29-35`). Private words have one meaning in the learner's language and `examples: []` (`private-words.service.ts:54-57, 148`). Function word = `COALESCE(function_word_override, function_word_derived)` (`learner-content.service.ts:111`); private entries are created with `function_word_derived = false` (`private-words.service.ts:137`). `entry_inflections` is unique on `(entry_id, form, kind)` (`content.prisma:166`). |
| Platform | Rate limits are static config (`app-config.ts:85-100`, read in `rate-limiter.service.ts:18`); `app-config.spec.ts:178` lists every rule. Settings values are `boolean \| number \| string` (`settings.definitions.ts:66`); the one cross-field rule is at `:86-89`; the PUT schema makes every group optional (`:37-50`). `MaintenanceScheduler` runs every hour in the API process (`maintenance.scheduler.ts:8, 52-56`); `test/identity/maintenance.e2e-spec.ts:113` lists the registered job names. `LearnerContentGuard` needs `native_language`, not a verified email. `@RequirePermission` lives in `src/identity/staff/require-permission.decorator.ts`. Every `/v1/admin/` route is audited by `test/content/admin-permissions.e2e-spec.ts`. `apps/admin` has no settings page yet. |
| Tests and local setup | `vitest.config.e2e.ts` excludes only Learning's scale file; `vitest.config.e2e-scale.ts` includes only it; `createTestApp` has no option to swap providers today (Task 4 adds one); one Postgres service `postgres` (host port 5434, user `dev`) for every worktree; `docker compose down -v` would delete the `postgres_data`/`redis_data` volumes (plan review 18/10, #4, #9, #10, #18). |
| **Not verified** | Session start time for a learner with 100 groups × 2,000 words (Task 14 measures); weak-word query time over 6 months of history (Task 17 measures); that `prisma migrate deploy` re-runs a renamed migration on a database that already applied it (Prisma docs say it does no drift detection; the brief recreates the track database instead of relying on it). |

## Global Constraints

- Paths are under `apps/api/` unless they start with `docs/`. Commands run from `apps/api/` in **PowerShell**; Docker Desktop
  must be running. No task edits `apps/web` or `apps/admin`.
- API conventions as Bước 3: ESM imports end in `.js`; JSON `snake_case`; routes under `/v1`; `z.strictObject` bound with
  `@Body({ schema })`/`@Query({ schema })`/`@Param({ schema })`; ids are lower-cased uuids; bad input is 400
  `validation-failed`, never 500. Learner routes use `@LearnerContent()` and `@CurrentLearner()`.
- **Module boundaries (D3):** new model file `prisma/models/practice.prisma`; Practice imports Learning only through
  `src/learning/index.ts`, Content only through `src/content/index.ts`, Settings only through `src/settings/index.ts`,
  Entitlements only through `src/entitlements/index.ts`, Identity only through `IdentityService`; **no module imports
  `src/practice/**`** (Learning reaches it through the port of Task 4); no Prisma `@relation` across modules.
- **Problem slugs (design §6 table):** 400 `validation-failed`; 404 `not-found` (missing, or another learner's session/item);
  409 `practice-no-words` (extension `reason`: `group-empty` | `no-word-fits-types` | `source-empty`), `session-closed`,
  `already-answered` (extension `result` = the stored answer response), `hint-unavailable`, `skip-not-allowed`, `not-answered`,
  `known-not-allowed`, `review-already-set`, `not-in-learning`, `report-exists` (extension `report`),
  `report-not-available`; 429 `rate-limited`. **Added by this plan** (not in design §6; Task 20 writes them into the design's
  table as-built): 403 `entitlement-required` (only when `EntitlementsService.check` refuses — unreachable in Bước 4, a
  placeholder Bước 5 may rename), 409 `report-not-open` (staff resolve of an already resolved report), 409 `item-void` (an
  answer, hint, skip or review on an item already voided as "not found"), 409 `session-not-waiting` (`continue` on a session
  that is not `waiting_continue`).
- **Which refusal wins** (one order for every item route): 404 (not the caller's) → 409 `session-closed` (session
  `finished`/`abandoned` for `next`, `hint`, `answer`, `skip`, `continue`, `finish`; `abandoned` only for `review`, `summary`,
  `review-all`) → 409 `item-void` → 409 `already-answered` / `not-answered` → the route's own checks. `report` ignores
  session status (design R11).
- **Lock order (avoids deadlocks; Tasks 4, 14–16, 18, 19):** inside one transaction, take locks in this order and never back:
  (1) `withPracticeLock(userId)` — only `POST /sessions` and report creation; (2) the session row `FOR UPDATE`; (3) Practice
  item rows `FOR UPDATE`, in `id` order when more than one; (4) Learning item rows `FOR UPDATE`, in `id` order (Learning's own
  rule, `learning-lock.ts`). Every item route (`answer`, `hint`, `skip`, `review`) locks the session row first and updates its
  `last_activity_at`; `next` and `current` lock the session row and update `last_activity_at`. An item becomes `void` only
  while `result IS NULL`. `deleteMyWord` keeps its own order — learner lock, Content delete, **then the port** (which locks the
  affected sessions and items in steps 2–3), **then** Learning items — so it never holds a Learning item before a Practice
  row.
- **Fixed numbers (design §5.4, D21, D30):** typed answer 1–100 and report note 0–300 **code points after NFC + trim**; weak =
  ≥ 2 wrong among the 5 most recent counted attempts; 4 options per multiple choice; 50/50 between meaning and sentence prompts
  for typing in `mixed`. Everything else comes from `SettingsService.get().practice` (Task 1) — never a literal in code.
- **Privacy:** never log a typed answer, a prompt, a meaning or a sentence (SR9); logs carry ids, `result`, `tries`. Staff never
  see a private word (D36). Another learner's session, item or report is 404.
- **Time:** `Clock.now()` only. "Today" = `localDate(profile.timezone, now)`; `local_date` of an item is written with its final
  result, in the zone at that moment (B4E17). History retention subtracts calendar months from `now` in UTC.
- **Writes:** `POST /sessions`, `POST /items/:id/answer`, `POST /sessions/:id/review-all` and the staff `resolve` carry
  `@Idempotent()` + `IdempotencyInterceptor`; the other writes are idempotent by their own state (design §6). Rate limits:
  `practice.answer` (Task 2) on `next`, `hint`, `answer`, `skip`, `review`; `user.write` on `sessions`, `continue`, `finish`,
  `review-all`, `resolve`; `report` limited by `reports_per_hour` (Task 18).
- **Tests:** real Postgres through Testcontainers; `FakeClock`; suites with global counts use `createIsolatedDatabase()`. Unit
  `*.spec.ts` next to the code, e2e `test/practice/*.e2e-spec.ts`. Test zones as Bước 3: `Asia/Ho_Chi_Minh`,
  `Pacific/Kiritimati`, `Etc/GMT+12`.
- **Migrations on parallel tracks:** before a track's PR merges, its migration folders are renamed to a timestamp later than
  the newest migration on `dev`, then `pnpm db:setup` and the suites re-run on the merged result.
- **Git:** commit after every task on the track branch, Conventional Commits (`feat(practice): …`, lower case, imperative)
  ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push and open a PR into `dev` without asking; merge
  once CI is green; never `main`. Scan for secrets before every push.

## Review Focus

1. **Two devices or double taps** — two `next`, two answers, an answer racing a retry, a review racing "review all" — must
   leave exactly one item per position, one final result, one Learning write per item; Tasks 14, 15, 16 (B4E1, B4E2, B4E28,
   and the test added in Task 16 for `review-all` racing a single `review`).
2. **A learner with a huge source** — "Ôn tất cả" over 100 groups × 2,000 words with only multiple choice chosen — must start a
   session in under 1 s on the dev machine (`ASSUMPTION`, printed for the owner); Task 14 scale test.
3. **Odd typed answers** — curly quotes, NFD input, tabs and double spaces, upper case, emoji, exactly 100 and 101 code points,
   only spaces — normalized and counted as design 7.6 says; Task 9.
4. **Content changing at each step** — a sense retired, a word removed from learning or from the group, a private word or the
   group deleted, between `next`, a reload and `answer` — the shown question is still graded; a reload says "not found" and goes
   on; Tasks 14, 15, 19 and Task 20's cross-track test (B4E6–B4E8b, B4E31–B4E33).
5. **Private words crossing a boundary** — another learner's private word as a distractor, in history or weak words, or a
   private word in a staff report — must never appear; Tasks 13, 17, 18.

---

# Milestone M1 — Foundations (tracks A, B, C, D)

### Task 1: Settings — the `practice` group, an empty value and the cross-field rule (track A)

**Files:**
- Modify: `src/settings/settings.definitions.ts`, `src/settings/settings.definitions.spec.ts`, `test/settings/settings.e2e-spec.ts`

**Interfaces:**
- Produces: `AppSettings.practice: { maxQuestionsPerSession: number; defaultQuestionsPerSession: number; historyMonths: number;
  trueFalseTruePercent: number; idleSessionCloseHours: number; reportsPerHour: number; hintDefinitionMaxChars: number;
  typeWordMaxRetries: number | null }`, defaults `20, 10, 6, 50, 24, 20, 200, null`; API keys `max_questions_per_session`,
  `default_questions_per_session`, `history_months`, `true_false_true_percent`, `idle_session_close_hours`, `reports_per_hour`,
  `hint_definition_max_chars`, `type_word_max_retries`; bounds `5–100, 1–100, 3–24, 20–80, 1–168, 5–100, 80–500, 1–10 or null`.
  `SETTINGS_BOUNDS.practice.type_word_max_retries` carries `nullable: true`. The value type admits `null`; `withDefaults` keeps a
  stored `null` (it is not "missing"); a history row whose old or new value is `null` is written with `Prisma.JsonNull` (the
  columns are required `Json`, `settings.prisma:16-17`; precedent `idempotency.service.ts:74`) and read back as `null`. New
  cross-field rule: `default_questions_per_session ≤ max_questions_per_session`, violation
  `values.practice.default_questions_per_session: Expected at most max_questions_per_session`. **The `learning` group is not
  touched here** (its nullable review cap is Task 5, see Parallel tracks).

- [ ] **Step 1: Failing tests.** Spec: `withDefaults fills the practice group; a stored null for type_word_max_retries stays
  null`; `changedFields reports 3 → null`. E2e: `GET /v1/admin/settings returns the practice defaults and the new bounds`;
  `PUT practice values within bounds saves and records history rows`; `type_word_max_retries 3 → null saves and the history
  row reads back old 3, new null`; `B4E38: default 30 with max 20 → 400 validation-failed and nothing saved`;
  `type_word_max_retries 0 or 11 → 400`. Update the existing default-value assertions for the new group.
- [ ] **Step 2:** `pnpm test src/settings; pnpm exec vitest run --config ./vitest.config.e2e.ts test/settings` → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Re-run → PASS; `pnpm exec tsc --noEmit -p tsconfig.json`.
- [ ] **Step 5: Commit** `feat(settings): add the practice settings`.

### Task 2: Rate-limit rule and the entitlements check (track A)

**Files:**
- Modify: `src/common/config/app-config.ts`, `src/common/config/app-config.spec.ts`, `src/app.module.ts`
- Create: `src/entitlements/entitlements.module.ts`, `src/entitlements/entitlements.service.ts`,
  `src/entitlements/entitlements.service.spec.ts`, `src/entitlements/index.ts`

**Interfaces:**
- Produces: `RateLimitRuleName` gains `'practice.answer'`, `DEFAULT_LIMITS['practice.answer'] = { by: 'user', max: 120,
  windowSeconds: 60 }` (R1). `type Feature = 'practice.basic'`; `EntitlementsService.check(userId: string, feature: Feature):
  Promise<{ allowed: true } | { allowed: false }>` — Bước 4 always `{ allowed: true }` for a signed-in user (D25; Bước 5
  replaces the body only). `EntitlementsModule` exports the service; `index.ts` exports `EntitlementsModule`,
  `EntitlementsService`, `type Feature`.

- [ ] **Step 1: Failing tests.** `app-config.spec`: the rules list includes `practice.answer` 120/60 s per user;
  `entitlements.service.spec`: `D25: practice.basic is allowed for any user id`.
- [ ] **Step 2:** `pnpm test src/common/config src/entitlements` → FAIL.
- [ ] **Step 3: Implement**; register `EntitlementsModule` in `AppModule`.
- [ ] **Step 4:** Re-run → PASS; `pnpm build`.
- [ ] **Step 5: Commit** `feat(platform): add the practice rate limit and the entitlements check`.

### Task 3: Learning reads for Practice (track B)

**Files:**
- Create: `src/learning/practice/practice-reads.queries.ts`, `src/learning/practice/practice-reads.service.ts`,
  `test/learning/practice-reads.e2e-spec.ts`
- Modify: `src/learning/learning.service.ts`, `src/learning/learning.module.ts`, `src/learning/index.ts`

**Interfaces:**
- Consumes: `visibleSenseCondition`, `groupStatsQuery`, the queue order of `queueItemsQuery`, `sectionOf`, `applyAnswer`'s
  `wasDue` rule (`schedule.ts:33`), `SettingsService.get().learning` caps.
- Produces (on `LearningService`, types exported from `index.ts`, which also re-exports `type Section` from `schedule.ts`):
  - `type PracticeItem = { item_id: string; sense_id: string; level: number; due_date: string; priority: boolean;
    section: Section; due_now: boolean; added_at: string /* earliest group link */; last_needs_review_at: string | null }` —
    `due_now` = `priority || level === 0 || due_date ≤ today` (exactly `wasDue`); `last_needs_review_at` = `at` of the newest
    log row `kind = 'review' AND answer = 'review'` of that item.
  - `type PracticeScope = { kind: 'today' } | { kind: 'all' } | { kind: 'priority' } | { kind: 'group'; groupId: string;
    filter: 'all' | 'due' | 'priority' | 0 | 1 | 2 | 3 | 4 | 5 } | { kind: 'senses'; senseIds: string[] }`.
  - `practiceItems(userId: string, scope: PracticeScope): Promise<PracticeItem[]>` — visible senses only, one row per item.
    `today` = the union over the learner's groups of each group's `queue?mode=due` list (priority, then due and new within
    the remaining caps), deduplicated by item, computed in **one** statement (`ROW_NUMBER() OVER (PARTITION BY group_id …)`
    compared with each group's remaining caps, which the statement computes from the log like `groupStatsQuery`); the two cap
    values are SQL parameters, and a `null` review cap means no limit on the due part (so Task 5 only changes the value it
    passes); `priority` and group filter `priority` = `priority AND NOT backlog` (D48, R15); group filter `due` = that group's
    `queue?mode=due` list; levels filter by `level`; a group not owned → 404 `not-found`.
  - `practiceGroupMates(userId: string, senseIds: string[]): Promise<Map<string, string[]>>` — for each given sense, the
    visible sense ids of every item that shares a group with the learner's item of that sense, excluding the sense itself;
    a sense not in learning maps to `[]`; one statement for the whole batch.
  - `practiceCheck(userId: string, senseId: string, groupId: string | null): Promise<{ item: PracticeItem | null; groupExists:
    boolean | null; inGroup: boolean | null }>` (the two booleans are `null` when `groupId` is `null`).

- [ ] **Step 1: Failing tests.** `today equals the union of GET /v1/groups/:id/queue?mode=due over all groups, a word in two
  groups once`; `today after 100 due reviews in a group leaves that group's due part out (caps from the log)`; `all returns every
  visible item once, backlog included`; `priority leaves out a priority item 61 days overdue (D48)`; `group filters all / due /
  priority / 2 return the expected sets`; `a retired sense is absent from every scope`; `another learner's group → 404`;
  `B4E24: practiceGroupMates of a word in two groups returns the union of both groups' visible senses, each once, without
  the word itself, never another learner's items; a batch of three senses answers all three in one call`; `practiceCheck reports a word removed from the group but still learning (inGroup false) and a deleted group
  (groupExists false)`; `due_now is true for level 0 with due date tomorrow, for priority, and for a backlog word`;
  `last_needs_review_at is the newest review-answer row`.
- [ ] **Step 2:** `pnpm exec vitest run --config ./vitest.config.e2e.ts test/learning/practice-reads.e2e-spec.ts` → FAIL.
- [ ] **Step 3: Implement** per the interfaces; `queue.service.ts` is not edited (Task 5 owns the cap change).
- [ ] **Step 4:** Re-run, plus `test/learning` → PASS.
- [ ] **Step 5: Commit** `feat(learning): expose word lists and group mates for practice`.

### Task 4: Practice review write, `learning_log.origin` and the private-senses port (track B)

**Files:**
- Modify: `prisma/models/learning.prisma` + new migration `<ts>_learning_log_origin`, `src/learning/learning.service.ts`,
  `src/learning/index.ts`, `src/learning/quick-add/quick-add.service.ts`, `test/support/create-test-app.ts` (option
  `providers?: Array<{ provide: unknown; useValue: unknown }>` passed to `overrideProvider`/extra providers, so a test can supply
  a port or a fake service)
- Create: `src/learning/practice/practice-review.service.ts`, `src/learning/private-senses-cleanup.port.ts`,
  `test/learning/practice-review.e2e-spec.ts`

**Interfaces:**
- Produces: `LearningLogEntry.origin String?` (`'practice'` or null). `LearningService.practiceReview(tx:
  Prisma.TransactionClient, userId: string, inputs: Array<{ senseId: string; action: 'known' | 'review'; reviewId: string }>):
  Promise<Array<{ senseId: string; outcome: 'applied'; item_id: string; level: number; due_date: string; priority: boolean } |
  { senseId: string; outcome: 'not-in-learning' } | { senseId: string; outcome: 'known-not-allowed' }>>` — first locks every
  affected item row `FOR UPDATE` **in item `id` order** (as `lockItems`), then per input: a log row with this `review_id`
  returns its stored result; `known` when not `wasDue` → `known-not-allowed`, nothing written; otherwise `applyAnswer`, item
  update, log row with `group_id` null, `origin = 'practice'`, `section`, `review_id`, `local_date` = today. Uses the caller's
  `tx` (Practice records `review_action` in the same transaction, R2); a single "Cần ôn tập" passes one input.
  `PRIVATE_SENSES_CLEANUP = 'LEARNING_PRIVATE_SENSES_CLEANUP'`, `interface PrivateSensesCleanup { deleteForSenses(tx:
  Prisma.TransactionClient, userId: string, senseIds: string[]): Promise<void> }`, both exported from `index.ts`;
  `QuickAddService` injects it with `@Optional()` and, inside `deleteMyWord`'s transaction, calls it **right after the
  Content delete and before deleting the Learning items and log rows** (lock order, Global Constraints).

- [ ] **Step 1: Failing tests.** `B4#9 (Learning side): known on a due item → level +1, due by the ladder, priority off; the log
  row has origin practice and group_id null`; `review → level 1, due today, priority on`; `B4E9: known on an early item →
  known-not-allowed and no log row`; `the same review_id twice → one log row, the same result`; `a sense not in learning →
  not-in-learning`; `three inputs lock their items in id order and return three outcomes`; `D35 / B4#27: after 100 due reviews
  in the group, five practice "known" writes leave GET /v1/groups' cap counts unchanged`; `with a recording port supplied
  through createTestApp's providers option, deleteMyWord calls it with the deleted sense ids before the items are gone; a port
  that throws rolls the whole delete back (entry, items and log still there)`; `without a provider deleteMyWord works as
  before`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; generate the migration with `prisma migrate diff … --script`.
- [ ] **Step 4:** `pnpm db:setup`; run `test/learning` → PASS.
- [ ] **Step 5: Commit** `feat(learning): record practice answers and declare the private-senses cleanup port`.

### Task 5: The review cap may be empty (D35) (track B, after PR A1)

**Files:**
- Modify: `src/settings/settings.definitions.ts`, `src/settings/settings.definitions.spec.ts`,
  `test/settings/settings.e2e-spec.ts`, `src/learning/queue/queue.service.ts`, `src/learning/queue/queue.queries.ts`,
  `src/learning/practice/practice-reads.service.ts` (the value it passes), `test/learning/queue.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 1's `null` support and `Prisma.JsonNull` history rule; Task 3's `today` statement.
- Produces: `AppSettings.learning.reviewsPerGroupPerDay: number | null` (API key `reviews_per_group_per_day`, bounds 10–500 or
  `null` = no limit, `nullable: true` in `SETTINGS_BOUNDS`); `newPerGroupPerDay` stays a required number. A `null` cap means no
  limit on the due part in `GET /v1/groups` (`today()`), `queue?mode=due` (`queue()`), `cardsLeftToday` and Task 3's `today`;
  `queueItemsQuery`'s due section takes `limit: number | null` (no `LIMIT` for `null`). Type change and code change land in this
  one commit, so `tsc` stays green.

- [ ] **Step 1: Failing tests.** Settings: `reviews_per_group_per_day null saves (D35) and reads back null`; `B4E46:
  new_per_group_per_day null → 400 validation-failed, nothing saved`. Learning: `B4#26: cap null, 150 due → GET /v1/groups reports
  150 due and the queue returns 150; cap back to 100 → 100`; `B4E44: with cap null the new-word cap of 20 still applies and
  practiceItems(today) holds every due word`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `pnpm exec tsc --noEmit -p tsconfig.json`; run `test/settings`, `test/learning` and `test/notifications` → PASS.
- [ ] **Step 5: Commit** `feat(learning): let an empty review cap mean no limit`.

### Task 6: Content read for Practice and a seed helper (track C)

**Files:**
- Create: `src/content/practice/practice-senses.ts`, `test/content/practice-senses.e2e-spec.ts`, `test/support/seed-practice.ts`
- Modify: `src/content/content.service.ts`, `src/content/index.ts`

**Interfaces:**
- Produces: `type CandidateSense = { sense_id: string; entry_id: string; scope: 'catalog' | 'private'; lemma: string; meaning:
  { text: string; language: 'vi' | 'en'; translation_missing: boolean }; gloss_vi: string | null; definition_en: string | null;
  form_of_entry_id: string | null; function_word: boolean }` (the fields the distractor filter and a true/false pair need);
  `type PracticeSense = CandidateSense & { context_label: string | null; examples: string[]; variants: string[]; accepted:
  string[]; inflections: Array<{ form: string; kind: InflectionKind }> }` — `meaning` and `context_label` exactly as
  `cardContent` (so `null` for a private word, never its internal `p2`, `p3` label, `words.service.ts:56`); `variants` = every
  entry variant text (any spelling of the word, used to find it in a sentence); `accepted` = variants with
  `accepted_as_answer` plus the live revision's `accepted_forms`, without the lemma (what grading accepts); `inflections` of the
  entry; `function_word` = `COALESCE(function_word_override, function_word_derived)`.
  `ContentService.practiceSenses(viewerId: string, senseIds: string[], nativeLanguage: 'vi' | 'en'): Promise<Map<string,
  PracticeSense>>` and `ContentService.practiceCandidates(viewerId: string, senseIds: string[], nativeLanguage: 'vi' | 'en'):
  Promise<Map<string, CandidateSense>>` (no examples, variants or inflections; for thousands of candidate ids) — visible senses
  only (`visibleSenseCondition`), one statement each. Test helper `seedPracticeSense(prisma,
  opts: { lemma: string; pos?: string; glossVi?: string; definitionEn?: string; examples?: string[]; variants?: string[];
  acceptedForms?: string[]; inflections?: Array<{ form: string; kind: InflectionKind }>; formOfEntryId?: string; functionWord?:
  boolean; ownerUserId?: string }): Promise<{ senseId: string; entryId: string }>` (catalog published, or private when
  `ownerUserId` is given).

- [ ] **Step 1: Failing tests.** `returns meaning, gloss, definition, examples, variants, accepted variants and forms,
  inflections and the function-word flag of catalog senses`; `a variant with accepted_as_answer false is in variants but not in
  accepted`; `the viewer's own private sense is returned with scope private, examples [] and context_label null even when its
  stored label is p2`; `another learner's private sense and a retired sense are absent from both reads`; `function_word follows
  the override (override false wins over a derived true)`; `practiceCandidates returns the same CandidateSense fields as
  practiceSenses for 2,000 ids in one call`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/content` → PASS.
- [ ] **Step 5: Commit** `feat(content): read sense details for practice`.

### Task 7: Example masking (track C)

**Files:**
- Create: `src/content/practice/mask-example.ts`, `src/content/practice/mask-example.spec.ts`
- Modify: `src/content/index.ts`

**Interfaces:**
- Produces: `maskExample(sentence: string, target: { lemma: string; variants: string[]; inflections: Array<{ form: string }> }):
  { masked: string; blank: string; base: boolean } | null` (design 7.4b step 1–2, R7) — tokens are runs of letters and `'`
  (curly apostrophes count as `'`); spaces, punctuation and hyphens split tokens; a multi-word lemma matches its words in order
  and adjacent; a token matches a target form when equal **case-sensitively**, or equal after upper-casing the form's first
  letter when the token starts the sentence (first token, or after `.`, `!`, `?`); every match is replaced by `___`; `null` when
  nothing matches **or** the matches are not all the same word (ignoring the sentence-initial capital); `blank` is the matched
  word with the form's own case (so `Deployed` at the start gives `deployed`); `base` is true when the blank is the lemma or a
  variant.

- [ ] **Step 1: Failing tests.** `masks deployed in "We deployed the app." → "We ___ the app.", blank deployed, base false`;
  `masks the sentence-initial "Deploy it." → "___ it.", blank deploy, base true`; `B4E35: "Deploy it, we deployed it." → null`;
  `B4E37: target march leaves "March" untouched and returns null when only "March" is present`; `matches a variant "analysed"
  with base true`; `multi-word "look after" in "She looks after it" with inflection "looks after"`; `no match → null`;
  `deploys inside "redeploys" is not a match`.
- [ ] **Step 2:** `pnpm test src/content/practice` → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(content): mask a word in an example sentence`.

### Task 8: Practice schema, module, constants and shapes (track D)

**Files:**
- Create: `prisma/models/practice.prisma` + migration `<ts>_practice`, `src/practice/practice.module.ts`,
  `src/practice/practice.constants.ts`, `src/practice/practice.types.ts`, `src/practice/practice-lock.ts`,
  `test/practice/schema.e2e-spec.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: the four tables of design §5.1 with exactly its columns, plus: `practice_session_items.result` admits `'void'`;
  `practice_questions.prompt_style`, `practice_questions.blank` (jsonb, null for meaning prompts);
  `practice_sessions.pending_notice` (text, null or `'word-not-found'`: set by the private-word port when it deletes an item
  that had no final result, read and cleared by the next `next`/`current`, Tasks 14 and 19). Constraints: CHECKs on every
  enum column; partial unique index `practice_sessions_open_key ON practice_sessions (user_id) WHERE status IN ('active',
  'waiting_continue')`; unique `(session_id, position)`; `practice_reports.item_id` unique, FK to items `ON DELETE SET NULL`;
  items FK to sessions `ON DELETE CASCADE` and to questions `ON DELETE RESTRICT`; indexes of design §5.1 plus
  `practice_session_items (asked_at)`, `practice_session_items (question_id)` (the FK and Task 19's "questions with no item")
  and `practice_sessions (status, last_activity_at)`.
  **Stored answer formats** (written by Task 15, read by Tasks 17 and 18): `answer_raw` = for multiple choice the chosen
  index as a decimal string `"0"`…`"3"`; for true/false `"true"` or `"false"`; for typing the last typed text as sent (before
  normalization); `answer_normalized` = `normalizeAnswer` of that text for typing, else the same as `answer_raw`;
  `answers_tried` = earlier typed texts, oldest first.
  `practice.constants.ts`: `ANSWER_MAX = 100`, `NOTE_MAX = 300`, `WEAK_WINDOW = 5`, `WEAK_MIN_WRONG = 2`, `MCQ_OPTIONS = 4`,
  `SENTENCE_SHARE = 0.5`, `PRIVATE_WORD_MASK = '[từ riêng của người học]'`, `PRIVATE_MEANING_MASK = '[nghĩa của từ riêng]'`.
  `practice.types.ts` (the JSON stored in `prompt`, `answer_key`, `hints`; read by tracks D and E):
  - `QuestionType = 'mcq_definition' | 'true_false_definition' | 'type_word'`; `PromptStyle = 'meaning' | 'sentence'`.
  - `Prompt = { kind: 'mcq'; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null; options: string[] }
    | { kind: 'true_false'; lemma: string; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null }
    | { kind: 'type_meaning'; meaning: string; meaning_language: 'vi' | 'en'; context_label: string | null }
    | { kind: 'type_sentence'; sentence: string }`.
  - `AnswerKey = { reveal: { lemma: string; meaning: string; definition_en: string | null }; asked_private: boolean } & ({ kind:
    'mcq'; correct_index: number; option_private: boolean[] } | { kind: 'true_false'; is_true: boolean; paired_private:
    boolean } | { kind: 'type_word'; main: string; accepted: string[] /* normalized, main included */ })`.
  - `Hints = { level1: { kind: 'definition' | 'example' | 'meaning'; text: string } | null; level2: { first_letter: string;
    length: number } | null }`.
  - `Blank = { text: string; base: boolean }` (the JSON of `practice_questions.blank`, from `maskExample`).
  `withPracticeLock(tx, userId)` = `pg_advisory_xact_lock(hashtextextended('practice.user:' || userId, 0))`.
  `PracticeModule` imports `IdentityModule`, `ContentModule`, `LearningModule`, `SettingsModule` and provides
  `IdempotencyInterceptor` (as `LearningModule` does); Task 14 adds `EntitlementsModule`. `AppModule` imports `PracticeModule`.

- [ ] **Step 1: Failing tests.** `a second open session for one user is refused by the partial index, a finished one is not`;
  `(session_id, position) is unique`; `deleting an item nulls its report's item_id`; `deleting a question that an item still
  points to is refused`; `an enum value outside the CHECK lists (result, status, pending_notice, prompt_style) is refused`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement**; migration by `prisma migrate diff … --script`, partial index and CHECKs appended by hand;
  `test/common/schema-drift.e2e-spec.ts` stays green.
- [ ] **Step 4:** `pnpm db:setup`; run `test/practice/schema.e2e-spec.ts` and `test/common` → PASS.
- [ ] **Step 5: Commit** `feat(practice): add the practice schema and module`.

### Task 9: Answer normalization and matching (pure, track D)

**Files:**
- Create: `src/practice/grading/normalize.ts`, `src/practice/grading/normalize.spec.ts`

**Interfaces:**
- Produces: `normalizeAnswer(text: string): string` (design 7.6: NFC, trim, collapse whitespace runs to one space, `’ ‘` → `'`
  and `“ ”` → `"`, lower case); `answerLength(text: string): number` (code points after NFC + trim); `matchesAnswer(typed:
  string, accepted: string[]): boolean` (`accepted` already normalized).

- [ ] **Step 1: Failing tests.** The table of design 7.6 row by row (`B4#5`: "  Analyse " correct; `analyze`, `ANALYZE` correct;
  `analyzed`, `analise` wrong); `I’m` matches `I'm`; `Review Focus 3`: NFD `café` equals NFC `café`; tabs and double spaces
  collapse; emoji counted as one code point; `answerLength` of 100 and 101 code points; only spaces → 0.
- [ ] **Step 2:** `pnpm test src/practice/grading` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(practice): normalize and match typed answers`.

### Task 10: Distractors, question types and hints (pure, track D)

**Files:**
- Create: `src/practice/questions/distractors.ts`, `src/practice/questions/question-types.ts`, `src/practice/questions/hints.ts`,
  and a `.spec.ts` beside each

**Interfaces:**
- Produces: `type QuestionWord = { sense_id: string; entry_id: string; scope: 'catalog' | 'private'; lemma: string; gloss_vi:
  string | null; definition_en: string | null; form_of_entry_id: string | null; function_word: boolean }`.
  `subsenses(text: string): string[]` (split on `,` `;`, drop `( … )` parts, NFC, lower case, trim, drop empties).
  `eligibleCandidates(asked: QuestionWord, candidates: QuestionWord[]): QuestionWord[]` — drops the asked sense, the same lemma
  (case-insensitive), form-of links either way, and a shared subsense: compared on `gloss_vi` when both have one, otherwise on
  `definition_en` of both when both have one, otherwise kept (R13); then one candidate per lower-cased lemma.
  `pickDistractors(eligible: QuestionWord[], count: number, avoid: string[], random: () => number): QuestionWord[] | null` —
  `count` distinct candidates preferring sense ids not in `avoid` (round ≥ 2), `null` when fewer than `count` exist.
  `availableTypes(asked: QuestionWord, eligibleCount: number, chosen: QuestionType[]): QuestionType[]` (typing always; multiple
  choice needs 3, true/false 1; a function word gets typing only). `chooseType(available: QuestionType[], previous:
  QuestionType | null, random: () => number): QuestionType` (prefers a type ≠ previous, design 7.2).
  `typingStyle(style: 'meaning' | 'sentence' | 'mixed', hasSentence: boolean, random: () => number): PromptStyle` (`sentence`
  → B when it has one, else A; `mixed` → B with `SENTENCE_SHARE` when it has one).
  `buildHints(input: { type: QuestionType; style: PromptStyle; meaning: { text: string; language: 'vi' | 'en' };
  definition_en: string | null; maskedFirstExample: string | null; main: string; maxDefinitionChars: number }): Hints` —
  design 7.7 and 7.4b step 4: meaning prompt → definition if present, ≤ `maxDefinitionChars` and `meaning.language !== 'en'`,
  else the masked first example, else none; sentence prompt → short definition, else the meaning; level 2 only for typing:
  first letter of `main` and its letter count (spaces not counted). `maskedFirstExample` is the first example (in stored
  order) that `maskExample` accepts, so level 1 uses the matching rule of 7.4b (case-sensitive, one word per sentence, R7)
  rather than the "case-insensitive" wording left in design 7.7; Task 20 notes this in the design as-built.

- [ ] **Step 1: Failing tests.** `B4#3 (filters): implement "triển khai, thực hiện" is dropped for deploy "triển khai (phần
  mềm)"; deployed (form of deploy) is dropped; a second sense of deploy is dropped; Deploy and deploy count as one lemma`;
  `R13: a private word with only an English meaning is compared on definition_en`; `B4#19: two eligible → no multiple choice,
  true/false and typing available`; `a function word → typing only`; `pickDistractors avoids the previous round's ids when
  enough exist`; `chooseType prefers a different type`; `typingStyle mixed gives about half sentences over 1,000 seeded draws
  (seeded random)`; `hints: definition over 200 chars → masked example; English meaning learner → masked example; private word
  → level 2 only; level 2 of deploy → { first_letter: 'd', length: 6 }`.
- [ ] **Step 2:** `pnpm test src/practice/questions` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(practice): choose distractors, question types and hints`.

### Task 11: Word order and rounds (pure, track D)

**Files:**
- Create: `src/practice/sessions/order.ts`, `src/practice/sessions/order.spec.ts`

**Interfaces:**
- Produces: `type SortKey = 'level_asc' | 'overdue_first' | 'new_first' | 'least_practiced' | 'most_wrong' | 'queue' |
  'priority_oldest' | 'random'`; `defaultSort(source: 'today' | 'all' | 'group' | 'weak' | 'priority'): SortKey` (design 7.1:
  weak → `level_asc`, priority → `priority_oldest`, today and group → `queue`, all → `least_practiced`).
  `type SortableWord = { sense_id: string; level: number; due_date: string; priority: boolean; section: 'priority' | 'due' |
  'new' | 'backlog' | 'early' /* same values as Learning's Section */; added_at:
  string; last_needs_review_at: string | null; last_practiced_at: string | null; recent_wrong: number /* PracticeStats.wrong,
  Task 14 */ }`; `most_wrong` = highest `recent_wrong` first.
  `sortWords(words: SortableWord[], key: SortKey, random: () => number): string[]` — ties broken at random; `queue` = priority
  (by `added_at`), due (oldest `due_date`, then lower level), new (by `added_at`), then early (by `due_date`), then backlog;
  `least_practiced` = never practised first, then oldest `last_practiced_at`; `priority_oldest` = oldest
  `last_needs_review_at`, nulls last. `nextRoundOrder(words: string[], lastOfPreviousRound: string | null, random: () =>
  number): string[]` (shuffled; first ≠ `lastOfPreviousRound` when there are ≥ 2 words).

- [ ] **Step 1: Failing tests.** One test per sort key with a fixed seed; `B4#1 (order): 30 words, level_asc → the 10 lowest
  levels first`; `B4#2 (order): for 2 words, 50 seeded rounds never start with the previous round's last word`;
  `defaultSort` table of design 7.1.
- [ ] **Step 2:** `pnpm test src/practice/sessions` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(practice): order words and rounds`.

### Task 12: The weak-word rule (pure, track D)

**Files:**
- Create: `src/practice/weak/weak-words.ts`, `src/practice/weak/weak-words.spec.ts`

**Interfaces:**
- Produces: `type Attempt = { result: 'correct' | 'wrong'; hint_level: number; reported: 'open' | 'fixed' | 'no_error' | null;
  answered_at: string }`; `countedAttempts(attempts: Attempt[]): Attempt[]` (drops correct with `hint_level > 0`, and reports
  `open`/`fixed`; keeps `no_error`); `weakness(attempts: Attempt[]): { weak: boolean; wrong: number; counted: number;
  last_wrong_at: string | null }` over the newest `WEAK_WINDOW` counted attempts, weak when `wrong ≥ WEAK_MIN_WRONG`.

- [ ] **Step 1: Failing tests.** The five rows of design §8's table; `B4#12: S, S → weak, "2 of 2"`; `B4#13: S, S then four
  correct → not weak`; `B4#14 (rule): a wrong attempt with an open report is not counted, with no_error it is, with fixed it is
  not`. This function is the reference for the SQL of Task 14's `PracticeStats`; Task 17 replays the same rows through HTTP.
- [ ] **Step 2:** `pnpm test src/practice/weak` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5: Commit** `feat(practice): decide weak words`; then push and open **PR D1** (Tasks 8–12).

---

# Milestone M2 — The practice flow (track D)

### Task 13: Question builder (needs PR A1, PR B1, PR C1)

**Files:**
- Create: `src/practice/questions/question-builder.service.ts`, `test/practice/question-builder.e2e-spec.ts`
- Modify: `src/practice/practice.module.ts`

**Interfaces:**
- Consumes: Task 1 `AppSettings['practice']`; Task 6 `practiceSenses`, `practiceCandidates`; Task 7 `maskExample` (target =
  `{ lemma, variants, inflections }` of the `PracticeSense`); Task 3 `practiceGroupMates` (batch); Tasks 9–10.
- Produces: `QuestionBuilder.availability(input: { userId: string; nativeLanguage: 'vi' | 'en'; senseIds: string[];
  chosenTypes: QuestionType[] }): Promise<Map<string, QuestionType[]>>` (the chosen types each word can take now, design 7.3;
  a word missing from the map is not visible) — one `practiceGroupMates` call and one `practiceCandidates` call per batch; for
  each word the candidate filter stops as soon as 3 eligible distinct lemmas are found (1 is enough when multiple choice is
  not chosen). `QuestionBuilder.build(input: { userId: string; nativeLanguage: 'vi' | 'en';
  senseId: string; chosenTypes: QuestionType[]; promptStyle: 'meaning' | 'sentence' | 'mixed'; previousType: QuestionType |
  null; avoidDistractors: string[]; settings: AppSettings['practice']; random: () => number }): Promise<{ type: QuestionType;
  promptStyle: PromptStyle; prompt: Prompt; answerKey: AnswerKey; hints: Hints; distractorSenseIds: string[] } | { skip:
  'not-visible' | 'no-type' }>` (design 7.3–7.7, D34: multiple choice and true/false always use the meaning prompt; typing
  follows `typingStyle`, with a random example that `maskExample` accepts, base blanks accepting lemma + `accepted`, inflected
  blanks only the blank; true/false picks the true pair with `true_false_true_percent`, else one eligible candidate's meaning;
  `asked_private`, `option_private`, `paired_private` from `scope`).

- [ ] **Step 1: Failing tests.** `B4#3: deploy in IT (10 words) → 4 options, exactly one deploy, three from groups holding deploy,
  none same lemma, form or subsense; the prompt has no part of speech`; `B4#18: a private word in a 10-word group gets multiple
  choice from that group`; `Review Focus 5: another learner's private word never becomes an option even when it shares a group
  name`; `B4#23: style sentence → multiple choice uses the meaning prompt, typing uses "___" with blank deployed; accepted =
  ["deployed"]`; `a base blank accepts the variants too`; `an example containing a non-accepted spelling is still masked (from
  variants) and that blank alone is accepted`; `true/false with percent 100 is always true, with 20 about one in five over 500
  seeded draws`; `a retired sense → skip not-visible`; `only multiple choice and 2 eligible → skip no-type`; `a private word's
  prompt has context_label null`; `availability for 50 words makes one group-mates call and one candidates call`; `answer_key
  and hints are never part of the returned prompt object`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat(practice): build questions`.

### Task 14: Sessions — start, current, next, continue, finish (needs PR A1)

**Files:**
- Create: `src/practice/sessions/sessions.service.ts`, `src/practice/sessions/sessions.controller.ts`,
  `src/practice/sessions/session-views.ts`, `src/practice/weak/practice-stats.ts`, `test/practice/sessions.e2e-spec.ts`,
  `test/practice/scale.e2e-spec.ts`, `test/support/practice-helpers.ts`
- Modify: `src/practice/practice.module.ts` (adds `EntitlementsModule`), `vitest.config.e2e.ts` (exclude
  `test/practice/scale.e2e-spec.ts`, next to Learning's), `vitest.config.e2e-scale.ts` (include it)

**Interfaces:**
- Consumes: Tasks 2, 3, 11, 12, 13; `SettingsService.get().practice`; `EntitlementsService.check`.
- Produces (design §6 rows 1–3, 7, 8; §7.1–7.2; §8; §11 idle rule):
  - `PracticeStats.statsFor(userId: string, senseIds?: string[]): Promise<Map<string, { wrong: number; counted: number;
    last_wrong_at: string | null; last_practiced_at: string | null }>>` — **one** SQL statement: items with a final result
    joined to their report's status, Task 12's `countedAttempts` rule in SQL, the newest `WEAK_WINDOW` counted attempts per
    sense by window function; `last_practiced_at` = newest `answered_at` of any final item. `weakSenses(userId)` = the senses
    with `wrong ≥ WEAK_MIN_WRONG`, then only those `practiceItems({ kind: 'senses' })` still returns (design §8). The same
    numbers feed the `most_wrong` and `least_practiced` sorts, the weak source here and Task 17's endpoint.
  - `POST /v1/practice/sessions` → 201 `{ session: SessionView; }`. Body `{ source: 'today' | 'all' | 'group' | 'weak' |
    'priority'; group_id?: uuid /* required iff source group */; group_filter?: 'all' | 'due' | 'priority' | '0'…'5' /* group
    only, default all */; sort?: SortKey /* default defaultSort(source) */; types: QuestionType[] /* 1–3, distinct */;
    prompt_style?: 'meaning' | 'sentence' | 'mixed' /* default mixed */; count?: int 1..max_questions_per_session /* default
    default_questions_per_session */ }`. One transaction under `withPracticeLock`: entitlement check (`{ allowed: false }` → 403
    `entitlement-required`); words of the source (Task 3; `weak` = `PracticeStats.weakSenses` then `practiceItems({ kind:
    'senses' })`); sort (Task 11; `last_practiced_at` and `recent_wrong` = `wrong` from `PracticeStats.statsFor`); walk the order
    in batches asking `QuestionBuilder.availability` and keep words with at least one chosen type, until `count`; none → 409
    `practice-no-words` with `source-empty` (source returned nothing),
    `group-empty` (group source, nothing visible in the group) or `no-word-fits-types`, and the open session stays open; else
    the open session becomes `abandoned` and the new one `active` with `target_count = count`, `sense_ids` = the kept words.
  - `SessionView = { id; source; group_id; group_filter; sort; types; prompt_style; target_count; status; round; asked: number
    /* items not void */; words: number }`; `ItemView = { item_id; round; position; type; prompt_style; prompt: Prompt;
    hints_available: { level1: boolean; level2: boolean }; hint_level; state: 'unanswered' | 'try_again'; tries; reportable:
    boolean }`.
  - `GET /v1/practice/sessions/current` → `{ session: SessionView; item: ItemView | null; notice?: 'word-not-found' }` or 404;
    it applies the same "pending item" and "pending notice" rules as `next` (so a reload after a voided item gets the notice
    and the next item at once).
  - `POST /v1/practice/sessions/:id/next` → `{ state: 'question'; session; item: ItemView; notice?: 'word-not-found' } | {
    state: 'waiting_continue'; session } | { state: 'finished'; session; notice?: 'group-not-found' }`. Under the session row
    lock (Global Constraints, lock order), in this order:
    1. `pending_notice` set → the reply carries it and the column is cleared (B4E8: the port of Task 19 deleted the item).
    2. An item without a final result is returned again (B4E1), unless its word now fails `practiceCheck`/visibility: then it
       becomes `void` (only while `result IS NULL`), the reply carries `notice: word-not-found`, and the rule goes on to build
       the next item (B4E6, B4E7, B4E32).
    3. Group source with the group gone → `finished` + `group-not-found`; a pending item becomes `void` (B4E8b).
    4. **End rule:** `answered` = items with a final result (`void` and the pending one excluded). `answered = target_count` →
       `finished`. A `void` item does not count and is made up by asking another word while words remain.
    5. **Round rule:** round 1 walks `sense_ids` once; a word that fails the check (7.2) or that `QuestionBuilder` skips is
       dropped for the session. Round 1 done and `answered < target_count` → `waiting_continue` the first time (also when the
       shortfall comes from voided or dropped words), and on `continued = true` rounds ≥ 2 by `nextRoundOrder` over the words
       still usable; no usable word left → `finished` (B4E31).
    6. Entitlement check, then `QuestionBuilder.build`; the new item copies `type_word_max_retries` into `max_retries`.
  - `POST /:id/continue` `{ continue: boolean }`: `waiting_continue` → `active` (true) or `finished` (false); `finished` or
    `abandoned` → 409 `session-closed`; `active` → 409 `session-not-waiting`. `POST /:id/finish`: `active` or
    `waiting_continue` → `finished` (a pending item stays without result and is not counted); already `finished` or
    `abandoned` → 409 `session-closed`.
  - **Idle rule (§11):** every session route and every item route first runs `closeIfIdle(sessionId)` in **its own
    transaction, committed** before the route's own work: an `active`/`waiting_continue` session with `last_activity_at` older
    than `idle_session_close_hours` becomes `abandoned` with `ended_at = now`; the route then answers 409 `session-closed`, and
    `current` 404. (The route's own work runs in a later transaction, so the 409 never rolls the close back; the idempotency
    interceptor's transaction holds only its key row.)
  - Test support (`test/support/practice-helpers.ts`): `startPractice(t, userId, body)`, `nextItem(t, userId, sessionId)`,
    `finalizeItem(prisma, itemId, result: 'correct' | 'wrong', opts?: { hintLevel?: number; at?: Date })` (writes a final result
    by SQL, so Task 14's tests can move on without Task 15's `answer` route), `seedPracticeLearner(prisma, …)` (learner, groups,
    items over `seedPracticeSense` senses). The entitlement fake is supplied with `createTestApp({ providers: [{ provide:
    EntitlementsService, useValue: fake }] })` (Task 4's option).

- [ ] **Step 1: Failing tests.** `B4#1: group of 30, 10 questions, level_asc → 10 distinct lowest-level words`; `B4#2: group of 2,
  10 questions → waiting_continue after 2 finalized items; continue true → items 3–10 alternate, no two in a row the same word,
  the next round changes type when it can; continue false → finished with 2`; `end rule: target 3 → finished right after the third
  final result; a void item is made up by another word`; `a group of exactly target_count words with one voided in round 1 →
  waiting_continue`; `B4#20 / B4E5: a new session abandons the open one; the old device's next → 409 session-closed`; `B4#21:
  current after a reload returns the open session and the pending item`; `B4#4: next's payload has neither answer_key nor hint
  text`; `B4E1: two concurrent next → one item at that position, both responses equal`; `B4E14: today after all of today's cards
  → 409 practice-no-words source-empty, the open session unchanged (B4E30)`; `B4E15 / B4E16: only multiple choice and every
  group under 4 words → no-word-fits-types; a word lacking distractors is skipped for the next`; `B4E18: lowering
  max_questions_per_session keeps an open session's target`; `B4E22: next while waiting_continue returns waiting_continue and
  creates nothing`; `B4E6: a sense retired after next: reload (current) → void + word-not-found + the next item in the same reply;
  the void item is not in asked`; `B4E7, B4E32: removed from learning, removed from the group → same`; `B4E8 (mechanism):
  pending_notice set by SQL → next carries word-not-found once and clears it` (the end-to-end B4E8 is Task 19, with the real
  port); `B4E8b: group deleted → finished + group-not-found`; `B4E31: every word gone → finished`; `B4E33: in an "all" session,
  deleting a group drops its only-there words (as B4E7) and keeps a word still in another group, whose next multiple choice takes
  candidates from the remaining groups`; `weak source: two weak words start a session ordered level_asc; a word with an open
  report on its second wrong attempt is not weak`; `most_wrong and least_practiced use PracticeStats`; `B4E29: two POST
  /sessions at once with different keys → two 201s, one active session left, no 500`; `idle: 25 h idle → next, finish, continue
  and an item route each 409 session-closed; a fresh query reads status abandoned; current 404; 23 h idle → works`; `continue on
  an active session → 409 session-not-waiting; finish twice → the second 409 session-closed`; `D25: with the providers fake,
  the check runs at start and before each question; allowed:false → 403 entitlement-required`; `Review Focus 2` in
  `scale.e2e-spec.ts` (isolated DB, run by `pnpm test:e2e:scale`, not `pnpm test:e2e`): 100 groups × 2,000 items seeded with
  `generate_series`, source all, types [mcq_definition] → warm up once, then three starts, prints the median, < 1 s.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/practice` and `pnpm test:e2e:scale` → PASS; confirm `pnpm test:e2e` no longer lists the scale file.
- [ ] **Step 5: Commit** `feat(practice): run practice sessions`.

### Task 15: Answers, retries, skip and hints

**Files:**
- Create: `src/practice/answers/answers.service.ts`, `src/practice/answers/answers.controller.ts`,
  `test/practice/answers.e2e-spec.ts`
- Modify: `src/practice/practice.module.ts`

**Interfaces:**
- Consumes: Tasks 9, 14; Task 3 `practiceCheck` (for `show_known`).
- Produces (design §6 rows 4, 5, 5b; §7.6; §7.8):
  - `POST /v1/practice/items/:id/answer` body `{ choice: 0..3 } | { is_true: boolean } | { text: string }` (the shape must fit
    the item's type, else 400; text empty or > `ANSWER_MAX` after NFC + trim → 400 and nothing stored, PRC12) → `{ result:
    'try_again'; tries } | AnswerResult` where `AnswerResult = { result: 'correct' | 'wrong'; skipped: boolean; tries: number;
    hint_level: number; correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null }; meaning:
    string; definition_en: string | null; show_known: boolean; highlight_needs_review: boolean }` from the stored question
    (B4E6: graded on the snapshot even when the sense is gone). `closeIfIdle` first (Task 14); then, under the session row lock
    and then the item row lock (lock order), refusals in the order of Global Constraints ("Which refusal wins": session
    `finished`/`abandoned` → 409 `session-closed`, also for the old device of B4E5; `void` → 409 `item-void`), and only while
    `result IS NULL`; typing wrong with retries left → append to `answers_tried`, `tries + 1`, `try_again`; a final result is
    written by `AnswersService.writeFinal(tx, item, final)` (one method, so a test can make it throw) with `result`,
    `answer_raw` and `answer_normalized` in Task 8's formats, `answered_at`, `local_date` (zone now). Every call updates the
    session's `last_activity_at`. Another key on a final item → 409 `already-answered` with `result` = that item's
    `AnswerResult`. `show_known` = correct ∧ `hint_level` 0 ∧ in learning ∧ `due_now`; `highlight_needs_review` = wrong;
    neither when the word is no longer in learning (7.8).
  - `POST /items/:id/skip` (typing in `try_again` only) → `AnswerResult` with `wrong`, `skipped: true`; same lock and refusal
    order.
  - `POST /items/:id/hint` `{ level: 1 | 2 }` → `{ level; hint: Hints['level1'] | Hints['level2'] }`; records `hint_level =
    max(hint_level, level)`; same lock and refusal order; after a final result → 409 `already-answered`; level not available →
    409 `hint-unavailable`.

- [ ] **Step 1: Failing tests.** `B4#5, B4#6: "  Analyse " → correct; analyzed with default settings → try_again without the
  answer, then skip → wrong, skipped, with lemma, meaning and definition`; `B4#7: "" and 101 code points → 400, no tries
  recorded`; `B4#8: max_retries 2 → try_again, try_again, then wrong with the answer and highlight_needs_review`; `B4#8b: wrong
  then right → correct, tries 2`; `B4E25: changing type_word_max_retries mid-item keeps the item's copy`; `B4E2: two concurrent
  answers with different keys → one stored, the other 409 already-answered with the stored result`; `B4E3: the same key and body
  → the same response, graded once`; `B4E4: the same key, another body → 400`; `B4E28: in try_again, two concurrent tries
  where one is the right word → processed in turn; when the right one is first the other gets 409 already-answered, when it is
  second the first gets try_again and the second correct`; `B4#25: a reload while in try_again → current shows state try_again
  and tries, no answer`; `session-closed: after the session was abandoned (B4E5), answer, hint and skip on its pending item →
  409 session-closed, nothing stored`; `item-void: answer, hint and skip on a voided item → 409 item-void`; `B4E12, B4E13: hint
  after the final result → 409 already-answered; level 2 on
  multiple choice → 409 hint-unavailable`; `B4E27: a hint between two tries, then correct → correct with hint_level 1 and
  show_known false`; `B4E26: skip after the final result, on multiple choice, or before the first try → 409`; `B4#9 (flag): correct
  without hint on a due word → show_known true`; `B4E17: an answer after a zone change gets the new zone's local_date`;
  `Review Focus 4: a sense retired between next and answer → still graded`; `B4E39: a 101-code-point answer leaves no log line
  containing it`; `B4E23: vi.spyOn(ctx.app.get(AnswersService), 'writeFinal') throws once → 500 for that call, nothing stored,
  not a wrong answer; the same key then grades once`; `ER4 / D25: with the entitlement fake (providers option) answering
  allowed:false after the question was built, the answer is still graded`; `answer_raw is "2" for the third option, "false"
  for true/false, and the typed text for typing`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/practice` → PASS.
- [ ] **Step 5: Commit** `feat(practice): grade answers with retries, skip and hints`.

### Task 16: "Cần ôn tập", "Đã biết" and the summary (needs PR B1)

**Files:**
- Create: `src/practice/reviews/practice-reviews.service.ts`, `src/practice/reviews/practice-reviews.controller.ts`,
  `test/practice/reviews.e2e-spec.ts`
- Modify: `src/practice/practice.module.ts`

**Interfaces:**
- Consumes: Task 4 `practiceReview`; Task 15 results.
- Produces (design §6 rows 6, 9, 10; §7.8; R10, R11):
  - `POST /v1/practice/items/:id/review` `{ action: 'needs_review' | 'known' }` → `{ action; item_id; level; due_date;
    priority }`. One transaction in lock order: session row, then the item row (updates `last_activity_at`), then Learning's
    item row inside `practiceReview`. Refusals in the order of Global Constraints: session `abandoned` → 409
    `session-closed`; `void` → 409 `item-void`; no final result → 409 `not-answered`; `review_action` set to the same action →
    the stored result; set to another → 409 `review-already-set`; `known` when `show_known` would be false now → 409
    `known-not-allowed`; then `practiceReview(tx, userId, [{ senseId, action, reviewId: item id }])` (`not-in-learning` → 409)
    and `review_action` set.
  - `GET /v1/practice/sessions/:id/summary` → `{ session: SessionView; asked; correct; wrong; words: Array<{ sense_id; lemma;
    meaning; item_id /* the word's last item that has a final result */; action: 'needs_review' | 'known' | null /* any item of
    the word */ }> }` — words with a wrong final result or a correct one with a hint, in first-asked order, lemma and meaning
    from the stored questions; session `abandoned` → 409 `session-closed`.
  - `POST /v1/practice/sessions/:id/review-all` → `{ added: number }`: "needs_review" for each listed word with `action` null,
    keyed by that `item_id`; one transaction: session row, then those Practice items in `id` order, then one
    `practiceReview(tx, userId, inputs)` call for all of them (Learning locks its items in `id` order); words not in learning are
    skipped; session `abandoned` → 409 `session-closed`.

- [ ] **Step 1: Failing tests.** `B4#9: known → level +1, due by the ladder, priority off, log origin practice, group_id null`;
  `B4#10: correct with a hint → known 409 known-not-allowed`; `B4E9: early word → 409 known-not-allowed, no log row`; `B4E10:
  needs_review twice, and again from the summary → one Learning write`; `B4E11: needs_review then known → 409
  review-already-set`; `B4E7 / B4E34: removed from learning → 409 not-in-learning; before the final result → 409 not-answered`;
  `B4#11: three listed words, one already pressed → review-all adds 2`; `B4E42: a word wrong in round 1 and right in round 2 → one
  write, keyed by its last item, and a second review-all adds 0`; `a word wrong in round 1 whose round-2 item was left in
  try_again when the session finished → the summary keys it by the round-1 item and review-all writes it`; `B4E43: review on a
  finished session works, on an abandoned one → 409 session-closed; summary and review-all of an abandoned session → 409
  session-closed`; `Review Focus 1: review-all racing a single review on the same word → one Learning log row`; `lock order:
  review racing DELETE /v1/my-words on the same private word, and review-all of three words racing DELETE /v1/groups/:id → both
  finish without a deadlock error (one waits for the other)`; `B4#27 /
  B4E45: five practice "known" after the group used its cap → levels up, the group's cap count unchanged`; `B4E41 / B4#24: 20
  questions in one minute (next + answer + review each, 60 writes) → no 429`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/practice` and `test/learning` → PASS.
- [ ] **Step 5: Commit** `feat(practice): send practice results to the schedule and summarize sessions`.

### Task 17: Weak words and history

**Files:**
- Create: `src/practice/history/history.service.ts`, `src/practice/history/history.controller.ts`,
  `test/practice/history.e2e-spec.ts`
- Modify: `src/practice/practice.module.ts`

**Interfaces:**
- Consumes: Task 14 `PracticeStats.weakSenses`, Task 3 `practiceItems({ kind: 'senses' })` (for `level`).
- Produces (design §8, §9): `GET /v1/practice/weak-words?page_size&page_token` → items `{ sense_id; lemma; wrong; counted; level; last_wrong_at }`, newest
  `last_wrong_at` first, lemma from the newest stored question. `GET /v1/practice/history?date=YYYY-MM-DD&sense_id&page_size&
  page_token` → items `{ item_id; session_id; sense_id; lemma; type; prompt_style; prompt; answer: string | null; correct:
  AnswerResult['correct']; result; skipped; tries; hint_level; review_action; answered_at; local_date }`, newest first, final
  results only, the caller's own.

- [ ] **Step 1: Failing tests.** `design §8 table over HTTP: the five rows (S,S · S,S,Đ,Đ,Đ · S,S,Đ,Đ,Đ,Đ · S,S,Đg×4 · S
  reported open then S) seeded with finalizeItem give the same weak / not weak as Task 12, plus a row whose report is fixed`
  (the SQL of `PracticeStats` and Task 12's function must agree); `B4#12, B4#13 over HTTP`; `B4#14: a reported wrong attempt is
  not counted while open, counted after no_error`; `weak words leave out words removed from learning or retired`; `the reason reads "wrong 3 of the last 5"
  as numbers wrong 3, counted 5`; `B4#15: history?date=2026-11-08 returns only that local date's items of the caller`; `history
  filters by sense_id and pages with page_token; void and unanswered items are absent`; `Review Focus 5: another learner's items
  never appear in weak words or history`; measurement: 6 months of 20 items a day for one learner → weak-words time printed
  (`ASSUMPTION` < 500 ms on the dev machine).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/practice` → PASS.
- [ ] **Step 5: Commit** `feat(practice): list weak words and history`; then push and open **PR D2** (Tasks 13–17).

---

# Milestone M3 — Reports and upkeep (track E, after PR D1 and PR A1)

### Task 18: Reports — learner and staff (D22, D36)

**Files:**
- Create: `src/practice/reports/reports.service.ts`, `src/practice/reports/reports.controller.ts`,
  `src/practice/reports/admin-reports.controller.ts`, `src/practice/reports/snapshot.ts` (+ `snapshot.spec.ts`),
  `test/practice/reports.e2e-spec.ts`
- Modify: `src/practice/practice.module.ts`

**Interfaces:**
- Consumes: Task 8 shapes; `SettingsService.get().practice.reportsPerHour`.
- Produces (design §10, R12, D36):
  - `buildSnapshot(question: { type; prompt: Prompt; answerKey: AnswerKey; hints: Hints }, item: { answer_raw: string | null;
    answers_tried: string[]; result: string | null; hint_level: number }): unknown` — the prompt, the correct answer, the
    accepted answers (typing), the hints shown up to `hint_level` (so `hint_wrong` and `graded_wrong` can be judged) and the
    learner's answers, with every private option replaced by `PRIVATE_WORD_MASK`, a private paired meaning by
    `PRIVATE_MEANING_MASK`, and the learner's multiple-choice answer masked when `option_private[Number(answer_raw)]` is true
    (Task 8 formats). Only catalog words are ever asked here (a private asked word cannot be reported), so hints and accepted
    answers hold no private text.
  - `POST /v1/practice/items/:id/report` `{ reason: 'meaning_wrong' | 'graded_wrong' | 'hint_wrong' | 'other'; note?: string
    (0–300) }` → 201 report view; own items only, before or after answering, any session status; `asked_private` → 409
    `report-not-available` (B4E47); existing → 409 `report-exists` with the old report (B4E20); more than `reports_per_hour` in
    the last 60 minutes → 429 `rate-limited` with `retry-after`, nothing stored (B4E40). The count and the insert run in one
    transaction under `withPracticeLock` (two reports at 19 never store 21); a unique violation on `item_id` (two reports of one
    item at once) becomes 409 `report-exists` with the stored report, never 500.
  - `GET /v1/admin/practice/reports?status=open|no_error|fixed&page_size&page_token` (`content.edit`) → items `{ id; sense_id;
    reason; note; status; question_snapshot; created_at; resolved_at; resolved_by }` — no user id, email or name;
    `POST /v1/admin/practice/reports/:id/resolve` `{ status: 'no_error' | 'fixed' }` (`content.edit`, `@Idempotent()`) →
    `resolved_by`, `resolved_at`; already resolved → 409 `report-not-open`.

- [ ] **Step 1: Failing tests.** `B4#14 (report flow): report a wrong attempt → staff lists it without the reporter; resolve
  no_error`; `B4#17: a staff member without content.edit → 403`; `B4E20: second report → 409 with the first`; `B4E21: the item
  cleaned up → the report stays with item_id null and its snapshot`; `B4#28 / B4E48: a catalog question with a private option the
  learner chose → no field of the staff response contains the private lemma`; `B4E49: a true/false paired with a private meaning →
  the meaning is masked`; `B4#29 / B4E47: a question whose word is private → 409 report-not-available, nothing stored`; `B4E40:
  the 21st report in an hour → 429 and 20 stored`; `two reports at once when 19 are stored → one 201, one 429`; `two reports of
  one item at once → one 201, one 409 report-exists`; `a hint_wrong report's snapshot carries the hints the learner saw`; `a
  note of 301 code points → 400`; `another learner's item → 404`; `resolve a resolved report → 409 report-not-open`;
  `test/content/admin-permissions.e2e-spec.ts` still passes with the two new admin routes. Seeded items use Task 8's
  `answer_raw` formats.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/practice` and `test/content/admin-permissions.e2e-spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(practice): report wrong content to staff`.

### Task 19: Cleanup, idle sessions and the private-word port provider (needs PR B1)

**Files:**
- Create: `src/practice/maintenance/practice-cleanup.service.ts`, `src/practice/maintenance/private-senses-cleanup.provider.ts`,
  `test/practice/cleanup.e2e-spec.ts`
- Modify: `src/practice/practice.module.ts`, `src/app.module.ts`, `test/identity/maintenance.e2e-spec.ts` (job list)

**Interfaces:**
- Consumes: Task 4 `PRIVATE_SENSES_CLEANUP`, `PrivateSensesCleanup`; `MaintenanceScheduler.register`.
- Produces (design §11): job `practice-cleanup` — `cutoff = now − history_months calendar months`: delete items with `asked_at
  < cutoff`, then questions with no item, then `finished`/`abandoned` sessions with `ended_at < cutoff`, then resolved reports
  with `resolved_at < cutoff`; open reports stay (`item_id` → null); sessions `active`/`waiting_continue` with
  `last_activity_at < now − idle_session_close_hours` → `abandoned`, `ended_at = now`. `PracticePortsModule` (`@Global()`)
  provides `PRIVATE_SENSES_CLEANUP`; `deleteForSenses(tx, userId, senseIds)`, inside the given `tx` and in lock order: locks
  that learner's open sessions holding an item of those senses (`FOR UPDATE`, id order), sets `pending_notice =
  'word-not-found'` on each session whose item of those senses had no final result, then deletes that learner's reports, items
  and questions of those senses (in that order); imported by `AppModule`.

- [ ] **Step 1: Failing tests.** `B4#16: FakeClock past 6 months → old items, questions and sessions gone, an open report kept with
  item_id null, a resolved old report gone`; `B4E19: lowering history_months to 3 deletes by the new cutoff on the next run`;
  `an active session idle 25 hours becomes abandoned; one idle 23 hours stays`; `B4#22: deleting a private word removes its
  questions, items and reports in the deleteMyWord transaction`; `B4E8 (port side): the open session whose pending item was
  that word gets pending_notice word-not-found and the item is gone; a session whose item of that word was already final gets no
  notice` (the reload side is Task 20's cross-track test, since `current` is track D's); `the scheduler lists practice-cleanup`
  (update the job-name list).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** per the interfaces.
- [ ] **Step 4:** Run `test/practice`, `test/learning/quick-add.e2e-spec.ts`, `test/identity/maintenance.e2e-spec.ts` → PASS.
- [ ] **Step 5: Commit** `feat(practice): clean up old practice data and idle sessions`; then push and open **PR E1**.

---

# Milestone M4 — Gate (coordinator, after every PR is merged)

### Task 20: Smoke script, maintenance CLI, system gate and docs

**Files:**
- Create: `scripts/smoke-buoc-4.mjs`, `src/cli/run-maintenance.ts` (+ `run-maintenance.spec.ts`),
  `test/practice/cross-track.e2e-spec.ts`
- Modify: `docs/deliveries/buoc-4.md` (add `# Bước 4 — as-built (<date>)` after the plan summary), `package.json`
  (`smoke:buoc-4`, `maintenance:run`), `.env.example` (only if a task added an env variable; none is planned),
  `docs/superpowers/specs/2026-10-18-buoc-4-practice-design.md` (§0 as-built note; §6 error table gains the four codes added by
  this plan; 7.7 notes that level-1 example hints use the 7.4b matching rule; any `ASSUMPTION` measured),
  `docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md` §9 (one line: the review cap may be empty, D35 of Bước 4)

**Interfaces:**
- Produces: `node dist/cli/run-maintenance.js` boots the app context once and calls `MaintenanceScheduler.runAll()`; its exit
  code is 0 even when a job fails (`runAll` only logs job errors, `maintenance.scheduler.ts:39-50`), so callers check the data.
  `cross-track.e2e-spec.ts` (needs D2 and E1 together): `B4#28 / B4E48 through the real path: a multiple-choice question whose
  options include the learner's private word, answered with that option over HTTP, reported, read by staff → no field contains
  the private lemma`; `B4E8 end to end: a private word's question is showing, the learner deletes the word (DELETE
  /v1/my-words/:id), then current → notice word-not-found and the next item in the same reply`.
  `pnpm smoke:buoc-4` against a running API (like `smoke:buoc-2`, design §14 item 2; safe to re-run, random emails and lemmas
  per run): registers an admin (`admin:grant`) and a learner, imports and publishes a small CSV with glosses, short
  definitions, examples and inflections, builds two groups (one with a private word), then runs each source × each type, a
  two-word session with "Ôn lại", hints, retries and skip, "Cần ôn tập", "Đã biết", "review-all", a report on a question
  with a private option resolved by the admin (the staff list must not contain the private lemma), weak words, history by
  date, and the cleanup: back-date rows with `docker compose -p english-learning exec -T postgres psql -U dev -d <smoke db>`
  (the `-p` keeps it on the running project whatever folder the script runs from), run `maintenance:run`, then **read back**
  with `psql` that the old items are gone
  and an open report remains with `item_id` null. Exit code 0 only when every step matched.

- [ ] **Step 1: Clean shell gate.** `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test; pnpm test:e2e;
  pnpm test:e2e:scale` → green; counts compared with the end of Bước 3 (from `docs/deliveries/buoc-3.md`).
- [ ] **Step 2: Smoke on a fresh database — without touching the owner's local data:** from the main checkout
  (`E:\Working\Working project\english-learning`) `docker compose up -d`; then `docker compose -p english-learning exec postgres
  createdb -U dev english_learning_smoke_b4` (drop it first with `dropdb` if a previous run left it); in `apps/api` set `DATABASE_URL` to that database for `pnpm db:setup`, `pnpm build`, `pnpm run:dev` and `pnpm
  smoke:buoc-4` → every step `ok`; output kept for the report. **Never** `docker compose down -v`: it deletes the
  `postgres_data` and `redis_data` volumes of earlier manual runs; if a full reset is ever wanted, ask the owner first.
- [ ] **Step 3: Docs.** As-built in `docs/deliveries/buoc-4.md`; design §0 note, §6 codes, 7.7 note and measured numbers
  (Review Focus 2, Task 17 timing); Bước 3 design §9 line. `CLAUDE.md` and `docs/HANDOFF_2026-10-05_BUOC_0.md` §2 go in the
  small docs PR of design §17, with the one-line pointer to `docs/deliveries/buoc-4.md`.
- [ ] **Step 4: Report** to the owner (design D28 "Xong khi"): CI green on every PR, the smoke output, the numbers, open risks
  (design §16), the PR list, the API contract the UI plan builds on.
- [ ] **Step 5: Commit** `docs: record the bước 4 as-built`.
