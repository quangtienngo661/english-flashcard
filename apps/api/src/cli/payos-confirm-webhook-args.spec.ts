import { describe, expect, it, vi } from 'vitest';
import { PAYOS_CONFIRM_USAGE, confirmWebhook, parseConfirmWebhookArgs } from './payos-confirm-webhook-args.js';

const URL_OK = 'https://api.wordmet.com/v1/billing/webhooks/payos';

describe('parseConfirmWebhookArgs', () => {
  it('takes exactly one https URL', () => {
    expect(parseConfirmWebhookArgs([URL_OK])).toEqual({ ok: true, url: URL_OK });
  });

  it('http is accepted only for a local address (to try the fake), never for a public host', () => {
    expect(parseConfirmWebhookArgs(['http://localhost:3000/v1/billing/webhooks/payos'])).toMatchObject({ ok: true });
    expect(parseConfirmWebhookArgs(['http://127.0.0.1:3000/x'])).toMatchObject({ ok: true });
    expect(parseConfirmWebhookArgs(['http://api.wordmet.com/v1/billing/webhooks/payos'])).toMatchObject({ ok: false });
  });

  it.each([
    ['no argument', []],
    ['two arguments', [URL_OK, URL_OK]],
    ['not a URL', ['api.wordmet.com/webhook']],
    ['another scheme', ['ftp://api.wordmet.com/x']],
    ['a flag', ['--url', URL_OK]],
    ['credentials in the URL', ['https://user:pass@api.wordmet.com/x']],
  ])('%s → refused with the usage line to print', (_name, argv) => {
    const result = parseConfirmWebhookArgs(argv);
    expect(result.ok).toBe(false);
    expect(PAYOS_CONFIRM_USAGE).toContain('pnpm payos:confirm-webhook');
  });
});

describe('confirmWebhook', () => {
  const payos = (mode: 'real' | 'fake' | 'off') => ({ mode, clientId: mode === 'real' ? 'c' : null, apiKey: mode === 'real' ? 'KEY-123' : null, checksumKey: mode === 'real' ? 'CHECK-456' : null });

  it('fake mode: says there is nothing to confirm and never builds a client', async () => {
    const createClient = vi.fn();
    expect(await confirmWebhook(payos('fake'), URL_OK, createClient)).toEqual({ ok: true, message: 'fake mode, nothing to confirm' });
    expect(createClient).not.toHaveBeenCalled();
  });

  it('off mode: refuses, naming the three variables', async () => {
    const result = await confirmWebhook(payos('off'), URL_OK, vi.fn());
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).toMatch(/PAYOS_CLIENT_ID.*PAYOS_API_KEY.*PAYOS_CHECKSUM_KEY/);
  });

  it('real mode: asks the SDK to confirm the URL and reports the registered URL without the account number', async () => {
    const confirm = vi.fn(async (_url: string) => ({ webhookUrl: URL_OK, accountName: 'WORDMET', accountNumber: '9999888877', name: 'Wordmet', shortName: 'WM' }));
    const createClient = vi.fn(() => ({ webhooks: { confirm } }));
    const result = await confirmWebhook(payos('real'), URL_OK, createClient as never);
    expect(confirm).toHaveBeenCalledWith(URL_OK);
    expect(result).toMatchObject({ ok: true });
    expect(JSON.stringify(result)).toContain(URL_OK);
    expect(JSON.stringify(result)).not.toContain('9999888877');
  });

  it('real mode: a refusal by payOS is reported as a failure, and the keys never appear in what is printed', async () => {
    const confirm = vi.fn(async () => { throw new Error('Webhook validation failed: KEY-123 CHECK-456 not reachable'); });
    const result = await confirmWebhook(payos('real'), URL_OK, (() => ({ webhooks: { confirm } })) as never);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).not.toContain('KEY-123');
    expect(JSON.stringify(result)).not.toContain('CHECK-456');
  });
});
