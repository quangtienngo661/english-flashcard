import { PRIVATE_MEANING_MASK, PRIVATE_WORD_MASK } from '../practice.constants.js';
import type { AnswerKey, Hints, Prompt, QuestionType } from '../practice.types.js';

export type SnapshotQuestion = { type: QuestionType; prompt: Prompt; answerKey: AnswerKey; hints: Hints };
export type SnapshotItem = { answer_raw: string | null; answers_tried: string[]; result: string | null; hint_level: number };

/**
 * The copy of a question and its answers that staff read (design §10, D36; Bước 7 §7.8). A learner's private word is replaced
 * by PRIVATE_WORD_MASK and a private meaning by PRIVATE_MEANING_MASK, so the original never reaches the report. A private
 * asked word reaches here only from an AI question the learner agreed to share (D26): then the asked word, its option, hints
 * and reveal stay; every other private option is still masked.
 */
export function buildSnapshot(question: SnapshotQuestion, item: SnapshotItem) {
  const { prompt, answerKey: key } = question;
  let maskedPrompt: Prompt = prompt;
  let correct: Record<string, unknown> = { ...key.reveal };
  let answer = item.answer_raw;
  let optionIndex: { option_index: number | null } | object = {};
  if ((prompt.kind === 'mcq' || prompt.kind === 'meaning_in_sentence' || prompt.kind === 'mcq_sentence') && key.kind === 'mcq') {
    // The options of meaning_in_sentence are meanings; the others are words.
    const mask = prompt.kind === 'meaning_in_sentence' ? PRIVATE_MEANING_MASK : PRIVATE_WORD_MASK;
    const options = prompt.options.map((text, index) =>
      key.option_private[index] && !(key.asked_private && index === key.correct_index) ? mask : text);
    maskedPrompt = { ...prompt, options };
    correct = { ...correct, option_index: key.correct_index };
    // answer_raw is the chosen index "0"…"3" (Task 8).
    answer = item.answer_raw === null ? null : options[Number(item.answer_raw)] ?? null;
    optionIndex = { option_index: item.answer_raw === null ? null : Number(item.answer_raw) };
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
      level3: item.hint_level >= 3 ? question.hints.level3 ?? null : null,
    },
    learner: { answer, ...optionIndex, answers_tried: item.answers_tried, result: item.result, hint_level: item.hint_level },
  };
}
