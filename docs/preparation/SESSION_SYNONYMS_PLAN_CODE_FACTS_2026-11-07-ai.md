# Session synonyms plan: code facts, AI side (07/11/2026)

Read-only survey for the plan of `docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md` (§5.1–§7, §13). Worktree
`.claude/worktrees/cloze-session-synonyms`, branch `docs/cloze-session-synonyms` at `01f62a0d`. Paths are under `apps/api/` unless noted.
Every fact below was read in this worktree on 07/11/2026; nothing was run (no `node_modules` in the worktree). "Does not exist" means a grep
over the named scope returned nothing.

## 1. `src/ai/operations/text-rules.ts`

Exports (whole file is 43 lines):
- `:4` `export const BLANK = '___';`
- `:7` `export const codePoints = (value: string): number => [...value].length;`
- `:10-14` `export function textIn(min: number, max: number)` → `z.string().refine(no '\0', 'Must not contain \\0').refine(min ≤ codePoints ≤ max, 'Expected ${min} to ${max} characters')`.
- `:17-21` `export function toViolations(error: z.ZodError): string[]`: `<path joined by '.'>: <message>`; an `unrecognized_keys` issue gives one `<path>.<key>: Unrecognized key` per key.
- `:25` `export const clean = (value: string): string => value.replace(/\p{Cc}/gu, '').trim();` (no case change, no HTML escape).
- `:28-36` `export function dedupeAnswers(values: string[]): string[]`: drops case-insensitive duplicates (`toLowerCase()`), keeps the first.
- `:39` `export const STRING = { type: 'string' } as const;`
- `:40` `export const STRING_LIST = { type: 'array', items: { type: 'string' } } as const;`
- `:41-43` verbatim:
  ```ts
  export function objectSchema(properties: Record<string, Record<string, unknown>>): Record<string, unknown> {
    return { type: 'object', properties, required: Object.keys(properties), additionalProperties: false };
  }
  ```
  So every property is required and `additionalProperties: false`. `operations.spec.ts:181-222` enforces this for every operation in
  `OPERATIONS`: only keywords `type, properties, items, enum, required, additionalProperties` (:189), `required` equals the property keys of
  every object node (:197), `additionalProperties === false` (:205), and the list of schema names (:213-216, see item 3).

`generate-cloze.ts` (39 lines) imports `BLANK, clean, codePoints, dedupeAnswers, objectSchema, STRING, STRING_LIST, textIn` (:7) and
`ACCEPTED_ANSWER_MAX, ACCEPTED_ANSWERS_MAX, AI_LEVELS, AI_POS_UNSET, AI_VALID_POS, CONTEXT_LABEL_MAX, DEFAULT_MAX_OUTPUT_TOKENS, MEANING_MAX,
SENTENCE_MAX, TRANSLATION_MAX, WORD_MAX` (:2-5). Body verbatim:
```ts
export const generateCloze = define({
  name: 'generate_cloze',
  input: z.strictObject({
    word: textIn(1, WORD_MAX),
    part_of_speech: z.enum([...AI_VALID_POS, AI_POS_UNSET]),
    level: z.enum(AI_LEVELS).nullable(),
    meaning_vi: textIn(1, MEANING_MAX),
    context_label: textIn(1, CONTEXT_LABEL_MAX).nullable(),
  }),
  output: { sentence: STRING, accepted_answers: STRING_LIST, translation_vi: STRING },
  outputSchema: {
    name: 'generate_cloze_v1',
    schema: objectSchema({ sentence: STRING, accepted_answers: STRING_LIST, translation_vi: STRING }),
  },
  normalizeAndCheck(raw) {
    const rawSentence = raw.sentence as string;
    if (/[\n\r]/.test(rawSentence)) return { ok: false, problem: 'shape' };
    const sentence = clean(rawSentence).replace(/_{3,}/g, BLANK);
    const answers = dedupeAnswers((raw.accepted_answers as string[]).map(clean));
    const translation = clean(raw.translation_vi as string);
    if (sentence.split(BLANK).length !== 2) return { ok: false, problem: 'blank-count' };
    if (codePoints(sentence) > SENTENCE_MAX || codePoints(translation) > TRANSLATION_MAX
      || answers.some((answer) => codePoints(answer) > ACCEPTED_ANSWER_MAX)) return { ok: false, problem: 'too-long' };
    if (!translation || answers.some((answer) => !answer)) return { ok: false, problem: 'empty' };
    if (answers.length < 1 || answers.length > ACCEPTED_ANSWERS_MAX) return { ok: false, problem: 'answers-count' };
    if (answers.some((answer) => answer.includes('_'))) return { ok: false, problem: 'answer-underscore' };
    return { ok: true, value: { sentence, accepted_answers: answers, translation_vi: translation } };
  },
  defaultMaxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS.generate_cloze,
});
```
Constants (`src/ai/ai.constants.ts`): `WORD_MAX = 100` (:79), `MEANING_MAX = 300` (:80), `ACCEPTED_ANSWERS_MAX = 5` (:88),
`ACCEPTED_ANSWER_MAX = 100` (:89), `JUDGE_SESSION_WORDS_MAX = 50` (:68).

Nested input fields elsewhere:
- Arrays of strings: `generate_sentence_mcq` `candidates: z.array(textIn(1, WORD_MAX)).min(MCQ_CANDIDATES_MIN).max(MCQ_CANDIDATES_MAX)`
  (`generate-sentence-mcq.ts:22`); `generate_meaning_question` `other_meanings_vi: z.array(textIn(1, MEANING_MAX)).length(OTHER_MEANINGS_COUNT)`
  (`generate-meaning-question.ts:21`).
- An array of objects exists only in the judge operation input (`judge.ts:18-29`):
  ```ts
  criteria: z.array(z.strictObject({
    code: z.string().regex(JUDGE_CODE_PATTERN),
    question: textIn(1, JUDGE_QUESTION_MAX),
  })).min(1).max(JUDGE_CRITERIA_MAX),
  context: z.strictObject({
    session_words: z.array(textIn(1, WORD_MAX)).max(JUDGE_SESSION_WORDS_MAX),
  }).nullable(),
  ```
  A violation inside it is named by index, e.g. `criteria.0.code: …` (`operations.spec.ts:479-485`).
- None of the six operations' inputs has an array of objects. No operation input uses `.optional()` or `.default()` (grep of
  `src/ai/operations/` for both: empty).
- zod is `4.6.5` (`package.json:68`).

## 2. `src/ai/operations/define-operation.ts` (59 lines)

```ts
export type OutputProblem =
  | 'not-json' | 'shape' | 'blank-count' | 'too-long' | 'empty' | 'answers-count' | 'answer-underscore' | 'pos'
  | 'distractors' | 'verdict' | 'word';                                                     // :5-7
export type OutputCheck = { ok: true; value: Record<string, unknown> } | { ok: false; problem: OutputProblem };   // :8

export type OperationDefinition = {                                                          // :10-17
  name: GatewayOperation;
  inputFields: readonly string[];
  validateInput(data: unknown): { ok: true } | { ok: false; violations: string[] };
  outputSchema: { name: string; schema: Record<string, unknown> };
  checkOutput(value: unknown): OutputCheck;
  defaultMaxOutputTokens: number;
};

export type OperationSpec = {                                                                // :20-29
  name: GatewayOperation;
  input: z.ZodObject;
  /** Output fields: a string or a list of strings; the schema may narrow a string to an enum. */
  output: Record<string, typeof STRING | typeof STRING_LIST>;
  outputSchema: { name: string; schema: Record<string, unknown> };
  normalizeAndCheck(raw: Record<string, string | string[]>): OutputCheck;
  defaultMaxOutputTokens: number;
};
```
- `rawShape(spec, value)` `:32-43`: rejects a non-object or array; `keys.length !== fields.length` → false; each declared key must be own and
  be a string (`STRING`) or an array whose every item is a string (`STRING_LIST`). So output accepts exactly the declared keys.
- `define(spec)` `:45-59`: `inputFields: Object.keys(spec.input.shape)` (:48); `validateInput` runs `spec.input.safeParse(data)` and returns
  only `{ ok: true }` or `{ ok: false, violations: toViolations(error) }` (:49-52): **the parsed value (zod defaults) is discarded**;
  `checkOutput` = `rawShape ? normalizeAndCheck(value) : { ok: false, problem: 'shape' }` (:54-56).
- A list output field is supported today: `STRING_LIST` (used by `accepted_answers`, `distractors`, `examples`, judge `codes/verdicts/reasons`).

`inputFields` callers (non-spec): `src/ai/configs/configs.service.ts:120` (`input_fields` of `GET /v1/admin/ai/configs/{op}`),
`src/ai/models/operation-settings.service.ts:50`, `src/ai/prompts/prompts.service.ts:77` (`input_fields` of `GET /v1/admin/ai/prompts/{op}`).
Spec pins: `operations.spec.ts:224` (lookup), `:301-305` "input fields in the order the prompts name them" (meaning, MCQ, check; not cloze).

Admin uses `input_fields` to build forms, and an empty box becomes `null`:
- `apps/admin/src/features/ai/prompt-form.ts:27-37` `fieldValue(text)`: `''` → `null`; text starting `[` or `{` that parses → that JSON value;
  else the text. `toPayload` (:59-76) sends every input field through `fieldValue`; `emptyExample` (:52-55) has every input field `''`.
- `apps/admin/src/features/ai/ExampleDialog.tsx:51` fields = `inputFields` + other keys of the example; `:111` input = every field through
  `fieldValue` (an empty `session_words` box would be sent as `null`).
- `apps/admin/src/features/ai/bulk-examples.ts:106-107` CSV header columns must be input fields or `note|expected|split`; `:122` cell → `fieldValue`.

`validateInput` callers: `src/ai/eval/eval-examples.service.ts:103` (create/patch), `:175` (bulk), `src/ai/prompts/prompt-rules.ts:31`
(prompt and config examples), `src/ai/runner/runner.service.ts:132` (learner calls, `bad-input` permanent failure), `:200` (test/eval/judge).
In all of them the object stored or sent is the raw one passed in (e.g. `eval-examples.service.ts:147`, `:218`; runner sends
`data: context.data`, `runner.service.ts:240`).

## 3. `generate_cloze_v1` references and schema-name switches

`git grep -n generate_cloze_v1` (whole repo):
- Code: `src/ai/operations/generate-cloze.ts:21`; `src/ai/adapters/fake/fake.adapter.ts:20`, `:60`, `:103`.
- Tests: `src/ai/operations/operations.spec.ts:215` (ordered list `['generate_cloze_v1','lookup_word_v1','translate_sentence_v1',
  'generate_meaning_question_v1','generate_sentence_mcq_v1','check_private_word_v1']`); `src/ai/adapters/fake/fake.adapter.spec.ts:16` (default
  request schema); `src/ai/runner/runner.service.spec.ts:627` (stored request `schema_name`).
- Docs only: `docs/preparation/BUOC_7_CODE_FACTS_2026-10-20.md:363`, `docs/preparation/BUOC_7_PLAN_CODE_FACTS_2026-10-21.md:323,345`,
  `docs/superpowers/plans/2026-10-20-buoc-6-ai-integration.md:452`, the design (:242, :267) and its review (:151, :160).
- `generate_cloze_v2` does not exist anywhere.

Places that branch on an output schema name (non-spec):
- `fake.adapter.ts` `okValue(schemaName, data)` `:18-51` (switch; `default: return {}` → a `shape` failure at the gate),
  `badFormValue` `:57-74` (switch), `fake:two-blanks` hard-codes `okValue('generate_cloze_v1', data)` `:103`, `fake:not-recognized` compares
  `req.schema.name === 'check_private_word_v1'` `:121`.
- No other switch. The name is only passed on: OpenAI `text.format.name` (`src/ai/adapters/openai/openai-request.ts:21`); Anthropic sends
  `format: { type: 'json_schema', schema }` without the name (`anthropic-request.ts:22`); the runner stores `schema_name` in the call content
  (`runner.service.ts:261`). The schema itself comes from `GATEWAY_DEFINITIONS[operation].outputSchema` (`runner.service.ts:233`).
- `meta.schema_version` is a separate global `AI_SCHEMA_VERSION = 1` (`ai.constants.ts:5`, `ai.types.ts:36`, used in the replay fingerprint
  `runner/fingerprint.ts:17` and `runner.service.ts:298`); it is not tied to schema names.

Other code that builds or reads a `generate_cloze` output shape (non-spec): `scripts/ai-config-publish.mjs:38` (`expected = { forms:
output.accepted_answers }`), `apps/admin/e2e-real/support/ai-config.ts:68` (same), `scripts/smoke-nhom-b.mjs:664` (`shot()`), `:1657` (reads
`sentence` and `accepted_answers` only), `src/ai/judge/initial-judges.ts:12,19,31` (judge text), `src/practice/ai/ai-checks.ts:29-35`
(`checkCloze`), `src/practice/ai/ai-question-generator.service.ts:23` (`type ClozeValue = { sentence; accepted_answers; translation_vi }`),
`src/practice/ai/ai-question.ts:14`, `:53-57`, `src/practice/eval-rules/practice-eval-rules.ts:54`, `:78`. Admin test fixtures:
`apps/admin/src/features/ai/prompt-test-support.ts:16`, `real-questions/real-test-support.ts:28`.

## 4. Fake provider

`src/ai/adapters/fake/fake.adapter.ts` (144 lines):
- `FAKE_MODELS` `:5-8`: `'fake:ok', 'fake:slow', 'fake:two-blanks', 'fake:bad-json', 'fake:truncated', 'fake:429-then-ok', 'fake:503-then-ok',
  'fake:refuse', 'fake:quota', 'fake:auth', 'fake:bad-form', 'fake:not-recognized'` (`as const`). `fake:alternative` does not exist.
- Dispatch: `call(req, signal)` `:85-126` switches on `req.model` (the model id is the scenario); per scenario it builds the body from
  `okValue(req.schema.name, data)` / `badFormValue(...)`; an id not in the switch → `{ kind: 'error', error: 'model_rejected', httpStatus: 404 }`
  (:123-124). `data = (req.data ?? {}) as Data` (:87). `*-then-ok` count odd calls per `(model, sha256(data))` in memory (`isOddCall` :138-143).
- `okValue` `generate_cloze_v1` (:20-23): `{ sentence: 'Lan will ___ it tomorrow.', accepted_answers: [String(data.word)],
  translation_vi: 'Lan sẽ làm việc đó vào ngày mai.' }`. `badFormValue` cloze (:60-61): `accepted_answers: [\`${word}ment\`]`.
- `describeModel` `:128-136`: `not-found` unless the id is in `FAKE_MODELS`; found → `structuredOutputs: true, maxOutputTokens: 4096`.
  Adding a model (`POST /v1/admin/ai/models`) calls it: `src/ai/models/models.service.ts:176-191` → 422 `model-not-found` for an unknown id.
  So a new scenario needs both a `case` in `call` and an entry in `FAKE_MODELS`.

Where `FAKE_MODELS` is used: `fake.adapter.ts:129`; `fake.adapter.spec.ts:5`, `:188` (`it.each(FAKE_MODELS)('%s → found with structured
outputs')`); `apps/admin/e2e-real/m1a.real.spec.ts:19` (comment only). No migration seeds fake models (grep of `apps/api/prisma` for `fake:`:
empty); no admin source hard-codes the list (only test fixtures name `fake:ok`).

How smokes add and choose fake models:
- `scripts/smoke-buoc-7.mjs`: `addModel(modelId)` `:339-344` (`POST /v1/admin/ai/models { provider: 'fake', model_id }`, cached in `models`
  Map `:338`); `choose(op, modelId)` `:347` = `publishModel(asPublisher, { op, modelId })`; `back(op)` `:349` = `rollbackConfig`; `off(op)`
  `:351` = `turnOff`. Setup step `:396-413` adds `['fake:ok','fake:refuse','fake:slow','fake:503-then-ok','fake:bad-form','fake:not-recognized']`
  (:407) and chooses `fake:ok` for five operations (:408). A scenario step does `await choose('generate_cloze', 'fake:bad-form'); try { … }
  finally { await back('generate_cloze'); }` (AC6 `:671-705`).
- `scripts/smoke-nhom-b.mjs`: `addModel(modelId)` `:224-229`; `setDraftModel(op, modelId)` `:259-263` (saves the selected draft with the model);
  `publishModel`, `rollbackConfig`, `turnOff` imported `:25`; setup `:311-316` adds `fake:ok` and `fake:bad-form`.
- `scripts/ai-config-publish.mjs`: `ensureModel` `:69-74`; `publishModel(call, { op, modelId, maxOutputTokens = null })` `:131-147`: no-op if the
  live config has that model; else `ensureFrozenSet` (`:50-66`, makes a frozen set from `INITIAL_PROMPTS[op].examples` read from
  `dist/ai/prompts/initial-prompts.js` `:20-24`, `expected` from `expectedOf` `:37-43`), clears scripted drafts, `saveScriptedDraft` (`:110-117`:
  creates a draft copied from live and PUTs it back with `instructions: draft.instructions, examples: draft.examples`), runs the draft (and
  the live config when `baseline-required`), publishes with warnings acknowledged. One eval run per publish; `ai.test` allows 20 per hour.

Spec file: `src/ai/adapters/fake/fake.adapter.spec.ts`. Fixtures `CLOZE_DATA` `:7-9`, `request(model, overrides)` `:11-23` (schema
`generate_cloze_v1`), `parsed(model, op, data)` `:73-79` (runs `parseOutput`). Example test `:94-104`:
```ts
it('fake:bad-form → passes the gate, but the answer is not a form of the word, a distractor is outside candidates and the word is absent', async () => {
  const cloze = await parsed('fake:bad-form', 'generate_cloze', CLOZE_DATA);
  expect(cloze.accepted_answers).toEqual(['deployment']);
  …
});
```
`run(model, op, data)` `:71-72` uses `schema: OPERATIONS[op].outputSchema`, so tests through `parsed` follow the operation's current name.

## 5. Prompt storage after nhóm B; the revision 2 pattern; what a seed revision 3 touches

Prisma models (`prisma/models/ai.prisma`), verbatim fields:
- `AiPrompt` `:71-80` (table `ai_prompts`): `operation String @id`, `instructions String`, `examples Json`, `revision Int`, `updatedBy String
  @map("updated_by") @db.Uuid`, `updatedAt DateTime @default(now())`. Comment :70: "History only since nhóm B M2: the gateway reads the live config."
- `AiPromptRevision` `:83-94` (`ai_prompt_revisions`): `id`, `operation`, `revision Int`, `instructions`, `examples Json`, `savedBy`
  (`saved_by`), `savedAt`; `@@unique([operation, revision])`.
- `AiOperationSetting` `:41-55`: comment "Read-only history since nhóm B M2: the gateway reads ai_live_configs."
- `AiConfig` `:319-356` (`ai_configs`): `id`, `operation`, `number Int` ("Handed out by ai_live_configs.last_number, never twice"), `name String?`,
  `deletedAt`, `updatedAt @default(now()) @updatedAt`, `fingerprint String?`, `version Int @default(0)` ("0 on creation, +1 on each save of the
  draft"), `instructions`, `examples Json`, `modelRef String? @db.Uuid`, `effort`, `thinking` (`'off' | null`), `maxOutputTokens Int?`, `status
  String` (draft | published | retired, CHECK), `createdFrom String?` (no FK), `note`, `createdBy`, `createdAt`, `publishedBy String?`,
  `publishedAt DateTime?`; `@@unique([operation, number])`.
- `AiLiveConfig` `:358-370` (`ai_live_configs`): `operation String @id`, `configId` (FK RESTRICT), `previousConfigId String?` (FK RESTRICT),
  `version Int @default(0)`, `lastNumber Int` ("the counter of draft numbers").
- `AiConfigEvent` `:373-394` (`ai_config_events`, append-only): `operation`, `kind` (publish | rollback, CHECK), `configId`, `fromConfigId?`,
  `candidateRunId?`, `baselineRunId?` (FK RESTRICT to `ai_eval_runs`), `warnings Json @default("[]")`, `actorId`, `at`.
- `AiConfigRevision` `:532-545` (`ai_config_revisions`): `id`, `configId` (FK RESTRICT), `version Int`, `content Json`, `fingerprint String?`,
  `name`, `note`, `savedBy`, `savedAt`; `@@unique([configId, version])`.

Seed migrations:
- `prisma/migrations/20261020072259_ai_initial_prompts/migration.sql` (96 lines): `INSERT INTO "ai_prompts" (operation, instructions, examples,
  revision, updated_by)` :3 and `INSERT INTO "ai_prompt_revisions" (…, saved_by)` :50 for `generate_cloze`, `lookup_word`, `translate_sentence`;
  each row `replace($p$…$p$, E'\r', ''), '<examples JSON>'::jsonb, 1, '00000000-0000-4000-8000-000000000060'`.
- `prisma/migrations/20261022091000_buoc7_ai_operations/migration.sql` (184 lines): inserts the three Bước 7 operations into
  `ai_operation_settings` (:8-11), `ai_prompts` (:13-74) and `ai_prompt_revisions` (:76-137), then revision 2 of `generate_cloze`, verbatim
  apart from the elided text:
  ```sql
  -- generate_cloze revision 2 (design §15, R13): only while the prompt is still the untouched revision 1 written by the system
  -- actor; an admin's own edit is never overwritten. Revision 2 is recorded only when the update changed a row.
  WITH updated AS (
    UPDATE "ai_prompts"
    SET "instructions" = replace($p$You write one English practice sentence … (no Markdown, no HTML).$p$, E'\r', ''),
        "examples" = '[{"input":{"word":"brush",…}},{"input":{"word":"attention",…}}]'::jsonb,
        "revision" = 2, "updated_by" = '00000000-0000-4000-8000-000000000060', "updated_at" = CURRENT_TIMESTAMP
    WHERE "operation" = 'generate_cloze' AND "revision" = 1 AND "updated_by" = '00000000-0000-4000-8000-000000000060'
    RETURNING "operation", "instructions", "examples", "revision", "updated_by"
  )
  INSERT INTO "ai_prompt_revisions" ("operation", "instructions", "examples", "revision", "saved_by")
  SELECT "operation", "instructions", "examples", "revision", "updated_by" FROM updated;

  -- One line for the admin when the edit above was skipped: the plan holds a newer text for generate_cloze.
  DO $notice$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM "ai_prompt_revisions" WHERE "operation" = 'generate_cloze' AND "revision" = 2 AND "saved_by" = '00000000-0000-4000-8000-000000000060'
    ) THEN
      RAISE NOTICE 'generate_cloze prompt was edited by an admin; not replaced. The Bước 7 text is in the plan, Appendix A.';
    END IF;
  END
  $notice$;
  ```
  (:139-184; instructions :143-166, examples :167.) Header :1-2: "the same text as src/ai/prompts/initial-prompts.ts. replace(…, E'\r', '')
  keeps the stored text the same on a CRLF checkout."

Nhóm B moved prompts into configs (both are data migrations, not schema):
- `20261030100100_nhom_b_m2_live_configs/migration.sql` (11 lines), verbatim:
  ```sql
  INSERT INTO ai_configs (operation, number, version, instructions, examples, model_ref, effort, thinking, max_output_tokens, status,
                          created_by, created_at, published_by, published_at)
  SELECT p.operation, p.revision, 0, p.instructions, p.examples, s.model_ref, s.effort, s.thinking, s.max_output_tokens, 'published',
         p.updated_by, p.updated_at, COALESCE(s.updated_by, p.updated_by), GREATEST(p.updated_at, s.updated_at)
  FROM ai_prompts p JOIN ai_operation_settings s ON s.operation = p.operation;

  INSERT INTO ai_live_configs (operation, config_id, previous_config_id, version, last_number)
  SELECT c.operation, c.id, NULL, 0, c.number FROM ai_configs c WHERE c.status = 'published';
  ```
  Comment :1-3: number = the prompt's current revision so `ai_calls.prompt_revision` and `meta.prompt_revision` keep their numbers;
  `ai_prompts`, `ai_prompt_revisions`, `ai_operation_settings` stay as history.
- `20261101010000_ai_workspace/migration.sql`: adds `ai_configs.deleted_at, fingerprint, name, updated_at` (:5-8), creates
  `ai_config_revisions` (:16-28), drops `ai_configs_one_draft_key` (:72), then
  `UPDATE ai_configs SET name = 'Cấu hình ' || number::text, updated_at = COALESCE(published_at, created_at);` (:73) and
  ```sql
  INSERT INTO ai_config_revisions (config_id,version,content,fingerprint,name,note,saved_by,saved_at)
  SELECT id,version,jsonb_build_object('instructions',instructions,'examples',examples,'model_ref',model_ref,
   'effort',effort,'thinking',thinking,'max_output_tokens',max_output_tokens),NULL,name,note,COALESCE(published_by,created_by),updated_at FROM ai_configs;
  ```
  (:75-77; comment :74 "NULL hash is canonicalized on read, never fabricated").
- `20261030100000_nhom_b_m2_configs` only creates tables and CHECKs (:90-101: operation in the six, status in draft|published|retired,
  thinking null|'off', max_output_tokens > 0, event kind publish|rollback).
- Newest migration folder today: `20261110100000_billing_orders` (a new folder must sort after it).

Who reads what now:
- Gateway: `LiveConfigReader.find/load` (`src/ai/configs/live-config.reader.ts:26-43`) reads `ai_live_configs` → `ai_configs` (+ model) only;
  `prompt.revision = config.number` (:33). `PromptsRepository.current` uses it too (`prompts.repository.ts:18-20`).
- `GET /v1/admin/ai/prompts/{op}`: `prompts.service.ts:69-80` returns the live config, `revision: config.number`, `updated_by =
  config.publishedBy ?? config.createdBy`.
- `GET /v1/admin/ai/prompts/{op}/revisions`: `prompts.service.ts:83-100` reads `ai_prompt_revisions`. Eval runs with an old `prompt_revision`
  selector read `ai_prompt_revisions` via `PromptsRepository.atRevision` (`prompts.repository.ts:22-25`, `eval/eval-job.ts:132`).
- Config history: `configs.service.ts:153-198` reads `ai_config_revisions` (fingerprint `?? configFingerprint(op, content)`).
- `fingerprint`: `src/ai/configs/config-snapshot.ts:19-21` `sha256(JSON.stringify(canonical({ operation, ...content })))`, content =
  `{ instructions, examples, model_ref, effort, thinking, max_output_tokens }` (`configContentSchema` :6-10, `contentOfConfig` :22-24); a NULL
  column is computed on read (`configs.service.ts:166, 193, 370`).

What a publish writes today (`src/ai/configs/publish.service.ts:125-180`, in one transaction :149-178): `ai_live_configs` updateMany where
`version = pointer.version` → `configId: draft.id, previousConfigId: pointer.configId, version +1` (:163-167); the draft → `status
'published', publishedBy, publishedAt` (:168-171); the old live → `status 'retired'` (:172); one `ai_config_events` row `kind 'publish'`,
`fromConfigId`, run ids, `warnings`, `actorId`, `at` (:173-176). A draft is created by `createDraft` (`configs.service.ts:201-229`):
`last_number + 1` on the pointer (:207), copies `contentOfConfig(source)` (:218), `createdBy: actorId`, `createdFrom: source.id`, plus an
`ai_config_revisions` row version 0 (:225). Rollback (`publish.service.ts:182-…`): pointer → previous, `previousConfigId: null`, version +1,
statuses swapped, event `kind 'rollback'`.

State of `generate_cloze` on a fresh database (derived from the migrations above, not run): `ai_prompts` revision 2, `updated_by` = system
actor; `ai_prompt_revisions` rows 1 and 2, `saved_by` = system actor; `ai_operation_settings` `model_ref NULL`, `max_output_tokens 1200`,
`updated_by NULL` (`20261020071131_ai/migration.sql:235-236`); one `ai_configs` row `number 2, version 0, status 'published', model_ref NULL,
max_output_tokens 1200, created_by = published_by = system actor, name 'Cấu hình 2', fingerprint NULL`; one `ai_config_revisions` row
version 0, `saved_by` = system actor; `ai_live_configs` `version 0, previous_config_id NULL, last_number 2`; no `ai_config_events` row.

On a database where an admin has published (any model choice, nhóm B flow), the live `generate_cloze` config is another row (number ≥ 3)
whose `created_by`/`published_by` is the admin and whose `instructions`/`examples` are copied from the config it was made from, so they may
still equal seed revision 2. A pre-nhóm-B model choice set `ai_operation_settings.updated_by`, which became `published_by` of config 2 in the
switch-over. Not verified: the state of the owner's own database.

`AI_SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000060'` (`src/ai/ai.constants.ts:48`); shown as the system by `userRef(…, SYSTEM_IDS)`
(e.g. `configs.service.ts:81`, `publish.service.ts:64`).

Smoke checks that pin the fresh-database state (a seed revision 3 meets them):
- `scripts/smoke-nhom-b.mjs:595-612` (M2.1): for every operation `live.number === ai_prompts.revision` (psql), `live.status === 'published'`,
  `live.model === null`, `previous === null`, `draft === null`, `live_version === 0`; and `count(*) FROM ai_config_events === 0`. Later steps
  check `live_version` 1 (:637, :791) and 2 (:818) relative to that. M1.12 (:567-573) checks `live_version === 0` for `generate_cloze`.
- `scripts/smoke-buoc-7.mjs:405-406`: `GET /v1/admin/ai/prompts/generate_cloze` → `check(cloze.revision === 2, …)`; message at :412.
- `scripts/smoke-buoc-6.mjs:258-271`: reads the seeded revision instead of assuming one; `:280` `published.number === clozeRevision + 1`;
  `:399` reads `/prompts/generate_cloze/revisions` (`ai_prompt_revisions`).

## 6. Initial prompts and prompt rules

`src/ai/prompts/initial-prompts.ts` (194 lines): `export const INITIAL_PROMPTS: Record<AiOperation, { instructions: string; examples:
PromptExample[] }>` (:7). Comment :4-6: generate_cloze is revision 2 (Bước 7 plan Appendix A); "The seed migrations ai_initial_prompts and
buoc7_ai_operations hold the same text; initial-prompts.spec.ts checks it." Entries: `generate_cloze` :8-43 (instructions :9-32, rules 1–9;
rules 2–4 and 7 at :25-27, :30; examples :33-42: `brush` verb A1 and `attention` noun A2, each `context_label: null`, outputs with
`accepted_answers: ['brush']` / `['attention']`), `lookup_word` :44, `translate_sentence` :72, `generate_meaning_question` :93,
`generate_sentence_mcq` :128, `check_private_word` :164. Consumers: `initial-prompts.spec.ts`, `prompts.service.spec.ts:11,44`,
`scripts/ai-config-publish.mjs:20-24` and `apps/admin/e2e-real/support/ai-config.ts:59-63` (both import `dist/ai/prompts/initial-prompts.js` to
seed eval examples from `examples[].input`).

`src/ai/prompts/initial-prompts.spec.ts` (47 lines). `folders` = migration folders ending `_ai_initial_prompts` or `_buoc7_ai_operations` (:11);
SQL read with `\r\n` → `\n` (:13). Tests:
1. `:16` "every initial prompt passes promptViolations": for each of `AI_OPERATIONS`, non-empty instructions and examples, `promptViolations`
   `[]` (so seed examples must pass the operation's input check and output `checkOutput`).
2. `:24` "some seed migration contains each instructions text and each JSON.stringify(examples) verbatim": `expect(folders).toHaveLength(2)`;
   joined SQL with `''` → `'` contains `` `$p$${instructions}$p$` `` and `` `'${JSON.stringify(examples)}'::jsonb` `` for every operation.
3. `:33` "each seeded row has one $p$ pair: two markers per examples literal": per folder, count of `$p$` = 2 × count of `'::jsonb`.
4. `:40` "generate_cloze revision 2 replaces only the untouched revision 1 of the system actor (design §15, R13)": the buoc7 SQL contains
   `WHERE "operation" = 'generate_cloze' AND "revision" = 1 AND "updated_by" = '${AI_SYSTEM_ACTOR_ID}'` and
   `SELECT "operation", "instructions", "examples", "revision", "updated_by" FROM updated;`.

`src/ai/prompts/prompt-rules.ts` (53 lines):
- `:6` `export type PromptExample = { input: Record<string, unknown>; output: Record<string, unknown> };`
- `:9` `PROMPT_GUARD`.
- `:18-37` `export function promptViolations(op: GatewayOperation, body: { instructions: string; examples: unknown[] }): string[]`: blank
  instructions; > `PROMPT_INSTRUCTIONS_MAX` (8 000, `ai.constants.ts:32`) code points; > `PROMPT_EXAMPLES_MAX` (10, :33) examples; each example
  must have exactly keys `input` and `output` (`examples[i]: Expected an object with exactly input and output`); input violations as
  `examples[i].input.<violation>`; output `checkOutput` failure as `examples[i].output: <problem>` (a missing `also_accepted` would be
  `examples[i].output: shape`).
- `:40-53` `assembleInstructions(instructions, examples)`: instructions, `<examples>` block with `JSON.stringify(input/output)`, then the guard.

## 7. Few-shot checks on draft save and test (`src/ai/configs/configs.service.ts`)

- `prepare(op, value)` `:232-248`, the one path for saving drafts and running temporary snapshots, in order: `parse(configContentSchema)` →
  400 `validation-failed` `{ violations }`; `promptViolations(op, content)` (:234-235) → 400 `validation-failed` `{ violations }` (shape errors
  of examples land here, before the rule check); model checks (:237-245); `await this.checkFewShot(op, content.examples)` (:246).
- Callers: `saveDraft` `:250-276` (:255), `testDraft` `:290-324` (:293), and `eval-runs.service.ts:136` (temporary target).
- `checkFewShot` `:353-361` verbatim:
  ```ts
  private async checkFewShot(op: AiOperation, examples: PromptExample[]): Promise<void> {
    const rules = this.rules.get();
    const failing: Array<{ index: number; problems: string[] }> = [];
    for (const [index, example] of examples.entries()) {
      const result = await ruleResultFor(rules, op, example.input, example.output);
      if (result.status === 'fail') failing.push({ index, problems: result.problems });
    }
    if (failing.length > 0) throw problem(422, 'few-shot-invalid', 'A few-shot example breaks the rules', { examples: failing });
  }
  ```
  Body: Problem Details `status 422, type 'few-shot-invalid', title 'A few-shot example breaks the rules'`, extension `examples: [{ index,
  problems }]` (0-based index). Only `status === 'fail'` refuses; a `pass` with problems is not refused. Admin shows it per example
  (`apps/admin/src/features/ai/configs/DraftEditor.tsx:173`).

## 8. Eval rules

Types:
- `src/ai/eval/eval.types.ts:9-15`:
  ```ts
  export type RuleStatus = 'pass' | 'fail' | 'skipped' | 'not_applicable';
  export type RuleResult = {
    status: RuleStatus;
    problems: string[];
    reason: 'not-in-catalog' | 'no-rules' | null;
  };
  ```
- `src/ai/eval/eval-rules.port.ts:10-15`:
  ```ts
  export type EvalRules = {
    check(op: AiOperation, input: Record<string, unknown>, output: Record<string, unknown>): Promise<RuleResult>;
    /** Every catalog form of the word with this part of speech (`unspecified` = any), or `null` when the catalog has none. */
    formsOf(word: string, partOfSpeech: string): Promise<string[] | null>;
    matchesExpected(op: 'generate_cloze' | 'generate_meaning_question', output: Record<string, unknown>, expected: ExpectedForms): boolean;
  };
  ```
  `RULE_OPERATIONS` :18; `EvalRulesRegistry` :22-32; `ruleResultFor(rules, op, input, output)` :36-45 (`not_applicable` for other ops,
  `skipped/no-rules` when nothing registered, else `rules.check`).
- `src/ai/eval/expected.ts:7` `export type ExpectedForms = { forms: string[] };` (also `ExpectedLookup` :8, `ExpectedVerdict` :9;
  `EXPECTED_OPERATIONS` :12 includes `generate_cloze`; `EXPECTED_FORMS_MAX = 50` :13; `expectedViolations` :54-62; `normalizeExpected` :65-71).
  There is no expected field for `also_accepted`.
- How a rule result counts: `src/ai/eval/run-stats.ts:37-39` `itemPasses` = succeeded and `rule?.status !== 'fail'` and expected not
  `fail`; `:56-57` `rule_pass` / `rule_fail` counted by status only; `:81` failure reason `rule` when status `fail`. The run item keeps the
  whole `{ status, problems, reason }` in `ai_eval_run_items.rule` (`ai.prisma:286-317`). Admin `EvalRunPanel.tsx:278-286` shows only the
  word "pass" for `status: 'pass'` (problems are shown only for `fail`).

`src/practice/eval-rules/practice-eval-rules.ts` (86 lines), `PracticeEvalRules implements EvalRules, OnModuleInit`:
- Constants :7-11: `NATIVE_LANGUAGE = 'vi'`, `PASS = { status: 'pass', problems: [], reason: null }`, `NOT_APPLICABLE`, `fail(problems)`,
  `asStrings(value)` (array → its string items, else `[]`).
- `mergeSenses(senses)` :21-30 (first sense, union of variants, accepted, inflections by form+kind, extra_forms).
- `check` :48-68; the cloze part verbatim:
  ```ts
  async check(op: AiOperation, input: Record<string, unknown>, output: Record<string, unknown>): Promise<RuleResult> {
    if (op !== 'generate_cloze' && op !== 'generate_meaning_question' && op !== 'generate_sentence_mcq') return { ...NOT_APPLICABLE };
    const senses = await this.senses(String(input.word ?? ''), String(input.part_of_speech ?? ''));
    if (senses.length === 0) return { status: 'skipped', problems: [], reason: 'not-in-catalog' };
    const sense = mergeSenses(senses);
    if (op === 'generate_cloze') {
      const result = checkCloze({ sentence: String(output.sentence ?? ''), accepted_answers: asStrings(output.accepted_answers) }, sense);
      if (result.ok) return { ...PASS };
      return fail([...result.unknownForms.map((form) => `unknown-form:${form}`), ...(result.reveals ? ['reveals-word'] : [])]);
    }
    …
  ```
  The form in `unknown-form:<form>` is the answer as sent (not normalized).
- `formsOf(word, pos)` :70-73 → `[...validForms(mergeSenses(senses))]` or `null`.
- `matchesExpected` :75-80 (cloze: every accepted answer, normalized, in the expected forms).
- `senses(word, pos)` :83-85 → `this.content.catalogPracticeSensesByLemma(word, pos === 'unspecified' ? null : pos, 'vi')`;
  `ContentService.catalogPracticeSensesByLemma(lemma: string, pos: string | null, nativeLanguage: 'vi' | 'en'): Promise<PracticeSense[]>`
  (`src/content/content.service.ts:226-228` → `src/content/practice/practice-senses.ts:106-115`: catalog scope only, `lower(e.lemma) =
  lower(trim(lemma))`, optional `e.pos = pos`, open senses with a live revision; `''` → `[]`).
- `src/practice/ai/ai-checks.ts`: `validForms(s): Set<string>` :11-14 (lemma, variants, accepted, inflection forms, extra_forms, each
  `normalizeAnswer`); `checkCloze(r, s): ClozeCheck` :29-35 (`ClozeCheck` :26 = `{ ok: true; accepted } | { ok: false; unknownForms; reveals }`).
- No rule reads `input.session_words` or `output.also_accepted` today.

Spec `src/practice/eval-rules/practice-eval-rules.spec.ts`: fixtures `sense(over)` :5-15 (lemma `deploy`, inflections deployed/deploying/
deploys), `setup(senses)` :17-22 (mocks `catalogPracticeSensesByLemma`), `CLOZE_IN = { word: 'deploy', part_of_speech: 'verb' }` :24. Tests:
`:27` "E2: registers itself once with the AI gateway"; `:35` "B8: a cloze whose answers are valid forms and whose sentence hides the word
passes" (expects `{ status: 'pass', problems: [], reason: null }` and the call `('deploy', 'verb', 'vi')`); `:42` "an answer that is not a form of
the word → unknown-form:<answer as sent>"; `:48` "a sentence that shows the word outside the blank → reveals-word, after any unknown-form";
`:56` meaning word-not-once / unknown-form; `:66` MCQ mcq-check; `:75` "B8: a word the catalog does not have → skipped, not-in-catalog";
`:81` "design §5.2: part_of_speech "unspecified" looks at every part of speech"; `:87` other operations not applicable; `formsOf` :97, :103,
:111; `matchesExpected` :119, :125, :130; `mergeSenses` :137. The mock returns the same senses for every lemma (`vi.fn(async () => senses)`).

Eval example validation (`src/ai/eval/eval-examples.service.ts`, 313 lines):
- `checkInput(op, input)` :102-105 → 400 `validation-failed` with `input.<violation>`; `checkExpected` :108-112 → 422 `expected-invalid`.
- `create` :137-153 (input stored raw :147; 1001st refused :142-143); `createFromSource` :156-169 (report / real judge, always dev);
  `createMany` :171-223 (per-row checks :174-187, invalid rows returned by 1-based row; room check :198-202; rows stored with `source:
  'import'`, timestamps 1 ms apart :214-220); `update` :225-… (patch re-checks input :232).
- Limit: `EVAL_EXAMPLES_PER_OPERATION_MAX = 1000` (`ai.constants.ts:37`), also the max rows of one bulk request (`bulkExamplesSchema` :31-36).
- Endpoint: `POST /v1/admin/ai/eval/examples/bulk` (`src/ai/api/admin-ai-eval.controller.ts:63-68`, 200, `settings.manage`), body
  `{ operation, rows: [{ input, note?, expected?, split? }] }` (1–1000 rows). Single: `POST /v1/admin/ai/eval/examples` (:55-60).
- The API takes JSON; JSONL/CSV/TSV are parsed in the admin (`apps/admin/src/features/ai/bulk-examples.ts:74-130`): text starting `{` = JSON
  Lines, one object per line, either `{"input": {...}, "note", "expected", "split"}` or the input fields flat with `expected`/`split`/`note` keys
  beside them (:79-100); else CSV/TSV with a header of input fields plus `note`, `expected`, `split` (:101-125). `BULK_MAX = 1000` (:4).

## 9. Judges

- Saving a judge revision: `src/ai/judge/judges.service.ts` `judgeBodySchema` :22-35: `criteria: z.array(z.strictObject({ code:
  z.string().regex(JUDGE_CODE_PATTERN), question: trimmed(JUDGE_QUESTION_MAX) })).min(1).max(JUDGE_CRITERIA_MAX)` with unique codes;
  `operations` non-empty unique subset of the six; `instructions: z.string()`; `examples: z.array(z.unknown())`; `saveJudgeSchema` adds
  `expected_revision` :37. `checkRevision` :222-235: `promptViolations('judge', { instructions, examples })` (instructions non-blank and
  ≤ 8 000 code points, ≤ 10 examples, each checked against the judge operation), then the model must be Anthropic, or fake while the fake
  provider is on (422 `judge-provider`).
- Limits (`ai.constants.ts:63-68`): `JUDGE_NAME_MAX = 100`, `JUDGE_CRITERIA_MAX = 10`, `JUDGE_CODE_PATTERN = /^[a-z][a-z0-9_]{0,39}$/`,
  `JUDGE_QUESTION_MAX = 500`, `JUDGE_REASON_MAX = 1000`, `JUDGE_SESSION_WORDS_MAX = 50` (max of `context.session_words` in the judge input,
  `judge.ts:26-28`; the judge's `input` field is `z.record(z.string(), z.unknown())` :20, so `input.session_words` of objects has no limit there).
- Judge call data (`src/ai/judge/judge-job.ts:91-99`): `{ target_operation, input: item.input, output: item.output, criteria:
  revision.criteria, context: item.context }`: every criterion of the revision for every item. Eval-run items get `context: null`
  (`judge-passes.service.ts:101`); real questions get `subject.context` (:119), `{ session_words: string[] } | null`
  (`judge-passes.repository.ts:31, 52`).
- Seeded judge `src/ai/judge/initial-judges.ts:6-38`: name `Chỉ một đáp án`, `operations: ['generate_cloze']`, one criterion `single_answer`
  (question :12), instructions :14-36 (the input listed at :18, output at :19, `context` at :21, the `fail_major … when a word in
  context.session_words fits the blank` rule at :29), `examples: []`. Migration `20261030110000_nhom_b_m3_judge` inserts it (:170, :174).
- Fake judge (`fake.adapter.ts`): `judgeCodes(data)` :14-15 maps every `data.criteria[].code` (any code is handled). `fake:ok` `judge_v1`
  :41-47: every verdict `fail_major` when some `output.accepted_answers` entry ends in `ment`, else every verdict `pass`; reasons `'fake judge'`.
  `fake:bad-form` `judge_v1` :66-70: every verdict `fail_major`, reason `'fake: another word fits'`. It does not read `session_words` or
  `also_accepted`.
- Real-question pass filter: `src/practice/quality/real-judge.types.ts:8` `ConfigPair = { number: number; model: string }` ("the number is
  `ai_meta.prompt_revision`, the config number since M2"); body `config: { number, model } | null` (:19-29); query `config_number` and `model`
  go together (:32-46). Applied in `src/practice/quality/real-questions.repository.ts:53-55`:
  `(q.ai_meta->>'prompt_revision')::int = ${number}` AND `q.ai_meta->>'model' = ${model}`; `pairs()` :105-112 lists the (config number,
  model) pairs seen. `real-judge.service.ts:81-82`, `:141` pass the filter through.
- `touchesPrivateWord` (`src/practice/quality/real-questions.ts:27-38`) reads `answerKey.asked_private`, MCQ `option_private`,
  `aiInput.contentKey`, MCQ `form.senses[].scope`, meaning `wrong[].scope`; nothing for cloze beyond `asked_private` and `contentKey`.

## 10. Smokes

`scripts/smoke-nhom-b.mjs` (2 774 lines):
- `clozeData = (word) => ({ word, part_of_speech: 'verb', level: 'A2', meaning_vi: 'hoàn thành', context_label: null })` :215; words W1–W4
  `zq<6 letters>` (catalog verbs with `<w>ed`, `<w>s`) and N (not in the catalog) :210-216.
- `shot()` :663-664 (inside M2.3, draft `first` copied from live):
  ```js
  const shot = (answers) => ({
    input: clozeData(W1), output: { sentence: 'Lan will ___ it tomorrow.', accepted_answers: answers, translation_vi: 'Lan sẽ làm việc đó vào ngày mai.' } });
  ```
  used at :665-667 (saving `[...first.examples, shot([`${W1}ment`])]` expects 422 `few-shot-invalid` with
  `examples === [{ index: first.examples.length, problems: [`unknown-form:${W1}ment`] }]`) and :670 (saving `shot([W1])` succeeds). With a
  required output key the shot without it is refused earlier as 400 `validation-failed` (`examples[i].output: shape`), item 6/7.
- Other cloze-output readers: :1657 (`item.output.sentence === 'Lan will ___ it tomorrow.'` and `accepted_answers === [lemma]`). Eval rule
  checks by status only (:426, :428, :447 `problems.includes('unknown-form:<w>ment')`, :545).
- Fresh-state checks: item 5 (M2.1 :595-612, M1.12 :567-573).

`scripts/smoke-buoc-7.mjs` (1 245 lines):
- Constants :23-35: `QUEUE_PREFIX = 'wordmet-b7-smoke'`; `FAKE = { clozeSentence: 'Lan will ___ it tomorrow.', clozeVi: 'Lan sẽ làm việc đó
  vào ngày mai.', mcqSentence: 'Lan ___ it today.', dayVi: 'Hôm nay Lan làm việc đó.', lookupMeaning: 'nghĩa giả' }` :31-34; `AI_UNITS = 87` :35.
- Learners: `registerVerified(email)` :202-213, `registerLearner(email)` :215-220 (register, verify by OTP from Mailpit, `native_language: 'vi'`,
  reads `id`). L1, L2, L3 made at :390-392 (accounts step :376-394).
- Words: every word is a catalog **verb** (CSV `pos` column `verb`, :418-420), `lemma('zq')`, past `<w>ed`, third `<w>s`, meaning
  `nghĩa thử <n>` :226-249. `BUCKETS` :234-238: group key → `[topic, level, size]`; `G7: ['marketing', 'A1', 4]`. Groups step :464-481
  (`make(as, key, bucket)` :465-472 bulk-adds by topic and level); L1 gets G1, G4, G5, G6, G7, GR1, GR2, GR3, GR5, G57, G117, G9.
- AI cloze session: `start(L1, { source: 'group', group_id: groups.G7, types: ['cloze'], count: 1 })` (AC7 :744); helpers `start` :323-324,
  `next` :325-326, `prepare` :327, `answer` :328-329, `hint` :330, `finish` :331, `itemInfo(itemId)` :284-291, `sessionRow` :292-298,
  `requestsOf(sessionId)` :299-303 (psql). A session keeps at most `count` words (`src/practice/sessions/sessions.service.ts:94`, `:124-131`,
  `senseIds: kept` :153), so `count: 1` gives a one-word session.
- Model choice: item 4. Fresh-DB prompt check `cloze.revision === 2` :405-406.
- L1 unit checks are relative to `before` except AC1 (`=== AI_UNITS` :484, `AI_UNITS - 5` :515).

`package.json` scripts (`apps/api/package.json:30-44`): `smoke:buoc-2`, `smoke:buoc-4`, `smoke:buoc-5`, `smoke:buoc-6`,
`smoke:buoc-0-3-fixes`, `smoke:buoc-7`, `smoke:buoc-8`, `smoke:nhom-b`, `smoke:buoc-b-payments`; helpers `learner:setup`,
`ai:fake-call` (`node dist/cli/ai-fake-call.js`), `maintenance:run`.

## 11. Test-set files and the import screen

- In this repo: `docs/preparation/b1-eval/generate_cloze.jsonl` (15 lines, committed in `d148f9e1`): `{"input":{word, part_of_speech, level,
  meaning_vi, context_label},"note":"…"}` per line, no `expected` on any line; companion `generate_cloze-2026-10-29-error-analysis.md`. No other
  `golden-set*` or eval-example JSONL is tracked (`git ls-files`: only this one plus unrelated `docs/audit/…/metrics.jsonl` and
  `docs/tasks/…/api-log-refresh-events.jsonl`). No file with `session_words` exists.
- Outside this worktree (read only to report its format): `E:\Working\Working project\english-learning-ai-guide\docs\guides\2026-10-31-van-hanh-ai-eval\golden-set-generate_cloze-100.jsonl`,
  **untracked** (`??`) on branch `docs/ai-eval-guide`; 100 lines in the flat form, e.g.
  `{"word": "scenic", "part_of_speech": "adjective", "level": "B1", "meaning_vi": "có phong cảnh đẹp", "context_label": null, "expected": {"forms": ["scenic"]}, "split": "dev"}`;
  30 lines `"split": "held_out"`, 23 lines `"level": "B2"`, no `note`.
- Admin import: `apps/admin/src/features/ai/BulkExamplesDialog.tsx` (opened from `AiEvalPage.tsx`; file types `.csv .tsv .txt .jsonl`
  :18, 2 MB :17), parser `apps/admin/src/features/ai/bulk-examples.ts`, call `createExamples` (`apps/admin/src/features/ai/ai-api.ts:635`)
  → `POST /v1/admin/ai/eval/examples/bulk` (item 8). A flat JSONL line's input = every key except `note`, `expected`, `split`
  (`bulk-examples.ts:96`), so a `session_words` key on a flat line goes into the input as is.
