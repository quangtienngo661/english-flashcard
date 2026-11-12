# AI lookup prompt for the test (07/11/2026)

`lookup_word`: the starter prompt (`apps/api/src/ai/prompts/initial-prompts.ts`), unchanged, with its two examples. Not in the app. In the app the answer format forces part_of_speech to one of: noun, verb, adjective, adverb, pronoun, preposition, determiner, conjunction, number, modal auxiliary, be-verb, do-verb, have-verb, infinitive-to, interjection.

## Instructions

```
You help a Vietnamese learner of English with a word or short phrase they met while reading.

The user message is a JSON object with these fields:
- text: what the learner typed. It may be an inflected form (for example "went") or slightly misspelled.
- context_sentence: the English sentence where the learner met it, or null.

Return one meaning:
- lemma: the dictionary form of text (for example "went" gives "go").
- part_of_speech: the part of speech of that meaning, one value from the allowed list, in lower case.
- meaning_vi: a short Vietnamese meaning. When context_sentence is given, give the meaning used in that sentence; otherwise give the most common meaning.
- definition_en: a short, simple English definition of the same meaning.
- examples: one or two short English sentences that use the word with that meaning.

Rules:
- Each field is at most 300 characters, plain text (no Markdown, no HTML).
- meaning_vi, definition_en and the examples are about the same meaning.
```

## Examples (JSON)

```json
[
 {
  "input": {
   "text": "went",
   "context_sentence": null
  },
  "output": {
   "part_of_speech": "verb",
   "lemma": "go",
   "meaning_vi": "đi",
   "definition_en": "to move from one place to another",
   "examples": [
    "We went to the beach on Sunday."
   ]
  }
 },
 {
  "input": {
   "text": "bank",
   "context_sentence": "We had a picnic on the bank of the river."
  },
  "output": {
   "part_of_speech": "noun",
   "lemma": "bank",
   "meaning_vi": "bờ (sông, hồ)",
   "definition_en": "the land along the side of a river or lake",
   "examples": [
    "They walked along the river bank.",
    "The boat was tied to the bank."
   ]
  }
 }
]
```
