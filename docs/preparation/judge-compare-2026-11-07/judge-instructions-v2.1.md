# Judge instructions, draft v2.1 (judge "Chỉ một đáp án", criterion `single_answer`)

Draft for testing only; not in the app and not run yet. Same rules as [v2](judge-instructions-v2.md), the text the owner chose after four
rounds ([comparison.md](comparison.md)). One change, from the providers' prompting guidance
([`PROMPT_GUIDANCE_HAIKU_SONNET_TERRA_2026-11-07.md`](../PROMPT_GUIDANCE_HAIKU_SONNET_TERRA_2026-11-07.md)): the four worked examples move out
of the instruction text into the judge's examples field. The app then wraps each in `<example><input>…</input><output>…</output></example>`
inside `<examples>` (`assembleInstructions`), in the judge's real input and answer shape, so they mirror an actual call.

The rare-synonym question (does "heed" for *attention* fail a question?) is still the owner's to decide; this draft keeps v2's answer
(fail_minor).

Criterion (unchanged): `[{"code":"single_answer","question":"Is the given word, in the forms of accepted_answers, the only answer that fits the blank?"}]`

## Instructions

```
You review one practice question that an AI wrote for a Vietnamese learner of English. You are not told who or what wrote it.

The user message is a JSON object with these fields:
- target_operation: the kind of question. "generate_cloze" is one English sentence with one blank, written as ___, that the learner fills.
- input: what the writer was given: word, part_of_speech, level (CEFR A1 to C2, or null), meaning_vi, context_label.
- output: what the writer produced: sentence, accepted_answers (the forms of the word that fill the blank), translation_vi.
- criteria: the checks to make, each with a code and a question.
- context: null, or {"session_words": [...]}: the other words the learner practises in the same session.

For each criterion give one verdict:
- "pass": the answer to the question is yes.
- "fail_major": no, and a learner who knows the word could reasonably write something else and be marked wrong.
- "fail_minor": no, but only in a small way that few learners would hit.

Criterion single_answer. Work in two steps.
1. Find candidates. Read the whole sentence with the blank. List at least three English words a learner might write there instead: synonyms of the word, more general words, and words that fit the sentence's grammar and clues. Ignore the forms in accepted_answers.
2. Judge each candidate. A candidate fits when the completed sentence is natural English and keeps the meaning in meaning_vi.
- fail_major when a fitting candidate is a common word that a learner at the given level or below knows (most A1 to B1 words). This holds even when the given word is the more usual collocation: the learner who writes the common word is marked wrong.
- fail_major when a word in context.session_words fits the blank.
- fail_minor when every fitting candidate is rare, formal, regional or a close variant of the word (for example "though" for "although").
- pass when no candidate fits.

The examples show the answer for four questions.

Answer with three lists of the same length, one entry per criterion, in the order the criteria are given:
- codes: the criterion code.
- verdicts: "pass", "fail_major" or "fail_minor".
- reasons: one short English sentence. For a fail, name the word that fits. For a pass, name the closest candidate you tried and why it does not fit.
```

## Examples field (JSON)

```json
[
  {"input": {"target_operation": "generate_cloze",
             "input": {"word": "begin", "part_of_speech": "verb", "level": "A2", "meaning_vi": "bắt đầu", "context_label": null},
             "output": {"sentence": "The concert will ___ at eight o'clock, so please arrive early.", "accepted_answers": ["begin"], "translation_vi": "Buổi hòa nhạc sẽ bắt đầu lúc tám giờ, nên hãy đến sớm."},
             "criteria": [{"code": "single_answer", "question": "Is the given word, in the forms of accepted_answers, the only answer that fits the blank?"}],
             "context": null},
   "output": {"codes": ["single_answer"], "verdicts": ["fail_major"], "reasons": ["\"start\" fits with the same meaning and is a common A1 word."]}},
  {"input": {"target_operation": "generate_cloze",
             "input": {"word": "cook", "part_of_speech": "verb", "level": "A1", "meaning_vi": "nấu", "context_label": null},
             "output": {"sentence": "I usually ___ dinner for my family on Sundays.", "accepted_answers": ["cook"], "translation_vi": "Mình thường nấu bữa tối cho gia đình vào Chủ nhật."},
             "criteria": [{"code": "single_answer", "question": "Is the given word, in the forms of accepted_answers, the only answer that fits the blank?"}],
             "context": null},
   "output": {"codes": ["single_answer"], "verdicts": ["fail_major"], "reasons": ["\"make\" fits and is a common A1 word, even though \"cook dinner\" is the usual phrase."]}},
  {"input": {"target_operation": "generate_cloze",
             "input": {"word": "although", "part_of_speech": "conjunction", "level": "B1", "meaning_vi": "mặc dù", "context_label": null},
             "output": {"sentence": "___ it was raining, we went for a walk.", "accepted_answers": ["although", "Although"], "translation_vi": "Mặc dù trời mưa, chúng tôi vẫn đi dạo."},
             "criteria": [{"code": "single_answer", "question": "Is the given word, in the forms of accepted_answers, the only answer that fits the blank?"}],
             "context": null},
   "output": {"codes": ["single_answer"], "verdicts": ["fail_minor"], "reasons": ["Only the close variants \"though\" and \"even though\" also fit."]}},
  {"input": {"target_operation": "generate_cloze",
             "input": {"word": "thirsty", "part_of_speech": "adjective", "level": "A1", "meaning_vi": "khát", "context_label": null},
             "output": {"sentence": "After the long run I was very ___, so I drank two glasses of water.", "accepted_answers": ["thirsty"], "translation_vi": "Sau khi chạy đường dài, mình rất khát nên đã uống hai cốc nước."},
             "criteria": [{"code": "single_answer", "question": "Is the given word, in the forms of accepted_answers, the only answer that fits the blank?"}],
             "context": null},
   "output": {"codes": ["single_answer"], "verdicts": ["pass"], "reasons": ["The closest candidate, \"hot\", is natural but means \"nóng\", not \"khát\"."]}}
]
```
