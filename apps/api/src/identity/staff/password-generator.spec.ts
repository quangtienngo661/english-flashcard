import { describe, expect, it } from 'vitest';
import { checkPasswordPolicy } from '../auth/password-policy.js';
import { generatePassword } from './password-generator.js';

describe('generatePassword', () => {
  it('B25#23: 1,000 samples all pass checkPasswordPolicy, are 16 chars, never contain 0 O o 1 l I or a space', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 1_000; index++) {
      const password = generatePassword();
      seen.add(password);
      expect(password).toHaveLength(16);
      expect(checkPasswordPolicy(password)).toEqual([]);
      expect(password).not.toMatch(/[0OolI1\s]/);
      expect(password).toMatch(/[-_.!@#%+=]/);
    }
    expect(seen.size).toBe(1_000);
  });
});
