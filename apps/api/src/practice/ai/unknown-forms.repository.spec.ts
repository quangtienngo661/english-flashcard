import { describe, expect, it } from 'vitest';
import { formKey } from './unknown-forms.repository.js';

describe('formKey (design §10)', () => {
  it('matches Content: trimmed, one space per whitespace run, NFC, lower case', () => {
    expect(formKey('has  deployed ')).toBe('has deployed');
    expect(formKey('Cafe\u0301\tShop')).toBe('café shop');
  });
});
