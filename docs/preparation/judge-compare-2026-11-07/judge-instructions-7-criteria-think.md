# Judge text with 7 criteria, asking Sonnet to think (test variant of 10/11/2026)

Copied unchanged from `docs/preparation/JUDGE_CRITERIA_PROPOSAL_2026-11-10.md` section 7 in the main checkout (owner decisions Q1-Q3 of
10/11/2026: all seven criteria in one judge; a word one level above input.level is fail_minor, two levels fail_major). For tests with
[terra-write-judge.mjs](terra-write-judge.mjs) (`--judge-text judge-instructions-7-criteria.md`); not in the app.

Same as [judge-instructions-7-criteria.md](judge-instructions-7-criteria.md) plus one last line, "Think the problem through before you answer.",
which the 07/11 guidance doc gives (from Anthropic's Sonnet 5.5 prompting page) for JSON answers that need working out. It sits at the
end of the instructions, before the app's fixed guard line, since a judge revision can only change the instructions.

Criteria, sent in this order:

```json
[
  {
    "code": "single_answer",
    "question": "Apart from accepted_answers, also_accepted and input.session_words, is the given word the only common word that fits the blank?"
  },
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
    "question": "Can a learner who knows meaning_vi work out the word from the rest of the sentence?"
  },
  {
    "code": "grammar_natural",
    "question": "With an accepted answer in the blank, is the sentence correct, natural English, and does the blank need exactly that form?"
  },
  {
    "code": "level_fit",
    "question": "Are the other words and the sentence length suitable for a learner at input.level?"
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

Criterion single_answer:
- Ignore the forms in accepted_answers, the words in also_accepted and the words in input.session_words; session_single_answer covers them.
- fail_major when another common word at the given level fits the blank naturally with the same meaning.
- fail_minor when the only other words that fit are rare synonyms or close variants of the word (for example "though" for "although").
- pass otherwise.

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
- Read the sentence with the blank. Ask whether a learner who knows meaning_vi could work out which word goes in it.
- fail_major when the sentence gives almost no clue: many unrelated words would fit (for example "She bought a new ___ yesterday.").
- fail_minor when there is a clue, but it is weak and the learner must guess.
- pass when the rest of the sentence points clearly to the word.

Criterion grammar_natural:
- Put each form in accepted_answers into the blank.
- fail_major when the sentence is ungrammatical with every accepted form, or the blank needs a form that accepted_answers does not list (for example "Yesterday she ___ to school." with only "go").
- fail_minor when the sentence is correct but sounds unnatural to a native speaker.
- pass otherwise.

Criterion level_fit:
- Compare every word of the sentence except the blank with input.level, using your best knowledge of CEFR levels. If level is null, give pass.
- fail_major when a word is two or more levels above input.level (for example a B2 word in an A2 sentence).
- fail_minor when a word is one level above input.level, or the sentence is long for the level.
- pass otherwise.
- Name the word in the reason.

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
