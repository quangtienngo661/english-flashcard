# Review — AI practice questions: synonyms inside a session (design of 06/11/2026)

Reviewed: `docs/superpowers/specs/2026-11-06-cloze-session-synonyms-design.md` and its decision record
`docs/superpowers/decisions/2026-11-06-cloze-session-synonyms-decisions.md`, against the code on branch
`docs/cloze-session-synonyms` (HEAD `b53782a9`). Reviewer: independent (did not write the design). Date: 06/11/2026.

Method: every claim about code was checked by reading the file named below; line numbers are from this worktree. Owner decisions
(D1–D14) are taken as settled; findings about them only describe a concrete problem the design does not handle. The author's calls
(design §9) are challenged where the code or a simpler option argues against them.

Severity: **Critical** = a learner sees something wrong or data is recorded wrong if the builder follows the doc as written;
**Important** = the builder must guess and a wrong guess matters; **Minor** = clarity or a small gap.

## Summary

| Id | Severity | One line |
|---|---|---|
| R1 | Critical | Only Enter is turned off on the alternative card; keys `1` and `2` still review, and the server applies them to the asked word |
| R2 | Critical | The end-of-session list and "Review all" are keyed by item id; listing the typed word as §4 says moves the asked word's schedule |
| R3 | Important | Grading step 1 "a form of the asked word" is not today's rule (`accepted` of this sentence only); the doc is ambiguous |
| R4 | Important | §10 allows storing the session-word forms when writing; that cannot satisfy call 10 or reused questions |
| R5 | Important | The reuse rule (§5.4) is unimplementable as placed: three callers, inputs deleted after 7 days, old unseen questions die. A simpler rule exists |
| R6 | Important | `session_words` are bare lemmas; a declared alternative can credit a meaning Lan is not learning (anti-goal 2) |
| R7 | Important | Adding `also_accepted` to a strict output breaks seed prompt examples, their spec, `smoke:nhom-b`, every draft copied from live, and the fake |
| R8 | Important | "at most 20" is a default, not a bound (setting max 100); a schema cap taken from the doc fails big sessions with `bad-input` |
| R9 | Important | Anti-goal 1 fails when an admin sets `type_word_max_retries`: a session word on the last try is a final wrong |
| R10 | Important | Readers keyed by `item.sense_id` other than weak stats are not listed (history filter, `last_practiced_at`, probe, cleanup) |
| R11 | Important | Private words: the flag lives in `ai_input` (deleted after 7 days); a typed private word's credit and an `also_accepted` spelling survive deletion and reach report snapshots unmasked |
| R12 | Important | `single_correct_option` cannot be a revision of the cloze judge; judge instructions, calibration and pre-change real questions are not covered |
| R13 | Important | Eval rule `unknown-alternative`: pass or fail is not stated; live keeps the question, eval may count a rule failure |
| R14 | Important | Reading the `pair:`/`no-pair:` halves by note tag does not work for held-out rows (30%), and run rows carry no note |
| R15 | Important | §3.4 "the prompt already asks for this" is half true: nothing asks the MCQ writer to avoid synonyms; "rules 2–3" are Task steps 2–3 |
| R16 | Important | No When → Then / edge-case tables (repo convention) and no "Xong khi"; the fake cannot produce an alternative, so the card is never smoked |
| R17–R29 | Minor | Claims, wording, author's calls worth a second look (see below) |

## Critical

### R1 (Critical) — Keys `1` and `2` still change a schedule on the alternative card

- **Doc, §3.2:** "**The Enter key shortcut is off on this card.** Today Enter follows the bold button (`AnswerFeedback.tsx`); here a
  habitual second Enter must change nothing." Decision D7 and anti-goal 3 ("One habitual key press moving the review schedule of a
  word the learner did not answer") say the same.
- **Evidence:** the result shortcuts are not in `AnswerFeedback.tsx` (it only draws the `<kbd>` and has the comment, lines 17–22).
  They live in the page-level key handler `apps/web/src/features/learner/practice/session/PracticeSession.tsx:83-91`: on a final
  outcome `1` → `state.review('needs_review')` whenever `kind !== null`, `2` → `state.review('known')` when `kind === 1`, Enter →
  Know / Still learning / Next. `kind` comes from `feedbackCase(result)` (`AnswerFeedback.tsx:11-15`), which for an alternative
  answer stored as `result: 'correct'` (the doc's own suggestion, §10) yields 1, 2 or 3. The review call posts
  `/v1/practice/items/:id/review` with `{ action }` only (`use-practice-session.ts:284`; body schema
  `practice-reviews.controller.ts:10`), and the server reviews `item.senseId` (`practice-reviews.service.ts:49`), which is the
  **asked** word.
- **Why it matters:** a builder who turns off exactly what §3.2 names leaves `1` (and `2` when the asked word is due) active; one
  habitual key press moves `vital`, the word Lan did not type. That is anti-goal 3, and the wrong schedule change is written to
  `learning_items` and the learning log.
- **Fix:** say "every result shortcut (Enter, `1`, `2`) is off on the alternative card", name `PracticeSession.tsx` as the place, and
  make the server refuse an unqualified review of an alternative item: the review body gains the word (`sense_id`) and an
  alternative item without it is a 409, so an old client or a stray shortcut cannot hit the asked word by default.

### R2 (Critical) — The end-of-session list moves the asked word when it lists the typed word

- **Doc, §4 table:** "End-of-session review list | not listed (builder's call, see §9) | listed only if a hint was used, as today";
  §9 call 5.
- **Evidence:** the list is built by `listed()` in `apps/api/src/practice/reviews/practice-reviews.service.ts:113-129`: one row per
  `item.senseId`, `item_id` = the word's last final item, "pressed" from `item.reviewAction`. The web's per-row "Still learning"
  posts `/v1/practice/items/${itemId}/review` with no word (`SessionSummary.tsx:74`), and "Review all" sends
  `{ senseId: word.sense_id, reviewId: word.item_id }` (`practice-reviews.service.ts:77`). The item of an alternative answer has
  `senseId = vital`.
- **Why it matters:** today's code lists `vital` (the item's sense) after a hint, the opposite of call 5. A builder who changes
  `listed()` to list `crucial` keyed by that item, as "as today" suggests, gets a row whose button calls `review(itemId)`, and the
  server applies it to `vital` (R1's mechanism). `reviewAll` writes the learning log with `reviewId = item.id` for `crucial`, which
  collides with the key the card's `vital` row uses unless the per-word key of §8 is used here too. `word.action ??= item.reviewAction`
  reads one column for two words.
- **Fix:** state, for the summary and Review all: which items count as `crucial`'s (its own and the alternative ones), which item a
  row is keyed by, that the row's review call names the word, that the learning-log key is the same per-item-and-word key as on the
  card, and where each row's "pressed" state comes from. Add a When → Then row: "When Lan typed `crucial` with a hint into the `vital`
  sentence and presses Still learning on the summary → Then `crucial` gets priority and `vital` is unchanged".

## Important

### R3 (Important) — Grading step 1 is not today's rule

- **Doc, §3.1:** "Order of matching a typed answer: a form of the asked word → Right; a declared alternative … ; a form of any other
  word of the current session → this message; anything else → today's message."
- **Evidence:** today a typed answer is right only if it matches `answerKey.accepted` (`answers.service.ts:73`), and for an AI cloze
  `accepted` is the normalized `accepted_answers` of **this sentence** (`ai-question.ts:57`), a subset of the word's forms chosen to
  fit the blank. `validForms` (`ai-checks.ts:11-14`) is the full set of forms.
- **Why it matters:** if "a form of the asked word" is read as `validForms`, `brushed` typed into "I ___ my teeth twice a day" becomes
  Right (today: Try again), and for `found`/`find` the wrong meaning is accepted. If it is read as `accepted`, then a valid but
  unaccepted form of the asked word falls to step 3 or 4, and step 3 may fire on a homograph (see R21). Either way the learner sees a
  different result depending on the guess.
- **Fix:** write step 1 as "a form in this question's accepted answers (`answerKey.accepted`), as today", and say that a valid form
  of the asked word that is not accepted for this sentence is not a session word (goes to step 4).

### R4 (Important) — The session-word forms cannot be "stored when writing"

- **Doc, §10:** "whether the forms for the session-word message are computed when grading or stored when writing (either way only
  current-session words count, §3.1)". §3.1 and call 10: the message covers **every** word of the current session, any part of
  speech; a reused question is graded against the current session.
- **Evidence:** a reused question is asked in another session (`unseen-questions.ts`, `sessions.service.ts:543-545`). Forms stored at
  writing time can only be those of the writing session; intersecting them with the current session loses every current word that
  was not in the writing session. Questions written before this change (and unseen ones, kept up to `history_months`,
  `practice-cleanup.service.ts:40-42`) store nothing.
- **Why it matters:** "stored when writing" gives Lan the spelling message for a word of her own session whenever the question was
  reused or pre-dates the change, which is exactly G1's failure.
- **Fix:** remove the option: the session-word forms are computed at grading from the item's session (`sense_ids`) and the senses as
  they are now (visibility included). Add an edge case: "When a question written before this change is graded → Then the
  session-word message still works and `also_accepted` counts as empty".

### R5 (Important) — The reuse rule of §5.4 has no workable home; a simpler rule does the job

- **Doc, §5.4 / call 2:** "A question is reused only if every same-part-of-speech word of the current session was in the
  `session_words` it was written with. Otherwise a new one is written."
- **Evidence:**
  1. Unseen questions are looked up in three places that must agree: the planner counts them to decide which words get AI and how
     many units the session needs (`ai-session-planner.service.ts:70-72`, `aiNeeded` at line 86); `prepare` skips prefetching a word
     that has one (`sessions.service.ts:245-251`); the slot uses one (`sessions.service.ts:543-545`). Applying the rule only at the
     slot lets the planner count a free question that is then not reusable: the session needs a unit it did not check for, and
     `prepare` never prefetched it, so Lan waits.
  2. `findUnseen` reads `practice_questions` (`unseen-questions.ts:15-21`), which holds no `session_words`; the input sent to the AI is in
     `practice_ai_requests.ai_input`, deleted after `AI_REQUEST_RETENTION_DAYS = 7` (`practice-cleanup.service.ts:57-60`,
     `practice.constants.ts:25`), while unseen questions are kept up to `history_months` (default 6). After 7 days the rule cannot
     be evaluated unless the list is copied onto the question.
  3. Every unseen AI cloze written before the change has no list, so the rule rejects it whenever the new session has another
     same-POS word: units already charged for prefetched questions are lost.
  4. "same-part-of-speech word" differs from §5.1's selection (same POS, plus words with no POS, plus all when the asked word has
     none).
- **Why it matters:** unit checks and prefetch go wrong, and the builder must invent where the list is stored.
- **Simpler alternative (recommended):** drop the rule. Reuse as today. Grading already protects Lan: an `also_accepted` form counts
  only for current-session words (§5.4 rule 1), and any other current-session word gets the session-word message (D14). A reused
  question was simply written without knowing the new session, the same as a writer that failed to avoid. No planner, `prepare` or
  storage change, no lost units; the risk in §11 ("Reuse rule may raise AI unit use") disappears. If the rule stays: store the list on
  the question row, apply it through one shared function in all three callers, define old questions (reusable or not), and use the
  §5.1 selection.

### R6 (Important) — Bare lemmas let a declared alternative credit the wrong meaning

- **Doc, §5.1:** "`session_words`: the lemmas of the other words in the same practice session"; §4: "crediting a meaning Lan may not
  have meant would break anti-goal 2", handled only when two senses of a word are both in the session.
- **Evidence:** the writer input today is one sense's `word`, `part_of_speech`, `level`, `meaning_vi` (`ai-inputs.ts:14-19`). The
  learning item, the stats and the review are per **sense** (`practice-stats.ts` partitions by `sense_id`;
  `practice-review.service.ts` looks up `learning_items` by `sense_id`). A lemma alone does not say which sense Lan is learning.
- **Why it matters:** Lan's deck holds `critical` with its "criticising" meaning. The writer sees `critical` in `session_words`, decides
  it fits "Sleep is ___ for good health." in its "important" meaning and declares it. Lan types `critical`: Alternative answer, and her
  "criticising" sense gets a full right for a sentence that used another meaning. The judge sees the same bare lemma and cannot catch
  it. This is the case §4 already rejects, for one sense instead of two.
- **Fix:** send each session word with its meaning, for example `session_words: [{ word, meaning_vi }]`, and tell the writer (rule 2)
  to declare a word only when it fits **with that meaning**; tell the judge the same. If the owner prefers lemmas only, state the
  risk in §11 and give no credit when the session sense is polysemous in the catalog. Either way, add the case to the edge cases.

### R7 (Important) — A strict output shape: seeds, specs, smoke and drafts break

- **Doc, §5.2:** "`generate_cloze` output gains `also_accepted` … The output schema gets a new version name (`generate_cloze_v1` →
  `_v2`)." §8: "Smokes that run the fake provider (`smoke:buoc-7`, `smoke:nhom-b`) must keep passing; the fake provider returns the
  new field."
- **Evidence:** `rawShape` accepts only "exactly the declared keys" (`define-operation.ts:33-43`); every prompt example is checked
  with `checkOutput` (`prompt-rules.ts:33`), on every draft save and temporary run (`configs.service.ts:232-235`). The seed examples of
  `generate_cloze` have no `also_accepted` (`initial-prompts.ts:33-42`); `initial-prompts.spec.ts:16-21` asserts every seed passes
  `promptViolations`, and lines 24-30 assert the seed text is byte-identical to the two applied seed migrations (no new seed migration
  is allowed by `expect(folders).toHaveLength(2)`). `smoke-nhom-b.mjs:663-671` saves a `generate_cloze` draft with the live examples
  plus a few-shot output without `also_accepted` and expects `unknown-form:…` (it would now get `shape`). The fake adapter switches on
  the schema name `generate_cloze_v1` (`fake.adapter.ts:20`, `:60`); `_v2` falls to `default: {}`.
- **Why it matters:** the unit tests and `smoke:nhom-b` go red, and the owner's first new draft (copied from the live revision) is
  refused until every example is edited by hand.
- **Fix:** choose and write down one of: (a) keep `also_accepted` required, add a new seed migration with the updated examples,
  update `initial-prompts.spec.ts`, the smoke's `shot()` and the fake, and tell the owner that copied drafts need the field;
  (b) let the output check default a missing `also_accepted` to `[]` for prompt examples only (a change in the shared
  `define-operation.ts`, so say it). Also say whether the new prompt ships as a seed migration: a fresh database (smokes, the future
  production Deploy) starts from seed revision 2, which knows nothing of `session_words`.

### R8 (Important) — The list has no stated cap, and "at most 20" is wrong

- **Doc, §5.1:** "A session holds 10 questions by default and at most 20 (`settings.definitions.ts`), so the list is short."
- **Evidence:** 10 and 20 are defaults (`settings.definitions.ts:74`); `max_questions_per_session` accepts up to 100 (line 109).
  The gateway input is a `z.strictObject` (`generate-cloze.ts:12-18`); the only list input today, MCQ `candidates`, is capped at
  `MCQ_CANDIDATES_MAX = 6` (`generate-sentence-mcq.ts:22`).
- **Why it matters:** a builder who caps `session_words` at 19 from the doc makes every AI cloze in a session above 20 words fail as
  bad input (a permanent failure, then a non-AI fallback), after an admin raises the setting.
- **Fix:** state the cap explicitly (99, from the setting's maximum, or a lower number with a rule for which words are kept), the
  per-entry limit (`WORD_MAX`), and an `also_accepted` cap and normalization like `ACCEPTED_ANSWERS_MAX` and `dedupeAnswers`.

### R9 (Important) — Anti-goal 1 fails when retries are capped

- **Doc, anti-goal 1:** "A learner marked wrong, or told to check her spelling, for typing a word from her own session." §8:
  "unlimited retries by default, `type_word_max_retries = null`".
- **Evidence:** `answers.service.ts:76`: a wrong typed answer is a try-again only while `item.maxRetries === null || item.tries <
  item.maxRetries`; otherwise it is a final `wrong`. The setting accepts 1–10 (`settings.definitions.ts:116`).
- **Why it matters:** with a cap, Lan's last try with `routine` (undeclared, fits) or `habit` is a final wrong: the asked word gets a
  wrong in its stats and Lan sees "Not quite" with Still learning in bold.
- **Fix:** say what happens on the last allowed try: either a session word does not use up a try (tries still counted), or it is a
  final wrong and anti-goal 1 is limited to "unlimited retries". Add the When → Then row.

### R10 (Important) — Other readers keyed by the item's sense

- **Doc, §4 and §8:** only weak-word stats are named ("Weak-word stats read `result` and `sense_id`"). §10 suggests
  "`result = 'correct'` plus a matched-word column".
- **Evidence (each reads `practice_session_items.sense_id`):**
  - `practice-stats.ts:26-45`: besides weak words, the same query gives `last_practiced_at`, which drives the `least_practiced`
    sort (`sessions.service.ts:112-118`). The doc says the asked word gets "nothing: not an attempt" but not whether its
    `last_practiced_at` moves.
  - `history.service.ts:98-103`: history filtered by `sense_id` (a word's own history) shows the alternative item under `vital`,
    whose stats got nothing, and not under `crucial`, which got the credit.
  - `entry-usage.probe.ts:6-8` promises "Every column that holds a sense id is checked": a matched-word column must be added there.
  - `private-senses-cleanup.provider.ts:39-42` deletes items by `sense_id` only (see R11).
  - `ai-quality.service.ts:63-64` counts alternatives as correct in the AI dashboard; say whether that is wanted.
- **Fix:** add a short table "reader → what it does with an alternative item" covering these, so the builder does not discover them
  one test at a time.

### R11 (Important) — Private words: three gaps around D13

- **Doc, §5.1:** "The stored input of a fill-in question does not record which words are private today, so the builder stores that
  with it … When Lan deletes one of her own words, its questions are deleted as today, but its spelling stays inside the stored input
  of her other questions until that input is cleaned up."
- **Evidence and gaps:**
  1. *Where the flag lives.* The stored input is `practice_ai_requests.ai_input`, deleted after 7 days (R5). After that,
     `touchesPrivateWord` sees `aiInput = null` and, for a cloze, returns false (`real-questions.ts:28-38`); "Đưa vào bộ ví dụ"
     then rebuilds the input from the catalog (`example-source.service.ts:92-106`, `:51`). Nothing private leaks (the rebuilt input has no
     `session_words`), but D13's "never copied into the test set" stops being true, and the copied row becomes a `no-pair` row by
     accident. Say which: store the flag on the question row, or accept the rebuilt path and say so.
  2. *Credit survives deletion.* If `crucial` is Lan's private word and she typed it into the `vital` sentence, the item belongs to
     `vital`. `deleteForSenses` deletes items, reports and questions by `sense_id` only
     (`private-senses-cleanup.provider.ts:39-42`), so the matched-word column keeps the deleted private sense id and its credit.
     The reverse (asked word private, typed word catalog) deletes the item and the catalog word's credit with it. State both.
  3. *Spelling in other places.* An `also_accepted` entry from a private word sits in the question's answer key (kept up to 6
     months, not 7 days), and a report copies the type-word key into its snapshot (`reports/snapshot.ts:32-33`) without the masking
     used for private MCQ options (lines 19-24). The learner's report notice only names the asked private word. Say that private
     `also_accepted` entries are masked in snapshots (as `PRIVATE_WORD_MASK`) and how long they stay.

### R12 (Important) — Judge: a new judge, not a revision; instructions and old questions

- **Doc, §6:** "Both criteria are edited by the owner as new judge revisions in the admin 'Judge' page (no migration; nhóm B OI-4).
  This design gives their text".
- **Evidence:** operations belong to the judge, criteria to its revision (`judges.service.ts:22-27`); a pass refuses an operation the
  judge does not score (`judge-passes.service.ts:78`) and sends **all** the revision's criteria for every subject (`judge-job.ts:93`).
  The seeded judge scores `generate_cloze` only (`initial-judges.ts:10-11`). Its instructions also list the input and output fields
  and say "fail_major … when a word in context.session_words fits the blank" (`initial-judges.ts:17-31`).
- **Why it matters:**
  - `single_correct_option` added to the cloze judge would require adding `generate_sentence_mcq` to its operations, and then
    `session_single_answer` is scored on MCQ outputs (and `single_correct_option` on cloze). It needs its own judge.
  - The doc gives only the two criterion questions and verdict tables; the instructions must also change (new `input.session_words`,
    `output.also_accepted`, drop the `context.session_words` rule), or real passes and eval runs keep measuring differently.
  - New criterion codes start with no labels: calibration (`judge_label_min` 30, agreement 0.85) restarts. Worth one line for the
    owner.
  - Real questions written before the change have no `input.session_words`, so the new criterion passes them by default and dilutes
    the score. Say to filter the pass by the new prompt's config number, or to treat a missing list as not judgeable.
- **Fix:** "Create a second judge for `generate_sentence_mcq` with `single_correct_option`; add a revision of 'Chỉ một đáp án' with
  `session_single_answer` and rewritten instructions (text in an appendix)", plus the two notes above.

### R13 (Important) — Eval rule result for an unknown alternative

- **Doc, §5.3:** live, an `also_accepted` entry that is not a form of a session word "is dropped and logged …; the question itself is
  kept"; "The eval code rules (`practice-eval-rules.ts`) report a dropped entry as a problem `unknown-alternative:<form>`."
- **Evidence:** `RuleResult` problems today come only with `status: 'fail'` (`practice-eval-rules.ts:8-10`, `:52-63`); a fail counts
  in the run's rule tally and the publish gate's `rate-drop` (`publish-check.ts:9-19`, `:75-80`), and fails a few-shot example on save
  (`configs.service.ts:353-360`).
- **Why it matters:** if the builder returns `fail`, eval says "rule failed" for an output that live accepts; if `pass` with problems,
  that shape is new. Session words written into test rows that are not catalog lemmas cannot be checked at all (the rule looks them
  up in the catalog, lines 51 and 83-85).
- **Fix:** state the status (recommended: `pass` with the problem listed, matching live, or a separate count), and what a session
  word not found in the catalog does in eval. Also say whether a dropped entry is recorded in `practice_unknown_forms` (it may be an
  inflection of a session word missing from the forms table).

### R14 (Important) — The two halves cannot be read by note tag for held-out rows

- **Doc, §7 / call 8:** "Each row's `note` starts with a tag (`pair:` or `no-pair:`) and the owner reads the halves from the run's rows
  by that tag; no new admin screen or API".
- **Evidence:** a run's item view has no `note` (`eval-runs.service.ts:61-73`); held-out items (`eval_held_out_ratio` 0.3) never leave
  the API: "a held-out example's input, expected answer and output never leave the API" (line 254), and their scores appear only as
  numbers (lines 262-265).
- **Why it matters:** about 30% of the rows cannot be split by half at all, and the other 70% need a manual join of example ids to the
  examples list. Opening a held-out example to read its note turns it into a dev example.
- **Fix:** either accept "halves are read on dev rows only" and say so, or add the note (or a `pair` flag) to the dev item view and a
  per-tag count of judge verdicts that includes held-out items as numbers only. The second is a small API change; the first keeps
  call 8 but weakens G6's measurement.

### R15 (Important) — G4's "no synonym" half has no mechanism

- **Doc, §3.4:** "The prompt already asks for this (initial prompt rules 2–3: 'answer_form … must be the only choice that fits'; 'If a
  candidate could also make a correct sentence, do not choose it')"; G4: "with no synonym of the answer among them".
- **Evidence:** those quotes are **Task** steps 2–3 (`initial-prompts.ts:142-143`); Rules 1–6 (lines 146-152) are other things. Both
  steps are about *fitting*. Nothing asks the writer to avoid a candidate that is a synonym but does not fit. Candidates are picked
  by Practice from deck mates (`ai-question-generator.service.ts:211-217`), up to 6 (`MCQ_SENTENCE_CANDIDATES_MAX`); in a deck of
  near-synonyms the writer may have no non-synonym choice.
- **Why it matters:** the judge will report `fail_minor` that no part of the system tries to prevent, and the builder, told "the
  prompt already asks", changes nothing.
- **Fix:** either add a writer rule ("prefer candidates that are not synonyms of the answer") to the MCQ prompt revision, or narrow G4
  to "exactly one option fits" and keep the synonym check as information only. Correct the quote to "Task steps 2–3".

### R16 (Important) — No acceptance criteria, edge cases or "Xong khi"; the alternative path cannot be smoked

- **Doc:** cites nhóm B R6, Bước 7 D9 and the Bước 4 review rules, but has no When → Then table and no edge-case table with ids, and no
  definition of done.
- **Evidence:** `docs/specs/SPEC_WRITING_CONVENTIONS.md` requires both tables for any design that cites a higher-level rule; the
  designs this one builds on have them (`2026-10-21-buoc-7-…-design.md` §16, §17, §18 "Xong khi"; `2026-10-29-nhom-b-…-design.md` §11,
  §13). The fake writer always returns one fixed sentence and `accepted_answers: [word]` (`fake.adapter.ts:20-23`), so no smoke can
  reach the alternative card, the two rows or the credit.
- **Why it matters:** the many cases in this review (R1–R11, R17–R23) would each have been forced into the open by those tables; and
  `.claude/rules/verification.md` requires the runtime path to be exercised, which no fake scenario allows today.
- **Fix:** add §"Acceptance criteria" and §"Edge cases" (prefixes such as `CS#` / `CSE#`) covering at least: reused question,
  pre-change question, multi-sense word, private typed word, hint before an alternative, own-sentence and type-word questions, capped
  retries, reload after a try-again, session ended on the alternative card, summary and history, frozen old set versions. Add
  "Xong khi": CI green + a smoke on a fresh DB with a new fake model (for example `fake:alternative`, which copies the first
  `session_words` entry into `also_accepted`) that answers with the declared word and checks the card, the two rows, Enter/`1`/`2`
  doing nothing, the credit and the summary.

## Minor

### R17 (Minor) — "`AiQuestionGenerator.run` receives the session"

§5.1. `run` receives `{ id, aiStopped }` only (`ai-question-generator.service.ts:63-64`; callers `sessions.service.ts:196`, `:262`).
The words come from `practice_sessions.sense_ids`, which `buildInput` must read. Also say whether `sense_ids` (all round-1 words) or
the still-usable subset (`sessions.service.ts:384-390`) is meant.

### R18 (Minor) — Own-sentence hint versus "Non-AI questions are unchanged"

§2 says non-AI questions, including `own_sentence`, are unchanged; §3.1 changes their first-letter hint (both use `clozeHints`,
`ai-question.ts:29-37`, `:103`). Reword the non-goal ("cannot declare alternatives"). For "where `c___` is formatted" (§10):
`smoke-buoc-7.mjs:753` asserts `{ kind: 'first_letter', text: lemma[0] }`, stored hints of existing questions keep `c`, and the admin
report page prints the stored text (`apps/admin/src/features/reports/ReportDetail.tsx:59-64`). Formatting in the web from
`kind: 'first_letter'` keeps the smoke, old questions and the API unchanged; formatting in the API needs the smoke and the B7 unit
tests updated. Say which.

### R19 (Minor) — Other senses of the asked lemma

§5.1 "The asked word and repeats are left out" and §3.1 "every word of the current session other than the asked word": say "the
asked lemma". With two senses of `fair` in a session, `fairer` (a form of the asked lemma not accepted for this sentence) would get
"That's another word from this session", which reads as wrong to Lan. Exclude senses that share the asked lemma from step 3 and from
`session_words`.

### R20 (Minor) — The try-again message is not kept

The try-again response is `{ result: 'try_again', tries }` (`answers.service.ts:80`) and the web always shows `tryAgainBody`
(`PracticeSession.tsx:273`). After a reload, `current` returns `state: 'try_again'` with no reason (`session-views.ts:42`), so the
session-word message turns back into the spelling message. State the new response field and whether the reason survives a reload.
Likewise, `already-answered` returns `resultOf` (`answers.service.ts:187-190`): the alternative card must be rebuilt from stored data,
not only computed in `answer()`.

### R21 (Minor) — Where the summary shows an alternative

§3.3: "The summary and the history page show it as an alternative answer, with the word typed and the word asked … in the style of the
existing 'you typed {answer}, answer {correct}' lines". The summary has counts and the "Still learning" list only
(`SessionSummary.tsx:105-145`); the "you typed" lines exist in History and the practice home's Recent list (`history-format.ts:9-17`).
Say where on the summary it appears (a third count, a line, or nowhere besides the score).

### R22 (Minor) — Call 5 lists the wrong word after a hint

All three hints are the asked word's (`v___`, `vital`'s definition, `vital`'s Vietnamese meaning). A hint shows Lan needed help with
`vital`, yet call 5 lists `crucial` and leaves `vital` out. Listing the asked word (or both) when `hint_level > 0` matches what the hint
says about her knowledge.

### R23 (Minor) — Call 4: a declared alternative that does not fit is accepted

§6.1 makes it `fail_minor`, but at grading it is accepted and credited: Lan is told she is right for a word that does not fit, the
mirror of `fail_major`. Consider `fail_major`, or state why a false accept is less serious than a false reject.

### R24 (Minor) — Call 11: the message could cover every typed question

The session-word message needs no declaration and "stays true either way" (§3.1). Showing it also on `own_sentence` and Bước 4
`type_word` questions gives one grading path and fewer special cases; the non-goal it cites is about declaring alternatives.

### R25 (Minor) — Keep the API additive

The answer result type is `result: 'correct' | 'wrong'` (`answers.service.ts:19`) and v1 is additive-only (CLAUDE.md, SR7). Say that
`result` stays `'correct'` with an added field (as §10 hints), not a new enum value, so an older web build degrades to today's card.
Note that an old build with Enter = Know would then hit R1, which the server-side refusal in R1 prevents.

### R26 (Minor) — POS filter blind spot

Call 3 keeps different-POS session words from the writer and the judge (which reads `input.session_words`). A cross-POS session
word that fits is then neither avoided nor measured: the judge passes it, and Lan only gets the session-word message. Name this in §11.

### R27 (Minor) — Old frozen versions and the new criterion

§5.1 says old eval examples "stay valid"; true for validation (`eval-examples.service.ts:103`). But the new judge criterion run on an
old version reads an absent `input.session_words` and passes everything. Say to run `session_single_answer` only on the new version
(§7 already says scores are not comparable).

### R28 (Minor) — Two identical button rows

Two "Still learning" and two "Know" buttons on one card need accessible names that include the word, and the result live region
(`PracticeSession.tsx:252-254`) needs an announcement for the alternative result. One line in §3.2.

### R29 (Minor) — Translation and speaker on the card

The mock-up in §3.2 omits the AI translation box (shown today for `vi` learners, `AnswerFeedback.tsx:54-63`) and the speaker button
of the reveal line. Say whether they stay.

## Claims checked and found true

- B1 numbers: 12/14 Haiku and 10/14 Sonnet sentences failed "chỉ một đáp án"
  (`docs/preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md:62`).
- Typed grading uses `matchesAnswer` on `answerKey.accepted`; retries unlimited by default (`answers.service.ts:73-81`;
  `settings.definitions.ts:75`).
- Know shows only when correct, no hint, in learning and due now (`answers.service.ts:164`); `known` is refused when not due
  (`practice-review.service.ts:66-67`); the learning log is keyed by `review_id` = item id (`practice-reviews.service.ts:49`).
- The AI cloze answer key and its first-letter hint (letter only, no length) are built in `ai-question.ts:29-37`, `:52-62`; Bước 7 D9
  says the same.
- `accepted_answers` must be forms of the asked word (`checkCloze`, `ai-checks.ts:28-35`); prompt rule 7 says the same
  (`initial-prompts.ts:30`).
- One rewrite under `#2` when Practice's checks reject, else a failure that falls back to a non-AI question
  (`ai-question-generator.service.ts:156-166`, `failureOf` lines 226-236).
- The judge never runs live; real passes read kept content within `content_retention_days` (default 7), at most `real_judge_limit`
  (default 200) (`real-judge.service.ts:122-168`; `settings.definitions.ts:88-89`).
- The judge input of a real question is the stored `ai_input.data` (`real-judge.service.ts:165`), so `input.session_words` would reach
  it; eval passes send `context: null` (`judge-passes.service.ts:101`); real passes send catalog-only `context.session_words`
  (`real-questions.ts:64-79`, `real-judge.service.ts:76-78`).
- `touchesPrivateWord` is the one check for both judging and copying, and counts an unchosen private MCQ candidate
  (`real-questions.ts:24-38`; used in `real-judge.service.ts:145` and `example-source.service.ts:87`).
- Private wrong options of deleted words stay in other questions (`private-senses-cleanup.provider.ts:41`, comment).
- MCQ wrong options come from deck mates via `practiceGroupMates` (`ai-question-generator.service.ts:211-217`).
- Sessions sources `today`, `all`, `weak`, `priority` mix decks (`sessions/order.ts:6`, `sessions.service.ts:367-381`).
- Prompts and judges are DB revisions with code seeds (`initial-prompts.ts:4-6`, `initial-judges.ts:4-5`); a judge revision needs no
  migration (nhóm B OI-4, `docs/deliveries/nhom-b-open-items.md:36-41`).
- Item `result` is a string with one `sense_id` and one `review_action` (`practice.prisma`, `PracticeSessionItem`).
- Both providers enforce the JSON schema (`anthropic-request.ts:22`, `openai-request.ts:21`), so a live prompt that does not know
  `also_accepted` still returns it once the schema requires it.
- A schema-valid optional `session_words` keeps old eval inputs valid (`eval-examples.service.ts:103`, `generate-cloze.ts:12`), and
  replays are fingerprinted on the stored data, so requests in flight across the change are not affected
  (`runner.service.ts:115`).
- CEFR-J levels: `crucial` B2, `vital` B2, `critical` B1, `enhance` B2, `reluctant` B2
  (`docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv`).
- Feedback strings: "Not quite" (`en.json:1327`) and "Check the spelling and try again. The answer stays hidden." (`en.json:1322`);
  history line "you typed {answer}, answer {correct}" (`en.json:1197`).

## Not verified

- The 100-row draft `golden-set-generate_cloze-100.jsonl` in the worktree `english-learning-ai-guide` (outside this worktree; not
  read). Its 23 B2 words and "mostly concrete or technical nouns" are unchecked.
- Whether the catalog in the database carries the same CEFR-J levels as the CSV (only the CSV was read).
- How often a session holds a private word, or a polysemous word (R6), in real use: no data in the repo.
- Whether the live `generate_cloze` and `generate_sentence_mcq` prompt revisions in the owner's database still match the seeds; R15
  quotes the seed.
- Nothing was run: no tests, no smoke. All findings come from reading code.
