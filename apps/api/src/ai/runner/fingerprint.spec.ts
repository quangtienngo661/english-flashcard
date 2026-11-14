import { describe, expect, it } from 'vitest';
import { fingerprint } from './fingerprint.js';

const DATA = { word: 'deploy', part_of_speech: 'verb', level: 'B2', meaning_vi: 'triển khai', context_label: null };

describe('fingerprint', () => {
  it('the same data with keys in another order → same', () => {
    const reordered = { context_label: null, meaning_vi: 'triển khai', level: 'B2', part_of_speech: 'verb', word: 'deploy' };
    expect(fingerprint('generate_cloze', reordered)).toBe(fingerprint('generate_cloze', DATA));
    expect(fingerprint('lookup_word', { a: { y: 1, x: [2, { q: 1, p: 2 }] } }))
      .toBe(fingerprint('lookup_word', { a: { x: [2, { p: 2, q: 1 }], y: 1 } }));
  });

  it('one character changed → different', () => {
    expect(fingerprint('generate_cloze', { ...DATA, meaning_vi: 'triển khaj' })).not.toBe(fingerprint('generate_cloze', DATA));
  });

  it('same data, other operation → different', () => {
    expect(fingerprint('lookup_word', DATA)).not.toBe(fingerprint('generate_cloze', DATA));
  });

  it('arrays keep their order; the result is a hex SHA-256', () => {
    expect(fingerprint('lookup_word', { a: [1, 2] })).not.toBe(fingerprint('lookup_word', { a: [2, 1] }));
    expect(fingerprint('lookup_word', DATA)).toMatch(/^[0-9a-f]{64}$/);
  });
});
