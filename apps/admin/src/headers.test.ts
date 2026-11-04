import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Workers Static Assets reads public/_headers (copied to dist/ by `vite build`); neither `vite` nor `vite preview` does, so this is
// the only thing that fails when the file stops saying what the design promises (launch prep A, design 4.4, LA1#12).
const file = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf8').replace(/\r\n/g, '\n');
const lines = file.split('\n').filter((line) => line.trim() !== '');

const CSP = "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://admin-api.wordmet.com; img-src 'self' data: blob:; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

describe('public/_headers (LA1#12)', () => {
  it('has exactly one rule, for every path: a second rule would be appended to the first, not replace it', () => {
    const rules = lines.filter((line) => !line.startsWith(' ') && !line.startsWith('\t'));
    expect(rules).toEqual(['/*']);
  });

  it('sets these four headers and no others, word for word', () => {
    const headers = lines.filter((line) => /^\s/.test(line)).map((line) => line.trim());
    expect(headers).toEqual([
      `Content-Security-Policy: ${CSP}`,
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy: strict-origin-when-cross-origin',
      'Permissions-Policy: camera=(), microphone=(), geolocation=()',
    ]);
  });

  it('the CSP has one script-src and lets Turnstile draw its iframe', () => {
    expect(CSP.match(/script-src/g)).toHaveLength(1);
    expect(file).toContain("script-src 'self' https://challenges.cloudflare.com");
    expect(file).toContain('frame-src https://challenges.cloudflare.com');
  });
});
