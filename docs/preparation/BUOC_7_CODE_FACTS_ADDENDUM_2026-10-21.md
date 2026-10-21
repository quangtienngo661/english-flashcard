# Bước 7 — Code facts addendum (apps/api, 47ca600 → origin/dev 985531b, 2026-10-21)

> Re-check of every fact in `BUOC_7_CODE_FACTS_2026-10-20.md` against `origin/dev` @ **985531b** (fetched 2026-10-21; merge of PR #101). Read with
> `git show origin/dev:<path>`, `git diff 47ca600 origin/dev`, `git grep origin/dev`; nothing checked out, nothing built or run. Facts only, no proposals.
> Paths relative to `apps/api/` unless they start with `docs/`. Line numbers are at 985531b.
>
> Status: **UNCHANGED** = read on dev and found the same (line numbers may have moved; the new ones are given); **CHANGED** = old → new;
> **GONE** = no longer in the code.

What landed between the two commits: PR #97 (plan of the Bước 0–3 fixes, docs only) and PR #98–#101 (milestones M1–M4 of that plan). In `apps/api`:
118 files, +3955 / −419 (`git diff --stat 47ca600 origin/dev -- apps/api`). **`src/ai/**` and `src/settings/**` have no diff at all**
(`git diff --quiet 47ca600 origin/dev -- apps/api/src/ai` and `-- apps/api/src/settings` both exit 0).

## Tóm tắt thay đổi

Most relevant for an AI practice / lookup design first.

1. **`@Idempotent()` now works as D12 says (M1, PR #98, commits c7ef7fc, 5e71071).** The claim (`in_progress`) is committed in a short transaction of its
   own, the handler runs **outside any transaction**, and the result is written by a separate `updateMany`. A request holds at most one connection at a
   time. `timeoutSeconds` is now a **lease**, not a timeout: the `Promise.race` timer is gone. A retry while the claim is younger than the lease gets 409
   "Request already in progress" + `Retry-After: 2`; past the lease it gets 409 `idempotency-key-abandoned`.
2. **The question builder now reads through the session transaction.** `advance()` passes `db: tx` to `builder.build`, and every Content and Learning
   read in `next()` / `current()` goes through `tx` (same connection, inside the 15 s transaction). Before, they used the global client (a second
   connection) while the transaction was open.
3. **`start()` reads before the transaction.** Entitlement check, source items, stats and the availability walk moved out of the transaction (and
   out of `withPracticeLock`). The 30 s `startTransaction` constant is gone; `start` now uses the same `{timeout: 15_000, maxWait: 10_000}`.
4. **Grading:** `normalizeAnswer` now also drops trailing `.`, `!`, `?` (`[.!?]+$`). Applied both when `accepted` is built and when an answer is
   typed. No migration rewrites `answer_key` of questions already stored.
5. **Masking:** `maskExample` was rewritten (digits are part of tokens; possessive `'s` / `'` masks only the stem; `.` after `mr`, `dr`, `etc`… does not
   start a sentence; a multi-word form must have exactly its own separators between words; a form ending in punctuation like `a.m.` takes it along;
   a variant equal to a dotted lemma without dots is ignored).
6. **Distractors:** a new Content read `practiceLemmaMeanings(viewerId, lemmas, nativeLanguage, db?)` returns every visible meaning per lower-cased
   lemma; `eligibleCandidates` takes it as a 4th argument and also drops a candidate when any other visible sense of either lemma shares a sub-meaning.
7. **Entitlements:** `check(userId, feature, tx?)` gained an optional `tx`. Nothing else in Entitlements changed (ledger, refusal order, refund).
8. **Users:** new columns `given_name`, `family_name`, `birth_date`, `terms_accepted_at`, `terms_version`, `locked_at`, `locked_by`, `lock_reason`
   + CHECK `status IN ('active','locked')`. `Profile` now returns `given_name`, `family_name`, `birth_date`. Registration requires `given_name`,
   `birth_date`, `accept_terms: true`. The `Learner` passed to Practice is still only `{userId, nativeLanguage}`.
9. **Content audit columns** (`sense_revisions.reviewed_by/reviewed_at/published_by`, `senses.state_changed_by/state_changed_at`); private words write
   `publishedBy` / `stateChangedBy` = owner. The `form_of` base is now checked with `SELECT … FOR SHARE`.
10. **Lookup SQL** rewritten for speed (starts from the viewer's entries, `CROSS JOIN LATERAL … OFFSET 0`) + 4 new indexes; the `GET /v1/lookup`
    response shape is the same.
11. **DB pool** is explicit: env `DATABASE_POOL_MAX` (default 20) and `DATABASE_POOL_TIMEOUT_MS` (default 5000), passed to `PrismaPg` as `max` and
    `connectionTimeoutMillis`. New required env `TERMS_VERSION` (`nonEmpty`, no default).

Unchanged and verified: the whole AI gateway, all settings keys and defaults, Practice JSON shapes and `practice.prisma`, type-choice rules,
hints, reports (and no caller of `refund` in Practice), quick-add, context sentences, inflections service, native-language guard.

## Status of the Bước 0–3 fixes plan on dev

Plan `docs/superpowers/plans/2026-10-20-buoc-0-3-fixes.md` (27 tasks, 5 milestones) and its summary `docs/deliveries/buoc-0-3-fixes.md` are on dev
(PR #97). The delivery record on dev holds only the "plan tóm tắt"; no as-built section yet.

| Milestone | Tasks | On dev? | Evidence (`git log --oneline <merge>^1..<merge>^2`) |
|---|---|---|---|
| M1 Foundation | 1 pool (T16), 2 idempotency (C1/D12), 3 reads in tx (PX4), 4 log 500 (C3), 5 time zones (C2), 6 lookups (T5) | **Merged**, PR #98 → 123d856 | 0b45655 (T1), c7ef7fc + 5e71071 (T2), 83a1a0f + 2b90f9a (T3; 2b90f9a also covers the next-question path, beyond the 3 sites the plan named), 44355cd (T4), 414795a + 3e3b9d9 (T5), 9c8623c (T6), 9e5a7a8 (docs) |
| M2 Accounts | 7–13 | **Merged**, PR #99 → 8993d26 | d0e9def (7), d048bd6 (8), 9f8ab7b + ae09c2f (9), f649523 (10), 410d406 (11), b4e9e28 + 4035be9 + bff0dc8 (12), e4f3cb0 + b9666c4 (13) |
| M3 Content | 14–20 | **Merged**, PR #100 → e465c8a | c6c868b + e440cd3/68abada (14), 58a5cef + e4078cc (15), 9b628a9 + 3d38b5b + 8951dfe (16), 4327ecc + 10fafaa + 71b664a (17), dec4833 (18), b68126c (19), b3629e6 + 8cfd41d (20) |
| M4 Admin session | 21–24 | **Merged**, PR #101 → 985531b | 8459e1c (21), ce0e798 + 93e05af + 4af72d0 + 371a891 + 2db0a5a (22), a77631d (23), 0a98016 (24) |
| M5 Smoke, cleanup, records | 25 smoke, 26 remove 3 e2e files, 27 records | **Not merged.** PR #102 (`test/buoc-0-3-m5-smoke` → `dev`) is OPEN (`gh pr list`, 2026-10-21) | `git merge-base --is-ancestor origin/test/buoc-0-3-m5-smoke origin/dev` → not an ancestor. On dev: no `scripts/smoke-buoc-0-3-fixes.mjs`, no `smoke:buoc-0-3-fixes` in `package.json`; the 3 files are still there (`src/common/idempotency/idempotency.interceptor.e2e-spec.ts`, `idempotency.service.e2e-spec.ts`, `src/common/rate-limit/rate-limit.guard.e2e-spec.ts`) |

So the design's "Xong khi" (smoke on a fresh DB, output file) has **not** run on dev yet; C1 is merged with unit tests only (design §11 risk 1).

### D12 in code (quotes, `src/common/idempotency/`)

- Design D12 (`docs/superpowers/specs/2026-10-20-buoc-0-3-fixes-design.md:67, 265-285`): short tx 1 (advisory lock → read → insert `in_progress` → COMMIT)
  → handler in its own transaction → short tx 2 (`UPDATE … succeeded` or `DELETE` on throw); "Mỗi request giữ tối đa một connection mỗi lúc".
- `idempotency.service.ts:17-21` (comment): "claim the key in a short transaction, run the handler outside any transaction, then record the result in a
  separate write, so a request holds at most one connection at a time."
- `idempotency.service.ts:35-55`: `prisma.$transaction(async (tx) => { tryAdvisoryLock … decideClaim(row, {payloadHash, now: claimedAt, leaseSeconds}) …
  tx.idempotencyKey.create({ data: { ...scope, status: 'in_progress', … } }) }, { maxWait: 10_000 })` — no `timeout` option on this transaction.
- `idempotency.service.ts:59-61`: a unique violation (P2002) on the insert → `{kind: 'conflict', retryAfterSeconds: 2}`.
- `idempotency.service.ts:72`: `response = await handler();` — after the claim transaction returned, inside no transaction.
- `idempotency.service.ts:76`: on throw `prisma.idempotencyKey.deleteMany({ where: claimed }).catch(() => undefined)`, then rethrow (5e71071).
- `idempotency.service.ts:81-89`: `prisma.idempotencyKey.updateMany({ where: claimed, data: { status: 'succeeded', responseStatus, responseBody, updatedAt } })`.
- `claim-decision.ts:20-23`: `in_progress` → `row.createdAt.getTime() > leaseStart ? { kind: 'conflict', retryAfterSeconds: 2 } : { kind: 'abandoned' }`.
  The design text says `updated_at`; the code compares `createdAt` (both are set to `claimedAt` on insert, service :50-52).
- `idempotency.interceptor.ts:65`: `{ leaseSeconds: timeoutSeconds }` (was `{ timeoutSeconds }`). Mapping of results to HTTP (409 / 409 abandoned / 400)
  unchanged (:66-89).
- `idempotent.decorator.ts:6-9`: "A lease, not a timeout … It never stops the handler; a handler that runs past it still records its result."
- `failed_permanent` is still never written (only read for replay, `claim-decision.ts:24`), as the design says (FD8 out of scope).

---

## Tóm tắt facts 1–14

| # | Status | Evidence on dev |
|---|---|---|
| 1 Question building | **CHANGED** | `next()` / `current()` still `lockOpen` → `advance()` → `builder.build()` → `practiceQuestion.create` + `practiceSessionItem.create` in one `$transaction` with `transactionOptions = { timeout: 15_000, maxWait: 10_000 }` (`src/practice/sessions/sessions.service.ts:18, 119-126, 131-139, 290-309`). **Old:** "the builder reads Content through its own client, outside the transaction". **New:** `builder.build({ …, db: tx })` (:294) and `ContentService.practiceSenses/practiceCandidates/practiceLemmaMeanings` use `db ?? this.prisma` (`src/content/content.service.ts:182-196`); Learning reads also take `tx` (:247, :223-224); comment :232 "Every read goes through `tx`". `current()` can still build (unchanged rule :255-261). |
| 2 Type choice | **UNCHANGED** (rules) / CHANGED (eligible count input) | `availableTypes`, `chooseType`, `typingStyle` byte-identical (`src/practice/questions/question-types.ts:9-29`; quote :13 `return eligibleCount >= (type === 'mcq_definition' ? MCQ_OPTIONS - 1 : 1);`). MCQ / true-false still store `promptStyle: 'meaning'` (`question-builder.service.ts:92, 104`). The number of eligible distractors is now computed with the extra lemma-meanings filter (fact 1.7 below), so fewer words may reach 3 / 1. |
| 3 Schema columns | **UNCHANGED** | `practice.prisma` no diff; `:38 schemaVersion Int @map("schema_version")`; literal `schemaVersion: 1` at `sessions.service.ts:299`. `git grep -i -E "operation_?id|\bmeta\b"` over `src/practice` + `practice.prisma` on dev: 0 hits (control: `schema_?[vV]ersion` → 2 hits). |
| 4 Grading | **CHANGED** | `normalizeAnswer` gained `.replace(/[.!?]+$/, '')` after the whitespace collapse (`src/practice/grading/normalize.ts:7`). Exact match unchanged (`:19-21`). `blank` still not read in grading. `type_word_max_retries` default still `null` (`settings.definitions.ts:49`). |
| 5 Reports | **UNCHANGED** | `reports.service.ts`, `reports.controller.ts`, `admin-reports.controller.ts`, `snapshot.ts` no diff. `reports.service.ts:13-14` `ReportReason = 'meaning_wrong' \| 'graded_wrong' \| 'hint_wrong' \| 'other'`, `ReportStatus = 'open' \| 'no_error' \| 'fixed'`; resolve `:123-132`. `git grep -n "refund(" origin/dev -- apps/api/src` (non-spec): only `cli/fake-ai-args.ts:63`, the wrapper `entitlements.service.ts:73-74`, the ledger `usage-ledger.service.ts:140`, and an unrelated billing `subscription-machine.ts:100`. |
| 6 Lookup chain | **UNCHANGED** (contract) / CHANGED (SQL) | Route and schema files no diff; `lookup()` returns `{ senses, via_inflection: viaInflection }` (`src/content/words/words.service.ts:144-155`). SQL now runs with `byEntry = true` (:145-149; `senses()` :84-89). No AI step: `git grep -i -E "ai_lookup\|ai\.lookup\|ai_practice\|ai\.practice\|Bước 7\|from '../../ai\|from '../ai"` over `src/{content,learning,practice,identity}` → 0 hits; control `ai_lookup` in `entitlements/entitlements.types.ts:3` → hit. Outside `src/ai`, only `app.module.ts` and `cli/ai-fake-call*.ts` import `AiService`/`AiModule`. |
| 7 Private words | **UNCHANGED** (behaviour listed) | Cap `privateWordsPerUser` 10000 (`settings.definitions.ts:57`); still `examplesEn: []` (`src/content/private/private-words.service.ts:157`); `en` learner → `definitionEn` only (:55-58). New: writes `publishedBy: ownerId` and `stateChangedBy/At` (:108, :113-115). |
| 8 Context sentences | **UNCHANGED** | Sentences files no diff; limit check `sentences.service.ts:33, 41-44`. `practiceSenses` still selects only `r.examples` (`practice-senses.ts:63`). Model moved to `prisma/models/content.prisma:180-192`. |
| 9 Inflections | **UNCHANGED** (data, functions) / CHANGED (`maskExample`) | `inflections.service.ts`, `inflect.ts` no diff; still no "all forms of an entry" function. `practiceSenses().inflections` at `practice-senses.ts:66-68, 78`. `maskExample` rewritten (`src/content/practice/mask-example.ts:44-101`, see §5). `form_of` still used only to exclude distractors (`distractors.ts:59`). |
| 10 AI gateway | **UNCHANGED** | No diff under `src/ai`. `ai.service.ts:31-35` `async run(op: AiOperation, data: unknown, options: { operationId: string; userId: string; purpose: 'learner'; deadlineMs?: number })`; `ai.constants.ts:46` `OPERATION_ID_PATTERN = /^[A-Za-z0-9._:#-]{1,100}$/`. No new migration touches `ai_*` tables. |
| 11 `generate_cloze` input vs Practice data | **UNCHANGED** | `PracticeSense` / `CandidateSense` still have no `pos` and no CEFR level (`practice-senses.ts:12-23`); `WordSense` still has `pos`, `level` (`words.service.ts:13-18`); `PracticeItem.level` still the review level (`learning/practice/practice-reads.service.ts:15-16`). |
| 12 Entitlements | **CHANGED** (one signature) | `check(userId, feature, tx?: Prisma.TransactionClient)` (`entitlements.service.ts:81-87`), still only `limits[pool] > 0` (:86). `reserve/confirm/release/refund` unchanged (:60-75); `usage-ledger.service.ts`, `ledger-rules.ts`, `refusal.ts`, `entitlements.constants.ts` no diff (`RESERVATION_TTL_MS = 120_000`, :4). |
| 13 `@Idempotent()` | **CHANGED** | See "D12 in code" above. Old: handler inside the idempotency transaction callback, holding an xact advisory lock and a connection, raced against a timer. New: handler outside any transaction; lock released when the claim commits; lease semantics. `docs/deliveries/buoc-6.md:163` still says "không gọi `ai.run` từ handler `@Idempotent()`" (that doc did not change). |
| 14 Native language | **UNCHANGED** | `identity.prisma:6` `nativeLanguage String? @map("native_language")`; `learner-content.guard.ts` no diff (:19-23 read profile, 403 `profile-incomplete`, `request.learner = { userId, nativeLanguage }`). Not on the session. New user columns: §10. |

## 1. Sinh câu hỏi Practice

### 1.1 Endpoints

| Fact | Status | Evidence |
|---|---|---|
| `POST /v1/practice/sessions` `@Idempotent()` + interceptor + `@RateLimit('user.write')` | UNCHANGED | `sessions.controller.ts` no diff; :32-38 |
| `GET …/current` not idempotent | UNCHANGED | :40-43 |
| `POST …/:id/next` `@HttpCode(200)`, `@RateLimit('practice.answer')`, not `@Idempotent` | UNCHANGED | :45-50 |
| `:id/continue`, `:id/finish`; class `@LearnerContent()` | UNCHANGED | :28, :52-68 |

### 1.2 `start()`

| Fact | Status | Evidence |
|---|---|---|
| `count` ≤ `maxQuestionsPerSession`, else 400 | UNCHANGED | `sessions.service.ts:57-61` |
| Early `checkQuota('practice_sessions')` outside the transaction | UNCHANGED | :65-66 |
| `startTransaction = {timeout: 30_000, maxWait: 10_000}` | **GONE** | Constant removed; `start` ends with `}, transactionOptions);` (:112), i.e. `{timeout: 15_000, maxWait: 10_000}` (:18) |
| `withPracticeLock` inside the transaction | UNCHANGED | :96 |
| `assertEntitled` inside the transaction | **CHANGED** | Now before the transaction: `await this.assertEntitled(learner.userId);` (:70) |
| Source items + availability walk (batches of 50) inside the transaction | **CHANGED** | Now before the transaction and outside the practice lock (:71-94); comment :67-69 (PX4): a word that stops being visible before commit is dropped later by `build` (`not-visible`) |
| Abandon open sessions, `checkQuota(…, tx)`, create row; `promptStyle` default `'mixed'` | UNCHANGED | :98-100, :103-104, :105-110 (`promptStyle: input.prompt_style ?? 'mixed'` :108) |
| No question built at start | UNCHANGED | :95-112 creates only the session row |

### 1.3 `current()`

| Fact | Status | Evidence |
|---|---|---|
| `closeIfIdle(userId, null)` own statement | UNCHANGED | :116, :168-178 (now `settings.get()` at :169, global client, before the transaction) |
| Open session found outside the transaction; 404 | UNCHANGED | :117-118 |
| `$transaction(transactionOptions)` → `lockOpen` → `advance(…, false)` → `view` | UNCHANGED | :119-126 |
| `build=false` → `{state:'none'}` when no pending item and no notice | UNCHANGED | :259-261 |
| Voided pending item or pending notice → builds and writes a new question | UNCHANGED | :237-240, :255-258 fall through to :290-310 |

### 1.4 `next()`

| Fact | Status | Evidence |
|---|---|---|
| `closeIfIdle`, then `$transaction`: `lockOpen` → `advance(…, true)` → `view` | UNCHANGED | :129-140 |
| `NextResult` `question \| waiting_continue \| finished` + optional notice | UNCHANGED | :27-31 |

### 1.5 `lockOpen`

| Fact | Status | Evidence |
|---|---|---|
| `SELECT id FROM practice_sessions WHERE id=… AND user_id=… FOR UPDATE`; missing → 404 | UNCHANGED | :192-197 |
| Not in `OPEN` → 409 `session-closed` | UNCHANGED | :20, :39, :183 |
| `touch` updates `last_activity_at` | UNCHANGED | :188-190 |
| `next` / `current` do not take `withPracticeLock`; only `start` and `ReportsService.create` | UNCHANGED | `git grep "withPracticeLock("`: `reports.service.ts:54`, `sessions.service.ts:96` only |
| `AnswersService.locked`: `lockOpen`, then item `FOR UPDATE`, tx 10 s / 5 s | UNCHANGED | `answers.service.ts:15, 151-163` |

### 1.6 `advance()` (`sessions.service.ts:234-319`)

| Step | Status | Evidence |
|---|---|---|
| 1 pending notice → `'word-not-found'`, column cleared | UNCHANGED | :237-240 |
| 2 `waiting_continue` → return | UNCHANGED | :241 |
| 3 items with questions by position; first `result === null` | UNCHANGED | :242-245 |
| 4 group gone → void, finish, `'group-not-found'` | CHANGED (read path only) | `this.learning.practiceCheck(userId, session.senseIds[0], session.groupId, tx)` (:247) |
| 5 `usable` | CHANGED (read path only) | `usable(tx, …)` → `learning.practiceItems(…, tx)` (:221-227, :254) |
| 6 pending kept / voided / `none` | UNCHANGED | :255-261 |
| 7 answered ≥ target → finish | UNCHANGED | :263-267 |
| 8 round planning | UNCHANGED | :268-284 |
| 9 `assertEntitled`, `settings.get()` | CHANGED (read path only) | `assertEntitled(userId, tx)` (:286) → `entitlements.check(…, tx)` (:206); `settings.get(tx)` (:287) |
| 10 `builder.build({…})`; `'skip'` → next sense | CHANGED | Same inputs plus `db: tx` (:290-295); skip :296 |
| 11 `tx.practiceQuestion.create` (fields incl. `schemaVersion: 1`) | UNCHANGED | :298-302 |
| 12 `tx.practiceSessionItem.create` with `maxRetries: practice.typeWordMaxRetries` | UNCHANGED | :303-310 |
| 13 nothing built → `waiting_continue` or finish | UNCHANGED | :313-318 |
| Builder reads Content via `this.prisma`, not `tx`, while the transaction is open | **CHANGED** | `content.service.ts:182-196`: `practiceSenses(db ?? this.prisma, …)`, `practiceCandidates(db ?? this.prisma, …)`, `practiceLemmaMeanings(db ?? this.prisma, …)`; `QuestionBuilder` passes `db` everywhere (`question-builder.service.ts:47-53, 66-72`). In `next`/`current` this is the session `tx`. |
| Bước 6 delivery line "Tách lời gọi AI ra khỏi transaction của `next()` và `current()`" | UNCHANGED | `docs/deliveries/buoc-6.md:163` |

### 1.7 `QuestionBuilder` (`src/practice/questions/question-builder.service.ts`)

| Fact | Status | Evidence |
|---|---|---|
| `availability`: `need` = 3 / 1 / 0; group mates, candidates, `availableTypes` | CHANGED | :43-63; new optional `db` (:45); when `need > 0` it also loads `practiceLemmaMeanings` for every loaded lemma (:52-54) and passes it to `eligibleCandidates(asked, candidates, need, meanings)` (:60) |
| `build`: `not-visible`, mates → candidates → eligible, `no-type`, `chooseType` | CHANGED | :65-76; adds `practiceLemmaMeanings(userId, [sense.lemma, ...pool.map(c => c.lemma)], …)` (:72) and `eligibleCandidates(sense, pool, Infinity, meanings)` (:73) |
| `availableTypes` / `chooseType` / `typingStyle` rules, `MCQ_OPTIONS = 4`, `SENTENCE_SHARE = 0.5` | UNCHANGED | `question-types.ts:9-29`; `practice.constants.ts:10, 12` |
| `eligibleCandidates` filters | **CHANGED** | `distractors.ts:48-68`: new parameter `meanings: LemmaMeanings = new Map()`; extra drops: `(meanings.get(lemma) ?? []).some((m) => sameMeaning(asked, m))` (:62) and `askedMeanings.some((m) => sameMeaning(m, candidate))` (:63). `form_of` exclusion now :59 |
| Masked examples `sense.examples.flatMap(ex => maskExample(ex, {lemma, variants, inflections}) ?? [])` | UNCHANGED (call) | :78-79 (the function itself changed, §5) |
| MCQ (`'meaning'`, 4 shuffled lemmas, `correct_index`, `option_private`) | UNCHANGED | :88-99 |
| True/false (`trueFalseTruePercent`, `context_label: null`) | UNCHANGED | :100-113 |
| `type_word` sentence: `takesAll`, `accepted`, prompt `type_sentence`, `blank` | UNCHANGED | :114-125 (`takesAll` :118, `accepted` :119) |
| `type_word` meaning: `accepted = normalizedSet([lemma, ...sense.accepted])` | UNCHANGED (code) | :126-132; `normalizedSet` :136 now applies the new `normalizeAnswer` (§2.2) |

### 1.8 Enum / union values

| Fact | Status | Evidence |
|---|---|---|
| All values in the table (question type, prompt styles, session types/status/source/sort, item result, review action, `pending_notice`, `MeaningLanguage`) | UNCHANGED | `practice.types.ts` and `practice.prisma` no diff; no new migration touches `practice_*` (the 3 new migrations are listed in §New migrations) |

### 1.9 JSON shapes

| Fact | Status | Evidence |
|---|---|---|
| `Prompt`, `AnswerKey`, `Hints`, `Blank` | UNCHANGED | `practice.types.ts` no diff |
| `buildHints`; `level2` only for `type_word` | UNCHANGED | `hints.ts` no diff (:20 `export function buildHints(input: HintInput): Hints {`) |
| `ItemView` without answer key / hint texts; `reportable = !answerKey.asked_private` | UNCHANGED | `session-views.ts:16, 39` |

### 1.10 `schema_version` / `operation_id` / `meta`

| Fact | Status | Evidence |
|---|---|---|
| `schema_version INT NOT NULL`, literal `1`, no constant | UNCHANGED | `practice.prisma:38`; `sessions.service.ts:299` |
| `practice_questions` columns | UNCHANGED | `practice.prisma:30-48` |
| No `operation_id` / `meta` in Practice | UNCHANGED | grep 0 hits (fact 3) |
| Hourly cleanup; private-word delete cascade | UNCHANGED | `practice-cleanup.service.ts`, `private-senses-cleanup.provider.ts` no diff |

## 2. Chấm điểm

### 2.1 Answer endpoint and service (`src/practice/answers/answers.service.ts`)

| Fact | Status | Evidence |
|---|---|---|
| `POST /v1/practice/items/:id/answer` `@Idempotent`; body shapes | UNCHANGED | `answers.controller.ts` no diff |
| MCQ / true-false / `type_word` grading, `try_again` rule, 400 `validation-failed` | UNCHANGED | :61-79 (quote :71 `if (!correct && (item.maxRetries === null \|\| item.tries < item.maxRetries)) {`) |
| `writeFinal` single place; `recordPracticeSession(tx, …)` | CHANGED (read path only) | :114-127; profile read now `this.identity.getProfile(item.userId, tx)` (:115); `recordPracticeSession` :125 |
| `skip`, `hint`, `correctOf` | UNCHANGED (logic) | :89-100, :102-111, :28-35; `assertUnanswered(tx, …)` and `resultOf(…, tx)` now read Learning through `tx` (:56, :84, :133-136, :165-167) |
| Handler under `@Idempotent` runs inside the idempotency transaction | **CHANGED** | Now runs after the claim committed, outside it (§D12); the answer's own transaction is `{timeout: 10_000, maxWait: 5_000}` (:15) |

### 2.2 Normalization (`src/practice/grading/normalize.ts`)

| Fact | Status | Evidence |
|---|---|---|
| `normalizeAnswer`: NFC, trim, `\s+` → space, quotes, lower case | **CHANGED** | :2-11; new step :7 `.replace(/[.!?]+$/, '')` (after the whitespace collapse, before the quote replacements); comment :1 "trailing . ! ? dropped" |
| `answerLength` | UNCHANGED | :14-16 |
| `matchesAnswer` exact match | UNCHANGED | :19-21 |

### 2.3 Accepted answers

| Fact | Status | Evidence |
|---|---|---|
| `accepted` fixed at build time via `normalizedSet` | UNCHANGED (mechanism) | `question-builder.service.ts:136`. Consequence of §2.2: questions stored before 985531b keep `accepted` normalized by the old rule (no migration touches `practice_questions.answer_key`) |
| `sense.accepted` = accepted variants + `accepted_forms` − lemma | UNCHANGED | `practice-senses.ts:76-77` |
| Inflected forms not accepted for meaning prompts; sentence prompt rule | UNCHANGED | `question-builder.service.ts:118-119, 129` |
| `blank` not read when grading | UNCHANGED | grading reads only `key.accepted` (`answers.service.ts:68`) |
| `max_retries` snapshot, default `null` | UNCHANGED | `sessions.service.ts:306`; `settings.definitions.ts:49` |

## 3. Practice reports

| Fact | Status | Evidence |
|---|---|---|
| Table columns | UNCHANGED | `practice.prisma` no diff |
| Reasons / statuses | UNCHANGED | `reports.service.ts:13-14` |
| Learner create (201, unique `item_id`, `withPracticeLock`, 409s, 429, snapshot) | UNCHANGED | `reports.controller.ts`, `reports.service.ts:50-93`, `snapshot.ts` no diff; lock :54 |
| Staff list / resolve, `@RequirePermission('content.edit')` | UNCHANGED | `admin-reports.controller.ts:20-21` `@Controller('admin/practice/reports')` / `@RequirePermission('content.edit')`; resolve `reports.service.ts:123-132` (`updateMany` where `{ id: reportId, status: 'open' }`, 409 `report-not-open` :130) |
| No refund / notification / content change on resolve | UNCHANGED | same lines |
| Only `refund(` caller is the dev CLI | UNCHANGED | `cli/fake-ai-args.ts:63` (file no diff) |

## 4. Content: private words, context sentences, lookup chain

### 4.1 Private words (`src/content/private/private-words.service.ts`)

| Fact | Status | Evidence |
|---|---|---|
| `entries.scope` + `owner_user_id`; two partial unique indexes | UNCHANGED | `content.prisma:47-48, 60-62` |
| Create via quick-add → `createPrivateSense` | UNCHANGED (flow) | `content.service.ts:149-150`; `createPrivateSense` now :124-172 |
| Limit 10000 under owner lock | UNCHANGED | :126, :131, :143-145 |
| `vi` → `gloss_vi`, `en` → `definition_en` | UNCHANGED | :55-58 |
| Inflections `generateInflections(lemma, pos)`, source `library` | UNCHANGED | :148 |
| Internal labels `p2`, `p3`… | UNCHANGED | :151-155 |
| Revision published at once, `draftSource: 'user'`, `examplesEn: []` | UNCHANGED (+ new audit fields) | :157 `examplesEn: []`; :108 now also `publishedBy: ownerId`; :113-115 `stateChangedBy: ownerId, stateChangedAt: now` |
| `form_of` base check | **CHANGED** | Was `tx.entry.findFirst(…)`; now raw `SELECT id FROM entries WHERE id = … AND (scope = 'catalog' OR (…owner…)) FOR SHARE` (:133-138), comment FE22 (blocks a concurrent batch revert) |
| Level user / derived; `catalogMatch` | UNCHANGED | :160-165, :167-171 |
| Edit `PATCH /v1/my-words/:id` | UNCHANGED | `my-words.controller.ts`, `my-words.schemas.ts` no diff; `updatePrivateWord` now :174 |
| Delete `DELETE /v1/my-words/:id` → `deleteMyWord` | UNCHANGED | `quick-add.service.ts:86-95` (no diff) |
| Visibility `visibleSenseCondition` | UNCHANGED (+ new helper) | `visible-senses.ts:9-15` unchanged; new `visibleEntryCondition(entryAlias, viewer)` (:17-24) used by `words.service.ts` and `practiceLemmaMeanings` |

### 4.2 Context sentences

| Fact | Status | Evidence |
|---|---|---|
| Table `context_sentences(id, user_id, sense_id, text, created_at)`, index `(user_id, sense_id)` | UNCHANGED | `content.prisma:180-192` (lines moved) |
| Add / delete routes, 1..300, `@Idempotent`, quick-add path | UNCHANGED | `sentences.controller.ts`, `sentences.service.ts`, `quick-add.service.ts:76-77` no diff |
| Limit 20 under lock `content.sentences:<user>:<sense>`, 409 `sentence-limit-reached` | UNCHANGED | `sentences.service.ts:33, 41-44`; `settings.definitions.ts:57` |
| Read `listSentences` used by Learning queue | UNCHANGED | `content.service.ts:165-166`; `queue.service.ts` no diff |
| Not used by Practice | UNCHANGED | `practice-senses.ts:63` selects `r.examples`; no `listSentences` call in `src/practice` |

### 4.3 Lookup chain

| Fact | Status | Evidence |
|---|---|---|
| `GET /v1/lookup?q=`, `q` NFC/trim/lower 1..100 | UNCHANGED | `words.controller.ts`, `words.schemas.ts` no diff |
| `lookup()` senses by lemma or variant, `via_inflection` via `entriesByForm` | UNCHANGED (result) / CHANGED (SQL) | `words.service.ts:144-155`; all three reads pass `byEntry = true`, which makes `senses()` start `FROM entries e CROSS JOIN LATERAL (SELECT * FROM senses s WHERE s.entry_id = e.id AND … OFFSET 0) s` (:84-89); visibility now `openLive AND visibleEntryCondition(e, viewer)` (:51-53). `inflections.service.ts` no diff |
| `WordSense` fields | UNCHANGED | `words.service.ts:13-18` |
| `POST /v1/quick-add` body and transaction | UNCHANGED | `quick-add.controller.ts`, `quick-add.service.ts` no diff (:54-83, meaning language :69) |
| No AI placeholder | UNCHANGED | grep 0 hits (fact 6) |

## 5. Inflections

| Fact | Status | Evidence |
|---|---|---|
| `entry_inflections` columns, unique, CHECKs; `inflections_reviewed_at` | UNCHANGED | `content.prisma:161-177`, :50 (lines moved); no new migration on that table |
| `generateInflections`, `replaceInflections`, `entriesByForm`, `inflectionFormKey` | UNCHANGED | `inflect.ts`, `inflections.service.ts` no diff |
| No "all forms of an entry by id" function | UNCHANGED | same files; `practiceSenses().inflections` at `practice-senses.ts:66-68`; `wordPage` at `words.service.ts:120` |
| `maskExample` rules | **CHANGED** | `mask-example.ts:44-101` (commit b68126c, plan Task 19): tokens `/[\p{L}\p{N}'‘’]+/gu` now include digits (:8); a `.` right after `mr, mrs, ms, dr, prof, st, sr, jr, vs, etc` does not start a sentence (:13, :24-28); a multi-word form matches only with its own separators between words (`ice, cream` ≠ `ice cream`, :70-73); on the last word a possessive `'s` / `'` matches the stem and only the stem is masked (:76-81); a form's trailing punctuation (`a.m.`) is masked too when present (:55, :85); for a dotted lemma, a variant equal to it without punctuation is not used (:46-49). Still: longest form first, case-sensitive except a capital at sentence start, all matches `___`, null if none or mixed forms, returns `{masked, blank, base}` (:92-100) |
| `form_of_entry_id` on `sense_revisions`; used only in `eligibleCandidates` | UNCHANGED | `content.prisma:135-136, 139`; `distractors.ts:59` |

## 6. AI gateway (`src/ai/**`)

No file under `src/ai` differs (`git diff --quiet` exit 0; 84 files on dev). No new migration touches `ai_*` tables. Every fact in 6.1–6.9 is therefore
**UNCHANGED** with the same line numbers. Control quotes:

| Fact | Status | Evidence |
|---|---|---|
| 6.1 public surface | UNCHANGED | `index.ts:2-10` (exports `AiModule`, `AiService`, `OPERATION_ID_PATTERN`, `AI_OPERATIONS`, `AI_PROVIDERS`, the types, `CallSummary`, `RunReport`) |
| 6.2 `AiService` | UNCHANGED | `ai.service.ts:13` "Never call `run` inside a caller's transaction."; `run` :31-40; `isReady` :23-28; `deleteUserData` :43-49; `runAdminTest` :52-54 |
| 6.3 types | UNCHANGED | `ai.types.ts:3` `AI_OPERATIONS = ['generate_cloze', 'lookup_word', 'translate_sentence'] as const`; reasons :11-13 |
| 6.4 constants | UNCHANGED | `ai.constants.ts:5` `AI_SCHEMA_VERSION = 1`, :7 `RESULT_TTL_MS = 86_400_000`, :20 `DEFAULT_MAX_OUTPUT_TOKENS = { generate_cloze: 1200, lookup_word: 1200, translate_sentence: 800 }`, :46 pattern |
| 6.5–6.8 runner, operations, touchpoints, initial prompt | UNCHANGED | no diff |
| 6.9 `generate_cloze` input vs Practice data | UNCHANGED | see fact 11 |
| Runtime around the gateway | CHANGED (indirect) | Pool size now explicit (`DATABASE_POOL_MAX` 20, `DATABASE_POOL_TIMEOUT_MS` 5000; `common/db/prisma.module.ts:25-29`, `common/config/app-config.ts`); the gateway's own code did not change |

## 7. Entitlements

| Fact | Status | Evidence |
|---|---|---|
| Exports; `Decision` not exported | UNCHANGED | `entitlements/index.ts` no diff; `Decision` at `entitlements.service.ts:23` |
| `reserve/confirm/release/refund` signatures | UNCHANGED | `entitlements.service.ts:61-75` |
| `check(userId, feature)` | **CHANGED** | `check(userId: string, feature: Feature, tx?: Prisma.TransactionClient)` (:81); with `tx`, settings and plan are read through it (:83, :85) |
| `checkQuota(userId, _pool, tx?)`, `recordPracticeSession(tx, …)` | UNCHANGED | :93-106, :109-114 (lines moved) |
| `Feature`, `FEATURE_POOL` | UNCHANGED | :20; types file no diff |
| `ReserveResult`, `Refusal`, `refusalProblem` | UNCHANGED | `usage-ledger.service.ts:18`; `refusal.ts:4-7` |
| Pools, limit keys, Free AI = 0 | UNCHANGED | `entitlements.types.ts:3-14`, `plan-numbers.ts` no diff |
| Own short transaction each; never inside a caller's | UNCHANGED | `usage-ledger.service.ts:26-30`; `entitlements.service.ts:60` |
| `reserve` idempotent per (user, pool, op); refusal order | UNCHANGED | `ledger-rules.ts:17-37` (quote :31 `if (!input.aiEnabled \|\| input.cap === 0) return { action: 'refuse', refusal: OFF };`, :32 limit 0 → `plan-required`, :33-35 `quota-exhausted`), `decideCap` :40-46 |
| `refund` rules; `usage_records` indexes | UNCHANGED | `usage-ledger.service.ts:140`; `entitlements.prisma` no diff |

## 8. `@Idempotent()`

| Fact | Status | Evidence |
|---|---|---|
| Decorator `SetMetadata('idempotent', {timeoutSeconds: options?.timeoutSeconds ?? 30})` | UNCHANGED (code) / CHANGED (meaning) | `idempotent.decorator.ts:13-14`; doc comment :6-9 now defines it as a lease |
| Interceptor requires `Idempotency-Key` and `request.user`, hashes body | UNCHANGED | `idempotency.interceptor.ts:38-55` |
| Interceptor passes `{timeoutSeconds}` | **CHANGED** | `{ leaseSeconds: timeoutSeconds }` (:65) |
| `runIdempotent` = one `$transaction` with `timeout: timeoutSeconds*1000`, handler inside, `Promise.race` timer | **GONE** | Replaced by claim tx (:35-55, `{ maxWait: 10_000 }` only) → handler (:72) → `updateMany` (:81-89) / `deleteMany` on throw (:76). No timer. |
| `in_progress` row → 409 `idempotency-key-abandoned` | **CHANGED** | Younger than lease → `conflict` (409 "Request already in progress", `Retry-After: 2`); older → `abandoned` (`claim-decision.ts:20-23`; interceptor :67-82) |
| Row older than 24 h deleted; `succeeded`/`failed_permanent` replay, 400 on payload mismatch | UNCHANGED (moved) | `idempotency.service.ts:41-46`; `claim-decision.ts:24-29` |
| Handler writes not part of the idempotency transaction; throwing handler rolls the row back | CHANGED | Handler runs in no transaction; on throw the row is deleted by a separate `deleteMany` (:76) |
| Handler time counts against `timeoutSeconds` | **GONE** | Lease never cuts the handler; a late handler still writes `succeeded` (:80-89, decorator :8) |
| Idempotent Practice endpoints: start, answer, admin resolve | UNCHANGED | controllers no diff |
| Claude's note "D12 … not yet built" | **CHANGED** | Built and merged in M1 (PR #98, c7ef7fc, 5e71071, 9e5a7a8); smoke of M5 not merged |

## 9. Settings (`src/settings/settings.definitions.ts`)

| Fact | Status | Evidence |
|---|---|---|
| Groups, snake/camel mapping, `SettingsService.get(db = this.prisma)` | UNCHANGED | `settings.definitions.ts`, `settings.service.ts` no diff |
| Practice keys and defaults | UNCHANGED | :47-50 (`maxQuestionsPerSession: 20, defaultQuestionsPerSession: 10, historyMonths: 6, trueFalseTruePercent: 50, idleSessionCloseHours: 24, reportsPerHour: 20, hintDefinitionMaxChars: 200, typeWordMaxRetries: null`) |
| AI keys and defaults | UNCHANGED | :58 `ai: { callTimeoutSeconds: 10, maxConcurrentCalls: 50, dailyProviderCallsCap: 3000, contentRetentionDays: 7, usdVndRate: 26100 }` |
| Content keys | UNCHANGED | :57 `content: { privateWordsPerUser: 10000, sentencesPerSense: 20 }` |
| Entitlements keys (incl. `aiEnabled: true`, `aiDailyCap: 1000`) | UNCHANGED | :51-56 |
| No new / removed / changed key | UNCHANGED | file has no diff |

## 10. Native language and users

| Fact | Status | Evidence |
|---|---|---|
| `users.native_language` TEXT nullable; API `z.enum(['vi','en']).optional()` | UNCHANGED | `identity.prisma:6`; `profile.schemas.ts:5` (moved one line by a new import) |
| `IdentityService.getProfile` returns it | UNCHANGED (+ new fields) | `getProfile(userId, db = this.prisma)` (`identity.service.ts:62`); `Profile` now also `given_name`, `family_name`, `birth_date` (`YYYY-MM-DD` string or null) (:21-23, :43-45) |
| `LearnerContentGuard` 403 `profile-incomplete`; `Learner = {userId, nativeLanguage}` | UNCHANGED | guard and decorator no diff (`learner-content.guard.ts:6, 19-23`) |
| Practice passes `learner.nativeLanguage` to `availability` / `build` → `senseMeaning` | UNCHANGED | `sessions.service.ts:88, 291`; `senseMeaning` now `words.service.ts:56-61` |
| Not stored per session or question | UNCHANGED | `practice.prisma` no diff |
| Quick-add stores the meaning in `learner.nativeLanguage` | UNCHANGED | `quick-add.service.ts:69` |
| New on `users` | **NEW** | Migration `20261021100000_account_fields`: `birth_date DATE`, `family_name VARCHAR(50)`, `given_name VARCHAR(50)`, `lock_reason VARCHAR(500)`, `locked_at`, `locked_by UUID`, `terms_accepted_at`, `terms_version TEXT`, index `users_created_at_id_idx`, CHECK `users_status_check (status IN ('active','locked'))`. `identity.prisma:12-19` |
| Registration body | **NEW** | `auth.schemas.ts:10-13`: `given_name` required (1-50 code points, NFC, trimmed, no control chars), `family_name` optional/nullable, `birth_date` required (`YYYY-MM-DD`, ≥ 1900-01-01), `accept_terms: z.literal(true)`; `MIN_AGE = 13` (`identity/profile/person.ts:3`) |
| `PATCH /v1/me` | **NEW** fields | `given_name`, `family_name` (`profile.schemas.ts:7-8`); birth date not editable |
| Locked accounts | **NEW** | `status === 'locked'` → login `account_locked` (`auth/credential-decision.ts:37`), refresh rejected and chain revoked (`sessions/session.service.ts:152-154`). `LearnerContentGuard` does not check `status` (access tokens live their TTL; design D6 accepts ≤ 15 min) |

## New migrations since 47ca600

| Migration | Tables | Content |
|---|---|---|
| `20261021090000_lookup_indexes` | `senses`, `entries`, `entry_variants` | `senses_entry_id_idx (entry_id)`; `entries_catalog_lower_lemma_idx (lower(lemma)) WHERE scope='catalog'`; `entries_private_owner_lower_lemma_idx (owner_user_id, lower(lemma)) WHERE scope='private'`; `entry_variants_lower_text_idx (lower(text))` |
| `20261021100000_account_fields` | `users` | see §10 |
| `20261021110000_content_audit` | `sense_revisions`, `senses` | `sense_revisions.published_by UUID, reviewed_at, reviewed_by UUID`; `senses.state_changed_at, state_changed_by UUID` (no FK) |

None touches `practice_*`, `ai_*`, `usage_records` or other Entitlements tables.

## Other changes outside the facts (for context)

- `src/learning/practice/practice-reads.service.ts:56-93`: `items`, `groupMates`, `check` take `db` (default global client); `items`/`check` now read
  profile and settings one after the other through `db`. `LearningService.practiceItems/practiceGroupMates/practiceCheck` take `db?`
  (`learning.service.ts`). `practice-review.service.ts` passes `tx` to `resultOf`.
- `src/common/problem-details/problem-details.filter.ts`: every 5xx is logged (`request_failed`, method, route pattern, up to 10 `at …` stack frames, no
  message) (commit 44355cd).
- Time zones stored canonical (`identity/profile/timezone.ts`), offset forms (`+07:00`) rejected; `local-date.ts` formatter cache capped at 500; one-off
  `pnpm db:normalize-timezones`.
- Content pipeline (M3): rejected revisions never published, publish job `skipUnpublished`, revert keeps entries/levels in use, re-uploaded rows
  `unchanged`, `rejected.csv` round 2 (`src/content-pipeline/**`, `src/content/senses/**`, `src/content/catalog/revert.service.ts`).
- New hand-run scale test `test/content/lookup.scale.e2e-spec.ts`.
