import { open, seal } from '../sessions/grace-cipher.js';

type Sealed = { exp: number; v: unknown };

/**
 * The short-lived Google cookies carry their state sealed (AES-256-GCM, the same cipher as the refresh grace secret) with the expiry
 * inside the sealed text, so nothing is stored on the server (design §5.2, D22). `ttlSeconds` counts from `now`.
 */
export function sealJson(value: object, ttlSeconds: number, key: Buffer, now: Date = new Date()): string {
  return seal(JSON.stringify({ exp: now.getTime() + ttlSeconds * 1000, v: value } satisfies Sealed), key);
}

/** `null` for a tampered, foreign or expired cookie; never throws. */
export function openJson<T>(sealed: string | undefined, key: Buffer, now: Date = new Date()): T | null {
  if (typeof sealed !== 'string' || sealed === '') return null;
  try {
    const parsed = JSON.parse(open(sealed, key)) as Partial<Sealed> | null;
    if (!parsed || typeof parsed.exp !== 'number' || parsed.exp <= now.getTime() || typeof parsed.v !== 'object' || parsed.v === null) return null;
    return parsed.v as T;
  } catch {
    return null;
  }
}
