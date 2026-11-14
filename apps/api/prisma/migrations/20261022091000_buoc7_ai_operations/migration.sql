-- Bước 7 AI operations (design §15, plan Task 6, Appendix A approved by the owner 21/10/2026); the same text as
-- src/ai/prompts/initial-prompts.ts. replace(…, E'\r', '') keeps the stored text the same on a CRLF checkout.

ALTER TABLE "ai_operation_settings" DROP CONSTRAINT "ai_operation_settings_operation_check";
ALTER TABLE "ai_operation_settings" ADD CONSTRAINT "ai_operation_settings_operation_check" CHECK ("operation" IN ('generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'));

-- The three new operations start off (model_ref null, D9 Bước 6) with their default token limits (design §15).
INSERT INTO "ai_operation_settings" ("operation", "model_ref", "effort", "thinking", "max_output_tokens", "version") VALUES
  ('generate_meaning_question', NULL, NULL, NULL, 1200, 0),
  ('generate_sentence_mcq', NULL, NULL, NULL, 1200, 0),
  ('check_private_word', NULL, NULL, NULL, 300, 0);

INSERT INTO "ai_prompts" ("operation", "instructions", "examples", "revision", "updated_by") VALUES
  ('generate_meaning_question', replace($p$You write one English sentence that shows one meaning of a word, for a Vietnamese learner of English.
The learner will read the sentence and choose the meaning of the word among four Vietnamese meanings.

The user message is a JSON object with these fields:
- word: the English word.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning, or null.
- meaning_vi: the Vietnamese meaning the sentence must use. This is the correct choice.
- context_label: a short note on where this meaning is used, or null.
- other_meanings_vi: three other Vietnamese meanings. They are the wrong choices.

Task:
1. Write one natural English sentence that uses the word exactly once, with the meaning in meaning_vi.
2. The sentence must make meaning_vi the only sensible choice: none of the meanings in other_meanings_vi may fit the word in this sentence.
3. Give the word exactly as it is written in the sentence, and a Vietnamese translation of the whole sentence.

Rules:
1. Use the word exactly once. It may be inflected (for example "deployed").
2. word_in_sentence: the word copied exactly as it appears in the sentence, with the same letters (a capital letter only if the sentence starts with it).
3. Do not explain the meaning inside the sentence and do not use the Vietnamese words.
4. When level is given, use words and grammar at or below that level.
5. translation_vi: a natural Vietnamese translation of the whole sentence.
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).$p$, E'\r', ''), '[{"input":{"word":"deploy","part_of_speech":"verb","level":"B2","meaning_vi":"triển khai (phần mềm, hệ thống)","context_label":null,"other_meanings_vi":["điều (quân), bố trí (lực lượng)","trì hoãn","giao (hàng)"]},"output":{"sentence":"The developers deployed the update to all servers after the tests passed.","word_in_sentence":"deployed","translation_vi":"Các lập trình viên đã triển khai bản cập nhật lên mọi máy chủ sau khi các bài kiểm thử đạt."}},{"input":{"word":"bank","part_of_speech":"noun","level":"A2","meaning_vi":"bờ (sông, hồ)","context_label":null,"other_meanings_vi":["ngân hàng","ghế dài","bến xe"]},"output":{"sentence":"We sat on the grassy bank and watched the boats go down the river.","word_in_sentence":"bank","translation_vi":"Chúng tôi ngồi trên bờ cỏ và ngắm những chiếc thuyền xuôi dòng sông."}}]'::jsonb, 1, '00000000-0000-4000-8000-000000000060'),
  ('generate_sentence_mcq', replace($p$You write one English fill-in-the-blank sentence with four choices, for a Vietnamese learner of English.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning, or null.
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used, or null.
- answer_form: the exact form of the word that fills the blank (for example "deployed"). This is the correct choice.
- candidates: other words, already in the same form as answer_form, taken from the learner's own word list.

Task:
1. Write one natural English sentence with one blank written as three underscores: ___
2. answer_form, with the meaning in meaning_vi, must be the only choice that fits the blank.
3. From candidates, choose exactly three words that do NOT fit the blank, in meaning or in grammar. If a candidate could also make a correct sentence, do not choose it.
4. Give a Vietnamese translation of the whole sentence with answer_form in the blank.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Use a clue that belongs to this word and this meaning, so the learner can tell it apart from the candidates.
3. distractors: exactly three different words, copied exactly from candidates. Never write a word that is not in candidates.
4. When level is given, use words and grammar at or below that level.
5. translation_vi: a natural Vietnamese translation of the whole sentence with answer_form in the blank.
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).$p$, E'\r', ''), '[{"input":{"word":"deploy","part_of_speech":"verb","level":"B2","meaning_vi":"triển khai (phần mềm, hệ thống)","context_label":null,"answer_form":"deployed","candidates":["delivered","debugged","delayed","defended","deleted"]},"output":{"sentence":"After the tests passed, we ___ the new version to the production servers.","distractors":["defended","delayed","debugged"],"translation_vi":"Sau khi các bài kiểm thử đạt, chúng tôi đã triển khai phiên bản mới lên các máy chủ production."}},{"input":{"word":"borrow","part_of_speech":"verb","level":"A2","meaning_vi":"mượn","context_label":null,"answer_form":"borrow","candidates":["lend","return","sell","carry"]},"output":{"sentence":"Can I ___ your pen for a minute? I forgot mine at home.","distractors":["sell","carry","return"],"translation_vi":"Mình mượn bút của bạn một chút được không? Mình để quên bút ở nhà."}}]'::jsonb, 1, '00000000-0000-4000-8000-000000000060'),
  ('check_private_word', replace($p$You check a word that a Vietnamese learner of English added to their own word list.

The user message is a JSON object with these fields:
- word: what the learner wrote as the English word or phrase.
- part_of_speech: its part of speech, or "unspecified" when the learner did not give one.
- meaning_vi: the Vietnamese meaning the learner wrote for it.

Answer with verdict:
- "ok" when word is a real English word or phrase (slang, a technical term or a common name of a product is fine) and it is used with the meaning in meaning_vi or a close meaning.
- "not_recognized" when word is not English, looks misspelled, or is not used with that meaning.

Rules:
1. verdict is exactly "ok" or "not_recognized".
2. When in doubt between a rare but real use and a mistake, answer "ok".$p$, E'\r', ''), '[{"input":{"word":"rizz","part_of_speech":"noun","meaning_vi":"sức hút, khả năng tán tỉnh"},"output":{"verdict":"ok"}},{"input":{"word":"deplyo","part_of_speech":"verb","meaning_vi":"triển khai phần mềm"},"output":{"verdict":"not_recognized"}},{"input":{"word":"bank","part_of_speech":"noun","meaning_vi":"con mèo"},"output":{"verdict":"not_recognized"}}]'::jsonb, 1, '00000000-0000-4000-8000-000000000060');

INSERT INTO "ai_prompt_revisions" ("operation", "instructions", "examples", "revision", "saved_by") VALUES
  ('generate_meaning_question', replace($p$You write one English sentence that shows one meaning of a word, for a Vietnamese learner of English.
The learner will read the sentence and choose the meaning of the word among four Vietnamese meanings.

The user message is a JSON object with these fields:
- word: the English word.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning, or null.
- meaning_vi: the Vietnamese meaning the sentence must use. This is the correct choice.
- context_label: a short note on where this meaning is used, or null.
- other_meanings_vi: three other Vietnamese meanings. They are the wrong choices.

Task:
1. Write one natural English sentence that uses the word exactly once, with the meaning in meaning_vi.
2. The sentence must make meaning_vi the only sensible choice: none of the meanings in other_meanings_vi may fit the word in this sentence.
3. Give the word exactly as it is written in the sentence, and a Vietnamese translation of the whole sentence.

Rules:
1. Use the word exactly once. It may be inflected (for example "deployed").
2. word_in_sentence: the word copied exactly as it appears in the sentence, with the same letters (a capital letter only if the sentence starts with it).
3. Do not explain the meaning inside the sentence and do not use the Vietnamese words.
4. When level is given, use words and grammar at or below that level.
5. translation_vi: a natural Vietnamese translation of the whole sentence.
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).$p$, E'\r', ''), '[{"input":{"word":"deploy","part_of_speech":"verb","level":"B2","meaning_vi":"triển khai (phần mềm, hệ thống)","context_label":null,"other_meanings_vi":["điều (quân), bố trí (lực lượng)","trì hoãn","giao (hàng)"]},"output":{"sentence":"The developers deployed the update to all servers after the tests passed.","word_in_sentence":"deployed","translation_vi":"Các lập trình viên đã triển khai bản cập nhật lên mọi máy chủ sau khi các bài kiểm thử đạt."}},{"input":{"word":"bank","part_of_speech":"noun","level":"A2","meaning_vi":"bờ (sông, hồ)","context_label":null,"other_meanings_vi":["ngân hàng","ghế dài","bến xe"]},"output":{"sentence":"We sat on the grassy bank and watched the boats go down the river.","word_in_sentence":"bank","translation_vi":"Chúng tôi ngồi trên bờ cỏ và ngắm những chiếc thuyền xuôi dòng sông."}}]'::jsonb, 1, '00000000-0000-4000-8000-000000000060'),
  ('generate_sentence_mcq', replace($p$You write one English fill-in-the-blank sentence with four choices, for a Vietnamese learner of English.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning, or null.
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used, or null.
- answer_form: the exact form of the word that fills the blank (for example "deployed"). This is the correct choice.
- candidates: other words, already in the same form as answer_form, taken from the learner's own word list.

Task:
1. Write one natural English sentence with one blank written as three underscores: ___
2. answer_form, with the meaning in meaning_vi, must be the only choice that fits the blank.
3. From candidates, choose exactly three words that do NOT fit the blank, in meaning or in grammar. If a candidate could also make a correct sentence, do not choose it.
4. Give a Vietnamese translation of the whole sentence with answer_form in the blank.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Use a clue that belongs to this word and this meaning, so the learner can tell it apart from the candidates.
3. distractors: exactly three different words, copied exactly from candidates. Never write a word that is not in candidates.
4. When level is given, use words and grammar at or below that level.
5. translation_vi: a natural Vietnamese translation of the whole sentence with answer_form in the blank.
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).$p$, E'\r', ''), '[{"input":{"word":"deploy","part_of_speech":"verb","level":"B2","meaning_vi":"triển khai (phần mềm, hệ thống)","context_label":null,"answer_form":"deployed","candidates":["delivered","debugged","delayed","defended","deleted"]},"output":{"sentence":"After the tests passed, we ___ the new version to the production servers.","distractors":["defended","delayed","debugged"],"translation_vi":"Sau khi các bài kiểm thử đạt, chúng tôi đã triển khai phiên bản mới lên các máy chủ production."}},{"input":{"word":"borrow","part_of_speech":"verb","level":"A2","meaning_vi":"mượn","context_label":null,"answer_form":"borrow","candidates":["lend","return","sell","carry"]},"output":{"sentence":"Can I ___ your pen for a minute? I forgot mine at home.","distractors":["sell","carry","return"],"translation_vi":"Mình mượn bút của bạn một chút được không? Mình để quên bút ở nhà."}}]'::jsonb, 1, '00000000-0000-4000-8000-000000000060'),
  ('check_private_word', replace($p$You check a word that a Vietnamese learner of English added to their own word list.

The user message is a JSON object with these fields:
- word: what the learner wrote as the English word or phrase.
- part_of_speech: its part of speech, or "unspecified" when the learner did not give one.
- meaning_vi: the Vietnamese meaning the learner wrote for it.

Answer with verdict:
- "ok" when word is a real English word or phrase (slang, a technical term or a common name of a product is fine) and it is used with the meaning in meaning_vi or a close meaning.
- "not_recognized" when word is not English, looks misspelled, or is not used with that meaning.

Rules:
1. verdict is exactly "ok" or "not_recognized".
2. When in doubt between a rare but real use and a mistake, answer "ok".$p$, E'\r', ''), '[{"input":{"word":"rizz","part_of_speech":"noun","meaning_vi":"sức hút, khả năng tán tỉnh"},"output":{"verdict":"ok"}},{"input":{"word":"deplyo","part_of_speech":"verb","meaning_vi":"triển khai phần mềm"},"output":{"verdict":"not_recognized"}},{"input":{"word":"bank","part_of_speech":"noun","meaning_vi":"con mèo"},"output":{"verdict":"not_recognized"}}]'::jsonb, 1, '00000000-0000-4000-8000-000000000060');

-- generate_cloze revision 2 (design §15, R13): only while the prompt is still the untouched revision 1 written by the system
-- actor; an admin's own edit is never overwritten. Revision 2 is recorded only when the update changed a row.
WITH updated AS (
  UPDATE "ai_prompts"
  SET "instructions" = replace($p$You write one English practice sentence for a Vietnamese learner of English.

The user message is a JSON object with these fields:
- word: the English word the learner is practising.
- part_of_speech: its part of speech, or "unspecified" when unknown.
- level: the CEFR level (A1 to C2) of this meaning of the word, or null when the word has no level (a word the learner added).
- meaning_vi: the Vietnamese meaning of the word. The sentence must use the word with exactly this meaning.
- context_label: a short note on where this meaning is used (for example a field or a register), or null.

Task:
1. Write one natural English sentence that uses the word with the meaning in meaning_vi.
2. Replace the word in the sentence with one blank written as three underscores: ___
3. Give the forms that fill the blank and a Vietnamese translation of the whole sentence.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Only this word may fit the blank. Give the sentence a clue that belongs to this word and this meaning: a typical collocation, a typical subject or object, or the field in context_label. Avoid general sentences where many words fit.
3. Before you answer, think of the other words a learner might write in the blank, especially synonyms and near-synonyms. If any of them fits as well as the given word, rewrite the sentence until none does.
4. If you cannot make the given word the only good answer, still give your best sentence; never list other words in accepted_answers.
5. When level is given, use words and grammar at or below that level.
6. The word may be inflected to fit the sentence (for example "deploys" or "deployed").
7. accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Do not list other words, even synonyms.
8. translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
9. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).$p$, E'\r', ''),
      "examples" = '[{"input":{"word":"brush","part_of_speech":"verb","level":"A1","meaning_vi":"chải, đánh (răng, tóc)","context_label":null},"output":{"sentence":"I ___ my teeth twice a day, after breakfast and before bed.","accepted_answers":["brush"],"translation_vi":"Tôi đánh răng hai lần mỗi ngày, sau bữa sáng và trước khi đi ngủ."}},{"input":{"word":"attention","part_of_speech":"noun","level":"A2","meaning_vi":"sự chú ý","context_label":null},"output":{"sentence":"Please pay ___ to the safety instructions before the plane takes off.","accepted_answers":["attention"],"translation_vi":"Xin hãy chú ý đến hướng dẫn an toàn trước khi máy bay cất cánh."}}]'::jsonb,
      "revision" = 2, "updated_by" = '00000000-0000-4000-8000-000000000060', "updated_at" = CURRENT_TIMESTAMP
  WHERE "operation" = 'generate_cloze' AND "revision" = 1 AND "updated_by" = '00000000-0000-4000-8000-000000000060'
  RETURNING "operation", "instructions", "examples", "revision", "updated_by"
)
INSERT INTO "ai_prompt_revisions" ("operation", "instructions", "examples", "revision", "saved_by")
SELECT "operation", "instructions", "examples", "revision", "updated_by" FROM updated;

-- One line for the admin when the edit above was skipped: the plan holds a newer text for generate_cloze.
DO $notice$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ai_prompt_revisions" WHERE "operation" = 'generate_cloze' AND "revision" = 2 AND "saved_by" = '00000000-0000-4000-8000-000000000060'
  ) THEN
    RAISE NOTICE 'generate_cloze prompt was edited by an admin; not replaced. The Bước 7 text is in the plan, Appendix A.';
  END IF;
END
$notice$;
