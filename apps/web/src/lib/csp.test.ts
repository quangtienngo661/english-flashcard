import { buildAppCsp, buildCsp } from './csp';

const BASE = { apiOrigin: 'https://api.wordmet.com', dev: false, inline: false, scriptHashes: ["'sha256-abc='"] };

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...values]) => [name, values]),
  );
}

describe('buildCsp (design §4.6, D9, D20, D22)', () => {
  it("defaults everything to 'self'", () => {
    expect(directives(buildCsp(BASE)).get('default-src')).toEqual(["'self'"]);
  });

  it('allows own scripts, the Cloudflare beacon and each hash passed', () => {
    const script = directives(buildCsp(BASE)).get('script-src');
    expect(script).toEqual(expect.arrayContaining(["'self'", 'https://static.cloudflareinsights.com', "'sha256-abc='"]));
    expect(script).not.toContain("'unsafe-inline'");
  });

  it("D20: adds 'unsafe-inline' to script-src and style-src only with the inline fallback", () => {
    const d = directives(buildCsp({ ...BASE, inline: true }));
    expect(d.get('script-src')).toContain("'unsafe-inline'");
    expect(d.get('style-src')).toContain("'unsafe-inline'");
    expect(directives(buildCsp(BASE)).get('style-src')).toEqual(["'self'"]);
  });

  it("D20: drops the hashes with the inline fallback, since a hash makes browsers ignore 'unsafe-inline'", () => {
    expect(directives(buildCsp({ ...BASE, inline: true })).get('script-src')).not.toContain("'sha256-abc='");
  });

  it('LA1#14 prerequisite: Turnstile scripts and its iframe come from challenges.cloudflare.com only', () => {
    const d = directives(buildCsp(BASE));
    expect(d.get('script-src')).toContain('https://challenges.cloudflare.com');
    expect(d.get('frame-src')).toEqual(['https://challenges.cloudflare.com']);
    // The inline fallback must not drop it either.
    expect(directives(buildCsp({ ...BASE, inline: true })).get('script-src')).toContain('https://challenges.cloudflare.com');
  });

  it('connects to self, the API origin and Cloudflare Web Analytics', () => {
    expect(directives(buildCsp(BASE)).get('connect-src')).toEqual(
      expect.arrayContaining(["'self'", 'https://api.wordmet.com', 'https://cloudflareinsights.com']),
    );
  });

  it('leaves the API out of connect-src when there is none (app off)', () => {
    expect(directives(buildCsp({ ...BASE, apiOrigin: null })).get('connect-src')).toEqual([
      "'self'",
      'https://cloudflareinsights.com',
    ]);
  });

  it('pins the remaining directives', () => {
    const d = directives(buildCsp(BASE));
    expect(d.get('img-src')).toEqual(["'self'", 'data:', 'blob:']);
    expect(d.get('font-src')).toEqual(["'self'"]);
    expect(d.get('object-src')).toEqual(["'none'"]);
    expect(d.get('base-uri')).toEqual(["'self'"]);
    expect(d.get('form-action')).toEqual(["'self'"]);
    expect(d.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('upgrades insecure requests outside dev only', () => {
    expect(directives(buildCsp(BASE)).has('upgrade-insecure-requests')).toBe(true);
    expect(directives(buildCsp({ ...BASE, dev: true })).has('upgrade-insecure-requests')).toBe(false);
  });

  it("allows 'unsafe-eval' in dev only (React dev tooling)", () => {
    expect(directives(buildCsp(BASE)).get('script-src')).not.toContain("'unsafe-eval'");
    expect(directives(buildCsp({ ...BASE, dev: true })).get('script-src')).toContain("'unsafe-eval'");
  });
});

describe('buildAppCsp (launch prep B design §5.4, DB39): the /app policy with a per-request nonce', () => {
  const OPTIONS = { adsense: false, apiOrigin: 'https://api.wordmet.com', dev: false, themeHash: "'sha256-theme='" };
  const NONCE = 'bm9uY2UtMQ==';

  it('is exactly the table of §5.4 before AdSense: nonce and strict-dynamic, the theme hash, no eval, https: or http:', () => {
    expect(buildAppCsp(NONCE, OPTIONS)).toBe([
      "default-src 'self'",
      "script-src 'nonce-bm9uY2UtMQ==' 'strict-dynamic' 'sha256-theme=' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.wordmet.com https://cloudflareinsights.com",
      'frame-src https://challenges.cloudflare.com',
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '));
  });

  it("with AdSense, only the bold parts of §5.4 are added: 'unsafe-eval', https: and http: in script-src, https: in img-src, connect-src and frame-src", () => {
    const d = directives(buildAppCsp(NONCE, { ...OPTIONS, adsense: true }));
    expect(d.get('script-src')).toEqual(["'nonce-bm9uY2UtMQ=='", "'strict-dynamic'", "'sha256-theme='", "'unsafe-inline'", "'unsafe-eval'", 'https:', 'http:']);
    expect(d.get('img-src')).toEqual(["'self'", 'data:', 'blob:', 'https:']);
    expect(d.get('connect-src')).toEqual(["'self'", 'https://api.wordmet.com', 'https://cloudflareinsights.com', 'https:']);
    expect(d.get('frame-src')).toEqual(['https://challenges.cloudflare.com', 'https:']);
    // Everything else is as without AdSense.
    expect(d.get('default-src')).toEqual(["'self'"]);
    expect(d.get('base-uri')).toEqual(["'none'"]);
    expect(d.get('frame-ancestors')).toEqual(["'none'"]);
  });

  it('the nonce is in the policy once and is the one given; another nonce gives another policy', () => {
    expect(buildAppCsp(NONCE, OPTIONS).split(NONCE)).toHaveLength(2);
    expect(buildAppCsp('b3RoZXI=', OPTIONS)).not.toBe(buildAppCsp(NONCE, OPTIONS));
  });

  it('a build served over plain http (the local e2e) does not upgrade its own requests; no API origin leaves connect-src without it', () => {
    expect(directives(buildAppCsp(NONCE, { ...OPTIONS, dev: true })).has('upgrade-insecure-requests')).toBe(false);
    expect(directives(buildAppCsp(NONCE, { ...OPTIONS, apiOrigin: null })).get('connect-src')).toEqual(["'self'", 'https://cloudflareinsights.com']);
  });

  it('there is no host list for scripts to lean on: strict-dynamic ignores it, so Turnstile and the beacon are loaded by a script that has the nonce', () => {
    expect(buildAppCsp(NONCE, OPTIONS)).not.toContain('challenges.cloudflare.com/turnstile');
    expect(directives(buildAppCsp(NONCE, OPTIONS)).get('script-src')).not.toContain('https://static.cloudflareinsights.com');
  });
});
