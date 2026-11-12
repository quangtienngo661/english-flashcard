import { createHmac } from 'node:crypto';

/**
 * The key a login failure row is stored under (F4): HMAC-SHA256 of the client ip, cut to 32 hex characters as
 * `RateLimiter` keys an ip, so no raw ip is stored. A request without an ip shares the hashed key `unknown`.
 */
export function clientIpKey(ip: string | undefined, hmacKey: Buffer): string {
  return createHmac('sha256', hmacKey).update(ip || 'unknown').digest('hex').slice(0, 32);
}
