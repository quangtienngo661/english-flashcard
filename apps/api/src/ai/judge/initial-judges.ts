import type { AiOperation } from '../ai.types.js';
import type { JudgeCriterion } from './judge.types.js';

// The starting judge of nhóm B (design §5.4; decisions D12, D33): only a starting point the owner edits. It names no model; an admin chooses one
// before it can judge. The migration nhom_b_m3_judge holds the same text; initial-judges.spec.ts checks it.
export const INITIAL_JUDGE: {
  name: string; operations: AiOperation[]; criteria: JudgeCriterion[]; instructions: string; examples: unknown[];
} = {
  name: 'Chỉ một đáp án',
  operations: ['generate_cloze'],
  criteria: [
    { code: 'single_answer', question: 'Is the given word, in the forms of accepted_answers, the only answer that fits the blank?' },
  ],
  instructions: `You review one practice question that an AI wrote for a Vietnamese learner of English. You are not told who or what wrote it.

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

Criterion single_answer:
- fail_major when another word fits the blank naturally with the same meaning and is a very common word at the given level, or when a word in context.session_words fits the blank.
- fail_minor when the only other words that fit are rare synonyms or close variants of the word (for example "though" for "although").
- pass otherwise. The forms listed in accepted_answers are not other words.

Answer with three lists of the same length, one entry per criterion, in the order the criteria are given:
- codes: the criterion code.
- verdicts: "pass", "fail_major" or "fail_minor".
- reasons: one short English sentence; name the other word when there is one.`,
  examples: [],
};
