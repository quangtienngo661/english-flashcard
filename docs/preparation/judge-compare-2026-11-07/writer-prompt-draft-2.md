# Fill-in writer prompt, draft 2 (10/11/2026)

Revision of [writer-prompt-draft.md](writer-prompt-draft.md) (the prompt approved on 07/11) after the first real API runs: Haiku 5.5
xhigh and GPT-6.1 Terra xhigh each wrote 100 sentences, judged by Opus 5.5 medium with judge text v2 and by Sonnet 5.5 high with the
7-criteria text ([failed-sentences-api-xhigh-2026-11-10.md](failed-sentences-api-xhigh-2026-11-10.md),
[judge-7-criteria-results-2026-11-10.md](judge-7-criteria-results-2026-11-10.md)). Not in the app.

## What the runs found in the sentences

| Problem | Haiku | Terra | Example |
|---|---|---|---|
| A common word also fits the blank (v2 judge, major) | 32 | 19 | "Add a thin ___ of lemon" (piece); "Can I ___ your pen" (use) |
| The clue is about letters or spelling, not meaning | 0 | 4 | "leaving only 'BARK'" (embark); "my favorite word that starts with D" |
| The word shows elsewhere in the sentence | 1 | 0 | "at the station's left luggage office" (luggage) |
| A form that fits is missing from accepted_answers | 2 | 1 | "My mother ___ for a bank" accepts "works" only, "worked" fits too |
| accepted_answers lists a form that does not fit | 2 | 0 | "a clean graphical user ___" accepts "interfaces" |
| The word in another part of speech | 1 | 0 | boil (verb) written as "come to a ___" (noun) |
| Words well above the level (7-criteria judge, level_fit major) | 11 | 4 | A1 sentences with bristles, tangles, cartoon characters, cinnamon |
| Average words per A1 sentence | 14.8 | 13.2 | |

**What no prompt has fixed:** 12 words fail as major for both writers, and 10 of them in every one of nine writer runs (increase,
slice, hire, suitcase, manage, organize, deploy, tidy, revenue, lucrative): a near-synonym a learner knows fits almost any natural
sentence. This draft does not expect to change those; that needs a product decision (first letter shown, accepting the synonym, or
another question type for those words).

**What a better sentence did fix:** Terra avoided 10 of Haiku's majors, mostly by ruling the competing word out inside the sentence:
"I can ___, but I can't cook; my cakes are good" (bake), "I ___ my teeth and my hair every morning" (brush), "deep-___ them in hot oil"
(fry). Draft 2 names that technique.

## Changes from draft 1

- Task step 3 checks three things, not one: other words, other forms of the word, and the level.
- Rule 2 names the technique that worked: put the competing word in the sentence and rule it out. Its example (whisper) is not one of
  the 102 test words.
- New rule 3: the clue must be about meaning; no letters, spelling, length, sound or word games.
- Rule 1 adds compounds and fixed names ("left luggage office").
- The level rule says "never more than one level above" and caps A1 and A2 sentences at about 12 words. My call: shorter sentences
  carry fewer clues, so this may let more words fit; the next run shows whether it does.
- The part of speech in part_of_speech must be kept (task step 1, rule 8).
- accepted_answers lists every form that fits and no form that does not.
- translation_vi translates the word with meaning_vi.
- Session-word rules and the three examples are unchanged. Rule numbers after rule 2 shift by one.

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
1. Write one natural English sentence that uses the word with the meaning in meaning_vi and as the part of speech in part_of_speech.
2. Replace the word in the sentence with one blank written as three underscores: ___
3. Check the blank before you answer, and rewrite the sentence until all three checks hold:
   - Other words: think of the words a learner at this level would most likely type there, including synonyms of the word, more general everyday words and the session words. No common word other than the given word may fit naturally with the same meaning.
   - Other forms: try the other forms of the word in the blank (other tenses, the plural, the -ing form). List every form that fits, or change the sentence so that only one fits.
   - Level: the other words in the sentence are at or below the level.
4. Give the forms of the word that fill the blank, the forms of session words that also fill it (usually none), and a Vietnamese translation of the whole sentence.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form, also not inside a compound or a fixed name.
2. Give the sentence a clue that only this word fits in this meaning: a fixed phrase or collocation that this word takes, a detail of meaning_vi that more general words lack, or grammar that rules other words out. A clue that a more general word also meets is not enough, because "cook" fits most sentences about "roast", "look at" most sentences about "stare", and "get" most sentences about "receive". One way that works is to name the competing word in the sentence and rule it out, as in "She didn't just say it; she ___ it so quietly that nobody else heard." for whisper, where "said" can no longer be the answer. Describe a situation rather than defining the word in the sentence, because a defining phrase is often a more general word that fits the blank too.
3. The clue must come from the meaning of the sentence. Never give a clue about the word's letters, spelling, length or sound, such as "it starts with D", "seven letters" or a crossword: the learner must recall the word from its meaning.
4. The only common word that fits the blank with this meaning is the given word: common synonyms and more general words that a learner at this level or below knows must not fit. A rare or formal word that also fits is acceptable, since a learner at this level would not type it.
5. No word in session_words may fit the blank with its meaning_vi. Check each one before you answer, and rewrite the sentence until none fits. A session word whose meaning_vi is null must not fit in any meaning.
6. also_accepted: only if you cannot write a good sentence where no session word fits, list the forms of the session words that fit the blank with their meaning_vi. Never list a session word whose meaning_vi is null, and never list a word that is not in session_words. Otherwise give an empty list.
7. When level is given, use words and grammar at or below that level, and never a word more than one level above it. For A1 and A2, keep the sentence to about 12 words; it still needs the clue of rule 2.
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

Haiku 5.5 xhigh rewrote 20 words with this draft (ids 0, 3, 9, 12, 19, 21, 26, 29, 35, 38, 43, 50, 58, 74, 75, 77, 78, 80, 90, 93, chosen
where the earlier judges disagreed most). Sonnet 5.5 high judged the draft-1 and draft-2 sentences with the 7-criteria text plus "Think
the problem through before you answer." ([judge-instructions-7-criteria-think.md](judge-instructions-7-criteria-think.md)). Word by word:
[draft-2-test-20-words-2026-11-10.txt](draft-2-test-20-words-2026-11-10.txt). One run each, so a few words either way may be chance.

| Same 20 words | Draft 1 | Draft 2 |
|---|---|---|
| single_answer pass / minor / major | 10 / 7 / 3 | 10 / 9 / 1 |
| grammar_natural minor (wrong or missing answer forms) | 3 | 1 |
| level_fit pass / minor / major | 7 / 8 / 5 | 5 / 10 / 5 |
| Words per sentence (A1 and A2 target about 12) | 15.8 | 15.6; 6 of 12 A1/A2 sentences over 12 |
| Writer time per sentence, cost | 11.2 s, US$0.0013 (100 words) | 16.7 s, US$0.0019 |

- **Better:** the answer forms (encrypt and interface now list only forms that fit); wash ("Every Sunday, Mum ___ our clothes in the
  sink with soap") and borrow ("Yesterday I ___ ten dollars from my sister and paid her back today") now pass; three majors became minor
  through the new technique ("Unlike a bag, a ___ … has a hard shell and wheels").
- **Not better:** the pass count (10 and 10); the level (bristles kept for A1, gibberish in a B2 sentence, dough for A2); hire got worse
  (employ fits the new sentence). The technique can read awkwardly: "Her writing is neat, but her room is never ___ with clothes on the floor."
- **Slower:** 16 of 20 calls over the app's 10 s limit.
