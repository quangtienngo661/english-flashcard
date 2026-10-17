import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';

function values(node: unknown, path = ''): Array<[string, string]> {
  if (typeof node === 'string') return [[path, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) => values(child, path ? `${path}.${key}` : key));
}

describe('message copy (Web Interface Guidelines, typography)', () => {
  it.each([['vi', vi], ['en', en]])('%s: quotes are curly and ellipses are one character', (_, messages) => {
    const bad = values(messages).filter(([, text]) => text.includes('"') || text.includes('...'));
    expect(bad).toEqual([]);
  });
});
