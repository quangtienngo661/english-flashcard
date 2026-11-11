import { compareBundles } from './compare-bundle-stats.mjs';

const A = '/[locale]/app';
const row = (route: string, bytes: number) => ({ route, firstLoadUncompressedJsBytes: bytes });

describe('compare-bundle-stats', () => {
  it('passes at exactly 110 % and flags one byte more', () => {
    const base = { [A]: 100_000 };
    expect(compareBundles(base, [row(A, 110_000)]).rows).toEqual([{ route: A, before: 100_000, after: 110_000, ratio: 1.1, over: false }]);
    expect(compareBundles(base, [row(A, 110_001)]).rows[0]?.over).toBe(true);
  });

  it('lists a route only the new UI has as added, with no row', () => {
    const r = compareBundles({ [A]: 1 }, [row(A, 1), row(`${A}/settings/reports`, 5)]);
    expect(r.added).toEqual([`${A}/settings/reports`]);
    expect(r.rows.map((x) => x.route)).toEqual([A]);
  });

  it('lists a route only the baseline has as removed', () => {
    const r = compareBundles({ [A]: 1, [`${A}/practice/history`]: 9 }, [row(A, 1)]);
    expect(r.removed).toEqual([`${A}/practice/history`]);
    expect(r.rows).toHaveLength(1);
  });

  it('ignores public routes', () => {
    const r = compareBundles({ [A]: 1, '/[locale]': 1 }, [row(A, 1), row('/[locale]', 9), row('/[locale]/privacy', 9)]);
    expect(r.rows.map((x) => x.route)).toEqual([A]);
    expect(r.added).toEqual([]);
    expect(r.removed).toEqual([]);
  });

  it('sorts rows by route', () => {
    const r = compareBundles({ [`${A}/b`]: 1, [A]: 1 }, [row(`${A}/b`, 1), row(A, 1)]);
    expect(r.rows.map((x) => x.route)).toEqual([A, `${A}/b`]);
  });

  it('throws when stats has no app route', () => {
    expect(() => compareBundles({ [A]: 1 }, [])).toThrow('no app routes in stats');
    expect(() => compareBundles({ [A]: 1 }, [row('/[locale]', 1), row('/[locale]/privacy', 1)])).toThrow('no app routes in stats');
  });
});
