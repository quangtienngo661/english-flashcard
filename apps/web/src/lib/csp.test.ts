import { buildCsp } from './csp';

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
