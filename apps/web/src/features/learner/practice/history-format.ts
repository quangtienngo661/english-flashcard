import type { HistoryItem } from './practice-api';

type Translate = (key: string, values?: Record<string, string>) => string;

/**
 * One line for a question in history (K/51 "Gần đây", K/57): "đúng", or what the learner gave and the right answer.
 * `t` reads `App.practice.recent`.
 */
export function answerSummary(item: HistoryItem, t: Translate): string {
  const correct = item.correct.text;
  if (item.skipped) return t('skipped', { correct });
  if (item.result === 'correct') return t('correct');
  const options = item.prompt.options;
  if (options && item.answer !== null && /^\d$/.test(item.answer)) return t('chose', { answer: options[Number(item.answer)] ?? item.answer, correct });
  if (item.type === 'true_false_definition' && (item.answer === 'true' || item.answer === 'false')) return t('choseTf', { answer: t(item.answer) });
  return t('typed', { answer: item.answer ?? '', correct });
}
