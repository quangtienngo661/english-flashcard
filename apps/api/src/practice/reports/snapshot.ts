import { PRIVATE_MEANING_MASK, PRIVATE_WORD_MASK } from '../practice.constants.js';
import type { AnswerKey, Hints, Prompt, QuestionType } from '../practice.types.js';

export type SnapshotQuestion = { type: QuestionType; prompt: Prompt; answerKey: AnswerKey; hints: Hints };
export type SnapshotItem = { answer_raw: string | null; answers_tried: string[]; result: string | null; hint_level: number };

/**
 * The copy of a question and its answers that staff read (design §10, D36). A learner's private word is replaced by
 * PRIVATE_WORD_MASK and a private paired meaning by PRIVATE_MEANING_MASK, so the original never reaches the report. Only
 * catalog words are asked here (a private asked word cannot be reported), so hints, accepted answers and the reveal hold
 * no private text.
 */
export function buildSnapshot(question: SnapshotQuestion, item: SnapshotItem) {
  const { prompt, answerKey: key } = question;
  let maskedPrompt: Prompt = prompt;
  let correct: Record<string, unknown> = { ...key.reveal };
  let answer = item.answer_raw;
  if (prompt.kind === 'mcq' && key.kind === 'mcq') {
    const options = prompt.options.map((text, index) => key.option_private[index] ? PRIVATE_WORD_MASK : text);
    maskedPrompt = { ...prompt, options };
    correct = { ...correct, option_index: key.correct_index };
    // answer_raw is the chosen index "0"…"3" (Task 8).
    answer = item.answer_raw === null ? null : options[Number(item.answer_raw)] ?? null;
  } else if (prompt.kind === 'true_false' && key.kind === 'true_false') {
    if (key.paired_private) maskedPrompt = { ...prompt, meaning: PRIVATE_MEANING_MASK };
    correct = { ...correct, is_true: key.is_true };
  } else if (key.kind === 'type_word') {
    correct = { ...correct, main: key.main, accepted: key.accepted };
  }
  return {
    type: question.type,
    prompt: maskedPrompt,
    correct,
    hints_shown: {
      level1: item.hint_level >= 1 ? question.hints.level1 : null,
      level2: item.hint_level >= 2 ? question.hints.level2 : null,
    },
    learner: { answer, answers_tried: item.answers_tried, result: item.result, hint_level: item.hint_level },
  };
}
