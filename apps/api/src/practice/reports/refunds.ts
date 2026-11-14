import type { QuestionSource } from '../practice.types.js';

export type ResolveStatus = 'no_error' | 'fixed' | 'confirmed';

/** B7E84: an AI question is resolved no_error or confirmed; any other question no_error or fixed (design §9.3). */
export function allowedStatus(questionSource: QuestionSource, status: ResolveStatus): boolean {
  return status === 'no_error' || status === (questionSource === 'ai' ? 'confirmed' : 'fixed');
}

/**
 * Whether resolving gives the AI unit back (design §9.3). Practice checks ai_charged itself: Bước 5's refund does not look for
 * the `use` row of the operation, so a question given for free must never reach it (R2, B7E75, B7E118).
 */
export function refundDecision(
  report: { questionSource: QuestionSource; aiCharged: boolean; status: ResolveStatus }, reason: { refundable: boolean },
): 'refund' | 'no-refund' {
  return report.questionSource === 'ai' && report.status === 'confirmed' && report.aiCharged && reason.refundable ? 'refund' : 'no-refund';
}
