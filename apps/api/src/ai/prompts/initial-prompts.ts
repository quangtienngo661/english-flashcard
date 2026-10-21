import type { AiOperation } from '../ai.types.js';
import type { PromptExample } from './prompt-rules.js';

// Appendix A of the Bước 6 plan, approved by the owner 20/10/2026 (design §7.5, D26): only a starting point the admin edits.
// generate_cloze (revision 2) and the three Bước 7 operations: Appendix A of the Bước 7 plan, approved 21/10/2026.
// The seed migrations ai_initial_prompts and buoc7_ai_operations hold the same text; initial-prompts.spec.ts checks it.
export const INITIAL_PROMPTS: Record<AiOperation, { instructions: string; examples: PromptExample[] }> = {
  generate_cloze: {
    instructions: `You write one English practice sentence for a Vietnamese learner of English.

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
9. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).`,
    examples: [
      {
        input: { word: 'brush', part_of_speech: 'verb', level: 'A1', meaning_vi: 'chải, đánh (răng, tóc)', context_label: null },
        output: { sentence: 'I ___ my teeth twice a day, after breakfast and before bed.', accepted_answers: ['brush'], translation_vi: 'Tôi đánh răng hai lần mỗi ngày, sau bữa sáng và trước khi đi ngủ.' },
      },
      {
        input: { word: 'attention', part_of_speech: 'noun', level: 'A2', meaning_vi: 'sự chú ý', context_label: null },
        output: { sentence: 'Please pay ___ to the safety instructions before the plane takes off.', accepted_answers: ['attention'], translation_vi: 'Xin hãy chú ý đến hướng dẫn an toàn trước khi máy bay cất cánh.' },
      },
    ],
  },
  lookup_word: {
    instructions: `You help a Vietnamese learner of English with a word or short phrase they met while reading.

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
- meaning_vi, definition_en and the examples are about the same meaning.`,
    examples: [
      {
        input: { text: 'went', context_sentence: null },
        output: { part_of_speech: 'verb', lemma: 'go', meaning_vi: 'đi', definition_en: 'to move from one place to another', examples: ['We went to the beach on Sunday.'] },
      },
      {
        input: { text: 'bank', context_sentence: 'We had a picnic on the bank of the river.' },
        output: { part_of_speech: 'noun', lemma: 'bank', meaning_vi: 'bờ (sông, hồ)', definition_en: 'the land along the side of a river or lake', examples: ['They walked along the river bank.', 'The boat was tied to the bank.'] },
      },
    ],
  },
  translate_sentence: {
    instructions: `You translate one English sentence into Vietnamese for a learner of English.

The user message is a JSON object with one field:
- sentence: the English sentence.

Rules:
- translation_vi: a faithful, natural Vietnamese translation of the whole sentence.
- Keep names, numbers and units as they are.
- Do not explain or add notes. Plain text only (no Markdown, no HTML), at most 600 characters.`,
    examples: [
      {
        input: { sentence: 'Could you send me the report before Friday?' },
        output: { translation_vi: 'Bạn có thể gửi cho tôi bản báo cáo trước thứ Sáu không?' },
      },
      {
        input: { sentence: 'She has lived in Hanoi since 2019.' },
        output: { translation_vi: 'Cô ấy đã sống ở Hà Nội từ năm 2019.' },
      },
    ],
  },
  generate_meaning_question: {
    instructions: `You write one English sentence that shows one meaning of a word, for a Vietnamese learner of English.
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
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).`,
    examples: [
      {
        input: { word: 'deploy', part_of_speech: 'verb', level: 'B2', meaning_vi: 'triển khai (phần mềm, hệ thống)', context_label: null, other_meanings_vi: ['điều (quân), bố trí (lực lượng)', 'trì hoãn', 'giao (hàng)'] },
        output: { sentence: 'The developers deployed the update to all servers after the tests passed.', word_in_sentence: 'deployed', translation_vi: 'Các lập trình viên đã triển khai bản cập nhật lên mọi máy chủ sau khi các bài kiểm thử đạt.' },
      },
      {
        input: { word: 'bank', part_of_speech: 'noun', level: 'A2', meaning_vi: 'bờ (sông, hồ)', context_label: null, other_meanings_vi: ['ngân hàng', 'ghế dài', 'bến xe'] },
        output: { sentence: 'We sat on the grassy bank and watched the boats go down the river.', word_in_sentence: 'bank', translation_vi: 'Chúng tôi ngồi trên bờ cỏ và ngắm những chiếc thuyền xuôi dòng sông.' },
      },
    ],
  },
  generate_sentence_mcq: {
    instructions: `You write one English fill-in-the-blank sentence with four choices, for a Vietnamese learner of English.

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
6. The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).`,
    examples: [
      {
        input: { word: 'deploy', part_of_speech: 'verb', level: 'B2', meaning_vi: 'triển khai (phần mềm, hệ thống)', context_label: null, answer_form: 'deployed', candidates: ['delivered', 'debugged', 'delayed', 'defended', 'deleted'] },
        output: { sentence: 'After the tests passed, we ___ the new version to the production servers.', distractors: ['defended', 'delayed', 'debugged'], translation_vi: 'Sau khi các bài kiểm thử đạt, chúng tôi đã triển khai phiên bản mới lên các máy chủ production.' },
      },
      {
        input: { word: 'borrow', part_of_speech: 'verb', level: 'A2', meaning_vi: 'mượn', context_label: null, answer_form: 'borrow', candidates: ['lend', 'return', 'sell', 'carry'] },
        output: { sentence: 'Can I ___ your pen for a minute? I forgot mine at home.', distractors: ['sell', 'carry', 'return'], translation_vi: 'Mình mượn bút của bạn một chút được không? Mình để quên bút ở nhà.' },
      },
    ],
  },
  check_private_word: {
    instructions: `You check a word that a Vietnamese learner of English added to their own word list.

The user message is a JSON object with these fields:
- word: what the learner wrote as the English word or phrase.
- part_of_speech: its part of speech, or "unspecified" when the learner did not give one.
- meaning_vi: the Vietnamese meaning the learner wrote for it.

Answer with verdict:
- "ok" when word is a real English word or phrase (slang, a technical term or a common name of a product is fine) and it is used with the meaning in meaning_vi or a close meaning.
- "not_recognized" when word is not English, looks misspelled, or is not used with that meaning.

Rules:
1. verdict is exactly "ok" or "not_recognized".
2. When in doubt between a rare but real use and a mistake, answer "ok".`,
    examples: [
      {
        input: { word: 'rizz', part_of_speech: 'noun', meaning_vi: 'sức hút, khả năng tán tỉnh' },
        output: { verdict: 'ok' },
      },
      {
        input: { word: 'deplyo', part_of_speech: 'verb', meaning_vi: 'triển khai phần mềm' },
        output: { verdict: 'not_recognized' },
      },
      {
        input: { word: 'bank', part_of_speech: 'noun', meaning_vi: 'con mèo' },
        output: { verdict: 'not_recognized' },
      },
    ],
  },
};
