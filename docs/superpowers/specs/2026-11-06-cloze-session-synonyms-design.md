# AI practice questions: synonyms inside a session — design

Date: 06/11/2026; revised 07/11/2026 after an independent review
(`docs/superpowers/reviews/2026-11-06-cloze-session-synonyms-design-review.md`, findings R1–R29; the owner asked for all fixes to be
applied). Status: decisions settled in chat with the owner on 06/11/2026; design approved by the owner on 07/11/2026 ("write plan,
it is totally fine").
Decision record: `docs/superpowers/decisions/2026-11-06-cloze-session-synonyms-decisions.md`.
Written in English because the owner switched the conversation to English on 06/11/2026.

## 1. Why

The judge criterion of nhóm B for `generate_cloze` asks "is the given word the only word that fits the blank?" (`single_answer`,
`apps/api/src/ai/judge/initial-judges.ts`). The only run with real models (B1, 29/10/2026,
`docs/preparation/b1-eval/generate_cloze-2026-10-29-error-analysis.md`) found another fitting word in 12/14 Haiku and 10/14 Sonnet
sentences, and for B2 words almost every sentence has one (`crucial`: `important`, `essential`, `vital`, `critical` all fit
"Sleep is ___ for good health."). A criterion that nearly every sentence fails tells the owner nothing, and the owner could not say
what "serious" meant.

The owner's view, which this design follows: a learner practises a known set of her own words, so the answer to a question is one of
those words. Words from outside that set do not need handling. The real harm is narrower: Lan types another word **from her own
session** that fits the sentence, and the app says "Not quite. Check the spelling and try again."

Example used throughout: Lan's "Health" deck session holds `crucial` and `vital` (adjectives), `habit` and `routine` (nouns).

## 2. Goals, non-goals, anti-goals

Goals:
- G1. A learner who types another word from her current session into a typed question is never told to check her spelling. In an
  AI fill-in question, a word the sentence declares is accepted as an "Alternative answer" (G3); any other session word, in any typed
  question, gets its own try-again message (§3.1).
- G2. The AI writing a fill-in sentence knows the session's other words, with their meanings, and avoids sentences where they fit.
- G3. When avoiding is impossible, the sentence declares which session words also fit, and the app accepts them as an
  "Alternative answer".
- G4. AI multiple-choice-in-a-sentence questions keep exactly one right option out of four, and the writer is told to avoid wrong
  options that are synonyms of the answer (§3.4).
- G5. The judge measures G2–G4, in eval runs on the test set and on real questions.
- G6. The test set covers hard vocabulary (B2–C1 abstract adjectives and verbs) and sessions with near-synonym pairs.

Non-goals:
- Words outside the session: unchanged. Lan typing `important` (not in her session) still gets "Not quite" and a retry, and the
  existing message "Check the spelling and try again. The answer stays hidden." stays as it is (owner, 06/11/2026).
- No synonym dictionary and no synonym marking when a word is added to a deck (rejected: the app has no synonym data).
- Only AI fill-in questions declare alternatives. The non-AI typed questions (Bước 4 `type_word`, and the fill-in built from the
  learner's own saved sentence, `own_sentence`) never give an "Alternative answer"; they do get the session-word message, and the
  own-sentence fill-in gets the new hint format (§3.1).
- `meaning_in_sentence` is unchanged. Translation and level criteria of the judge stay deferred.
- Running eval with real models and labelling is the owner's work after the build, not part of it.

Anti-goals (a build that does these has failed even if it works):
- A learner marked wrong, or told to check her spelling, for typing a word from her own session.
- A word credited as practised when the learner did not type it, or in a meaning she is not learning.
- One habitual key press moving the review schedule of a word the learner did not answer.

## 3. What the learner sees

### 3.1 Typed questions

**Hint.** Hint level 1 becomes the first letter followed by three underscores, whatever the word's length: `c___` (owner: the
length stays hidden, which keeps Bước 7 decision D9; the change is cosmetic). Levels 2 and 3 (English definition, Vietnamese
meaning) are unchanged. The web formats it from the hint's `kind: 'first_letter'`; the API keeps sending the letter alone
(`{ kind: 'first_letter', text: 'c' }`), so stored hints of existing questions, the admin report page and `smoke:buoc-7` stay
unchanged (Claude's call, §11). Every hint step of that kind gets the format (AI fill-in and own-sentence fill-in); a hint stored in
the older `{ first_letter, length }` shape (`LegacyLetters` in `HintPanel.tsx`) is not touched.

**Results.** Sentence about `vital`: "Sleep is ___ for good health." The sentence declares `crucial` as an alternative.

| Lan types | Result | Screen |
|---|---|---|
| `vital` | Right | Today's "Right" screen, unchanged. |
| `crucial` (in her session, declared) | **Alternative answer** | See 3.2. |
| `habit` (in her session, not declared) | Try again | ~~New message: "That's another word from this session. Try again."~~ Only "Not quite", with no line under it (owner, 07/11/2026, after the build). |
| `important` (not in her session) | Try again | Unchanged: "Not quite. Check the spelling and try again. The answer stays hidden." |

**Order of matching a typed answer** (Practice, at grading):
1. It matches this question's accepted answers (`answerKey.accepted`) → Right. This is today's rule, unchanged: for an AI fill-in,
   `accepted` is the `accepted_answers` of **this sentence** (`practice/ai/ai-question.ts`), not every form of the word.
2. AI fill-in only: it matches a declared alternative (`also_accepted`, §5.2) that is a form of a word of the current session →
   Alternative answer.
3. It is a form (`validForms`) of a word of the current session → the session-word message (a try again). Every typed question.
4. Anything else → today's try-again, or today's final wrong.

"The words of the current session" are the session's usable words at grading time (visible, in learning and, for a group session,
still in that group: `usable()` in `practice/sessions/sessions.service.ts`), minus every sense whose lemma is the asked lemma
(compared without case). Their forms are computed at grading, only when step 1 fails; nothing about them is stored when the question
is written (§5.4).

Two cases this order settles:
- A valid form of the asked word that this sentence does not accept (`brushed` in "I ___ my teeth twice a day") is not a session
  word: step 4, today's message.
- A second meaning of the asked lemma (two senses of `fair` in one session) is left out of steps 2–3 and of `session_words`
  (§5.1), so `fairer` typed into the `fair` sentence gets today's message, not "another word from this session".

**The session-word message** (owner, 06/11/2026, D14):
- It is the fallback for a writer that failed to declare a word: in "Running every morning has become a ___ for me." (asked word
  `habit`, `also_accepted: []`), Lan types `routine` and gets this message, not the spelling one. The app cannot accept `routine`,
  because it cannot tell whether a session word fits; the judge counts that sentence as fail_major (§6.1).
- It is shown whether or not the word fits (`habit` typed into the `vital` sentence gets it too). It stays true either way: it says
  the word belongs to her session, not that it fits.
- No credit and no stats: it is a try-again like today's, with other text.
- It covers every word of the current session whatever its part of speech (Claude's call, §11), and only words of the **current**
  session (a reused question, §5.4).
- It shows on every typed question: AI fill-in, own-sentence fill-in and Bước 4 `type_word` (Claude's call, §11). It needs no
  declaration, and one grading path is simpler than three.
- **It does not use up a try** (Claude's call, §11). When an admin caps retries (`type_word_max_retries`, 1–10; unlimited by
  default), a wrong typed answer becomes final once the cap is reached (`answers.service.ts`). A session-word try never does: Lan's
  last allowed try with `habit` stays a try-again. The try is still recorded (`answers_tried`); only the cap ignores it.
- **The reason comes with the try-again reply** (a new field `reason: 'session_word' | null`). After a reload the page behaves as
  today: the web rebuilds no try-again box from the session's `current` view, so it shows the question again with neither this message
  nor the spelling one (corrected 07/11/2026 from the code survey; the first version assumed the web showed the spelling text after a
  reload).
- Exact wording in Vietnamese and English: builder, in the style of the existing feedback lines.

### 3.2 The "Alternative answer" card

Mock-up approved by the owner in chat (06/11/2026); the speaker and the translation box are kept from today's card (review R29):

```
Sleep is ___ for good health.
Your answer: crucial
[Alternative answer]                      ← its own label and colour, not "Right"
Sleep is **vital** for good health.       ← the original sentence, the asked word filled in and highlighted
vital · thiết yếu  [speaker]              ← the asked word's reveal line and speaker, as today
[Translation (AI) …]                      ← as today, for a Vietnamese-speaking learner only
─────────────────────────────
crucial   the word you typed      [Still learning] [Know]
vital     this sentence's word    [Still learning] [Know]
─────────────────────────────
                                   [Next question]
```

- No explanation sentence ("vital fits too…"): the label and the original sentence carry it (owner).
- Each row's Know button follows today's rule for that word on its own: shown only when the answer earned it (no hint used) and that
  word is in learning and due now. A word that is not due has only Still learning. After a hint, neither row has Know.
- Each row acts on its own word only. Lan may press one row, both, or neither. A row's button reviews its word and stays on the card
  (on today's card, Still learning and Know also move to the next question); Next question moves on. Pressing one row leaves the other
  row's buttons available; each row remembers its own pressed state.
- **No result shortcut works on this card** (D7, widened after review R1). Today the page-level key handler
  (`apps/web/src/features/learner/practice/session/PracticeSession.tsx`) maps Enter to the bold button, `1` to Still learning and `2`
  to Know, and the server applies a review to the item's word, which is the asked word. On this card Enter, `1` and `2` do nothing.
  Lan leaves the card by clicking or tapping a button. A button reached with Tab and pressed with Enter or Space still works (D7;
  keyboard-only users need it).
- **The server requires the word** (Claude's call, §11). A review call for an alternative item must name its word (for example
  `sense_id`, one of the item's two words); without it, or with another word, the call is refused with 409 and nothing changes. An
  older web build or a stray shortcut therefore cannot change the asked word by default. A review call for any other item stays as
  today. The learning log is keyed per item **and** word (today it is keyed by the item id, "so pressing twice writes once").
- Accessible names: each row's buttons name their word ("Still learning: crucial"), and the result live region announces
  "Alternative answer" with the asked word's reveal line.
- The card's fields are built from what is stored with the item, so an `already-answered` reply carries them too. After a reload the
  session moves to the next question, as it does today after every result card (`current` never returns an answered item); rows Lan
  did not press are not shown again (corrected 07/11/2026 from the code survey).
- The reply keeps `result: 'correct'` and adds fields for the alternative (the typed word, the two rows). The v1 API stays additive
  (SR7): an older web build shows today's "Right" card, and the 409 above stops its Enter = Know from reaching the asked word.
- The two-row card appears only for an alternative answer. A right answer with the asked word keeps today's card.

### 3.3 Session summary, history and the Recent list

- **Score.** An alternative answer counts in the session's Right count. When the session has any, a short line under the counts says
  how many (for example "including 1 alternative answer"; Claude's call, §11).
- **The summary's review list.** Today it lists a word with a wrong final answer, or a right one after a hint, each keyed by its
  last final item (`listed()` in `practice/reviews/practice-reviews.service.ts`). After an alternative answer without a hint, neither
  word is listed. After a hint, **both** words are listed (Claude's call, §11): the hint was the asked word's, and the typed word's
  right after a hint does not count, as today.
- **Each listed row is per word.** For `crucial`, the alternative item counts as one of its items. A row's review call names its
  word (as on the card, §3.2), its pressed state is that word's own on that item, and "Review all" sends each row's own word with the
  same per-item-and-word log key. Without this, a `crucial` row keyed by the alternative item would move `vital`.
- **History and the practice home's Recent list** show the item in the style of the existing "you typed {answer}, answer {correct}"
  line, with an "Alternative answer" mark (wording: builder, Vietnamese and English). The history of one word (filtered by
  `sense_id`) shows the alternative item under both words (Claude's call, §11).

### 3.4 Multiple choice in a sentence (`generate_sentence_mcq`)

No learner-visible change. Exactly one of the four options fits the blank. The seed prompt's Task steps 2–3 already ask for that
("answer_form, with the meaning in meaning_vi, must be the only choice that fits the blank"; "If a candidate could also make a
correct sentence, do not choose it", `ai/prompts/initial-prompts.ts`). Nothing asks the writer to avoid a candidate that is a
synonym of the answer but does not fit. The wrong options come from Practice's candidates: the learner's deck mates
(`practiceGroupMates`), at most `MCQ_SENTENCE_CANDIDATES_MAX` = 6, of which the writer picks three.

The new MCQ prompt revision adds one rule (Claude's call, §11): "Prefer candidates that are not synonyms or near-synonyms of the
answer." In a deck of near-synonyms the writer may have no other choice; the judge then reports it (§6.2). The MCQ output shape does
not change, so this is an ordinary draft revision the owner enters in the admin (text from the builder), with no seed change.

## 4. Credit and who reads an alternative answer

### 4.1 Credit

Lan answers the `vital` sentence with `crucial`.

| | Asked word (`vital`) | Typed word (`crucial`) |
|---|---|---|
| Weak-word stats and last-practised date (`weak/practice-stats.ts`) | nothing: not an attempt, and its last-practised date does not move | a right answer, and its last-practised date moves (a right answer after a hint does not count, as today) |
| Review schedule | changes only if Lan presses a button in its row | changes only if Lan presses a button in its row |
| Summary review list | listed only after a hint (§3.3) | listed only after a hint (§3.3) |

When the typed form belongs to more than one word of the session (two senses of `critical`, or `found` as a form of both `find` and
`found`), the answer is still an alternative answer, but no word gets the credit and the card shows only the asked word's row
(Claude's call, §11): crediting a meaning Lan may not have meant would break anti-goal 2. This case is rare. The writer declares a
word only in the meaning it was given (§5.1), which covers the case of one session sense with a meaning other than the sentence's.

Why the typed word: credit what the learner showed. If the two words are swapped between their two sentences, both still get one right;
if Lan types `crucial` into both, `crucial` gets two rights and `vital` none, which is true (owner agreed, 06/11/2026). The asked word
comes back in a later session; that is Lan's turn to re-learn it.

### 4.2 Readers of an alternative item

Today every reader below uses the item's one `sense_id` (the asked word). With an alternative item:

| Reader | With an alternative item |
|---|---|
| Weak-word stats and last-practised date (`weak/practice-stats.ts`) | count for the typed word only (§4.1); the `least_practiced` sort (`sessions.service.ts`) follows |
| Review call (`reviews/practice-reviews.service.ts`) | applies to the word the call names (§3.2) |
| Summary list and "Review all" (`listed`, `reviewAll`, same file) | one row per word, each with its own key and pressed state (§3.3) |
| History of one word (`history/history.service.ts`, `sense_id` filter) | the item shows under both words (§3.3) |
| "May this catalog entry be deleted" probe (`practice/entry-usage.probe.ts`, which checks every column holding a sense id) | also checks the column holding the typed word |
| Deleting a private word (`maintenance/private-senses-cleanup.provider.ts`, items by `sense_id`) | also deletes the alternative items that credited it (§5.5) |
| AI quality dashboard (`reports/ai-quality.service.ts`, counts `result = 'correct'`) | counted as correct, as in the session's score (Claude's call, §11) |

## 5. How a sentence is written

### 5.1 Input

`generate_cloze` input gains `session_words`: a list of `{ word, meaning_vi }`, the lemma and the Vietnamese meaning of each other
word of the session (Claude's call, §11; review R6). `meaning_vi` is null for a sense that has none. Which words:
- the session's usable words when the question is written (the same set grading uses, §3.1), not the whole deck;
- only those with the same part of speech as the asked word, plus those that have no part of speech; when the asked word has no part
  of speech, all of them (Claude's call, §11);
- minus every sense of the asked lemma, and with a repeated lemma-and-meaning pair kept once; in session order.

Limits: a session keeps at most `max_questions_per_session` words (`sessions.service.ts` `start`), and that setting allows up to 100
(`settings.definitions.ts`; default 20, with 10 questions by default), so the list holds at most 99 entries; each `word` within
`WORD_MAX` (100) and each meaning within `MEANING_MAX` (300). A lower cap would make an AI fill-in in a large session fail as bad
input. `session_words` is optional with default `[]`, so existing eval examples and frozen test-set versions stay valid.

The generator is started with the session id only (`AiQuestionGenerator.run` receives `{ id, aiStopped }`); building the input reads
the session's words (`practice_sessions.sense_ids`) and their senses.

Sessions are not always one deck: "Words due today", "Weak words", "Priority words" and "All your words" mix decks
(`sessions/order.ts`). The set that matters is always the session's words. The learner's private words are included (D13, §5.5).

### 5.2 Output and the prompt

`generate_cloze` output gains `also_accepted`: the forms of words from `session_words` that also fit the blank, empty when none does.
It is normalized like `accepted_answers` (`dedupeAnswers`), holds at most `ACCEPTED_ANSWERS_MAX` (5) entries of at most
`ACCEPTED_ANSWER_MAX` (100) characters, and an entry that is also an accepted answer is dropped. `accepted_answers` stays as today:
only forms of the asked word (prompt rule 7, `checkCloze`). The field is required in the output schema (both providers enforce the
schema), under a new schema name (`generate_cloze_v1` → `generate_cloze_v2`).

The new prompt tells the writer:
1. Write a sentence where no word in `session_words` fits the blank in the meaning given.
2. Only if that is impossible for this word and meaning, list in `also_accepted` the forms of the session words that fit **with
   their given meaning**. A session word with no meaning: avoid it, never list it.
3. Never list words that are not in `session_words`.

Today's seed rules 2–4 and 7 ("Only this word may fit the blank", "never list other words in accepted_answers", "Do not list other
words, even synonyms") are reworded so they do not contradict these three.

**How it ships** (Claude's call, §11; review R7): as a new seed revision 3 of `generate_cloze` in a new seed migration, following
revision 2's rule (`buoc7_ai_operations` migration, checked by `ai/prompts/initial-prompts.spec.ts`): it replaces the live prompt only
while that is still the untouched seed revision 2 written by the system actor; an admin's own edit is never overwritten. The builder
follows how nhóm B now stores a live revision (config numbers). A fresh database (the smokes, the future production Deploy) then starts
with the new prompt. Where the owner has edited the prompt, the owner makes a draft with the new text (given by the builder) and takes
it through draft → eval → publish.

What the required field breaks, and the fix for each. The output check accepts exactly the declared keys (`define-operation.ts`), and
every prompt example is checked with it on each draft save and test run (`prompt-rules.ts`, `configs.service.ts`):
- the seed examples get `also_accepted: []`: seed revision 3, and `initial-prompts.spec.ts`, which today expects exactly two seed
  migration folders;
- a draft copied from an owner-edited live revision is refused (`shape`) until each example has the field; the refusal names the
  example, and the owner adds `"also_accepted": []`;
- `smoke:nhom-b` saves few-shot examples without the field (`shot()`): it gains the field;
- the fake provider picks its answer by schema name (`generate_cloze_v1` in `ai/adapters/fake/fake.adapter.ts`): it gains the `_v2`
  name and a new scenario (§13).

### 5.3 Practice's checks on the output

- Today's checks stay (`checkCloze`: every accepted answer a valid form of the asked word; the word not shown outside the blank).
- Each `also_accepted` entry must be a valid form (`validForms`) of a word in `session_words`. An entry that is not is dropped and
  logged (`ai_question_rejected`-style log line with reason `unknown-alternative`); the question itself is kept, since a dropped entry
  is a word from outside the session, which needs no handling (§2). It is not recorded in `practice_unknown_forms` (Claude's call,
  §11): it is usually an outside word, which would fill the staff list with noise.
- The eval code rules (`practice/eval-rules/practice-eval-rules.ts`) list a dropped entry as a problem `unknown-alternative:<form>`
  while the status stays `pass` (Claude's call, §11; review R13). Live keeps such a question, so eval must not count it as a rule
  failure, which would feed the publish check's rate-drop warning and refuse a few-shot example on save. A passing `RuleResult` already
  carries a `problems` list (always empty today); this is the first rule that fills it on a pass.
- Session words in a test row are catalog lemmas: the builder drafts them, and real questions with a private word are never copied
  (§5.5). A session word the catalog does not know has no forms in eval, so an entry for it is listed as `unknown-alternative`.

### 5.4 Questions written ahead, and questions older than this change

A question written but never asked can be reused later for the same learner and word (`unseen-questions.ts`), in another session.
Questions written before this change have no `session_words` and no `also_accepted`. Rules:
- Reuse works as today. There is no reuse rule (Claude's call, §11; review R5). The earlier draft reused a question only when the
  current session's words were a subset of those it was written with; that cannot work as placed: the list lives in the AI request's
  input, deleted after 7 days (`AI_REQUEST_RETENTION_DAYS`) while an unseen question is kept up to `history_months` (default 6);
  three places look up unseen questions (the session planner, `prepare`, the slot) and would all need the rule; and every question
  written before the change would be thrown away with its charged unit.
- Grading uses the current session only (§3.1): a declared alternative counts only when it is a form of a word of the current session,
  and the session-word message covers every word of the current session. A reused question is graded as if its writer had failed to
  avoid the new session's words, which the message covers.
- A question written before the change: `also_accepted` counts as empty, and the session-word message still works.

### 5.5 The learner's private words

The learner's private words (words she added herself) in the session are included in `session_words` (owner, 06/11/2026, D13): they
can collide like any other word, and Practice already sends a private word's lemma and meaning to the AI when asking about it.

A question whose `session_words` held a private word counts as touching a private word: it is never judged and never copied into the
test set (nhóm B rule R6). This follows today's rule for multiple choice, where a private candidate sent to the AI keeps the question
out of judging even when it was not chosen as an option (`touchesPrivateWord`, `practice/quality/real-questions.ts`: the one check
used both by the real-question judge pass and by copying into the test set).

**Where the mark lives** (review R11). The input sent to the AI (`practice_ai_requests.ai_input`) is deleted after 7 days, while the
question stays up to `history_months`. So the mark is stored with the question's answer key, as `asked_private` and `option_private`
are today: one flag saying that a session word sent was private, and, for each declared alternative, whether it is a private word's
form. `touchesPrivateWord` reads the flag.

**Report snapshots** (`practice/reports/snapshot.ts`). Staff never see a learner's private word: a declared alternative that is a
private word's form shows as `PRIVATE_WORD_MASK`, as private multiple-choice options do today. The learner's own typed answers in the
snapshot follow today's rule.

**Deleting a private word** (review R11). When Lan deletes one of her own words, `deleteForSenses` removes what Practice keeps about
it, inside the deletion transaction. It also deletes every alternative item that credited that word (Claude's call, §11): the item
belongs to the asked word, but its credit and its typed text are the deleted word's. Those items are locked in the same order as
today's items. In the reverse case (the asked word is private, the typed word is a catalog word), the item goes with the asked word as
today, and the catalog word loses that one right answer; accepted, rare. A deleted word's form listed as a declared alternative in her
other questions stays there (only she sees it, and it is masked for staff), the same as private wrong options today.

Consequence: real-question judge passes see fewer questions, since any AI fill-in question of a session holding one of her own words
is skipped. Eval runs still measure the behaviour on catalog words, and the writer handles a private word the same way.

## 6. Judge

Judges are database rows edited in the admin "Judge" page; the owner enters the new texts (written by the builder, in an appendix of
the plan), with no migration (nhóm B OI-4). A judge lists the operations it scores; its criteria belong to a revision, and a pass
sends every criterion of the revision for every question (`ai/judge/judge-job.ts`). The seeded judge "Chỉ một đáp án" scores
`generate_cloze` only, with `single_answer` (`initial-judges.ts`); its seed does not change.

### 6.1 Fill-in: `session_single_answer` (replaces `single_answer`)

A new revision of "Chỉ một đáp án" with this criterion in place of `single_answer`.

Question: "Apart from accepted_answers and also_accepted, does no word in input.session_words fit the blank in its given meaning, and
does every word in also_accepted fit?"

| Verdict | When | Example (Lan's session; sentence about `habit`) |
|---|---|---|
| pass | no other session word fits, and every declared word fits | "Biting your nails is a bad ___." |
| fail_minor | another session word fits, and `also_accepted` lists it | "Running every morning has become a ___ for me." with `also_accepted: [routine]` |
| fail_major | another session word fits, and `also_accepted` does not list it | the same sentence with `also_accepted: []`: Lan types `routine` and gets only the session-word message (§3.1), not an accepted answer |
| fail_major | a word in `also_accepted` does not fit the blank (Claude's call, §11; review R23) | Lan is told her answer is right, and is credited, for a word that does not fit |

- Words outside `session_words` are ignored (owner). `single_answer`, which counted common outside words as serious, is retired.
- The judge reads `input.session_words` (what the writer was given), in eval runs and on real questions alike. The real-question
  `context.session_words` (`real-questions.ts`) stays as it is.
- The revision's instructions are rewritten with it: the input now has `session_words` (word and meaning), the output has
  `also_accepted`, and the seed's rule "fail_major … when a word in context.session_words fits the blank" goes, since eval passes send
  `context: null` and the two would measure differently.

### 6.2 Multiple choice: `single_correct_option` (a new judge)

A second judge (name: builder) that scores `generate_sentence_mcq` only. It cannot be a revision of "Chỉ một đáp án": that judge
would then have to score both operations, and every criterion of a revision is applied to every question, so the fill-in criterion
would score multiple-choice outputs and the other way round.

Question: "Does exactly one option fit the blank, with no option a synonym of the answer?"

| Verdict | When |
|---|---|
| pass | only the answer fits, and no wrong option is a synonym of it |
| fail_major | a wrong option also fits the blank: a learner choosing it is marked wrong |
| fail_minor | a wrong option is a synonym of the answer but does not fit the blank (Claude's call, §11) |

### 6.3 Running the judge after the change

- New criterion codes start with no labels, so calibration (`judge_label_min` 30 labels, `judge_agreement_min` 0.85) starts again for
  both criteria.
- Real questions written before the change have no `input.session_words`, so the criterion would pass them by default. Real-question
  passes with `session_single_answer` are started with the config filter set to the new prompt's config number (passes already filter
  by config, `practice/quality/real-judge.service.ts`).
- Eval: `session_single_answer` is run only on the new test-set version (§7); older versions have no `session_words`.

## 7. Test set

The test set is the fixed list of sample inputs the writer runs on before a prompt or model changes, graded by the judge.
- Every `generate_cloze` sample gets a `session_words` list, with meanings. About half include a near-synonym of the asked word (for
  `crucial`: `vital`), about half include none (D12).
- The result is read from the run's judge verdict counts per criterion (pass / fail_minor / fail_major), which include held-out rows
  as numbers (`judge_stats` of a run). Failures can only come from a row whose session words include one that fits; the half-and-half
  mix makes sure such rows exist. The two halves are not read separately (Claude's call, §11; review R14): a run never shows the
  notes, inputs or outputs of held-out rows (30% by default), so a split by a tag in the note could not be read. Rows may still start
  their note with `pair:` or `no-pair:` for people reading dev rows.
- Multiple choice gets the same treatment: the builder drafts `generate_sentence_mcq` rows whose `candidates` include a near-synonym
  of the answer, so `single_correct_option` can fail in an eval run (Claude's call, §11). Without such rows G4 is only measured on
  real questions.
- Add hard vocabulary: at least 15 B2–C1 abstract adjectives and verbs where synonyms are common (`crucial`, `enhance`, `reluctant`,
  …), with their near-synonym partners. Levels come from the catalog (CEFR-J; e.g. `crucial` B2, `vital` B2, `critical` B1).
- The current 100-row draft (`golden-set-generate_cloze-100.jsonl`, uncommitted, in the worktree `english-learning-ai-guide`) has 23
  B2 words, mostly concrete or technical nouns (`database`, `merger`); it is the starting point. Not checked from this worktree.
- A test set with these rows is a new version; its scores are not comparable with earlier versions.
- The builder drafts the rows; the owner reviews them before freezing.

## 8. Acceptance criteria (When → Then)

Lan's session: `crucial`, `vital` (adjectives), `habit`, `routine` (nouns). "The `vital` sentence" is "Sleep is ___ for good health."
with `accepted_answers: [vital]` and `also_accepted: [crucial]`.

| # | Criterion | Cites |
|---|---|---|
| CS1 | When Lan types `vital` into the `vital` sentence, then she gets Right and today's card. | §3.1 |
| CS2 | When Lan types `crucial` into the `vital` sentence, then she gets the "Alternative answer" card with a `crucial` row and a `vital` row, `crucial` gets a right answer in its stats and `vital` gets nothing. | D3–D6, §4.1 |
| CS3 | When Lan types `habit` into the `vital` sentence, then she gets a try-again that says only "Not quite" (no spelling line; owner, 07/11/2026, replaced "That's another word from this session. Try again.") and no word gets credit. | D14 |
| CS4 | When Lan types `important` into the `vital` sentence, then she gets today's "Not quite. Check the spelling and try again." | D1, D10 |
| CS5 | When Lan presses Enter, `1` or `2` on the alternative card, then nothing changes and the card stays. | D7, R1 |
| CS6 | When Lan presses Know in the `crucial` row, then only `crucial`'s schedule changes and the `vital` row's buttons stay available. | D6 |
| CS7 | When a review call for an alternative item names no word, or a word that is not one of its two, then it is refused with 409 and nothing changes. | R1 |
| CS8 | When Lan used a hint, typed `crucial` into the `vital` sentence and presses Still learning in the summary's `crucial` row, then `crucial` gets priority and `vital` is unchanged. | R2 |
| CS9 | When a session ends with one alternative answer given without a hint, then neither word is on the summary's review list, and the Right count includes it with a line saying one was an alternative answer. | §3.3 |
| CS10 | When a fill-in question is written for `habit` in Lan's session, then its input holds `session_words` = `routine` with its meaning, and not `crucial` or `vital`. | §5.1 |
| CS11 | When the writer declares `important` for the `vital` sentence, then the entry is dropped and logged and the question is kept; in an eval run the rule result is `pass` with the problem `unknown-alternative:important`. | §5.3 |
| CS12 | When an admin caps retries at 3 and Lan's third try is `habit`, then she still gets the session-word try-again, not a final wrong. | R9 |
| CS13 | When Lan reloads the page after a session-word try, then the question shows again with no try-again box, as today, and neither the session-word nor the spelling message. | R20 |
| CS14 | When Lan reloads the page on the alternative card, then the session moves to the next question, as today after any result card. | R20 |
| CS15 | When a fill-in question whose session words held one of Lan's private words is in a real-question judge pass or is chosen for "Đưa vào bộ ví dụ", then it is skipped or refused (`private-word`), also after its AI request was cleaned up. | D13, R11 |
| CS16 | When staff open a report of a question whose `also_accepted` holds a form of Lan's private word, then that entry shows as the private-word mask. | R11 |
| CS17 | When the fill-in judge scores the `habit` sentence about running, then it gives fail_major with `also_accepted: []`, fail_minor with `[routine]`, and fail_major when `also_accepted` holds a session word that does not fit. | D11, §6.1 |
| CS18 | When an admin starts a pass of the fill-in judge on `generate_sentence_mcq`, then it is refused, and the new multiple-choice judge accepts it. | §6.2 |
| CS19 | When Lan types `habit` into a Bước 4 "type the word" question or an own-sentence fill-in about `vital`, then she gets the session-word message. | §3.1 |
| CS20 | When Lan opens hint level 1 on an AI fill-in about `crucial`, then she sees `c___`, and the API still returns `{ kind: 'first_letter', text: 'c' }`. | D9, §3.1 |

## 9. Edge cases

| # | Edge case | Expected | Cites |
|---|---|---|---|
| CSE1 | A question written ahead in one session is reused in another | Graded against the current session; its declared alternatives count only for words of the current session | §5.4 |
| CSE2 | A question written before this change | `also_accepted` counts as empty; the session-word message works | §5.4 |
| CSE3 | The typed form belongs to two session words (`found` of `find` and `found`; two senses of `critical`) | Alternative answer, no credit, only the asked word's row | §4.1 |
| CSE4 | Two senses of the asked lemma in the session (`fair`) | The other sense is not a session word; `fairer` gets today's message | §3.1, R19 |
| CSE5 | A valid form of the asked word that this sentence does not accept (`brushed`) | Today's message (step 4) | §3.1, R3 |
| CSE6 | A session word with no Vietnamese meaning | Sent with `meaning_vi: null`; the writer avoids it and never declares it; the session-word message covers it | §5.1 |
| CSE7 | A session word deleted, hidden or taken out of the group during the session | Not a session word any more (usable set at grading); a declared alternative for it counts as an outside word | §3.1 |
| CSE8 | Lan deletes her private word `crucial` after typing it into the `vital` sentence | The alternative item is deleted with it | §5.5 |
| CSE9 | Lan deletes her private asked word after typing a catalog word as an alternative | The item is deleted with the asked word; the catalog word loses that right answer | §5.5 |
| CSE10 | A hint was used before an alternative answer | Neither row has Know; both words are on the summary's review list; the typed word's right does not count in weak-word stats | §3.2, §3.3 |
| CSE11 | The session ends, or is closed as idle, while the alternative card is open | Rows Lan did not press stay unpressed; the summary follows §3.3 | §3.3 |
| CSE12 | A web build from before this change answers an alternative item | It shows today's "Right" card; its Enter = Know is refused with 409 | §3.2, R25 |
| CSE13 | An admin raises the session size to 100 words | Up to 99 session words are sent; no `bad-input` | §5.1, R8 |
| CSE14 | The two rows are pressed in two requests at once; one row is pressed twice | Each word's review is written once (key per item and word) | §3.2 |
| CSE15 | An eval on a test-set version frozen before this change | `session_single_answer` is not run on it | §6.3 |
| CSE16 | A real-question pass over the 7 days that straddle the change | Filtered by the new prompt's config number; older questions are not scored by the new criterion | §6.3 |
| CSE17 | The writer lists an accepted answer again in `also_accepted` | The entry is dropped (it is the asked word) | §5.2 |
| CSE18 | The owner saves a draft copied from an edited live prompt whose examples lack `also_accepted` | Refused; the problem `shape` names the example | §5.2, R7 |
| CSE19 | A Bước 4 or own-sentence question in a session of one word | No session words; today's behaviour | §3.1 |

## 10. Constraints and facts the build relies on

- Grading of typed answers: `practice/answers/answers.service.ts` (`matchesAnswer` on `answerKey.accepted`; a wrong typed answer is
  a try-again while `maxRetries === null || tries < maxRetries`, else final). The answer key of an AI fill-in is built in
  `practice/ai/ai-question.ts`; its `accepted` is that sentence's `accepted_answers`, a subset of the word's forms (`validForms`,
  `practice/ai/ai-checks.ts`).
- `practice_session_items.result` is a string (`correct` / `wrong` / `void`); the item has one `sense_id` and one `review_action`.
- Review buttons: `practice-reviews.service.ts` → `learning.practiceReview` with the item's `sense_id` and `reviewId` = the item id;
  `known` is refused when the word was not due.
- Result shortcuts: the key handler in `PracticeSession.tsx` (Enter, `1`, `2`); `AnswerFeedback.tsx` draws the buttons. Hint display:
  `HintPanel.tsx` shows the API's `first_letter` text, today just the letter.
- Gateway input is a strict object (`ai/operations/generate-cloze.ts`); the output must hold exactly the declared keys
  (`define-operation.ts`); prompt examples are checked on each save. Inputs are built in `practice/ai/ai-inputs.ts` ("learning content
  only, never the learner's id, name or sentences").
- Prompts and judge texts live in the database as revisions edited in the admin; code holds only their seeds.
- The judge never runs between the writer and the learner. Live, only Practice's code checks run (one rewrite when they reject the
  first answer, else a non-AI question; `ai-question-generator.service.ts`). Real questions are judged only when an admin starts a
  pass over the content kept (default 7 days, at most `real_judge_limit` = 200; `real-judge.service.ts`). This is why the
  session-word message (§3.1) is the only guard Lan sees.
- Questions that touch a private word are skipped by one function, `touchesPrivateWord` (`real-judge.service.ts`,
  `example-source.service.ts`); the stored fill-in input has no scope per word today.
- AI requests and their input are deleted after 7 days (`AI_REQUEST_RETENTION_DAYS`); unseen questions are kept up to
  `history_months` (default 6).
- A session keeps at most `max_questions_per_session` words (at most 100).
- The v1 API is additive only (SR7).
- Smokes that run the fake provider keep passing (§13). `smoke:buoc-7` already types a group mate into an AI fill-in and expects
  `try_again` without `correct`; its session holds one word, so the reply now carries `reason: null` there.
- Repo rules: tests first (red before green), Conventional Commits, PRs into `dev`.

## 11. Calls made by Claude (the owner may override)

The owner's decisions D1–D14 are not in this list. Calls changed or added after the independent review name the finding (R#).

1. An `also_accepted` entry that is not a form of a session word is dropped and logged; the question is kept; it is not recorded as an
   unknown form (§5.3).
2. In eval, a dropped entry is a problem on a passing rule result, not a rule failure (R13, §5.3).
3. Only words of the same part of speech go into `session_words` (§5.1).
4. Session words carry their Vietnamese meaning; a word with none is avoided and never declared (R6, §5.1).
5. No reuse rule for questions written ahead; grading uses the current session (R5, §5.4). Replaces the earlier subset rule.
6. A declared alternative that does not fit: fail_major (R23; was fail_minor). A synonym wrong option that does not fit: fail_minor
   (§6).
7. After an alternative answer, the summary lists neither word without a hint and both after a hint (R22; was "the asked word is not
   listed").
8. The judge reads `input.session_words`, so eval runs need no separate session context (§6.1).
9. A typed form that belongs to more than one session word: alternative answer, no credit, only the asked word's row (§4.1).
10. The test set's two halves are not read separately; the run's verdict counts are read (R14, §7). Replaces the note-tag split.
11. The builder also drafts multiple-choice test rows with near-synonym candidates (§7).
12. The session-word message covers every word of the current session, whatever its part of speech (§3.1): otherwise `habit` (a noun)
    typed into the `vital` sentence would still get the spelling message.
13. The session-word message shows on every typed question, not only AI fill-in (R24, §3.1).
14. A session-word try does not use up a try under a retry cap (R9, §3.1).
15. Every result shortcut is off on the alternative card, and the server refuses a review of an alternative item that does not name
    its word (R1, §3.2).
16. The `c___` hint is formatted in the web from the hint kind (R18, §3.1).
17. The new `generate_cloze` prompt ships as seed revision 3, replacing only an untouched seed revision 2 (R7, §5.2).
18. The multiple-choice prompt gains a rule to prefer wrong options that are not synonyms (R15, §3.4).
19. The AI quality dashboard counts an alternative answer as correct (R10, §4.2).
20. A word's history shows an alternative item under both words (R10, §3.3).
21. Deleting a private word also deletes the alternative items that credited it (R11, §5.5).
22. The session-word reason comes only with the try-again reply; after a reload neither the message nor the card is shown again, as
    today (R20, §3.1, §3.2). Corrected 07/11/2026: the first version made both survive a reload, assuming today's web rebuilt a
    try-again after one; it does not, and `current` never returns an answered item.
23. The summary says how many right answers were alternative answers (R21, §3.3).

## 12. Left to the builder

Storage of the alternative result (for example `result = 'correct'` plus a typed-word column and a second review action); the API
field names of the alternative result, its two rows and the try-again reason; how the per-item-and-word review key is formed; how the
private marks are stored in the answer key (§5.5); the exact prompt and judge texts within §3.4, §5.2 and §6 (in an appendix of the
plan, for the owner to enter); the wording of the message, the summary line and the history line in Vietnamese and English; the test
rows; the name of the multiple-choice judge; and the milestone split.

## 13. Done when (Xong khi)

- CI green on every PR.
- Unit tests of pure functions, boundaries first: the four matching steps; the asked lemma left out; a form of two session words; an
  empty session list; a question older than the change; a retry cap at its edge (last allowed try); the private marks and
  `touchesPrivateWord`; the choice of `session_words` (same part of speech, no part of speech, repeats, 99 entries); `also_accepted`
  normalization and limits.
- Web behavioural tests by role and visible text: the alternative card and its two rows; Enter, `1` and `2` doing nothing there; a
  button reached with Tab and pressed with Enter working; the card and the session-word message after a reload; the `c___` hint.
- A smoke on a fresh database (an extended `smoke:buoc-7` or a new one) with a new fake scenario, for example `fake:alternative`,
  which copies the first `session_words` entry into `also_accepted`. It writes a fill-in in a session with two words of the same part
  of speech and checks: the input carries `session_words` with meanings; answering with the declared word gives an alternative result
  with `result: 'correct'`; a review without a word is refused with 409; each row's review changes only its word; weak-word stats credit
  the typed word; the summary's rows after a hint; a session-word try under a retry cap; the reload view. Output saved under
  `docs/deliveries/`.
- The existing smokes still pass: `smoke:buoc-4` (type-the-word grading now has the session-word step), `smoke:buoc-7` and
  `smoke:nhom-b` (its few-shot examples updated).
- Not part of done: the owner's eval with real models, and labelling.

## 14. Risks and what is not verified

- Nobody has measured whether a model can avoid session words or declare them reliably, or keeps to the meanings given; that is what
  the eval with real models must show after the build.
- The evidence so far is 14 sentences (B1), labelled by Claude, with a prompt whose example was misaligned.
- The judge and the writer are both Anthropic models and may miss the same words.
- Real-question judge passes skip every AI fill-in question of a session holding a private word (§5.5); how large that share is has
  not been measured, so real-question scores may cover fewer questions than today.
- The session-word message shows Lan the writer's failure without fixing it: she still has to find the asked word.
- Blind spot of the part-of-speech filter (R26): a session word of another part of speech is not sent to the writer nor seen by the
  judge, so if it fits it is neither avoided nor measured; Lan only gets the session-word message.
- Seed revision 3 goes live on a fresh or untouched database without an eval run, as revision 2 did. Whether the owner's own database
  still holds the untouched revision 2 has not been checked.
- Calibration of both new criteria starts from zero labels (§6.3).
- Not checked from this worktree: the 100-row draft test set, and whether the catalog in the database carries the CEFR-J levels of
  the repo's CSV.
