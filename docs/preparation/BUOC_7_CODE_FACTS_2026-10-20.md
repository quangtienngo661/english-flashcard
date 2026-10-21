# Bước 7 — Code facts (apps/api @ 47ca600, 2026-10-20)

> Kiểm kê code thật trên `origin/dev` @ `47ca600` cho brainstorm Bước 7 (Practice AI + Content AI). Một agent đọc code (chỉ đọc) viết, Claude lưu lại
> nguyên văn để làm bằng chứng. Chỉ là sự kiện có `file:dòng`, không phải đề xuất. Số dòng đúng ở commit trên; đọc lại code trước khi viết plan.

Base path: `apps/api/`. All paths below are relative to it. Global route prefix `v1` (`src/app.setup.ts:25`).

## Tóm tắt

1. **Question building:** `next()` and `current()` take `lockOpen` (`SELECT … FOR UPDATE` on `practice_sessions`), then `advance()` → `QuestionBuilder.build()` →
   `practiceQuestion.create` + `practiceSessionItem.create`, all inside one `$transaction` (15 s). The builder reads Content through its own client, outside the
   transaction. `current()` can also build a question (when an item was voided or a notice was pending).
2. **Type choice:** `type_word` always; MCQ needs 3 eligible distractors; true/false needs 1; function words → `type_word` only. Random, avoiding the word's previous
   type when possible. `prompt_style` only affects `type_word` (`mixed` = 50/50, falls back to meaning when no example can be masked); MCQ and true/false always store
   `'meaning'`.
3. **Schema columns:** `practice_questions.schema_version` exists (always the literal 1). There is no `operation_id` or `meta` column anywhere in Practice.
4. **Grading:** typed answers go through `normalizeAnswer` (NFC, trim, collapse spaces, straight quotes, lower case) and must exactly match `answer_key.accepted`. The
   `blank` column is not used in grading. Retries unlimited by default (`type_word_max_retries` = null).
5. **Reports:** reasons `meaning_wrong|graded_wrong|hint_wrong|other`; statuses `open|no_error|fixed`. Resolve = `updateMany` on open rows, 409 `report-not-open`,
   permission `content.edit`, `@Idempotent`. **Nothing in Practice calls `refund`**; the only caller is the dev CLI (`src/cli/fake-ai-args.ts:63`).
6. **Lookup chain:** `GET /v1/lookup?q=` returns `{senses, via_inflection}`; `POST /v1/quick-add` takes `sense_id` or `new_word` (+ optional sentence). **No AI step
   or placeholder** in content, learning, practice or identity code.
7. **Private words:** `entries.scope='private'` + `owner_user_id`, cap `content.private_words_per_user` (10000). Created with **empty examples**, so they never get
   sentence prompts.
8. **Context sentences:** table `context_sentences(id, user_id, sense_id, text, created_at)`; added via `POST /v1/senses/:id/sentences` or quick-add; limit
   `sentences_per_sense` (20) per (user, sense). **Practice does not use them**; Learning cards do.
9. **Inflections:** `entry_inflections(id, entry_id, form, form_key, kind, source, position)`. Practice gets them through `practiceSenses().inflections` and uses them
   in `maskExample`. There is no `inflectionsOf(entryId)` function (`entriesByForm` goes form → entries). `form_of_entry_id` is on `sense_revisions`; Practice uses
   it only to exclude distractors.
10. **AI gateway:** `AiService.isReady(op)`, `run(op, data, {operationId, userId, purpose:'learner', deadlineMs?})`, `deleteUserData(userId)`,
    `runAdminTest(op, data, actorId)`. `OPERATION_ID_PATTERN = /^[A-Za-z0-9._:#-]{1,100}$/`. Replay 24 h per `(user_id, operation_id)`. `AiResult` has 5 statuses.
    Adding an operation touches `AI_OPERATIONS`, `DEFAULT_MAX_OUTPUT_TOKENS`, `OPERATIONS`, `INITIAL_PROMPTS`, the fake adapter, and a new migration (CHECK +
    seed rows in `ai_operation_settings`, `ai_prompts`, `ai_prompt_revisions`).
11. **`generate_cloze` input vs Practice data:** it needs `word`, `part_of_speech`, `level` (CEFR), `meaning_vi`, `context_label`. `PracticeSense` has **no part of
    speech and no CEFR level** (`WordSense` from `cardContent` has both). `gloss_vi` can be null; an English-native learner's private word has **no `gloss_vi`**.
12. **Entitlements:** `reserve/confirm/release/refund` each run their own transaction (never inside the caller's). Reservation 120 s. Pools `practice_sessions`,
    `ai_practice`, `ai_lookup`. `check()` for an AI feature only tests limit > 0 (not remaining quota, not `ai_enabled`).
13. **`@Idempotent()`:** today the handler runs inside the idempotency transaction callback (holds an xact advisory lock and a connection); the handler's own writes
    are not part of that transaction. Bước 6 says not to call `ai.run` from an `@Idempotent()` handler.
14. **Native language:** `users.native_language` (nullable `vi|en`); `LearnerContentGuard` reads it on every request (403 `profile-incomplete` if null); not stored
    on the session.

---

## 1. Sinh câu hỏi Practice

### 1.1 Endpoints (`src/practice/sessions/sessions.controller.ts`)
- `POST /v1/practice/sessions` → `start` (32-38): `@Idempotent()`, `IdempotencyInterceptor`, `@RateLimit('user.write')`.
- `GET /v1/practice/sessions/current` → `current` (40-43): not idempotent.
- `POST /v1/practice/sessions/:id/next` → `next` (45-50): `@HttpCode(200)`, `@RateLimit('practice.answer')`, **not** `@Idempotent`.
- `:id/continue` (52-61), `:id/finish` (63-68).
- The class carries `@LearnerContent()` (28).

### 1.2 `start()` (`src/practice/sessions/sessions.service.ts:58-112`)
- `count` ≤ `maxQuestionsPerSession`, otherwise 400 (59-63).
- An early `checkQuota('practice_sessions')` runs outside the transaction (67-68).
- `$transaction(..., startTransaction = {timeout: 30_000, maxWait: 10_000})` (19, 69, 111). Inside:
  - `withPracticeLock(tx, userId)` = `pg_advisory_xact_lock(hashtextextended('practice.user:'+userId, 0))` (`src/practice/practice-lock.ts:7-9`).
  - `assertEntitled` → `entitlements.check(userId, 'practice.basic')` (204-207).
  - Source items loaded; availability walk in batches of 50 through `builder.availability` (85-94).
  - Open sessions abandoned (97-99), `checkQuota(..., tx)` (102-103), session row created (104-109). `promptStyle` defaults to `'mixed'` (107).
- **No question is built at start.**

### 1.3 `current()` (114-126)
- `closeIfIdle(userId, null)` runs as its own committed statement (163-177).
- Open session found outside the transaction; 404 if none (116-117).
- `$transaction(transactionOptions = {timeout: 15_000, maxWait: 10_000})` (20, 118-125): `lockOpen` → `advance(tx, learner, session, build=false)` → `view`.
- With `build=false`, returns `{state:'none'}` (item null) when there is no pending item and no notice (257-258).
- If `pendingNotice` was set or the pending item got voided, it falls through and **builds and writes a new question**.

### 1.4 `next()` (128-139)
- `closeIfIdle(userId, sessionId)`, then `$transaction(transactionOptions)`: `lockOpen` → `advance(..., true)` → `view`.
- Returns `NextResult`: `question | waiting_continue | finished`, plus optional `notice` (`'word-not-found'`, or `'group-not-found'` when finished) (29-33).

### 1.5 `lockOpen` (179-184, 191-196)
- `SELECT id FROM practice_sessions WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`. Missing → 404.
- Status outside `OPEN = ['active', 'waiting_continue']` (22) → 409 `session-closed` (41).
- `touch` updates `last_activity_at` (187-189).
- `next` and `current` do **not** take `withPracticeLock`; only `start` and `ReportsService.create` do.
- `AnswersService.locked` uses the same `lockOpen`, then `FOR UPDATE` on the item (`src/practice/answers/answers.service.ts:148-160`, transaction 10 s / 5 s).

### 1.6 `advance()` step by step (228-317)
1. `pendingNotice` set: `notice = 'word-not-found'`, column cleared (235-238).
2. Status `waiting_continue` → return (239).
3. Items loaded with their questions, ordered by position (240-242). `pending` = first item with `result === null` (243).
4. Group source: `learning.practiceCheck(...)`. Group gone: void the pending item, finish, notice `'group-not-found'` (244-251).
5. `usable` = senses still visible, in learning, and in the group (252, 220-226).
6. A pending item still usable is returned unchanged (no new row) (254). An unusable one is voided and the notice set (255-256). No pending item, `build=false`, no
   notice → `none` (257-258).
7. Answered (`correct|wrong`) ≥ `targetCount` → finish (261-265).
8. Planning: round 1 walks `senseIds` forward from a cursor (269-272). Round ≥ 2 shuffles what remains of the current round, then `nextRoundOrder` (273-282).
9. Plan non-empty: `assertEntitled('practice.basic')` (284), then `settings.get()` (285).
10. For each planned sense: `builder.build({userId, nativeLanguage: learner.nativeLanguage, senseId, chosenTypes: session.types, promptStyle: session.promptStyle,
    previousType: <previous item of this sense>.question.type ?? null, avoidDistractors: previous.question.distractorSenseIds ?? [], settings: practice, random:
    Math.random})` (286-293). `'skip'` → next sense (294).
11. `tx.practiceQuestion.create({ data: { userId, senseId, type, promptStyle, blank: built.blank ?? undefined, schemaVersion: 1, prompt, answerKey, hints,
    distractorSenseIds, createdAt } })` (296-300).
12. `tx.practiceSessionItem.create({ data: { sessionId, userId, questionId, senseId, round, position: (last?.position ?? 0) + 1, askedAt, maxRetries:
    practice.typeWordMaxRetries }, include: { question: true } })` (301-307). Returned as `state: 'question'` (308).
13. Nothing built: round 1 with `continued === null` and `usable.size > 0` → `waiting_continue` (311-314); otherwise finish (315-316).

Additional facts:
- `QuestionBuilder` reads Content through `ContentService.practiceSenses` / `practiceCandidates`, which use `this.prisma`, not `tx`
  (`src/content/content.service.ts:178-185`). These reads happen while the session transaction is open.
- Bước 6 delivery: "Tách lời gọi AI ra khỏi transaction của `SessionsService.next()` và `current()`" (`docs/deliveries/buoc-6.md:163`).

### 1.7 `QuestionBuilder` (`src/practice/questions/question-builder.service.ts`)
- **`availability`** (40-55): `need` = 3 if MCQ chosen, else 1 if true/false, else 0. Loads group mates and candidates, then `availableTypes`.
- **`build`** (57-123): `practiceSenses` → `skip: 'not-visible'` (59-60); mates → candidates → `eligibleCandidates` (61-63); `availableTypes` → `skip: 'no-type'`
  (64-65); `chooseType` (66).
- **Type choice** (`src/practice/questions/question-types.ts`):
  - `availableTypes` (9-15): `type_word` always allowed; a function word gets nothing else; MCQ needs ≥ `MCQ_OPTIONS - 1 = 3` eligible candidates
    (`practice.constants.ts:10`); true/false needs ≥ 1.
  - `chooseType` (18-22): uniform random among available types other than `previousType`; if none remain, among all available.
- **Masked examples:** `masked = sense.examples.flatMap(ex => maskExample(ex, {lemma, variants, inflections}) ?? [])` (68-69).
- **MCQ** (78-89): `promptStyle: 'meaning'`; 4 shuffled options = asked sense + 3 distractors, shown as lemmas; `answerKey` holds `correct_index`, `option_private`;
  `distractorSenseIds` stored.
- **True/false** (90-103): `isTrue = random()*100 < settings.trueFalseTruePercent`; paired meaning = the sense itself or one distractor; `context_label` always null
  (D37).
- **`type_word`:** `style = typingStyle(input.promptStyle, masked.length > 0, random)` (104).
  - `typingStyle` (`question-types.ts:25-29`): no masked example or `'meaning'` → meaning; `'sentence'` → sentence; `'mixed'` → `random() < SENTENCE_SHARE` (0.5,
    `practice.constants.ts:12`).
  - **Sentence** (105-115): a random masked example. `takesAll = chosen.base && (chosen.blank === lemma || sense.accepted.includes(chosen.blank))`.
    `accepted = takesAll ? [lemma, ...sense.accepted, chosen.blank] : [chosen.blank]`. Prompt `{kind:'type_sentence', sentence}`, `main = chosen.blank`,
    `blank = {text, base}`.
  - **Meaning** (116-122): prompt `type_meaning`, `main = lemma`, `accepted = normalizedSet([lemma, ...sense.accepted])` (126).

### 1.8 Enum / union values

| Field | Values | Source |
|---|---|---|
| Question `type` | `'mcq_definition' \| 'true_false_definition' \| 'type_word'` | `src/practice/practice.types.ts:7`; CHECK `practice_questions_type_check` (`prisma/migrations/20261018150000_practice/migration.sql:126`); zod `sessions.controller.ts:10` |
| Question `prompt_style` | `'meaning' \| 'sentence'` | `practice.types.ts:8`; CHECK :127 |
| Session `prompt_style` | `'meaning' \| 'sentence' \| 'mixed'`, default `'mixed'` | `sessions.service.ts:27,107`; zod controller:19; CHECK :123 |
| Session `types` | Subset of the 3 question types, 1–3, unique | zod controller:18; CHECK `types <@ ARRAY[...]` :122 |
| Item `result` | `NULL \| 'correct' \| 'wrong' \| 'void'` | CHECK :128 (void = never counted, `practice.prisma:50`) |
| Item `review_action` | `'needs_review' \| 'known'` | :129 |
| Session `status` | `active \| waiting_continue \| finished \| abandoned` | :124; partial unique index: one open session per user (:133) |
| Session `source` | `today \| all \| group \| weak \| priority` | :119 |
| Session `sort` | 8 values | :121 |
| `pending_notice` | `'word-not-found'` | :125 |
| `MeaningLanguage` | `'vi' \| 'en'` | `practice.types.ts:9` |

### 1.9 JSON shapes (`src/practice/practice.types.ts:11-33`)

```ts
export type Prompt =
  | { kind: 'mcq'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null; options: string[] }
  | { kind: 'true_false'; lemma: string; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }
  | { kind: 'type_meaning'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }
  | { kind: 'type_sentence'; sentence: string };
export type AnswerKey = {
  reveal: { lemma: string; meaning: string; definition_en: string | null };
  asked_private: boolean;
} & (
  | { kind: 'mcq'; correct_index: number; option_private: boolean[] }
  | { kind: 'true_false'; is_true: boolean; paired_private: boolean }
  // accepted is normalized and includes main.
  | { kind: 'type_word'; main: string; accepted: string[] }
);
export type Hints = {
  level1: { kind: 'definition' | 'example' | 'meaning'; text: string } | null;
  level2: { first_letter: string; length: number } | null;
};
export type Blank = { text: string; base: boolean };
```

- Hints built by `buildHints` (`src/practice/questions/hints.ts:20-35`); `level2` only for `type_word`.
- `ItemView` sent to the app (`src/practice/sessions/session-views.ts:13-17, 31-41`) never contains the answer key or hint texts. `reportable =
  !answerKey.asked_private`.

### 1.10 `schema_version` / `operation_id` / `meta`
- `practice_questions.schema_version` is `INT NOT NULL` (`prisma/models/practice.prisma:38`; migration :31), written as the literal `1`
  (`sessions.service.ts:297`); no named constant.
- `practice_questions` columns: `id, user_id, sense_id, type, prompt_style, blank (jsonb null), schema_version, prompt, answer_key, hints, distractor_sense_ids
  uuid[], created_at` (`practice.prisma:30-48`).
- **No `operation_id` and no `meta` column** on `practice_questions`, `practice_session_items` or `practice_sessions` (grep of `src/practice`, `src/content` finds
  nothing).
- Cleanup: hourly, items with `asked_at` older than `history_months` are deleted, then questions with no remaining items
  (`src/practice/maintenance/practice-cleanup.service.ts:31-36`). Deleting a private word removes its reports, items and questions
  (`src/practice/maintenance/private-senses-cleanup.provider.ts:13-36`).

## 2. Chấm điểm

### 2.1 Answer endpoint and service
- `POST /v1/practice/items/:id/answer`, `@Idempotent` (`src/practice/answers/answers.controller.ts:25-36`).
- Body: `{choice: int 0..3} | {is_true: boolean} | {text: 1..ANSWER_MAX(100) code points after NFC+trim}` (12-16).
- `AnswersService.answer` (`answers.service.ts:54-86`):
  - MCQ: `correct = body.choice === key.correct_index`; `raw = normalized = String(choice)` (61-63).
  - True/false: `body.is_true === key.is_true` (64-66).
  - `type_word`: `correct = matchesAnswer(body.text, key.accepted)`, `raw = body.text`, `normalized = normalizeAnswer(body.text)` (67-70). Wrong and
    (`item.maxRetries === null || item.tries < item.maxRetries`) → text appended to `answersTried`, `tries + 1`, returns `{result:'try_again', tries}` (71-76).
  - Body not matching the key kind → 400 `validation-failed` (77-78).
- `writeFinal` (114-127) is the single place a final result is written (result, `answeredAt`, `localDate` from the profile timezone), then
  `entitlements.recordPracticeSession(tx, ...)` (125).
- `skip` (89-100): `type_word` only, after at least one try; result `wrong`, `skipped = true`.
- `hint` (102-111): 409 `hint-unavailable` if the hint is null.
- `correctOf` (28-35) gives the answer shown afterwards.

### 2.2 Normalization (`src/practice/grading/normalize.ts`)
- `normalizeAnswer` (2-10): `normalize('NFC')`, `trim`, `\s+` → single space, curly single quotes → `'`, curly double quotes → `"`, `toLowerCase`.
- `answerLength` (13-15): code points after NFC and trim.
- `matchesAnswer(typed, accepted)` (18-20) = `accepted.includes(normalizeAnswer(typed))`: exact match, no fuzzy matching.

### 2.3 Accepted answers
- `accepted` is fixed when the question is built: `normalizedSet` (`question-builder.service.ts:126`) normalizes and de-duplicates.
- `sense.accepted` = entry variants with `accepted_as_answer = true` + the revision's `accepted_forms`, minus the lemma
  (`src/content/practice/practice-senses.ts:73-74`).
- Inflected forms are **not** added to `accepted` for meaning prompts. A sentence prompt accepts the blank's form, plus all base spellings only when the blank is a
  base, accepted spelling (`question-builder.service.ts:107-109`).
- `blank` (`{text, base}`) is stored for sentence prompts only and **not read when grading**; grading uses `answer_key.accepted`.
- `max_retries` is a per-item snapshot of `practice.type_word_max_retries`, default `null` = no limit (`settings.definitions.ts:49`).

## 3. Practice reports (`practice_reports`)

- Table (`prisma/models/practice.prisma:87-105`): `id, user_id, item_id (unique, null after cleanup, FK SET NULL), sense_id, question_snapshot jsonb, reason, note,
  status default 'open', resolved_by, resolved_at, created_at`.
- `ReportReason = 'meaning_wrong' | 'graded_wrong' | 'hint_wrong' | 'other'` (`src/practice/reports/reports.service.ts:13`; CHECK migration :130; zod
  `reports.controller.ts:10`). `ReportStatus = 'open' | 'no_error' | 'fixed'` (`reports.service.ts:14`; CHECK :131).
- **Learner create:** `POST /v1/practice/items/:id/report`, 201 (`src/practice/reports/reports.controller.ts:17-29`). Not `@Idempotent`; unique `item_id` makes it
  idempotent (line 16). `ReportsService.create` (`reports.service.ts:50-93`) runs under `withPracticeLock`; item not found → 404; `asked_private` → 409
  `report-not-available`; existing report → 409 `report-exists` with the report; more than `reportsPerHour` (20) → 429 with retry-after. Snapshot by `buildSnapshot`
  (`src/practice/reports/snapshot.ts:13-40`), masks private words: `{type, prompt, correct, hints_shown, learner: {answer, answers_tried, result, hint_level}}`.
- **Staff** (`src/practice/reports/admin-reports.controller.ts`, class `@RequirePermission('content.edit')`, 20-21):
  - `GET /v1/admin/practice/reports?status&page_size(1..100, default 20)&page_token` (25-28).
  - `POST /v1/admin/practice/reports/:id/resolve`, body `{status: 'no_error' | 'fixed'}` (17, 30-40): `@HttpCode(200)`, `@Idempotent()`,
    `@RateLimit('user.write')`.
  - `ReportsService.resolve(actorId, reportId, status)` (122-132): `updateMany where {id, status: 'open'}` → `status, resolvedBy, resolvedAt`; not found → 404;
    count 0 → 409 `report-not-open`. **No refund, no notification, no content change.**
- **Refund callers:** besides the wrapper `src/entitlements/entitlements.service.ts:73-75`, the only caller of `refund(` is the dev CLI
  `src/cli/fake-ai-args.ts:63` (`pnpm entitlements:fake-ai`).

## 4. Content: từ riêng, câu ngữ cảnh, chuỗi tra nghĩa

### 4.1 Private words
- Storage: `entries.scope` `'catalog' | 'private'` + `owner_user_id` (`prisma/models/content.prisma:46-48`); two partial unique indexes `entries_catalog_key`,
  `entries_private_key` (60-62; migration `20261017160000_private_entries`).
- Create only via quick-add `new_word` → `ContentService.createPrivateSense` → `PrivateWordsService.createPrivateSense`
  (`src/content/private/private-words.service.ts:121-167`):
  - Limit `settings.content.privateWordsPerUser` (10000), counted under lock `content.private:<owner>`; over → `private-word-limit-reached` (123, 128, 138-140).
  - Meaning: `vi` learner → `gloss_vi`; `en` learner → `definition_en` (55-58). **An English-native learner's private word has no `gloss_vi`.**
  - Inflections from `generateInflections(lemma, pos)`, source `library` (143).
  - Context labels internal: null, then `p2`, `p3`… (146-150), hidden in reads (`practice-senses.ts:70`, `words.service.ts:61`).
  - Revision published immediately, `draftSource: 'user'`, **`examplesEn: []`** (107, 152): no examples, so no sentence prompts in Practice.
  - Level: `user` basis if given, else derived from the `form_of` base (155-160). Returns `catalogMatch` (162-166).
- Edit: `PATCH /v1/my-words/:id` `{lemma?, pos?, senses?: [{sense_id, meaning}], level?, topics?}` (`src/content/private/my-words.controller.ts:30-51`; schema
  `my-words.schemas.ts:11-18`) → `updatePrivateWord` (169-198).
- Delete: `DELETE /v1/my-words/:id` (`src/learning/my-words/my-words-delete.controller.ts:13,18`) → `QuickAddService.deleteMyWord`
  (`src/learning/quick-add/quick-add.service.ts:86-95`): deletes the Content entry (cascade), runs the Practice cleanup port, removes Learning items and logs.
- Visibility: `visibleSenseCondition` (`src/content/learner/visible-senses.ts:9-15`): open sense with a live revision, in the catalog or the viewer's own private
  entry.

### 4.2 Context sentences
- Table `context_sentences` (`prisma/models/content.prisma:171-184`; migration `20261017190000_context_sentences`): `id uuid, user_id uuid (no FK), sense_id uuid
  (FK senses, ON DELETE CASCADE), text, created_at`, index `(user_id, sense_id)`.
- Who: the learner, for any sense visible to them (`src/content/sentences/sentences.service.ts:36-39`).
- Add: `POST /v1/senses/:id/sentences`, body `{text}` 1..300 code points after NFC (`src/content/sentences/sentences.controller.ts:17, 29-51`); 201 `{id, created_at}`
  without text (the idempotency store keeps response bodies, 41-42); `@Idempotent`. Also via quick-add `sentence` (`quick-add.service.ts:76-77`).
- Limit `settings.content.sentencesPerSense` (20, bounds 5..100) per (user, sense) under lock `content.sentences:<user>:<sense>`; over → 409
  `sentence-limit-reached` (`sentences.service.ts:33, 41-44`; controller 46-48). `SENTENCE_MAX = 300` (`content.constants.ts:32`).
- Delete: `DELETE /v1/sentences/:id` → 204/404 (controller 53-60).
- Read: `ContentService.listSentences(userId, senseIds)` (`content.service.ts:164-166`), used by Learning queue cards (`src/learning/queue/queue.service.ts:93-94,
  104`).
- **Not used by Practice:** `practiceSenses` selects only `r.examples` (`practice-senses.ts:60`).
- Sentence text never logged, only ids (`sentences.service.ts:21, 55`).

### 4.3 Lookup chain (Bước 3)
- `GET /v1/lookup?q=` (`src/content/words/words.controller.ts:23-26`); `q` NFC, trimmed, lower-cased, 1..100 (`words.schemas.ts:6-7, 20`).
- `WordsService.lookup(viewerId, q, nativeLanguage)` (`src/content/words/words.service.ts:133-145`):
  - `senses`: visible senses where `lower(e.lemma) = q` or a variant's `lower(text) = q` (135-136).
  - `via_inflection`: `inflections.entriesByForm(q, viewerId)`: every catalog entry (with or without a visible sense) plus the viewer's own private entries listing
    that form (`src/content/inflections/inflections.service.ts:46-55`); each base comes with its visible senses (137-143).
  - Returns `{ senses: WordSense[], via_inflection: Array<{ kind, base: {entry_id, lemma, pos}, senses: WordSense[] }> }` (144). No match → empty arrays, 200.
  - `WordSense` = `{sense_id, entry_id, scope, lemma, pos, level (CEFR|null), context_label, meaning {text, language, translation_missing}, definition_en, examples,
    topics, form_of}` (13-18).
- Choose or enter manually: `POST /v1/quick-add` (`src/learning/quick-add/quick-add.controller.ts:17-30, 37-46`), body `{group_id, sense_id? XOR new_word?: {lemma,
  pos?, meaning, level?, topics?, form_of?: {entry_id, kind}}, sentence?}`. `QuickAddService.quickAdd` (`quick-add.service.ts:54-83`), one transaction: learner lock
  → group owned → `createPrivateSense` (meaning language = `learner.nativeLanguage`, 69) → `items.linkInTx` → optional `addSentence`. Returns `{item_id, sense_id,
  created_item, created_word, sentence_id}` (22-24).
- **AI placeholder: none** (grep for "AI", "ai_lookup", "ai.lookup", "Bước 7" in `src/{content,learning,practice,identity}`). Spec chain "catalog → nguồn ngoài →
  AI → tự nhập" (`docs/specs/module-spec-vocabulary-content.md:22`); Bước 3 scoped it to catalog + manual (`docs/superpowers/specs/2026-10-16-buoc-3-learning-design.md:25,
  229`); Bước 6 delivery: "Content lưu gợi ý tra nghĩa chỉ khi người học bấm lưu" (`docs/deliveries/buoc-6.md:165`).

## 5. Inflections (`entry_inflections`, AGID, D46)
- Columns (`prisma/models/content.prisma:153-169`; migrations `20261017170000_entry_inflections`, `position` in `20261017220000_agid_source:2`): `id, entry_id (FK
  entries CASCADE), form, form_key (lower NFC, indexed), kind, source, position int default 0`; unique `(entry_id, form, kind)`; CHECK `kind IN ('third_person',
  'present_participle', 'past', 'past_participle', 'plural', 'comparative', 'superlative')`; CHECK `source IN ('library', 'reviewed')`;
  `entries.inflections_reviewed_at` (content.prisma:50); `INFLECTION_KINDS` (`src/content/content.constants.ts:24-27`); `AGID_SOURCE_ID` (21).
- Functions:
  - `generateInflections(lemma, pos)` (`src/content/inflections/inflect.ts:36`, exported `content/index.ts:7`): pure (no DB): AGID forms; compromise for a verb or
    noun AGID lacks; none for adjectives, multi-word lemmas or other parts of speech.
  - `InflectionsService.replaceInflections(tx, entryId, source, forms)` (26-44): reviewed wins over library.
  - `entriesByForm(form, viewerId)` (48-55): form → entries; exposed as `ContentService.entriesByForm`.
  - `inflectionFormKey` (12-14).
- **No function returns all inflected forms of an entry by `entryId`.** Closest: `practiceSenses()` returns `inflections: Array<{form, kind}>` per sense (entry's
  rows, ordered by kind order, position, form; `src/content/practice/practice-senses.ts:63-65, 75`); `wordPage` returns per-lemma forms with `has_page`
  (`words.service.ts:114-130`).
- Practice: `maskExample(sentence, {lemma, variants, inflections})` (`src/content/practice/mask-example.ts:28-56`, exported `content/index.ts:14`), called in
  `question-builder.service.ts:68-69`. Longest forms first; case-sensitive except a capitalized first letter at sentence start; every match → `___`; null if
  nothing matches or the matches are different forms; returns `{masked, blank, base}` (`base` = blank is the lemma or a variant).
- `form_of_entry_id`: on `sense_revisions` with `form_kind` (`content.prisma:126-128`), FK → `entries` ON DELETE SET NULL, trigger `entries_clear_form_kind`
  (migration `20261018130000_form_of_unlink`). Exposed in `WordSense.form_of`, `CandidateSense.form_of_entry_id`. Practice uses it only in `eligibleCandidates`
  (`src/practice/questions/distractors.ts:50`). Learner sets it through quick-add `new_word.form_of`.

## 6. AI gateway (`src/ai/**`)

### 6.1 Public surface (`src/ai/index.ts:1-10`)
Exports `AiModule`, `AiService`, `OPERATION_ID_PATTERN`, `AI_OPERATIONS`, `AI_PROVIDERS`, and types `AiMeta, AiOperation, AiProviderName, AiPurpose, AiReadiness,
AiResult, CallOutcome, PermanentReason, TransientReason, UnavailableReason, CallSummary, RunReport`. `AiModule` exports `AiService` only (`ai.module.ts`).

### 6.2 `AiService` (`src/ai/ai.service.ts`)

```ts
async isReady(op: AiOperation): Promise<AiReadiness>                                    // 23-28 (purpose 'learner')
async run(op: AiOperation, data: unknown,
  options: { operationId: string; userId: string; purpose: 'learner'; deadlineMs?: number }): Promise<AiResult>  // 31-40
async deleteUserData(userId: string): Promise<void>                                      // 43-49
runAdminTest(op: AiOperation, data: unknown, actorId: string): Promise<RunReport>         // 52-54
```

- `run` throws `TypeError` if `operationId` fails `OPERATION_ID_PATTERN` or `userId` is not a lower-case UUID (11, 36-37).
- Class comment: "Never call `run` inside a caller's transaction" (13).

### 6.3 Types (`src/ai/ai.types.ts`)
- `AI_OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence'] as const` (3-4).
- `AiPurpose = 'learner' | 'test' | 'eval'` (9).
- `TransientReason = 'timeout' | 'connection' | 'rate-limited' | 'provider-error' | 'invalid-shape' | 'truncated' | 'busy'` (11).
- `PermanentReason = 'refused' | 'bad-input' | 'model-rejected' | 'auth-failed' | 'input-mismatch'` (12).
- `UnavailableReason = 'ai-disabled' | 'model-not-set' | 'provider-not-configured' | 'provider-quota' | 'daily-call-cap'` (13).
- `AiMeta = { operation; provider; model; effort: string | null; prompt_revision: number | null; schema_version: 1; replayed: boolean }` (20-28).

```ts
export type AiResult =
  | { status: 'succeeded'; operation_id: string; result: Record<string, unknown>; meta: AiMeta }
  | { status: 'in_progress'; operation_id: string }
  | { status: 'transient_failure'; operation_id: string; reason: TransientReason }
  | { status: 'permanent_failure'; operation_id: string; reason: PermanentReason }
  | { status: 'unavailable'; operation_id: string; reason: UnavailableReason; retry_after_seconds?: number };
export type AiReadiness = { ready: true } | { ready: false; reason: UnavailableReason; retry_after_seconds?: number };
```

### 6.4 Constants (`src/ai/ai.constants.ts`)
- `OPERATION_ID_PATTERN = /^[A-Za-z0-9._:#-]{1,100}$/` (46); `#` allows the `#2` suffix.
- `AI_SCHEMA_VERSION = 1` (5); `RESULT_TTL_MS = 86_400_000` (7).
- `DEFAULT_MAX_OUTPUT_TOKENS = { generate_cloze: 1200, lookup_word: 1200, translate_sentence: 800 }` (20).
- Copies of Content limits (57-69): `WORD_MAX 100, MEANING_MAX 300, LEMMA_MAX 100, SENTENCE_MAX 300, CONTEXT_LABEL_MAX 2000`.
- Output limits (72-75): `TRANSLATION_MAX 600, ACCEPTED_ANSWERS_MAX 5, ACCEPTED_ANSWER_MAX 100, LOOKUP_EXAMPLES_MAX 2`.

### 6.5 Runner, learner path (`src/ai/runner/runner.service.ts:88-177`)
- Budget `min(ai.callTimeoutSeconds*1000, deadlineMs)` (92).
- Steps: (1) look up `ai_operations` by `(userId, operationId)` → replay / input-mismatch / in-progress / reclaim / claim (102-111); (2) `validateInput` fails →
  `permanent_failure` `bad-input`, stored 24 h (114-126); (3) readiness (`readiness.service.ts:26-38`): `entitlements.aiEnabled`, model set, provider registered,
  `ai.dailyProviderCallsCap`; failure → `unavailable`, not stored; (4) claim the row; (5) at most 2 attempts within the concurrency queue, then `parseOutput`; (6)
  success or data-dependent permanent failure kept 24 h, anything else releases the row (162-175).
- Fingerprint: sha256 of `{operation, schema_version, data}` with sorted keys (`runner/fingerprint.ts:16-18`).
- `ai_operations` unique on `(user_id, operation_id)` (`prisma/models/ai.prisma:95-116`): **operation ids are one namespace per user across all operations.**

### 6.6 Operation definitions
- Framework (`src/ai/operations/define-operation.ts`): `OutputProblem = 'not-json' | 'shape' | 'blank-count' | 'too-long' | 'empty' | 'answers-count' |
  'answer-underscore' | 'pos'` (5). `define(spec)` (43-57): input zod `strictObject`; output exactly the declared keys, each a string or list of strings (30-41);
  then `normalizeAndCheck`. `clean` = remove control chars + trim, never changes case or escapes HTML (`text-rules.ts:24-25`). `textIn(min, max)` = string without
  `\0`, min..max code points (10-14). Registry `OPERATIONS: Record<AiOperation, OperationDefinition>` (`operations/operations.ts:9-13`); `parseOutput` (16-24).
- **`generate_cloze`** (`src/ai/operations/generate-cloze.ts:10-39`), schema `generate_cloze_v1`:
  - Input `{ word: 1..100; part_of_speech: AI_VALID_POS | 'unspecified'; level: 'A1'..'C2' | null; meaning_vi: 1..300; context_label: 1..2000 | null }`.
  - Output `{ sentence: string; accepted_answers: string[]; translation_vi: string }`.
  - Checks: `\n`/`\r` in sentence → `shape`; 3+ underscores → `___`; answers cleaned, de-duplicated case-insensitively; not exactly one `___` → `blank-count`;
    sentence > 300, translation > 600, answer > 100 → `too-long`; empty translation or answer → `empty`; answers outside 1..5 → `answers-count`; answer containing
    `_` → `answer-underscore`. Max output tokens 1200.
- **`lookup_word`** (`lookup-word.ts:11-46`), schema `lookup_word_v1` (pos is an enum in the schema):
  - Input `{ text: 1..100; context_sentence: 1..300 | null }`. Output `{ part_of_speech; lemma; meaning_vi; definition_en; examples: string[] }`.
  - Checks: pos cleaned, lower-cased; lemma > 100, meaning > 300, definition > 300, > 2 examples, example > 300 → `too-long`; any empty field or zero examples →
    `empty`; pos not valid → `pos`. Max output tokens 1200.
- **`translate_sentence`** (`translate-sentence.ts:7-19`): input `{ sentence: 1..300 }`, output `{ translation_vi }`; > 600 → `too-long`; empty → `empty`. Max output
  tokens 800.

### 6.7 Adding a new operation (all current touchpoints)
1. `AI_OPERATIONS` (`ai.types.ts:3`): drives `AiOperation` and the zod enums in `api/admin-ai-operations.controller.ts:9`, `admin-ai-prompts.controller.ts:9`,
   `admin-ai-eval.controller.ts:13,15`, `eval/eval-runs.service.ts:17`, `eval/eval-examples.service.ts:13`, `reports/reports.service.ts:82,95`,
   `models/models.service.ts:211`, `cli/ai-fake-call-args.ts:45`.
2. `DEFAULT_MAX_OUTPUT_TOKENS` (`ai.constants.ts:20`).
3. New `operations/<op>.ts` with `define({...})`, added to `OPERATIONS` (`operations.ts:9-13`; enforced by `Record<AiOperation, ...>`).
4. `INITIAL_PROMPTS` (`prompts/initial-prompts.ts:6`, `Record<AiOperation, ...>`); `initial-prompts.spec.ts:26-27` asserts the seed migration has the same text.
5. New migration: drop and re-add CHECK `ai_operation_settings_operation_check` (now `prisma/migrations/20261020071131_ai/migration.sql:224`; the only operation
   CHECK, other `operation` columns are plain TEXT); `INSERT INTO ai_operation_settings (operation, model_ref NULL, …, max_output_tokens, version 0)` (like lines
   235-238); `INSERT INTO ai_prompts` and `ai_prompt_revisions` (like `20261020072259_ai_initial_prompts`). `PromptsRepository.current` uses `findUniqueOrThrow`
   (`prompts/prompts.repository.ts:14-17`): a missing prompt row throws. `SelectionReader.load` returns null without a settings row → `model-not-set`
   (`runner/selection.ts:61-65`).
6. Fake adapter `okValue` switch on `<op>_v1` (`adapters/fake/fake.adapter.ts:15-31`); its default `{}` would fail the shape check.
7. CLI usage string (`cli/ai-fake-call-args.ts:8`).

### 6.8 Initial `generate_cloze` prompt (`src/ai/prompts/initial-prompts.ts:8-28`)

```
You write one English practice sentence for a Vietnamese learner of English.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning of the word, or null when the word has no level (a word the learner added).
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used (for example a field or a register), or null.

Task:
1. Write one natural English sentence that uses the word with the meaning in meaning_vi.
2. Replace the word in the sentence with one blank written as three underscores: ___
3. Give the forms that fill the blank and a Vietnamese translation of the whole sentence.

Rules:
- Exactly one blank. The rest of the sentence must make the missing word clear to someone who knows this meaning.
- When level is given, use words and grammar at or below that level.
- The word may be inflected to fit the sentence (for example "deploys" or "deployed").
- accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Do not list other words, even synonyms.
- translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
- The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

- Two examples (29-38): `deploy` (verb, B2) → `["deploy"]`; `book` (verb, A2) → `["booked"]`.
- Same text seeded in `prisma/migrations/20261020072259_ai_initial_prompts/migration.sql`, revision 1, `updated_by = AI_SYSTEM_ACTOR_ID`.

### 6.9 `generate_cloze` input vs what Practice can read today
- `PracticeSense` / `CandidateSense` (`src/content/practice/practice-senses.ts:9-20`): `lemma, gloss_vi (nullable), definition_en, context_label (null for private),
  examples, variants, accepted, inflections`. **No part of speech, no CEFR level.**
- `WordSense` from `ContentService.cardContent` (`content.service.ts:173-175`; `words.service.ts:13-18`) has both `pos` and CEFR `level`.
- `PracticeItem.level` from Learning is the review level (0–5), not CEFR (`src/learning/practice/practice-reads.service.ts:15-16`).
- `meaning_vi` is required non-null, but `gloss_vi` can be null and an English-native learner's private word stores its meaning in `definition_en`
  (`private-words.service.ts:55-58`).
- `accepted_answers` from the AI keep their case; they are not run through Practice's `normalizeAnswer`.

## 7. Entitlements (`src/entitlements/index.ts:1-6`)

- Exports: `EntitlementsModule`; `EntitlementsService` (+ `type EntitlementsSnapshot`, `type Feature`); `type AiPool`, `type Pool`; `refusalProblem`, `type
  Refusal`; `type ReserveResult`. `Decision` is **not exported** (`entitlements.service.ts:23`).

```ts
reserve(userId: string, pool: AiPool, operationId: string): Promise<ReserveResult>                         // 61-63
confirm(userId: string, pool: AiPool, operationId: string): Promise<{ state: 'confirmed' | 'released' | 'not-found' }>  // 65-67
release(userId: string, pool: AiPool, operationId: string): Promise<{ state: 'released' | 'confirmed' | 'not-found' }>  // 69-71
refund(userId: string, pool: AiPool, operationId: string, reportId: string): Promise<{ refunded: boolean }>  // 73-75
async check(userId: string, feature: Feature): Promise<Decision>                                              // 78-84
async checkQuota(userId: string, _pool: 'practice_sessions', tx?: Prisma.TransactionClient): Promise<Decision> // 90-103
async recordPracticeSession(tx, userId, sessionId, date: string): Promise<void>                              // 106-111
async snapshot(userId): Promise<EntitlementsSnapshot | null>; async aiUsage(date?): Promise<AiUsageView>
```

- `type Feature = 'practice.basic' | 'ai.practice' | 'ai.lookup'` (20). `Decision = { allowed: true } | ({ allowed: false } & Refusal)` (23). `FEATURE_POOL`:
  `ai.practice → ai_practice`, `ai.lookup → ai_lookup` (41).
- `ReserveResult = { state: 'reserved'; expires_at: string } | { state: 'confirmed' } | ({ state: 'refused' } & Refusal)` (`usage/usage-ledger.service.ts:18`).
- `Refusal = { reason: 'plan-required' } | { reason: 'quota-exhausted'; resets_at: string | null } | { reason: 'ai-unavailable'; retry_after_seconds: number | null
  }` (`refusal.ts:4-7`). `refusalProblem` (9-22): `plan-required` → 403 `entitlement-required`; `quota-exhausted` → 403 `quota-exhausted` + `resets_at`;
  `ai-unavailable` → 503 `ai-unavailable` + Retry-After.
- Pools (`entitlements.types.ts:3-14`): `Pool = 'practice_sessions' | 'ai_practice' | 'ai_lookup'`; `AiPool = Exclude<Pool, 'practice_sessions'>`; limit keys
  `practice_sessions_per_day`, `ai_practice_per_cycle`, `ai_lookup_per_cycle`. Free always has AI = 0 (`plan-numbers.ts`).
- Each of `reserve/confirm/release/refund` runs its own short transaction; comments say never call them inside a caller's transaction or while AI runs (60;
  `usage-ledger.service.ts:26-30`).
- `reserve` (`usage-ledger.service.ts:42-79`): an existing live row for the operation id returns its state (idempotent per (user, pool, operationId)); an expired
  reservation is released (`expired`) and retried. Refusal order (`ledger-rules.ts:17-37`): (1) `aiEnabled` false or cap 0 → `ai-unavailable` (no retry time); (2)
  limit 0 → `plan-required`; (3) used ≥ limit → `quota-exhausted` (cycle end); (4) global daily cap → `ai-unavailable` with seconds to the next Vietnam day
  (40-46). Inserts `status: 'reserved'`, `expires_at = now + RESERVATION_TTL_MS` (120_000, `entitlements.constants.ts:4`).
- `confirm`: `decideConfirm` table (49-60). `release`: reserved → released (`caller`); confirmed stays confirmed (120-134).
- `refund` (140-160): existing credit row for the operation → `{refunded: true}`; no anchor → false; confirmed − credits in the current cycle ≤ 0 → false; otherwise a
  credit row (`kind 'credit'`, `status 'confirmed'`, `note = reportId`).
- `check(feature)` for an AI feature is only `limits[pool] > 0` (not remaining quota, `aiEnabled` or the cap). `practice.basic` always allowed.
- `usage_records` (`prisma/models/entitlements.prisma:128-153`; migration `20261019094400_entitlements` :222-238): pool, kind, status CHECKed; live-use unique index
  `(user_id, pool, operation_id) WHERE kind='use' AND status IN ('reserved', 'confirmed')`; credit unique index `(user_id, pool, operation_id) WHERE kind='credit'`.

## 8. `@Idempotent()`
- Decorator (`src/common/idempotency/idempotent.decorator.ts:10-11`): `SetMetadata('idempotent', {timeoutSeconds: options?.timeoutSeconds ?? 30})`; paired with
  `@UseInterceptors(IdempotencyInterceptor)` everywhere.
- Interceptor (`idempotency.interceptor.ts:28-92`): requires `Idempotency-Key` (38-41) and `request.user` (43-46); hashes the body (48-55); calls
  `runIdempotent(prisma, {key, userId, endpoint: request.path, payloadHash}, handler, {timeoutSeconds})`.
- `runIdempotent` (`idempotency.service.ts:11-83`): `prisma.$transaction(async tx => {...}, {timeout: timeoutSeconds*1000, maxWait: 10_000})` (30, 80). Inside:
  `pg_try_advisory_xact_lock(hashtext(key:user:endpoint))` (`prisma/sql/tryAdvisoryLock.sql`), not acquired → 409 + Retry-After 2; row older than 24 h deleted;
  `succeeded`/`failed_permanent` → replay (400 on payload mismatch); `in_progress` → 409 `idempotency-key-abandoned`; else insert `in_progress`; **`await handler()`
  inside the transaction callback** (68), then update the row (69-77); races a client-side timeout (82).
- Meaning: the handler runs while the idempotency transaction is open (one pooled connection, the advisory lock, the uncommitted row); the handler gets no `tx`, so
  its own writes go through other connections and are **not** part of that transaction; a throwing handler rolls the idempotency row back; handler time counts
  against `timeoutSeconds`.
- Idempotent Practice endpoints: start session, answer, admin report resolve. Not idempotent: `next`, `current`, `skip`, `hint`, `continue`, `finish`, report create.
- Bước 6 delivery: "không gọi `ai.run` từ handler `@Idempotent()`" (`docs/deliveries/buoc-6.md:163`).
- Note (Claude, not from the survey): design `2026-10-20-buoc-0-3-fixes-design.md` D12 (approved 20/10, not yet built) changes this mechanism to "reserve
  (commit `in_progress`) → handler → write result, one connection at a time".

## 9. Settings (`src/settings/settings.definitions.ts`)

Groups `reminders, learning, practice, entitlements, content, ai`. API keys snake_case, stored camelCase (`FIELDS` 179-220). Defaults 44-59, bounds 62-112.
`SettingsService.get(db = this.prisma)` (`settings.service.ts:39`).

| Group | Key | Default |
|---|---|---|
| practice | `max_questions_per_session` | 20 |
| practice | `default_questions_per_session` | 10 |
| practice | `history_months` | 6 |
| practice | `true_false_true_percent` | 50 |
| practice | `idle_session_close_hours` | 24 |
| practice | `reports_per_hour` | 20 |
| practice | `hint_definition_max_chars` | 200 |
| practice | `type_word_max_retries` | null (no limit) |
| ai | `call_timeout_seconds` | 10 (bounds 3..30) |
| ai | `max_concurrent_calls` | 50 |
| ai | `daily_provider_calls_cap` | 3000 (null = no cap) |
| ai | `content_retention_days` | 7 |
| ai | `usd_vnd_rate` | 26100 |
| content | `private_words_per_user` | 10000 |
| content | `sentences_per_sense` | 20 |
| entitlements | `free_practice_sessions_per_day` | 3 |
| entitlements | `pro_practice_sessions_per_day` | 30 |
| entitlements | `pro_ai_practice_per_cycle` | 300 |
| entitlements | `pro_ai_lookup_per_cycle` | 100 |
| entitlements | `trial_ai_practice_per_cycle` | 300 |
| entitlements | `trial_ai_lookup_per_cycle` | 100 |
| entitlements | `grace_days` | 7 |
| entitlements | `trial_reminder_days_before` | 2 |
| entitlements | `renewal_notice_days_before` | null |
| entitlements | `ai_enabled` | true |
| entitlements | `ai_daily_cap` | 1000 |
| entitlements | `ai_cap_alert_percent` | 75 |
| entitlements | `ads_enabled` | false |
| entitlements | `ads_interstitial_per_day` | 3 |
| entitlements | `ads_min_interval_minutes` | 10 |

The AI switch (`ai_enabled`) and the unit cap (`ai_daily_cap`) are in **entitlements**; the provider call cap (`daily_provider_calls_cap`) is in **ai**.
`ReadinessService` reads both (`readiness.service.ts:29, 33`).

## 10. Native language
- `users.native_language`, TEXT nullable (`prisma/models/identity.prisma:6`); API `z.enum(['vi','en']).optional()` (`src/identity/profile/profile.schemas.ts:4`);
  `IdentityService.getProfile` returns it (`identity.service.ts:13, 32`).
- Read on every learner-content request by `LearnerContentGuard` (`src/content/learner/learner-content.guard.ts:15-25`): null → 403 `profile-incomplete`; sets
  `request.learner = {userId, nativeLanguage}` (type `Learner`, line 6), exposed by `@CurrentLearner()` (`learner.decorator.ts:9-11`).
- Practice: `SessionsController` uses `@LearnerContent()`, `@CurrentLearner()` (28, 36, 41, 48); `SessionsService` passes `learner.nativeLanguage` to
  `builder.availability` (89) and `builder.build` (289) → `ContentService.practiceSenses` / `practiceCandidates(viewerId, ids, nativeLanguage)` →
  `senseMeaning(gloss_vi, definition_en, nativeLanguage)` (`src/content/words/words.service.ts:50-55`): `vi` learner with a gloss → the `vi` gloss; otherwise
  `definition_en` (language `en`) when present, else the gloss (language `vi`, `translation_missing` true for `en` learners).
- Not stored per session or question: `practice_sessions` has no language column; read again on each request; `continue` and `finish` only take `userId`
  (controller 60, 67).
- Quick-add stores the private meaning in `learner.nativeLanguage` (`quick-add.service.ts:69`).
