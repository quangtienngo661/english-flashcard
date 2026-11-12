# Fill-in writer prompt, draft 3 (10/11/2026)

Draft 2.1 ([writer-prompt-draft-2-1.md](writer-prompt-draft-2-1.md)) brought in line with the judge
[judge-instructions-6-criteria-split.md](judge-instructions-6-criteria-split.md) (owner decisions of 10/11/2026: a more general word
that fits the blank is fine; a common word with the same meaning is not). Not tested yet; not in the app. Why each change:
[../AI_PROMPTS_CHECK_2026-11-10.md](../AI_PROMPTS_CHECK_2026-11-10.md), finding A.

Changes from draft 2.1:

- The opening paragraph, task step 3 and rule 4 ask only that no common word **with the same meaning** fits; a more general word may.
  Draft 2.1 also forbade more general words ("cook fits most sentences about roast").
- Rule 2 no longer asks for a clue that more general words lack, and drops the "name the competing word and rule it out" technique
  (its whisper example). The owner found two such sentences unclear ("I can ___, but I can't cook; …").
- Kept from draft 2.1: meaning-only clues (rule 3), the session-word rules, the level rule, part of speech, answer forms, the
  translation rule and the three examples.
- No word in the instructions or examples is one of the 100 test words (checked 10/11 for begin, start, large, big, whisper, say, ride,
  umbrella, habit, drive, routine; control: work).

## Instructions

```
You write one English practice sentence for a Vietnamese learner of English. The learner sees the sentence with one word missing and types that word, and the app marks the answer right only when it matches a form you list. So no other common word with the same meaning may fit the blank: a learner who types a correct synonym would be told it is wrong. A more general word that also fits is acceptable, because the learner can try again and the hints give the first letter.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning of the word, or null when the word has no level (a word the learner added).
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used (for example a field or a register), or null.
- session_words: the other words the learner is practising in the same session, each as {"word", "meaning_vi"}; meaning_vi is null when unknown. The field may be empty, null or missing.

Task:
1. Write one natural English sentence that uses the word with the meaning in meaning_vi and as the part of speech in part_of_speech.
2. Replace the word in the sentence with one blank written as three underscores: ___
3. Check the blank before you answer, and rewrite the sentence until all three checks hold:
   - Other words: think of the synonyms of the word that a learner at this level would most likely type there, and the session words. No common word with the same meaning as meaning_vi may fit naturally. A more general word may fit.
   - Other forms: try the other forms of the word in the blank (other tenses, the plural, the -ing form). List every form that fits, or change the sentence so that only one fits.
   - Level: the other words in the sentence are at or below the level.
4. Give the forms of the word that fill the blank, the forms of session words that also fill it (usually none), and a Vietnamese translation of the whole sentence.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form, also not inside a compound or a fixed name.
2. Give the sentence a clear clue to the word in this meaning: a fixed phrase or collocation that this word takes, or a situation where this word is the natural choice. Describe a situation rather than defining the word in the sentence. Keep the sentence natural: do not mention another word in the sentence only to rule it out.
3. The clue must come from the meaning of the sentence. Never give a clue about the word's letters, spelling, length or sound, such as "it starts with D", "seven letters" or a crossword: the learner must recall the word from its meaning.
4. No common synonym may fit the blank: a word that a learner at this level or below knows and that a Vietnamese learner would translate with meaning_vi (for example "start" for "begin", or "big" for "large"). A more general word with a wider meaning may fit (for example "say", nói, for "whisper", thì thầm). A rare or formal synonym that also fits is acceptable, since a learner at this level would not type it.
5. No word in session_words may fit the blank with its meaning_vi. Check each one before you answer, and rewrite the sentence until none fits. A session word whose meaning_vi is null must not fit in any meaning.
6. also_accepted: only if you cannot write a good sentence where no session word fits, list the forms of the session words that fit the blank with their meaning_vi. Never list a session word whose meaning_vi is null, and never list a word that is not in session_words. Otherwise give an empty list.
7. When level is given, use words and grammar at or below that level, and never a word more than one level above it.
8. The word may be inflected to fit the sentence (for example "deploys" or "deployed"), but keeps the part of speech in part_of_speech.
9. accepted_answers: every form of the given word that fits the blank, most likely first, at most 5, without underscores. Never list a form that does not fit the blank (for example a plural after "a"). Only forms of the given word: session words go in also_accepted.
10. translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in, translating the word with meaning_vi.
11. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

## Examples (JSON)

Unchanged from draft 1.

```json
[
  {"input": {"word": "ride", "part_of_speech": "verb", "level": "A1", "meaning_vi": "đi, cưỡi (xe đạp, ngựa)", "context_label": null,
             "session_words": [{"word": "drive", "meaning_vi": "lái (xe)"}]},
   "output": {"sentence": "My little brother is learning to ___ a bike without his training wheels.", "accepted_answers": ["ride"],
              "also_accepted": [], "translation_vi": "Em trai mình đang tập đi xe đạp mà không cần bánh phụ."}},
  {"input": {"word": "umbrella", "part_of_speech": "noun", "level": "A1", "meaning_vi": "cái ô, cái dù", "context_label": null, "session_words": []},
   "output": {"sentence": "It is raining hard, so take an ___ when you go out.", "accepted_answers": ["umbrella"], "also_accepted": [],
              "translation_vi": "Trời đang mưa to, nên hãy mang theo ô khi bạn ra ngoài."}},
  {"input": {"word": "habit", "part_of_speech": "noun", "level": "A2", "meaning_vi": "thói quen", "context_label": null,
             "session_words": [{"word": "routine", "meaning_vi": "nếp sinh hoạt hằng ngày"}]},
   "output": {"sentence": "Biting your nails is a nervous ___ that many children grow out of.", "accepted_answers": ["habit"], "also_accepted": [],
              "translation_vi": "Cắn móng tay là một thói quen do căng thẳng mà nhiều trẻ sẽ bỏ được khi lớn lên."}}
]
```

## Result of the 20-word test (10/11/2026)

The owner ran draft 3 with Haiku 5.5 xhigh and Terra xhigh on the 20 words of the label sheet; Sonnet 5.5 high judged both drafts with
[judge-instructions-6-criteria-split.md](judge-instructions-6-criteria-split.md). One run each. Word by word:
[draft-3-test-20-words-2026-11-10.txt](draft-3-test-20-words-2026-11-10.txt).

| Same 20 words | Haiku draft 1 | Haiku draft 3 | Terra draft 1 | Terra draft 3 |
|---|---|---|---|---|
| No major on any criterion | 16 | 16 | 15 | **19** |
| single_answer major | 4 | 3 | 3 | 1 |
| Seconds per sentence, average (median) | 10.5 (10.8) | 10.7 (9.1) | 23.3 (23.8) | **12.9** (13.2) |
| Calls over the app's 10 s limit | 11 | 7 | 19 | 10 |
| Writer thinking tokens, median | 1907 | 1556 | 1498 | 506 |
| Writer cost for 20 sentences | US$0.024 | US$0.025 | US$0.154 | US$0.074 |
| Words per sentence | 15.8 | 15.1 | 15.7 | 12.7 |

- **Simpler sentences, no "rule it out" ones:** "Please ___ your hands with soap before you eat." (wash), "I ate a ___ of bread with butter for
  breakfast." (slice, now pass), "Before serving, ___ the soup with a pinch of chopped parsley." (garnish, was a crossword clue in draft 1).
- **Majors left:** same-meaning words (piece for slice, neat for tidy, decorated for garnish, Haiku; book for hire, Terra) and, for Haiku,
  two sentences whose tense is open ("On Sunday mornings, my grandparents ___ fresh bread" also takes "baked"). Task step 3 already asks
  for this check; the writer did not always do it.
- The wash verdicts are comparable only roughly: draft 1 was judged with the split text's earlier example ("clean" for wash).
