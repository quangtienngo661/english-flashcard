/**
 * What a failed reminder send means for the day (design 8.3, D37: losing an email beats sending it twice).
 * - `permanent`: the server refused it for good (5xx). Do not retry.
 * - `transient`: certainly not delivered — the server refused it for now (4xx), or no SMTP conversation started
 *   (DNS failure, connect refused, connection or greeting timeout). Safe to retry.
 * - `unknown`: anything else, e.g. a timeout or reset once connected. The server may already have the message.
 *
 * nodemailer (10.0.15, `smtp-connection`) reports errors with `code`, `command`, `responseCode`; `command` is `CONN` both
 * before and after connecting, so the connect phase is recognised by the socket's `syscall` or the timeout message.
 */
export type MailErrorKind = 'permanent' | 'transient' | 'unknown';

const NOT_CONNECTED_MESSAGES = ['Connection timeout', 'Greeting never received'];

export function classifyMailError(error: unknown): MailErrorKind {
  if (!(error instanceof Error)) return 'unknown';
  const { code, responseCode, syscall } = error as Error & { code?: unknown; responseCode?: unknown; syscall?: unknown };
  if (typeof responseCode === 'number') {
    if (responseCode >= 500) return 'permanent';
    if (responseCode >= 400) return 'transient';
  }
  if (code === 'EDNS' || syscall === 'connect') return 'transient';
  if (code === 'ETIMEDOUT' && NOT_CONNECTED_MESSAGES.some((message) => error.message.startsWith(message))) return 'transient';
  return 'unknown';
}
