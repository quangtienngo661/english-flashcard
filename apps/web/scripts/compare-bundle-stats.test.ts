import { compareBundles } from './compare-bundle-stats.mjs';

const A = '/[locale]/app';
const row = (route: string, bytes: number) => ({ route, firstLoadUncompressedJsBytes: bytes });

describe('compare-bundle-stats', () => {
  it('passes at exactly 110 % and flags one byte more', () => {
    const base = { [A]: 100_000 };
    expect(compareBundles(base, [row(A, 110_000)]).rows).toEqual([{ route: A, before: 100_000, after: 110_000, ratio: 1.1, limit: 1.1, over: false }]);
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

  it('throws on an app row without a finite positive byte count', () => {
    for (const bad of [undefined, null, NaN, 0, -5, '100']) {
      const stats = [{ route: A, firstLoadUncompressedJsBytes: bad }] as never;
      expect(() => compareBundles({ [A]: 1 }, stats)).toThrow(`bad byte count for ${A}`);
    }
    expect(() => compareBundles({ [A]: 1 }, [{ route: A }] as never)).toThrow(`bad byte count for ${A}`);
  });

  it('throws on a baseline value that is not a finite positive number', () => {
    expect(() => compareBundles({ [A]: 0 }, [row(A, 1)])).toThrow(`bad baseline for ${A}`);
    expect(() => compareBundles({ [A]: 'x' as never }, [row(A, 1)])).toThrow(`bad baseline for ${A}`);
  });

  it('throws when no route is in both', () => {
    expect(() => compareBundles({}, [row(A, 1)])).toThrow('no routes to compare');
    expect(() => compareBundles({ [`${A}/x`]: 1 }, [row(A, 1)])).toThrow('no routes to compare');
  });
  describe('per-route limits', () => {
    const P = `${A}/plans`;
    const base = { [A]: 100_000, [P]: 100_000 };
    it('uses the override for its route only', () => {
      const r = compareBundles(base, [row(A, 112_000), row(P, 112_000)], { limits: { [P]: 1.18 } });
      expect(r.rows.find((x) => x.route === P)).toMatchObject({ over: false, limit: 1.18 });
      expect(r.rows.find((x) => x.route === A)).toMatchObject({ over: true, limit: 1.1 });
    });
    it('flags the same route over without the override', () => {
      expect(compareBundles(base, [row(A, 100_000), row(P, 112_000)]).rows.find((x) => x.route === P)?.over).toBe(true);
    });
    it('passes at exactly 118 % and flags 118.01 %', () => {
      expect(compareBundles(base, [row(A, 1), row(P, 118_000)], { limits: { [P]: 1.18 } }).rows.find((x) => x.route === P)?.over).toBe(false);
      expect(compareBundles(base, [row(A, 1), row(P, 118_010)], { limits: { [P]: 1.18 } }).rows.find((x) => x.route === P)?.over).toBe(true);
    });
    it('throws on an override for a route that is not compared', () => {
      expect(() => compareBundles(base, [row(A, 1), row(P, 1)], { limits: { [`${A}/gone`]: 1.18 } })).toThrow(`unknown limit route ${A}/gone`);
      expect(() => compareBundles(base, [row(A, 1)], { limits: { [P]: 1.18 } })).toThrow(`unknown limit route ${P}`);
    });
    it('throws on an override that is not a finite number above 1', () => {
      for (const bad of [1, 0.9, NaN, Infinity, '1.2']) {
        expect(() => compareBundles(base, [row(A, 1), row(P, 1)], { limits: { [P]: bad as never } })).toThrow(`bad limit for ${P}`);
      }
    });
  });
});
