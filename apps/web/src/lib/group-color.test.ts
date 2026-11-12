import { groupColorIndex, groupTone } from './group-color';

describe('groupColorIndex (design §7.4: FNV-1a 32-bit of the lower-cased ID, mod 7)', () => {
  // Expected values from a separate reference run in Node (Buffer bytes, Math.imul, 10/11/2026), not from this module.
  it.each([
    ['11111111-1111-4111-8111-111111111111', 4],
    ['3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b', 2],
    ['3F2A9C1E-5B7D-4E8F-9A0B-1C2D3E4F5A6B', 2],
    ['g-food', 0],
    ['g-tech', 6],
    ['g-ielts', 4],
    ['g2', 3],
    ['Đề 9', 6],
  ])('%s → %i', (id, index) => {
    expect(groupColorIndex(id)).toBe(index);
  });

  it('always returns an integer in [0, 6]', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) {
      const id = Math.random().toString(36).slice(2) + String.fromCharCode(0x1ea0 + (i % 90));
      const n = groupColorIndex(id);
      expect(Number.isInteger(n) && n >= 0 && n <= 6).toBe(true);
      seen.add(n);
    }
    expect(seen.size).toBe(7);
  });
});

describe('groupTone', () => {
  it('gives the static classes of the ID colour', () => {
    expect(groupTone('g-tech', 18)).toEqual({
      border: 'border-wm-group-6',
      soft: 'border-wm-group-6-soft',
      softBg: 'bg-wm-group-6-soft',
      wash: 'bg-wm-group-6-wash',
      ink: 'text-wm-group-6-ink',
      bg: 'bg-wm-group-6',
    });
  });

  it('gives the empty tone to a group with no word, whatever its ID', () => {
    expect(groupTone('g-tech', 0)).toEqual({
      border: 'border-wm-group-empty',
      soft: 'border-wm-group-empty-soft',
      softBg: 'bg-wm-group-empty-soft',
      wash: 'bg-wm-group-empty-wash',
      ink: 'text-wm-group-empty-ink',
      bg: 'bg-wm-group-empty',
    });
  });
});
