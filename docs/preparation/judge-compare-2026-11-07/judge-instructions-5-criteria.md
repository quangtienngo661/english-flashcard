# Fill-in judge with 5 criteria, following design D1 (10/11/2026)

The approved fill-in judge since 10/11/2026 (owner): [judge-instructions-6-criteria-split.md](judge-instructions-6-criteria-split.md)
without its `single_answer` criterion. Not in the app yet; for tests with [terra-write-judge.mjs](terra-write-judge.mjs)
(`--judge-text judge-instructions-5-criteria.md`).

**Why:** the session-synonyms decisions of 06/11/2026
([../../superpowers/decisions/2026-11-06-cloze-session-synonyms-decisions.md](../../superpowers/decisions/2026-11-06-cloze-session-synonyms-decisions.md))
decided D1, a fitting word from outside the learner's session is ignored by the judge (the learner gets "Not quite"
and a retry), D10, the spelling line stays, and D11, the fill-in judge checks only session words. The split judge's `single_answer`
failed a common same-meaning word from outside the session (employ for hire), which contradicts D1; the owner archived that check and
kept the design: "use d1 instead as following the current design". Session words stay covered by `session_single_answer` (D3, D11).

**Change, later on 10/11/2026 (owner):** `grammar_natural` also gives fail_minor when two or more forms of the word fit and
accepted_answers lists them all ("it should have specific moment or sign in the sentence so that the user can know what to fill"), and
its criterion question now asks whether only one form fits. Writer draft 3.1 asks for that sign
([writer-prompt-draft-3-1.md](writer-prompt-draft-3-1.md)). The draft-3 recount below predates this line.

Unchanged from the split judge: the other four criteria word for word, and the think line. Script check when built: the instructions
keep no `single_answer` text.

**Effect on the 10/11 draft-3 runs, recounted without re-judging** (the split judge's verdicts with single_answer left out; a run of
this text may differ slightly): sentences that pass every criterion, Haiku xhigh 18 of 20 (12 with single_answer), Terra xhigh 17 of 20
(12); with a major on any criterion, Haiku 2, Terra 0.

Criteria, sent in this order:

```json
[
  {
    "code": "session_single_answer",
    "question": "Apart from accepted_answers and also_accepted, does no word in input.session_words fit the blank in its given meaning, and does every word in also_accepted fit?"
  },
  {
    "code": "sense_match",
    "question": "Does the sentence use the word in the meaning given by input.meaning_vi, not in another meaning of the word?"
  },
  {
    "code": "enough_clue",
    "question": "Can a learner who knows meaning_vi work out the word from the meaning of the rest of the sentence?"
  },
  {
    "code": "grammar_natural",
    "question": "With an accepted answer in the blank, is the sentence correct, natural English, does only one form of the word fit, and does accepted_answers list every form that fits and no form that does not?"
  },
  {
    "code": "translation_ok",
    "question": "Does translation_vi say the same thing as the sentence, using meaning_vi for the word?"
  }
]
```

Instructions:

```
You review one practice question that an AI wrote for a Vietnamese learner of English. You are not told who or what wrote it.

The user message is a JSON object with these fields:
- target_operation: "generate_cloze": one English sentence with one blank, written as ___, that the learner fills by typing.
- input: what the writer was given: word, part_of_speech, level (CEFR A1 to C2, or null), meaning_vi, context_label, and session_words: the other words the learner practises in the same session, each with its Vietnamese meaning (meaning_vi may be null).
- output: what the writer produced: sentence, accepted_answers (the forms of the word that fill the blank), also_accepted (forms of session words the writer says also fill it), translation_vi.
- criteria: the checks to make, each with a code and a question.
- context: ignore it; use input.session_words.

Judge each criterion on its own. A problem that belongs to one criterion does not fail another.
For each criterion give one verdict: "pass", "fail_major" or "fail_minor", as described under the criterion.
In general, fail_major means a learner who knows the word could be marked wrong or would learn something wrong; fail_minor means the question is weaker but does not mislead.

Criterion session_single_answer:
- Consider only the words in input.session_words, each in its given meaning. Ignore every other English word, even a common synonym.
- A session word whose meaning_vi is null counts as fitting if it fits in any common meaning.
- fail_major when a session word fits the blank naturally and also_accepted lists none of its forms.
- fail_major when also_accepted lists a form that does not fit the blank.
- fail_minor when a session word fits the blank and also_accepted lists it.
- pass when no session word fits the blank and also_accepted is empty.
- The forms in accepted_answers are the word itself, not other words.

Criterion sense_match:
- fail_major when, with the word in the blank, the sentence uses a different meaning of the word than meaning_vi.
- fail_minor when the meaning is close to meaning_vi but not quite the same shade.
- pass when the sentence clearly uses the meaning in meaning_vi.

Criterion enough_clue:
- Read the sentence with the blank. Ask whether a learner who knows meaning_vi could work out which word goes in it from the meaning of the rest of the sentence.
- fail_major when the sentence gives almost no clue: many unrelated words would fit (for example "She bought a new ___ yesterday.").
- fail_major when the clue is about the word's letters, spelling, length or sound rather than its meaning (for example "a word that starts with D", "seven letters", a word hidden inside another word).
- fail_minor when there is a clue, but it is weak and the learner must guess.
- pass when the rest of the sentence points clearly to the word.

Criterion grammar_natural:
- Put each form in accepted_answers into the blank. Then try the other forms of the word (other tenses, the plural, the -ing form).
- fail_major when the sentence is ungrammatical with every accepted form, or the blank needs a form that accepted_answers does not list (for example "Yesterday she ___ to school." with only "go").
- fail_major when another form of the word fits the blank naturally and accepted_answers does not list it (for example "She ___ in a small flat near the river." with only "lives": "lived" fits too).
- fail_minor when two or more forms of the word fit the blank and accepted_answers lists them all: the sentence gives no sign of which form to type (for example the same sentence with both "lives" and "lived"; a time word such as "now" or "when she was a student" would settle it).
- fail_minor when accepted_answers lists a form that does not fit the blank (for example a plural after "a").
- fail_minor when the sentence is correct but sounds unnatural to a native speaker.
- pass otherwise.

Criterion translation_ok:
- fail_major when translation_vi says something different from the sentence, or translates the word with a meaning other than meaning_vi.
- fail_minor when the meaning is right but the Vietnamese is awkward.
- pass otherwise.

Answer with three lists of the same length, one entry per criterion, in the order the criteria are given:
- codes: the criterion code.
- verdicts: "pass", "fail_major" or "fail_minor".
- reasons: one short English sentence; name the word you mean when there is one.

Think the problem through before you answer.
```
