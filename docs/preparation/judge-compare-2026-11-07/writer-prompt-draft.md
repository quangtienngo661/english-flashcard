# Fill-in writer prompt, draft after the judges (07/11/2026)

Draft of a `generate_cloze` prompt that avoids what the judges caught; not in the app. It starts from the prompt that ships with the
session synonyms work (plan Appendix A, `docs/superpowers/plans/2026-11-07-session-synonyms.md`), so it keeps `session_words` and
`also_accepted`.

## What the judges caught

On the 31/10 golden-set run (`gpt-6.1-terra`, config 10), Opus failed 35 of 102 sentences as major, Sonnet 25, both 23
([comparison.md](comparison.md)). Almost every major fail is one of two kinds:

| Kind | Examples from the run (word → what also fits) |
|---|---|
| A more general everyday word fits | bake → cook, fry → cook, wash → clean, brush → clean, borrow → get/take, import → buy, upgrade → change, manage → run, organize → plan, download → save, increase → raise |
| A near-synonym fits, often because the sentence defines the word with a general phrase | contract → deal, staff → team, slice → piece, strategy → plan, cuisine → food ("the traditional style of cooking"), turnover → revenue ("the total value of its sales"), clutter → mess, tidy → clean, urgent → important |

The prompt asked for this already (rule 2: "Avoid general sentences where many words fit"), but gave the writer no way to check.

## Changes from Appendix A

Revised the same day after reading the providers' prompting guidance
([`PROMPT_GUIDANCE_HAIKU_SONNET_TERRA_2026-11-07.md`](../PROMPT_GUIDANCE_HAIKU_SONNET_TERRA_2026-11-07.md)): the reason for the rules opens
the prompt, the new rules carry their reasons, and step 3 states what to check rather than a fixed procedure.

- New opening sentences: why the blank must have one answer (the learner is marked right only for the listed forms).
- New task step 3: before answering, list the words a learner would most likely write in the blank and rewrite until none of the common
  ones fits. This is the judge's own check, done by the writer.
- Rule 2 names the trap: a clue that a more general word also meets is not enough, and a sentence must not define the word with a general
  phrase. New rule 3 says which other words are acceptable (rare or formal ones) and which are not (common synonyms and more general words).
- Two of the three examples are replaced, because they were themselves weak or would leak into the test: "I ___ my teeth" also takes
  "clean" (the judges failed that sentence in the run), and `brush` and `attention` are words of the 102-row test set. The new `ride` and
  `umbrella` examples, the kept `habit` example and the general words named in the rules (`roast`, `stare`, `receive`, `huge`) are not
  among the 102 words, so a test on that set measures the rules, not memorised answers.

Rule numbers after rule 2 shift by one; the session-word rules are unchanged.

## Instructions

```
You write one English practice sentence for a Vietnamese learner of English. The learner sees the sentence with one word missing and types that word, and the app marks the answer right only when it matches a form you list. So the sentence must leave one natural answer: when another common word also fits, a learner who knows English is marked wrong.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning of the word, or null when the word has no level (a word the learner added).
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used (for example a field or a register), or null.
- session_words: the other words the learner is practising in the same session, each as {"word", "meaning_vi"}; meaning_vi is null when unknown. The field may be empty, null or missing.

Task:
1. Write one natural English sentence that uses the word with the meaning in meaning_vi.
2. Replace the word in the sentence with one blank written as three underscores: ___
3. Check the blank before you answer: think of the words a learner at this level would most likely type there, including synonyms of the word, more general everyday words and the session words. When a common word other than the given word fits naturally with the same meaning, rewrite the sentence and check again.
4. Give the forms of the word that fill the blank, the forms of session words that also fill it (usually none), and a Vietnamese translation of the whole sentence.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Give the sentence a clue that only this word fits in this meaning: a fixed phrase or collocation that this word takes, a detail of meaning_vi that more general words lack, or grammar that rules other words out. A clue that a more general word also meets is not enough, because "cook" fits most sentences about "roast", "look at" most sentences about "stare", and "get" most sentences about "receive". Describe a situation rather than defining the word in the sentence, because a defining phrase is often a more general word that fits the blank too.
3. The only common word that fits the blank with this meaning is the given word: common synonyms and more general words that a learner at this level or below knows must not fit. A rare or formal word that also fits is acceptable, since a learner at this level would not type it.
4. No word in session_words may fit the blank with its meaning_vi. Check each one before you answer, and rewrite the sentence until none fits. A session word whose meaning_vi is null must not fit in any meaning.
5. also_accepted: only if you cannot write a good sentence where no session word fits, list the forms of the session words that fit the blank with their meaning_vi. Never list a session word whose meaning_vi is null, and never list a word that is not in session_words. Otherwise give an empty list.
6. When level is given, use words and grammar at or below that level.
7. The word may be inflected to fit the sentence (for example "deploys" or "deployed").
8. accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Only forms of the given word: session words go in also_accepted.
9. translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
10. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).
```

## Examples (JSON)

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

Why these sentences pass the check: "drive a bike" is wrong English, so the session word `drive` does not fit; "an ___" rules out
"coat", "jacket" and "raincoat"; "a nervous ___ that children grow out of" does not take `routine`.
