# Session synonyms — API code facts for the plan (07/11/2026)

Read-only survey of branch `docs/cloze-session-synonyms` at `01f62a0d`, for the plan of design
`docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md`. Paths are under `apps/api/src/` unless noted. Facts only,
no proposals. Not run: no test, smoke or build was run (the worktree has no `node_modules` and no `src/generated`).

## 1. `practice/practice.types.ts`

`QuestionType` (`:8-11`):
```ts
export type QuestionType =
  | 'mcq_definition' | 'true_false_definition' | 'type_word'
  | 'cloze' | 'meaning_in_sentence' | 'mcq_sentence';
```
Also `QuestionSource = 'rule' | 'ai' | 'own_sentence'` (`:12`), `ClozeSource = 'ai' | 'own'` (`:13`).

`Prompt` (`:28-35`), typed kinds: `{ kind: 'type_meaning'; meaning: string; meaning_language: MeaningLanguage; context_label: string | null }`,
`{ kind: 'type_sentence'; sentence: string }`, `{ kind: 'cloze'; sentence: string }`. Other kinds: `mcq`, `true_false`,
`meaning_in_sentence`, `mcq_sentence`.

`AnswerKey` (`:37-47`), verbatim:
```ts
export type AnswerKey = {
  reveal: { lemma: string; meaning: string; definition_en: string | null };
  asked_private: boolean;
  // Bước 7: the Vietnamese translation of an AI sentence, shown after the answer; absent on Bước 4 rows.
  translation_vi?: string | null;
} & (
  | { kind: 'mcq'; correct_index: number; option_private: boolean[] }
  | { kind: 'true_false'; is_true: boolean; paired_private: boolean }
  // accepted is normalized and includes main.
  | { kind: 'type_word'; main: string; accepted: string[] }
);
```

`Hints` (`:49-57`):
```ts
export type HintStep = { kind: 'definition' | 'example' | 'meaning' | 'first_letter'; text: string };
export type LegacyLetterHint = { first_letter: string; length: number };
export type Hints = { level1: HintStep | null; level2: HintStep | LegacyLetterHint | null; level3?: HintStep | null };
```

There is no zod schema for a stored answer key: it is read with a cast `as AnswerKey` everywhere.

Where the private flags are set:
- `asked_private`: `practice/ai/ai-question.ts:46` (`baseKey`, `s.scope === 'private'`, for every AI kind and own-sentence cloze);
  `practice/questions/question-builder.service.ts:148` (Bước 4 kinds, used at `:161`, `:177`, `:189`, `:196`).
- `option_private`: `practice/ai/ai-question.ts:73` (meaning_in_sentence), `:88` (mcq_sentence, `(o.sense ?? s).scope === 'private'`);
  `practice/questions/question-builder.service.ts:162` (mcq_definition).
- `paired_private`: `practice/questions/question-builder.service.ts:177`.

Readers: `sessions/session-views.ts:46-47` (reportable, private_word), `reports/snapshot.ts:23,30`, `reports/reports.service.ts:106`,
`quality/real-questions.ts:30-31` (`touchesPrivateWord`).

## 2. `practice/ai/ai-question.ts`

Exports:
- `export type AiQuestionInput` (`:13-17`):
  ```ts
  | { type: 'cloze'; result: { sentence: string; accepted_answers: string[]; translation_vi: string } }
  | { type: 'meaning_in_sentence'; result: { sentence: string; word_in_sentence: string; translation_vi: string }; wrong: CandidateSense[] }
  | { type: 'mcq_sentence'; result: { sentence: string; distractors: string[]; translation_vi: string }; form: McqForm };
  ```
- `export function aiQuestion(input: AiQuestionInput, s: PracticeSense, nativeLanguage: NativeLanguage, maxDefinitionChars: number, random: () => number): BuiltQuestion` (`:49-92`).
- `export function ownSentenceQuestion(s: PracticeSense, masked: MaskedExample, nativeLanguage: NativeLanguage, maxDefinitionChars: number): BuiltQuestion` (`:95-106`).

Not exported: `normalizedSet` (`:19`, `[...new Set(texts.map(normalizeAnswer))]`), `shortDefinition` (`:21`), `clozeHints` (`:29-37`),
`choiceHints` (`:40-43`), `baseKey` (`:45-47`).

AI cloze key (`:52-62`):
```ts
  if (input.type === 'cloze') {
    const main = input.result.accepted_answers[0];
    return {
      type: 'cloze', promptStyle: 'sentence', prompt: { kind: 'cloze', sentence: result.sentence },
      answerKey: {
        kind: 'type_word', ...baseKey(s), main, accepted: normalizedSet(input.result.accepted_answers),
        translation_vi: result.translation_vi,
      },
      hints: clozeHints(s, main, nativeLanguage, maxDefinitionChars),
      blank: { text: main, base: [s.lemma, ...s.variants].includes(main) }, distractorSenseIds: [],
    };
  }
```
Own-sentence key (`:98-102`):
```ts
  const takesAll = masked.base && (masked.blank === s.lemma || s.accepted.includes(masked.blank));
  const accepted = takesAll ? [s.lemma, ...s.accepted, masked.blank] : [masked.blank];
  ...
    answerKey: { kind: 'type_word', ...baseKey(s), main: masked.blank, accepted: normalizedSet(accepted), translation_vi: null },
```
`clozeHints` (`:29-37`): level 1 `{ kind: 'first_letter', text: [...main][0] ?? '' }`, then definition (if short), then `gloss_vi` for a `vi`
learner; a missing level moves the next up. Used by both AI cloze (`:60`) and own-sentence cloze (`:103`).

## 3. `practice/ai/ai-question-generator.service.ts`

`run()` signature (`:63-64`):
```ts
async run(requestId: string, ctx: { learner: Learner; session: { id: string; aiStopped: string | null };
  random?: () => number }): Promise<GenerateOutcome>
```
`ctx.session` is never read in the body (only `ctx.learner` `:69` and `ctx.random` `:70`). The session id the body uses is
`request.sessionId` (`AiRequestRow.sessionId: string | null`, `ai/ai-requests.repository.ts:10`; nullable column, `practice.prisma:141`), only
in `fail()` (`:170-172`). Callers: `sessions/sessions.service.ts:196` (`next`) and `:261-262` (`prepare`), both pass
`session: { id: sessionId, aiStopped: null }`. No other caller.

Steps in `run()`:
- A: request read; `ready`/`failed` returned as stored (`:65-68`).
- B: `ai.isReady(op)` (`:76-79`); the sense read `content.practiceSenses(userId, [request.senseId], learner.nativeLanguage)` (`:80-81`).
- C: private word check once per content key (`:84-98`).
- D: input built once and saved (`:101-106`):
  ```ts
  let stored = request.aiInput as StoredAiInput | null;
  if (stored === null) {
    stored = await this.buildInput(type, sense, learner, key, random);
    if (stored === null) return this.fail(request, 'ai-failed', { reason: 'no-input' });
    await this.requests.saveInput(request.id, stored, this.clock.now());
  }
  ```
- E: `entitlements.reserve` (`:109-115`).
- F: `callAi` (`:117-134`).
- H: question written, unit confirmed (`:136-152`):
  ```ts
  const built = aiQuestion(questionInput(stored, result.result), sense, learner.nativeLanguage,
    (await this.settings.get()).practice.hintDefinitionMaxChars, random);
  const written = await this.requests.writeQuestion(request.id, {
    built, userId, senseId: sense.sense_id, senseRevisionId: stored.senseRevisionId, contentKey: stored.contentKey,
    aiMeta: { ...result.meta, call_operation_id: callId }, createdAt: this.clock.now(),
  });
  ```
  `questionInput()` (`:238-242`) maps the stored type and the AI value to `AiQuestionInput`; for cloze `{ type: 'cloze', result: value as ClozeValue }`.
  `ClozeValue = { sentence: string; accepted_answers: string[]; translation_vi: string }` (`:23`).

`buildInput` (`:206-223`); `clozeInput` called at `:209`:
```ts
const base = { senseRevisionId: sense.live_revision_id, contentKey: key };
if (type === 'cloze') return { ...base, type, data: clozeInput(sense) };
```
`clozeInput` = `base(s)` = `{ word: s.lemma, part_of_speech: s.pos ?? 'unspecified', level: s.level, meaning_vi: meaningVi(s), context_label: s.context_label }`
(`ai/ai-inputs.ts:14-19`); `meaningVi` throws when `gloss_vi` is null (`ai/ai-inputs.ts:9-12`). The MCQ and meaning branches read
`learning.practiceGroupMates` and `content.practiceCandidates` (`:211-213`).

`StoredAiInput` (`:31-35`), verbatim:
```ts
export type StoredAiInput = { senseRevisionId: string; contentKey: string | null } & (
  | { type: 'cloze'; data: ReturnType<typeof clozeInput> }
  | { type: 'meaning_in_sentence'; data: ReturnType<typeof meaningInput>; wrong: CandidateSense[] }
  | { type: 'mcq_sentence'; data: ReturnType<typeof mcqInput>; form: McqForm }
);
```
Readers outside the generator: `quality/real-questions.ts:3,19,27`, `quality/real-questions.repository.ts:4,17,22,26`.

Checks and the `#2` rewrite, `callAi` (`:156-166`):
```ts
let callId = requestId;
let result = await this.ai.run(op, stored.data, { operationId: callId, userId, purpose: 'learner' });
let passed = result.status === 'succeeded' && await this.check(stored, sense, result.result);
if (result.status === 'succeeded' && !passed) {
  callId = `${requestId}#2`;
  result = await this.ai.run(op, stored.data, { operationId: callId, userId, purpose: 'learner' });
  passed = result.status === 'succeeded' && await this.check(stored, sense, result.result);
}
return { callId, result, passed };
```
`check()` (`:186-203`): for cloze `checkCloze(value as ClozeValue, sense)` (`:189-192`); unknown forms recorded with
`this.unknownForms.record(sense.lemma, unknown, this.clock.now())` (`:200`); the rejection log line (`:201`):
```ts
if (!ok) this.logger.info('ai_question_rejected', { ai_op: OPERATION[stored.type], ai_reason: unknown.length > 0 ? 'unknown-form' : 'rule' });
```
Fields: `ai_op`, `ai_reason`. `AppLogger.info(event: string, fields?: object)` (`common/logging/app-logger.ts:46`). Twice rejected →
`failureOf` returns `'rejected'` (`:229`).

Question row and answer key written: `AiRequestsRepository.writeQuestion(id, data: AiQuestionData)` (`practice/ai/ai-requests.repository.ts:65-80`),
in its own transaction with `SELECT state … FOR UPDATE`; `answerKey: built.answerKey` at `:73`, `source: 'ai'`, `aiRequestId: id` (`:74`).
`AiQuestionData = { built; userId; senseId; senseRevisionId; contentKey; aiMeta; createdAt }` (`:15-18`).

MCQ candidates' private scope: `McqForm = { answerForm: string; candidates: string[]; senses: CandidateSense[] }` (`ai/ai-checks.ts:76`),
`senses[i]` is the sense of `candidates[i]`; `CandidateSense.scope: 'catalog' | 'private'` (`content/practice/practice-senses.ts:16-20`). It is
stored only inside `practice_ai_requests.ai_input` (`StoredAiInput.form`, saved at `:105`) and read by `touchesPrivateWord`
(`quality/real-questions.ts:35`). The answer key carries `option_private` for the four shown options only (`ai-question.ts:88`).

## 4. `practice/ai/ai-checks.ts`

Signatures:
- `export function validForms(s: PracticeSense): Set<string>` (`:11-14`):
  ```ts
  return new Set([s.lemma, ...s.variants, ...s.accepted, ...s.inflections.map(({ form }) => form), ...s.extra_forms]
    .map(normalizeAnswer));
  ```
- `export type ClozeCheck = { ok: true; accepted: string[] } | { ok: false; unknownForms: string[]; reveals: boolean }` (`:26`).
- `export function checkCloze(r: { sentence: string; accepted_answers: string[] }, s: PracticeSense): ClozeCheck` (`:29-35`).
- Also exported: `revealsWord`, `checkMeaning`, `checkMcq`, `McqForm`, `mcqForms`, `pickMcqForm`, `pickWrongMeanings`. `formsOf` (`:62`) is
  module-private and returns MCQ answer-form choices, not a form set.

Both are pure: no DB, no ContentService. They read only the `PracticeSense` passed in: `lemma`, `variants`, `accepted`, `inflections[].form`,
`extra_forms` (and `revealsWord` reads `lemma`, `variants`, `inflections`). `PracticeSense` (`content/practice/practice-senses.ts:27-30`):
```ts
export type PracticeSense = CandidateSense & {
  context_label: string | null; examples: string[]; variants: string[]; accepted: string[];
  pos: string | null; level: Level | null; live_revision_id: string; extra_forms: string[];
};
```
`CandidateSense` (`:16-20`) has `sense_id, entry_id, scope, lemma, meaning, gloss_vi, definition_en, form_of_entry_id, function_word, inflections`.

Batch source of everything `validForms` reads: `ContentService.practiceSenses(viewerId: string, senseIds: string[], nativeLanguage: 'vi' | 'en',
db?: Prisma.TransactionClient | PrismaClient): Promise<Map<string, PracticeSense>>` (`content/content.service.ts:220-223`), one SQL statement
for many sense ids, visible senses only (`content/practice/practice-senses.ts:95-100`); `extra_forms` from `word_form_additions` by
`lower(e.lemma)` (`:73-74`). It takes a `tx`.

No batch by lemma exists. By lemma there is only `catalogPracticeSensesByLemma(lemma, pos, nativeLanguage)` (`content/content.service.ts:226`),
one lemma, catalog only. Reverse lookup by form: `ContentService.entriesByForm(formKey: string, viewerId: string): Promise<EntryByForm[]>`
(`content/content.service.ts:178`; `EntryByForm = { entryId; lemma; pos; kind }`, `content/inflections/inflections.service.ts:10,48-55`), which
reads `entry_inflections` only (no variants, accepted forms or staff-added forms) and returns entries, not senses.

## 5. Typed questions and their keys

Every typed question has `answerKey.kind === 'type_word'`; the grading branch is `answers.service.ts:72` (`key.kind === 'type_word' && 'text' in body`).
Builders of a `type_word` key:
- Bước 4 `type_word`, sentence style: `QuestionBuilder.build` (`practice/questions/question-builder.service.ts:182-192`), prompt `type_sentence`,
  key at `:189`.
- Bước 4 `type_word`, meaning style: same function `:193-199`, prompt `type_meaning`, key at `:195-197`
  (`accepted: normalizedSet([sense.lemma, ...sense.accepted])`).
- Own-sentence cloze: `ownSentenceQuestion` (`practice/ai/ai-question.ts:95-106`), called from `QuestionBuilder.build` `:141-144`.
- AI cloze: `aiQuestion` (`practice/ai/ai-question.ts:52-62`).

Other kinds use `mcq` (mcq_definition, meaning_in_sentence, mcq_sentence) or `true_false` (true_false_definition).

How to tell them apart at grading: `item.question.type` (`'type_word'` or `'cloze'`) and `item.question.source`: rule questions are written
with `source: built.type === 'cloze' ? 'own_sentence' : 'rule'` (`practice/sessions/sessions.service.ts:647-651`); AI questions with
`source: 'ai'` (`practice/ai/ai-requests.repository.ts:74`).

## 6. `practice/answers/answers.service.ts`

Types (`:17-27`):
```ts
export type AnswerBody = { choice: number } | { is_true: boolean } | { text: string };
export type AnswerResult = {
  result: 'correct' | 'wrong'; skipped: boolean; tries: number; hint_level: number;
  correct: { lemma: string; text: string; choice_index: number | null; is_true: boolean | null };
  meaning: string; definition_en: string | null; show_known: boolean; highlight_needs_review: boolean;
  translation: string | null;
};
export type FinalWrite = {
  result: 'correct' | 'wrong'; answerRaw: string | null; answerNormalized: string | null; answersTried: string[]; tries: number; skipped: boolean;
};
```
`ItemWithQuestion = PracticeSessionItem & { question: PracticeQuestion }` (`practice/sessions/session-views.ts:23`).

Constructor (`:50-57`): `prisma: PrismaClient`, `clock: Clock`, `identity: IdentityService`, `learning: LearningService`,
`sessions: SessionsService`, `entitlements: EntitlementsService`. No `ContentService`, no `SettingsService`.

`answer(userId: string, itemId: string, body: AnswerBody): Promise<AnswerResult | { result: 'try_again'; tries: number }>` (`:59-91`).
The try-again return type is the inline `{ result: 'try_again'; tries: number }`. Typed branch (`:72-81`):
```ts
} else if (key.kind === 'type_word' && 'text' in body) {
  correct = matchesAnswer(body.text, key.accepted);
  raw = body.text;
  normalized = normalizeAnswer(body.text);
  if (!correct && (item.maxRetries === null || item.tries < item.maxRetries)) {
    await tx.practiceSessionItem.update({
      where: { id: item.id }, data: { answersTried: [...item.answersTried, raw], tries: item.tries + 1 },
    });
    return { result: 'try_again', tries: item.tries + 1 };
  }
}
```
Final write (`:85-89`): `writeFinal(tx, item, { result: correct ? 'correct' : 'wrong', answerRaw: raw, answerNormalized: normalized, answersTried: item.answersTried, tries: item.tries + 1, skipped: false })`, then `resultOf(userId, final, tx)`.
`item.maxRetries` is a snapshot of `practice.typeWordMaxRetries` taken when the item is created (`sessions/sessions.service.ts:629`).
`matchesAnswer(typed, accepted)` = `accepted.includes(normalizeAnswer(typed))` (`practice/grading/normalize.ts:19-21`).

`skip(userId: string, itemId: string): Promise<AnswerResult>` (`:97-116`): allowed for `type_word`/`cloze` types, `type_word` only after a try;
after a try the last tried text becomes `answerRaw` (`:109-113`).

`writeFinal(tx: Prisma.TransactionClient, item: ItemWithQuestion, final: FinalWrite): Promise<ItemWithQuestion>` (`:132-147`): updates the item
`{ ...final, answeredAt, localDate }` with `include: { question: true }`, then `entitlements.recordPracticeSession`, then `learning.recordActivity`.

`resultOf(userId: string, item: ItemWithQuestion, db?: Prisma.TransactionClient | PrismaClient): Promise<AnswerResult>` (`:153-167`):
```ts
const { item: learningItem } = await this.learning.practiceCheck(userId, item.senseId, null, db);
const correct = item.result === 'correct';
...
show_known: learningItem !== null && correct && item.hintLevel === 0 && learningItem.due_now,
highlight_needs_review: learningItem !== null && !correct, translation,
```
`correctOf(key: AnswerKey, prompt: Prompt): AnswerResult['correct']` (`:33-40`, exported; also used by `history/history.service.ts:9,117`).

Session row: `locked()` (`:173-185`) calls `await this.sessions.lockOpen(tx, userId, found.sessionId)` (`:179`), which returns the locked
`PracticeSession`, but the return value is discarded today. `SessionsService.usable` is `private` (`sessions/sessions.service.ts:384`), so
AnswersService cannot call it as is. `assertUnanswered(tx, userId, item, withResult)` (`:187-190`) throws 409 `already-answered` with
`extensions: { result: await this.resultOf(userId, item, tx) }` only when `withResult` is true, i.e. from `answer()` (`:61`); `skip` (`:99`)
and `hint` (`:122`) pass false. The answer route is `@Idempotent()` with `IdempotencyInterceptor` (`practice/answers/answers.controller.ts:25-29`),
so a stored reply is replayed for the same key and payload.

## 7. `practice/sessions/session-views.ts` and `current`

`ItemView` (`:15-21`): `item_id, round, position, type, prompt_style, prompt, hints_available, hint_level, state: 'unanswered' | 'try_again', tries,
reportable, private_word`. The state (`:42`):
```ts
state: item.tries > 0 ? 'try_again' : 'unanswered', tries: item.tries,
```
No reason and no typed text is returned; the item stores only `answersTried: string[]` and `tries` (no per-try reason column, §11).

`current(learner: Learner): Promise<{ session: SessionView; item: ItemView | null; notice?: Notice; preparing: boolean }>`
(`sessions/sessions.service.ts:161-174`): `advance(tx, learner, session, false, false)`, then `itemView(result.item)` only when
`result.state === 'question'` (`:171`). `advance` returns the pending item only when `item.result === null` (`:409, :419-420`); with no pending
item and `build` false it returns `{ state: 'none' }` (`:429`). So `current` never returns an answered (final) item: after a final answer
`item` is `null`. A final result is returned today only by `answer()`/`skip()` and by the 409 `already-answered` body (§6). `next` returns
`itemView` in `nextResult` (`:276`).

## 8. `practice/sessions/sessions.service.ts`

- `usable` (`:383-390`), private:
  ```ts
  private async usable(tx: Prisma.TransactionClient, userId: string, session: PracticeSession): Promise<Set<string>> {
    const items = session.source === 'group'
      ? await this.learning.practiceItems(userId, { kind: 'group', groupId: session.groupId!, filter: 'all' }, tx)
      : await this.learning.practiceItems(userId, { kind: 'senses', senseIds: session.senseIds }, tx);
    const inSession = new Set(session.senseIds);
    return new Set(items.map(({ sense_id }) => sense_id).filter((id) => inSession.has(id)));
  }
  ```
  `PracticeSession` fields read: `source`, `groupId`, `senseIds`. Called from `advance` (`:418`). Returns sense ids only (no lemma).
- `lockOpen(tx: Prisma.TransactionClient, userId: string, sessionId: string): Promise<PracticeSession>` (`:338-342`): `lockSession` (row
  `FOR UPDATE`, 404 for another learner's), 409 `session-closed` unless status is `active`/`waiting_continue`, then `touch` (returns the updated row).
- `lockSession(tx, userId, sessionId): Promise<PracticeSession>` (`:349-354`), `touch(tx, session): Promise<PracticeSession>` (`:345-347`),
  `view(tx, sessionId): Promise<SessionView>` (`:356-360`): all public.
- `closeIfIdle(userId: string, sessionId: string | null): Promise<void>` (`:325-335`), own statement.
- `current(learner: Learner)` (`:161`), `next(learner: Learner, sessionId: string, retryAi = false): Promise<NextResult>` (`:181`),
  `prepare(learner: Learner, sessionId: string)` (`:213`), `start(learner: Learner, input: StartInput)` (`:92`).
- `start` keeps at most `count` words (`:94-97`, `:124-136`); `session.senseIds = kept` (`:153`).
- Constructor (`:78-90`) has `ContentService`, `LearningService`, `SettingsService`, `PracticeStats`, `QuestionBuilder`, `AiQuestionGenerator`, etc.

`PracticeSession` model fields: §11.

## 9. Reviews

`practice/reviews/practice-reviews.service.ts`:
- `export type ReviewAction = 'needs_review' | 'known'` (`:13`).
- `export type SummaryWord = { sense_id: string; lemma: string; meaning: string; item_id: string; action: ReviewAction | null }` (`:14`).
- Constructor: `prisma`, `learning: LearningService`, `sessions: SessionsService`, `answers: AnswersService` (`:27-32`).
- `review(userId: string, itemId: string, action: ReviewAction): Promise<{ action: ReviewAction; item_id: string; level: number; due_date: string; priority: boolean }>` (`:34-54`). Body (`:43-52`):
  ```ts
  if (item.result === 'void') throw conflict('item-void', 'Item void');
  if (item.result === null) throw conflict('not-answered', 'Not answered');
  if (item.reviewAction !== null && item.reviewAction !== action) throw conflict('review-already-set', 'Review already set');
  if (item.reviewAction === null && action === 'known' && !(await this.answers.resultOf(userId, item, tx)).show_known) {
    throw conflict('known-not-allowed', 'Known not allowed');
  }
  const [outcome] = await this.learning.practiceReview(tx, userId, [{ senseId: item.senseId, action: toLearning(action), reviewId: item.id }]);
  const applied = this.applied(outcome);
  await tx.practiceSessionItem.update({ where: { id: item.id }, data: { reviewAction: action } });
  return { action, item_id: item.id, level: applied.level, due_date: applied.due_date, priority: applied.priority };
  ```
  Lock order: `closeIfIdle`, session row (`lockReviewable` → `lockSession` + `touch`, abandoned → 409), item row `FOR UPDATE` (`:38-42`).
- `summary(userId: string, sessionId: string): Promise<{ session: SessionView; asked: number; correct: number; wrong: number; words: SummaryWord[] }>`
  (`:56-65`): `correct`/`wrong` count items by `result`; `words: listed(items)`.
- `reviewAll(userId: string, sessionId: string): Promise<{ added: number }>` (`:68-82`): `listed(...)` rows with `action === null`, items
  locked `ORDER BY id FOR UPDATE` (`:74-75`), `practiceReview(tx, userId, words.map((word) => ({ senseId: word.sense_id, action: 'review', reviewId: word.item_id })))` (`:76-77`), then `reviewAction: 'needs_review'` on the applied items (`:78-79`).
- `applied(outcome: PracticeReviewOutcome)` (`:102-106`): `not-in-learning` → 409 `not-in-learning`; `known-not-allowed` → 409 `known-not-allowed`; else the outcome.
- `listed(items: ItemWithQuestion[]): SummaryWord[]` (`:113-130`), module function:
  ```ts
  for (const item of items) {
    if (item.result !== 'correct' && item.result !== 'wrong') continue;
    const key = item.question.answerKey as AnswerKey;
    const word = words.get(item.senseId) ?? {
      sense_id: item.senseId, lemma: key.reveal.lemma, meaning: key.reveal.meaning, item_id: item.id, action: null,
    };
    word.item_id = item.id;
    word.lemma = key.reveal.lemma;
    word.meaning = key.reveal.meaning;
    word.action ??= item.reviewAction as ReviewAction | null;
    if (item.result === 'wrong' || item.hintLevel > 0) listedSenses.add(item.senseId);
    words.set(item.senseId, word);
  }
  return [...words.values()].filter((word) => listedSenses.has(word.sense_id));
  ```
  The pressed state is the item's single `reviewAction` column (one per item).

`practice/reviews/practice-reviews.controller.ts`: body schema (`:10`), verbatim:
```ts
const reviewBody = z.strictObject({ action: z.enum(['needs_review', 'known']) });
```
Route `POST practice/items/:id/review` (`:18-27`), `@RateLimit('practice.answer')`, no Idempotency-Key ("Idempotent by the item's own
review_action"). `GET sessions/:id/summary` (`:29-32`), `POST sessions/:id/review-all` (`:34-41`, `@Idempotent()`).

Learning:
- `LearningService.practiceReview(tx: Prisma.TransactionClient, userId: string, inputs: PracticeReviewInput[]): Promise<PracticeReviewOutcome[]>`
  (`learning/learning.service.ts:54-56`).
- `export type PracticeReviewInput = { senseId: string; action: Answer; reviewId: string }` (`learning/practice/practice-review.service.ts:11`);
  `Answer` is `'known' | 'review'`.
- `PracticeReviewOutcome` (`:12-15`): `{ senseId; outcome: 'applied'; item_id; level; due_date; priority } | { senseId; outcome: 'not-in-learning' } | { senseId; outcome: 'known-not-allowed' }`.
- Dedupe (`:48-57`): the replay lookup matches on user and review id only, not on the sense:
  ```ts
  for (const { senseId, action, reviewId } of inputs) {
    const stored = await tx.learningLogEntry.findFirst({ where: { userId, reviewId } });
    if (stored) {
      outcomes.push({ senseId, outcome: 'applied', item_id: stored.itemId, level: stored.levelAfter!, due_date: dateString(stored.dueAfter!),
        priority: stored.answer === 'review' });
      continue;
    }
  ```
  The log row is written with `reviewId` (`:76-82`). Learning items locked by `sense_id = ANY(...)` `ORDER BY id FOR UPDATE` (`:39-42`).
- Table `learning_log` (`prisma/models/learning.prisma:52-78`): `reviewId String? @map("review_id") @db.Uuid`. Migration
  `prisma/migrations/20261017210000_learning/migration.sql:53` `"review_id" UUID`, and the hand-written partial unique index (`:89-90`):
  ```sql
  -- A review_id is answered once per learner (B3E4); other log rows carry no review_id.
  CREATE UNIQUE INDEX learning_log_user_review_key ON learning_log (user_id, review_id) WHERE review_id IS NOT NULL;
  ```
  The column is `uuid`, so it cannot hold a non-UUID string (Postgres rejects the value; the exact error through Prisma was not run). The same
  column and index serve flashcard reviews: `learning/reviews/reviews.controller.ts:11` requires `review_id: z.uuid()`, and
  `learning/reviews/reviews.service.ts:87-94` returns 400 when a review id is reused with a different payload.

## 10. Other readers

- `practice/weak/practice-stats.ts`: `statsFor(userId: string, senseIds?: string[]): Promise<Map<string, SenseStats>>` (`:23-50`), one SQL
  statement over `practice_session_items i` grouped by `i.sense_id` (`:26-45`); the counted filter is
  `WHERE NOT (result = 'correct' AND hint_level > 0) AND (report IS NULL OR report = 'no_error')` (`:35`); `last_practiced_at` = max
  `answered_at` of any final item (`:41`). `SenseStats = { wrong; counted; last_wrong_at; last_practiced_at }` (`:7`). Callers:
  `sessions/sessions.service.ts:113` (sorts `least_practiced`, `most_wrong`) and `weakSenses` (`:53-58`), which is called by
  `history/history.service.ts:52` (weak words), `:74` (weak groups) and `sessions/sessions.service.ts:369` (`weak` source).
- `practice/history/history.service.ts`: `history(userId: string, query: Page & { date?: string; sense_id?: string }, nativeLanguage: 'vi' | 'en'): Promise<{ items: HistoryItem[]; next_page_token: string | null }>` (`:88-126`). `HistoryItem` (`:18-24`):
  `item_id, session_id, sense_id, lemma, type, prompt_style, prompt, answer: string | null, correct: AnswerResult['correct'], result, skipped, tries, hint_level, review_action: string | null, answered_at, local_date, translation`.
  The `sense_id` filter is `...(query.sense_id === undefined ? {} : { senseId: query.sense_id })` on `practiceSessionItem.findMany` (`:98-108`);
  mapping (`:112-121`) uses `row.senseId`, `key.reveal.lemma`, `row.answerRaw`, `correctOf(key, prompt)`, `row.reviewAction`. The web reads
  this endpoint for both the history page and the practice home's recent list (`apps/web/src/features/learner/practice/HistoryPage.tsx:81`,
  `apps/web/src/features/learner/practice/practice-api.ts:135`). Private `lemmas()` (`:129-136`) reads `answer_key->'reveal'->>'lemma'` by sense.
- `practice/entry-usage.probe.ts`, full `reasonsFor` (`:20-37`):
  ```ts
  async reasonsFor(tx: Prisma.TransactionClient, scope: EntryUsageScope): Promise<EntryUsageReason[]> {
    const { senseIds, revisionIds } = scope;
    if (senseIds.length === 0) return [];
    const select = { select: { id: true } } as const;
    const bySense = { where: { senseId: { in: senseIds } }, ...select };
    const questionOf = [
      { senseId: { in: senseIds } }, { distractorSenseIds: { hasSome: senseIds } },
      ...(revisionIds.length > 0 ? [{ senseRevisionId: { in: revisionIds } }] : []),
    ];
    const used = await tx.practiceSession.findFirst({ where: { OR: [{ senseIds: { hasSome: senseIds } }, { aiSenseIds: { hasSome: senseIds } }] }, ...select })
      ?? await tx.practiceQuestion.findFirst({ where: { OR: questionOf }, ...select })
      ?? await tx.practiceSessionItem.findFirst(bySense)
      ?? await tx.practiceReport.findFirst(bySense)
      ?? await tx.practiceAiRequest.findFirst(bySense)
      ?? await tx.practiceWordCheck.findFirst({ where: { senseId: { in: senseIds } }, select: { senseId: true } });
    return used ? ['learner-data'] : [];
  }
  ```
  Its spec pins the exact `where` per table (`practice/entry-usage.probe.spec.ts:41-50`: `practiceSessionItem` → `{ senseId: { in: SENSES } }`).
- `practice/maintenance/private-senses-cleanup.provider.ts`: `deleteForSenses(tx: Prisma.TransactionClient, userId: string, senseIds: string[]): Promise<void>` (`:14-46`).
  Lock order: open sessions holding those senses (`:16-21`), AI requests (`:22-24`), items `WHERE user_id = … AND sense_id = ANY(...) ORDER BY id FOR UPDATE` (`:25-27`).
  Deletes: requests (`:29`), word checks (`:30`), pending pointer cleared (`:31-33`), `pendingNotice` set for sessions with an unanswered item
  of those senses (`:35-41`), reports by sense (`:42`), items `deleteMany({ where: { userId, senseId: { in: senseIds } } })` (`:43`),
  questions by sense (`:45`). Spec: `practice/maintenance/practice-cleanup.spec.ts:69-121`.
- `practice/reports/snapshot.ts`: `buildSnapshot(question: SnapshotQuestion, item: SnapshotItem)` (`:13-46`). Masking happens only for MCQ
  options (`:19-28`) and the paired true/false meaning (`:29-31`). The typed branch (`:32-33`):
  ```ts
  } else if (key.kind === 'type_word') {
    correct = { ...correct, main: key.main, accepted: key.accepted };
  }
  ```
  `learner.answer` is `item.answer_raw` and `answers_tried` as stored (`:17`, `:44`). `PRIVATE_WORD_MASK = '[từ riêng của người học]'`
  (`practice/practice.constants.ts:15`).
- `practice/quality/real-questions.ts`: `touchesPrivateWord(q: { answerKey: AnswerKey | null; aiInput: StoredAiInput | null }): boolean` (`:27-38`):
  ```ts
  if (key !== null) {
    if (key.asked_private) return true;
    if (key.kind === 'mcq' && key.option_private.some(Boolean)) return true;
  }
  if (input === null) return false;
  if (input.contentKey !== null) return true;
  if (input.type === 'mcq_sentence') return (input.form?.senses ?? []).some((sense) => sense.scope === 'private');
  if (input.type === 'meaning_in_sentence') return (input.wrong ?? []).some((sense) => sense.scope === 'private');
  return false;
  ```
  Callers: `quality/real-judge.service.ts:145` (skip count `private_word`) and `quality/example-source.service.ts:87` (409 `private-word`).
  `RealQuestionRow` (`:12-21`) has `answerKey: AnswerKey`, `aiInput: StoredAiInput | null`, `sessionSenseIds: string[]`, loaded by
  `RealQuestionsRepository.window` (`quality/real-questions.repository.ts:50-69`, `q.answer_key`, `r.ai_input`, `s.sense_ids`). An existing
  `sessionWords(askedSenseId, sessionSenseIds, senses): string[]` (`:64-79`) builds the judge's catalog-only session word list.
- Also seen (design §5.3, not asked): `practice/eval-rules/practice-eval-rules.ts:53-54` runs `checkCloze` for `generate_cloze`; `RuleResult`
  is `ai/eval/eval.types.ts:11`; `PASS = { status: 'pass', problems: [], reason: null }` (`:8`).

## 11. Prisma models and migrations

`prisma/models/practice.prisma:38-66`, verbatim:
```prisma
model PracticeQuestion {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String   @map("user_id") @db.Uuid
  senseId            String   @map("sense_id") @db.Uuid
  type               String
  promptStyle        String   @map("prompt_style")
  // Sentence prompts only: the masked text and whether it is the base form (design 7.4b).
  blank              Json?
  schemaVersion      Int      @map("schema_version")
  prompt             Json
  answerKey          Json     @map("answer_key")
  hints              Json
  distractorSenseIds String[] @map("distractor_sense_ids") @db.Uuid
  createdAt          DateTime @map("created_at") @db.Timestamptz
  // Bước 7 (design §12.1). ai_request_id is the ledger operation id (mã gốc); ai_meta holds call_operation_id.
  source             String   @default("rule")
  aiRequestId        String?  @map("ai_request_id")
  aiMeta             Json?    @map("ai_meta")
  aiCharged          Boolean  @default(false) @map("ai_charged")
  senseRevisionId    String?  @map("sense_revision_id") @db.Uuid
  // Content key of a private word when the question was made (design 7.6).
  contentKey         String?  @map("content_key")

  items PracticeSessionItem[]

  // Unseen AI questions are found by (user_id, sense_id) WHERE source = 'ai': the partial index lives in the migration.
  @@index([userId, senseId])
  @@map("practice_questions")
}
```
`prisma/models/practice.prisma:69-103`, verbatim:
```prisma
model PracticeSessionItem {
  id               String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sessionId        String    @map("session_id") @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  questionId       String    @map("question_id") @db.Uuid
  senseId          String    @map("sense_id") @db.Uuid
  round            Int
  position         Int
  askedAt          DateTime  @map("asked_at") @db.Timestamptz
  // Set with the final result only; null while unanswered or waiting for a retry.
  answeredAt       DateTime? @map("answered_at") @db.Timestamptz
  answerRaw        String?   @map("answer_raw")
  answerNormalized String?   @map("answer_normalized")
  answersTried     String[]  @default([]) @map("answers_tried")
  tries            Int       @default(0)
  // Snapshot of the setting when the question was built; null = no limit.
  maxRetries       Int?      @map("max_retries")
  skipped          Boolean   @default(false)
  result           String?
  hintLevel        Int       @default(0) @map("hint_level")
  // The learner's date, in their zone at the moment of the final result.
  localDate        DateTime? @map("local_date") @db.Date
  reviewAction     String?   @map("review_action")

  session  PracticeSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question PracticeQuestion @relation(fields: [questionId], references: [id], onDelete: Restrict)
  report   PracticeReport?

  @@unique([sessionId, position])
  @@index([userId, senseId, answeredAt])
  @@index([userId, localDate])
  @@index([askedAt])
  @@index([questionId])
  @@map("practice_session_items")
}
```
Hand-written CHECKs on the item (`prisma/migrations/20261018150000_practice/migration.sql:128-129`):
```sql
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_result_check" CHECK ("result" IN ('correct', 'wrong', 'void'));
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_review_action_check" CHECK ("review_action" IN ('needs_review', 'known'));
```
`PracticeSession` (`practice.prisma:3-35`) fields: `id, userId, source, groupId, groupFilter, sort, types, promptStyle, targetCount, senseIds (sense_ids uuid[]), status, continued, pendingNotice, startedAt, lastActivityAt, endedAt, clozeSource, aiPlanned, aiSenseIds, pendingAiRequestId, aiStopped, aiNoticeShown`.

Newest 5 migration folders (`prisma/migrations/`), pattern `YYYYMMDDHHMMSS_snake_name/migration.sql`:
```
20261101010000_ai_workspace
20261102100000_review_r1_user_id_indexes
20261103120000_legal_versions
20261105100000_free_ai_cycle
20261110100000_billing_orders
```
The newest is dated 10/11/2026 (after today), so a new folder must sort after `20261110100000`.

Column-add examples: `prisma/migrations/20261105100000_free_ai_cycle/migration.sql` (hand-written):
```sql
-- Launch prep A, round A (M3): when a subscription stopped being Pro or trial, and the plan a unit of AI use was reserved under.
ALTER TABLE "subscriptions" ADD COLUMN "ended_at" TIMESTAMPTZ;
ALTER TABLE "usage_records" ADD COLUMN "plan" TEXT;
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_plan_check" CHECK ("plan" IS NULL OR "plan" IN ('free', 'trial', 'pro'));
```
and `prisma/migrations/20261101010000_ai_workspace/migration.sql` (Prisma-generated style, `-- AlterTable` / `ADD COLUMN`). CI's `api` job runs
`pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` after `pnpm db:setup`
(`.github/workflows/ci.yml:55-56`): the models and the committed migrations must match.

Prompt seed migrations (design §5.2): `20261020072259_ai_initial_prompts`, `20261022091000_buoc7_ai_operations`; `ai/prompts/initial-prompts.spec.ts:11`
selects folders ending in `_ai_initial_prompts` or `_buoc7_ai_operations` and expects `toHaveLength(2)` (`:25`).

## 12. Unit tests

- Runner: Vitest (`apps/api/package.json` `"vitest": "^4.1.2"`); `apps/api/vitest.config.ts` includes `**/*.spec.ts`, `globals: true`.
  Specs live next to the source (`answers/answers.service.spec.ts`, `reviews/practice-reviews.service.spec.ts`, …).
- No Prisma fake library: each spec builds plain objects with `vi.fn` for the Prisma calls it needs and casts them
  (`as unknown as PrismaClient` / `Prisma.TransactionClient`), with `$transaction: vi.fn(async (fn) => fn(tx))`.
  - `practice/answers/answers.service.spec.ts`: `setup(at, record?, activity?)` (`:17-35`) for `writeFinal`; `route(found, nativeLanguage)`
    (`:99-124`) for `answer`/`skip`/`hint`, whose `sessions` fake is `{ closeIfIdle: vi.fn(async () => undefined), lockOpen: vi.fn(async () => undefined) }`
    (`:120`), so `lockOpen` returns `undefined` there. Helpers `mcqItem` (`:88`), `aiItem` (`:154`), `clozeQuestion` (`:163`). Example:
    `describe('AnswersService — Bước 7 kinds')` (`:169`) / `it('B7E51: cloze takes "Deployed." for deployed; B7E50: "release" asks to try again, never correct')` (`:188-193`).
    Two assertions pin the exact try-again reply: `.resolves.toEqual({ result: 'try_again', tries: 1 })` (`:192`, `:197`); an added field breaks them.
  - `practice/reviews/practice-reviews.service.spec.ts` (44 lines): `setup()` (`:14-35`) with fakes for prisma, `learning.practiceReview`,
    `sessions.closeIfIdle/lockSession/touch`, `answers.resultOf`. One test:
    `describe('PracticeReviewsService.review — reads inside the transaction use the transaction (PX4)')` (`:37`) /
    `it('PX4: "Đã biết" works out the buttons with the learning item read through tx')` (`:38`).
  - Others: `practice/sessions/session-views.spec.ts` (`itemView`; `:17` asserts the view's JSON does not match `/deployed|Chúng tôi|first_letter/`),
    `practice/ai/ai-question.spec.ts`, `practice/ai/ai-checks.spec.ts`, `practice/ai/ai-question-generator.service.spec.ts` (fakes; helpers
    `deploy()`, `candidate()` from `practice/testing/ai-senses.ts`), `practice/history/history.service.spec.ts`,
    `practice/maintenance/practice-cleanup.spec.ts` (`deleteForSenses` at `:69-121`), `practice/quality/real-questions.spec.ts`
    (`touchesPrivateWord` at `:36-71`), `practice/reports/snapshot.spec.ts`, `practice/entry-usage.probe.spec.ts`,
    `learning/practice/practice-review.service.spec.ts`.
- Commands, from `apps/api` (`package.json:22`: `"test": "vitest run"`):
  - all API unit tests: `pnpm test`
  - one file: `pnpm exec vitest run src/practice/answers/answers.service.spec.ts` (or `pnpm test src/practice/answers/answers.service.spec.ts`)
  - CI order (`.github/workflows/ci.yml:50-68`): `pnpm db:setup` (`prisma migrate deploy && prisma generate --sql`, needs the local Postgres),
    then drift check, `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json`, `pnpm build`, `pnpm test`.
  - Not run here: this worktree has no `node_modules` and no `apps/api/src/generated`, so the commands are read from `package.json` and CI only.

## 13. `apps/api/scripts/smoke-buoc-4.mjs`

No step types another word of the session as a wrong answer.
- `wrongAnswer(item)` (`:188-193`) returns `{ text: 'zzzzwrong' }` for a typed item (not a word of the session). Used once, for W7 in the group B
  session (`types: ['type_word']`, `prompt_style: 'meaning'`, words W7 and W8) at `:334-338`:
  ```js
  const first = await answer(shown.item.item_id, wrongAnswer(shown.item));
  check(first.result === 'try_again' && first.tries === 1 && !('correct' in first), `W7 wrong: ${JSON.stringify(first)}`);
  const current = await want(api('GET', '/v1/practice/sessions/current', { token: learner }), 200, 'current');
  check(current.item.item_id === shown.item.item_id && current.item.state === 'try_again' && current.item.tries === 1,
    `current while try_again (B4#25): ${JSON.stringify(current.item)}`);
  ```
- The other typed wrong answer is the asked word's own base form for a past-tense blank (`:281-283`, `{ text: word.lemma }`, session `count: 1`):
  ```js
  check(base.result === 'try_again' && !('correct' in base), `base form for a past blank: ${JSON.stringify(base)}`);
  ```
- All checks read named fields (`result`, `tries`, `'correct' in`, `state`), none compares the whole object, so an added `reason` field
  (in the try-again reply or in `current.item`) does not break them.
- Related (not asked): `apps/api/scripts/smoke-buoc-7.mjs:755-757` types another G7 word into an AI cloze of a `count: 1` session
  (`check(tryAgain.result === 'try_again' && !('correct' in tryAgain), …)`); with one word in the session it is not a session word, and
  the check reads named fields only.
