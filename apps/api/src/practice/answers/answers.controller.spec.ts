import { describe, expect, it } from 'vitest';
import { answerBody } from './answers.controller.js';

describe('answer body (PRC12)', () => {
  it('B4-3: typed text with a NUL character is refused (Postgres text cannot store it)', () => {
    expect(answerBody.safeParse({ text: 'a\u0000b' }).success).toBe(false);
    expect(answerBody.safeParse({ text: '\u0000' }).success).toBe(false);
  });

  it('plain text, a choice and a true/false answer are accepted', () => {
    expect(answerBody.parse({ text: 'deploy' })).toEqual({ text: 'deploy' });
    expect(answerBody.parse({ choice: 2 })).toEqual({ choice: 2 });
    expect(answerBody.parse({ is_true: false })).toEqual({ is_true: false });
  });

  it('empty or whitespace-only text is refused', () => {
    expect(answerBody.safeParse({ text: '   ' }).success).toBe(false);
  });
});
