import { TurnstileClient, type TurnstileVerdict } from './turnstile-client.js';

/** The token a test sends to see the failing branch (LA1E17). */
export const FAKE_TURNSTILE_FAIL_TOKEN = 'fake-turnstile-fail';

/**
 * The bot check for the smokes, `admin-e2e-real` and local work (`TURNSTILE_MODE=fake`): no network; any token passes
 * except `fake-turnstile-fail`.
 */
export class FakeTurnstileClient extends TurnstileClient {
  async verify(token: string): Promise<TurnstileVerdict> {
    if (token === FAKE_TURNSTILE_FAIL_TOKEN) return { kind: 'rejected', codes: [FAKE_TURNSTILE_FAIL_TOKEN] };
    return { kind: 'ok', hostname: 'fake' };
  }
}
