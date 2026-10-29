import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import type { MailBudget } from '../../common/mail/mail-budget.service.js';
import type { Mailer } from '../../common/mail/mailer.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { EmailProvider } from './email.provider.js';
import { NotSentError } from './notification-provider.js';

const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const message = { kind: 'regular', language: 'vi' } as const;

function setup(over: { emails?: () => Promise<Map<string, string>>; budget?: () => Promise<boolean>; mail?: () => Promise<void> } = {}) {
  const mailer = { send: vi.fn(over.mail ?? (async () => {})) };
  const provider = new EmailProvider(
    { verifiedEmails: over.emails ?? (async () => new Map([[USER, 'lan@example.com']])) } as unknown as IdentityService,
    { tryConsume: over.budget ?? (async () => true) } as unknown as MailBudget,
    mailer as unknown as Mailer,
    { learnerAppUrl: 'http://localhost:3001' } as AppConfig,
  );
  return { provider, mailer };
}

describe('EmailProvider.send', () => {
  it('sends to the verified address and says sent', async () => {
    const t = setup();
    expect(await t.provider.send(USER, message)).toBe('sent');
    expect(t.mailer.send).toHaveBeenCalledOnce();
  });

  it('no verified address → no-address; budget spent → budget-exhausted; neither calls the mailer', async () => {
    const none = setup({ emails: async () => new Map() });
    expect(await none.provider.send(USER, message)).toBe('no-address');
    const spent = setup({ budget: async () => false });
    expect(await spent.provider.send(USER, message)).toBe('budget-exhausted');
    expect(none.mailer.send).not.toHaveBeenCalled();
    expect(spent.mailer.send).not.toHaveBeenCalled();
  });

  it('B3-3: a failure while reading the address or the budget is a NotSentError that keeps the cause, and the mailer is never called', async () => {
    const cause = new Error('database unavailable');
    for (const over of [{ emails: async () => { throw cause; } }, { budget: async () => { throw cause; } }]) {
      const t = setup(over);
      await expect(t.provider.send(USER, message)).rejects.toMatchObject({ name: 'NotSentError', original: cause });
      expect(t.mailer.send).not.toHaveBeenCalled();
    }
  });

  it('an error from the mailer itself is rethrown as it is, so the caller can classify what it says about delivery', async () => {
    const reset = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const t = setup({ mail: async () => { throw reset; } });
    const failure = await t.provider.send(USER, message).catch((error: unknown) => error);
    expect(failure).toBe(reset);
    expect(failure).not.toBeInstanceOf(NotSentError);
  });
});
