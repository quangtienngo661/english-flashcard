import type { LimitKey } from '../entitlements.types.js';

// Who may grant, revoke or change the dates of what (design §10, D6, D8, D33, D38). Pure.

export type GrantRefusalReason =
  | 'target-is-staff' | 'self-grant' | 'ai-limits-admin-only' | 'target-is-admin' | 'target-has-paid-subscription';

export type GrantRefusalInput = {
  action: 'create' | 'revoke' | 'update';
  actorId: string;
  actorRole: 'admin' | 'editor';
  targetId: string;
  targetRole: 'admin' | 'editor' | null;
  touchesAiLimits: boolean;
};

/** A limits object with an `ai_*` key, even 0 (D33); a plan grant never touches AI limits (D7). */
export function touchesAiLimits(limits: Partial<Record<LimitKey, number>> | null): boolean {
  return limits !== null && ('ai_practice_per_cycle' in limits || 'ai_lookup_per_cycle' in limits);
}

/** Admin: always allowed. Editor, in this order: self, an admin, another staff account, AI limits. Revoke and update follow the same rules. */
export function grantRefusal(input: GrantRefusalInput): GrantRefusalReason | null {
  if (input.actorRole === 'admin') return null;
  if (input.actorId === input.targetId) return 'self-grant';
  if (input.targetRole === 'admin') return 'target-is-admin';
  if (input.targetRole !== null) return 'target-is-staff';
  if (input.touchesAiLimits) return 'ai-limits-admin-only';
  return null;
}
