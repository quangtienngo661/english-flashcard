# Giao diện mới — API code facts for the plan (10/11/2026)

Read-only survey of branch `docs/giao-dien-moi-design` at `777f74cd` (= `origin/dev` + docs), for the API part (§10.1–§10.6) of
`docs/superpowers/specs/2026-11-09-giao-dien-moi-design.md`. Paths are under `apps/api/` unless noted; `src/` paths are relative to
`apps/api/src/`. Facts only, read with `grep`/`sed` this session. **Not run:** no test, smoke, build or query was executed; every
"would"/"must" about runtime behaviour is marked `ASSUMPTION`.

---

## 1. Learning module layout

`src/learning/learning.module.ts`:
- `imports: [IdentityModule, ContentModule, SettingsModule]` (`:30`; comment `:29`: the learner guard needs `IdentityService` in the module
  that hosts the controller).
- `controllers` (`:31-34`): `BacklogController, GroupsController, ItemsController, MyWordsDeleteController, QueueController,
  QuickAddController, ReviewsController, AdminRetentionController`.
- `providers` (`:35-39`): `BacklogService, GroupsService, ItemsService, QueueService, QuickAddService, ReviewsService,
  PracticeReadsService, PracticeReviewService, RecallAnswerService, LearningService, IdempotencyInterceptor, LearningEntryUsageProbe,
  LearningAccountEraser, RetentionService`.
- `exports: [LearningService]` (`:40`).

`src/learning/index.ts` (comment `:1`: "The only entry point other modules (Notifications, Practice) may import from Learning"):
`LearningModule` (`:2`), `LearningService` (`:3`), types `PracticeCheck, PracticeItem, PracticeScope` (`:4`),
`PracticeReviewInput, PracticeReviewOutcome` (`:5`), `PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup` (`:6`), type `LearnerDay` (`:7`),
type `Section` (`:8`).

Folder per feature: `src/learning/<feature>/` holds `<feature>.controller.ts`, `<feature>.service.ts`, optional `<feature>.queries.ts`
(raw `Prisma.sql` builders) and `<feature>.schemas.ts` (Zod), with `*.spec.ts` beside them. Features today: `activity/` (pure
`streak.ts`, `record-activity.ts`), `backlog/`, `groups/`, `items/`, `my-words/`, `practice/` (Learning's façade for Practice:
`practice-reads.*`, `practice-review.service.ts`, `recall-answer.service.ts`), `queue/`, `quick-add/`, `retention/`, `reviews/`,
`schedule/` (pure `schedule.ts`). Top level: `learning.service.ts` (façade), `learning.constants.ts`, `learning-lock.ts`,
`entry-usage.probe.ts`, `account-eraser.provider.ts`, `private-senses-cleanup.port.ts`.

## 2. The port pattern (`PRIVATE_SENSES_CLEANUP`)

Declared by Learning — `src/learning/private-senses-cleanup.port.ts`:
- token `export const PRIVATE_SENSES_CLEANUP = 'LEARNING_PRIVATE_SENSES_CLEANUP';` (`:3`, a string token, not a Symbol);
- `export interface PrivateSensesCleanup { deleteForSenses(tx: Prisma.TransactionClient, userId: string, senseIds: string[]): Promise<void>; }` (`:9-11`);
- re-exported from `src/learning/index.ts:6`.

Provided by Practice — `src/practice/maintenance/private-senses-cleanup.provider.ts`:
- imports the token from `'../../learning/index.js'` (`:3`);
- class `@Injectable() export class PracticePrivateSensesCleanup implements PrivateSensesCleanup` (`:12-13`), no constructor deps (it works on
  the `tx` it is given);
- module (`:57-63`):
  ```ts
  /** Global so Learning's `@Optional()` injection finds it without importing Practice (as BATCH_SCOPE). */
  @Global()
  @Module({
    providers: [PracticePrivateSensesCleanup, { provide: PRIVATE_SENSES_CLEANUP, useExisting: PracticePrivateSensesCleanup }],
    exports: [PRIVATE_SENSES_CLEANUP],
  })
  export class PracticePortsModule {}
  ```
- **It is not `PracticeModule`**: `PracticePortsModule` is a separate `@Global()` module registered in `AppModule.imports`
  (`src/app.module.ts:15,23`). `PracticeModule` (`src/practice/practice.module.ts:44-58`) has no `exports` at all.

Injected by Learning — `src/learning/quick-add/quick-add.service.ts:50`:
`@Optional() @Inject(PRIVATE_SENSES_CLEANUP) private readonly privateSensesCleanup?: PrivateSensesCleanup,` and called with optional
chaining `await this.privateSensesCleanup?.deleteForSenses(tx, userId, senseIds);` (`:93`). So a missing provider is silently skipped.

Same pattern elsewhere: `BATCH_SCOPE` (`src/content/batch-scope.port.ts:3`, `src/content/index.ts:16`), provided by `@Global` `BatchScopeModule`
(`src/content-pipeline/import/batch-scope.provider.ts:37-38`), injected `@Optional()` in `src/content/catalog/admin-catalog.queries.ts:197`
but **non-optional** in `src/content-pipeline/publish/publish-jobs.controller.ts:44`.

What the new provider can inject: `PRISMA_CLIENT` is global (`src/common/db/prisma.module.ts:19` `global: true`, `:34` export); `Clock`,
`AppLogger`, `RateLimiter` come from the `@Global()` `CommonModule` (`src/common/common.module.ts:12,33`). Every entry point (API, worker,
CLIs) boots `AppModule.forRoot` (`src/worker.ts:11`, `src/cli/admin-grant.ts:20`, `src/cli/accounts-deletions.ts:25`), so
`PracticePortsModule` is always present at runtime.

## 3. `GET /v1/groups` and `GET /v1/groups/:id/queue`

**`GET /v1/groups` is served by `QueueService.list`, not `GroupsService`**: `src/learning/groups/groups.controller.ts:19-22`
(`@Controller('groups')` `:11`, `@LearnerContent()` `:12`) → `this.queue.list(learner.userId)`.

`QueueService.list` (`src/learning/queue/queue.service.ts:48-61`): reads the learner's local `today` (`:118-122`, via
`identity.getProfile(userId).timezone` + `Clock`) and settings, runs ONE raw statement
`this.prisma.$queryRaw<GroupStatsRow[]>(groupStatsQuery([{ userId, today: day }], learning.backlogAfterDays))` (`:51`), maps each row
(`:52-56`), sorts priority-first, then most waiting, then name (`:57-59`), returns `{ items }`.

Response type `GroupSummary` (`queue.service.ts:16-21`):
```ts
export type GroupSummary = {
  id: string; name: string; version: number; total: number; today: { priority: number; due: number; new: number };
  cells: Array<{ level: number; total: number; due: number }>; backlog: number;
  available: { due: number; new: number };
};
```
Web mirror: `apps/web/src/features/learner/groups/groups-api.ts:12-21`.

- `today` = caps applied by the pure `today(row, caps)` (`queue.service.ts:28-35`): `priority` uncapped; `due` = `min(due_available,
  reviewsPerGroupPerDay - due_done)` or uncapped when the cap is `null`; `new` = `min(new_available, newPerGroupPerDay - new_done)`, never < 0.
- `cells`, `backlog`, `available` come straight from the row (`:54-55`).

SQL: **inline `Prisma.sql`, not TypedSQL** — `groupStatsQuery(entries, backlogDays)` in `src/learning/queue/queue.queries.ts:20-64`. CTEs:
`e` = `unnest(user_ids, todays)` (`:26-28`, built for several learners at once); `items` = visible items of every group
(`visibleSenseCondition`, `:29-35`); `per_group` (`:36-45`): `total`, `priority` (flag and not backlog), `due_available` (not priority,
level ≥ 1, due ≤ today, not backlog), `new_available` (not priority, level 0), `backlog`, `cell_total[0..5]`, `cell_due[0..5]`; `done` (`:46-53`):
today's `learning_log` rows `kind='review' AND group_id IS NOT NULL`, counted by `section` (`'due'` → `due_done`, `'new'` → `new_done`).
**Shared caller:** the same query runs for many learners in `QueueService.cardsLeftToday` (`:64-72`) → `LearningService.cardsLeftToday`
(`learning.service.ts:28-30`), used by the reminder job (Notifications).

The only TypedSQL files are `prisma/sql/recordOtpFailure.sql` and `prisma/sql/tryAdvisoryLock.sql`; no Learning query uses TypedSQL.

`GET /v1/groups/:id/queue` — `src/learning/queue/queue.controller.ts:14-21`, query `z.strictObject({ mode: z.enum(['due','all','new']).default('due') })`
(`:7`). `QueueService.queue` (`queue.service.ts:74-116`):
- `mode='due'` (default, `:89-99`): rows = `priority` section (no limit) ++ `due` section limited to reviews left (`null` = no limit)
  ++ `new` section limited to new left; the done counts come from `reviewsDoneQuery` (`queue.queries.ts:92-97`).
- `mode='new'` (`:83-88`, "Học" since round C): only the `new` section, limited to new left.
- `mode='all'` (`:81-82`): every visible item, `ORDER BY random()`.
- Ordering per section, `queueItemsQuery` (`queue.queries.ts:70-90`): priority `ORDER BY gi.added_at, i.id` (`:79-80`, flagged and not
  backlog); due `ORDER BY i.due_date, i.level, gi.added_at, i.id` (`:82-84`); new `ORDER BY gi.added_at, i.id LIMIT n` (`:86`).
- Cards whose sense has no `cardContent` (hidden between the two reads) are dropped (`queue.service.ts:105-108`).

There is **no function that returns "the first card"**: the first card of `mode=due` is the first row of the concatenation above.
Web callers: `ReviewSession` uses `?mode=new|all|due` (`apps/web/src/features/learner/review/ReviewSession.tsx:21`,
`use-review-queue.ts:29`); deck page `mode=all|due` (`groups-api.ts:144-149`); Practice summary links go to `mode=new`
(`PracticeSession.tsx:372`, `RecallSummary.tsx:61`).

**An existing one-statement, all-groups version of the same order:** `todayIdsQuery` in
`src/learning/practice/practice-reads.queries.ts:29-67` computes "today's flashcard list of every group of the learner" in ONE statement:
per group the caps left from today's log (`:33-46`), each item's part `priority`/`due`/`new` (`:47-53`), `ROW_NUMBER() OVER (PARTITION BY
group_id, part ORDER BY due_date, level, added_at, id)` and `... ORDER BY added_at, id` (`:58-62`), kept within the caps (`:64-66`). It returns
`SELECT DISTINCT id` (no order, no group id), and its priority part is not ordered by `added_at, id` like the queue's. It is used by
`practiceItemsQuery` kinds `today` and `learned` (`:83-92`).

Lemma: Learning has no lemma column. `ContentService.cardContent(viewerId, senseIds, nativeLanguage)` (`src/content/content.service.ts:228-231`)
returns `Map<senseId, WordSense>` with `lemma` (`src/content/words/words.service.ts:15-16`), **visible senses only**, and the full card
(meaning, examples, topics, IPA…). No lemma-only Content method exists (method list `content.service.ts:31-280`). Practice gets lemmas
from its own stored question (`answer_key->'reveal'->>'lemma'`, `src/practice/history/history.service.ts:122,135-141`).

Scale guard: `test/learning/scale.e2e-spec.ts:7-21` seeds 100 groups × 2,000 items and asserts `GET /v1/groups` < 500 ms (`pnpm test:scale`,
Testcontainers, hand-run, not in CI).

## 4. Writers of `learning_log` and `learning_activity_days`

Model `LearningLogEntry` (`prisma/models/learning.prisma:52-79`); indexes `@@index([userId, groupId, localDate])` (`:76`) and
`@@index([userId, itemId])` (`:77`); partial unique `(user_id, review_id) WHERE review_id IS NOT NULL` in the migration
(`prisma/migrations/20261017210000_learning/migration.sql:90`).

CHECK constraints (exact values):
- `kind IN ('item_added','item_removed','review','relearn')` (`20261017210000_learning/migration.sql:85`).
- `answer IN ('known','review')` (`:86`).
- **`rating IN ('Good','Again')`** (`:87`) — capitalised, not `known`/`again`.
- `section IN ('priority','due','new','backlog','early')` (`20261018100000_learning_backlog_section/migration.sql`).
- `origin IN ('practice','recall')` (`20261112140000_dot_c_recall_log_origin/migration.sql`; first `('practice')` in `20261018140000_learning_log_origin`).

Every writer (no other `learningLogEntry.create*` / `INSERT INTO learning_log` exists outside `src/generated`):

| # | File:line | Route / caller | `kind` | `answer` / `rating` | `level_before` → `level_after` | `origin` | `group_id` | `section` | `local_date` |
|---|---|---|---|---|---|---|---|---|---|
| W1 | `src/learning/reviews/reviews.service.ts:71-77` | `POST /v1/reviews` (flashcard "Học") | `'review'` | `input.answer` (`known`/`review`) / `result.rating` (`Good`/`Again`) | `item.level` → `result.next.level` | not set (`null`) | `input.groupId` (always) | `result.section` | learner today (`:57`) |
| W2 | `src/learning/practice/practice-review.service.ts:76-82` | `POST /v1/practice/items/:id/review`, `POST /v1/practice/sessions/:id/review-all` (via `LearningService.practiceReview`) | `'review'` | `action` / `result.rating` | `before.level` → `result.next.level` | `'practice'` | `null` | `result.section` | learner today (`:45`) |
| W3 | `src/learning/practice/recall-answer.service.ts:47-53` | final answer in a recall ("Ôn") session (`practice/answers/answers.service.ts:180-185`) | `'review'` | `correct ? 'known' : 'review'` / `result.rating` | `before.level` → `result.next.level` | `'recall'` | `input.groupId` (session's group) | `result.section` | learner today (`:38`) |
| W4 | `src/learning/items/items.service.ts:242-245` | add words to a group (`ensureItems`) | `'item_added'` | — / — | `null` → `item.level` (0) | — | `groupId` | — | today |
| W5 | `src/learning/items/items.service.ts:258-261` | remove an item (`deleteItem`) | `'item_removed'` | — / — | `item.level` → `null` | — | `groupId` (may be `null`) | — | today |
| W6 | `src/learning/groups/groups.service.ts:117-120` | `DELETE /v1/groups/:id` (items left in no group) | `'item_removed'` | — / — | `item.level` → `null` | — | the deleted group id | — | today |
| W7 | `src/learning/backlog/backlog.service.ts:89-92` | `POST /v1/items/relearn` | **`'relearn'`** | — / — | `item.level` → 0 | — | not set (`null`) | — | today |

Deleter: `src/learning/quick-add/quick-add.service.ts:95` — `DELETE /v1/my-words/:id` (`src/learning/my-words/my-words-delete.controller.ts:18-24`)
runs `tx.learningLogEntry.deleteMany({ where: { userId, senseId: { in: senseIds } } })`: **deleting a private word deletes its log rows.**
Also `src/learning/account-eraser.provider.ts:20` (account deletion).

Answers to the specific questions:
- **First study of a new word → `kind='review'`, `level_before = 0`?** Yes for W1 and W2: both write `levelBefore: before.level` and a
  level-0 item is always due (`schedule.ts:31-33`), so `known` → level 1 and `review` → level 1 + priority (`schedule.ts:39-44`,
  `applyLearn` `:56-61`). Both leave level 0. W3 (recall) **can** write `level_before = 0, level_after = 0` (`applyRecall` keeps a level-0
  word, `schedule.ts:69-86`), but a recall session only picks level ≥ 1 words (`sessions.service.ts:160` → scope `learned`,
  `practice-reads.queries.ts:87-92`), so only an item re-created at level 0 mid-session reaches it. After a W7 relearn the word is level 0
  again, so its next study is another `level_before = 0` row.
- **Flashcard flips of already-learned words write a row?** Yes. `reviews.service.ts:60-61`: "A flashcard 'known' on a word that is already
  learned changes nothing … the log row below is still written"; the item is updated only when `result.changed || answer === 'review'`
  (`:62-70`), the row always (`:71-77`). Rating is `'Good'` (`schedule.ts:57-58`). With `mode=new` such words are not in the queue; with
  `mode=all|due` they are.
- **Can `rating` be null on a `review` row?** No current writer does: W1/W2/W3 all set `rating: result.rating`, typed
  `'Good' | 'Again'` (`schedule.ts:11,49`; `:72` for recall). The column itself is nullable (`learning.prisma:60`) and the CHECK lets NULL
  through. Older rows were not audited (`ASSUMPTION`: irrelevant, migration `20261112110000_dot_c_studied_days` says "nobody real used the app yet").
- `learning_activity_days` writers: all through `recordActivityIn` (`src/learning/activity/record-activity.ts:13-27`; `studied` never turns
  back to false, `:9-11`): `{studied:true}` from W1 (`reviews.service.ts:79`), W2 (`practice-review.service.ts:90`, only if a log row was
  written) and **every final practice/recall answer, skip included** (`practice/answers/answers.service.ts:195` via
  `LearningService.recordActivity`, `learning.service.ts:75-78`) — so a practice-only day, and a recall answer whose word left learning
  (`not-in-learning`, no log row), still make a studied day. `{studied:false}` from W4 (`items.service.ts:247`), W5 (`:262`), W6
  (`groups.service.ts:122`), W7 (`backlog.service.ts:94`). Readers: `streak.ts:27`, `retention.service.ts:52,55,70`. Model
  `learning.prisma:83-91`; column `studied` added by `20261112110000_dot_c_studied_days` (sets all existing rows to `true`).

## 5. Streak

`src/learning/activity/streak.ts`:
- pure `streakDays(studiedDatesDesc: string[], today: string): number` (`:12-21`): consecutive days ending today, or ending yesterday when
  today is not studied; dates after `today` and repeats ignored.
- `streakAsOf(db, userId, today): Promise<{ days: number; studiedToday: boolean }>` (`:24-33`): reads `learning_activity_days` with
  `studied = true AND local_date <= today`, newest first, `take: READ_LIMIT` (4000, `:5`).
- Façade `LearningService.streakAsOf(userId, today, db?)` (`learning.service.ts:61-64`). `today` must be supplied by the caller (learner's
  local date); nothing in Learning exposes "today for this user" except private `today()` helpers (`queue.service.ts:118-122`).
- Pure tests `src/learning/activity/streak.spec.ts:8-46` (9 cases incl. future date, gap, 1000 days).

Responses that already carry a streak (only POSTs, only on the day's first study, else `null`):
- `POST /v1/reviews` → `ReviewResult.streak: { days: number } | null` (`reviews.service.ts:16-19,79-83`; replay → `null` `:108`).
- `POST /v1/practice/items/:id/answer` and `/skip` → `AnswerResult.streak: { days } | null` (`practice/answers/answers.service.ts:31-32,195-197,222`).
- No GET returns a streak; `studiedToday` is used only by the reminder mail (`src/notifications/scheduler/reminder-send.service.ts:58-59`).

Web: `apps/web/src/features/learner/review/use-review-queue.ts:60-63` (`saved.streak` → `showStreak(days)`),
`apps/web/src/features/learner/practice/session/use-practice-session.ts:59-60,280`, toast `apps/web/src/app-ui/StreakToast.tsx:18,37`.

## 6. Practice sessions and history

`PracticeSession` (`prisma/models/practice.prisma:3-37`): `id, userId, source, groupId?, groupFilter?, sort, types[], promptStyle, targetCount,
senseIds[], status, continued?, pendingNotice?, startedAt, lastActivityAt, endedAt?, clozeSource?, aiPlanned, aiSenseIds[],
pendingAiRequestId?, aiStopped?, aiNoticeShown, kind @default("practice")`. **No `finished`, `finished_at` or `local_date` column.**
Index `@@index([status, lastActivityAt])` (`:35`); partial unique `practice_sessions_open_key ON (user_id, kind) WHERE status IN
('active','waiting_continue')` (`migrations/20261112100000_dot_c_recall_sessions/migration.sql:8-9`). No `(user_id, …)` index on sessions.
CHECKs (`20261018150000_practice/migration.sql`): `status IN ('active','waiting_continue','finished','abandoned')` (`:124`),
`source IN ('today','all','group','weak','priority')` (`:119`); `kind IN ('practice','recall')` (`20261112100000…:3`).

`PracticeSessionItem` (`practice.prisma:71-115`): `id, sessionId, userId, questionId, senseId, round, position, askedAt, answeredAt?
(set with the final result only, :80-81), answerRaw?, answerNormalized?, answersTried[], tries, maxRetries?, skipped, result?, hintLevel,
localDate? (learner's date at the final result, :91-92), reviewAction?, alternative, alternativeSenseId?, alternativeReviewAction?,
sessionWordTries, recallOutcome?`. `result IN ('correct','wrong','void')` (`20261018150000_practice/migration.sql:128`; "void counts nowhere",
`practice.prisma:70`); `review_action IN ('needs_review','known')` (`:129`). Indexes (`practice.prisma:108-114`): unique `(sessionId, position)`,
`(userId, senseId, answeredAt)`, `(userId, alternativeSenseId)`, `(userId, localDate)`, `(askedAt)`, `(questionId)`.

`HistoryService.history` (`src/practice/history/history.service.ts:90-132`): binding `` `${date ?? ''}|${sense_id ?? ''}` `` (`:92`);
bad token → `invalidInput()` = 400 `validation-failed` **without `violations`** (`:30,94-99`); filter `userId, result IN ('correct','wrong'),
session.kind = 'practice'` (`:103`), `localDate = date` (`:104`), `sense_id` matches asked or alternative (`:107`), cursor
`(answeredAt, id) <` (`:108`); `orderBy [answeredAt desc, id desc]`, `take page_size + 1` (`:112-113`); token
`encodeBoundToken({ at, id }, binding)` (`:129-130`); lemma from `key.reveal.lemma` (`:122`). Controller `src/practice/history/history.controller.ts`:
`page` schema `{ page_size: z.coerce.number().int().min(1).max(100).default(20), page_token: z.string().optional() }` (`:6`); `date` regex +
round-trip refine (`:11-13`); routes `GET /v1/practice/weak-words` (`:22`), `GET /v1/practice/weak-words/groups` (`:27`),
`GET /v1/practice/history` (`:32`).

Page-token helpers — `src/common/pagination/page-token.util.ts`: `encodePageToken/decodePageToken` (`:5-19`, `{id}` only) and
`encodeBoundToken(payload, binding)` / `decodeBoundToken(token, binding)` (`:21-42`; canonical base64url only, binding must match, payload values
string or finite number, else `null`).

Session routes:
- `src/practice/sessions/sessions.controller.ts` (`@Controller('practice/sessions')` `:39`): `POST /` (`:44`), `GET current` (`:52`),
  `POST :id/next` (`:57`), `POST :id/prepare` (`:69`), `POST :id/continue` (`:76`), `POST :id/finish` (`:87`). No `GET :id`, so
  `GET sessions/last` does not collide.
- `src/practice/reviews/practice-reviews.controller.ts` (`@Controller('practice')` `:16`): `POST items/:id/review` (`:22`),
  **`GET sessions/:id/summary`** (`:33`), `POST sessions/:id/review-all` (`:38`).
- `src/practice/answers/answers.controller.ts` (`@Controller('practice/items')` `:20`): `POST :id/answer` (`:25`), `:id/skip` (`:38`), `:id/hint` (`:45`).

How a session ends (`src/practice/sessions/sessions.service.ts`): `finished` + `endedAt` on `POST :id/finish` (`:376-383`), on `continue:false`
(`:363-374`) and when the session runs out (`finishRow` `:736-738`); `abandoned` + `endedAt` when a new session of the same kind starts
(`:137`, `:173`), **lazily** when idle past `idleSessionCloseHours` (24) in `closeIfIdle` (`:389-399`, called at the start of routes) and by the
cleanup job (`src/practice/maintenance/practice-cleanup.service.ts:51-56`). The same job **deletes items older than `historyMonths`**
(default 6, `settings.definitions.ts:76`) and ended sessions older than that (`practice-cleanup.service.ts:34-47`).

Existing per-session totals: `PracticeReviewsService.summary` (`src/practice/reviews/practice-reviews.service.ts:73-95`) returns
`{ session, asked, correct, wrong, alternatives, words, recall }`.

## 7. `PracticeModule`

`src/practice/practice.module.ts:46`: `imports: [IdentityModule, ContentModule, LearningModule, SettingsModule, EntitlementsModule, AiModule]`
(LearningModule imported at `:7`). Controllers `:47-51`, providers `:52-57`, **no `exports`**. Confirmed: Practice imports Learning, so
Learning cannot import Practice.

## 8. Settings, prices, `@Public()`

- `src/settings/app-config.view.ts`: `AppConfigView.plans.pro.prices: { '1': number; '3': number; '12': number }` (`:13-16`), filled
  `prices: { '1': e.proPrice1mVnd, '3': e.proPrice3mVnd, '12': e.proPrice12mVnd }` (`:42`).
- `src/settings/settings.definitions.ts`: keys `proPrice1mVnd, proPrice3mVnd, proPrice12mVnd` (`:45-46`); **defaults `79000`, `199000`,
  `599000`** (`:86`, in `SETTINGS_DEFAULTS` `:71`); admin bounds `1000..10000000` each (`:140-142`); snake keys
  `pro_price_1m_vnd` / `_3m_` / `_12m_` (`:296-298`). `SETTINGS_DEFAULTS` is exported from `src/settings/index.ts:2`.
- `src/settings/me-app-config.controller.ts`: `@Controller('me/app-config')` (`:10`), `@Get()` → `appConfigView(await this.settings.get())`
  (`:14-17`); signed-in only, no `@LearnerContent()` (`:6-9`; pinned by `me-app-config.controller.spec.ts:19-23`).
  `SettingsModule` (`src/settings/settings.module.ts:9-15`): imports `IdentityModule`, controllers `AdminSettingsController, MeAppConfigController`.
- `@Public()` — `src/identity/sessions/public.decorator.ts:3-4` (`SetMetadata('identity.public', true)`). The global `AuthGuard`
  (`APP_GUARD`, `src/identity/identity.module.ts:47`) reads it with `getAllAndOverride` (`src/identity/sessions/auth.guard.ts:18-20`),
  still parses a Bearer token if present (`:22-24`), and returns `true` for public routes (`:26`).
- Public controller to copy: `src/legal/public-legal.controller.ts` — `@Controller('legal')` (`:7`), `@Get('current')` + `@Public()` (`:11-12`),
  imports `Public` from `'../identity/sessions/public.decorator.js'` (`:3`). Public GET with an IP limit: `@Get('complete') @Public()
  @RateLimit('auth.google.ip')` (`src/identity/google/google-auth.controller.ts:87-89`). No `public/` controller path exists today.

## 9. Identity helpers

- `@LearnerContent()` = `SetMetadata(IS_PUBLIC_KEY, false)` + `UseGuards(LearnerContentGuard)` (`src/content/learner/learner.decorator.ts:5-7`);
  `@CurrentLearner()` returns `request.learner` (`:9-11`). Both exported from `src/content/index.ts:26-27`.
- `type Learner = { userId: string; nativeLanguage: 'vi' | 'en' }` (`src/content/learner/learner-content.guard.ts:6`) — **no timezone**;
  the guard calls `identity.getProfile` and returns 403 `profile-incomplete` without a native language (`:19-22`). Services read the zone
  with a second `getProfile` (`queue.service.ts:118-122`, `reviews.service.ts:38`); `Profile.timezone: string` (`src/identity/profile/identity.service.ts:23,50`).
- Order: global `AuthGuard` (APP_GUARD) → 401 `invalid-token`, then the controller's `LearnerContentGuard` → 403.

## 10. Validation and errors

- `@Query({ schema })`, `@Param({ schema })`, `@Body({ schema })` are NestJS 12's own decorators (`@nestjs/common ^12.3.0`, `package.json:55`)
  with a global `new StandardSchemaValidationPipe()` (`src/app.setup.ts:1,56`); Zod `4.6.7` (`package.json:75`). Examples:
  `history.controller.ts:8-15,33`, `queue.controller.ts:7,17`, `backlog.controller.ts:10-12,25`.
- The pipe throws `BadRequestException(messages)` with one string per issue, `"<path>: <message>"`
  (`node_modules/@nestjs/common/pipes/standard-schema-validation.pipe.js:32-49`). The filter maps a 400 `HttpException` to
  `{ type: 'validation-failed', title: 'Validation failed', violations: string[] }` (`src/common/problem-details/problem-details.filter.ts:79-89`);
  line `:77` is the body-parser branch and has **no** `violations`. Problem body fields: `type, status, title, detail, instance, operation_id`
  (`:42-51`).
- `src/common/time/day-range.ts`: `REPORT_RANGE_MAX_DAYS = 366` (`:5`); `dayRange(query, zone, now, defaultDays)` (`:11-20`) throws
  400 with `violations: ['from: Must not be after to' | 'to: The range must be at most 366 days']`; `daysOf(range)` (`:23-25`).
  `src/common/time/local-date.ts`: `localDate(zone, at)` (`:32`), `zonedMidnight` (`:49`), `dateValue` (`:69-71`), `dateString` (`:74-76`),
  `addDays` (`:78-80`), `daysBetween` (`:83-85`). No month helper exists.
- Pagination: no shared constant; every controller inlines `z.coerce.number().int().min(1).max(100).default(20)` (e.g.
  `history.controller.ts:6`, `backlog.controller.ts:11`, `entitlements/orders/orders.schemas.ts:15`).

## 11. Prisma and migrations

- Schema is split: `prisma/schema.prisma` (generator `prisma-client` → `src/generated/prisma`, `previewFeatures = ["typedSql"]`) + one
  file per module in `prisma/models/`; `prisma.config.ts`: `schema: 'prisma'`, `migrations.path: 'prisma/migrations'`, loads `.env` if present.
  Prisma `7.10.1` (`package.json:60,94`).
- Folder naming `YYYYMMDDHHMMSS_<slug>`. Three latest: `20261112130000_dot_c_speech_audio`, `20261112140000_dot_c_recall_log_origin`,
  `20261112150000_cloze_source_own_then_ai` (59 entries incl. `migration_lock.toml`). **The timestamps run ahead of the calendar** (the last
  was made 09/11/2026 but is stamped 12/11); a new folder must sort after `20261112150000`.
- Adding a plain index = `@@index([...])` in the model **and** `CREATE INDEX "<prisma name>" ON ...` in the migration, with Prisma's
  generated name: `20261102100000_review_r1_user_id_indexes/migration.sql:1-2` ("Names are the ones Prisma generates, so the schema drift check
  stays empty"); example `20261111100000_practice_alternative_answers/migration.sql:12`. For `learning_log (user_id, local_date)` the name would
  be `learning_log_user_id_local_date_idx` (pattern of `learning_log_user_id_group_id_local_date_idx`, `20261017210000_learning/migration.sql:71`).
  Partial / hand-written indexes and CHECKs live only in SQL (`learning.prisma:51`).
- Commands (`package.json`): `db:setup` = `prisma migrate deploy && prisma generate --sql` (`:29`); TypedSQL folder `prisma/sql/`.
- CI (`.github/workflows/ci.yml`): `pnpm db:setup` (`:50-51`), drift check `pnpm exec prisma migrate diff --from-config-datasource
  --to-schema prisma --exit-code --script` (`:55-56`), typecheck `pnpm exec tsc --noEmit -p tsconfig.json` (`:62`).

## 12. Tests

- Runner: Vitest (`package.json:100`); `pnpm test` = `vitest run` (`:24`); config `vitest.config.ts` includes `**/*.spec.ts`, globals on.
  Specs sit beside the source (350 `*.spec.ts` under `src/`); `test/**/*.spec.ts` also run (e.g. `test/support/list-routes.spec.ts`);
  `*.e2e-spec.ts` only via `pnpm test:scale` (`:28`).
- Controller/schema spec: `src/learning/quick-add/quick-add.controller.spec.ts:1-35` parses the exported Zod schema directly
  (`quickAddBody.parse/safeParse`). Guard metadata check: `src/settings/me-app-config.controller.spec.ts:19-23` (`GUARDS_METADATA`).
- Service spec with Prisma faked by hand: `src/learning/reviews/reviews.service.spec.ts:14-42` (a `tx` object of `vi.fn` per delegate,
  `prisma = { $transaction: fn => fn(tx) }`, `FakeClock`, `identity.getProfile` and `settings.get` stubs, `SETTINGS_DEFAULTS`).
  Raw SQL faked by matching the SQL text: `src/learning/queue/queue-list.spec.ts:28-46` (`$queryRaw` stub reads `query.sql ?? query.strings`).
- Pure-function tests: `src/learning/activity/streak.spec.ts:8-46`, `src/learning/schedule/schedule.spec.ts`, `src/common/time/day-range.spec.ts`.
- `test/support/list-routes.spec.ts` pins only `/v1/admin/**` permission routes; no test pins public or learner routes.

## 13. Smoke scripts

- In `apps/api/scripts/`, one self-contained `.mjs` per round; registered in `package.json` as
  `"smoke:cloze-own-then-ai": "node scripts/smoke-cloze-own-then-ai.mjs"` (`:41`) and
  `"smoke:dot-cai-thien-c": "node scripts/smoke-dot-cai-thien-c.mjs"` (`:42`).
- **No shared helper module** except `scripts/smoke-turnstile.mjs` (`SMOKE_TURNSTILE_TOKEN`, `requireFakeTurnstile()` stops unless
  `TURNSTILE_MODE=fake`, `:1-30`). Each script copies its helpers; in `smoke-dot-cai-thien-c.mjs`: `step/ok/check` (`:46-58`), `api`, `want`,
  `wantProblem` (`:82-113`), `loginToken` (`:115-117`), `psql` via `docker exec <PG_CONTAINER> psql` (`:120-124`), `waitFor` (`:129-138`),
  Mailpit `mailsTo/newestCode` (`:140-157`), `registerVerified` (register → OTP from Mailpit → verify, resend once, `:158-171`),
  `registerLearner` (+ `PATCH /v1/me {native_language:'vi'}` + `GET /v1/me` id, `:172-177`), `today()` in the learner zone (`:181`),
  admin via `dist/cli/admin-grant.js` (`:237-243`). Timezone is set at register (`registerBody`, `TIMEZONE = 'Asia/Ho_Chi_Minh'`) or with
  `PATCH /v1/me { timezone }` (`smoke-buoc-0-3-fixes.mjs:254-257`).
- Pro grant: `POST /v1/admin/entitlements/grants { user_id, kind:'plan', plan:'pro', ends_at, reason }` with Idempotency-Key
  (`smoke-cloze-own-then-ai.mjs:316-319`).
- Env and refusal (`smoke-dot-cai-thien-c.mjs:22-41`): `SMOKE_BASE_URL` (default `http://localhost:3000`), `SMOKE_MAILPIT_URL` (`:8025`),
  `SMOKE_PG_CONTAINER` (`english-learning-postgres-1`), `SMOKE_IGNORE_ENV_FILE`; `DATABASE_URL` from env else `.env`, required (`:33-34`);
  required flags checked against env/.env (`:35-38`); **the database name must equal the script's own constant** (`DATABASE =
  'english_learning_smoke_c'`, `:39-40`), so it never runs on the dev DB.
- 5 registrations per IP per hour: scripts stay under it (round C registers 3, `:237-243`), insert extra accounts with psql
  (`smoke-buoc-0-3-fixes.mjs:8`, `smoke-buoc-5.mjs:10`), or clear the counters `psql('DELETE FROM rate_limit_counters')`
  (`smoke-buoc-8.mjs:124-125`, `smoke-buoc-b-payments.mjs:109`).
- Past days seeded with psql: `INSERT INTO learning_activity_days … plusDays(today(), -1)` (`smoke-dot-cai-thien-c.mjs:422`);
  `INSERT INTO learning_log …` (`smoke-buoc-8.mjs:608`).

## 14. Module boundary check

`grep` of `src/practice/**` (non-spec) for `learning_items | learning_log | learning_groups | group_items | learning_activity_days` and the
matching Prisma delegates: the only hit is a comment (`src/practice/reviews/review-id.ts:4`). Control: the same grep for Practice tables in
`src/learning/**` finds nothing, and the Practice grep does find Practice's own `practice_session_items` elsewhere. So **Practice reads no
Learning table today**; it goes through `LearningService`. Learning embeds Content's SQL through the exported `visibleSenseCondition`
(`src/content/learner/visible-senses.ts:3-15`, "Other modules (Learning) embed it in their own SQL"), which is the sanctioned exception.

---

## Surprises / things the design gets wrong

1. **`rating` values are `'Good'` / `'Again'`, not `known` / `again`** (CHECK `20261017210000_learning/migration.sql:87`; `schedule.ts:11,49`).
   `known` / `review` live in `answer` (`:86`). §10.2 "`result` là `rating` của lượt cuối (`known` / `again`)" and §10.5 "`rating` (`known` /
   `again`)" need a mapping (`Good`→`known`, `Again`→`again`) or should read `answer`.
2. **Deleting a private word deletes its `learning_log` rows** (`quick-add.service.ts:95`) and its practice items (`private-senses-cleanup.provider.ts:51`),
   while `learning_activity_days` stays. §10.1 ("xóa từ vẫn giữ log (D33)") and §10.3 row "Từ riêng đã bị xóa → dòng vẫn có" are wrong:
   D33 covers only item removal (W5/W6). Effects: past counts shrink after a deletion; a day can stay `studied=true` with zero counts (in
   `study_days`, absent from `days`). The "Từ đã xóa" / `lemma: null` case then comes only from a catalog sense that is no longer visible
   (unpublished / retired): catalog entries with log rows cannot be hard-deleted (`src/learning/entry-usage.probe.ts:19-25`).
3. **`kind` also has `'relearn'`** (W7, `backlog.service.ts:89-92`; CHECK `:85`). §10.1 lists only three kinds. A relearned word goes back to
   level 0, so its next study is counted as `learned` again.
4. **`learned` (`level_before = 0`) also counts practice buttons**: "Cần ôn tập" / "Đã biết" and "Cần ôn tập tất cả" on a level-0 word in a
   practice session move it to level 1 with `origin='practice'` (W2). A recall row with `level_before = 0` keeps level 0 (edge only).
   `level_before = 0 AND level_after >= 1` is the exact "left the Mới box" test.
5. **Practice items older than `historyMonths` (6) are deleted** by the cleanup job (`practice-cleanup.service.ts:38`), `learning_log` never is:
   old months will show learned/reviewed with `practice_sessions = 0`. Not in §10.3.
6. **`practice_sessions` has no `finished` / `finished_at` / `local_date`**; `status` has 4 values and idle sessions become `abandoned` lazily
   (§6). `sessions/last.finished` must be defined (`status = 'finished'` vs "not open"), and `local_date` / `last_answer_at` come from the last
   answered item. `GET /v1/practice/sessions/:id/summary` already computes `correct` / `wrong` / `words` (`practice-reviews.service.ts:73-95`).
   No `(user_id, answered_at)` index; `(user_id, local_date)` exists.
7. **The port in §10.2 is too small for §10.5**: `countByLocalDate` returns `{ date, sessions, questions }[]`, but the day box also needs
   `correct` and per-session `first_position` / `last_position` / `questions` / `correct` "qua port ở §10.2" — a second port method is needed.
   The existing pattern injects `@Optional()` with `?.` (silent skip); a read endpoint copying it would return zeros if the provider were
   missing. The provider must live in the `@Global` `PracticePortsModule` (or a sibling), not in `PracticeModule` (no exports).
8. **`GET /v1/groups` is `QueueService.list` over `groupStatsQuery`**, a statement shared with the reminder job's multi-learner
   `cardsLeftToday`; "first card" exists only as the concatenated queue (no reusable function). The all-groups one-statement ranking already
   exists in `todayIdsQuery` (`practice-reads.queries.ts:29-67`) but returns unordered ids and orders priority differently. Lemmas need
   `ContentService.cardContent` (visible-only, full card) — there is no lemma-only Content API. The 100 × 2,000 scale test pins the endpoint at
   < 500 ms (`test/learning/scale.e2e-spec.ts:21`).
9. **"chưa có `@Get` nào dùng `@RateLimit`" (§10.3) is false**: `admin-entitlements.controller.ts:31-33` and `google-auth.controller.ts:87-89`
   (a public GET with `auth.google.ip`) — a precedent for `GET /v1/public/prices`.
10. **§10.3 cites `problem-details.filter.ts:77`** for `violations`; `:77` is the body-parser branch without `violations`; the Zod path is `:79-89`.
11. **Migration timestamps are ahead of the calendar**: the new index migration must be stamped after `20261112150000`, and the index must be in
    `learning.prisma` as `@@index([userId, localDate])` with the name `learning_log_user_id_local_date_idx`, or the CI drift check fails
    (`ASSUMPTION` for the failure itself; the rule is stated in `20261102100000_review_r1_user_id_indexes/migration.sql:1-2`).
12. `Learner` has no timezone (§9): every new Learning endpoint needs `IdentityService.getProfile` for "today" / the current month, as
    `QueueService.today` does.
