-- generate_cloze: the new prompt (INITIAL_PROMPTS.generate_cloze, session synonyms plan Appendix A) wherever the live config still holds the seed
-- revision 2 text, whoever published it (final review of the session synonyms work, 07/11/2026). The first migration of this change,
-- 20261111090000_cloze_session_words_prompt, only replaced a config published by the system actor; nhóm B's switch-over copied the admin
-- who chose a model into published_by, so on a database where a model was chosen before it that migration only printed a notice. An admin's
-- own edit is still never overwritten: the live text must equal seed revision 2 (ai_prompt_revisions, saved by the system actor), nothing else.
-- Where the first migration already made config 3 (a fresh database), the live text is the new text and nothing happens. The live pointer's
-- version stays as it is. replace(..., E'\r', '') keeps the stored text the same on a CRLF checkout.
DO $seed$
DECLARE
  v_instructions TEXT := replace($p$You write one English practice sentence for a Vietnamese learner of English.

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
3. Give the forms of the word that fill the blank, the forms of session words that also fill it (usually none), and a Vietnamese translation of the whole sentence.

Rules:
1. Exactly one blank. The word must not appear anywhere else in the sentence, in any form.
2. Give the sentence a clue that belongs to this word and this meaning: a typical collocation, a typical subject or object, or the field in context_label. Avoid general sentences where many words fit.
3. No word in session_words may fit the blank with its meaning_vi. Check each one before you answer, and rewrite the sentence until none fits. A session word whose meaning_vi is null must not fit in any meaning.
4. also_accepted: only if you cannot write a good sentence where no session word fits, list the forms of the session words that fit the blank with their meaning_vi. Never list a session word whose meaning_vi is null, and never list a word that is not in session_words. Otherwise give an empty list.
5. When level is given, use words and grammar at or below that level.
6. The word may be inflected to fit the sentence (for example "deploys" or "deployed").
7. accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Only forms of the given word: session words go in also_accepted.
8. translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
9. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).$p$, E'\r', '');
  v_examples JSONB := '[{"input":{"word":"brush","part_of_speech":"verb","level":"A1","meaning_vi":"chải, đánh (răng, tóc)","context_label":null,"session_words":[{"word":"comb","meaning_vi":"chải (tóc)"}]},"output":{"sentence":"I ___ my teeth twice a day, after breakfast and before bed.","accepted_answers":["brush"],"also_accepted":[],"translation_vi":"Tôi đánh răng hai lần mỗi ngày, sau bữa sáng và trước khi đi ngủ."}},{"input":{"word":"attention","part_of_speech":"noun","level":"A2","meaning_vi":"sự chú ý","context_label":null,"session_words":[]},"output":{"sentence":"Please pay ___ to the safety instructions before the plane takes off.","accepted_answers":["attention"],"also_accepted":[],"translation_vi":"Xin hãy chú ý đến hướng dẫn an toàn trước khi máy bay cất cánh."}},{"input":{"word":"habit","part_of_speech":"noun","level":"A2","meaning_vi":"thói quen","context_label":null,"session_words":[{"word":"routine","meaning_vi":"nếp sinh hoạt hằng ngày"}]},"output":{"sentence":"Biting your nails is a nervous ___ that many children grow out of.","accepted_answers":["habit"],"also_accepted":[],"translation_vi":"Cắn móng tay là một thói quen do căng thẳng mà nhiều trẻ sẽ bỏ được khi lớn lên."}}]'::jsonb;
  v_system CONSTANT UUID := '00000000-0000-4000-8000-000000000060';
  v_seed ai_prompt_revisions%ROWTYPE;
  v_old ai_configs%ROWTYPE;
  v_number INTEGER;
  v_new UUID;
BEGIN
  SELECT * INTO v_seed FROM ai_prompt_revisions
  WHERE "operation" = 'generate_cloze' AND "revision" = 2 AND "saved_by" = '00000000-0000-4000-8000-000000000060';
  IF NOT FOUND THEN
    RAISE NOTICE 'generate_cloze has no seed revision 2 from the system; prompt not replaced. The new text is in the session synonyms plan, Appendix A.';
    RETURN;
  END IF;

  SELECT c.* INTO v_old
  FROM ai_live_configs l JOIN ai_configs c ON c."id" = l."config_id"
  WHERE l."operation" = 'generate_cloze'
  FOR UPDATE OF l;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF v_old."instructions" = v_instructions AND v_old."examples" = v_examples THEN
    RETURN;
  END IF;
  IF v_old."instructions" <> v_seed."instructions" OR v_old."examples" <> v_seed."examples" THEN
    RAISE NOTICE 'generate_cloze prompt was edited by an admin; not replaced. The new text is in the session synonyms plan, Appendix A.';
    RETURN;
  END IF;

  SELECT l."last_number" + 1 INTO v_number FROM ai_live_configs l WHERE l."operation" = 'generate_cloze';

  INSERT INTO ai_configs ("operation", "number", "version", "name", "instructions", "examples", "model_ref", "effort", "thinking",
                          "max_output_tokens", "status", "created_from", "created_by", "created_at", "published_by", "published_at", "updated_at")
  VALUES ('generate_cloze', v_number, 0, 'Cấu hình ' || v_number::text, v_instructions, v_examples, v_old."model_ref", v_old."effort",
          v_old."thinking", v_old."max_output_tokens", 'published', v_old."id", v_system, CURRENT_TIMESTAMP, v_system, CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP)
  RETURNING "id" INTO v_new;

  INSERT INTO ai_config_revisions ("config_id", "version", "content", "fingerprint", "name", "note", "saved_by", "saved_at")
  VALUES (v_new, 0, jsonb_build_object('instructions', v_instructions, 'examples', v_examples, 'model_ref', v_old."model_ref",
          'effort', v_old."effort", 'thinking', v_old."thinking", 'max_output_tokens', v_old."max_output_tokens"),
          NULL, 'Cấu hình ' || v_number::text, NULL, v_system, CURRENT_TIMESTAMP);

  UPDATE ai_configs SET "status" = 'retired' WHERE "id" = v_old."id";
  UPDATE ai_live_configs SET "config_id" = v_new, "previous_config_id" = v_old."id", "last_number" = v_number WHERE "operation" = 'generate_cloze';

  UPDATE ai_prompts
  SET "instructions" = v_instructions, "examples" = v_examples, "revision" = v_number, "updated_by" = v_system, "updated_at" = CURRENT_TIMESTAMP
  WHERE "operation" = 'generate_cloze';
  INSERT INTO ai_prompt_revisions ("operation", "revision", "instructions", "examples", "saved_by")
  VALUES ('generate_cloze', v_number, v_instructions, v_examples, v_system);
END
$seed$;
