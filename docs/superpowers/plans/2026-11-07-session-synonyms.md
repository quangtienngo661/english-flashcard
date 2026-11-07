# AI practice questions: synonyms inside a session — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The AI fill-in writer knows the session's other words and avoids them; when it cannot, the app accepts a declared session word as an "Alternative answer" credited to the word typed, and any other session word typed gets its own try-again message.

**Architecture:** `generate_cloze` gains `session_words` (input) and `also_accepted` (output, schema `generate_cloze_v2`). Practice keeps the checked alternatives and the private marks in the question's answer key. Grading adds two steps that read the current session's words at grading time. An alternative item stores the typed word in new item columns, and every reader of an item (stats, review, summary, history, cleanup, probe) follows it. The web adds the alternative card, the session-word message and the `c___` hint. Prompt and judge texts live in the database; the plan gives them in Appendices A–C.

**Tech Stack:** NestJS + Prisma (TypedSQL) + Postgres, Vitest (`apps/api`); Next.js + next-intl + Testing Library (`apps/web`); fake AI provider for smokes.

**Spec:** `docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md` (approved 07/11/2026). Code facts gathered for this plan:
`docs/preparation/SESSION_SYNONYMS_PLAN_CODE_FACTS_2026-11-07-{api,ai,web}.md`.

## Global Constraints

- One branch per milestone, from `origin/dev` after the previous milestone's PR merged: `feat/session-synonyms-m1-writing`,
  `feat/session-synonyms-m2-grading`, `feat/session-synonyms-m3-web`, `docs/session-synonyms-m4-test-set`. Each PR targets `dev`; merge once CI is green
  (no approval needed). Open PRs with the `ship-pr` skill.
- Tests first: write the test, run it, see it fail for the stated reason, then implement. Commits: Conventional Commits, scope `api`, `web` or
  `docs`, subject lower case, no full stop, ≤ 72 characters, body ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- The v1 API is additive only (SR7): new reply fields, never a changed type or a removed field; `result` stays `'correct' | 'wrong'`.
- Logs never carry a typed answer, a form or a word: counts and reasons only.
- Limits: `session_words` at most `SESSION_WORDS_MAX = 99` entries; each `word` within `WORD_MAX` (100); each `meaning_vi` within `MEANING_MAX`
  (300) or `null`. `also_accepted` at most `ACCEPTED_ANSWERS_MAX` (5) entries of at most `ACCEPTED_ANSWER_MAX` (100) characters.
- Every form compared at grading or checking goes through `normalizeAnswer` (`practice/grading/normalize.ts`).
- New migration folders must sort after `20261110100000_billing_orders`. If `dev` gained a later one before merge, rename the folder to sort last.
- Copy (exact strings) is in Appendix D; `apps/web/messages/{en,vi}.json` stay line-aligned and pass `src/i18n/messages.test.ts`.
- Commands. API, from `apps/api`: `pnpm exec vitest run <file>`, `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit -p tsconfig.json`, and
  `pnpm db:setup` then `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` (drift). Web, from
  `apps/web`: `pnpm exec vitest run <file>`, `pnpm test`, `pnpm lint`, `pnpm typecheck`. Run `pnpm install` at the root first: the worktree has none.

## Shared names (every task uses these exactly)

| Name | Definition | File | Task |
|---|---|---|---|
| `SESSION_WORDS_MAX` | `99`, exported from `ai/index.ts` | `apps/api/src/ai/ai.constants.ts` | 1 |
| `SessionWord` | `{ word: string; meaning_vi: string \| null }` | `apps/api/src/practice/ai/session-words.ts` | 3 |
| `SessionSense` | `{ senseId: string; scope: 'catalog' \| 'private' }` | same | 3 |
| `StoredAiInput` (cloze) | gains `session?: SessionSense[]` (absent on rows written before) | `practice/ai/ai-question-generator.service.ts` | 3 |
| `DeclaredAlternative` | `{ form: string; private: boolean }`, `form` normalized | `apps/api/src/practice/practice.types.ts` | 4 |
| `AnswerKey` `type_word` | gains `also_accepted?: DeclaredAlternative[]; session_private?: boolean` | same | 4 |
| `SessionWordForms` | `{ senseId: string; forms: Set<string> }` | `apps/api/src/practice/answers/typed-match.ts` | 8 |
| `TypedMatch` | `{ kind: 'right' } \| { kind: 'alternative'; senseId: string \| null } \| { kind: 'session_word' } \| { kind: 'other' }` | same | 8 |
| `TryAgainReply` | `{ result: 'try_again'; tries: number; reason: 'session_word' \| null }` | `practice/answers/answers.service.ts` | 9 |
| `AlternativeRow` | `{ sense_id: string; lemma: string; meaning: string; role: 'typed' \| 'asked'; show_known: boolean; action: ReviewAction \| null }` | same | 10 |
| `AnswerResult.alternative` | `{ typed: string; rows: AlternativeRow[] } \| null` (typed row first) | same | 10 |
| item columns | `alternative` bool, `alternative_sense_id` uuid?, `alternative_review_action` text?, `session_word_tries` int | `practice.prisma` | 9 |
| `reviewIdFor` | `(itemId: string, senseId: string, askedSenseId: string) => string` | `apps/api/src/practice/reviews/review-id.ts` | 11 |
| problem slug | `review-word-required` (409) | `practice/reviews/practice-reviews.service.ts` | 11 |
| summary field | `alternatives: number` in `GET …/summary` | same | 12 |
| history field | `alternative: boolean` in each `GET /v1/practice/history` item | `practice/history/history.service.ts` | 13 |

## Review Focus

1. A double press, or two tabs pressing the same row: the review is written once, since the key per item and word is the same both times
   (Task 11 test "CSE14").
2. A session word deleted or taken out of the group during the session: it is no longer a session word at grading (Task 9 test "CSE7").
3. A typed answer with other case or punctuation ("Crucial.") matches like today's answers, in every step (Task 8 test "normalizes").
4. A web build from before this change reviews an alternative item without a word: 409 `review-word-required`, nothing changes
   (Task 11 test "CSE12").
5. Lan deletes her private word that she typed as an alternative, and that item has a report: the item and its report go, with no foreign-key
   error (Task 13 test "CSE8").

---

## Milestone 1 — Writing (API) · branch `feat/session-synonyms-m1-writing`

### Task 1: `generate_cloze` v2 in the gateway, and the fake provider

**Files:**
- Modify: `apps/api/src/ai/operations/generate-cloze.ts`, `apps/api/src/ai/ai.constants.ts`, `apps/api/src/ai/index.ts`,
  `apps/api/src/ai/adapters/fake/fake.adapter.ts`
- Test: `apps/api/src/ai/operations/operations.spec.ts`, `apps/api/src/ai/adapters/fake/fake.adapter.spec.ts`,
  `apps/api/src/ai/runner/runner.service.spec.ts:627` (schema name)

**Interfaces:**
- Produces: `SESSION_WORDS_MAX`; `generate_cloze` input field `session_words` (`z.array(z.strictObject({ word: textIn(1, WORD_MAX), meaning_vi:
  textIn(1, MEANING_MAX).nullable() })).max(SESSION_WORDS_MAX).nullish()`); output field `also_accepted: STRING_LIST`; schema name
  `generate_cloze_v2`; fake model `fake:alternative`.

- [ ] **Step 1: Write the failing tests** in `operations.spec.ts`:
  - the schema-name list (`:213-216`) now starts with `'generate_cloze_v2'`;
  - `it('session_words: missing, null and [] are valid; 100 entries are not')`: `validateInput` is `{ ok: true }` for each of the three, and for
    100 entries `{ ok: false }` with `violations[0]` starting `session_words`;
  - `it('session_words entry: meaning_vi may be null, an extra key is refused')`;
  - `it('also_accepted is cleaned, deduplicated, and loses entries equal to an accepted answer')`: raw `{ sentence: 'Sleep is ___ for good health.',
    accepted_answers: ['vital'], also_accepted: [' Crucial ', 'crucial', 'VITAL'], translation_vi: 'x' }` → value `also_accepted: ['Crucial']`;
  - `it('also_accepted: missing → shape; 6 entries → answers-count; an underscore → answer-underscore; 101 characters → too-long; [] is valid')`.
  In `fake.adapter.spec.ts`: `CLOZE_DATA`'s schema becomes `_v2`; `fake:ok` cloze returns `also_accepted: []`;
  `it('fake:alternative → also_accepted holds the first session word')` with `session_words: [{ word: 'release', meaning_vi: null }]` →
  `['release']`, and `[]` when `session_words` is missing; `FAKE_MODELS` contains `'fake:alternative'` (the `it.each` at `:188` covers it).
- [ ] **Step 2: Run** `pnpm exec vitest run src/ai/operations/operations.spec.ts src/ai/adapters/fake/fake.adapter.spec.ts` — FAIL (schema name,
  unknown key `session_words`, no `also_accepted`).
- [ ] **Step 3: Implement.** In `generate-cloze.ts`: the input field above; `output` and `outputSchema` gain `also_accepted: STRING_LIST`, name
  `generate_cloze_v2`; `normalizeAndCheck` builds `also = dedupeAnswers(raw.also_accepted.map(clean)).filter(Boolean)`, drops entries equal to an
  accepted answer ignoring case, then applies `too-long`, `answers-count` (more than `ACCEPTED_ANSWERS_MAX`) and `answer-underscore` with the
  same codes as `accepted_answers`, and returns it in `value`. In `fake.adapter.ts`: every `generate_cloze_v1` (`okValue`, `badFormValue`,
  `fake:two-blanks` at `:103`) becomes `generate_cloze_v2`, `okValue` adds `also_accepted: []`, add `'fake:alternative'` to `FAKE_MODELS` and a `case` that returns `fake:ok`'s value
  with `also_accepted` = the first `session_words[].word` (or `[]`). Export `SESSION_WORDS_MAX` from `ai/index.ts`. Update the schema name in
  `runner.service.spec.ts:627`.
- [ ] **Step 4: Run** the two spec files, then `pnpm test` — PASS.
- [ ] **Step 5: Commit** `feat(api): add session words and also accepted to generate cloze`

### Task 2: Seed revision 3 of the fill-in prompt

**Files:**
- Modify: `apps/api/src/ai/prompts/initial-prompts.ts` (`generate_cloze`), `apps/api/src/ai/prompts/initial-prompts.spec.ts`,
  `apps/api/scripts/smoke-buoc-7.mjs:405-406`, `apps/api/scripts/smoke-nhom-b.mjs:663-664`
- Create: `apps/api/prisma/migrations/20261111090000_cloze_session_words_prompt/migration.sql`

**Interfaces:**
- Consumes: Task 1's input and output shape (the seed examples must pass `promptViolations`).
- Produces: `INITIAL_PROMPTS.generate_cloze` = Appendix A; on an untouched database the live `generate_cloze` config is number 3.

- [ ] **Step 1: Write the failing tests** in `initial-prompts.spec.ts`: the folder filter (`:11`) also takes names ending `_cloze_session_words_prompt`
  and `:25` expects 3 folders; new `it('generate_cloze config 3 replaces only the untouched seed config 2 of the system actor (design §5.2)')`
  asserting the new SQL contains `c."number" = 2`, `c."created_by" = '${AI_SYSTEM_ACTOR_ID}'` and `c."published_by" = '${AI_SYSTEM_ACTOR_ID}'`;
  `it('the seed examples declare also_accepted and one has session_words')`: every `generate_cloze` example output has `also_accepted` and at
  least one input has a non-empty `session_words`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/ai/prompts/initial-prompts.spec.ts` — FAIL (2 folders; examples lack the field).
- [ ] **Step 3: Implement.** Replace `INITIAL_PROMPTS.generate_cloze` with Appendix A (instructions and the three examples; update the file's
  comment to "revision 3"). Write the migration as one `DO $seed$ … $seed$` block that, only when the live `generate_cloze` config (`ai_live_configs`
  → `ai_configs`) has `number = 2`, `created_by` and `published_by` both `AI_SYSTEM_ACTOR_ID`:
  1. inserts an `ai_configs` row: `number` = `last_number + 1`, `version 0`, `name 'Cấu hình ' || number`, the Appendix A text as
     `replace($p$…$p$, E'\r', '')` and examples as `'…'::jsonb`, `model_ref`, `effort`, `thinking`, `max_output_tokens` copied from config 2,
     `status 'published'`, `created_from` = config 2's id, `created_by` and `published_by` = the system actor, `created_at`, `published_at`,
     `updated_at` = `now()`;
  2. inserts its `ai_config_revisions` row version 0 (same `jsonb_build_object` as `20261101010000_ai_workspace`, `fingerprint NULL`);
  3. sets config 2 `status 'retired'`; points `ai_live_configs` at the new row with `previous_config_id NULL`, `last_number` = the new number, and
     **leaves `version` unchanged** (a fresh database must still read `live_version 0`);
  4. updates `ai_prompts` (`revision` = the new number, text, examples, `updated_by` = the system actor) and inserts the matching
     `ai_prompt_revisions` row, so `live.number = ai_prompts.revision` stays true;
  otherwise `RAISE NOTICE 'generate_cloze prompt was published by an admin; not replaced. The new text is in the session synonyms plan, Appendix A.'`.
  Smokes: `smoke-buoc-7.mjs:405-406` expects revision 3; `smoke-nhom-b.mjs` `shot()` adds `also_accepted: []` to its output.
- [ ] **Step 4: Run** the spec and `pnpm test` (`prompts.service.spec.ts` also reads `INITIAL_PROMPTS`), then `pnpm db:setup` on a fresh local
  database and read
  `SELECT c.number, l.version, l.previous_config_id FROM ai_live_configs l JOIN ai_configs c ON c.id = l.config_id WHERE l.operation = 'generate_cloze'`
  → `3 | 0 | NULL`; run the drift command → exit 0.
- [ ] **Step 5: Commit** `feat(api): seed the fill-in prompt that knows the session words`

### Task 3: Practice sends the session's words to the writer

**Files:**
- Create: `apps/api/src/practice/ai/session-words.ts`, `apps/api/src/practice/ai/session-words.spec.ts`
- Modify: `apps/api/src/practice/ai/ai-inputs.ts`, `apps/api/src/practice/ai/ai-question-generator.service.ts` (`run`, `buildInput`, `StoredAiInput`),
  `apps/api/src/practice/sessions/sessions.service.ts` (`usable`, callers of `run` at `:196`, `:261-262`)
- Test: `apps/api/src/practice/ai/ai-question-generator.service.spec.ts`

**Interfaces:**
- Consumes: `SESSION_WORDS_MAX` (Task 1); `ContentService.practiceSenses(viewerId, senseIds, nativeLanguage, db?)`.
- Produces: `pickSessionWords(asked: PracticeSense, others: PracticeSense[]): { words: SessionWord[]; senses: SessionSense[] }`;
  `clozeInput(s: PracticeSense, sessionWords: SessionWord[] = [])` → `{ ...base(s), session_words }`; `SessionsService.sessionWordIds(db:
  Prisma.TransactionClient | PrismaClient, userId: string, session: PracticeSession): Promise<string[]>` (the usable words, in `session.senseIds`
  order); `run(requestId, ctx)` with `ctx.session: { id: string; aiStopped: string | null; wordIds: string[] }`.

- [ ] **Step 1: Write the failing tests** in `session-words.spec.ts` (fixtures from `practice/testing/ai-senses.ts`), boundaries first:
  - `it('no other word → words [] and senses []')`;
  - `it('leaves out the asked sense and every sense of the asked lemma, ignoring case (fair, Fair)')`;
  - `it('keeps the same part of speech and words with none; asked word with none keeps all')` (asked `vital` adjective: `crucial` adjective kept,
    `habit` noun left out, a word with `pos: null` kept);
  - `it('one entry per lemma and meaning; senses lists every sense sent, with its scope')` (two senses `critical` with different `gloss_vi` → two
    entries; a private sense → `scope: 'private'`);
  - `it('meaning_vi is null when the sense has no gloss_vi')`;
  - `it('stops at 99 entries')` (120 others → 99 words).
  In the generator spec: `it('cloze input carries session_words and the stored input lists the senses sent')` (ctx `wordIds` = asked + two
  others; `saveInput` receives `data.session_words` of length 2 and `session` of length 2); `it('meaning and MCQ inputs are unchanged')`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/practice/ai/session-words.spec.ts src/practice/ai/ai-question-generator.service.spec.ts` — FAIL.
- [ ] **Step 3: Implement.** `pickSessionWords` walks `others` in order. `buildInput` gets `wordIds`; for cloze it reads
  `content.practiceSenses(userId, wordIds without the asked id, learner.nativeLanguage)`, orders the senses by `wordIds`, and returns
  `{ ...base, type, data: clozeInput(sense, words), session: senses }`. `usable` takes `db: Prisma.TransactionClient | PrismaClient`;
  `sessionWordIds` filters `session.senseIds` by it. Both callers of `run` pass `wordIds` from `sessionWordIds` (with the transaction they hold,
  or `this.prisma`).
- [ ] **Step 4: Run** the two files, then `pnpm test` — PASS.
- [ ] **Step 5: Commit** `feat(api): send the session's other words to the fill-in writer`

### Task 4: Declared alternatives are checked and kept in the answer key

**Files:**
- Modify: `apps/api/src/practice/practice.types.ts`, `apps/api/src/practice/ai/ai-checks.ts`, `apps/api/src/practice/ai/ai-question.ts`
  (`AiQuestionInput`, cloze branch), `apps/api/src/practice/ai/ai-question-generator.service.ts` (`ClozeValue`, `questionInput`, step H)
- Test: `apps/api/src/practice/ai/ai-checks.spec.ts`, `ai-question.spec.ts`, `ai-question-generator.service.spec.ts`

**Interfaces:**
- Consumes: `StoredAiInput.session` (Task 3); `validForms(s)`.
- Produces: `keepAlternatives(alsoAccepted: string[], accepted: string[], sessionSenses: PracticeSense[]): { kept: DeclaredAlternative[]; dropped:
  number }`; `AiQuestionInput` cloze gains `alternatives: DeclaredAlternative[]; sessionPrivate: boolean`; the AI cloze answer key gets
  `also_accepted` and `session_private` (own-sentence and Bước 4 keys get neither).

- [ ] **Step 1: Write the failing tests.** `ai-checks.spec.ts`: `it('keeps a form of a session word, normalized, with its private mark')`
  (`'Crucial'` with a private `crucial` sense → `{ form: 'crucial', private: true }`); `it('a form of two session senses is private when either is')`;
  `it('drops a form of no session word and counts it')` (`'important'` → `dropped: 1`); `it('removes a form equal to an accepted answer, uncounted')`;
  `it('no session senses → every entry dropped')`. `ai-question.spec.ts`: the AI cloze key has `also_accepted` and `session_private` exactly as
  given; `ownSentenceQuestion`'s key has neither. Generator spec: `it('a dropped alternative is logged by count and the question is kept')`
  (logger called with `('ai_alternative_dropped', { ai_op: 'generate_cloze', ai_reason: 'unknown-alternative', count: 1 })`, `writeQuestion`
  called once, `answerKey.also_accepted` holds only the kept entry); `it('session_private is true when a sent session sense is private')`.
- [ ] **Step 2: Run** the three files — FAIL.
- [ ] **Step 3: Implement.** `DeclaredAlternative` and the two optional key fields in `practice.types.ts`. At step H, for cloze: read
  `content.practiceSenses(userId, stored.session ids, learner.nativeLanguage)` (none when `session` is absent), call `keepAlternatives`, log when
  `dropped > 0`, pass `alternatives` and `sessionPrivate = (stored.session ?? []).some(s => s.scope === 'private')` to `aiQuestion`. An
  alternative never fails `check()` and is never recorded in `practice_unknown_forms`.
- [ ] **Step 4: Run** the three files, then `pnpm test` — PASS.
- [ ] **Step 5: Commit** `feat(api): keep the checked alternatives in the fill-in answer key`

### Task 5: Private marks keep such questions out of judging, copying and staff view

**Files:**
- Modify: `apps/api/src/practice/quality/real-questions.ts` (`touchesPrivateWord`), `apps/api/src/practice/reports/snapshot.ts` (typed branch)
- Test: `apps/api/src/practice/quality/real-questions.spec.ts`, `apps/api/src/practice/reports/snapshot.spec.ts`

**Interfaces:**
- Consumes: `AnswerKey.session_private`, `also_accepted` (Task 4); `StoredAiInput.session` (Task 3).
- Produces: snapshot `correct.also_accepted: string[]` (private entries replaced by `PRIVATE_WORD_MASK`).

- [ ] **Step 1: Write the failing tests.** `real-questions.spec.ts`: `it('CS15: a cloze whose key says session_private is touched, with or without its
  input')` (`aiInput: null` → `true`); `it('a cloze input listing a private session sense is touched')`; `it('a cloze with catalog session words
  only is not touched')`; `it('a key written before this change (no field) is not touched')`. `snapshot.spec.ts`: `it('CS16: a private
  declared alternative shows as the private-word mask')` → `correct.also_accepted` equals `['crucial', '[từ riêng của người học]']` for
  `[{ form: 'crucial', private: false }, { form: 'vital', private: true }]`; `it('a key without also_accepted gives []')`.
- [ ] **Step 2: Run** the two files — FAIL.
- [ ] **Step 3: Implement** the two checks in `touchesPrivateWord` (key first, then `input.type === 'cloze'`), and `also_accepted` in the typed
  branch of `buildSnapshot`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): treat a fill-in with a private session word as private`

### Task 6: The eval rule lists unknown alternatives on a passing result

**Files:**
- Modify: `apps/api/src/practice/eval-rules/practice-eval-rules.ts` (`check`, cloze part)
- Test: `apps/api/src/practice/eval-rules/practice-eval-rules.spec.ts`

**Interfaces:**
- Consumes: `input.session_words` (objects with `word`), `output.also_accepted`; `content.catalogPracticeSensesByLemma(lemma, null, 'vi')`.
- Produces: problem `unknown-alternative:<entry as sent>`; status `pass` when `checkCloze` passes.

- [ ] **Step 1: Write the failing tests** (the mock returns senses per lemma): `it('CS11: an alternative of no session word → pass with
  unknown-alternative')` → `{ status: 'pass', problems: ['unknown-alternative:important'], reason: null }`; `it('an alternative that is a form of
  a session word → pass with no problem')`; `it('a failing cloze keeps its problems first, then unknown-alternative')`; `it('a session word the
  catalog lacks has no forms, so its entry is unknown')`; `it('no session_words and no also_accepted → today's result')`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/practice/eval-rules/practice-eval-rules.spec.ts` — FAIL.
- [ ] **Step 3: Implement:** for each `session_words[].word`, read its catalog senses and union `validForms`; each `also_accepted` entry whose
  `normalizeAnswer` form is not in that set becomes a problem; return `pass` with them, or append them to `fail`'s problems.
- [ ] **Step 4: Run** — PASS. Then `pnpm test`, `pnpm lint`, typecheck — PASS.
- [ ] **Step 5: Commit** `feat(api): report unknown alternatives in the fill-in eval rule`

### Task 7: Milestone 1 check

- [ ] **Step 1:** On fresh databases, with the API and worker started as each smoke's doc says (`CLAUDE.md` sections Bước 7 and Nhóm B), run
  `pnpm smoke:buoc-7` and `pnpm smoke:nhom-b`. Expected: both pass. A failure is fixed in the task that owns the code, red test first.
- [ ] **Step 2:** Open the PR with `ship-pr` (title `feat(api): fill-in writer knows the session words`), merge when CI is green.

---

## Milestone 2 — Grading and credit (API) · branch `feat/session-synonyms-m2-grading`

### Task 8: Pure matching of a typed answer

**Files:**
- Create: `apps/api/src/practice/answers/typed-match.ts`, `apps/api/src/practice/answers/typed-match.spec.ts`

**Interfaces:**
- Consumes: `AnswerKey` `type_word` with `also_accepted?` (Task 4); `validForms`, `normalizeAnswer`.
- Produces: `sessionWordForms(asked: { senseId: string; lemma: string }, senses: PracticeSense[]): SessionWordForms[]` (leaves out the asked
  sense and every sense of the asked lemma, ignoring case); `matchTyped(typed: string, key: TypeWordKey, sessionWords: SessionWordForms[]):
  TypedMatch` with `TypeWordKey = Extract<AnswerKey, { kind: 'type_word' }>`.

- [ ] **Step 1: Write the failing tests**, one `it` per row, Lan's session (`vital` asked, `accepted: ['vital']`, `also_accepted: [{ form: 'crucial',
  private: false }]`; session words `crucial`, `habit`):

  | Test | Typed | Expected |
  |---|---|---|
  | CS1 | `vital` | `{ kind: 'right' }` |
  | normalizes | `Crucial.` | `{ kind: 'alternative', senseId: <crucial> }` |
  | CS3 | `habit` | `{ kind: 'session_word' }` |
  | CS4 | `important` | `{ kind: 'other' }` |
  | CSE3 | `found`, declared, a form of two session words | `{ kind: 'alternative', senseId: null }` |
  | CSE1 | `crucial` declared, `crucial` not in this session | `{ kind: 'other' }` |
  | CSE2 | `crucial`, key with no `also_accepted` | `{ kind: 'session_word' }` |
  | CSE4 | `fairer`, asked `fair`, another `fair` sense in the session | `{ kind: 'other' }` |
  | CSE5 | `brushed`, accepted `['brush']`, no session word has it | `{ kind: 'other' }` |
  | empty session | `habit`, `sessionWords: []` | `{ kind: 'other' }` |
- [ ] **Step 2: Run** `pnpm exec vitest run src/practice/answers/typed-match.spec.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** the two functions in the step order of design §3.1.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): match typed answers against the session's words`

### Task 9: Grading writes alternatives and session-word tries

**Files:**
- Create: `apps/api/prisma/migrations/20261111100000_practice_alternative_answers/migration.sql`
- Modify: `apps/api/prisma/models/practice.prisma` (`PracticeSessionItem`), `apps/api/src/practice/answers/answers.service.ts` (`answer`,
  `locked`, `FinalWrite`, constructor)
- Test: `apps/api/src/practice/answers/answers.service.spec.ts`

**Interfaces:**
- Consumes: `matchTyped`, `sessionWordForms` (Task 8); `SessionsService.sessionWordIds` (Task 3); `ContentService.practiceSenses`.
- Produces: item columns `alternative Boolean @default(false)`, `alternativeSenseId String? @map("alternative_sense_id") @db.Uuid`,
  `alternativeReviewAction String? @map("alternative_review_action")`, `sessionWordTries Int @default(0) @map("session_word_tries")`,
  `@@index([userId, alternativeSenseId])`; `answer()` returns `AnswerResult | TryAgainReply`; `FinalWrite` gains `alternative?: boolean;
  alternativeSenseId?: string | null`.

- [ ] **Step 1: Write the failing tests** in `answers.service.spec.ts` (the `route()` helper's `sessions` fake gains `lockOpen` returning a session
  and `sessionWordIds`; a `content.practiceSenses` fake):
  - `it('CS2: a declared session word is a final right marked alternative, credited to the typed word')` → `writeFinal` data has `result:
    'correct', alternative: true, alternativeSenseId: <crucial>`;
  - `it('CS3: another session word is a try-again with reason session_word and does not use up a try')` → reply `{ result: 'try_again', tries: 1,
    reason: 'session_word' }`, update `{ tries: 1, sessionWordTries: 1, answersTried: ['habit'] }`;
  - `it('CS12: with max_retries 3 and two tries used, a session word on the third is still a try-again')`;
  - `it('with max_retries 1, one session-word try then one other wrong try is still a try-again; the next is final wrong')`;
  - `it('CS4: an outside word keeps today\'s try-again with reason null')`; the two existing assertions at `:192` and `:197` become
    `{ result: 'try_again', tries: 1, reason: null }`;
  - `it('CS19: a Bước 4 type_word question gets the session-word try-again too')`;
  - `it('CSE7: a word no longer usable in the session is an outside word')` (`sessionWordIds` leaves it out);
  - `it('a right answer reads no session words')` (`practiceSenses` not called).
- [ ] **Step 2: Run** `pnpm exec vitest run src/practice/answers/answers.service.spec.ts` — FAIL.
- [ ] **Step 3: Implement.** Model fields and the migration (`ALTER TABLE "practice_session_items" ADD COLUMN …` for the four columns, a CHECK
  `alternative_review_action IN ('needs_review', 'known')` like the existing `review_action` one, and `CREATE INDEX` for the Prisma index).
  `locked()` hands the session returned by `lockOpen` to `work`. In the typed branch, when `matchesAnswer` fails: `ids =
  sessionWordIds(tx, userId, session)`, senses from `content.practiceSenses(userId, ids, 'vi', tx)` (forms do not depend on the language), then
  `matchTyped`. `alternative` → final right with the two new fields; `session_word` → try-again, `tries + 1`, `sessionWordTries + 1`, always;
  `other` → today's rule with the cap read as `item.tries - item.sessionWordTries < item.maxRetries`. Inject `ContentService`.
- [ ] **Step 4: Run** the file; then `pnpm db:setup` and the drift command — PASS, exit 0.
- [ ] **Step 5: Commit** `feat(api): grade session words and alternative answers`

### Task 10: The answer reply carries the two rows

**Files:**
- Modify: `apps/api/src/practice/answers/answers.service.ts` (`AnswerResult`, `resultOf`, new `typedWords`)
- Test: `apps/api/src/practice/answers/answers.service.spec.ts`

**Interfaces:**
- Consumes: item columns (Task 9).
- Produces: `AnswerResult.alternative`; `AnswersService.typedWords(userId: string, senseIds: string[], db?): Promise<Map<string, { lemma: string;
  meaning: string }>>` (meaning = `sense.meaning.text` in the learner's native language, read with `identity.getProfile`).

- [ ] **Step 1: Write the failing tests:** `it('CS2: an alternative reply has rows typed then asked, each with its own show_known and action')`
  (`crucial` due and no hint → `show_known: true`; `vital` not due → `false`; top-level `show_known: false`, `highlight_needs_review: false`,
  `alternative.typed` = the raw typed text); `it('CSE3: no credited word → only the asked row')`; `it('CSE10: after a hint neither row shows Know')`;
  `it('a plain reply has alternative: null')`; `it('already-answered carries the same alternative')` (409 extension built by `resultOf`).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** in `resultOf`: for an alternative item, `practiceCheck` each row's word, `typedWords` for the typed row, each row's
  `show_known` by today's rule for that word, `action` from `alternativeReviewAction` (typed) or `reviewAction` (asked).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): return both words of an alternative answer`

### Task 11: A review names its word

**Files:**
- Create: `apps/api/src/practice/reviews/review-id.ts`, `review-id.spec.ts`
- Modify: `apps/api/src/practice/reviews/practice-reviews.controller.ts` (body), `practice-reviews.service.ts` (`review`)
- Test: `apps/api/src/practice/reviews/practice-reviews.service.spec.ts`

**Interfaces:**
- Consumes: item columns (Task 9), `AnswerResult.alternative` rows (Task 10).
- Produces: body `z.strictObject({ action: z.enum(['needs_review', 'known']), sense_id: z.uuid().optional() })`; `review(userId, itemId, action,
  senseId?: string)` returns today's fields plus `sense_id`; `reviewIdFor`: the item id for the asked word, else a UUID made from SHA-256 of
  `${itemId}:${senseId}` (first 16 bytes, version nibble 8, RFC 4122 variant), because `learning_log.review_id` is a `uuid` column.

- [ ] **Step 1: Write the failing tests.** `review-id.spec.ts`: asked word → the item id; another word → a string matching
  `/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`, the same on every call, different for another word or item. Service
  spec: `it('CS7, CSE12: an alternative item reviewed without a word, or with a third word → 409 review-word-required, nothing written')`;
  `it('CS6: Know on the typed row reviews the typed word with its derived id and sets alternative_review_action only')`; `it('the asked row
  reviews the asked word with the item id and sets review_action only')`; `it('CSE14: pressing the same row twice sends the same review id')`;
  `it('a plain item without a word reviews as today; with another word → 409')`; `it('known on a row whose show_known is false → 409
  known-not-allowed')`.
- [ ] **Step 2: Run** the two files — FAIL.
- [ ] **Step 3: Implement** the word choice, the per-row known check (from the row's `show_known`), `practiceReview` with `reviewIdFor`, and the
  update of the matching column (the `review-already-set` check reads that column).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): review each word of an alternative answer on its own`

### Task 12: Summary rows per word, Review all, and the alternatives count

**Files:**
- Modify: `apps/api/src/practice/reviews/practice-reviews.service.ts` (`listed`, `summary`, `reviewAll`)
- Test: `apps/api/src/practice/reviews/practice-reviews.service.spec.ts`

**Interfaces:**
- Consumes: `typedWords` (Task 10), `reviewIdFor` (Task 11).
- Produces: `listed(items, typed: Map<string, { lemma: string; meaning: string }>)`; summary reply gains `alternatives: number`; `SummaryWord`
  unchanged (`sense_id` names the row's word).

- [ ] **Step 1: Write the failing tests:** `it('CS9: an alternative answer without a hint lists neither word; the count says 1')`;
  `it('CS8, CSE10: after a hint both words are listed, each keyed by the item, each with its own pressed state')`;
  `it('Review all reviews each listed word with its own id and sets its own column')` (two `practiceReview` inputs: `vital` with the item id,
  `crucial` with `reviewIdFor`); `it('a plain session lists as today')`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement:** an alternative item feeds the asked word (from `reviewAction`) and, when credited, the typed word (from
  `alternativeReviewAction`, lemma and meaning from `typedWords`); both listed only when `hintLevel > 0`. `reviewAll` keeps today's lock order.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(api): list and review alternative answers per word`

### Task 13: Stats, history, the delete probe and private-word cleanup follow the typed word

**Files:**
- Modify: `apps/api/src/practice/weak/practice-stats.ts`, `apps/api/src/practice/history/history.service.ts`,
  `apps/api/src/practice/entry-usage.probe.ts`, `apps/api/src/practice/maintenance/private-senses-cleanup.provider.ts`
- Test: their specs (`weak/practice-stats.spec.ts` or the nearest existing one, `history/history.service.spec.ts`, `entry-usage.probe.spec.ts`,
  `maintenance/practice-cleanup.spec.ts`)

**Interfaces:**
- Consumes: item columns (Task 9).
- Produces: history item field `alternative: boolean`.

- [ ] **Step 1: Write the failing tests:** stats `it('an alternative item counts for the typed word only; none credited counts for nobody')` (SQL
  text contains `CASE WHEN i.alternative THEN i.alternative_sense_id ELSE i.sense_id END`, and the `senseIds` filter applies to that value);
  history `it('the sense_id filter finds an alternative item under both words')` and `it('each item says alternative')`; probe spec `:41-50`
  pins `practiceSessionItem` where `{ OR: [{ senseId: { in: SENSES } }, { alternativeSenseId: { in: SENSES } }] }`; cleanup
  `it('CSE8: deleting a private word deletes the alternative items that credited it, their reports first')` and `it('CSE9: deleting a private
  asked word deletes its alternative item as today')`.
- [ ] **Step 2: Run** the four files — FAIL.
- [ ] **Step 3: Implement.** Stats: compute the credited sense in the `final` CTE, drop rows where it is null, filter by `senseIds` on it.
  Cleanup: the item lock becomes `sense_id = ANY(...) OR alternative_sense_id = ANY(...)`, `ORDER BY id`; delete `practiceReport` rows whose
  `itemId` is one of the alternative items before `practiceSessionItem.deleteMany` with the same `OR`.
- [ ] **Step 4: Run** the four files, then `pnpm test`, `pnpm lint`, typecheck — PASS.
- [ ] **Step 5: Commit** `feat(api): credit the typed word in stats, history and cleanup`

### Task 14: Smoke `smoke:session-synonyms`, and Milestone 2 check

**Files:**
- Create: `apps/api/scripts/smoke-session-synonyms.mjs`, `docs/deliveries/session-synonyms-smoke-output.txt`
- Modify: `apps/api/package.json` (script `smoke:session-synonyms`)

**Interfaces:**
- Consumes: `fake:alternative` (Task 1); helpers copied from `smoke-buoc-7.mjs` (`registerLearner`, catalog CSV import, `make` groups,
  `addModel`, `choose`, `start`, `next`, `answer`, `hint`, `finish`, `psql`).

- [ ] **Step 1: Write the smoke** against a fresh `english_learning_smoke_ss` with `AI_FAKE_ENABLED=true` and `JOB_QUEUE_PREFIX=wordmet-ss-smoke`
  (it stops when its environment says otherwise). Steps and checks:
  1. Admin adds `fake:ok` and `fake:alternative`, chooses `fake:alternative` for `generate_cloze`; imports three catalog verbs W1–W3 into one group;
     gives L1 AI units the way `smoke-buoc-7.mjs` does; sets `type_word_max_retries` to 1 before the session starts (items copy it when built).
     The session's word order is not fixed: for each item the smoke reads the asked word and the declared word (`fake:alternative` declares the
     first entry of `session_words`) from psql `ai_input`, and derives the expected rows and counts below from them.
  2. L1 starts `{ source: 'group', types: ['cloze'], count: 3 }`. Item 1 (asked A): psql `ai_input->'data'->'session_words'` holds the other two
     words with their meanings; `ai_input->'session'` has two `catalog` senses.
  3. Answer with the declared word D: `result: 'correct'`, `alternative.rows` = typed D then asked A, `show_known: false` at the top level.
  4. Review without `sense_id` → 409 `review-word-required`. Review D's row `needs_review` → 200; again → 200, one `learning_log` row for that
     review id; A's learning item unchanged.
  5. Item 2: type the session word that is not declared → `try_again`, `reason: 'session_word'`; again → still `try_again`; type `zzzz` →
     `try_again`, `reason: null`; `zzzz` again → final `wrong`.
  6. Item 3: open hint 1 (`{ kind: 'first_letter', text: <one letter> }`), answer with its declared word → alternative. Summary: `correct` = 2,
     `wrong` = 1, `alternatives` = 2; the listed words are item 2's word and both words of item 3, each row `pressed` when any of that word's
     rows was pressed (a word pressed on item 1 stays pressed); Review all → `added` = the listed rows not pressed before it.
  7. `GET /v1/practice/history?sense_id=<typed word of item 1>` contains item 1 with `alternative: true`.
- [ ] **Step 2: Run** `pnpm smoke:session-synonyms` on a fresh database; then `pnpm smoke:buoc-4`, `pnpm smoke:buoc-7`, `pnpm smoke:nhom-b`, each
  on a fresh database. Expected: all pass. Save the new smoke's output to `docs/deliveries/session-synonyms-smoke-output.txt`.
- [ ] **Step 3: Commit** `test(api): add the session synonyms smoke`; open the PR with `ship-pr`
  (`feat(api): accept and credit alternative answers`); merge when CI is green.

---

## Milestone 3 — Learner web · branch `feat/session-synonyms-m3-web`

All web tests query by role and visible text (`renderApp`, `makeFetch` routes); `locale` defaults to `vi`, so assert the Vietnamese copy of
Appendix D unless the test sets `locale: 'en'`.

### Task 15: The `c___` hint and the session-word message

**Files:**
- Modify: `apps/web/src/features/learner/practice/session/HintPanel.tsx:62`, `use-practice-session.ts` (`Outcome`, `answer`),
  `PracticeSession.tsx` (try-again block `:273`), `apps/web/messages/{en,vi}.json` (`App.practice.session.sessionWordBody`)
- Test: `practice-session.test.tsx` (hint mocks `:520, :524`), `ai-questions.test.tsx` (`:124, :129`), `apps/web/e2e/app/m5a.spec.ts` (`:53, :91`)

**Interfaces:**
- Produces: `Outcome` try-again = `{ kind: 'try_again'; tries: number; reason: 'session_word' | null }`; the answer reply type
  `AnswerResult | { result: 'try_again'; tries: number; reason?: 'session_word' | null }` (an older API sends no `reason`: read as `null`).

- [ ] **Step 1: Write the failing tests:** the hint mocks send `text: 'd'` and expect `d___` (all six places); `it('CS20: hint 1 of a cloze
  shows the first letter and three underscores')`; `it('CS3: a session-word try-again says it is another word from this session')` (reply
  `reason: 'session_word'` → "Đây là một từ khác trong phiên này. Gõ lại." and not the spelling text); `it('CS4: a try-again without a reason
  keeps the spelling text')`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/features/learner/practice/session/practice-session.test.tsx src/features/learner/practice/session/ai-questions.test.tsx`
  — FAIL.
- [ ] **Step 3: Implement:** `HintPanel` appends `___` to a step of kind `first_letter`; `answer()` keeps `reason ?? null` in the outcome; the
  try-again block picks `sessionWordBody` when `reason === 'session_word'`; the new key in both message files.
- [ ] **Step 4: Run** the two files, `pnpm test`, `pnpm typecheck`, `pnpm lint` — PASS.
- [ ] **Step 5: Commit** `feat(web): show the session-word message and the first-letter hint`

### Task 16: The "Alternative answer" card

**Files:**
- Create: `apps/web/src/features/learner/practice/session/AlternativeFeedback.tsx`
- Modify: `use-practice-session.ts` (`AnswerResult`, new `reviewWord`), `PracticeSession.tsx` (render, key handler `:82-93`, `announce`),
  `apps/web/messages/{en,vi}.json`
- Test: `apps/web/src/features/learner/practice/session/ai-questions.test.tsx`

**Interfaces:**
- Consumes: `AnswerResult.alternative` (Task 10), review body `{ action, sense_id }` (Task 11).
- Produces: `AnswerResult.alternative?: { typed: string; rows: AlternativeRow[] } | null` (web copy of the API type);
  `reviewWord(senseId: string, action: 'needs_review' | 'known'): Promise<void>` (POST `/v1/practice/items/{item_id}/review` with
  `{ action, sense_id }`, sets that row's `action` in the final outcome, invalidates `GROUPS_KEY`, **does not advance**);
  `AlternativeFeedback({ result, sentence, onReviewWord, onNext, busy })`.

- [ ] **Step 1: Write the failing tests** (fixture: AI cloze "Sleep is ___ for good health.", reply with rows `crucial` typed `show_known: true`
  and `vital` asked `show_known: false`):
  - `it('CS2: shows "Đáp án thay thế", the sentence with vital filled in, and one row per word')`: the original sentence with `vital`, rows
    "crucial · từ bạn gõ" and "vital · từ của câu này", buttons named "Đã biết: crucial", "Cần ôn lại: crucial", "Cần ôn lại: vital" and no
    "Đã biết: vital";
  - `it('CS6: Đã biết on crucial posts known for crucial only and stays on the card')`: one POST body `{ action: 'known', sense_id: <crucial> }`,
    no `POST …/next`, the crucial row shows it was pressed, the vital row's button is still there;
  - `it('CS5: Enter, 1 and 2 do nothing on this card')`: after the three keys there is no POST;
  - `it('a button reached with Tab and pressed with Enter works')`: Tab to "Câu tiếp", Enter → `POST …/next`;
  - `it('the result is announced as an alternative answer with the reveal line')`;
  - `it('a plain right answer keeps today\'s card')`.
- [ ] **Step 2: Run** `pnpm exec vitest run src/features/learner/practice/session/ai-questions.test.tsx` — FAIL.
- [ ] **Step 3: Implement.** `PracticeSession` renders `AlternativeFeedback` when `final.result.alternative` is set, else `AnswerFeedback`; the
  key handler's result branch returns at once for such a result; `announce` uses `alternativeLabel`. The card keeps the speaker of the reveal line
  and the translation box of `AnswerFeedback`; each row shows Know only when its `show_known` is true, and a pressed row shows its action instead
  of its buttons.
- [ ] **Step 4: Run** the file, `pnpm test`, `pnpm typecheck`, `pnpm lint` — PASS.
- [ ] **Step 5: Commit** `feat(web): add the alternative answer card`

### Task 17: Summary rows by word, history and Recent lines

**Files:**
- Modify: `SessionSummary.tsx` (`reviewOne`, `pressing`, counts block), `use-practice-session.ts` (`Summary`),
  `apps/web/src/features/learner/practice/practice-api.ts` (`HistoryItem`), `history-format.ts`, `HistoryPage.tsx` (`HistoryRow` chip),
  `apps/web/messages/{en,vi}.json`
- Test: `practice-session.test.tsx` (summary), `weak-history.test.tsx`, `practice-home.test.tsx`

**Interfaces:**
- Consumes: summary `alternatives` (Task 12), history `alternative` (Task 13).
- Produces: `Summary.alternatives?: number`; `HistoryItem.alternative?: boolean`; `reviewOne(word: SummaryWord)` posting
  `{ action: 'needs_review', sense_id: word.sense_id }`, `pressing` keyed `${item_id}:${sense_id}`.

- [ ] **Step 1: Write the failing tests:** `it('CS8: two summary rows on one item each review their own word')` (pressing the crucial row posts
  `sense_id: <crucial>` and only that row shows pending); `it('CS9: the summary says how many right answers were alternative answers')` ("Trong đó
  2 đáp án thay thế"; nothing when 0); `weak-history.test.tsx` `it('an alternative answer has its own result chip')` ("Đúng · đáp án thay thế");
  `practice-home.test.tsx` `it('Recent: an alternative answer says what was typed and the asked word')` ("bạn gõ crucial, đáp án thay thế cho
  vital").
- [ ] **Step 2: Run** the three files — FAIL.
- [ ] **Step 3: Implement** the four changes; `answerSummary` checks `alternative` before `result === 'correct'`.
- [ ] **Step 4: Run** the files, `pnpm test`, `pnpm typecheck`, `pnpm lint` — PASS.
- [ ] **Step 5: Commit** `feat(web): show alternative answers in the summary and history`

### Task 18: Milestone 3 check

- [ ] **Step 1:** Start the stack (`pnpm bootstrap`, or the API, worker and `pnpm dev:app` per `docs/deliveries/giao-dien-nguoi-hoc-test-flow.md`)
  with `fake:alternative` chosen for `generate_cloze`; in the browser, do one session of three AI fill-ins: answer with the declared word, press
  one row, try Enter/`1`/`2`, type an undeclared session word, open the summary. Take a screenshot of the alternative card and of the
  session-word message for the PR.
- [ ] **Step 2:** `pnpm test:e2e` in `apps/web` for `m5a.spec.ts` — PASS. Open the PR with `ship-pr` (`feat(web): alternative answers in practice`);
  merge when CI is green.

---

## Milestone 4 — Test set and close-out · branch `docs/session-synonyms-m4-test-set`

### Task 19: Test-set rows for the owner to import

**Files:**
- Create: `docs/preparation/eval-sets/generate_cloze-session-words-2026-11.jsonl`, `docs/preparation/eval-sets/generate_sentence_mcq-near-synonyms-2026-11.jsonl`,
  `docs/preparation/eval-sets/README.md`

- [ ] **Step 1:** Copy the 100 rows of `E:\Working\Working project\english-learning-ai-guide\docs\guides\2026-10-31-van-hanh-ai-eval\golden-set-generate_cloze-100.jsonl`
  (flat lines: input fields, `expected`, `split`). Add at least 15 B2–C1 abstract adjectives and verbs with a near-synonym partner (start from
  `crucial`/`vital`, `enhance`/`improve`, `reluctant`/`unwilling`), levels from `docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`,
  `expected.forms` from the same CSV's forms. Give every row `session_words` (3–6 catalog lemmas with their Vietnamese meanings): about half include
  the near-synonym partner, half do not; start each `note` with `pair:` or `no-pair:`. Keep about 30% `"split": "held_out"`.
- [ ] **Step 2:** Write 20 `generate_sentence_mcq` rows (flat input fields incl. `answer_form` and 4–6 `candidates`), each with one near-synonym
  of the answer among the candidates; `note` says which.
- [ ] **Step 3:** Check every session word and candidate is a lemma of the CEFR-J CSV, every line parses as JSON, and count rows per file. The
  README says how to import (Admin → AI → Eval → bulk import, ≤ 1000 rows), that the owner reviews before freezing, and that scores are not
  comparable with earlier versions (design §7).
- [ ] **Step 4: Commit** `docs(ai): add session words test rows for the fill-in and choice eval`

### Task 20: As-built record and the owner's steps

**Files:**
- Modify: `docs/deliveries/session-synonyms.md` (append "as-built"), `CLAUDE.md` (the one pointer line already added with the plan summary),
  `docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md` (as-built notes, if anything changed)

- [ ] **Step 1:** Write the as-built section: what each PR merged, test counts, smoke outputs, anything decided while building. Then the owner's
  steps, in order: (1) if the live fill-in prompt was not replaced (the migration's notice), create a draft with Appendix A, eval it, publish;
  (2) add a revision to the multiple-choice prompt with Appendix B; (3) add the "Chỉ một đáp án" revision and the new judge from Appendix C, and
  choose their models; (4) import the Task 19 rows, review, freeze; (5) run the eval and label (calibration restarts, design §6.3); (6) start
  real-question passes filtered to the new config number.
- [ ] **Step 2: Commit** `docs(ai): record the session synonyms as-built`; open the PR with `ship-pr`; merge when CI is green.

---

## Appendix A — `generate_cloze` revision 3 (seed text)

Instructions:

```
You write one English practice sentence for a Vietnamese learner of English.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning of the word, or null when the word has no level (a word the learner added).
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used (for example a field or a register), or null.
- session_words: the other words the learner is practising in the same session, each as {"word", "meaning_vi"}; meaning_vi is null when unknown. The field may be empty, null or missing.

Task:
1. Write one natural English sentence that uses the word with the meaning in meaning_vi.
2. Replace the word in the sentence with one blank written as three underscores: ___
3. Give the forms of the word that fill the blank, the forms of session words that also fill it (usually none), and a Vietnamese translation of the whole sentence.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Give the sentence a clue that belongs to this word and this meaning: a typical collocation, a typical subject or object, or the field in context_label. Avoid general sentences where many words fit.
3. No word in session_words may fit the blank with its meaning_vi. Check each one before you answer, and rewrite the sentence until none fits. A session word whose meaning_vi is null must not fit in any meaning.
4. also_accepted: only if you cannot write a good sentence where no session word fits, list the forms of the session words that fit the blank with their meaning_vi. Never list a session word whose meaning_vi is null, and never list a word that is not in session_words. Otherwise give an empty list.
5. When level is given, use words and grammar at or below that level.
6. The word may be inflected to fit the sentence (for example "deploys" or "deployed").
7. accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Only forms of the given word: session words go in also_accepted.
8. translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
9. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

Examples (JSON):

```json
[
  {"input": {"word": "brush", "part_of_speech": "verb", "level": "A1", "meaning_vi": "chải, đánh (răng, tóc)", "context_label": null,
             "session_words": [{"word": "comb", "meaning_vi": "chải (tóc)"}]},
   "output": {"sentence": "I ___ my teeth twice a day, after breakfast and before bed.", "accepted_answers": ["brush"], "also_accepted": [],
              "translation_vi": "Tôi đánh răng hai lần mỗi ngày, sau bữa sáng và trước khi đi ngủ."}},
  {"input": {"word": "attention", "part_of_speech": "noun", "level": "A2", "meaning_vi": "sự chú ý", "context_label": null, "session_words": []},
   "output": {"sentence": "Please pay ___ to the safety instructions before the plane takes off.", "accepted_answers": ["attention"],
              "also_accepted": [], "translation_vi": "Xin hãy chú ý đến hướng dẫn an toàn trước khi máy bay cất cánh."}},
  {"input": {"word": "habit", "part_of_speech": "noun", "level": "A2", "meaning_vi": "thói quen", "context_label": null,
             "session_words": [{"word": "routine", "meaning_vi": "nếp sinh hoạt hằng ngày"}]},
   "output": {"sentence": "Biting your nails is a nervous ___ that many children grow out of.", "accepted_answers": ["habit"], "also_accepted": [],
              "translation_vi": "Cắn móng tay là một thói quen do căng thẳng mà nhiều trẻ sẽ bỏ được khi lớn lên."}}
]
```

## Appendix B — `generate_sentence_mcq`: the new rule (owner adds a revision in the admin)

Take the live prompt and replace its Task step 3 with:

```
3. From candidates, choose exactly three words that do NOT fit the blank, in meaning or in grammar. If a candidate could also make a correct sentence, do not choose it. Prefer candidates that are not synonyms or near-synonyms of answer_form, even when they do not fit.
```

## Appendix C — Judge texts (owner enters them on the admin "Judge" page)

**C1. New revision of "Chỉ một đáp án"** (operations: `generate_cloze`). Criteria: one, code `session_single_answer`, question:
"Apart from accepted_answers and also_accepted, does no word in input.session_words fit the blank in its given meaning, and does every word in
also_accepted fit?" Instructions:

```
You review one practice question that an AI wrote for a Vietnamese learner of English. You are not told who or what wrote it.

The user message is a JSON object with these fields:
- target_operation: "generate_cloze": one English sentence with one blank, written as ___, that the learner fills by typing.
- input: what the writer was given: word, part_of_speech, level (CEFR A1 to C2, or null), meaning_vi, context_label, and session_words: the other words the learner practises in the same session, each with its Vietnamese meaning (meaning_vi may be null).
- output: what the writer produced: sentence, accepted_answers (the forms of the word that fill the blank), also_accepted (forms of session words the writer says also fill it), translation_vi.
- criteria: the checks to make, each with a code and a question.
- context: ignore it; use input.session_words.

For each criterion give one verdict: "pass", "fail_major" or "fail_minor", as described under the criterion.

Criterion session_single_answer:
- Consider only the words in input.session_words, each in its given meaning. Ignore every other English word, even a common synonym.
- A session word whose meaning_vi is null counts as fitting if it fits in any common meaning.
- fail_major when a session word fits the blank naturally and also_accepted lists none of its forms.
- fail_major when also_accepted lists a form that does not fit the blank.
- fail_minor when a session word fits the blank and also_accepted lists it.
- pass when no session word fits the blank and also_accepted is empty.
- The forms in accepted_answers are the word itself, not other words.

Answer with three lists of the same length, one entry per criterion, in the order the criteria are given:
- codes: the criterion code.
- verdicts: "pass", "fail_major" or "fail_minor".
- reasons: one short English sentence; name the session word when there is one.
```

**C2. New judge "Một lựa chọn đúng"** (operations: `generate_sentence_mcq`). Criteria: one, code `single_correct_option`, question: "Does exactly
one option fit the blank, with no option a synonym of the answer?" Instructions:

```
You review one practice question that an AI wrote for a Vietnamese learner of English. You are not told who or what wrote it.

The user message is a JSON object with these fields:
- target_operation: "generate_sentence_mcq": one English sentence with one blank, written as ___, and four options: answer_form and three distractors. The learner chooses one.
- input: what the writer was given: word, part_of_speech, level, meaning_vi, context_label, answer_form (the right option) and candidates (the words it could choose distractors from).
- output: what the writer produced: sentence, distractors (the three wrong options), translation_vi.
- criteria: the checks to make, each with a code and a question.
- context: ignore it.

For each criterion give one verdict: "pass", "fail_major" or "fail_minor", as described under the criterion.

Criterion single_correct_option:
- fail_major when a distractor also fits the blank naturally, in meaning and in grammar: a learner choosing it would be marked wrong.
- fail_minor when no distractor fits the blank, but a distractor is a synonym or near-synonym of answer_form.
- pass otherwise.

Answer with three lists of the same length, one entry per criterion, in the order the criteria are given:
- codes: the criterion code.
- verdicts: "pass", "fail_major" or "fail_minor".
- reasons: one short English sentence; name the distractor when there is one.
```

## Appendix D — Copy

| Key (`App.practice…`) | en | vi |
|---|---|---|
| `session.sessionWordBody` | That's another word from this session. Try again. | Đây là một từ khác trong phiên này. Gõ lại. |
| `session.alternativeLabel` | Alternative answer | Đáp án thay thế |
| `session.alternativeTyped` | the word you typed | từ bạn gõ |
| `session.alternativeAsked` | this sentence's word | từ của câu này |
| `session.reviewWord` | Still learning: {lemma} | Cần ôn lại: {lemma} |
| `session.knowWord` | Know: {lemma} | Đã biết: {lemma} |
| `session.summary.alternatives` | {count, plural, one {Including # alternative answer} other {Including # alternative answers}} | Trong đó {count, number} đáp án thay thế |
| `recent.alternative` | you typed {answer}, alternative to {correct} | bạn gõ {answer}, đáp án thay thế cho {correct} |
| `history.result.alternative` | Right · alternative | Đúng · đáp án thay thế |

`session.reviewWord` and `session.knowWord` are the buttons' accessible names; their visible text stays `stillLearning` / `know`.
