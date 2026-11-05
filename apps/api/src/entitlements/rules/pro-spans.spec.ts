import { describe, expect, it } from 'vitest';
import type { GrantSource, PrepaidSource } from './plan-rules.js';
import { proSpans } from './pro-spans.js';

const at = (iso: string) => new Date(iso);
const grant = (over: Partial<GrantSource> = {}): GrantSource => ({
  id: 'g1', kind: 'plan', limits: null, startsAt: at('2026-11-01T00:00:00Z'), endsAt: at('2026-12-01T00:00:00Z'), revokedAt: null,
  createdAt: at('2026-11-01T00:00:00Z'), ...over,
});
const period = (over: Partial<PrepaidSource> = {}): PrepaidSource => ({
  id: 'p1', startsAt: at('2026-12-01T00:00:00Z'), endsAt: at('2027-01-01T00:00:00Z'), revokedAt: null, ...over,
});

describe('proSpans (launch prep B design §3.7)', () => {
  it('a plan grant and a prepaid period are both spans of Pro, with their dates and revocation', () => {
    expect(proSpans([grant({ revokedAt: at('2026-11-10T00:00:00Z') })], [period()])).toEqual([
      { startsAt: at('2026-11-01T00:00:00Z'), endsAt: at('2026-12-01T00:00:00Z'), revokedAt: at('2026-11-10T00:00:00Z') },
      { startsAt: at('2026-12-01T00:00:00Z'), endsAt: at('2027-01-01T00:00:00Z'), revokedAt: null },
    ]);
  });

  it('a limits grant is not Pro, so it is not a span', () => {
    expect(proSpans([grant({ kind: 'limits', limits: { ai_practice_per_cycle: 10 } })], [])).toEqual([]);
  });

  it('nothing in, nothing out', () => {
    expect(proSpans([], [])).toEqual([]);
  });
});
