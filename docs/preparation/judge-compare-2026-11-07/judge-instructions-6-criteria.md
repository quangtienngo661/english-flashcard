# Judge text with 6 criteria, no level check (test variant of 10/11/2026)

Revision of [judge-instructions-7-criteria-think.md](judge-instructions-7-criteria-think.md) after the 20-word test
([draft-2-test-20-words-2026-11-10.txt](draft-2-test-20-words-2026-11-10.txt)). For tests with
[terra-write-judge.mjs](terra-write-judge.mjs) (`--judge-text judge-instructions-6-criteria.md`); not in the app.

Changes:

- **level_fit removed** (owner, 10/11/2026: level is not a criterion for judging). Its verdicts were mostly guesses about common words.
- **single_answer back on the v2 wording** ([judge-instructions-v2.md](judge-instructions-v2.md)): find at least three candidates and
  judge each; a common word a learner at the level or below knows is major even when the given word is the more usual phrase; a pass
  names the closest candidate. The four worked examples come from v2; none of their words is a test word. Session words stay with
  session_single_answer. The level is still used here, only to decide which competing words a learner knows.
- **enough_clue:** a clue about letters, spelling, length or sound is major (the 7-criteria text passed all four such sentences).
- **grammar_natural:** another form of the word that fits and is not listed is major (the 7-criteria text missed "worked" for work); a
  listed form that does not fit is minor. Its example word (live) is not a test word.
- "Think the problem through before you answer." stays at the end.

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
    "question": "Can a learner who knows meaning_vi work out the word from the meaning of the rest of the sentence?"
  },
  {
    "code": "grammar_natural",
    "question": "With an accepted answer in the blank, is the sentence correct, natural English, and does accepted_answers list every form of the word that fits the blank and no form that does not?"
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

Criterion single_answer. Work in two steps.
1. Find candidates. Read the whole sentence with the blank. List at least three English words a learner might write there instead: synonyms of the word, more general words, and words that fit the sentence's grammar and clues. Ignore the forms in accepted_answers, the words in also_accepted and the words in input.session_words; session_single_answer covers them.
2. Judge each candidate. A candidate fits when the completed sentence is natural English and keeps the meaning in meaning_vi.
- fail_major when a fitting candidate is a common word that a learner at the given level or below knows (most A1 to B1 words). This holds even when the given word is the more usual collocation: the learner who writes the common word is marked wrong.
- fail_minor when every fitting candidate is rare, formal, regional or a close variant of the word (for example "though" for "although").
- pass when no candidate fits.
Examples:
- word "begin" (A2, bắt đầu): "The concert will ___ at eight o'clock, so please arrive early." → fail_major: "start" fits and is a common A1 word.
- word "cook" (A1, nấu): "I usually ___ dinner for my family on Sundays." → fail_major: "make" fits and is a common A1 word, even though "cook dinner" is the usual phrase.
- word "although" (B1, mặc dù): "___ it was raining, we went for a walk." → fail_minor: only the close variants "though" and "even though" fit.
- word "thirsty" (A1, khát): "After the long run I was very ___, so I drank two glasses of water." → pass: the closest candidate, "hot", is natural but means "nóng", not "khát".
For a fail, name the word that fits in the reason. For a pass, name the closest candidate you tried and why it does not fit.

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
