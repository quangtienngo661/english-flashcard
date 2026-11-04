/**
 * What Cloudflare siteverify said about one token (launch prep A, design 4.2).
 * `unavailable` covers Cloudflare not answering and our own wrong configuration; the guard decides what each route does then.
 */
export type TurnstileVerdict =
  | { kind: 'ok'; hostname: string }
  | { kind: 'rejected'; codes: string[] } // success:false, timeout-or-duplicate included
  | { kind: 'unavailable'; reason: 'network' | 'timeout' | 'http' | 'internal-error' | 'misconfigured' };

/** The port between the sign-in routes and the bot check. The real client talks to Cloudflare; the fake serves tests and the smokes. */
export abstract class TurnstileClient {
  /** Never throws: every failure is a verdict. `remoteIp` is the caller's address when the API knows it. */
  abstract verify(token: string, remoteIp: string | undefined): Promise<TurnstileVerdict>;
}
