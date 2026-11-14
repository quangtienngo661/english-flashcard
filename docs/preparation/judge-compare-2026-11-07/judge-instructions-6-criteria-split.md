# Judge text with 6 criteria, single_answer split by meaning (test variant of 10/11/2026)

> **Archived 10/11/2026 (owner).** Its `single_answer` check contradicted decision D1 of the session-synonyms design (a word from outside
> the learner's session is ignored by the judge). The approved fill-in judge is now
> [judge-instructions-5-criteria.md](judge-instructions-5-criteria.md): this text without `single_answer`. Kept as the record of the
> 10/11 tests and of the owner's labelling.

Revision of [judge-instructions-6-criteria.md](judge-instructions-6-criteria.md). For tests with
[terra-write-judge.mjs](terra-write-judge.mjs) (`--judge-text judge-instructions-6-criteria-split.md`); not in the app.

**Why:** the owner hand-labelled 37 sentences ([owner-labels-2026-11-10.json](owner-labels-2026-11-10.json)) and passed most of the
sentences the 6-criteria judge failed ([owner-labels-vs-judges-2026-11-10.txt](owner-labels-vs-judges-2026-11-10.txt)). Asked about
"Mum put the dirty socks in the machine to ___ them." (wash), the owner said "clean" is not a correct answer there. Owner decision,
10/11/2026: single_answer counts only a word with the same meaning as meaning_vi; a more general word that fits passes.

**Same-meaning words stay major** (owner, 10/11/2026, after the run on 40 sentences: 23 of 37 verdicts matched the owner, and the 5
majors on owner passes were all same-meaning words: employ for hire twice, neat for tidy, decorate for garnish, piece for slice). Why: a
learner who types such a word sees "Chưa đúng" and "Kiểm tra chính tả rồi gõ lại." (`apps/web/messages/vi.json`, `tryAgainBody`),
which is wrong for a correctly spelt word with the same meaning; the owner removed that line for session words on 07/11 for the same
reason. A right answer on the retry still counts as right. The other way, the writer listing synonyms and the app accepting them like
session words, needs API and schema work and was not chosen.

**What the app does with such a word** (code read 10/11/2026): an AI fill-in question shows only the sentence; hints come on request,
first letter, then the English definition, then the Vietnamese meaning (`apps/api/src/practice/ai/ai-question.ts`, `clozeHints`). A
wrong typed answer gets "try again" while `practice.type_word_max_retries` allows it, and that setting is unset by default, so
unlimited (`apps/api/src/settings/settings.definitions.ts`, `answers.service.ts`). A learner who types a more general word loses a try,
not the question, unless an admin sets a retry cap.

**Wording fix after the runs (10/11/2026):** single_answer step 3 used "clean", làm sạch, for "wash", giặt, as its example, and wash is a
test word (id 77). The two 10/11 runs (Haiku and Terra, 20 words each) used that wording, so their two wash verdicts (both pass) may
have been helped by it. The example is now "say", nói, for "whisper", thì thầm; whisper is not a test word.

Change from the 6-criteria text: only single_answer (its criterion question, steps, verdicts and examples). The other five criteria and
the think line are unchanged. Example words (begin, large, although, whisper, thirsty) are not test words; "cook" (A1, make dinner)
was dropped, since under this rule "make" is a more general word.

Criteria, sent in this order:

```json
[
  {
    "code": "single_answer",
    "question": "Apart from accepted_answers, also_accepted and input.session_words, is the given word the only common word that fills the blank with the meaning in meaning_vi?"
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

Criterion single_answer. Work in three steps.
1. Find candidates. Read the whole sentence with the blank. List at least three English words a learner might write there instead: synonyms of the word, more general words, and words that fit the sentence's grammar and clues. Ignore the forms in accepted_answers, the words in also_accepted and the words in input.session_words; session_single_answer covers them.
2. Keep the candidates that make the completed sentence natural English.
3. For each kept candidate, ask how a Vietnamese learner would translate it in this sentence. It has the same meaning when that translation is meaning_vi or says the same thing. It is a more general word when its translation is wider than meaning_vi (for example "say", nói, for "whisper", thì thầm).
- fail_major when a candidate with the same meaning is a common word that a learner at the given level or below knows (most A1 to B1 words). This holds even when the given word is the more usual collocation.
- fail_minor when every candidate with the same meaning is rare, formal, regional or a close variant of the word (for example "though" for "although").
- pass when no candidate with the same meaning fits. A more general word that fits does not fail this criterion: the app lets the learner try again and offers the first letter as a hint.
Examples:
- word "begin" (A2, bắt đầu): "The concert will ___ at eight o'clock, so please arrive early." → fail_major: "start" fits and also means bắt đầu.
- word "large" (A2, lớn): "We need a ___ box for all these books." → fail_major: "big" fits and also means lớn.
- word "although" (B1, mặc dù): "___ it was raining, we went for a walk." → fail_minor: only the close variants "though" and "even though" fit.
- word "whisper" (B1, thì thầm): "She ___ the answer so quietly that nobody else heard it." → pass: "said" fits, but it means nói, which is wider than thì thầm.
- word "thirsty" (A1, khát): "After the long run I was very ___, so I drank two glasses of water." → pass: the closest candidate, "hot", is natural but means nóng, not khát.
For a fail, name the word that fits in the reason. For a pass, name the closest candidate you tried and say whether it does not fit or only fits as a more general word.

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
