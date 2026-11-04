import { randomUUID } from 'node:crypto';
import { TurnstileClient, type TurnstileVerdict } from './turnstile-client.js';

// Cloudflare "Server-side validation" page (read 04/11/2026): this endpoint, a form POST, tokens valid once and for 300 s.
export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export const TURNSTILE_TIMEOUT_MS = 5_000;

export type RealTurnstileClientDeps = { fetch?: typeof fetch; uuid?: () => string; timeoutMs?: number };

type Attempt = { retry: boolean; verdict: TurnstileVerdict };

const unavailable = (reason: Extract<TurnstileVerdict, { kind: 'unavailable' }>['reason'], retry: boolean): Attempt => ({ retry, verdict: { kind: 'unavailable', reason } });

/**
 * The real Cloudflare siteverify over `fetch` (design 4.2): 5 s per try, one retry with the same `idempotency_key` after a network error,
 * a timeout, an HTTP 5xx or `internal-error`. It never throws and never puts the secret, the token or an error text into a verdict.
 */
export class RealTurnstileClient extends TurnstileClient {
  private readonly fetchImpl: typeof fetch;
  private readonly uuid: () => string;
  private readonly timeoutMs: number;

  constructor(private readonly secret: string, deps: RealTurnstileClientDeps = {}) {
    super();
    this.fetchImpl = deps.fetch ?? fetch;
    this.uuid = deps.uuid ?? randomUUID;
    this.timeoutMs = deps.timeoutMs ?? TURNSTILE_TIMEOUT_MS;
  }

  async verify(token: string, remoteIp: string | undefined): Promise<TurnstileVerdict> {
    const idempotencyKey = this.uuid();
    let attempt = await this.attempt(token, remoteIp, idempotencyKey);
    if (attempt.retry) attempt = await this.attempt(token, remoteIp, idempotencyKey);
    return attempt.verdict;
  }

  private async attempt(token: string, remoteIp: string | undefined, idempotencyKey: string): Promise<Attempt> {
    const body = new URLSearchParams({ secret: this.secret, response: token, idempotency_key: idempotencyKey });
    if (remoteIp !== undefined) body.set('remoteip', remoteIp);
    let response: Response;
    try {
      response = await this.fetchImpl(TURNSTILE_SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      return unavailable(error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network', true);
    }
    // The body is read whatever the status: a wrong secret is answered HTTP 400 with the error code in the JSON (live check 04/11/2026).
    let answer: { success?: unknown; hostname?: unknown; 'error-codes'?: unknown } | null;
    try {
      answer = (await response.json()) as typeof answer;
    } catch {
      answer = null;
    }
    const codes = Array.isArray(answer?.['error-codes']) ? answer['error-codes'].filter((code): code is string => typeof code === 'string') : [];
    // Our own secret is wrong: asking again cannot help, and the operator must hear about it.
    if (codes.includes('missing-input-secret') || codes.includes('invalid-input-secret')) return unavailable('misconfigured', false);
    if (codes.includes('internal-error')) return unavailable('internal-error', true);
    if (response.status >= 500) return unavailable('http', true);
    // A body that is not JSON: something answered that is not Cloudflare's JSON. A 2xx is worth one more try; a 4xx is final.
    if (answer === null) return unavailable('http', response.ok);
    if (response.ok && answer.success === true) return { retry: false, verdict: { kind: 'ok', hostname: typeof answer.hostname === 'string' ? answer.hostname : '' } };
    // success:false is a verdict about the token whatever the HTTP status (a login must never pass it as "Cloudflare is down").
    if (answer.success === false) return { retry: false, verdict: { kind: 'rejected', codes } };
    return unavailable('http', false);
  }
}
