import type { PracticeQuestion, PracticeSession, PracticeSessionItem } from '../../generated/prisma/client.js';
import type { AnswerKey, Hints, Prompt, PromptStyle, QuestionType } from '../practice.types.js';

export type SessionView = {
  id: string; kind: 'practice' | 'recall'; source: string; group_id: string | null; group_filter: string | null; sort: string; types: string[];
  prompt_style: string; target_count: number; status: string; round: number;
  /** Items that are not void. */
  asked: number;
  /** Words of round 1. */
  words: number;
  /** Bước 7 (design §6.1). */
  ai_planned: number; cloze_source: string | null;
  /** Final results so far, every round (giao diện mới M5.1, QR2): the session bar's ✓ / ✗ after a reload. */
  correct: number; wrong: number;
};

export type ItemView = {
  item_id: string; round: number; position: number; type: QuestionType; prompt_style: PromptStyle; prompt: Prompt;
  hints_available: { level1: boolean; level2: boolean; level3: boolean }; hint_level: number; state: 'unanswered' | 'try_again'; tries: number;
  reportable: boolean;
  /**
   * This very question was written by AI. With cloze source 'own_then_ai' the session alone cannot say, since a saved-sentence cloze
   * and an AI cloze share the session.
   */
  ai: boolean;
  /** The asked word is the learner's own (learner UI D12, K/81: a report shows it to the team). */
  private_word: boolean;
};

export type ItemWithQuestion = PracticeSessionItem & { question: PracticeQuestion };

export function sessionView(row: PracticeSession, items: Array<Pick<PracticeSessionItem, 'round' | 'result'>>): SessionView {
  return {
    id: row.id, kind: row.kind === 'recall' ? 'recall' : 'practice', source: row.source, group_id: row.groupId, group_filter: row.groupFilter, sort: row.sort, types: row.types,
    prompt_style: row.promptStyle, target_count: row.targetCount, status: row.status,
    round: Math.max(1, ...items.map((i) => i.round)), asked: items.filter((i) => i.result !== 'void').length,
    words: row.senseIds.length, ai_planned: row.aiPlanned, cloze_source: row.clozeSource,
    correct: items.filter((i) => i.result === 'correct').length, wrong: items.filter((i) => i.result === 'wrong').length,
  };
}

/** What the app sees of an unanswered item: never the answer key or the hint texts. */
export function itemView(item: ItemWithQuestion): ItemView {
  const hints = item.question.hints as Hints;
  return {
    item_id: item.id, round: item.round, position: item.position, type: item.question.type as QuestionType,
    prompt_style: item.question.promptStyle as PromptStyle, prompt: item.question.prompt as Prompt,
    hints_available: { level1: hints.level1 !== null, level2: hints.level2 !== null, level3: (hints.level3 ?? null) !== null },
    hint_level: item.hintLevel,
    state: item.tries > 0 ? 'try_again' : 'unanswered', tries: item.tries,
    // Design §9.2: an AI question is reportable (a private word too, learner UI D12); a private non-AI one never (D36), nor the
    // learner's own sentence (§7.3).
    reportable: item.question.source === 'ai'
      || (!(item.question.answerKey as AnswerKey).asked_private && item.question.source !== 'own_sentence'),
    ai: item.question.source === 'ai',
    private_word: (item.question.answerKey as AnswerKey).asked_private === true,
  };
}
