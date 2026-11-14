import { open, seal } from '../sessions/grace-cipher.js';

/** What a sealed value is for. It is sealed inside the text, so a value made for one purpose never opens as another (final review C1: the 2-minute reauth ticket was accepted as the 5-minute proof). */
export type SealPurpose = 'oauth-state' | 'signup' | 'reauth-ticket' | 'reauth-proof';

type Sealed = { exp: number; p: SealPurpose; v: unknown };

/**
 * The short-lived Google cookies carry their state sealed (AES-256-GCM, the same cipher as the refresh grace secret) with the expiry
 * inside the sealed text, so nothing is stored on the server (design §5.2, D22). `ttlSeconds` counts from `now`.
 */
export function sealJson(value: object, ttlSeconds: number, key: Buffer, purpose: SealPurpose, now: Date = new Date()): string {
  return seal(JSON.stringify({ exp: now.getTime() + ttlSeconds * 1000, p: purpose, v: value } satisfies Sealed), key);
}

/** `null` for a tampered, foreign, expired or other-purpose cookie; never throws. */
export function openJson<T>(sealed: string | undefined, key: Buffer, purpose: SealPurpose, now: Date = new Date()): T | null {
  if (typeof sealed !== 'string' || sealed === '') return null;
  try {
    const parsed = JSON.parse(open(sealed, key)) as Partial<Sealed> | null;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp <= now.getTime() || parsed.p !== purpose || typeof parsed.v !== 'object' || parsed.v === null) return null;
    return parsed.v as T;
  } catch {
    return null;
  }
}
