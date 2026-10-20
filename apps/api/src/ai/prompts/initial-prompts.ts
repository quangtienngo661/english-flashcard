import type { AiOperation } from '../ai.types.js';
import type { PromptExample } from './prompt-rules.js';

// Appendix A of the Bước 6 plan, approved by the owner 20/10/2026 (design §7.5, D26): only a starting point the admin edits.
// The seed migration ai_initial_prompts holds the same text; initial-prompts.spec.ts checks it.
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
- Exactly one blank. The rest of the sentence must make the missing word clear to someone who knows this meaning.
- When level is given, use words and grammar at or below that level.
- The word may be inflected to fit the sentence (for example "deploys" or "deployed").
- accepted_answers: the form or forms of the given word that fit the blank, most likely first, at most 5, without underscores. Do not list other words, even synonyms.
- translation_vi: a natural Vietnamese translation of the whole sentence with the blank filled in.
- The sentence is at most 300 characters, on one line, plain text (no Markdown, no HTML).`,
    examples: [
      {
        input: { word: 'deploy', part_of_speech: 'verb', level: 'B2', meaning_vi: 'triển khai (phần mềm, hệ thống)', context_label: null },
        output: { sentence: 'The team will ___ the new version of the app tomorrow.', accepted_answers: ['deploy'], translation_vi: 'Nhóm sẽ triển khai phiên bản mới của ứng dụng vào ngày mai.' },
      },
      {
        input: { word: 'book', part_of_speech: 'verb', level: 'A2', meaning_vi: 'đặt (chỗ, vé)', context_label: null },
        output: { sentence: 'I ___ a table for two at the restaurant last night.', accepted_answers: ['booked'], translation_vi: 'Tối qua tôi đã đặt một bàn cho hai người ở nhà hàng.' },
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
};
