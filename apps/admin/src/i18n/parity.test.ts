import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import vi from '../../messages/vi.json';

function keys(node: unknown, path = ''): string[] {
  if (typeof node === 'string') return [path];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) => keys(child, path ? `${path}.${key}` : key));
}

describe('message parity (AD11)', () => {
  it('vi.json and en.json have the same keys', () => {
    const viKeys = new Set(keys(vi));
    const enKeys = new Set(keys(en));
    expect({ onlyInVi: [...viKeys].filter((k) => !enKeys.has(k)), onlyInEn: [...enKeys].filter((k) => !viKeys.has(k)) }).toEqual({
      onlyInVi: [],
      onlyInEn: [],
    });
  });
});
