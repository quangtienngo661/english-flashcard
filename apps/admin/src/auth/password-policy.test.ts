import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy } from './password-policy';

describe('checkPasswordPolicy (copy of apps/api password-policy.ts)', () => {
  it('accepts a password with length ≥ 8, upper, lower, digit and special', () => {
    expect(checkPasswordPolicy('Abcdef1!')).toEqual([]);
  });

  it('reports every missing rule by the API code', () => {
    expect(checkPasswordPolicy('abc')).toEqual(['min_length', 'uppercase', 'digit', 'special']);
    expect(checkPasswordPolicy('ABCDEFGH')).toEqual(['lowercase', 'digit', 'special']);
  });

  it('counts code points and rejects over 128', () => {
    expect(checkPasswordPolicy(`Aa1!${'x'.repeat(125)}`)).toEqual(['max_length']);
    expect(checkPasswordPolicy(`Aa1!${'x'.repeat(124)}`)).toEqual([]);
  });

  it('normalises to NFC before checking (a decomposed é is one letter)', () => {
    expect(checkPasswordPolicy('Ab1!éxyz')).toEqual([]);
  });
});
