import { describe, expect, it } from 'vitest';
import { adminCapReached } from './admin-cap.js';

describe('adminCapReached (B20, design §5.5: "1,99 / 2,00, null, 0")', () => {
  it('blocks once the spend is at the cap, not before', () => {
    expect(adminCapReached(1.99, 2)).toBe(false);
    expect(adminCapReached(2, 2)).toBe(true);
    expect(adminCapReached(2.01, 2)).toBe(true);
  });

  it('null is no cap; 0 blocks everything', () => {
    expect(adminCapReached(500, null)).toBe(false);
    expect(adminCapReached(0, 0)).toBe(true);
  });
});
