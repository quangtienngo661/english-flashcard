# Bước 7 — Practice AI + Content AI Implementation Plan (API only)

> **Status 21/10/2026:** written after the owner approved the design ("ok viết plan luôn đi bạn", D1–D34; design review R1–R23 applied). Waiting
> for the owner to approve this plan and Appendix A (prompts). **API only** (D2). No real provider call in "Xong khi" (D3).
> **Execution (D4):** parallel sessions, every task implemented by Claude, one coordinator session — as Bước 4–6. Three implementing sessions
> plus the coordinator (the owner's cap of Bước 5: "4–5 sessions at most").

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trial and Pro learners get three AI question types and a cloze from their own saved sentences inside the normal practice session,
with units checked when a session opens, K questions generated ahead, safe fallback when AI fails, an AI word lookup on a button, and
admin-managed report reasons with refunds of confirmed AI errors.

**Architecture:** Practice gains a small `src/practice/ai/` area: pure rule files (plan of AI slots, AI inputs, checks of AI output,
assembly of a question) unit-tested by table, a repository for `practice_ai_requests`, and one generator service that runs design §6.5 steps
B–H between short transactions. `SessionsService` keeps its Bước 4 shape but its `next`/`current` gain the "pending slot" of design §6.5 A/G.
Content adds reads for Practice, a word-forms table and the AI lookup controller. The AI gateway gets three operations (design §15); Bước 5
is used through its exported service only.

**Tech Stack:** as Bước 6 — NestJS 12, Prisma 7.10 (TypedSQL), Postgres 17, Vitest 4, zod 4. No new dependency. No backend e2e (Bước 4 D38).

**Spec:** [`docs/superpowers/specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md`](../specs/2026-10-21-buoc-7-practice-ai-content-ai-design.md) — read the
section named in each task. Decisions: [`../decisions/2026-10-21-buoc-7-practice-ai-content-ai-decisions.md`](../decisions/2026-10-21-buoc-7-practice-ai-content-ai-decisions.md).
Code facts for this plan: [`../../preparation/BUOC_7_PLAN_CODE_FACTS_2026-10-21.md`](../../preparation/BUOC_7_PLAN_CODE_FACTS_2026-10-21.md) (`dev` @
`985531b`; "facts §N" below). A test that proves a design case starts with its `B7E#` and asserts every clause of its Then.

**Branches:** this plan lives on `docs/buoc-7-plan` (cut from `docs/buoc-7-design`, PR #103), merged into `dev` once the owner approves it.
Implementation: four sessions (coordinator + step-7-A, step-7-B, step-7-C), each in its own worktree, one branch per PR
(`feat/buoc-7-<pr>`), each PR merged into `dev` once CI is green.

## Sessions and tracks

| Session | Runs, in order | Starts | Waits for |
|---|---|---|---|
| step-7-A — data, then question generation, then sessions | 1 → 2 → 3, **PR A1**; 11 → 12, **PR D1**; 13 → 14, **PR D2**; 15 → 16, **PR E1**; 17 → 18, **PR E2** | day one | 12: PR C1; 13: PR B1 |
| step-7-B — AI gateway, then Content | 5 → 6, **PR B1**; 7 → 8, **PR C1**; 9 → 10, **PR C2** | day one | 7: PR A1 |
| step-7-C — reports, then cleanup | 19 → 20 → 21 → 22, **PR F1**; 23, **PR G1** | after PR A1 | 23: PR D2 |
| coordinator | merges every PR; then 24, **PR Z1** | day one | 24: every PR merged |

Task 4 is folded into Task 2 (one migration for Practice and Content; summary line 4 kept for reading). Why the order (from the Interfaces
blocks): A1 adds the settings key, both schemas and the Practice types every other Practice/Content task compiles against. B1 touches only
`src/ai/**` and one migration. C1 adds the Content reads that D1's checks and inputs need. D2's generator needs B1 (operations) and C1.
E needs D2. F needs only A1's schema and types. G needs D2 (the request repository).

Files edited by more than one track (one-line conflicts, resolved when merging): `src/practice/practice.module.ts` (D, E, F),
`src/content/content.module.ts` (C), `src/content/index.ts` (C), `package.json` (Z; open PR #102 also edits the scripts block, facts P15).
**Migrations:** Task 2 (track A) and Task 6 (track B) only; before a track's PR merges, rename its migration folder to a timestamp later
than the newest on `dev`, then drop and recreate the track's database before `pnpm db:setup`.

Critical path: A1 → C1 → D1 → D2 → E1 → E2 → Z1.

## Brief for the coordinator session (D4)

As Bước 6's brief (plan `2026-10-20-buoc-6-ai-integration.md` "Brief for the coordinator session"), with these values:
1. After the owner approves: commit what the approval asked for on `docs/buoc-7-plan`, open/merge its PR into `dev`, then send each session
   its brief (`ListAgents`, `SendMessage`); each session runs `git fetch origin` and cuts every PR branch from `origin/dev`.
2. Each session's own database `english_learning_b7_<a|b|c>` (`docker compose -p english-learning exec postgres createdb -U dev …`),
   `JOB_QUEUE_PREFIX=wordmet-b7-<a|b|c>`, `AI_FAKE_ENABLED=true`, **no provider key**, `pnpm db:setup`. No `psql` on the machine: SQL via
   `docker compose -p english-learning exec -T postgres psql -U dev -d <db> -tA -c "…"`.
3. Merge order: A1, B1 (any time); C1; D1; D2; C2, F1 (any time after their waits); E1; E2; G1; Z1. Resolve the module/index conflicts and
   re-run `pnpm build; pnpm test` on the merged result.
4. A question that changes behaviour goes to the owner (owner answers first — D1; questions as a list in chat text); write the answer into
   the design and decision record before the track goes on.
5. Run Task 24, then report: PRs, unit test count, smoke output, open risks (design §20).

## Verified on 21/10/2026 (`origin/dev` @ `985531b`)

Everything below is in the code facts file (facts §0–§10). The points that shape tasks:

| Check | Result |
|---|---|
| Hint shape (P2) | `Hints.level2 = { first_letter, length }`; readers know two levels (`itemView`, `AnswersService.hint`, `hintBody`, `buildSnapshot`); `smoke:buoc-4` asserts it. New shape applies to the new types only. |
| Skip (P3) | `answers.service.ts:92` allows skip only for `type_word`. |
| Prompt revision (P1, P11) | `smoke:buoc-6` assumes `generate_cloze` at revision 1 on a fresh DB; `initial-prompts.spec.ts` reads one migration and counts 12 `$p$`. |
| Fake provider (P10) | Scenario chosen by **model id**; unknown schema → `{}`; `describeModel` refuses ids outside `FAKE_MODELS`. |
| Content reads (P6, P14) | `listSentences`, `visibleSenseIds` take no `db`; no read returns `pos`, CEFR level or live revision id; no "other senses of the entry" or random catalog sample. |
| Modules (P7, P8) | `PracticeModule` lacks `AiModule`; `ContentModule` lacks `AiModule`, `EntitlementsModule`; no cycle. Lookup is `WordsService.lookup` inside Content. |
| Private words (P4, P5) | lemma/pos/level edits publish no revision; `publishRevision` hard-codes `draftSource: 'user'`; `PATCH /my-words/:id` is per entry with `senses[]`. |
| Reports (P12) | learner report route has no rate limit/idempotency (kept); resolve gets only `actor.userId` — role via `IdentityService.getProfile(actorId).staff_role` (Bước 5 `GrantsService.roleOf` pattern). |
| Cleanup (P13) | `practice-cleanup.service.ts:36` deletes every question with no items. |
| **Not verified** | Provider behaviour of the new prompts (D3: no real call); race outcomes are proven only by the smoke. |

## Global Constraints

- Paths under `apps/api/` unless they start with `docs/`. Commands from `apps/api/` in **PowerShell**; Docker Desktop running.
- API conventions as Bước 4–6: ESM imports end in `.js`; JSON `snake_case`; `/v1`; `z.strictObject` with `@Body({ schema })` etc.; bad input
  400 `validation-failed` with `extensions.violations`; only **additive** changes to existing responses (SR7).
- **Module boundaries:** Practice reads Content only through `ContentService`, Entitlements only through `src/entitlements/index.ts`, AI only
  through `src/ai/index.ts`; Content may import `AiModule` and `EntitlementsModule` (facts P7). No Prisma `@relation` across modules; new
  cross-table ids are plain UUID columns (design §12.1).
- **No database transaction is open while `ai.run` runs** (Bước 5 R6, Bước 6 §4.4): every AI call sits between two short transactions; at
  most one `reserve` per transaction; `reserve`/`confirm`/`release`/`refund` are never called inside a Practice transaction.
- **Sổ lượt:** the ledger operation id of an AI question is the request id (`mã gốc`); `#2` is used only for `ai.run`; `refund` only when
  `practice_questions.ai_charged = true` (design §7.7, §9.3).
- **Privacy (AR7, SR10):** data sent to AI = learning content only (design §7.1); logs carry ids, op, state and reason — never a sentence,
  answer, meaning of a private word, context sentence or typed text. Log field names must not match the logger's redaction pattern (Bước 6
  plan Global Constraints): use `ai_op`, `ai_request`, `ai_state`, `ai_reason`.
- **Fixed numbers** (design §14, `ASSUMPTION`) live in `src/practice/practice.constants.ts`: `PREPARING_RETRY_SECONDS = 2`,
  `MCQ_SENTENCE_CANDIDATES_MAX = 6`, `AI_REQUEST_STALE_MS = 120_000`, `AI_REQUEST_RETENTION_DAYS = 7`; Content: `PRIVATE_EXAMPLES_MAX = 2`
  in `content.constants.ts` (Bước 6's `LOOKUP_EXAMPLES_MAX` is not exported, facts P9). Tunable numbers from `SettingsService`.
- **Old questions stay readable:** stored Bước 4 `prompt`/`answer_key`/`hints` keep their shapes; every reader accepts both (P2).
- **Tests:** unit `*.spec.ts` next to the code; pure rule files tested by table (one `it` per row of the design table or B7E case); services
  that are mostly SQL get a thin spec on their decisions and are proven by the smoke.
- **Before a PR:** `pnpm lint; pnpm exec tsc --noEmit -p tsconfig.json; pnpm build; pnpm test`; with a migration also `pnpm db:setup` and
  `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script`.
- **Git:** commit after every task; Conventional Commits (`feat(practice): …`, `feat(content): …`, `feat(ai): …`) ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push and PR into `dev` without asking; merge once CI is green; never `main`.

**Plan choices** (not fixed by the design; recorded in the design as as-built notes by Task 24):
1. `generate_cloze` revision 2 is seeded by Task 6's migration with the "only if untouched" rule; `smoke:buoc-6` is changed to read the current
   revision instead of assuming 1 (facts P1).
2. New fake model ids (facts P10): `fake:bad-form` (cloze answer = `data.word + 'ment'`; MCQ distractor not in `candidates`; meaning
   `word_in_sentence` absent from the sentence), `fake:not-recognized` (`verdict: 'not_recognized'`). `fake:ok` returns a valid value for each
   new schema (design §15).
3. The "AI gợi ý" label lives on the revision: an edit that publishes a revision (meaning, topics, examples) removes it; a lemma/pos/level edit
   (no revision, facts P4) keeps it. Design §11.2 said "any edit"; noted as an as-built deviation.
4. Examples are edited per sense: `PATCH /v1/my-words/:id` `senses[]` items take `examples?: string[]` (facts P5).
5. `listSentences(userId, senseIds, db?)` and `visibleSenseIds(viewerId, senseIds, db?)` gain an optional `db` (facts P6).
6. `skip` allows `cloze` as well as `type_word` (facts P3).
7. The admin refunds list is a query over `practice_reports` (no new table); `self_resolved = resolved_by = user_id`.

## Review Focus

1. **The same slot twice at once** — double tap on Tiếp, two tabs, `prepare` racing `next` for the same word, a poll arriving while G runs —
   must give one item and one unit (B7E16, B7E111, B7E112). Task 16 pins the conditional G with an in-memory repository; Task 24 fires 5
   parallel `next` on one slot and reads `practice_session_items` and `usage_records` back.
2. **A crash in the middle of a generation** — process killed after `reserve`, after `ai.run`, after the question write — must recover with the
   same request id and stored `ai_input`, never stick in `generating`, never charge twice (B7E32, B7E33, B7E40, B7E114, B7E116). Task 13 tables
   each stop point with a stub `AiService` and ledger; Task 24 back-dates `updated_at` and re-runs.
3. **Deleting a private word while its question is generating** — no question with that word may survive (B7E115, CR23). Task 23 pins the
   lock order; Task 24 deletes the word between `prepare` and `next`.
4. **Refunds that must not happen** — a free question (`ai_charged = false`), a non-refundable reason, a second resolve, a refund that fails
   after the status write (B7E75, B7E76, B7E77, B7E118). Task 21 tables them with a stub ledger.
5. **Private words reaching staff** — the new `meaning_in_sentence`/`mcq_sentence` options, a private wrong meaning, the asked private word
   without consent (B7E79–B7E81, design §7.8). Task 20 adds one snapshot row per option kind with a private option.

---

# Milestone M1 — Foundations (track A)

### Task 1: Settings — `practice.ai_prefetch_count` (track A)

Design §14, D8. **Files:** Modify `src/settings/settings.definitions.ts`, `src/settings/settings.definitions.spec.ts`.

**Interfaces:**
- Produces `AppSettings['practice'].aiPrefetchCount: number` (API `ai_prefetch_count`), default **2**, bounds **0–20** (facts §7: five places).

- [ ] **Step 1:** Add to the spec: full defaults include `aiPrefetchCount: 2`; edges `['ai_prefetch_count', 0, 20]` accepted, −1 and 21 refused;
  a stored practice object without the key reads 2 (`withDefaults`). Run `pnpm test src/settings` → FAIL.
- [ ] **Step 2:** Add the key in the five places of facts §7. Run → PASS.
- [ ] **Step 3: Commit** `feat(settings): add the number of ai questions made ahead`.

### Task 2: Schema and migration — Practice and Content (track A)

Design §12.1, §12.2, §9.1 (seed). **Files:** Modify `prisma/models/practice.prisma`, `prisma/models/content.prisma`; Create
`prisma/migrations/20261022090000_buoc7_practice_ai/migration.sql`.

**Interfaces (Produces, Prisma names → columns):**
- `PracticeSession`: `clozeSource String?`, `aiPlanned Int @default(0)`, `aiSenseIds String[] @default([]) @db.Uuid`,
  `pendingAiRequestId String? @db.Uuid`, `aiStopped String?`, `aiNoticeShown Boolean @default(false)`.
- `PracticeQuestion`: `source String @default("rule")`, `aiRequestId String?`, `aiMeta Json?`, `aiCharged Boolean @default(false)`,
  `senseRevisionId String? @db.Uuid`, `contentKey String?`; `@@index([userId, senseId])` (the partial `WHERE source = 'ai'` index in SQL).
- `PracticeAiRequest` → `practice_ai_requests`: `id` (uuid PK, default gen), `userId`, `sessionId String? @db.Uuid`, `senseId`, `type`, `round Int`,
  `state String`, `failure String?`, `aiInput Json?`, `questionId String? @db.Uuid`, `createdAt`, `updatedAt`; SQL: partial unique
  `practice_ai_requests_generating_key (user_id, sense_id) WHERE state = 'generating'`, index `(session_id, state)`, CHECK state ∈
  `generating, ready, failed`.
- `PracticeReportReason` → `practice_report_reasons`: `code String @id`, `labelVi`, `labelEn`, `detailHintVi String?`, `detailHintEn String?`,
  `appliesTo String`, `noteRequired Boolean`, `refundable Boolean`, `active Boolean @default(true)`, `position Int`, `createdAt`, `updatedAt`,
  `updatedBy String? @db.Uuid`; CHECK `applies_to IN ('ai','non_ai','all')`; **seed the 7 rows of design §9.1** (labels vi/en, hints null except
  `ai_more_than_one_answer` → "Từ nào khác cũng đúng?" / "Which other word also fits?").
- `PracticeReport`: add `reasonLabel String`, `questionSource String @default("rule")`, `aiOperationId String?`, `aiMeta Json?`,
  `aiCharged Boolean @default(false)`, `refunded Boolean?`, `resolvedByRole String?`; relation `reasonRef PracticeReportReason @relation(fields:
  [reason], references: [code], onDelete: Restrict)` (same module); SQL: drop `practice_reports_reason_check`; `practice_reports_status_check` ∈
  `open, no_error, fixed, confirmed`; backfill `reason_label` of existing rows from the seed labels.
- `PracticeUnknownForm` → `practice_unknown_forms`: `id`, `lemmaKey`, `formKey`, `form`, `rejectedCount Int @default(1)`, `firstSeenAt`,
  `lastSeenAt`; `@@unique([lemmaKey, formKey])`.
- `PracticeWordCheck` → `practice_word_checks`: `userId`, `senseId`, `contentKey`, `verdict`, `checkedAt`; `@@id([userId, senseId])`; CHECK verdict.
- CHECKs widened: `practice_sessions_types_check` and `practice_questions_type_check` add `cloze`, `meaning_in_sentence`, `mcq_sentence`;
  `practice_sessions` CHECK `cloze_source IN ('ai','own')`, `ai_stopped IN ('quota-exhausted','plan-required','ai-unavailable')`;
  `practice_questions` CHECK `source IN ('rule','ai','own_sentence')`.
- Content: `WordFormAddition` → `word_form_additions` (`id`, `lemmaKey`, `form`, `formKey`, `addedBy String @db.Uuid`, `createdAt`;
  `@@unique([lemmaKey, formKey])`); `sense_revisions_draft_source_check` → `('csv','ui','user','ai_suggestion')`.

- [ ] **Step 1:** Edit both `.prisma` files; write the migration (CHECKs and partial indexes in SQL, facts §2.2). `pnpm db:setup` on a fresh DB →
  success; drift check → no difference.
- [ ] **Step 2:** `psql`: the 7 reason rows exist with `refundable = true` only for the three `ai_*` codes; inserting a report with an unknown reason
  fails on the FK. `pnpm build; pnpm test` → PASS (no test change expected).
- [ ] **Step 3: Commit** `feat(practice): add the bước 7 tables and columns`.

### Task 3: Practice types and constants (track A)

Design §5, §7.8, §14. **Files:** Modify `src/practice/practice.types.ts`, `src/practice/practice.constants.ts`; Create
`src/practice/practice.types.spec.ts`.

**Interfaces (Produces):**
- `QuestionType` adds `'cloze' | 'meaning_in_sentence' | 'mcq_sentence'`; `AI_QUESTION_TYPES = ['meaning_in_sentence','mcq_sentence'] as const`
  plus `cloze` when the session's `clozeSource = 'ai'` → helper `isAiType(type, clozeSource: 'ai'|'own'|null): boolean`.
- `QuestionSource = 'rule' | 'ai' | 'own_sentence'`.
- `Prompt` adds `{kind:'cloze'; sentence}`, `{kind:'meaning_in_sentence'; sentence; highlight; options: string[]; meaning_language}`,
  `{kind:'mcq_sentence'; sentence; options: string[]}`.
- `AnswerKey` base adds optional `translation_vi?: string | null`.
- `Hints` becomes `{ level1: HintStep | null; level2: HintStep | LegacyLetterHint | null; level3?: HintStep | null }` with
  `HintStep = {kind: 'definition'|'example'|'meaning'|'first_letter'; text}` and `LegacyLetterHint = {first_letter; length}` (Bước 4 rows).
- `AiFailure = 'ai-unavailable' | 'quota-exhausted' | 'plan-required' | 'ai-failed' | 'rejected' | 'input-mismatch' | 'word-not-recognized'`.
- Constants of Global Constraints.

- [ ] **Step 1:** Spec: `isAiType('cloze','ai')` true, `('cloze','own')` false, `('mcq_sentence', null)` true, `('type_word','ai')` false. → FAIL.
- [ ] **Step 2:** Implement; `pnpm exec tsc --noEmit -p tsconfig.json` → the existing readers still compile (widened unions). → PASS.
- [ ] **Step 3: Commit** `feat(practice): add the types of the ai question kinds`. Open **PR A1** (Tasks 1–3).

# Milestone M2 — AI gateway (track B)

### Task 5: Three operations (track B)

Design §15. **Files:** Create `src/ai/operations/generate-meaning-question.ts`, `generate-sentence-mcq.ts`, `check-private-word.ts` (+ specs);
Modify `src/ai/ai.types.ts`, `src/ai/ai.constants.ts`, `src/ai/operations/define-operation.ts`, `src/ai/operations/operations.ts`,
`src/ai/operations/operations.spec.ts`, `src/ai/adapters/fake/fake.adapter.ts` (+ spec), `src/cli/ai-fake-call-args.ts`, every enum place of
facts §5.6 that has a literal list in a spec (`ai/reports/reports.service.spec.ts:59`, …).

**Interfaces:**
- `AI_OPERATIONS` adds `'generate_meaning_question','generate_sentence_mcq','check_private_word'`; `DEFAULT_MAX_OUTPUT_TOKENS` adds 1200, 1200, 300.
- `OutputProblem` adds `'distractors' | 'verdict' | 'word'`.
- Inputs/outputs/rules exactly as design §15 table: schema names `generate_meaning_question_v1`, `generate_sentence_mcq_v1`, `check_private_word_v1`
  (`verdict` as a JSON-schema enum, lower-cased before the check like `lookup_word`'s pos). `word_in_sentence` empty or containing `_` → `word`;
  `distractors` not exactly 3, duplicates (case-insensitive) or containing `_` → `distractors`; verdict outside the two values → `verdict`.
- Fake: `okValue` for the three schemas (`meaning`: `{sentence: 'Lan <word> it today.', word_in_sentence: data.word, translation_vi: '…'}`;
  `mcq`: `{sentence: 'Lan ___ it today.', distractors: data.candidates.slice(0, 3), translation_vi}`; `check`: `{verdict: 'ok'}`); new model ids
  `fake:bad-form`, `fake:not-recognized` (plan choice 2) in `FAKE_MODELS`.

- [ ] **Step 1:** `operations.spec.ts`: one row per rule of design §15 for each new op (valid input passes; each bound ±1; each `OutputProblem`). Fake
  spec: each new schema under `fake:ok` passes `parseOutput`; `fake:bad-form` and `fake:not-recognized` outputs as plan choice 2. → FAIL.
- [ ] **Step 2:** Implement with `define()`; register in `OPERATIONS`. → PASS (`tsc` catches every `Record<AiOperation,…>`).
- [ ] **Step 3: Commit** `feat(ai): add the three bước 7 operations`.

### Task 6: Prompts and seed (track B)

Design §15, Appendix A. **Files:** Modify `src/ai/prompts/initial-prompts.ts`, `src/ai/prompts/initial-prompts.spec.ts`,
`scripts/smoke-buoc-6.mjs`; Create `prisma/migrations/20261022091000_buoc7_ai_operations/migration.sql`.

**Interfaces:**
- `INITIAL_PROMPTS` gets the three new entries and `generate_cloze` becomes revision 2's text (Appendix A, verbatim).
- Migration: widen `ai_operation_settings_operation_check`; insert the three settings rows (`model_ref NULL`, tokens of Task 5, version 0); insert
  the three prompts and their revision 1 (pattern of `20261020072259_ai_initial_prompts`, actor `AI_SYSTEM_ACTOR_ID`); for `generate_cloze`:
  `UPDATE ai_prompts SET instructions=…, examples=…, revision=2, updated_by=<system> WHERE operation='generate_cloze' AND revision=1 AND
  updated_by=<system>` and insert revision 2 into `ai_prompt_revisions` **only when that update changed a row** (one `WITH … RETURNING` statement).

- [ ] **Step 1:** Spec: every initial prompt passes `promptViolations`; for each op the text appears in **some** migration ending `_ai_initial_prompts`
  or `_buoc7_ai_operations`; `$p$` markers = 2 per seeded row (no fixed 12). → FAIL.
- [ ] **Step 2:** Implement. `pnpm db:setup` on a fresh DB → `generate_cloze` at revision 2; on a DB where an admin saved revision 2 first → untouched
  (test by hand: save via `PUT /v1/admin/ai/prompts/generate_cloze`, re-run the migration SQL in a transaction, read back).
- [ ] **Step 3:** `smoke-buoc-6.mjs`: replace the revision-1 assumptions (facts P1 lines) with "read the current revision first, expect +1 after a
  save". Run `pnpm smoke:buoc-6` on a fresh DB → exit 0.
- [ ] **Step 4: Commit** `feat(ai): seed the bước 7 prompts`. Open **PR B1** (Tasks 5–6).

# Milestone M3 — Content (track B)

### Task 7: Content reads for Practice (track B)

Design §4 table, §7.4, §7.5, §10. **Files:** Modify `src/content/practice/practice-senses.ts` (+ spec), `src/content/content.service.ts`,
`src/content/sentences/sentences.service.ts`, `src/content/private/private-words.service.ts` (`visibleSenseIds`), `src/content/index.ts`;
Create `src/content/practice/meaning-pool.ts` (+ spec).

**Interfaces (Produces on `ContentService`):**
- `PracticeSense` adds `pos: string | null`, `level: Level | null` (displayed level, same order as `words.service.ts:36-44`),
  `live_revision_id: string`, `extra_forms: string[]` (forms of `word_form_additions` for `lower(lemma)`).
- `CandidateSense` adds `inflections: Array<{form; kind: InflectionKind}>`.
- `practiceOtherSenses(viewerId, senseId, nativeLanguage, db?): Promise<CandidateSense[]>` — open, live, visible senses of the same entry.
- `practiceRandomMeanings(viewerId, excludeLemmas: string[], count: number, nativeLanguage, db?): Promise<CandidateSense[]>` — published catalog
  senses with a `gloss_vi`, random (`ORDER BY random()` over a `TABLESAMPLE`-free bounded query, `LIMIT count * 4` then filter).
- `listSentences(userId, senseIds, db?)`, `visibleSenseIds(viewerId, senseIds, db?)` (plan choice 5).

- [ ] **Step 1:** Specs on the SQL builders (columns present) and on `meaning-pool.ts` filtering (excludes same lemma, keeps `gloss_vi`). → FAIL.
- [ ] **Step 2:** Implement; Practice callers compile unchanged. → PASS.
- [ ] **Step 3: Commit** `feat(content): give practice the reads for ai questions`.

### Task 8: Word forms — table service and staff API (track B)

Design §10. **Files:** Create `src/content/word-forms/word-forms.service.ts`, `admin-word-forms.controller.ts` (+ specs); Modify
`src/content/content.module.ts`, `content.service.ts` (`addWordForm`, `removeWordForm` passthroughs for Practice's accept flow).

**Interfaces:**
- `POST /v1/admin/content/word-forms` `{lemma, form}` (`content.edit`, `@Idempotent()`, `user.write`) → 201 `{id, lemma_key, form}`; existing →
  409 `word-form-exists`. `DELETE /v1/admin/content/word-forms/:id` → 204 / 404.
- `ContentService.addWordForm(actorId, lemma, form): Promise<{id; lemmaKey; formKey}>` (keys via `inflectionFormKey`).
- `ContentService.knownWordForms(pairs: Array<{lemmaKey; formKey}>): Promise<Set<string>>` (`lemmaKey + ' ' + formKey`), read by Task 22.
- After a successful add the controller calls Practice? **No** (module direction): Practice's unknown-forms list hides rows whose
  `(lemma_key, form_key)` exists in `word_form_additions` (Task 22 reads it through `ContentService.knownWordForms(pairs)`).

- [ ] **Step 1:** Controller spec: 201, 409, 404, `listRoutes` → every route needs `content.edit`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(content): let staff add word forms`. Open **PR C1** (Tasks 7–8).

### Task 9: Private words from an AI suggestion (track B)

Design §11.2, D22, D31, plan choices 3–4. **Files:** Modify `src/learning/quick-add/quick-add.controller.ts`, `quick-add.service.ts`,
`src/content/private/private-words.service.ts`, `my-words.schemas.ts`, `my-words.controller.ts`, `src/content/words/words.service.ts`
(`WordSense.ai_suggested`), `src/content/content.constants.ts` (`PRIVATE_EXAMPLES_MAX = 2`).

**Interfaces:**
- `quickAddBody.new_word` adds `examples?: string[]` (0..2, each 1..`SENTENCE_MAX` after NFC + trim) and `ai_suggestion?: boolean`.
- `CreatePrivateSenseInput` adds `examples: string[]`, `aiSuggestion: boolean` → first revision `examples_en = examples`, `draft_source =
  'ai_suggestion' | 'user'`.
- `myWordPatch.senses[]` items add `examples?: string[]` (0..2); a sense with only examples publishes a new revision (`draft_source 'user'`).
- `WordSense.ai_suggested: boolean` (`draft_source = 'ai_suggestion'` of the live revision).

- [ ] **Step 1:** Specs: quick-add with 2 examples + `ai_suggestion` → revision has both; 3 examples → 400; `PATCH` examples only → new revision,
  label gone; `PATCH` lemma only → label kept (plan choice 3). → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(content): save an ai suggestion as a private word with examples`.

### Task 10: `POST /v1/lookup/ai` (track B)

Design §11.1, D19–D21, D29, B7E19–B7E22, B7E90–B7E95, B7E110. **Files:** Create `src/content/lookup/ai-lookup.controller.ts`,
`ai-lookup.service.ts` (+ specs); Modify `src/content/content.module.ts` (import `AiModule`, `EntitlementsModule`; facts P7).

**Interfaces:**
- Body strict `{text: 1..LEMMA_MAX (NFC, trim); context_sentence?: 1..SENTENCE_MAX}`; `@LearnerContent()`, `@Idempotent({ timeoutSeconds: 60 })`,
  interceptor, `@RateLimit('user.write')`.
- Op id: `'lookup:' + sha256(idempotencyKey).slice(0, 32)` (read the key from the request header).
- Flow and problems exactly design §11.1: `entitlements.check(user,'ai.lookup')` → `refusalProblem`; `ai.isReady('lookup_word')` → 503
  `ai-unavailable` + `reason`; `reserve(user,'ai_lookup',op)` → `refusalProblem`; `ai.run` → `succeeded` → `confirm`; `in_progress` → 409
  `ai-in-progress` `Retry-After: 2` (no release); else `release` → 503 `ai-lookup-failed` `{retryable}` (transient/unavailable true, permanent false).
- Response `{suggestion: {part_of_speech, lemma, meaning: {text, language}, definition_en, examples}, catalog_senses: WordSense[]}`;
  `catalog_senses = WordsService.lookup(viewer, lower(lemma)).senses` catalog first, then the learner's private ones.

- [ ] **Step 1:** Service spec with stubbed `AiService` and `EntitlementsService`: one row per branch above (Free → 403; not ready → 503; refused →
  Bước 5 problem; ok → confirm called once, response shape; in_progress → 409 and no release; transient → release, retryable true; permanent →
  release, retryable false); log line has no text (SR10). → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(content): look a word up with ai on request`. Open **PR C2** (Tasks 9–10).

# Milestone M4 — AI questions (track A)

### Task 11: Plan of AI slots (pure) (track A)

Design §6.1 steps 3–5, §6.2, §6.3; B7E2, B7E3, B7E45, B7E46. **Files:** Create `src/practice/ai/ai-plan.ts` (+ spec); Modify
`src/practice/questions/question-types.ts` (+ spec).

**Interfaces (Produces):**
- `availableTypes(asked, eligibleCount, chosen, extra: {hasViMeaning: boolean; ownSentence: boolean; meaningPool: number; mcqForms: number;
  wordRejected: boolean})` — rules of design §6.2 for the three new types (`cloze` uses `ownSentence` when the session's source is `own`).
- `markAiSenses(kept: string[], aiCapable: Set<string>, withUnseen: Set<string>, limit: number): string[]` — unseen first, then even spread
  **from position 2** (B7E45: 10 kept, limit 5 → positions 2,4,6,8,10).
- `aiPlanned(count, typesChosen: number, aiTypesChosen: number, marked: number, kept: number): number` = `min(ceil(count × ai ÷ types), marked +
  max(0, count − kept))`.
- `aiNeeded(planned: number, markedWithUnseen: number): number`.
- `aiBudget(planned, servedInSession, pendingInSession): number`; `aiChanceInLaterRound(r, q): number`.

- [ ] **Step 1:** Table tests: B7E45, B7E46, the R5 example (10 words, 2 with a Vietnamese meaning → 2), AI-only 10/10 → 10, `aiNeeded` B7E2/B7E3,
  `aiBudget` with void items counted. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): plan the ai questions of a session`.

### Task 12: AI inputs, output checks and question assembly (pure) (track A)

Design §7.1–§7.5, §7.8, §8; B7E34–B7E36, B7E120. **Files:** Create `src/practice/ai/ai-inputs.ts`, `ai-checks.ts`, `ai-question.ts` (+ specs).

**Interfaces (Produces):**
- `clozeInput(s: PracticeSense)`, `meaningInput(s, wrongVi: string[])`, `mcqInput(s, answerForm, candidates: string[])`, `wordCheckInput(s)` →
  objects matching design §15 / Bước 6 §5.1; `contentKey(lemma, pos, meaning): string` (design §7.6 normalization, sha256 hex).
- `validForms(s: PracticeSense): Set<string>` (normalized lemma, variants, `accepted`, inflections, `extra_forms`).
- `checkCloze(r: {sentence; accepted_answers}, s): {ok: true; accepted: string[]} | {ok: false; unknownForms: string[]; reveals: boolean}`;
  `checkMeaning(r: {sentence; word_in_sentence}, s)`; `checkMcq(r: {sentence; distractors}, answerForm, candidates, s)`; `revealsWord(sentence, s)`
  (uses `maskExample` with the blank removed).
- `pickMcqForm(s, candidates: CandidateSense[], random): {answerForm; candidates: string[]} | null` (design §7.5: shared `kind` set, ≤ 6).
- `pickWrongMeanings(s, others, groupMates, random3: CandidateSense[], meanings: LemmaMeanings): CandidateSense[] | null` (D17 order, Bước 4
  sub-meaning rule, `gloss_vi` required).
- `aiQuestion(type, s, result, extras, nativeLanguage, maxDefinitionChars, random): BuiltQuestion` (shapes of design §7.8; hints of §8 with
  "lùi lên"); `ownSentenceQuestion(s, masked: MaskedExample, nativeLanguage, maxDefinitionChars): BuiltQuestion`.

- [ ] **Step 1:** Table tests: each B7E above; `deployment` for `deploy` → unknown form; answer in `extra_forms` → ok; "Deploy is easy: we ___ …" →
  `reveals`; MCQ distractor outside candidates → fail; hints: catalog vi learner 3 levels; private vi → `first_letter`, `meaning` (2 levels); `en`
  learner → no meaning level; `translation_vi` only in `answer_key`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): check ai output and build ai questions`. Open **PR D1** (Tasks 11–12).

### Task 13: The generator (track A)

Design §6.5 B–H, §7.6, §7.7, §10 (logging unknown forms); Review Focus 2; B7E7–B7E12, B7E23, B7E31–B7E33, B7E40, B7E41, B7E98, B7E99, B7E114,
B7E116. **Files:** Create `src/practice/ai/ai-requests.repository.ts`, `ai-question-generator.service.ts`, `word-checks.repository.ts`,
`unknown-forms.repository.ts` (+ specs); Modify `src/practice/practice.module.ts` (import `AiModule`).

**Interfaces:**
- `AiRequestsRepository`: `create(tx, {userId, sessionId, senseId, type, round}): Promise<AiRequestRow>`; `claimStale(id, now): Promise<boolean>`
  (one conditional `UPDATE`, design §6.5); `saveInput(id, input)`; `markFailed(id, failure: AiFailure)`; `writeQuestion(id, data):
  Promise<{questionId} | null>` (transaction: `SELECT … FOR UPDATE`, still `generating` → insert question + `ready`, else null);
  `setCharged(questionId)`; `findForSession(tx, sessionId, senseId)`.
- `AiQuestionGenerator.run(requestId: string, ctx: {learner: Learner; session: {id; aiStopped}}): Promise<GenerateOutcome>` with
  `GenerateOutcome = {state:'ready'; questionId} | {state:'preparing'} | {state:'failed'; failure: AiFailure; resetsAt?: string;
  retryAfterSeconds?: number}`. Order exactly B (`isReady`) → C (word check, `:wc`) → D (input saved once) → E (`reserve` with the request id) →
  F (`run`, one `#2`) → H (`writeQuestion`, then `confirm`, `setCharged` on `confirmed`). Sets `practice_sessions.ai_stopped` on `ai-unavailable`,
  `quota-exhausted`, `plan-required`.
- `WordChecksRepository.get(userId, senseId)`, `.put(userId, senseId, contentKey, verdict)`; `UnknownFormsRepository.record(lemmaKey, forms)`
  (`INSERT … ON CONFLICT DO UPDATE rejected_count + 1`).

- [ ] **Step 1:** Spec with a stub `AiService`, stub ledger and in-memory repositories: one row per stop point (not ready; word not recognized; check
  failed; refused ×3; `succeeded`; rejected then `#2` ok; rejected twice → release; `in_progress` → no release; `input-mismatch` → release + failed;
  transient → release; `writeQuestion` null → release; `confirm` `released` → `ai_charged` false); rerun after a stale claim reuses `ai_input`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): generate ai questions outside transactions`.

### Task 14: Unseen AI questions (track A)

Design §6.5 "Câu chưa từng hiện", D12; B7E15, B7E57–B7E59, B7E121. **Files:** Create `src/practice/ai/unseen-questions.ts` (+ spec).

**Interfaces:**
- `findUnseen(db, {userId, senseId, types: QuestionType[], liveRevisionId: string, contentKey: string | null}): Promise<PracticeQuestion[]>` —
  `source = 'ai'`, no items, `ai_charged` any; then filtered in TS: `distractor_sense_ids ⊆ visibleSenseIds` (Content, with `db`).
- `pickUnseen(rows, random): PracticeQuestion | null` (oldest first).

- [ ] **Step 1:** Spec: revision changed → none; content key changed → none; a distractor no longer visible → none; two rows → oldest. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): reuse ai questions the learner never saw`. Open **PR D2** (Tasks 13–14).

# Milestone M5 — Sessions (track A)

### Task 15: Opening a session with the new types (track A)

Design §6.1, §6.2; B7E1–B7E6, B7E117. **Files:** Modify `src/practice/sessions/sessions.controller.ts`, `sessions.service.ts` (+ spec),
`session-views.ts`, `src/practice/questions/question-builder.service.ts` (`availability` extra data).

**Interfaces:**
- `startBody.types` adds the three values (max 6, unique); `cloze_source?: 'ai'|'own'` (default `'ai'` when `cloze` chosen, else rejected).
- `start` order: existing checks → `snapshot` (Free → 403 `entitlement-required`; AI off / cap → 503 `ai-unavailable`) → `ai.isReady` for each
  chosen AI op (+ `check_private_word` when a marked sense is private and unchecked) → availability (new extras) → `markAiSenses` → `aiPlanned`
  → `aiNeeded` vs `pools.ai_practice.remaining` → 403 `ai-quota-insufficient` `{remaining, needed, resets_at}` → transaction as today, storing
  `clozeSource`, `aiPlanned`, `aiSenseIds`.
- `SessionView` adds `ai_planned`, `cloze_source`.

- [ ] **Step 1:** Spec rows: each B7E above; a session without new types reads no snapshot (Bước 4 behaviour unchanged). → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): open sessions with ai question types`.

### Task 16: `next` and `current` with the pending slot (track A)

Design §6.3–§6.6, §6.8, §7.3; Review Focus 1; B7E13, B7E14, B7E16, B7E47–B7E49, B7E52, B7E64, B7E65, B7E111–B7E113, B7E122, B7E123, B7E127.
**Files:** Modify `src/practice/sessions/sessions.service.ts` (+ spec), `sessions.controller.ts` (`next` body `{retry_ai?: true}`),
`session-views.ts`, `question-builder.service.ts` (own-sentence branch).

**Interfaces:**
- `NextResult` adds `{state:'preparing'; session; retry_after_seconds: 2}` and `{state:'ai_unavailable'; session; reason: AiFailure; resets_at?;
  retry_after_seconds?}`; `notice` adds `'ai-fallback'` (`{ai_reason}`) and `'word-not-recognized'` (`{sense_id}`); `current` adds `preparing: boolean`.
- `advance` keeps Bước 4's rules and reads `pending_ai_request_id` first (design §6.5 A); a planned AI slot → `findUnseen` → item; else request
  (created in the same transaction, pointer set) → commit → `AiQuestionGenerator.run` → G (conditional item insert `WHERE pending_ai_request_id =
  :id`, clear pointer, late `confirm` when `ai_charged = false`).
- Fallback (design §6.6): mixed → non-AI type for the same word (`ai_notice_shown` once); AI-only → `ai_unavailable` until `retry_ai`.
- Own-sentence cloze: `listSentences(userId, [senseId], tx)` → `maskExample` → `ownSentenceQuestion`; entitlement `ai.practice` checked per
  question (B7E123).

- [ ] **Step 1:** Spec with an in-memory session/item store that applies the conditional G: every B7E above; `current` never calls the generator. → FAIL.
- [ ] **Step 2:** Implement. → PASS. Run `pnpm smoke:buoc-4` on a fresh DB → exit 0 (Bước 4 flows unchanged).
- [ ] **Step 3: Commit** `feat(practice): serve ai questions through a pending slot`. Open **PR E1** (Tasks 15–16).

### Task 17: `POST /v1/practice/sessions/:id/prepare` (track A)

Design §6.4; B7E17, B7E108, B7E126, B7E128. **Files:** Modify `sessions.controller.ts`, `sessions.service.ts` (+ spec).

**Interfaces:**
- `prepare(learner, sessionId): Promise<{prepared: number; already_ready: number; failed: number}>`: round 1 only, up to
  `settings.practice.aiPrefetchCount` marked senses after the current position, while `aiBudget > 0`, skipping senses with an unseen question or a
  live request; creates requests outside the session lock's transaction (short one), runs the generator for them with `Promise.all`; never sets the
  pending pointer; nothing when `ai_stopped` is set. `@HttpCode(200)`, `@RateLimit('practice.answer')`.

- [ ] **Step 1:** Spec: K = 2 → two requests; budget 1 → one; `ai_stopped` → zero; two calls at once → one request per sense (unique index error →
  counted as `already_ready`). → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): make ai questions ahead`.

### Task 18: Hints, answers, history for the new kinds (track A)

Design §5, §7.8, §8, D9, D24, D34; B7E50, B7E51, B7E53–B7E56, B7E61, B7E124. **Files:** Modify `answers.controller.ts` (`hintBody` level 1–3),
`answers.service.ts` (`hint`, `correctOf`, `skip` for `cloze`, `AnswerResult.translation`), `session-views.ts` (`hints_available.level3`,
`reportable`), `history/history.service.ts` (+ specs).

**Interfaces:**
- `hint(userId, itemId, level: 1|2|3)`; `AnswerResult` adds `translation: string | null` (vi learners, AI questions); `correctOf` returns the option
  for `mcq`, `meaning_in_sentence`, `mcq_sentence`; `skip` allows `type_word` and `cloze`.
- `ItemView.reportable` = design §9.2 (AI question → true; own sentence → false; private non-AI → false).

- [ ] **Step 1:** Specs: each B7E above; a Bước 4 question with the legacy level-2 shape still answers `hint(…, 2)` unchanged (smoke:buoc-4
  `:338-340`). → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): hints, answers and history for ai questions`. Open **PR E2** (Tasks 17–18).

# Milestone M6 — Reports and refunds (track C)

### Task 19: Report reasons (track C)

Design §9.1, §9.2, D25, AC12. **Files:** Create `src/practice/reports/report-reasons.service.ts`, `report-reasons.controller.ts`,
`admin-report-reasons.controller.ts` (+ specs); Modify `practice.module.ts`.

**Interfaces:**
- Learner `GET /v1/practice/report-reasons?kind=ai|non_ai` → active reasons whose `applies_to ∈ {kind, all}`, ordered by `position`, label and hint in
  the learner's language.
- Admin (`settings.manage`): `GET /v1/admin/practice/report-reasons`; `POST` `{code (^[a-z][a-z0-9_]{1,39}$), label_vi, label_en, detail_hint_vi?,
  detail_hint_en?, applies_to, note_required, refundable, position}` (`@Idempotent()`, 409 `report-reason-exists`); `PATCH :code` (every field but
  `code`; `active`). No delete.
- `ReportReasonsService.forItem(tx, code, kind): Promise<ReportReasonRow | null>` for Task 20.

- [ ] **Step 1:** Specs: ordering, language, inactive hidden, `listRoutes` → admin routes need `settings.manage`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): let the admin manage report reasons`.

### Task 20: Reporting with reasons, masking and consent (track C)

Design §9.2, §7.8, D26; Review Focus 5; B7E70–B7E72, B7E78–B7E83. **Files:** Modify `reports.controller.ts`, `reports.service.ts`,
`snapshot.ts` (+ spec).

**Interfaces:**
- `reportBody.reason: string` (validated through `forItem`; unknown / inactive / wrong kind → 400 `validation-failed`); `note` required when
  `note_required`; `share_private_word?: boolean` (AI question about a private word without it → 400 `share-consent-required`).
- `create` stores `reason_label`, `question_source`, `ai_operation_id`, `ai_meta`, `ai_charged` from the question.
- `buildSnapshot` masks every `prompt.kind` with `options` by `option_private` (`meaning_in_sentence` → `PRIVATE_MEANING_MASK`); the asked word is
  unmasked only for an AI question with consent; `hints_shown` includes `level3`.
- `GET /v1/practice/reports` (learner, own, paginated like Bước 4 lists): `{id, item_id, sense_id, reason_label, status, refunded, created_at,
  resolved_at}`.

- [ ] **Step 1:** Specs: each B7E above; one snapshot row per option kind with a private option. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): report ai questions by reason`.

### Task 21: Resolving AI reports and refunds (track C)

Design §9.3, D27, D30, D33; Review Focus 4; B7E73–B7E77, B7E84, B7E118, B7E129. **Files:** Modify `admin-reports.controller.ts`,
`reports.service.ts` (+ spec); Create `src/practice/reports/refunds.ts` (pure decision + spec).

**Interfaces:**
- `resolveBody.status` adds `'confirmed'`; `refundDecision(report: {questionSource; aiCharged; status}, reason: {refundable}): 'refund' | 'no-refund'`
  and `allowedStatus(questionSource, status): boolean` (409 `resolve-status-not-allowed`).
- `resolve(actorId, reportId, status)`: role via `IdentityService.getProfile(actorId)?.staff_role` → stored `resolved_by_role`; status write commits
  first; then `entitlements.refund(userId, 'ai_practice', ai_operation_id, reportId)` → `refunded`; an exception leaves `refunded = null` (job retries).
- List filters `reason`, `source`; `GET /v1/admin/practice/refunds?resolved_by=&from=&to=` (`settings.manage`, method-level
  `@RequirePermission` overrides the class's `content.edit`) → `{report_id, user_id, resolved_by, resolved_by_role, self_resolved, refunded,
  resolved_at}`.

- [ ] **Step 1:** Specs with a stub ledger: each B7E above; `listRoutes`: `refunds` needs `settings.manage`, the rest `content.edit`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): refund confirmed ai errors`.

### Task 22: Unknown forms list (track C)

Design §10, D15; B7E96, B7E97. **Files:** Create `src/practice/reports/admin-unknown-forms.controller.ts` (+ spec).

**Interfaces:**
- `GET /v1/admin/practice/unknown-forms` (`content.edit`; most rejected first; hides pairs known to `ContentService.knownWordForms(pairs)`);
  `DELETE /v1/admin/practice/unknown-forms/:id` → 204 (dismiss). The repository is Task 13's.

- [ ] **Step 1:** Spec: order, hidden known pair, dismiss, `listRoutes`. → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): list ai forms the tables do not know`. Open **PR F1** (Tasks 19–22).

# Milestone M7 — Cleanup (track C)

### Task 23: Hourly job and private-word deletion (track C)

Design §12.1 (job, deletion), D8, D12; Review Focus 3; B7E60, B7E77, B7E115, B7E130. **Files:** Modify
`src/practice/maintenance/practice-cleanup.service.ts`, `private-senses-cleanup.provider.ts` (+ specs).

**Interfaces:**
- `runOnce(now)`: questions with no items are deleted **except** `source = 'ai'` with `created_at ≥ cutoff`; delete `practice_ai_requests` with
  `created_at < now − AI_REQUEST_RETENTION_DAYS`; retry `refund` for `status = 'confirmed' AND refunded IS NULL` (idempotent); returns the new counts.
- `deleteForSenses(tx, userId, senseIds)`: after the session locks, `SELECT … FROM practice_ai_requests WHERE user_id AND sense_id = ANY FOR UPDATE`,
  delete them and `practice_word_checks`, clear `pending_ai_request_id` pointing at them, then the Bước 4 deletions.

- [ ] **Step 1:** Specs: an unseen AI question from yesterday survives; one older than the cutoff goes; the refund retry calls the ledger once per
  report; the deletion order (requests before questions). → FAIL.
- [ ] **Step 2:** Implement. → PASS.
- [ ] **Step 3: Commit** `feat(practice): keep unseen ai questions and clean up requests`. Open **PR G1**.

# Milestone M8 — Gate (coordinator)

### Task 24: `pnpm smoke:buoc-7`, CI and the as-built (track Z)

Design §16–§18; Review Focus 1–5. **Files:** Create `scripts/smoke-buoc-7.mjs`, `docs/deliveries/buoc-7-smoke-output.txt`; Modify `package.json`
(`"smoke:buoc-7"`), `docs/deliveries/buoc-7.md` (as-built), the design (as-built notes: plan choices 1–7).

**Interfaces:**
- Copies the helpers of `smoke-buoc-6.mjs` (facts §10.1) and the content/grant setup of `smoke-buoc-4.mjs`/`smoke-buoc-5.mjs` (CSV upload, Pro grant).
  Before any learner step it adds fake models and `choose`s `fake:ok` for `generate_cloze`, `generate_meaning_question`, `generate_sentence_mcq`,
  `check_private_word`, `lookup_word` (design §18, R6); switches to `fake:bad-form`, `fake:not-recognized`, `fake:503-then-ok`, `fake:slow` where
  a step needs it.
- Steps: AC1–AC12 in order, then Review Focus 1 (5 parallel `next` on one slot → one item, one `use` row), 2 (back-date a `generating` request, re-run
  → same id, one `use`), 3 (delete a private word between `prepare` and `next` → `psql`: no question with that sense), 4 (resolve a free question →
  no `credit`), 5 (snapshot of an MCQ with a private option is masked), B7E57 (revise a catalog sense → unseen question not reused), B7E60
  (`maintenance:run`). Each step prints `ok — …` or throws.

- [ ] **Step 1:** Fresh `english_learning_smoke_b7`, `pnpm db:setup`, `pnpm build; pnpm run:dev` (fake AI, no key, `JOB_QUEUE_PREFIX=wordmet-b7-smoke`),
  `pnpm smoke:buoc-7` → exit 0.
- [ ] **Step 2:** Recreate the DB, run again → exit 0; then `pnpm smoke:buoc-4`, `smoke:buoc-5` (both fetchState modes), `smoke:buoc-6` on fresh DBs → exit 0.
- [ ] **Step 3:** CI green on every PR (list them).
- [ ] **Step 4:** Save the output; write the as-built of `docs/deliveries/buoc-7.md`; add plan choices to the design.
- [ ] **Step 5: Commit** `feat(practice): add the bước 7 smoke and record the as-built`. Open **PR Z1**.

---

# Appendix A — Prompts (design §7.2, §15; owner approves the text with the plan)

Only a starting point, as in Bước 6 (D26 Bước 6): the owner edits instructions and examples in admin at any time (D12 Bước 6). The seeded text
is English; fields ending in `_vi` are Vietnamese. `level` is optional (D27 Bước 6). The code-held guard sentence of Bước 6 (`PROMPT_GUARD`)
is added by the gateway, not repeated here. Each operation's examples must pass the save rules of Bước 6 and the Practice rules of design §7.

## `generate_cloze` — revision 2 (design §7.2, D13, D14)

Seeded as a new revision **only if** the current prompt is still the untouched revision 1 (design §15). Changes from revision 1: rule 2–4
(one word only fits; self-check), rule on the word not appearing elsewhere, and two new examples (the old `deploy` example fitted `release`
too).

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
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Only this word may fit the blank. Give the sentence a clue that belongs to this word and this meaning: a typical collocation, a typical subject or object, or the field in context_label. Avoid general sentences where many words fit.
3. Before you answer, think of the other words a learner might write in the blank, especially synonyms and near-synonyms. If any of them fits as well as the given word, rewrite the sentence until none does.
4. If you cannot make the given word the only good answer, still give your best sentence; never list other words in accepted_answers.
5. When level is given, use words and grammar at or below that level.
6. The word may be inflected to fit the sentence (for example "deploys" or "deployed").
7. accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Do not list other words, even synonyms.
8. translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
9. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

Examples:

```json
[
  { "input": { "word": "brush", "part_of_speech": "verb", "level": "A1", "meaning_vi": "chải, đánh (răng, tóc)", "context_label": null },
    "output": { "sentence": "I ___ my teeth twice a day, after breakfast and before bed.", "accepted_answers": ["brush"],
                "translation_vi": "Tôi đánh răng hai lần mỗi ngày, sau bữa sáng và trước khi đi ngủ." } },
  { "input": { "word": "attention", "part_of_speech": "noun", "level": "A2", "meaning_vi": "sự chú ý", "context_label": null },
    "output": { "sentence": "Please pay ___ to the safety instructions before the plane takes off.", "accepted_answers": ["attention"],
                "translation_vi": "Xin hãy chú ý đến hướng dẫn an toàn trước khi máy bay cất cánh." } }
]
```

## `generate_meaning_question` — "câu chứa từ rồi chọn" (design §7.4, D17)

```
You write one English sentence that shows one meaning of a word, for a Vietnamese learner of English.
The learner will read the sentence and choose the meaning of the word among four Vietnamese meanings.

The user message is a JSON object with these fields:
- word: the English word.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning, or null.
- meaning_vi: the Vietnamese meaning the sentence must use. This is the correct choice.
- context_label: a short note on where this meaning is used, or null.
- other_meanings_vi: three other Vietnamese meanings. They are the wrong choices.

Task:
1. Write one natural English sentence that uses the word exactly once, with the meaning in meaning_vi.
2. The sentence must make meaning_vi the only sensible choice: none of the meanings in other_meanings_vi may fit the word in this sentence.
3. Give the word exactly as it is written in the sentence, and a Vietnamese translation of the whole sentence.

Rules:
1. Use the word exactly once. It may be inflected (for example "deployed").
2. word_in_sentence: the word copied exactly as it appears in the sentence, with the same letters (a capital letter only if the sentence starts with it).
3. Do not explain the meaning inside the sentence and do not use the Vietnamese words.
4. When level is given, use words and grammar at or below that level.
5. translation_vi: a natural Vietnamese translation of the whole sentence.
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

Examples:

```json
[
  { "input": { "word": "deploy", "part_of_speech": "verb", "level": "B2", "meaning_vi": "triển khai (phần mềm, hệ thống)", "context_label": null,
               "other_meanings_vi": ["điều (quân), bố trí (lực lượng)", "trì hoãn", "giao (hàng)"] },
    "output": { "sentence": "The developers deployed the update to all servers after the tests passed.", "word_in_sentence": "deployed",
                "translation_vi": "Các lập trình viên đã triển khai bản cập nhật lên mọi máy chủ sau khi các bài kiểm thử đạt." } },
  { "input": { "word": "bank", "part_of_speech": "noun", "level": "A2", "meaning_vi": "bờ (sông, hồ)", "context_label": null,
               "other_meanings_vi": ["ngân hàng", "ghế dài", "bến xe"] },
    "output": { "sentence": "We sat on the grassy bank and watched the boats go down the river.", "word_in_sentence": "bank",
                "translation_vi": "Chúng tôi ngồi trên bờ cỏ và ngắm những chiếc thuyền xuôi dòng sông." } }
]
```

## `generate_sentence_mcq` — trắc nghiệm theo câu (design §7.5, D18)

```
You write one English fill-in-the-blank sentence with four choices, for a Vietnamese learner of English.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning, or null.
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used, or null.
- answer_form: the exact form of the word that fills the blank (for example "deployed"). This is the correct choice.
- candidates: other words, already in the same form as answer_form, taken from the learner's own word list.

Task:
1. Write one natural English sentence with one blank written as three underscores: ___
2. answer_form, with the meaning in meaning_vi, must be the only choice that fits the blank.
3. From candidates, choose exactly three words that do NOT fit the blank, in meaning or in grammar. If a candidate could also make a correct sentence, do not choose it.
4. Give a Vietnamese translation of the whole sentence with answer_form in the blank.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Use a clue that belongs to this word and this meaning, so the learner can tell it apart from the candidates.
3. distractors: exactly three different words, copied exactly from candidates. Never write a word that is not in candidates.
4. When level is given, use words and grammar at or below that level.
5. translation_vi: a natural Vietnamese translation of the whole sentence with answer_form in the blank.
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

Examples:

```json
[
  { "input": { "word": "deploy", "part_of_speech": "verb", "level": "B2", "meaning_vi": "triển khai (phần mềm, hệ thống)", "context_label": null,
               "answer_form": "deployed", "candidates": ["delivered", "debugged", "delayed", "defended", "deleted"] },
    "output": { "sentence": "After the tests passed, we ___ the new version to the production servers.", "distractors": ["defended", "delayed", "debugged"],
                "translation_vi": "Sau khi các bài kiểm thử đạt, chúng tôi đã triển khai phiên bản mới lên các máy chủ production." } },
  { "input": { "word": "borrow", "part_of_speech": "verb", "level": "A2", "meaning_vi": "mượn", "context_label": null,
               "answer_form": "borrow", "candidates": ["lend", "return", "sell", "carry"] },
    "output": { "sentence": "Can I ___ your pen for a minute? I forgot mine at home.", "distractors": ["sell", "carry", "return"],
                "translation_vi": "Mình mượn bút của bạn một chút được không? Mình để quên bút ở nhà." } }
]
```

Note on the first example: `delivered` and `deleted` are left out because "we delivered / deleted the new version to the servers" could be
read as acceptable; this is the behaviour rule 3 asks for.

## `check_private_word` — kiểm từ riêng (design §7.6, D26)

```
You check a word that a Vietnamese learner of English added to their own word list.

The user message is a JSON object with these fields:
- word: what the learner wrote as the English word or phrase.
- part_of_speech: its part of speech, or "unspecified" when the learner did not give one.
- meaning_vi: the Vietnamese meaning the learner wrote for it.

Answer with verdict:
- "ok" when word is a real English word or phrase (slang, a technical term or a common name of a product is fine) and it is used with the meaning in meaning_vi or a close meaning.
- "not_recognized" when word is not English, looks misspelled, or is not used with that meaning.

Rules:
1. verdict is exactly "ok" or "not_recognized".
2. When in doubt between a rare but real use and a mistake, answer "ok".
```

Examples:

```json
[
  { "input": { "word": "rizz", "part_of_speech": "noun", "meaning_vi": "sức hút, khả năng tán tỉnh" }, "output": { "verdict": "ok" } },
  { "input": { "word": "deplyo", "part_of_speech": "verb", "meaning_vi": "triển khai phần mềm" }, "output": { "verdict": "not_recognized" } },
  { "input": { "word": "bank", "part_of_speech": "noun", "meaning_vi": "con mèo" }, "output": { "verdict": "not_recognized" } }
]
```
