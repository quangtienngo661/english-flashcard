import { createHmac, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { clientIpKey } from './client-ip-key.js';

describe('clientIpKey (F4: the login lock is keyed on account and client ip)', () => {
  const key = randomBytes(32);
  const hmac = (value: string) => createHmac('sha256', key).update(value).digest('hex').slice(0, 32);

  it('is the first 32 hex characters of HMAC-SHA256 of the ip, as the rate limiter keys an ip', () => {
    expect(clientIpKey('203.0.113.7', key)).toBe(hmac('203.0.113.7'));
    expect(clientIpKey('203.0.113.7', key)).toMatch(/^[0-9a-f]{32}$/);
  });
  it('two ips get two keys; another HMAC key gives another value', () => {
    expect(clientIpKey('203.0.113.7', key)).not.toBe(clientIpKey('203.0.113.8', key));
    expect(clientIpKey('203.0.113.7', randomBytes(32))).not.toBe(clientIpKey('203.0.113.7', key));
  });
  it.each([undefined, ''])('a missing ip (%j) is the hashed literal "unknown", never stored raw', (ip) => {
    expect(clientIpKey(ip, key)).toBe(hmac('unknown'));
  });
});
