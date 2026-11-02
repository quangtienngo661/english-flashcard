import { forgettingCurve } from './forgetting-curve';

describe('forgettingCurve', () => {
  const curve = forgettingCurve();

  it('LR2 the reviewed line starts full and is full again right after each review', () => {
    expect(curve.withReview.startsWith('M40.0,16.0')).toBe(true);
    for (const x of ['58.1', '94.4', '166.9', '293.9']) expect(curve.withReview).toContain(`${x},16.0`);
  });

  it('LR2 within one stretch the reviewed line falls (y grows)', () => {
    const points = curve.withReview.slice(1).split(' L').map((p) => p.split(',').map(Number) as [number, number]);
    // Strictly between the two reviews: the points at 58.1 and 94.4 themselves are the reset to full memory.
    const ys = points.filter(([x]) => x > 58.1 && x < 94.4).map(([, y]) => y);
    expect(ys.length).toBeGreaterThan(3);
    expect(ys.at(-1)).toBeGreaterThan(ys[0]);
  });

  it('LR2 the line without review ends near zero memory', () => {
    const last = curve.withoutReview.split(' L').at(-1)!.split(',').map(Number);
    expect(last[1]).toBeGreaterThanOrEqual(190);
  });

  it('LR2 the review dots sit on the reviews before day 30, the ticks on all five days', () => {
    expect(curve.reviewDots.map((d) => d.x.toFixed(1))).toEqual(['58.1', '94.4', '166.9', '293.9']);
    expect(curve.reviewDots.every((d) => d.y === 16)).toBe(true);
    expect(curve.ticks.map((t) => t.day)).toEqual([1, 3, 7, 14, 30]);
  });
});
