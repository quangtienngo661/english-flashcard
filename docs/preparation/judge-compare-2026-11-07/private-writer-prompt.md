# Private-word check prompt for the test (07/11/2026)

`check_private_word`: the starter prompt (`apps/api/src/ai/prompts/initial-prompts.ts`), unchanged, with its three examples. Not in the app. In the app the answer format forces verdict to "ok" or "not_recognized".

## Instructions

```
You check a word that a Vietnamese learner of English added to their own word list.

The user message is a JSON object with these fields:
- word: what the learner wrote as the English word or phrase.
- part_of_speech: its part of speech, or "unspecified" when the learner did not give one.
- meaning_vi: the Vietnamese meaning the learner wrote for it.

Answer with verdict:
- "ok" when word is a real English word or phrase (slang, a technical term or a common name of a product is fine) and it is used with the meaning in meaning_vi or a close meaning.
- "not_recognized" when word is not English, looks misspelled, or is not used with that meaning.

Rules:
1. verdict is exactly "ok" or "not_recognized".
2. When in doubt between a rare but real use and a mistake, answer "ok".
```

## Examples (JSON)

```json
[
 {
  "input": {
   "word": "rizz",
   "part_of_speech": "noun",
   "meaning_vi": "sức hút, khả năng tán tỉnh"
  },
  "output": {
   "verdict": "ok"
  }
 },
 {
  "input": {
   "word": "deplyo",
   "part_of_speech": "verb",
   "meaning_vi": "triển khai phần mềm"
  },
  "output": {
   "verdict": "not_recognized"
  }
 },
 {
  "input": {
   "word": "bank",
   "part_of_speech": "noun",
   "meaning_vi": "con mèo"
  },
  "output": {
   "verdict": "not_recognized"
  }
 }
]
```
