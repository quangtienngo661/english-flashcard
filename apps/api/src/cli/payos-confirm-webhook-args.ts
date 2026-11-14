import type { PayOS } from '@payos/node';
import type { AppConfig } from '../common/config/app-config.js';

// `pnpm payos:confirm-webhook <url>` (launch prep B design §3.3): registers the webhook URL with payOS after a deploy that changes the
// domain. payOS then sends a signed test webhook (orderCode 123), which the API answers 2xx and ignores as unknown-order (LB1E20).
// Kept apart from the entry file, which runs on import.

export const PAYOS_CONFIRM_USAGE = 'usage: pnpm payos:confirm-webhook <https://…/v1/billing/webhooks/payos>';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function parseConfirmWebhookArgs(argv: string[]): { ok: true; url: string } | { ok: false; error: string } {
  if (argv.length !== 1) return { ok: false, error: 'expected exactly one URL' };
  let url: URL;
  try {
    url = new URL(argv[0]);
  } catch {
    return { ok: false, error: 'not a URL' };
  }
  if (url.username !== '' || url.password !== '') return { ok: false, error: 'the URL must not carry credentials' };
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return { ok: false, error: 'the URL must be https (http only for a local address)' };
  return { ok: true, url: argv[0] };
}

type Client = Pick<PayOS, 'webhooks'>;

/**
 * Real mode asks the SDK to register the URL; fake mode has nothing to register; off mode cannot. The message carries the registered URL
 * only: never the keys, and not the account number payOS answers with.
 */
export async function confirmWebhook(
  payos: AppConfig['payos'], url: string, createClient: (payos: AppConfig['payos']) => Client,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (payos.mode === 'fake') return { ok: true, message: 'fake mode, nothing to confirm' };
  if (payos.mode === 'off') return { ok: false, error: 'payOS is not configured: set PAYOS_CLIENT_ID, PAYOS_API_KEY and PAYOS_CHECKSUM_KEY' };
  try {
    const confirmed = await createClient(payos).webhooks.confirm(url);
    return { ok: true, message: `confirmed ${confirmed.webhookUrl}` };
  } catch (error) {
    const secrets = [payos.apiKey, payos.checksumKey, payos.clientId].filter((value): value is string => value !== null && value !== '');
    const text = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, error: secrets.reduce((message, secret) => message.split(secret).join('[redacted]'), text) };
  }
}
