import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';
import { BULK_MAX } from '../features/ai/bulk-examples';

function values(node: unknown, path = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) => values(child, path ? `${path}.${key}` : key));
}

describe('message copy (Web Interface Guidelines, typography)', () => {
  it.each([['vi', vi], ['en', en]])('%s: quotes are curly and ellipses are one character', (_, messages) => {
    const bad = values(messages).filter(([, text]) => text.includes('"') || text.includes('...'));
    expect(bad).toEqual([]);
  });

  it.each([['vi', vi], ['en', en]])('%s: the accessible name of [Chọn model] starts with its visible label', (_, messages) => {
    expect(messages.ai.status.chooseModelFor.toLowerCase().startsWith(messages.ai.status.chooseModel.toLowerCase())).toBe(true);
  });

  it('vi: the price hint writes the ceiling without a thousands dot', () => {
    expect(vi.ai.models.form.priceHint.startsWith('Từ 0 đến 1000,')).toBe(true);
  });

  it('UA-1: both languages state the limit the API enforces for examples per operation', () => {
    expect(BULK_MAX).toBe(1000);
    expect(en.ai.eval.examples).toBe('Examples ({count}/1,000)');
    expect(en.ai.eval.examplesHint.startsWith('Up to 1,000 examples per operation.')).toBe(true);
    expect(vi.ai.eval.examples).toBe('Ví dụ ({count}/1.000)');
    expect(vi.ai.eval.examplesHint.startsWith('Mỗi thao tác tối đa 1.000 ví dụ.')).toBe(true);
  });
});
