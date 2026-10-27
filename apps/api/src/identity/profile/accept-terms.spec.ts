import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { testConfig } from '../../../test/support/test-config.js';
import { IdentityService } from './identity.service.js';

// AD18: an account without consent (admin-made, or older) accepts the current terms through PATCH /v1/me.
describe('IdentityService.updateProfile accept_terms (unit, isolated persistence)', () => {
  const clock = new FakeClock(new Date('2026-10-28T05:00:00Z'));
  const row = { id: 'u1', email: 'lan@example.com', emailVerifiedAt: clock.now(), nativeLanguage: null, timezone: 'Asia/Saigon',
    staffRole: null, mustChangePassword: false, givenName: 'Lan', familyName: null, birthDate: null, termsAcceptedAt: null };
  const setup = () => {
    const logs: LogEntry[] = [];
    const update = vi.fn(async ({ data }) => ({ ...row, ...data }));
    const findUnique = vi.fn(async () => ({ ...row }));
    const identity = new IdentityService({ user: { update, findUnique } } as unknown as PrismaClient, clock,
      new AppLogger({ write: (entry) => { logs.push(entry); } }), testConfig());
    return { identity, update, findUnique, logs };
  };

  it('records now and the configured terms version, and the profile shows the acceptance', async () => {
    const { identity, update, logs } = setup();
    const profile = await identity.updateProfile('u1', { accept_terms: true });
    expect(update.mock.calls[0][0].data).toEqual({ termsAcceptedAt: clock.now(), termsVersion: testConfig().termsVersion });
    expect(profile?.terms_accepted_at).toBe('2026-10-28T05:00:00.000Z');
    expect(logs).toContainEqual(expect.objectContaining({ event: 'terms_accepted', user_id: 'u1' }));
  });
  it('a birth date and the acceptance can come in one request', async () => {
    const { identity, update } = setup();
    await identity.updateProfile('u1', { birth_date: '2000-01-01', accept_terms: true });
    expect(update.mock.calls[0][0].data).toMatchObject({ birthDate: new Date('2000-01-01T00:00:00Z'), termsAcceptedAt: clock.now() });
  });
  it('without accept_terms nothing about consent is written; an empty body writes nothing', async () => {
    const { identity, update, findUnique } = setup();
    await identity.updateProfile('u1', { given_name: 'Mai' });
    expect(Object.keys(update.mock.calls[0][0].data)).toEqual(['givenName']);
    update.mockClear();
    const profile = await identity.updateProfile('u1', {});
    expect(update).not.toHaveBeenCalled(); expect(findUnique).toHaveBeenCalled();
    expect(profile?.terms_accepted_at).toBeNull();
  });
});
