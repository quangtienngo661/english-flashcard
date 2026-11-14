# Bước 7 — code facts for the plan (apps/api @ origin/dev 985531b, 2026-10-21)

> Read-only survey for the implementation plan of `docs/superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`.
> Source: `origin/dev` @ **985531bd3245d96a050658b081785dcd584cf170** (merge of PR #101), fetched 2026-10-21; read from a `git archive`
> copy of that commit, nothing built or run. Paths are relative to `apps/api/` unless they start with `docs/`. `file:line` is at 985531b.
> Complements `BUOC_7_CODE_FACTS_2026-10-20.md` and `BUOC_7_CODE_FACTS_ADDENDUM_2026-10-21.md` (behaviour and flows are there); this file
> adds file lists, exported names, signatures and the exact places a plan task has to touch. Facts only.

## 0. Facts that change a plan

| # | Fact | Where |
|---|---|---|
| P1 | `smoke:buoc-6` assumes the `generate_cloze` prompt is at **revision 1** on a fresh DB (B6#1, B6#2) and that the first admin save makes it 2 (B6#14–B6#16, B6#25). A Bước 7 seed migration that moves `generate_cloze` to revision 2 breaks those steps. | `scripts/smoke-buoc-6.mjs:254, 260, 272, 386-392, 400-403, 414, 503` |
| P2 | `Hints.level2` is `{ first_letter, length }`, not `{ kind, text }`; there is no `level3`. Every reader knows only two levels: `itemView`, `AnswersService.hint` (`level: 1 \| 2`), `hintBody` (`1 \| 2`), `buildSnapshot.hints_shown`. `smoke:buoc-4` asserts the old level-2 shape. | `practice.types.ts:27-30`; `session-views.ts:36`; `answers.service.ts:102-111`; `answers.controller.ts:18`; `snapshot.ts:34-37`; `scripts/smoke-buoc-4.mjs:338-340` |
| P3 | "Bỏ qua" (skip) is refused unless `question.type === 'type_word'` → a typed `cloze` gets 409 `skip-not-allowed` until this check changes. | `answers.service.ts:92` |
| P4 | `updatePrivateWord` publishes a new revision **only** when a meaning or the topics change; a lemma, pos or level edit writes no revision. `publishRevision` hard-codes `draftSource: 'user'`. So after a lemma-only edit the live revision keeps its old `draft_source`. | `private/private-words.service.ts:108, 177-186, 196-202` |
| P5 | `PATCH /v1/my-words/:id` is keyed by the **entry** id; meanings are per sense in `senses[]`. Examples live per sense revision (`sense_revisions.examples`). | `private/my-words.controller.ts:38-51`; `private/my-words.schemas.ts:11-18` |
| P6 | `ContentService.listSentences` and `visibleSenseIds` take no `db`/`tx`: they always use the global client (inside a transaction that borrows a second connection, PX4). | `content.service.ts:165-167, 199-201`; `sentences/sentences.service.ts:59-68` |
| P7 | `PracticeModule` does not import `AiModule`; `ContentModule` imports neither `AiModule` nor `EntitlementsModule`. Adding them makes no cycle: `AiModule` imports Settings + Identity, `EntitlementsModule` imports Identity + Settings + Mail. | `practice.module.ts:25`; `content/content.module.ts:31`; `ai/ai.module.ts:33`; `entitlements/entitlements.module.ts:25` |
| P8 | Lookup is `WordsService.lookup`, served by Content's own `WordsController` (`GET /v1/lookup`). `WordsService` is not exported; `ContentModule` exports only `ContentService`, which has no lookup method. | `words/words.controller.ts:23-26`; `content.module.ts:39` |
| P9 | `LOOKUP_EXAMPLES_MAX` (2), `DEFAULT_MAX_OUTPUT_TOKENS`, `AI_SYSTEM_ACTOR_ID` and `FAKE_MODELS` are **not** exported from `ai/index.ts`. Content's own `MAX_EXAMPLES` is 3. | `ai/index.ts:1-10`; `ai/ai.constants.ts:20, 42, 75`; `content/content.constants.ts:22` |
| P10 | The fake adapter picks a scenario by **model id** only, never by data; `okValue` returns `{}` for an unknown schema name (→ shape failure); `describeModel` refuses any id not in `FAKE_MODELS`. A new scenario (bad form, `not_recognized`, distractor outside list) needs a new `fake:*` model id. | `ai/adapters/fake/fake.adapter.ts:5-8, 15-31, 50-77, 80-88` |
| P11 | `initial-prompts.spec.ts` reads the **one** folder ending `_ai_initial_prompts` and expects exactly 12 `$p$` (3 ops × 2 tables × 2 delimiters). | `ai/prompts/initial-prompts.spec.ts:8-11, 22-30` |
| P12 | The learner report route has no `@RateLimit` and no `@Idempotent`; the admin resolve route passes only `actor.userId` (`RequestUser` has no role). | `reports/reports.controller.ts:22-29`; `reports/admin-reports.controller.ts:30-40`; `common/request-user/request-user.ts:3-6` |
| P13 | Hourly cleanup deletes **every** `practice_questions` row with no items, and `HistoryService.lemmas` reads the newest `practice_questions` row per sense (asked or not). | `maintenance/practice-cleanup.service.ts:36`; `history/history.service.ts:92-99` |
| P14 | `PracticeItem.level` is the Learning box level (0–5), not CEFR. No Practice read returns `pos`, CEFR level or the live revision id. | `learning/practice/practice-reads.service.ts:15-22`; `content/practice/practice-senses.ts:12-23, 31-33` |
| P15 | Open PR #102 (`test/buoc-0-3-m5-smoke`) adds `smoke:buoc-0-3-fixes` to the same `package.json` scripts block; it touches no migration, `src/practice`, `src/content` or `src/ai` file. | `git diff --name-only origin/dev...origin/test/buoc-0-3-m5-smoke` |

## 1. Practice (`src/practice/**`)

### 1.1 Files

| Folder | Source | Spec |
|---|---|---|
| root | `practice.module.ts`, `practice.types.ts`, `practice.constants.ts`, `practice-lock.ts` | — |
| `answers/` | `answers.controller.ts`, `answers.service.ts` | `answers.service.spec.ts` (6 tests: writeFinal, PX4) |
| `grading/` | `normalize.ts` (`normalizeAnswer`:2, `answerLength`:14, `matchesAnswer`:19) | `normalize.spec.ts` (8) |
| `history/` | `history.controller.ts`, `history.service.ts` | — |
| `maintenance/` | `practice-cleanup.service.ts`, `private-senses-cleanup.provider.ts` | `practice-cleanup.spec.ts` (2 tests, `monthsBefore` only) |
| `questions/` | `question-builder.service.ts`, `question-types.ts`, `hints.ts`, `distractors.ts` | one spec each (`question-builder` 4 tests, PX4 only; `question-types` 8; `hints` 8; `distractors` 11) |
| `reports/` | `reports.controller.ts`, `admin-reports.controller.ts`, `reports.service.ts`, `snapshot.ts` | `snapshot.spec.ts` (6) |
| `reviews/` | `practice-reviews.controller.ts` (`POST items/:id/review`:18, `GET sessions/:id/summary`:29, `POST sessions/:id/review-all`:34), `practice-reviews.service.ts` | `practice-reviews.service.spec.ts` (1) |
| `sessions/` | `sessions.controller.ts`, `sessions.service.ts`, `session-views.ts`, `order.ts` (`SortKey`:4, `Source`:6, `SortableWord`:8, `defaultSort`:26, `sortWords`:66, `nextRoundOrder(words, lastOfPreviousRound, random)`:71) | `sessions.service.spec.ts` (13), `order.spec.ts` (12) |
| `testing/` | `seeded-random.ts` — `seededRandom(seed): () => number`:2 (the only shared test helper; used by distractors, question-types, order specs) | — |
| `weak/` | `practice-stats.ts`, `weak-words.ts` (reference for the SQL; imported only by its spec) | `weak-words.spec.ts` (8) |

No shared fixture or builder file: each spec builds its own mocks in a local `setup()` (e.g. `question-builder.service.spec.ts:12-27` has a `cat` `PracticeSense` literal and mocked `practiceSenses`/`practiceCandidates`/`practiceLemmaMeanings`/`practiceGroupMates`; `sessions.service.spec.ts:14-93` mocks prisma, entitlements `check`/`checkQuota`/`recordPracticeSession`, learning, builder `availability`/`build`, settings). They import `SETTINGS_DEFAULTS` from `settings/index.js`.

### 1.2 `practice.types.ts` (all types)

- `QuestionType = 'mcq_definition' | 'true_false_definition' | 'type_word'` :7; `PromptStyle = 'meaning' | 'sentence'` :8; `MeaningLanguage = 'vi' | 'en'` :9.
- `Prompt` :11-15 = `{kind:'mcq'; meaning; meaning_language; context_label: string|null; options: string[]}` | `{kind:'true_false'; lemma; meaning; meaning_language; context_label}` | `{kind:'type_meaning'; meaning; meaning_language; context_label}` | `{kind:'type_sentence'; sentence}`.
- `AnswerKey` :17-25 = `{reveal:{lemma; meaning; definition_en: string|null}; asked_private: boolean}` & (`{kind:'mcq'; correct_index: number; option_private: boolean[]}` | `{kind:'true_false'; is_true; paired_private}` | `{kind:'type_word'; main: string; accepted: string[]}` — `accepted` normalized, includes `main`).
- `Hints` :27-30 = `{level1: {kind:'definition'|'example'|'meaning'; text} | null; level2: {first_letter: string; length: number} | null}`.
- `Blank = {text: string; base: boolean}` :33 (column `practice_questions.blank`).

### 1.3 `practice.constants.ts`

`ANSWER_MAX = 100` :3, `NOTE_MAX = 300` :4, `WEAK_WINDOW = 5` :7, `WEAK_MIN_WRONG = 2` :8, `MCQ_OPTIONS = 4` :10, `SENTENCE_SHARE = 0.5` :12,
`PRIVATE_WORD_MASK = '[từ riêng của người học]'` :15, `PRIVATE_MEANING_MASK = '[nghĩa của từ riêng]'` :16.

### 1.4 `practice.module.ts`

- `imports: [IdentityModule, ContentModule, LearningModule, SettingsModule, EntitlementsModule]` :25 (no `AiModule`).
- `controllers: [SessionsController, AnswersController, PracticeReviewsController, HistoryController, ReportsController, AdminReportsController]` :26-28.
- `providers: [IdempotencyInterceptor, QuestionBuilder, PracticeStats, SessionsService, AnswersService, PracticeReviewsService, HistoryService, ReportsService, PracticeCleanupService]` :29-32. No `exports`.
- `PracticePortsModule` (the private-word delete port, §4.3) is **not** in this module: it is registered in `app.module.ts:14, 22`.

### 1.5 `practice-lock.ts`

`withPracticeLock(tx: Prisma.TransactionClient, userId: string): Promise<void>` :7-9 — `pg_advisory_xact_lock(hashtextextended('practice.user:' + userId, 0))`. Used by `SessionsService.start` (:96) and `ReportsService.create` (:54).

### 1.6 `questions/question-builder.service.ts`

- `BuiltQuestion` :15-20 = `{type: QuestionType; promptStyle: PromptStyle; prompt: Prompt; answerKey: AnswerKey; hints: Hints; blank: Blank | null; distractorSenseIds: string[]}`.
- `BuildInput` :21-27 = `{userId; nativeLanguage: 'vi'|'en'; senseId; chosenTypes: QuestionType[]; promptStyle: 'meaning'|'sentence'|'mixed'; previousType: QuestionType|null; avoidDistractors: string[]; settings: AppSettings['practice']; random: () => number; db?: Prisma.TransactionClient | PrismaClient}`.
- `class QuestionBuilder` :33; constructor `(ContentService, LearningService)` :34-37.
- `availability(input: {userId; nativeLanguage; senseIds: string[]; chosenTypes: QuestionType[]; db?}): Promise<Map<string, QuestionType[]>>` :43-63. `need` :48 = 3 when `mcq_definition` chosen, 1 when `true_false_definition`, else 0; with 0 it skips `practiceGroupMates` and `practiceLemmaMeanings` and passes `eligibleCount` 0. A sense missing from the map is not visible.
- `build(input: BuildInput): Promise<BuiltQuestion | { skip: 'not-visible' | 'no-type' }>` :65-133. Order: `practiceSenses` :67 → `practiceGroupMates` :69 → `practiceCandidates` :70 → `practiceLemmaMeanings([sense.lemma, ...pool lemmas])` :72 → `eligibleCandidates(sense, pool, Infinity, meanings)` :73 → `availableTypes` :74 → `chooseType` :76 → `maskExample` over `sense.examples` with `{lemma, variants, inflections}` :78-79 → branch: mcq :88-99, true/false :100-113, typing sentence :114-125 (accepted = all spellings only when the blank is the base form in an accepted spelling, :117-119), typing meaning :126-132.
- `normalizedSet(texts)` :136 (module-private; `[...new Set(texts.map(normalizeAnswer))]`).

### 1.7 `questions/question-types.ts`

- `availableTypes(asked: QuestionWord, eligibleCount: number, chosen: QuestionType[]): QuestionType[]` :9-15 (`type_word` always; function word → typing only; mcq needs `MCQ_OPTIONS - 1`, tf needs 1).
- `chooseType(available, previous: QuestionType | null, random): QuestionType` :18-22.
- `typingStyle(style: 'meaning'|'sentence'|'mixed', hasSentence: boolean, random): PromptStyle` :25-29.

### 1.8 `questions/hints.ts`

- `HintInput` :3-13 = `{type: QuestionType; style: PromptStyle; meaning: {text; language: 'vi'|'en'}; definition_en: string|null; maskedFirstExample: string|null; main: string; maxDefinitionChars: number}`.
- `buildHints(input: HintInput): Hints` :20-35 (level 2 only for `type_word`, :31-33).

### 1.9 `questions/distractors.ts`

- `QuestionWord` :4-13 = `{sense_id; entry_id; scope: 'catalog'|'private'; lemma; gloss_vi: string|null; definition_en: string|null; form_of_entry_id: string|null; function_word: boolean}`.
- `subsenses(text): string[]` :16-22 (exported); `shareSubsense` :24-27 and `sameMeaning` :35-41 are private.
- `LemmaMeanings = Map<string, Meaning[]>` :32 (a second copy of Content's type, §3.3).
- `eligibleCandidates<T extends QuestionWord>(asked: QuestionWord, candidates: T[], limit = Infinity, meanings: LemmaMeanings = new Map()): T[]` :48-68.
- `shuffle<T>(items: T[], random): T[]` :70-77; `pickDistractors<T extends QuestionWord>(eligible: T[], count: number, avoid: string[], random): T[] | null` :80-88.

### 1.10 `sessions/sessions.controller.ts`

- `uuid` :9; `QUESTION_TYPES = ['mcq_definition','true_false_definition','type_word'] as const` :10; `SORTS` :11.
- `startBody` :13-23 = strictObject `{source: enum(today|all|group|weak|priority); group_id?: uuid; group_filter?: enum(all|due|priority|0…5); sort?: enum(SORTS); types: array(enum(QUESTION_TYPES)).min(1).max(3)` + unique refine :18`; prompt_style?: enum(meaning|sentence|mixed); count?: int ≥ 1}` + refine (group ⇔ group_id; group_filter only with group).
- `sessionParams = {id: uuid}` :24; `continueBody = {continue: boolean}` :25.
- `@Controller('practice/sessions') @LearnerContent()` :27-28. Routes: `POST /` `start` :32-38 (`@Idempotent()`, `@UseInterceptors(IdempotencyInterceptor)`, `@RateLimit('user.write')`); `GET current` :40-43 (no rate limit); `POST :id/next` :45-50 (`@HttpCode(200)`, `@RateLimit('practice.answer')`, **no body**); `POST :id/continue` :52-61 and `POST :id/finish` :63-68 (`user.write`).

### 1.11 `sessions/sessions.service.ts` (signatures; flow is in the earlier facts)

- `transactionOptions = {timeout: 15_000, maxWait: 10_000}` :18; `AVAILABILITY_BATCH = 50` :19; `OPEN = ['active','waiting_continue']` :20.
- Exported: `GroupFilter` :22; `StartInput` :23-26; `NextResult` :28-31 = `{state:'question'; session; item: ItemView; notice?}` | `{state:'waiting_continue'; session; notice?}` | `{state:'finished'; session; notice?: Notice | 'group-not-found'}`. Private: `Notice = 'word-not-found'` :27, `Advance` :32-36 (adds `{state:'none'}`).
- Constructor :46-54: `PRISMA_CLIENT`, `Clock`, `SettingsService`, `EntitlementsService`, `LearningService`, `QuestionBuilder`, `PracticeStats`.
- Public: `start(learner: Learner, input: StartInput): Promise<{session: SessionView}>` :56-113 (transaction :95-112: lock, close open :98-100, `checkQuota` in tx :103, `practiceSession.create` :105-110); `current(learner)` :115-127 → `{session; item: ItemView|null; notice?}`; `next(learner, sessionId): Promise<NextResult>` :129-140 (whole `advance` in one transaction); `continue(userId, sessionId, go: boolean)` :142-153; `finish(userId, sessionId)` :155-162; `closeIfIdle(userId, sessionId: string|null)` :168-178; `lockOpen(tx, userId, sessionId): Promise<PracticeSession>` :181-185; `touch(tx, session)` :188-190; `lockSession(tx, userId, sessionId)` :192-197 (`SELECT … FOR UPDATE`); `view(tx, sessionId): Promise<SessionView>` :199-203.
- Private: `assertEntitled(userId, tx?)` :205-208 (`entitlements.check(userId, 'practice.basic', tx)`); `sourceItems` :210-218; `usable(tx, userId, session): Promise<Set<string>>` :221-227; `advance(tx, learner, session, build: boolean): Promise<Advance>` :234-319 (round-1 cursor :271-274; round ≥ 2 shuffle :275-284; `builder.build` :290-295; `practiceQuestion.create` with `schemaVersion: 1` :298-302; `practiceSessionItem.create` with `maxRetries: practice.typeWordMaxRetries` :303-309); `voidItem` :321-324; `finishRow` :326-328.

### 1.12 `sessions/session-views.ts`

- `SessionView` :4-11 = `{id; source; group_id; group_filter; sort; types: string[]; prompt_style; target_count; status; round; asked; words}`.
- `ItemView` :13-17 = `{item_id; round; position; type: QuestionType; prompt_style: PromptStyle; prompt: Prompt; hints_available: {level1: boolean; level2: boolean}; hint_level: number; state: 'unanswered'|'try_again'; tries: number; reportable: boolean}`.
- `ItemWithQuestion = PracticeSessionItem & {question: PracticeQuestion}` :19.
- `sessionView(row: PracticeSession, items: Pick<PracticeSessionItem,'round'|'result'>[]): SessionView` :21-28; `itemView(item: ItemWithQuestion): ItemView` :31-41 (`reportable = !answerKey.asked_private` :39).

### 1.13 `answers/answers.controller.ts`

`@Controller('practice/items') @LearnerContent()` :20-21. `itemParams` :11; `answerBody` :13-17 = union of strict `{choice: int 0..3}` | `{is_true: boolean}` | `{text}` (1..`ANSWER_MAX` code points after NFC + trim); `hintBody = {level: 1 | 2}` :18.
Routes: `POST :id/answer` :25-36 (`@HttpCode(200)`, `@Idempotent()`, interceptor, `practice.answer`); `POST :id/skip` :38-43 (`practice.answer`); `POST :id/hint` :45-54 (`practice.answer`).

### 1.14 `answers/answers.service.ts`

- `transactionOptions = {timeout: 10_000, maxWait: 5_000}` :15.
- `AnswerBody = {choice: number} | {is_true: boolean} | {text: string}` :17.
- `AnswerResult` :18-22 = `{result: 'correct'|'wrong'; skipped; tries; hint_level; correct: {lemma; text; choice_index: number|null; is_true: boolean|null}; meaning; definition_en: string|null; show_known: boolean; highlight_needs_review: boolean}` (no translation field).
- `FinalWrite` :23-25 = `{result; answerRaw; answerNormalized; answersTried: string[]; tries; skipped}`.
- `correctOf(key: AnswerKey, prompt: Prompt): AnswerResult['correct']` :28-35 (exported function; option text only when `key.kind === 'mcq' && prompt.kind === 'mcq'`, else `key.reveal.meaning`).
- Constructor :45-52: `PRISMA_CLIENT`, `Clock`, `IdentityService` (from `identity/profile/identity.service.js`), `LearningService`, `SessionsService`, `EntitlementsService`.
- `answer(userId, itemId, body: AnswerBody): Promise<AnswerResult | {result: 'try_again'; tries: number}>` :54-86 (grading branches on `key.kind` :61-79; typed retry while `maxRetries === null || tries < maxRetries` :71-76).
- `skip(userId, itemId): Promise<AnswerResult>` :89-100 (409 `skip-not-allowed` unless `type_word` and `tries > 0`, :92).
- `hint(userId, itemId, level: 1 | 2): Promise<{level: 1|2; hint: Hints['level1'] | Hints['level2']}>` :102-111 (null → 409 `hint-unavailable`; `hintLevel = max`).
- `writeFinal(tx, item: ItemWithQuestion, final: FinalWrite): Promise<ItemWithQuestion>` :114-127 (public; profile via `identity.getProfile(item.userId, tx)`, `localDate`, `entitlements.recordPracticeSession(tx, userId, sessionId, date)` :125).
- `resultOf(userId, item, db?): Promise<AnswerResult>` :133-145 (public).
- Private `locked<T>(userId, itemId, work)` :151-163 (idle close; `sessions.lockOpen`; item `FOR UPDATE`; void → 409 `item-void`); `assertUnanswered` :165-168 (409 `already-answered`, with `result` on answer).

### 1.15 `history/*`

- Controller `@Controller('practice') @LearnerContent()` :17-18: `GET weak-words` :22-25 (`page_size` 1..100 default 20, `page_token`); `GET history` :27-30 (+ `date` YYYY-MM-DD, `sense_id`).
- `HistoryService`: `WeakWord` :11; `HistoryItem` :12-16 = `{item_id; session_id; sense_id; lemma; type: string; prompt_style: string; prompt: Prompt; answer: string|null; correct: AnswerResult['correct']; result; skipped; tries; hint_level; review_action; answered_at; local_date}`; `weakWords(userId, page)` :30-50; `history(userId, query)` :52-89 — a row is built at :76-85 from `practiceSessionItem` + `question` (`lemma = answerKey.reveal.lemma`, `prompt` as stored, `answer = answerRaw`, `correct = correctOf(key, prompt)`); only `result IN ('correct','wrong')` :64. Private `lemmas(userId, senseIds)` :92-99 (newest `practice_questions` row per sense).

### 1.16 `reports/*`

- `reports.controller.ts`: `@Controller('practice/items') @LearnerContent()` :17-18; `reportBody` :9-14 = `{reason: enum(meaning_wrong|graded_wrong|hint_wrong|other); note?: ≤ NOTE_MAX, NFC + trim, '' → null}`; `POST :id/report` :22-29 (`@HttpCode(201)`, no `@Idempotent`, no `@RateLimit`) → `reports.create(userId, itemId, {reason, note})`.
- `admin-reports.controller.ts`: `@Controller('admin/practice/reports') @RequirePermission('content.edit')` :20-21; `listQuery` :12-16 (`status?: open|no_error|fixed`, page); `resolveBody = {status: no_error|fixed}` :17; `GET /` :25-28; `POST :id/resolve` :30-40 (`@HttpCode(200)`, `@Idempotent()`, interceptor, `user.write`, `@CurrentUser() actor: RequestUser` → `resolve(actor.userId, id, status)`).
- `reports.service.ts`: `ReportReason` :13, `ReportStatus = 'open'|'no_error'|'fixed'` :14, `ReportRow` :15, `transactionOptions {30_000, 5_000}` :17; `learnerView` :25-28 `{id, item_id, sense_id, reason, note, status, created_at}`; `staffView` :31-35 adds `question_snapshot, resolved_at, resolved_by`; `reportExists` :37-39. Constructor `(PRISMA_CLIENT, Clock, SettingsService)` :43-47.
  `create(userId, itemId, input: {reason: ReportReason; note: string|null})` :50-93 (practice lock :54; `asked_private` → 409 `report-not-available` :59-61; existing → 409 `report-exists`; `reportsPerHour` → 429 `rate-limited` + `retryAfterSeconds` :69-76; `buildSnapshot` :77-80; insert :81-84; P2002 → `report-exists` :86-92).
  `list(query: {status?; pageSize; pageToken?})` :95-120 (page token bound to `{route:'practice-reports', filters:{status}}` :96-97; order `createdAt desc, id asc`).
  `resolve(actorId, reportId, status: Exclude<ReportStatus,'open'>)` :123-132 (one `updateMany WHERE status='open'`, then read; 404 / 409 `report-not-open`).
- `snapshot.ts`: `SnapshotQuestion = {type: QuestionType; prompt: Prompt; answerKey: AnswerKey; hints: Hints}` :4; `SnapshotItem = {answer_raw; answers_tried; result; hint_level}` :5; `buildSnapshot(question: SnapshotQuestion, item: SnapshotItem)` :13-40, return type inferred `{type; prompt; correct: Record<string, unknown>; hints_shown: {level1; level2}; learner: {answer; answers_tried; result; hint_level}}`; masks options only for `prompt.kind === 'mcq' && key.kind === 'mcq'` :18-23.

### 1.17 `maintenance/*`

- `practice-cleanup.service.ts`: `monthsBefore(at: Date, months: number): Date` :10-16 (exported); `PracticeCleanupService implements OnModuleInit` :20, constructor `(PRISMA_CLIENT, MaintenanceScheduler, SettingsService)` :21-25; `onModuleInit` registers `'practice-cleanup'` :27-29; `runOnce(now: Date)` :31-55 in order: items `askedAt < cutoff` :35 → questions with `items: {none: {}}` :36 → sessions finished/abandoned `endedAt < cutoff` :37-39 → reports not open `resolvedAt < cutoff` :41-43 → abandon idle open sessions :44-50; returns `{items, questions, sessions, reports, abandoned}` counts.
- `private-senses-cleanup.provider.ts`: `PracticePrivateSensesCleanup implements PrivateSensesCleanup` :11; `deleteForSenses(tx, userId, senseIds: string[]): Promise<void>` :12-34, order: lock open sessions that hold those senses `ORDER BY id FOR UPDATE` :14-18 → lock the items :19-21 → `pendingNotice = 'word-not-found'` where an unanswered item has one of the senses :23-29 → delete reports :30 → items :31 → questions with those `sense_id` :33. `PracticePortsModule` (`@Global`, provides `PRIVATE_SENSES_CLEANUP` `useExisting`) :38-43.

### 1.18 `weak/*`

- `practice-stats.ts`: `SenseStats` :7; `PracticeStats.statsFor(userId, senseIds?)` :23-50; reports are excluded at :35 — an attempt counts only when `report IS NULL OR report = 'no_error'` (so `open`, `fixed` and any new status are already excluded); `weakSenses(userId)` :53-58.
- `weak-words.ts` (spec-only reference): `Attempt.reported: 'open'|'fixed'|'no_error'|null` :8; `countedAttempts` excludes `open` and `fixed` by name :13-15; `weakness` :18-24.

### 1.19 Every branch on a `kind` in Practice source

`answers.service.ts:29-33` (`correctOf`), `:61-79` (grading); `reports/snapshot.ts:18-29`. Nothing else switches on `prompt.kind` / `answerKey.kind` (`git grep "kind ==="` under `src/practice`, non-spec). `practice-reviews.service.ts:118-124` reads only `answerKey.reveal`.

## 2. Prisma

### 2.1 `prisma/models/practice.prisma` (full)

| Model → table | Columns (Prisma name → db) | Relations / indexes |
|---|---|---|
| `PracticeSession` → `practice_sessions` :3-27 | `id` uuid default gen_random_uuid; `userId`; `source`; `groupId?`; `groupFilter?`; `sort`; `types String[]`; `promptStyle`; `targetCount Int`; `senseIds String[] @db.Uuid` (round 1 order); `status`; `continued Boolean?`; `pendingNotice String?`; `startedAt`, `lastActivityAt`, `endedAt?` timestamptz | `items PracticeSessionItem[]`; `@@index([status, lastActivityAt])` |
| `PracticeQuestion` → `practice_questions` :30-48 | `id`; `userId`; `senseId`; `type`; `promptStyle`; `blank Json?`; `schemaVersion Int`; `prompt Json`; `answerKey Json`; `hints Json`; `distractorSenseIds String[] @db.Uuid`; `createdAt` | `items PracticeSessionItem[]`; no index besides PK |
| `PracticeSessionItem` → `practice_session_items` :51-85 | `id`; `sessionId`; `userId`; `questionId`; `senseId`; `round Int`; `position Int`; `askedAt`; `answeredAt?`; `answerRaw?`; `answerNormalized?`; `answersTried String[] @default([])`; `tries Int @default(0)`; `maxRetries Int?`; `skipped Boolean @default(false)`; `result String?`; `hintLevel Int @default(0)`; `localDate DateTime? @db.Date`; `reviewAction String?` | `session` FK Cascade; `question` FK **Restrict**; `report PracticeReport?`; `@@unique([sessionId, position])`; `@@index([userId, senseId, answeredAt])`, `([userId, localDate])`, `([askedAt])`, `([questionId])` |
| `PracticeReport` → `practice_reports` :87-105 | `id`; `userId`; `itemId String? @unique`; `senseId`; `questionSnapshot Json`; `reason String`; `note String?`; `status String @default("open")`; `resolvedBy String? @db.Uuid`; `resolvedAt?`; `createdAt` | `item` FK SetNull; `@@index([status, createdAt])` |

### 2.2 CHECKs and raw indexes of Practice (`prisma/migrations/20261018150000_practice/migration.sql`)

`practice_sessions_source_check` :119, `_group_filter_check` :120, `_sort_check` :121, **`practice_sessions_types_check`** :122 (`"types" <@ ARRAY['mcq_definition','true_false_definition','type_word']::TEXT[]`), `_prompt_style_check` :123, `_status_check` :124, `_pending_notice_check` :125 (`IN ('word-not-found')`);
**`practice_questions_type_check`** :126 (3 values), `practice_questions_prompt_style_check` :127 (`'meaning','sentence'`);
`practice_session_items_result_check` :128, `_review_action_check` :129;
**`practice_reports_reason_check`** :130 (4 values), **`practice_reports_status_check`** :131 (`'open','no_error','fixed'`);
partial unique `practice_sessions_open_key ON practice_sessions (user_id) WHERE status IN ('active','waiting_continue')` :133.
CHECKs and partial indexes live only in migrations (not in the `.prisma` files). Related: `usage_records_pool_check` (`practice_sessions`, `ai_practice`, `ai_lookup`) at `20261019094400_entitlements/migration.sql:222`.

### 2.3 Newest migrations (last 8 folders; naming `YYYYMMDDHHMMSS_name`)

`20261019094400_entitlements`, `20261019111147_fake_billing_transaction`, `20261019112136_fake_billing_history`, `20261020071131_ai`,
`20261020072259_ai_initial_prompts`, `20261021090000_lookup_indexes`, `20261021100000_account_fields`, `20261021110000_content_audit` (newest).
33 entries in the folder including `migration_lock.toml`. `prisma/schema.prisma` has the generator (`prisma-client`, output `../src/generated/prisma`, `typedSql`) and datasource only; models are in `prisma/models/*.prisma`; TypedSQL files in `prisma/sql/` (`recordOtpFailure.sql`, `tryAdvisoryLock.sql`).

## 3. Content (used by Practice and Learning)

### 3.1 `src/content/index.ts` (every export)

:1-5 `AGID_SOURCE_ID, FUNCTION_WORD_POS, INFLECTION_KINDS, LEMMA_MAX, LEVELS, MAX_EXAMPLES, MEANING_MAX, OWNER_SOURCE_ID, PRIVATE_POS_UNSET, SENTENCE_MAX, VALID_POS, isFunctionWordPos, type InflectionKind, type Level`;
:6 `type EntryByForm, InflectionInput, InflectionSource`; :7 `generateInflections`;
:8-10 `PrivateWordLimitError, type CreatePrivateSenseInput, CreatePrivateSenseResult, Meaning, PrivateWordPatch`;
:11 `NotVisibleError, SentenceLimitError, type Sentence`; :12 `type WordSense`; :13 `type CandidateSense, LemmaMeanings, PracticeSense`;
:14 `maskExample, type MaskedExample, MaskTarget`; :15 `ContentService`; :16 `BATCH_SCOPE, type BatchScope`;
:17 `entriesExportQuery, sensesExportQuery, type EntriesExportFilter, SenseFilter`; :18 `type EntryExportRow, ExportRow, ScopeRecord`;
:19 `normalizeText, normalizeLemma, splitHeadword`; :20 `type SourceView`;
:21 `ContentRuleError, contentHash, mergeContent, normalizeContent, type FormOf, RevisionContent`;
:22 `type PublishItem, PublishItemResult, PublishViolation, QuickPublishResult, SenseStateResult`;
:23 `CurrentLearner, LearnerContent`; :24 `type Learner`; :25 `visibleSenseCondition`.
Not exported: `senseMeaning`, `WordsService`, `inflectionFormKey`, `visibleEntryCondition`, `boundedText`, `privateWordProblems`.

Constants (`content.constants.ts`): `LEVELS` :1, `VALID_POS` :4-8 (15 values), `FUNCTION_WORD_POS` :10-13, `isFunctionWordPos` :15, `OWNER_SOURCE_ID` :19, `AGID_SOURCE_ID` :21, `MAX_EXAMPLES = 3` :22, `INFLECTION_KINDS` :24-26 (`third_person, present_participle, past, past_participle, plural, comparative, superlative`), `MEANING_MAX = 300` :30, `LEMMA_MAX = 100` :31, `SENTENCE_MAX = 300` :32, `PRIVATE_POS_UNSET = 'unspecified'` :34.

`content.module.ts`: `imports: [IdentityModule, SettingsModule]` :31; controllers :32-36 (incl. `MyWordsController`, `SentencesController`, `WordsController`); providers :37-38 (incl. `IdempotencyInterceptor`); `exports: [ContentService]` :39.
Admin controller prefixes in Content: `admin/content` (`catalog/admin-catalog.controller.ts`, `content.edit`), `admin/content/entries`, `admin/content/senses`, `admin/content/sources` (`content.import`), `admin/taxonomy/*`.

### 3.2 `ContentService` public methods (`content.service.ts`)

| Method | Line |
|---|---|
| `getSource(id): Promise<SourceView \| null>`; `isSourceComplete(source): boolean` | 38, 42 |
| `lockEntryKey(tx, lemma, pos)`; `ensureEntry(tx, input: EnsureEntryInput)` | 46, 50 |
| `listLevels(tx, entryId, sourceId)`; `addImportedLevel(tx, input)`; `addDerivedLevel(tx, entryId, baseEntryId)`; `setEditorialLevel(tx, entryId, level)` | 54, 58, 62, 66 |
| `setVariants(tx, entryId, variants)`; `setFunctionWordOverride(tx, entryId, value)`; `getTopics(tx, codes)` | 70, 74, 78 |
| `createSense(tx, input)`; `saveDraft(tx, input)`; `importContent(tx, input)`; `revertRecords(records, context)`; `markRevisions(tx, items, actorId)` | 82, 86, 90, 95, 99 |
| `publishItem(item, actorId, opts?)`; `unpublish(senseIds, actorId)`; `retire(senseIds, actorId)`; `quickPublish(input)` | 103, 107, 111, 115 |
| `latestRevisions(senseIds)`; `snapshotPublishable(filter)`; `listExportRows(filter, limit)`; `listEntriesWithoutSense(filter, limit)`; `resolveBatchRecordOwners(records, db?)` | 119, 123, 128, 132, 136 |
| `replaceInflections(tx, entryId, source: InflectionSource, forms: InflectionInput[]): Promise<void>` | 141 |
| `entriesByForm(formKey, viewerId): Promise<EntryByForm[]>` | 145 |
| `createPrivateSense(tx, input: CreatePrivateSenseInput): Promise<CreatePrivateSenseResult>` | 149 |
| `updatePrivateWord(tx, ownerId, entryId, patch: PrivateWordPatch): Promise<void>` | 153 |
| `deletePrivateEntryContent(tx, ownerId, entryId): Promise<{senseIds: string[]}>` | 157 |
| `addSentence(tx, {userId, senseId, text}): Promise<Sentence>`; `listSentences(userId, senseIds): Promise<Map<string, Sentence[]>>` (no db); `deleteSentence(userId, id): Promise<boolean>` | 161, 165, 169 |
| `cardContent(viewerId, senseIds, nativeLanguage): Promise<Map<string, WordSense>>` | 174 |
| `practiceSenses(viewerId, senseIds, nativeLanguage, db?): Promise<Map<string, PracticeSense>>` | 182 |
| `practiceCandidates(viewerId, senseIds, nativeLanguage, db?): Promise<Map<string, CandidateSense>>` | 188 |
| `practiceLemmaMeanings(viewerId, lemmas, _nativeLanguage, db?): Promise<LemmaMeanings>` (language ignored) | 194 |
| `visibleSenseIds(viewerId, senseIds): Promise<Set<string>>` (no db) | 199 |
| `bulkCandidates(filter: {level?; topic?; pos?}, limit): Promise<{senseIds; skippedFunctionWords}>` (published catalog, ordered by lemma, pos, id — not random) | 203 |

`Sentence = {id; text; createdAt: Date}` (`sentences/sentences.service.ts:12`).

### 3.3 `content/practice/practice-senses.ts`

- `LemmaMeanings = Map<string, Array<{gloss_vi; definition_en}>>` :9 (key: lower-cased lemma; no sense ids).
- `CandidateSense` :12-15 = `{sense_id; entry_id; scope; lemma; meaning: WordSense['meaning']; gloss_vi; definition_en; form_of_entry_id; function_word}`.
- `PracticeSense = CandidateSense & {context_label: string|null; examples: string[]; variants: string[]; accepted: string[]; inflections: Array<{form; kind: InflectionKind}>}` :20-23.
- SQL `columns` :31-33 = `s.id sense_id, e.id entry_id, e.scope, e.lemma, gloss.text gloss_vi, definition.text definition_en, r.form_of_entry_id, COALESCE(e.function_word_override, e.function_word_derived) function_word`. `from` :34-38 = `senses s JOIN entries e JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id LEFT JOIN sense_revision_texts gloss (vi, gloss) LEFT JOIN … definition (en, definition)`. `where` :39-40 uses `visibleSenseCondition`.
- `practiceCandidates(prisma, viewerId, senseIds, nativeLanguage)` :51-56; `practiceSenses(prisma, viewerId, senseIds, nativeLanguage)` :59-80 adds `s.context_label, r.examples, r.accepted_forms`, `variants` (jsonb of `entry_variants` text + `accepted_as_answer`) and `inflections` (jsonb of `entry_inflections` ordered by `INFLECTION_KINDS`, `position`, form) :62-69; private `context_label` → null :73; `accepted` = accepted variants ∪ `accepted_forms` minus the lemma :76-77.
- `practiceLemmaMeanings(prisma, viewerId, lemmas)` :86-97 (`lower(e.lemma) = ANY(keys)`, open + live, `visibleEntryCondition`).
- Not selected anywhere here: `e.pos`, a CEFR level, `s.live_revision_id`/`r.id`, `r.draft_source`.

### 3.4 `content/practice/mask-example.ts`

`MaskTarget = {lemma; variants: string[]; inflections: Array<{form}>}` :1; `MaskedExample = {masked; blank; base: boolean}` :2; `maskExample(sentence: string, target: MaskTarget): MaskedExample | null` :44.

### 3.5 `content/words/words.service.ts` and controller

- `WordSense` :13-18 = `{sense_id; entry_id; scope; lemma; pos; level: Level|null; context_label; meaning: {text; language: 'vi'|'en'; translation_missing: boolean}; definition_en; examples: string[]; topics: {code; name}[]; form_of: {entry_id; lemma; pos; kind} | null}` (no source/draft field).
- `displayedLevel` SQL fragment :36-44 (module-private; `editorial`/`user` basis newest first, then source priority).
- `senseMeaning(glossVi, definitionEn, nativeLanguage): WordSense['meaning']` :56-61 (exported from the file).
- `WordsService` :77, constructor `(PRISMA_CLIENT, InflectionsService)` :78-81; private `senses(viewerId, nativeLanguage, where, byEntry)` :84-112 (select list :91-94); `cardContent` :114-118; `wordPage(viewerId, lemma, nativeLanguage)` :120-141; `lookup(viewerId, q, nativeLanguage)` :144-155 → `{senses: WordSense[]; via_inflection: Array<{kind; base: {entry_id; lemma; pos}; senses: WordSense[]}>}`; `search` :158.
- `words.controller.ts`: `@Controller() @LearnerContent()` :8-9; `GET words` :13, `GET words/:lemma` :18, `GET lookup` :23-26 (no rate limit, no idempotency). `lookupQuery = {q}` with `q` NFC + trim + lower case, 1..`LEMMA_MAX` (`words.schemas.ts:6-7, 20`).

### 3.6 `content/private/private-words.service.ts`

- Types: `Meaning = {text; language: 'vi'|'en'}` :17; `CreatePrivateSenseInput` :18-21 = `{ownerId; lemma; pos: string|null; meaning: Meaning; level: Level|null; topicCodes: string[]; formOf: {entryId; kind}|null}`; `CreatePrivateSenseResult` :22-24 = `{entryId; senseId; createdEntry; catalogMatch: {entryId}|null}`; `PrivateWordPatch` :25-28 = `{lemma?; pos?: string|null; senses?: Array<{senseId; meaning: Meaning}>; level?: Level|null; topicCodes?: string[]}`.
- `meaningContent(meaning)` :55-58: `vi` → `glossVi`, `en` → `definitionEn` (one meaning per private sense). `readContent(revision)` :59-66.
- `publishRevision(tx, senseId, revisionNo, content: RevisionContent, ownerId)` :100-116 (private): supersedes the published revision :106, creates with **`draftSource: 'user'`** :108, `examples: content.examplesEn` :109, texts :102-105, sets `senses.live_revision_id` :113-115.
- `createPrivateSense(tx, input)` :124-172: settings via tx :126, owner lock :131, entry create + library inflections :142-149, sense create :156, `publishRevision(…, 1, {…meaning, examplesEn: [], topicCodes, acceptedForms: [], formOf})` :157-158, level :160-165, catalog match :167-171.
- `updatePrivateWord(tx, ownerId, entryId, patch)` :174-203: lemma/pos update without a revision :177-186 (library inflections regenerated when changed :183-185); per sense: skip when no meaning and no topics :196; same hash → skip :199; else new revision :200 (examples carried from the latest revision :197-198); level :202.
- `deletePrivateEntryContent(tx, ownerId, entryId)` :206-212 (deletes the entry; cascade). `visibleSenseIds` :215-221. `bulkCandidates` :224-252 (its displayed level uses basis `editorial` only, :241-246).
- `my-words.controller.ts`: `privateWordProblems<T>(action)` :19-28 (exported; `ContentRuleError` → 404/409/400); `@Controller('my-words') @LearnerContent()` :30-31; `PATCH :id` :38-51 (`@HttpCode(204)`, `@Idempotent()`, `user.write`, interceptor; `id` = entry id; meanings take `learner.nativeLanguage`).
- `my-words.schemas.ts`: `boundedText(max)` :6-7; `myWordParams = {id}` :10; `myWordPatch` :11-18 = strict `{lemma?; pos?: enum|null; senses?: [{sense_id; meaning}] 1..100; level?: enum|null; topics?: ≤ 20}` + non-empty refine; `MyWordPatch` :19.

### 3.7 `content/inflections/*`

`InflectionInput = {form; kind}` :8, `InflectionSource = 'library'|'reviewed'` :9, `EntryByForm = {entryId; lemma; pos; kind}` :10, `inflectionFormKey(form) = normalizeText(form).toLowerCase()` :12-14; `InflectionsService.replaceInflections(tx, entryId, source, forms)` :26-44 (reviewed replaces all and stamps `inflections_reviewed_at`; library is skipped once reviewed); `entriesByForm(form, viewerId)` :48-55 (catalog + viewer's private entries). `generateInflections(lemma, pos)` `inflect.ts:36`. `LevelsService.displayedLevel(tx, entryId): Promise<Level|null>` `catalog/levels.service.ts:45-56` (same order as words.service).

### 3.8 Content tables and kinds (`prisma/models/content.prisma`)

Models: `Topic` :1, `TopicName` :10, `DataSource` :21, `Entry` :38, `EntryVariant` :66, `EntryLevel` :79, `Sense` :95, `SenseRevision` :117-146 (`draftSource` → `draft_source` :122, `examples String[] @default([])` :131, `topicCodes`, `acceptedForms`, `formOfEntryId`, `formKind`, `reviewedBy/At`, `publishedBy` (added by `20261021110000_content_audit`); `@@unique([senseId, revisionNo])`), `SenseRevisionText` :149-158 (PK `(revisionId, language, kind)`), `EntryInflection` :161-176 (`form`, `formKey`, `kind`, `source`, `position`; `@@unique([entryId, form, kind])`, `@@index([formKey])`), `ContextSentence` :180.
CHECKs: `sense_revisions_draft_source_check` = `('csv','ui','user')` (`20261017180000_private_words/migration.sql:11-12`, replacing `('csv','ui')` of `20261012120000_content:172`); `sense_revision_texts_language_check` `('vi','en')` and `sense_revision_texts_kind_check` `('gloss','definition')` (`20261012120000_content/migration.sql:173-174`); `entry_inflections_kind_check` (`20261017170000_entry_inflections/migration.sql:31`).
`visibleSenseCondition(senseIdColumn: Prisma.Sql, viewer: string | Prisma.Sql)` and `visibleEntryCondition(entryAlias, viewer)` — `learner/visible-senses.ts:9-15, 21-24`.
`Learner = {userId; nativeLanguage: 'vi'|'en'}` (`learner/learner-content.guard.ts:6`); the guard returns 403 `profile-incomplete` when `native_language` is null (:19-21); `LearnerContent()` `learner.decorator.ts:5-7`, `CurrentLearner` :9-11.

## 4. Learning

### 4.1 `learning/quick-add/quick-add.controller.ts`

`bounded(max)` :14-15; `quickAddBody` :17-30 = strict `{group_id: uuid (required); sense_id?: uuid; new_word?: strict {lemma: 1..LEMMA_MAX; pos?: enum(VALID_POS)|null; meaning: 1..MEANING_MAX; level?: enum|null; topics?: ≤ 20; form_of?: {entry_id; kind}}; sentence?: 1..SENTENCE_MAX}` + refine exactly one of `sense_id` / `new_word`. `@Controller('quick-add') @LearnerContent()` :32-33; `POST /` :37-46 (`@HttpCode(201)`, `@Idempotent()`, interceptor, `user.write`) → `quickAdd(userId, nativeLanguage, {groupId, senseId, newWord, sentence})`.

### 4.2 `learning/quick-add/quick-add.service.ts`

- `NewWord` :17-20 = `{lemma; pos?: string|null; meaning; level?: Level|null; topics?: string[]; form_of?: {entry_id; kind}}`; `QuickAddInput = {groupId; senseId?; newWord?; sentence?}` :21; `QuickAddResult` :22-24 = `{item_id; sense_id; created_item; created_word; sentence_id: string|null}`.
- Constructor :43-51: `PRISMA_CLIENT`, `Clock`, `IdentityService`, `ContentService`, `GroupsService`, `ItemsService`, `@Optional() @Inject(PRIVATE_SENSES_CLEANUP) privateSensesCleanup?` :50.
- `quickAdd(userId, nativeLanguage: 'vi'|'en', input: QuickAddInput): Promise<QuickAddResult>` :54-83: catalog visibility pre-check :57-60; transaction :61-82 (`withLearnerLock` :63 → `groups.assertOwned` :64 → **`content.createPrivateSense(tx, {ownerId, lemma, pos ?? null, meaning: {text, language: nativeLanguage}, level ?? null, topicCodes ?? [], formOf})`** :68-72 → `items.linkInTx` :75 → `content.addSentence` :76-77), `transactionOptions {30_000, 5_000}` :14.
- `deleteMyWord(userId, entryId)` :86-95: learner lock :88 → `content.deletePrivateEntryContent` :89 → **`privateSensesCleanup?.deleteForSenses(tx, userId, senseIds)`** :91 → delete learning items :92 → learning log :93. Served by `my-words/my-words-delete.controller.ts:18-25` (`DELETE /v1/my-words/:id`, 204, idempotent, `user.write`).

### 4.3 Exports and the delete port

- `learning/index.ts` :1-8: `LearningModule`, `LearningService`, `type PracticeCheck, PracticeItem, PracticeScope`, `type PracticeReviewInput, PracticeReviewOutcome`, `PRIVATE_SENSES_CLEANUP, type PrivateSensesCleanup`, `type LearnerDay`, `type Section`.
- Port: `PRIVATE_SENSES_CLEANUP = 'LEARNING_PRIVATE_SENSES_CLEANUP'` and `interface PrivateSensesCleanup { deleteForSenses(tx, userId, senseIds): Promise<void> }` — `learning/private-senses-cleanup.port.ts:3, 9-11`. Practice provides it via the global `PracticePortsModule` (§1.17).
- `LearningService`: `practiceItems(userId, scope: PracticeScope, db?)` :30; `practiceGroupMates(userId, senseIds, db?): Promise<Map<string, string[]>>` :35; `practiceCheck(userId, senseId, groupId|null, db?): Promise<PracticeCheck>` :39-42; `practiceReview(tx, userId, inputs)` :45. `PracticeScope` and `PracticeCheck = {item; groupExists; inGroup}` at `practice/practice-reads.service.ts:23-26`.
- `learning.module.ts`: `imports: [IdentityModule, ContentModule, SettingsModule]` :25; `exports: [LearningService]` :34.

## 5. AI gateway (`src/ai/**`)

### 5.1 Public surface and types

- `ai/index.ts` :1-10 exports: `AiModule`, `AiService`, `OPERATION_ID_PATTERN`, `AI_OPERATIONS`, `AI_PROVIDERS`, `type AiMeta, AiOperation, AiProviderName, AiPurpose, AiReadiness, AiResult, CallOutcome, PermanentReason, TransientReason, UnavailableReason`, `type CallSummary, RunReport`.
- `ai.types.ts`: `AI_OPERATIONS = ['generate_cloze','lookup_word','translate_sentence'] as const` :3; `AiOperation` :4; `AI_PROVIDERS` :6; `AiPurpose = 'learner'|'test'|'eval'` :9; `TransientReason` :11 (`timeout, connection, rate-limited, provider-error, invalid-shape, truncated, busy`); `PermanentReason` :12 (`refused, bad-input, model-rejected, auth-failed, input-mismatch`); `UnavailableReason` :13 (`ai-disabled, model-not-set, provider-not-configured, provider-quota, daily-call-cap`); `CallOutcome` :16-18; `AiMeta` :20-28 = `{operation; provider; model; effort: string|null; prompt_revision: number|null; schema_version: 1; replayed: boolean}`; `AiResult` :30-35 (`succeeded {operation_id; result: Record<string, unknown>; meta}` | `in_progress` | `transient_failure {reason}` | `permanent_failure {reason}` | `unavailable {reason; retry_after_seconds?}`); `AiReadiness` :37.
- `ai.constants.ts`: `AI_SCHEMA_VERSION = 1` :5; `RESULT_TTL_MS = 86_400_000` :7; **`DEFAULT_MAX_OUTPUT_TOKENS = {generate_cloze: 1200, lookup_word: 1200, translate_sentence: 800} as const`** :20 (plain object, not `Record<AiOperation,…>`); `AI_SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000060'` :42; **`OPERATION_ID_PATTERN = /^[A-Za-z0-9._:#-]{1,100}$/`** :46; copies of Content constants `AI_VALID_POS` :57-61, `AI_LEVELS` :62, `AI_POS_UNSET` :63, `WORD_MAX` :64, `MEANING_MAX` :65, `LEMMA_MAX` :66, `SENTENCE_MAX` :67, `CONTEXT_LABEL_MAX = 2_000` :69 (compared by `ai.constants.spec.ts:12`); `TRANSLATION_MAX = 600` :72, `ACCEPTED_ANSWERS_MAX = 5` :73, `ACCEPTED_ANSWER_MAX = 100` :74, `LOOKUP_EXAMPLES_MAX = 2` :75.
- `ai.service.ts`: `isReady(op: AiOperation): Promise<AiReadiness>` :23-28 (purpose `learner`); `run(op, data: unknown, options: {operationId: string; userId: string; purpose: 'learner'; deadlineMs?: number}): Promise<AiResult>` :31-40 (throws `TypeError` when the id fails `OPERATION_ID_PATTERN` or the user id is not a lower-case uuid, :36-37); `deleteUserData(userId)` :43-49; `runAdminTest(op, data, actorId)` :52-54.
- `ai.module.ts`: `imports: [SettingsModule, IdentityModule]` :33; `exports: [AiService]` :45.
- `runner/readiness.service.ts`: `check(operation, purpose, now): Promise<ReadinessCheck>` :26-39; order for `learner`: `entitlements.aiEnabled` false → `ai-disabled` :29 → no selection → `model-not-set` :31 → adapter missing → `provider-not-configured` :32 → `ai.dailyProviderCallsCap === 0` → `daily-call-cap` (no retry) :34 → count ≥ cap → `daily-call-cap` + `retry_after_seconds` :35-37.

### 5.2 Operation definitions

- `operations/define-operation.ts`: **`OutputProblem = 'not-json'|'shape'|'blank-count'|'too-long'|'empty'|'answers-count'|'answer-underscore'|'pos'`** :5; `OutputCheck` :6; `OperationDefinition` :8-15 = `{name; inputFields: readonly string[]; validateInput(data); outputSchema: {name; schema}; checkOutput(value): OutputCheck; defaultMaxOutputTokens: number}`; `OperationSpec` :18-27 = `{name: AiOperation; input: z.ZodObject; output: Record<string, STRING | STRING_LIST>; outputSchema; normalizeAndCheck(raw: Record<string, string|string[]>): OutputCheck; defaultMaxOutputTokens}`; `rawShape` :30-41 (exact keys, string or string[]); `define(spec: OperationSpec): OperationDefinition` :43-57.
- `operations/generate-cloze.ts` :10-39: input strict `{word: 1..WORD_MAX; part_of_speech: enum([...AI_VALID_POS, 'unspecified']); level: enum(AI_LEVELS).nullable(); meaning_vi: 1..MEANING_MAX; context_label: 1..CONTEXT_LABEL_MAX nullable}` :12-18; output `{sentence: STRING; accepted_answers: STRING_LIST; translation_vi: STRING}` :19; schema name `generate_cloze_v1` :21; checks :24-37 in order: newline → `shape`; `_{3,}` → `___`; dedupe answers; ≠ one blank → `blank-count`; lengths → `too-long`; empty → `empty`; 1..5 answers → `answers-count`; `_` in an answer → `answer-underscore`.
- `operations/lookup-word.ts` :11-46: input `{text: 1..WORD_MAX; context_sentence: 1..SENTENCE_MAX nullable}`; output `{part_of_speech, lemma, meaning_vi, definition_en: STRING; examples: STRING_LIST}`; schema `lookup_word_v1` with `part_of_speech` enum :19-23; pos lower-cased :27; examples 1..`LOOKUP_EXAMPLES_MAX` (0 → `empty`, 3 → `too-long`); bad pos → `pos`.
- `operations/translate-sentence.ts` (`translate_sentence_v1`, output `{translation_vi}`).
- `operations/operations.ts`: `OPERATIONS: Record<AiOperation, OperationDefinition>` :9-13; `parseOutput(op, text): OutputCheck` :16-24.
- `operations/text-rules.ts`: `BLANK = '___'` :4, `codePoints` :7, `textIn(min, max)` :10-14, `toViolations` :17-21, `clean` :25, `dedupeAnswers` :28-36, `STRING` :39, `STRING_LIST` :40, `objectSchema(properties)` :41-43.

### 5.3 Prompts

- `prompts/initial-prompts.ts`: `INITIAL_PROMPTS: Record<AiOperation, {instructions: string; examples: PromptExample[]}>` :6; entries `generate_cloze` :7, `lookup_word` :40, `translate_sentence` :68. `PromptExample = {input: Record<string, unknown>; output: Record<string, unknown>}` (`prompt-rules.ts:6`).
- `prompt-rules.ts`: `PROMPT_GUARD` :9; `promptViolations(op, body: {instructions; examples: unknown[]}): string[]` :18-38 (each example's input through `validateInput`, output through `checkOutput`); `assembleInstructions` :40.
- `prompts/initial-prompts.spec.ts` asserts: every op's initial prompt has instructions + ≥ 1 example and passes `promptViolations` (:14-20); the single `_ai_initial_prompts` migration (found at :9) contains `$p$<instructions>$p$` and `'<JSON.stringify(examples)>'::jsonb` for each op of `AI_OPERATIONS`, and exactly 12 `$p$` (:22-30).
- `prompts/prompts.repository.ts`: `StoredPrompt = {instructions; examples; revision}` :7; `current(op): Promise<StoredPrompt>` :14-17 (`findUniqueOrThrow` — every op needs a seeded row); `atRevision(op, revision)` :19-22.
- `prompts/prompts.service.ts` `save(actorId, op, body)` :93-117: `aiPrompt.updateMany WHERE revision = expected_revision` (`revision +1`, `updatedBy: actorId`) and `aiPromptRevision.create` in one transaction; conflict → 409 `prompt-revision-conflict` :60.

### 5.4 Migrations that seed AI rows

- `20261020071131_ai/migration.sql`: `ai_prompts` :51-60 (`operation` PK, `instructions`, `examples jsonb`, `revision`, `updated_by uuid`, `updated_at`); `ai_prompt_revisions` :63-73 (`id`, `operation`, `revision`, `instructions`, `examples`, `saved_by`, `saved_at`) with unique `ai_prompt_revisions_operation_revision_key (operation, revision)` :185; `ai_operations_user_id_operation_id_key` unique `(user_id, operation_id)` :194; **`ai_operation_settings_operation_check CHECK ("operation" IN ('generate_cloze','lookup_word','translate_sentence'))`** :224 — the only CHECK on an operation column in the AI tables; settings seed :234-238 `INSERT INTO "ai_operation_settings" ("operation","model_ref","effort","thinking","max_output_tokens","version") VALUES ('generate_cloze', NULL, NULL, NULL, 1200, 0), …`.
- `20261020072259_ai_initial_prompts/migration.sql` (96 lines): `INSERT INTO "ai_prompts" ("operation","instructions","examples","revision","updated_by") VALUES` :3 and `INSERT INTO "ai_prompt_revisions" ("operation","instructions","examples","revision","saved_by") VALUES` :50; each row is `('<op>', replace($p$<instructions>$p$, E'\r', ''), '<examples JSON>'::jsonb, 1, '00000000-0000-4000-8000-000000000060')` (row ends :24, :40, :49 and :71, :87, :96). The actor is `AI_SYSTEM_ACTOR_ID`.

### 5.5 Fake adapter (`adapters/fake/fake.adapter.ts`)

- `FAKE_MODELS` :5-8 = `fake:ok, fake:slow, fake:two-blanks, fake:bad-json, fake:truncated, fake:429-then-ok, fake:503-then-ok, fake:refuse, fake:quota, fake:auth`.
- `okValue(schemaName, data)` :15-31: `generate_cloze_v1` → `{sentence: 'Lan will ___ it tomorrow.', accepted_answers: [String(data.word)], translation_vi: 'Lan sẽ làm việc đó vào ngày mai.'}`; `lookup_word_v1` → `{part_of_speech: 'noun', lemma: String(data.text), meaning_vi: 'nghĩa giả', definition_en: 'a fake meaning', examples: ['This is <text>.']}`; `translate_sentence_v1` → `{translation_vi: 'Bản dịch: <sentence>'}`; default `{}`.
- `call(req, signal)` :42-78 switches on `req.model`: `fake:ok` → okValue; `fake:slow` → waits for abort, then timeout; `fake:two-blanks` → cloze with 2 blanks; `fake:bad-json`; `fake:truncated`; `fake:429-then-ok` / `fake:503-then-ok` fail on odd calls per `(model, sha256(data))` (`isOddCall` :90-95, in-process counts); `fake:refuse`; `fake:quota`; `fake:auth`; unknown model → `model_rejected` 404.
- `describeModel(modelId)` :80-88: `not-found` unless in `FAKE_MODELS`; found → `maxOutputTokens: 4096`, `structuredOutputs: true`.

### 5.6 Every place that enumerates the operations

| Kind | Place |
|---|---|
| Source list | `ai/ai.types.ts:3` |
| zod `z.enum(AI_OPERATIONS)` | `ai/api/admin-ai-eval.controller.ts:13, 15`; `ai/api/admin-ai-operations.controller.ts:9`; `ai/api/admin-ai-prompts.controller.ts:9`; `ai/eval/eval-examples.service.ts:13`; `ai/eval/eval-runs.service.ts:17` |
| Loops over `AI_OPERATIONS` | `ai/models/models.service.ts:211` (`used_by`); `ai/reports/reports.service.ts:82, 95` (status per op); `cli/ai-fake-call-args.ts:45` |
| `Record<AiOperation, …>` (compile error if a key is missing) | `ai/operations/operations.ts:9`; `ai/prompts/initial-prompts.ts:6` |
| Per-op literals | `ai/ai.constants.ts:20` (`DEFAULT_MAX_OUTPUT_TOKENS`); `ai/adapters/fake/fake.adapter.ts:16-30` (switch on schema name, default `{}`); `cli/ai-fake-call-args.ts:8` (usage text); migration CHECK `20261020071131_ai:224`; `scripts/smoke-buoc-6.mjs:249` |
| Specs | `ai/operations/operations.spec.ts:4-17` (fixtures per op), `:28-33`, `:85-89`; `ai/adapters/fake/fake.adapter.spec.ts:33-61`; `ai/reports/reports.service.spec.ts:59` (literal 3-op list); `ai/models/models.service.spec.ts:260`; `cli/ai-fake-call.spec.ts:72`; `ai/prompts/initial-prompts.spec.ts:15, 25, 29` |
| `switch` on an operation in non-spec source | none |

## 6. Entitlements

- `entitlements/index.ts` :1-6: `EntitlementsModule`; `EntitlementsService, type EntitlementsSnapshot, type Feature`; `type AiPool, Pool`; `refusalProblem, type Refusal`; `type ReserveResult`. (`Decision` is not exported.)
- `Feature = 'practice.basic'|'ai.practice'|'ai.lookup'` `entitlements.service.ts:20`; `Decision = {allowed: true} | ({allowed: false} & Refusal)` :23; `Pool = 'practice_sessions'|'ai_practice'|'ai_lookup'`, `AiPool = Exclude<Pool,'practice_sessions'>` (`entitlements.types.ts:3, 5`).
- `EntitlementsSnapshot` :25-37 = `{plan: 'free'|'trial'|'pro'; sources: […]; pools: Record<Pool, {limit; used; remaining; resets_at: string|null}>; features: Record<'ai.practice'|'ai.lookup', {allowed; reason: 'plan-required'|null}>; ai_available: {enabled; cap_reached}; ads; trial_eligible}`.

| Method | Signature | Line |
|---|---|---|
| `reserve` | `(userId, pool: AiPool, operationId): Promise<ReserveResult>`; own short transaction | 61 |
| `confirm` | `(userId, pool, operationId): Promise<{state: 'confirmed'\|'released'\|'not-found'}>` | 65 |
| `release` | `(userId, pool, operationId): Promise<{state: 'released'\|'confirmed'\|'not-found'}>` | 69 |
| `refund` | `(userId, pool, operationId, reportId): Promise<{refunded: boolean}>` | 73 |
| `check` | `(userId, feature: Feature, tx?): Promise<Decision>` (`practice.basic` always allowed; AI feature needs pool limit > 0) | 81-87 |
| `checkQuota` | `(userId, _pool: 'practice_sessions', tx?): Promise<Decision>` | 93-106 |
| `recordPracticeSession` | `(tx, userId, sessionId, date): Promise<void>` | 109-114 |
| `snapshot` | `(userId): Promise<EntitlementsSnapshot \| null>` (no tx parameter; null without a profile) | 117-176 |

- `ReserveResult = {state: 'reserved'; expires_at} | {state: 'confirmed'} | ({state: 'refused'} & Refusal)` (`usage/usage-ledger.service.ts:18`). `refund` body :140-160: an existing `credit` for the op id → `{refunded: true}`; no anchor → false; `confirmed − credits` in the **current** cycle ≤ 0 → false; else insert `credit` with `note = reportId`. `RESERVATION_TTL_MS = 120_000` (`entitlements.constants.ts:4`).
- `snapshot.ai_available` = `{enabled: entitlements.aiEnabled, cap_reached: cap.confirmed + cap.reserved >= entitlements.aiDailyCap}` :169; `features` :168.
- `refusalProblem(refusal: Refusal): ProblemDetailsException` (`refusal.ts:9-22`): `plan-required` → 403 `entitlement-required`; `quota-exhausted` → 403 `quota-exhausted` + `extensions.resets_at`; `ai-unavailable` → 503 `ai-unavailable` + `retryAfterSeconds` (Retry-After header). `Refusal` :4-7.
- Ledger indexes: `usage_records_live_use_key (user_id, pool, operation_id) WHERE kind = 'use' AND status IN ('reserved','confirmed')` and `usage_records_credit_key … WHERE kind = 'credit'` (`20261019094400_entitlements/migration.sql:234, 236`).

## 7. Settings (`src/settings/settings.definitions.ts`)

A new key in the `practice` group touches these five places (pattern of the existing eight keys):

| Place | Lines | What it holds |
|---|---|---|
| `AppSettings['practice']` type | 15-20 | camelCase fields (`maxQuestionsPerSession`, …, `typeWordMaxRetries: number \| null`) |
| `SETTINGS_DEFAULTS.practice` | 47-50 | `{20, 10, 6, 50, 24, 20, 200, null}` |
| `SETTINGS_BOUNDS.practice` | 76-85 | snake_case `{min, max}` (+ `nullable: true` for `type_word_max_retries`) |
| `settingsValuesPatchSchema.practice` | 137-146 | `intIn(b.practice.<key>).optional()` (`intIn` :115) |
| `FIELDS` | 190-197 | `['practice', '<api_key>', '<storedField>']` rows (drive `toApiValues` :228-234, `applyPatch` :236-243, `changedFields` :257-263, `withDefaults` :269-277) |

- `withDefaults` fills a key missing from stored JSON from `SETTINGS_DEFAULTS` (:269-277), so no data migration is needed. `crossFieldViolations` :246-255 has the practice rule default ≤ max.
- `GET /v1/admin/settings` returns `{version, values: toApiValues(values), bounds: SETTINGS_BOUNDS}`; `PUT` takes `{version, values}` (`admin-settings.controller.ts:11, 22-35`, `settings.manage`).
- `settings/index.ts` :1-4 exports `SETTINGS_BOUNDS, SETTINGS_DEFAULTS, type AppSettings, SettingsModule, SettingsService`.
- `settings.definitions.spec.ts` (one `describe` :23): full-defaults `toEqual` incl. the practice object (:24-39); practice edges list (:127-142, `[key, min, max]` tuples, each min/max accepted and min−1/max+1 refused); merged default ≤ max (:155-162); patch/diff (:199-209); `withDefaults` fills the practice group (:211-216); null for `type_word_max_retries` (:218-225); stored key missing → default (:227-230).

## 8. Identity

- `identity/identity.types.ts`: `StaffRole = 'admin'|'editor'` :3; `Permission` :4-6 = `roles.manage, content.edit, content.publish, content.import, taxonomy.manage, settings.manage, entitlements.grant`; `ROLE_PERMISSIONS` :9-15 (admin all 7; editor `content.edit, content.publish, content.import, taxonomy.manage, entitlements.grant`); `permissionsFor(role)` :17-19.
- `@RequirePermission(...permissions: Permission[])` = `SetMetadata` + `UseGuards(PermissionGuard)` (`identity/staff/require-permission.decorator.ts:7-9`). `PermissionGuard.canActivate` (`permission.guard.ts:21-44`) reads metadata with `getAllAndOverride([handler, class])` (handler-level wins over class-level), requires **every** listed permission of the current role from `session_chains → users.staff_role`, 403 `password-change-required` when `mustChangePassword`, else 403 `forbidden`.
- Request user: `RequestUser = {userId; sessionChainId}` (`common/request-user/request-user.ts:3-6`); `@CurrentUser()` returns it (`current-user.decorator.ts:4-7`). No role on the request.
- Role of the actor: `IdentityService.getProfile(userId, db = prisma): Promise<Profile | null>` (`identity/profile/identity.service.ts:62`); `Profile.staff_role: StaffRole | null` :18. Bước 5 pattern: `GrantsService.roleOf(actorId)` = `getProfile(actorId)?.staff_role`, not admin/editor → 403 (`entitlements/grants/grants.service.ts:250-254`), used at :103 and :260, stored as `grantedBy: actorId, grantedByRole: actorRole` :134. Column `granted_by_role TEXT NOT NULL` + `entitlement_grants_granted_by_role_check CHECK (… IN ('admin','editor'))` (`20261019094400_entitlements/migration.sql:12, 212`); Prisma `grantedByRole String @map("granted_by_role")` (`prisma/models/entitlements.prisma:17`).
- There is no `identity/index.ts`: modules import `IdentityModule` from `identity/identity.module.js` and `IdentityService` from `identity/profile/identity.service.js`. `IdentityModule` exports `[IdentityService, ROLE_PERMISSIONS_TOKEN]` (`identity.module.ts:32`).

## 9. Common

- `@Idempotent(options?: {timeoutSeconds?: number})` — default 30 s; a lease, not a timeout (`common/idempotency/idempotent.decorator.ts:5-14`). Must be paired with `@UseInterceptors(IdempotencyInterceptor)` and the interceptor must be in the module's `providers` (Practice, Content, Learning, AI modules list it).
- `IdempotencyInterceptor.intercept` (`idempotency.interceptor.ts:28-92`): missing `Idempotency-Key` → 400 :38-41; no user → 400 :43-46; payload hash = sha256 of `JSON.stringify(body ?? null)` (+ file) :48-55; scope `{key, userId, endpoint: request.path, payloadHash}` :60; `conflict` → 409 + `Retry-After` :67-73; `abandoned` → 409 `idempotency-key-abandoned` :75-81; `reject` → 400 :83-87. Delegates to `runIdempotent(prisma, params, handler, {leaseSeconds, now?})` (`idempotency.service.ts:22-27`).
- `@RateLimit(...rules: RateLimitRuleName[])` (`rate-limit/rate-limit.decorator.ts:7-8`). `RateLimitRuleName` (`config/app-config.ts:6-21`): `sample.create, auth.register.ip, auth.login.ip, auth.otp.ip, auth.otp.email.cooldown, auth.otp.email.hourly, auth.refresh.ip, auth.refresh.chain, auth.logout.ip, auth.reset.ip, mail.ip.daily, user.write, learning.review, practice.answer, ai.test`. Defaults :106-125: `user.write` 30/60 s, `learning.review` 120/60 s, `practice.answer` 120/60 s, `ai.test` 20/3600 s (all by user).
- `MaintenanceScheduler.register(name: string, job: (now: Date) => Promise<unknown>): void` (`maintenance/maintenance.scheduler.ts:26-28`); `runAll()` :39-50 runs every job with one `now`, logs `maintenance_job_failed` and continues; hourly timer only when `config.maintenanceEnabled` :52-56. `pnpm maintenance:run` runs `dist/cli/run-maintenance.js`.
- `Clock` (`clock/clock.ts`): `abstract now(): Date` :3-5; `SystemClock` :8-12; `FakeClock(start?)` with `set(d)`, `advance(ms)` :14-33.
- `ProblemDetailsException(options: {status: number; title: string; type?: string; detail?: string; extensions?: Record<string, unknown>; retryAfterSeconds?: number})` (`problem-details/problem-details.exception.ts:3-27`); the filter sets `Retry-After` from `retryAfterSeconds` (`problem-details.filter.ts:35-36`).

## 10. Scripts and package scripts

### 10.1 `scripts/smoke-buoc-6.mjs` (613 lines)

- Config/env: `BASE` :15, `MAILPIT` :16, `TIMEZONE` :17, `PASSWORD` :18, `QUEUE_PREFIX = 'wordmet-b6-smoke'` :19, `run` :20; reads `.env` with `parseEnv` :22-24; refuses a mismatching `AI_FAKE_ENABLED` / `JOB_QUEUE_PREFIX` :27-30 and any provider key :31-33; `DB_NAME` from `DATABASE_URL` :34; `CHILD_ENV` :35.
- Helpers: `step(name)` :38, `ok(detail)` :39, `check(cond, msg)` :40, `sleep` :41; `send(url, init)` :47-57 (retries a network error twice); `api(method, path, {token, body, idem, key})` :60-72 (waits out 429 up to 5 times, reusing the key); `read(res)` :74-79; `want(promise, status, context)` :81-85; `wantProblem(promise, status, type, context)` :87-94 (type matched with `endsWith`); **`psql(sql)`** :96-99 = `docker compose -p english-learning exec -T postgres psql -U dev -d <DB_NAME> -v ON_ERROR_STOP=1 -tA -c <sql>`; `count(sql)` :100; `callsFor(opId)` :101; `outcomesFor(opId)` :102; `compose(...args)` :104-106; `waitFor(readValue, done, what, timeoutMs)` :108-116; `waitForApi()` :118-122 (`GET /v1/health`); `built(file)` :124-127; `maintenance()` :129-131 (`dist/cli/run-maintenance.js`); `aiFakeCall(op, {user, data, operationId, parallel, purpose})` :137-146 (`dist/cli/ai-fake-call.js`, keeps lines with `kind: 'ai_fake_call'`); `call(op, data, operationId?, user?)` :148-152; `mailsTo(email)` :154-157; `otpCodeFor(email)` :159-172; `registerVerified(email)` :174-181 (register with `given_name`, `birth_date`, `accept_terms`, OTP from Mailpit, verify); `login(email)` :183-184; `letters(n)` :187; `clozeData(word?)` :188; `LEARNER = randomUUID()` :191 (a plain uuid; learner AI calls never go through HTTP).
- Admin setup :201-210: `registerVerified(admin)` → `dist/cli/admin-grant.js <email>` → login; editor via `POST /v1/admin/users {email, staff_role: 'editor', password, must_change_password: false, timezone}`.
- Closures in `main`: `status()` :212 (`GET /v1/admin/ai/status`), `opStatus(op)` :213, `settings(section, patch)` :214-218 (GET then `PUT /v1/admin/settings {version, values}`), `addModel(modelId)` :220-226 (`POST /v1/admin/ai/models {provider: 'fake', model_id}`, cached), `operation(op)` :227-230 (`GET /v1/admin/ai/operations`), **`choose(op, modelId, maxOutputTokens = null)`** :231-237 (`PUT /v1/admin/ai/operations/:op {expected_version, model_ref, effort: null, thinking: null, max_output_tokens}`), `prompt(op)` :238.
- Models: only `generate_cloze` is ever given a model (`choose('generate_cloze', …)` at :267, 285, 293, 302, 310, 321, 330, 339, 357, 379, 526, 536, 562, 568); `lookup_word` and `translate_sentence` stay `model-not-set` for the whole run. Prompt-revision assumptions: see P1.

### 10.2 `scripts/smoke-buoc-4.mjs` (529 lines)

- `.env` via `process.loadEnvFile('.env')` :23; `DB_NAME` :25; `TYPES` (3 Bước 4 types) :20; `PRIVATE_MASK` :19.
- Helpers: `step` :28, `ok` :29, `check` :30, `sleep` :31; `api(method, path, {token, body, idem, form})` :34-51 (new random key per call when `idem`; no `key` option; no network retry); `want` :53; `wantProblem` :59; `psql(sql)` :68-71 (same docker command as 10.1); `today()` :73; `waitForApi` :75; `otpCodeFor` :86; `registerAdmin()` :104-116 (register, verify, `dist/cli/admin-grant.js`, login); `registerLearner()` :118-125 (register, `PATCH /v1/me {native_language: 'vi'}`; not email-verified); `waitFor` :127-135; `letters` :138; word fixtures `OBJECTS`/`MEANINGS`/`words`/`P`/`P2` :143-159; `askedWord(item)` :162-167, `rightAnswer(item)` :170-178, `wrongAnswer(item)` :180-185 (all switch on the three Bước 4 prompt kinds).
- In `main` (:187): `tally` :189; session grant `POST /v1/admin/entitlements/grants {user_id, kind: 'limits', limits: {practice_sessions_per_day: 200}, ends_at, reason}` :200-206; CSV upload `POST /v1/admin/content/uploads` (form: `level_source_id`, `file`) + `POST /v1/admin/content/senses/publish-jobs {filter: {batch_id}}` :208-232 (CSV header `headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,inflections` :211); groups/items/quick-add :234-249; closures `start(body)` :251-255, `next(sessionId)` :256, `answer(itemId, body)` :257-260; old hint shape asserted :337-340; maintenance via `dist/cli/run-maintenance.js` :512-513.
- Pro grant (for a learner with AI pools), from `smoke-buoc-5.mjs:517`: `{user_id, kind: 'plan', plan: 'pro', ends_at, reason}`; grant body schema `entitlements/grants/grants.schemas.ts:21-30`.

### 10.3 `package.json` scripts

`admin:grant`, `build`, `deploy`, `format`, `start`, `start:dev`, `start:debug`, `start:prod`, `start:worker`, `lint` (`oxlint src/ test/`), `test` (`vitest run`), `test:watch`, `test:cov`, `test:debug`, `test:scale`, `db:setup` (`prisma migrate deploy && prisma generate --sql`), `db:normalize-timezones`, `run:dev` (`node scripts/run-dev.mjs`), `smoke:buoc-2`, `smoke:buoc-4`, `smoke:buoc-5`, `smoke:buoc-6`, `maintenance:run` (`node dist/cli/run-maintenance.js`), `billing:fake-event`, `entitlements:fake-ai` (`node dist/cli/fake-ai.js`; usage `<reserve|confirm|release|refund> (--user|--users) --pool <ai_practice|ai_lookup> --op <string> [--parallel N] [--report <id>]`, `cli/fake-ai-args.ts:6-7`), `ai:fake-call` (`node dist/cli/ai-fake-call.js`; usage `cli/ai-fake-call-args.ts:8-10`: `<op> --user <uuid> --data <json|@file> [--operation-id] [--parallel 1–50] [--purpose learner|test]`, or `delete-user-data --user`).
Other files in `scripts/`: `billing-fake-event.mjs`, `gen-secret.mjs`, `pack-agid.mjs`, `run-dev.mjs`, `smoke-buoc-2.mjs`, `smoke-buoc-5.mjs` (689 lines).
