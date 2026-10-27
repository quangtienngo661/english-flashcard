/** The API gives these two 400s no `type` of their own, so they are matched by their exact string (design §4.5). */
const THINKING_VIOLATIONS = {
  'thinking: this model cannot turn thinking off': 'cannotTurnOff',
  'thinking: off needs effort high or below': 'needsLowEffort',
} as const;

export type ThinkingViolationKey = (typeof THINKING_VIOLATIONS)[keyof typeof THINKING_VIOLATIONS];

export function thinkingViolationKey(violation: string): ThinkingViolationKey | null {
  return (THINKING_VIOLATIONS as Record<string, ThinkingViolationKey>)[violation] ?? null;
}
