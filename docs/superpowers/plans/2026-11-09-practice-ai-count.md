# Practice AI count and session maximum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the learner choose how many AI questions a practice session has, within an admin maximum: a fixed number, or a share of the session. Let the admin cap a session by a fixed number or by the word count of the chosen scope. AI questions are placed evenly or at random.

**Architecture:**
- **Settings.** Five new `practice.*` settings (three single-choice, two numbers) go through the existing settings pipeline: `settings.definitions.ts` → `app_settings` JSON → `GET/PUT /v1/admin/settings` and `GET /v1/me/app-config`.
- **Session start.** `POST /v1/practice/sessions` takes optional `ai_count` and `ai_placement`. Without `ai_count`, the old split and the old check order run unchanged.
- **Planning.** Pure functions compute the maxima. `AiSessionPlanner` marks round-1 words: even uses today's `markAiSenses`, random is new. `advance` uses an even-spread rule in later rounds.
- **Admin.** The admin page gets a single-choice field kind with dependent number fields.

**Tech Stack:** NestJS + Prisma (Postgres) + zod + Vitest (`apps/api`); React + use-intl + react-aria-components + Vitest + Playwright (`apps/admin`); Figma MCP (`use_figma`).

**Spec:** `docs/superpowers/specs/2026-11-09-practice-ai-count-design.md`. Decisions: `docs/superpowers/decisions/2026-11-09-practice-ai-count-decisions.md`. Independent plan review and its findings: `docs/superpowers/reviews/2026-11-09-practice-ai-count-plan-review.md`. Mockup (owner-read, kept local): `docs/mockups/2026-11-05-redesign-concepts/vong-14-so-cau-ai.html`.

## Open decision (owner)

With the default AI cap (50%), a session with **only AI types** cannot open through the new path: K < `target_count`, and no non-AI type is left for the rest (review I6).
- This plan follows the approved spec (D16): the start returns 400.
- If the owner chooses instead that "only AI types lower the session to the AI maximum", change Task 6. When `ruleTypesFor(types, clozeSource)` is empty, set `target = Math.min(target, K)` instead of the 400, and the test "K 3, count 10, only AI types → 400" becomes "→ `targetCount` 3".

## Global Constraints

- **New settings** (API keys, `practice` section):

  | Key | Values | Default |
  |---|---|---|
  | `session_max_mode` | `fixed`, `scope_words` | `fixed` |
  | `ai_max_mode` | `fixed`, `percent` | `percent` |
  | `ai_max_fixed` | 0–100 | 5 |
  | `ai_max_percent` | 0–100 | 50 |
  | `ai_placement` | `even`, `random`, `learner` | `even` |

  `max_questions_per_session` (5–100, default 20) and `default_questions_per_session` (1–100, default 10) keep their bounds.
- **Ceiling of the `scope_words` mode:** `SCOPE_QUESTIONS_MAX = 100`, equal to `SESSION_WORDS_MAX + 1`. Not admin-editable.
- **AI share rounds down:** `floor(target_count × ai_max_percent ÷ 100)`. AI never exceeds `target_count`.
- **Lower, never 400:** a `count` or `ai_count` above its maximum is lowered. 400 (`validation-failed`) is returned only for:
  - `ai_count` not a non-negative integer (schema);
  - `ai_count > 0` with no AI type in `types`;
  - no type left after dropping AI types;
  - `K < target_count` with no non-AI type.
- **No `ai_count` in the body ⇒ old behaviour, including the old order** (`gate` before the words are read). The only change on this path is that a `count` above the maximum is lowered instead of 400, and the `scope_words` maximum applies.
- **Units:** unseen AI questions are still used first under both placements (D13). Units are checked at start, never deducted ahead (Bước 7 D7).
- Recall ("Ôn") sessions do not change.
- No learner web code (`apps/web`) in this plan.
- **Git:** branch `feat/practice-ai-count` from `origin/dev`, **after PR #248 is merged**. Conventional Commits with scopes `api`, `admin`, `design`, `deliveries`. One PR into `dev` through the `ship-pr` skill. The mockup folder stays local (owner-read docs).
- Vietnamese UI copy follows `~/.claude/rules/vietnamese-writing.md`. Labels are fixed in Task 9.

## Review Focus

1. **Old web client after admin changes AI settings.** A body without `ai_count` must ignore `ai_max_*` and `ai_placement`, and keep `gate` before the words are read. Test in Task 6.
2. **Stored settings JSON from before this change.** `withDefaults` must fill the five keys. A stored unknown choice must fall back to its default. Test in Task 1.
3. **`own_then_ai` with `ai_count = 0`.** The session must become `own` (saved sentences only), not drop `cloze`. Test in Task 6.
4. **Small session with a percent cap** (`ai_max_percent` 10, `count` 5, `ai_count` 2). K is 0, so `gate` must not run: AI switched off system-wide must not give 503. Test in Task 6.
5. **Admin edits while a session is open.** `next` must read `ai_placement`, `ai_planned` and `target_count` from the session row, not from settings. Test in Task 7.

---

### Task 0: Branch

- [ ] **Step 1:** Run `gh pr view 248 --json state` and expect `"state":"MERGED"`. If it is not merged, stop and report.
- [ ] **Step 2:** Run `git fetch origin && git switch -c feat/practice-ai-count origin/dev`. Then `git log --oneline -1` shows the merge of #248 or a later commit.
- [ ] **Step 3:** These five files are untracked and follow the switch:
  - the design;
  - the decisions;
  - this plan;
  - the review;
  - `docs/deliveries/practice-ai-count.md`.

  Stage only those five. Commit `docs(design): add the practice ai count design, decisions, plan and review`. Do **not** stage `docs/mockups/`.

### Task 1: Settings — five new practice keys

**Files:**
- Modify: `apps/api/src/settings/settings.definitions.ts`, `apps/api/src/settings/app-config.view.ts`, `apps/api/src/settings/index.ts`
- Test: `apps/api/src/settings/settings.definitions.spec.ts`, `apps/api/src/settings/app-config.view.spec.ts`

**Interfaces:**
- Produces (in `settings.definitions.ts`, re-exported from `settings/index.ts`, the module's only entry point):
  - `SESSION_MAX_MODES = ['fixed', 'scope_words'] as const`, `type SessionMaxMode`;
  - `AI_MAX_MODES = ['fixed', 'percent'] as const`, `type AiMaxMode`;
  - `AI_PLACEMENTS = ['even', 'random', 'learner'] as const`, `type AiPlacementSetting`;
  - `SCOPE_QUESTIONS_MAX = 100`.
- `AppSettings['practice']` gains `sessionMaxMode`, `aiMaxMode`, `aiMaxFixed`, `aiMaxPercent`, `aiPlacement`.
- `AppConfigView['practice']` gains `session_max_mode`, `ai_max_mode`, `ai_max_fixed`, `ai_max_percent`, `ai_placement`, `scope_questions_max`.

- [ ] **Step 1: Write the failing tests** in `settings.definitions.spec.ts`.

  Update the existing `'design §9: defaults are …'` test: its `practice` block gains `session_max_mode: 'fixed', ai_max_mode: 'percent', ai_max_fixed: 5, ai_max_percent: 50, ai_placement: 'even'`.

  Add these tests:
  - **`it('the three choices take only their values')`:**
    - `settingsValuesPatchSchema.safeParse({ practice: { session_max_mode: 'scope_words' } }).success` is `true`;
    - `'scope'`, `ai_max_mode: 'percentage'` and `ai_placement: 'both'` each give `false`.
  - **`it('ai_max_fixed and ai_max_percent are whole numbers 0–100')`:**
    - for each key, 0 and 100 are accepted; −1, 101 and 2.5 are rejected;
    - `SETTINGS_BOUNDS.practice.ai_max_fixed` is `{ min: 0, max: 100 }`, and the same for `ai_max_percent`;
    - the three choice keys have no bound entry.
  - **`it('JSON stored before the change gets the five defaults; a stored unknown choice falls back')`:** `withDefaults({ practice: { maxQuestionsPerSession: 30, aiPlacement: 'bogus' } }).practice` has `maxQuestionsPerSession: 30`, `aiPlacement: 'even'`, `sessionMaxMode: 'fixed'`, `aiMaxMode: 'percent'`, `aiMaxFixed: 5` and `aiMaxPercent: 50`.
  - **`it('default ≤ maximum is checked only in the fixed mode')`:** with `defaultQuestionsPerSession: 30` and `maxQuestionsPerSession: 20`:
    - `sessionMaxMode: 'fixed'` gives `['values.practice.default_questions_per_session: Expected at most max_questions_per_session']`;
    - `'scope_words'` gives `[]`.
  - **`it('a choice change is in the history diff')`:** `changedFields(a, b)`, where only `aiPlacement` changes from `even` to `random`, equals `[{ key: 'practice.ai_placement', oldValue: 'even', newValue: 'random' }]`.

  In `app-config.view.spec.ts`, update `'maps the defaults…'`: `practice` equals `{ max_questions_per_session: 20, default_questions_per_session: 10, session_max_mode: 'fixed', ai_max_mode: 'percent', ai_max_fixed: 5, ai_max_percent: 50, ai_placement: 'even', scope_questions_max: 100 }`.
- [ ] **Step 2:** In `apps/api`, run `pnpm test -- src/settings`. The new and updated cases FAIL.
- [ ] **Step 3:** Implement:
  - add the five keys to `AppSettings`, `SETTINGS_DEFAULTS`, `SETTINGS_BOUNDS` (numbers only), `settingsValuesPatchSchema` (`z.enum(...)` for choices, `intIn` for numbers) and `FIELDS`, right after `default_questions_per_session`;
  - make the `default ≤ max` rule of `crossFieldViolations` apply only when `sessionMaxMode === 'fixed'`;
  - add the six fields to `appConfigView`;
  - export the new constants and types from `index.ts`.
- [ ] **Step 4:** `pnpm test -- src/settings` → PASS. `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.
- [ ] **Step 5:** Commit `feat(api): add the practice ai count and session maximum settings`.

### Task 2: Pure session limits

**Files:**
- Create: `apps/api/src/practice/sessions/session-limits.ts`
- Modify: `apps/api/src/practice/sessions/sessions.service.ts`: `ruleTypesOf` calls `ruleTypesFor`.
- Modify: `apps/api/src/ai/ai.constants.ts:89`: the comment names `SCOPE_QUESTIONS_MAX` as the session ceiling.
- Test: `apps/api/src/practice/sessions/session-limits.spec.ts`

**Interfaces:**
- Consumes:
  - Task 1 types from `../../settings/index.js`;
  - `SESSION_WORDS_MAX` from `../../ai/index.js`;
  - `isAiType`, `ClozeSource` and `QuestionType` from `src/practice/practice.types.ts`.
- Produces:
  - `sessionMaxOf(practice: Pick<AppSettings['practice'], 'sessionMaxMode' | 'maxQuestionsPerSession'>, scopeWords: number): number`.
  - `aiCapOf(practice: Pick<AppSettings['practice'], 'aiMaxMode' | 'aiMaxFixed' | 'aiMaxPercent'>, targetCount: number): number`.
  - `placementOf(setting: AiPlacementSetting, requested: 'even' | 'random' | undefined): 'even' | 'random'`.
  - `withoutAi(types: QuestionType[], clozeSource: ClozeSource | null): { types: QuestionType[]; clozeSource: ClozeSource | null }`:
    - drops `meaning_in_sentence` and `mcq_sentence`;
    - drops `cloze` with source `ai`, and the source becomes null;
    - keeps `cloze` with source `own_then_ai`, and the source becomes `own`.
  - `ruleTypesFor(types: QuestionType[], clozeSource: ClozeSource | null): QuestionType[]`: today's body of the private `ruleTypesOf`.

- [ ] **Step 1: Write the failing tests.** One `it` per bullet, exact values:
  - **`sessionMaxOf`:**
    - fixed 20 with scope 4 → 20;
    - `scope_words` with 4 → 4, 1 → 1, 100 → 100, 101 → 100, 300 → 100.
  - **`aiCapOf`:**
    - percent 50 with 7 → 3, 10 → 5, 20 → 10, 1 → 0;
    - percent 10 with 5 → 0;
    - percent 100 with 10 → 10;
    - percent 0 with 10 → 0;
    - percent 33 with 3 → 0;
    - fixed 5 with 10 → 5;
    - fixed 15 with 10 → 10;
    - fixed 0 with 10 → 0.
  - **`placementOf`:**
    - (`even`, `random`) → `even`;
    - (`random`, undefined) → `random`;
    - (`learner`, undefined) → `even`;
    - (`learner`, `random`) → `random`.
  - **`withoutAi`:**
    - `['mcq_definition','meaning_in_sentence','cloze']` with `ai` → `{ types: ['mcq_definition'], clozeSource: null }`;
    - `['cloze','mcq_sentence']` with `own_then_ai` → `{ types: ['cloze'], clozeSource: 'own' }`;
    - `['cloze']` with `own` → unchanged.
  - **`ruleTypesFor`:**
    - `['mcq_definition','cloze','mcq_sentence']` with `ai` → `['mcq_definition']`;
    - `['cloze']` with `own_then_ai` → `['cloze']`;
    - `['cloze']` with `own` → `['cloze']`.
  - **`it('the scope ceiling is one more than the session words sent to AI')`:** `SCOPE_QUESTIONS_MAX === SESSION_WORDS_MAX + 1`.
- [ ] **Step 2:** `pnpm test -- src/practice/sessions/session-limits.spec.ts` → FAIL, because the module does not exist yet.
- [ ] **Step 3:** Implement. `aiCapOf` uses integer arithmetic: `Math.floor((targetCount * pct) / 100)`.
- [ ] **Step 4:** `pnpm test -- src/practice` → PASS. The existing practice tests cover the `ruleTypesOf` move.
- [ ] **Step 5:** Commit `feat(api): add pure session and ai limits for practice`.

### Task 3: AI plan helpers

**Files:**
- Modify: `apps/api/src/practice/ai/ai-plan.ts`
- Test: `apps/api/src/practice/ai/ai-plan.spec.ts`

**Interfaces:**
- Produces:
  - `roundOneAiLimit(aiCount: number, targetCount: number, kept: number): number`. Returns `aiCount` when `targetCount <= kept`, else `Math.round(aiCount * kept / targetCount)`.
  - `markAiSensesRandom(kept: string[], aiCapable: Set<string>, withUnseen: Set<string>, limit: number, random: () => number): string[]`:
    1. Take the capable words with an unseen question first, in `kept` order, up to `limit`.
    2. Fill the rest from the remaining capable words by repeated `splice(Math.floor(random() * rest.length), 1)`.
    3. Return the result in `kept` order.
  - `plannedFromCount(aiCount: number, marked: number, kept: number, targetCount: number): number` = `Math.min(aiCount, marked + Math.max(0, targetCount - kept))`.
  - `evenWantsAi(planned: number, budget: number, answered: number, targetCount: number): boolean`. Returns `false` when `budget <= 0`. Otherwise, with `placed = planned - budget`, returns true when `placed < Math.round(planned * (answered + 1) / targetCount)` or `targetCount - answered <= budget`.

- [ ] **Step 1: Write the failing tests:**
  - **`roundOneAiLimit`:** (4, 10, 10) → 4; (8, 20, 8) → 3; (5, 20, 8) → 2; (3, 4, 4) → 3.
  - **`markAiSensesRandom`**, with `kept` `a`…`j`, all capable, unseen `{b, g}`, limit 4:
    - `random = () => 0` → `['a','b','c','g']`;
    - `random = () => 0.999` → `['b','g','i','j']`;
    - limit 0 → `[]`;
    - unseen `{z}` (not capable), limit 1, `random = () => 0` → `['a']`;
    - limit 20 → all 10 words.
  - **`plannedFromCount`:** (5, 3, 3, 3) → 3; (8, 3, 8, 20) → 8; (2, 0, 4, 4) → 0.
  - **`evenWantsAi`**, with planned 8 and target 20:
    - (budget 5, answered 8) → true;
    - (budget 4, answered 9) → false;
    - (budget 4, answered 16) → true;
    - (budget 0, answered 10) → false.
- [ ] **Step 2:** `pnpm test -- src/practice/ai/ai-plan.spec.ts` → FAIL.
- [ ] **Step 3:** Implement the four exports. Leave `markAiSenses`, `aiPlanned`, `aiNeeded` and `aiBudget` as they are.
- [ ] **Step 4:** Run the same command → PASS.
- [ ] **Step 5:** Commit `feat(api): add round-one and even-spread ai plan helpers`.

### Task 4: Session column `ai_placement`

**Files:**
- Create: `apps/api/prisma/migrations/20261113090000_practice_session_ai_placement/migration.sql`
- Modify:
  - `apps/api/prisma/models/practice.prisma` (model `PracticeSession`);
  - `apps/api/src/practice/sessions/session-views.ts`;
  - fixtures in `apps/api/src/practice/sessions/sessions.service.spec.ts` (`sessionRow`, line 28) and `sessions.ai.spec.ts` (the `PracticeSession` literal near line 48, and its `Options` type).
- Test: `apps/api/src/practice/sessions/session-views.spec.ts`

**Interfaces:**
- Produces:
  - `PracticeSession.aiPlacement: string | null` (Prisma `aiPlacement String? @map("ai_placement")`);
  - `SessionView.ai_placement: string | null`;
  - `sessions.ai.spec.ts` `Options.aiPlacement?: string | null`, which Task 7 uses.

- [ ] **Step 1: Write the failing test.** Add a session-row builder to `session-views.spec.ts` (it only has an item builder today). Then:

  `it('ai_placement (09/11/2026): the row value, null for a session started without ai_count')`:
  - a row with `aiPlacement: 'random'` gives `ai_placement === 'random'`;
  - a row with `aiPlacement: null` gives `null`.
- [ ] **Step 2:** `pnpm test -- src/practice/sessions/session-views.spec.ts` → FAIL.
- [ ] **Step 3:** Write the migration:
  ```sql
  ALTER TABLE practice_sessions ADD COLUMN ai_placement text;
  ALTER TABLE practice_sessions ADD CONSTRAINT practice_sessions_ai_placement_check
    CHECK (ai_placement IS NULL OR ai_placement IN ('even', 'random'));
  ```
  Then:
  - add the model field and the view field;
  - add `aiPlacement: null` to the two fixtures;
  - add `aiPlacement?` to `Options` in `sessions.ai.spec.ts`.
- [ ] **Step 4:** Verify:
  - `pnpm db:setup` on the local DB applies the migration and generates the client;
  - the test PASSES;
  - `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors;
  - `pnpm exec prisma migrate diff --from-config-datasource --to-schema prisma --exit-code --script` → no drift.
- [ ] **Step 5:** Commit `feat(api): store the ai placement of a practice session`.

### Task 5: Planner takes the learner's AI count

**Files:**
- Modify: `apps/api/src/practice/ai/ai-session-planner.service.ts`
- Test: `apps/api/src/practice/ai/ai-session-planner.service.spec.ts`

**Interfaces:**
- Consumes: Task 3.
- Produces:
  - The `plan(learner, input, snapshot)` input gains `aiCount?: number; placement?: 'even' | 'random'; random?: () => number`. `random` defaults to `Math.random`.
  - `input.count` is the session's target count.
- Behaviour:
  - `aiCount === undefined` → exactly today's code path.
  - `aiCount === 0` → return `{ aiPlanned: 0, aiSenseIds: [] }` right after the `aiTypes` and `snapshot` check, before `findUnseen`.
  - Otherwise:
    - `limit = roundOneAiLimit(aiCount, count, kept.length)`;
    - `marked` comes from `markAiSensesRandom(…, random)` when `placement === 'random'`, else from `markAiSenses(…)`;
    - `planned = plannedFromCount(aiCount, marked.length, kept.length, count)`;
    - `needed` and the 403 work as today.

- [ ] **Step 1: Write the failing tests.** Use the spec's fakes for content, questions and entitlements, with `pools.ai_practice.remaining` set per case:
  - `it('aiCount 3, count 10, 10 capable words, none unseen, even → aiPlanned 3, the 4th, 7th and 10th words marked')`.
  - `it('aiCount 3, random with random () => 0 → the first three capable words marked')`.
  - `it('aiCount 5, count 3, only 3 capable words: remaining 2 → 403 needed 3; remaining 3 → aiPlanned 3')`.
  - `it('aiCount 4, count 10, 10 capable, words 1 and 2 have an unseen question, even, remaining 1 → 403 ai-quota-insufficient with remaining 1, needed 2')`.
  - `it('count 20 on 8 kept words, aiCount 8, even → 3 words marked, aiPlanned 8')`.
  - `it('aiCount 0 → aiPlanned 0 and no unseen-question lookup')`.
  - `it('own_then_ai: no word is AI-capable on the AI side (all have saved sentences), aiCount 3 → aiPlanned 0')`.
  - `it('aiCount undefined keeps the old split: count 10, 4 types of which 2 AI → aiPlanned 5')`.
- [ ] **Step 2:** `pnpm test -- src/practice/ai/ai-session-planner.service.spec.ts` → the new cases FAIL.
- [ ] **Step 3:** Implement the behaviour above.
- [ ] **Step 4:** Run the same command → PASS: the old cases unchanged, the new ones pass.
- [ ] **Step 5:** Commit `feat(api): plan session ai questions from the learner's ai count`.

### Task 6: Start a session with `ai_count` and the new maxima

**Files:**
- Modify:
  - `apps/api/src/practice/sessions/sessions.controller.ts`: `startBody`, plus the comments at lines 16–17 (what recall ignores) and line 25 (the `count` bound);
  - `apps/api/src/practice/sessions/sessions.service.ts`: `StartInput` and `start`.
- Test: `apps/api/src/practice/sessions/sessions.service.spec.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 4 and 5.
- Produces:
  - `startBody` gains `ai_count: z.int().min(0).optional()` and `ai_placement: z.enum(['even', 'random']).optional()`. A recall start accepts both and ignores them.
  - `StartInput` gains `ai_count?: number` and `ai_placement?: 'even' | 'random'`.

**`start` for `kind = practice`** (spec §4). Let `cs` be the cloze source (`input.cloze_source ?? 'ai'` when `types` has `cloze`, else null), as today.

1. **Input-only checks, first,** and only when `ai_count` is given. Both run before any quota check or read; both return 400:
   - `ai_count > 0` and no type is AI under `cs`;
   - `ai_count === 0` and `withoutAi(types, cs).types` is empty.
2. **Without `ai_count` (old path).**
   - Keep today's order: early quota, `assertEntitled`, `gate`, `sourceItems`, 409.
   - Then `count = Math.min(input.count ?? default, sessionMaxOf(practice, items.length))`. This replaces today's 400.
   - Then sort, `keepAvailable`, 409, and `target` as in step 4.
   - `plan` is called with `aiCount` and `placement` undefined, and the row stores `aiPlacement: null`.
3. **With `ai_count`.**
   - Run the early quota check, `assertEntitled`, `sourceItems` and 409, then compute `count` the same way.
   - Set `k0 = Math.min(ai_count, aiCapOf(practice, count))`. If `k0 === 0`, set `({ types, clozeSource: cs } = withoutAi(types, cs))`.
   - Call `gate` **only when** `types` still has an AI type. Otherwise `snapshot = null` and `gate` is never called.
   - Then sort, `keepAvailable`, 409.
4. **Target.** `target = practice.sessionMaxMode === 'scope_words' ? Math.min(count, kept.length) : count`.
5. **Final AI count** (`ai_count` path only).
   - Set `K = Math.min(k0, aiCapOf(practice, target))`.
   - If `K === 0` and `types` still has AI types, apply `withoutAi` again. The stored types then match a session without AI.
   - If `K < target` and `ruleTypesFor(types, cs).length === 0`, return 400 (see "Open decision").
   - `placement = placementOf(practice.aiPlacement, input.ai_placement)`.
6. **Plan.** Call `aiPlanner.plan(learner, { types, clozeSource: cs, count: target, kept, available: aiAvailable, aiCount: K, placement }, snapshot)`.
   - `aiAvailable` is `aiSideAvailability(…)` when `cs === 'own_then_ai'`, as today, else `availableBySense`.
   - Compute it after step 5, so a session without AI does not call it.
7. **Row.** Create it with `targetCount: target`, the final `types` and `clozeSource`, and `aiPlacement: placement ?? null`.

Every 400 here is `new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' })`. The service tests use a mocked `aiPlanner`, so they assert **what `plan` receives** and **what `practiceSession.create` gets**. The resulting `ai_planned` numbers are pinned in Task 5.

- [ ] **Step 1: Write the failing tests.** The settings come from a fake `SettingsService`; override `SETTINGS_DEFAULTS.practice` per case.
  - **The four existing gate-order tests must stay green unchanged.** They are at `sessions.service.spec.ts:294`, `:305`, `:358` and `:374`.
  - **Schema:** `it('startBody: ai_count is a whole number ≥ 0; ai_placement is even or random')`, through `startBody.safeParse`:
    - `ai_count` 0 and 3 → success; −1, 2.5 and `'3'` → failure;
    - `ai_placement` `'even'` and `'random'` → success; `'learner'` and `'bogus'` → failure;
    - a recall body with `ai_count: 3` → success.
  - **New order on the `ai_count` path:** `ai_count` 2 with AI types gives `calls.indexOf('practiceItems') < calls.indexOf('gate')`.
  - **Old path keeps its order:** without `ai_count`, `gate` comes before `practiceItems`.
  - **Count above the maximum:** fixed mode, `count` 25, maximum 20 → `create` gets `targetCount` 20, not a 400.
  - **`scope_words` mode:**
    - group of 4 words, `count` 10 → `targetCount` 4;
    - no `count`, default 10, 4 words → `targetCount` 4;
    - 24 words in scope, of which 21 can be asked with the chosen types, `count` 24 → `targetCount` 21 and `senseIds.length` 21 (on `create` data);
    - 300 words, `count` 100 → `targetCount` 100;
    - empty group → 409 `practice-no-words` with reason `group-empty`.
  - **AI count reaching the planner:**
    - percent 50, `count` 10, `ai_count` 3 → `plan` gets `aiCount: 3, placement: 'even', count: 10`; `create` gets `aiPlacement: 'even'`;
    - percent 50, `count` 10, `ai_count` 9 → `plan` gets `aiCount: 5`;
    - `scope_words`, 4 words, percent 50, `ai_count` 3, admin `learner`, body `ai_placement: 'random'` → `plan` gets `aiCount: 2, placement: 'random', count: 4`;
    - admin `even`, body `random` → `plan` gets `placement: 'even'`.
  - **400s** (assert the problem type and that no session is created):
    - `ai_count` 2 with `types: ['mcq_definition']`;
    - `ai_count` 1, `count` 4, `types: ['cloze']`, `cloze_source: 'ai'`;
    - `ai_count` 0 with `types: ['meaning_in_sentence']`.
  - **All AI allowed when the cap allows it:** `ai_max_percent` 100, `ai_count` 10, `count` 10, only AI types → 201, `plan` gets `aiCount: 10`.
  - **`ai_count` 0:** `types: ['mcq_definition','meaning_in_sentence']` → `create` gets `types: ['mcq_definition']`, and `gate` is not called.
  - **Review Focus 3:** `ai_count` 0, `types: ['cloze','mcq_definition']`, `cloze_source: 'own_then_ai'` → `create` gets `clozeSource: 'own'`, and `types` include `cloze`.
  - **Review Focus 4:** percent 10, `count` 5, `ai_count` 2, and the `gate` mock rejects with 503 → 201, and `gate` is not called.
  - **Final K is 0:** `scope_words`, percent 50, `count` 10, `ai_count` 3, one usable word → `plan` gets `aiCount: 0`; `create` gets `targetCount` 1 and types without AI types.
  - **`own_then_ai`:** `ai_count` 2 → `plan` gets the AI-side `available` map, as in the existing test at `:328`.
  - **Review Focus 1:** no `ai_count`, `ai_max_mode` `fixed`, `ai_max_fixed` 0, `types: ['mcq_definition','cloze']`, `count` 10 → `plan` gets `aiCount: undefined`; `create` gets `aiPlacement: null`.
  - **Not enough units:** the `plan` mock rejects with 403 `ai-quota-insufficient` → no session is created.
  - **Recall** with `ai_count: 3` in the body → the session starts as today.
- [ ] **Step 2:** `pnpm test -- src/practice/sessions` → the new cases FAIL.
- [ ] **Step 3:** Implement steps 1–7 above.
- [ ] **Step 4:** Run, in `apps/api`:
  - `pnpm test` → PASS;
  - `pnpm lint` → no new warnings;
  - `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.
- [ ] **Step 5:** Commit `feat(api): start a practice session with the learner's ai count`.

### Task 7: Even placement in later rounds

**Files:**
- Modify: `apps/api/src/practice/sessions/sessions.service.ts` (`advance`, `wantsAi`)
- Test: `apps/api/src/practice/sessions/sessions.ai.spec.ts`

**Interfaces:**
- Consumes:
  - `evenWantsAi` (Task 3);
  - `PracticeSession.aiPlacement` and `Options.aiPlacement` (Task 4).
- Change: the signature becomes `wantsAi(session, senseId, round, budget, left, ruleCount, answered)`, and `advance` passes its `answered`.
  - Round 1, `budget <= 0` and `ruleCount === 0` behave as today.
  - Then, when `session.aiPlacement === 'even'`, return `evenWantsAi(session.aiPlanned, budget, answered, session.targetCount)`.
  - Otherwise use today's chance r ÷ q.

- [ ] **Step 1: Write the failing tests.** Base session for every case:
  - fixed mode, `targetCount` 20, 8 words, `continued: true`;
  - `aiPlanned` 8, `aiPlacement: 'even'`;
  - round 1 done, with 3 AI items.

  Cases:
  - `it('even: the 9th question (answered 8, budget 5) is an AI question')`.
  - `it('even: answered 9 with 4 AI placed (budget 4) → the 10th question is not AI')`.
  - `it('even: answered 16, budget 4 → the 17th question is AI')`.
  - **Review Focus 5:** `it('settings changed to random after start: the session still follows its stored even placement')`. The fake settings return `aiPlacement: 'random'`, and the result equals the first case.
  - `it('legacy session (aiPlacement null) keeps the r ÷ q chance')`. Stub `Math.random` to 0.99 with r ÷ q = 0.5 → not AI.
- [ ] **Step 2:** `pnpm test -- src/practice/sessions/sessions.ai.spec.ts` → the new cases FAIL.
- [ ] **Step 3:** Implement the change above.
- [ ] **Step 4:** `pnpm test` → PASS. `pnpm exec tsc --noEmit -p tsconfig.json` → 0 errors.
- [ ] **Step 5:** Commit `feat(api): spread ai questions evenly in later rounds`.

### Task 8: Smoke on a real API and worker

**Files:**
- Create: `apps/api/scripts/smoke-practice-ai-count.mjs`, `docs/deliveries/practice-ai-count-smoke-output.txt`
- Modify: `apps/api/package.json` (`"smoke:practice-ai-count": "node scripts/smoke-practice-ai-count.mjs"`)

Copy the skeleton of `scripts/smoke-cloze-own-then-ai.mjs`: guards, `step`, `api`, `psql`, accounts, fake AI publish. Differences:
- **Run settings:** database `english_learning_smoke_ai_count`; `JOB_QUEUE_PREFIX=wordmet-aic-smoke`; fake model `fake:ok` for `generate_cloze`.
- **Content:** import **10** verbs into one topic/level bucket.
- **Learner:** Pro, with 20 AI units and 200 sessions a day. Its group "A" gets the 10 words through bulk add by topic/level. Then `psql` sets `priority = true` on 4 of the group's `learning_items`.
- **Types:** `['mcq_definition','cloze']` with `cloze_source: 'ai'`, unless a step says otherwise.
- **`walk`:** answers `mcq_definition` with the `correct_index` read from the question's answer key in the DB, and `cloze` as the skeleton does.

- [ ] **Step 1: Write the script.** Each step asserts exact values:
  1. `GET /v1/me/app-config` → `practice` has `session_max_mode 'fixed'`, `ai_max_mode 'percent'`, `ai_max_fixed 5`, `ai_max_percent 50`, `ai_placement 'even'` and `scope_questions_max 100`.
  2. Group A (`group_filter` `all`), `count` 10, `ai_count` 3:
     - `target_count` 10, `ai_planned` 3, `ai_placement 'even'`;
     - after walking all 10 questions, exactly 3 items have `ai: true`;
     - AI units go from 20 to 17.
  3. `ai_count` 9 → `ai_planned` 5.
  4. `count` 25, `types: ['mcq_definition']`, `ai_count` 0 → `target_count` 20.
  5. Admin `PUT /v1/admin/settings` with `session_max_mode 'scope_words'`, `ai_max_mode 'fixed'`, `ai_max_fixed 2` and `ai_placement 'learner'`. The history has 4 new rows with these keys and their old → new values.
  6. Group A, `group_filter: 'priority'`, `count` 10, `ai_count` 3, `ai_placement 'random'` → `target_count` 4, `ai_planned` 2, `ai_placement 'random'`.
  7. **Old client:** no `ai_count`, `group_filter: 'priority'`, `count` 4 → `target_count` 4, `ai_planned` 2 (`ceil(4 × 1 ÷ 2)`), `ai_placement` null.
  8. **400 cases:**
     - `ai_count` 2 with `types: ['mcq_definition']`;
     - `ai_count` 1, `count` 4, `group_filter: 'priority'`, with `types: ['cloze']`.
  9. **Not enough units.**
     - Lower the learner to 1 unit with the skeleton's `INSERT INTO usage_records`.
     - Check that the 4 priority words have no unseen AI question, so `needed` is 2.
     - Start `group_filter: 'priority'` with `ai_count` 2 → 403 `ai-quota-insufficient`, `remaining` 1, `needed` 2.
     - Delete the inserted rows (as the skeleton does at line 410) and check that the units are back.
- [ ] **Step 2:** Run on a fresh DB, following the start instructions at the top of the script. Every step is `ok` and the exit code is 0. Save the output to `docs/deliveries/practice-ai-count-smoke-output.txt`.
- [ ] **Step 3:** Re-run these four smokes, each on its own fresh DB:
  - `pnpm smoke:buoc-4`;
  - `pnpm smoke:buoc-7`;
  - `pnpm smoke:cloze-own-then-ai`;
  - `pnpm smoke:dot-cai-thien-c`.

  Every step must be ok. Append their summary lines to the output file.
- [ ] **Step 4:** Commit `test(api): add the practice ai count smoke`.

### Task 9: Admin — settings model for single-choice fields

**Files:**
- Modify: `apps/admin/src/features/settings/settings-api.ts` (including the "56 keys" comment), `apps/admin/messages/vi.json`, `apps/admin/messages/en.json`
- Test: `apps/admin/src/features/settings/settings-api.test.ts`

**Interfaces:**
- Produces:
  - `FieldSpec = { key: string; kind: 'bool' | 'int' | 'time' | 'ratio' | 'usd' | 'choice'; unit?: Unit; options?: readonly string[]; showWhen?: { key: string; is: string } }`.
  - `Unit` gains `'questions'`.
  - `visibleFields(section: Section, values: Values): FieldSpec[]`: the layout without the fields whose `showWhen` does not match `values`.
  - `parentOf(section: Section, key: string): string | null`: the choice key a dependent field hangs on.
  - `aiCapExamples(mode: string, fixed: number, percent: number): Array<{ questions: number; ai: number }> | null`, for 7, 10 and 20 questions, with the API's `aiCapOf` rule. It returns `null` when the number for the mode is not an integer.
- **Practice layout, in mockup order** (the mockup puts the session-maximum choice first; spec §6 is updated to match):
  1. `session_max_mode`: choice of `fixed`, `scope_words`;
  2. `max_questions_per_session`: int, `showWhen session_max_mode = fixed`;
  3. `default_questions_per_session`;
  4. `ai_max_mode`: choice of `fixed`, `percent`;
  5. `ai_max_fixed`: int, unit `questions`, `showWhen ai_max_mode = fixed`;
  6. `ai_max_percent`: int, unit `percent`, `showWhen ai_max_mode = percent`;
  7. `ai_placement`: choice of `even`, `random`, `learner`;
  8. then the seven existing keys, in their current order.
- **Copy (vi), following the mockup.** The labels of the two parent choices are the mockup's row labels. Dependent fields get short labels:

  | Field | Label (vi) |
  |---|---|
  | `session_max_mode` | "Số câu tối đa mỗi phiên" |
  | `max_questions_per_session` | "Mức cố định" |
  | `ai_max_mode` | "Số câu AI tối đa mỗi phiên" |
  | `ai_max_fixed` | "Mức cố định" |
  | `ai_max_percent` | "Tỉ lệ so với số câu của phiên" |
  | `ai_placement` | "Cách xếp câu AI" |

  Choice labels under `settings.choices.<key>.<value>`:
  - `session_max_mode`: `fixed` "Mức cố định", `scope_words` "Bằng số từ của phạm vi";
  - `ai_max_mode`: `fixed` "Mức cố định", `percent` "Theo tỉ lệ số câu của phiên";
  - `ai_placement`: `even` "Rải đều", `random` "Ngẫu nhiên", `learner` "Để người học chọn".

  Other strings:
  - `units.questions`: "câu".
  - `zeroMeaning.ai_max_fixed`: "không có câu AI".
  - `notes.session_max_mode`: "Bằng số từ: tối đa là số từ của phạm vi người học chọn, không quá 100".
  - `notes.ai_max_fixed`: "không vượt số câu của phiên".
  - `notes.ai_max_percent`: "làm tròn xuống".
  - `notes.ai_placement`: "Để người học chọn: hộp Tùy chỉnh phiên hiện Rải đều / Ngẫu nhiên khi người học chọn ít nhất 1 câu AI".
  - `cross.default_questions_per_session` becomes "và ≤ số tối đa khi chọn Mức cố định".
  - `aiCapExample`: "Ví dụ: phiên {q1} câu → tối đa {a1} câu AI · phiên {q2} câu → {a2} · phiên {q3} câu → {a3}".

  Add the matching English strings to `en.json`.

- [ ] **Step 1: Write the failing tests:**
  - **Layout test:** 61 keys, each once (update its name). Per-tab counts are `[5, 6, 14, 22, 2, 10, 1, 1]`. The first seven practice keys follow the order above.
  - **`applyPatch`:** `applyPatch(values, { practice: { session_max_mode: 'scope_words', ai_placement: 'bogus' } })` keeps `scope_words` and drops `bogus`.
  - **`visibleFields('practice', …)`** with `session_max_mode 'scope_words'` and `ai_max_mode 'percent'`: no `max_questions_per_session`, no `ai_max_fixed`, has `ai_max_percent`.
  - **`parentOf`:** `parentOf('practice', 'ai_max_percent')` → `'ai_max_mode'`; `parentOf('practice', 'history_months')` → `null`.
  - **`aiCapExamples`:**
    - `('percent', 5, 50)` → `[{questions:7,ai:3},{questions:10,ai:5},{questions:20,ai:10}]`;
    - `('fixed', 5, 50)` → ai `5, 5, 5`;
    - `('percent', 5, 30)` → ai `2, 3, 6`;
    - `('percent', 5, null as unknown as number)` → `null`.
- [ ] **Step 2:** In `apps/admin`, run `pnpm test -- src/features/settings/settings-api.test.ts` → FAIL.
- [ ] **Step 3:** Implement. `applyPatch` accepts a `choice` value only when `typeof value === 'string' && options.includes(value)`.
- [ ] **Step 4:** Run the same command → PASS. `pnpm typecheck` → 0 errors.
- [ ] **Step 5:** Commit `feat(admin): model single-choice practice settings`.

### Task 10: Admin — fields, example line, history labels

**Files:**
- Modify: `apps/admin/src/features/settings/SettingsField.tsx`, `SettingsPage.tsx`, `SettingsHistoryDialog.tsx`, `apps/admin/e2e/support/settings.ts` (DEFAULTS **and** BOUNDS)
- Test: `apps/admin/src/features/settings/SettingsPage.test.tsx`, `apps/admin/e2e/settings.spec.ts`

**Interfaces:**
- Consumes: Task 9.
- Behaviour:
  - **Choice field.** It renders the existing `Select` with `items = options.map(o => ({ id: o, label: t(`choices.${key}.${o}`) }))`. Its hint is `` `key` ``, then the note if there is one, then ` · mặc định <label>`.
  - **Page layout.** `SettingsPage` renders `visibleFields(s, draft)`.
    - A dependent field sits inside the row of its parent choice, under the dropdown, with no border of its own.
    - On the practice tab, the AI-max row ends with the `aiCapExample` line, computed from the draft through `aiCapExamples`. The line is hidden when that returns `null`.
  - **Error on a hidden field.** A server error on a field hidden by `showWhen` is shown on its `parentOf` row, and that row's select takes the focus.
  - **History dialog.**
    - Each row shows the field label. A dependent field's label is prefixed with its parent's label, e.g. "Số câu AI tối đa mỗi phiên · Mức cố định".
    - The code key stays under the label in small text.
    - A choice value is shown by its label, e.g. `practice.ai_placement` `even` → "Rải đều".
  - **e2e fixtures.** In `e2e/support/settings.ts`:
    - DEFAULTS gain the five keys, equal to the API defaults;
    - BOUNDS gain `ai_max_fixed` and `ai_max_percent` `{ min: 0, max: 100 }`.
  - **Existing e2e test.** `e2e/settings.spec.ts` finds `max_questions_per_session` by its label. Update it to the new label, under the "Mức cố định" choice.

- [ ] **Step 1: Write the failing tests.**

  In `SettingsPage.test.tsx`:
  - The `values()` fixture gives a choice key `options[0]`.
  - Selects are opened the way existing tests do: `getByRole('button', { name: /label/ })`, then `getByRole('option', { name })`.

  Cases:
  - `it('practice: choosing "Bằng số từ của phạm vi" hides "Mức cố định" and shows it again with 20 when switched back')`.
  - `it('practice: with Theo tỉ lệ at 30, the example reads 7 câu → 2, 10 → 3, 20 → 6')`. The test sets `ai_max_mode` to percent first.
  - `it('practice: the example is hidden while the percent field is empty')`.
  - `it('a 400 on ai_max_fixed while Theo tỉ lệ is chosen shows the error on "Số câu AI tối đa mỗi phiên" and focuses its select')`.
  - `it('history shows "Cách xếp câu AI" and "Rải đều → Ngẫu nhiên" for practice.ai_placement')`.

  In `e2e/settings.spec.ts`:
  - `test('practice tab: switch the maximum to "Bằng số từ của phạm vi" and the AI cap to a fixed 3, save → PUT body has session_max_mode scope_words, ai_max_mode fixed, ai_max_fixed 3')`.
- [ ] **Step 2:** In `apps/admin`, run `pnpm test` → the new cases FAIL.
- [ ] **Step 3:** Implement the behaviour above.
- [ ] **Step 4:** Run all of these and expect them to pass:
  - `pnpm test`;
  - `pnpm typecheck`;
  - `pnpm lint`;
  - `pnpm test:e2e`, the whole mocked suite, which includes `ui-guidelines.spec.ts` (no horizontal scroll at 390 px) and `a11y.spec.ts`.
- [ ] **Step 5:** Commit `feat(admin): edit the practice ai count settings`.

### Task 11: Figma — Overlay 7 dialog

**Target:** Figma file `JKnyUUtGjpGpfKK4PqBfdY`, page "App người học" (55:306):
- desktop dialog 140:4049;
- phone sheet 141:4147;
- phone scrolled copy 141:4320;
- states 131:4524.

Reuse the components on "Hệ thống" (2:2): "Nút chia đoạn" 138:319, "Hàng kiểu câu" 138:398, "Nút chữ" 166:326, and the − / + stepper already in the dialog footer. The ids were recorded on 09/11/2026; confirm them in Step 1.

- [ ] **Step 1:** Load the `figma-use` skill, then call `create_session` on the file. Screenshot the four nodes as the "before" state. If an id no longer resolves, find the frame by name and note the new id.
- [ ] **Step 2:** In 140:4049, 141:4147 and 141:4320:
  - replace the "Câu AI viết" switch with a − / + stepper showing 0;
  - add the line "Tối đa 5 câu AI · còn 280 lượt" under the header;
  - dim the two AI rows, using the existing disabled row state;
  - set the footer summary to "Dùng 1 trong 28 phiên còn lại hôm nay."
- [ ] **Step 3:** In 131:4524, delete the panel "AI khóa ở Miễn phí", then add these panels:
  1. **"3 câu AI":** stepper at 3, rows active, footer "Trong đó 3 câu AI, rải đều."
  2. **"Còn 3 lượt":** "Tối đa 3 câu AI, vì bạn còn 3 lượt", with + disabled at 3.
  3. **"Hết lượt":** stepper locked at 0, "Hết lượt câu AI tháng này.", and a "Nút chữ" "Xem gói Pro".
  4. **"Để người học chọn":** "Xếp câu AI" with a "Nút chia đoạn" Rải đều / Ngẫu nhiên, and the note "khi admin chọn Để người học chọn".
  5. **"Theo số từ":** "Số câu" stepper at 4 with "tối đa 4", filter Ưu tiên selected.
  6. **"Câu đã lưu + AI":** "Điền từ vào câu bạn đã lưu" on, "Điền từ vào câu" active, and the line "Từ nào đã có câu bạn lưu thì dùng câu đó, từ khác do AI viết."
  7. **Errors:** "Chọn ít nhất một kiểu câu AI." and "Chọn ít nhất một kiểu câu không cần AI cho 7 câu còn lại."
- [ ] **Step 4:** Screenshot the four nodes as the "after" state. Check that:
  - no text is cut;
  - phone frames keep 16 px margins and 44 px tap targets;
  - values come from variables (`color/*`, `radius/*`).

  Fix what is off, then screenshot once more. Keep the node ids of the new panels for Task 12. Nothing is committed in this task.

### Task 12: Records and PR

**Files:**
- Modify: `docs/deliveries/practice-ai-count.md` (the as-built section goes under the plan summary)
- Modify: `CLAUDE.md` (one pointer section, like the other rounds)
- Modify: `docs/deliveries/cloze-own-then-ai.md`: in "Việc cho đợt dựng hộp mới", the D3 line becomes "thay bằng `practice-ai-count`".

- [ ] **Step 1:** Write the as-built section. It records:
  - **What changed**, with file paths.
  - **Test counts** from the final `pnpm test` runs, for both the API and the admin.
  - **Smoke results.**
  - **Figma node ids** from Task 11, and the mockup's artifact link "Số câu AI và cài đặt luyện tập".
  - **Known limits:**
    - With default settings (50%), a session of only AI types cannot open through the new path (review I6, unless the open decision changed it).
    - In `scope_words` mode, a kept word that fits only an AI type, and is not marked for AI, is skipped in round 1. The session then reaches `waiting_continue`, and continuing repeats words (review M3).
    - On the `ai_count` path, a provisional K > 0 with a final K = 0 means `gate` has already run.
  - **Web tasks for the new dialog:**
    - send `ai_count` and `ai_placement`;
    - compute the maxima from `/v1/me/app-config`;
    - show "Cần ôn" as `today.priority + today.due + today.new`;
    - show the two error lines;
    - make `againBody` (`SessionSummary.tsx`) resend `ai_count`, `ai_placement` and the original `types` and `cloze_source`, since the stored ones may be reduced;
    - until then, the current dialog still caps `count` at `max_questions_per_session`, even in `scope_words` mode (`CustomizeDialog.tsx:85`).
- [ ] **Step 2:** Add the `CLAUDE.md` pointer and change the line in `cloze-own-then-ai.md`.
- [ ] **Step 3:** Commit `docs(deliveries): record the practice ai count as built`.
- [ ] **Step 4:** Ship with the `ship-pr` skill:
  - base `dev`;
  - title `feat(api): let learners choose the ai question count`;
  - the body lists the API, admin and Figma parts, and the path of the smoke output;
  - report the CI verdict.
