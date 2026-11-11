import type { Entitlements } from '@/app-shell/queries';
import { proLastDay } from './pro-last-day';

// M7.2 defect 3: the last day of Pro is the end − 1 ms (DB35), from pro_until, else a staff grant, else a subscription.
type Source = Entitlements['sources'][number];
const source = (fields: Partial<Source>): Source => ({
  kind: 'subscription', id: 's1', status: 'active', starts_at: null, ends_at: null, renews_at: null, cancel_at_period_end: false,
  pending_interval: null, ...fields,
});
const ent = (fields: Partial<Entitlements>) => ({ plan: 'pro', sources: [], ...fields }) as unknown as Entitlements;

describe('proLastDay', () => {
  it('pro_until (a payOS period or a grant) → 1 ms before it', () => {
    expect(proLastDay(ent({ pro_until: '2027-02-07T17:00:00Z', sources: [source({ kind: 'prepaid', ends_at: '2027-02-07T17:00:00Z' })] })))
      .toBe('2027-02-07T16:59:59.999Z');
  });

  it('a grant_plan with ends_at and no pro_until → its end − 1 ms', () => {
    expect(proLastDay(ent({ sources: [source({ kind: 'grant_plan', status: null, ends_at: '2026-12-31T17:00:00.000Z' })] })))
      .toBe('2026-12-31T16:59:59.999Z');
  });

  it('a renewing subscription → renews_at − 1 ms', () => {
    expect(proLastDay(ent({ sources: [source({ renews_at: '2026-11-12T03:00:00.000Z', ends_at: '2026-12-12T03:00:00.000Z' })] })))
      .toBe('2026-11-12T02:59:59.999Z');
  });

  it('a subscription with no renews_at → ends_at − 1 ms', () => {
    expect(proLastDay(ent({ sources: [source({ cancel_at_period_end: true, ends_at: '2026-12-12T03:00:00.000Z' })] })))
      .toBe('2026-12-12T02:59:59.999Z');
  });

  it('Free with no sources → null', () => {
    expect(proLastDay(ent({ plan: 'free', sources: [], pro_until: null }))).toBeNull();
  });
});
