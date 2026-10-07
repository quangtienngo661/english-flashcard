import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy, normalizePassword } from './password-policy.js';

describe('password policy', () => {
  it('B1#3: abc reports every missing requirement in order', () => {
    expect(checkPasswordPolicy('abc')).toEqual(['min_length', 'uppercase', 'digit', 'special']);
  });

  it('B1#3: 129 code points includes max_length', () => {
    expect(checkPasswordPolicy(`Aa1!${'😀'.repeat(125)}`)).toEqual(['max_length']);
    expect(checkPasswordPolicy(`Aa1!${'😀'.repeat(124)}`)).toEqual([]);
  });

  it('B1#3: Mật-khẩu1 satisfies the policy', () => {
    expect(checkPasswordPolicy('Mật-khẩu1')).toEqual([]);
  });

  it('B1E1: composed and decomposed é normalize equally before counting', () => {
    expect(normalizePassword('Cafe\u0301')).toBe('Café');
    expect(checkPasswordPolicy('Aa1!e\u0301e\u0301e\u0301')).toEqual(['min_length']);
    expect(checkPasswordPolicy('Aa1!ééé')).toEqual(['min_length']);
  });

  it('B1#3: uses Unicode letters and decimal digits', () => {
    expect(checkPasswordPolicy('Éé٣!abcd')).toEqual([]);
    expect(checkPasswordPolicy('Éé٣abcdx')).toEqual(['special']);
    expect(checkPasswordPolicy('ABCD123!')).toEqual(['lowercase']);
  });

  it('B1#3: counts astral characters as one code point', () => {
    expect(checkPasswordPolicy('Aa1!😀😀😀')).toEqual(['min_length']);
    expect(checkPasswordPolicy('Aa1!😀😀😀😀')).toEqual([]);
  });
});
