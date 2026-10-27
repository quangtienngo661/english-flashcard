import { describe, expect, it } from 'vitest';
import { thinkingViolationKey } from './operation-violations';

// The API gives these two 400s no `type` of their own (api-facts A/81): the screen matches the exact string.
describe('thinkingViolationKey', () => {
  it('recognises both thinking violations by their exact string', () => {
    expect(thinkingViolationKey('thinking: this model cannot turn thinking off')).toBe('cannotTurnOff');
    expect(thinkingViolationKey('thinking: off needs effort high or below')).toBe('needsLowEffort');
  });

  it('leaves anything else alone', () => {
    expect(thinkingViolationKey('thinking: something else')).toBeNull();
    expect(thinkingViolationKey('effort: not offered by this model')).toBeNull();
    expect(thinkingViolationKey('thinking: this model cannot turn thinking off.')).toBeNull();
  });
});
