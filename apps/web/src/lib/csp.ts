// Content-Security-Policy for every apps/web path (design §4.6, D9). D22: Cloudflare Web Analytics is the only third party;
// since launch prep A, Cloudflare Turnstile is the second (also Cloudflare).
const CF_BEACON_SCRIPT = 'https://static.cloudflareinsights.com';
const CF_BEACON_CONNECT = 'https://cloudflareinsights.com';
// Turnstile (launch prep A, design 4.3): its script, and the iframe it draws the challenge in.
const CF_TURNSTILE = 'https://challenges.cloudflare.com';

// D20 fallback, on since Task 2 (22/10/2026): Next streams its RSC payload in inline `self.__next_f.push` scripts that 'self' + SRI blocks.
export const CSP_INLINE_FALLBACK = true;

type CspOptions = {
  apiOrigin: string | null;
  dev: boolean;
  inline: boolean;
  scriptHashes: string[];
};

export function buildCsp({ apiOrigin, dev, inline, scriptHashes }: CspOptions): string {
  const unsafeInline = inline ? ["'unsafe-inline'"] : [];
  // A hash in script-src makes browsers ignore 'unsafe-inline', so the fallback leaves the hashes out.
  const hashes = inline ? [] : scriptHashes;
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", ...hashes, CF_BEACON_SCRIPT, CF_TURNSTILE, ...unsafeInline, ...(dev ? ["'unsafe-eval'"] : [])]],
    ['style-src', ["'self'", ...unsafeInline]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(apiOrigin ? [apiOrigin] : []), CF_BEACON_CONNECT]],
    ['frame-src', [CF_TURNSTILE]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  if (!dev) directives.push(['upgrade-insecure-requests', []]);
  return directives.map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

type AppCspOptions = {
  /** True once an AdSense client is set at build time: only then are the broader sources Google's own header asks for added (design §5.4). */
  adsense: boolean;
  apiOrigin: string | null;
  /** A production build served over plain http (local e2e on :3100) must not upgrade its own requests to https. */
  dev: boolean;
  /** The hash of the theme script in the layout, quotes included (`THEME_SCRIPT_HASH`). */
  themeHash: string;
};

/**
 * The policy of `/app` (launch prep B design §5.4, DB39), made for one request: the nonce is in it once, and 'strict-dynamic' lets a script that
 * carries it load others, so no host list is needed (the browser ignores host names under it). That is how Turnstile and the beacon are loaded.
 * Landing, `/terms` and `/privacy` keep `buildCsp`. 'unsafe-inline' and `https:`/`http:` only matter to a browser too old to know nonces.
 */
export function buildAppCsp(nonce: string, { adsense, apiOrigin, dev, themeHash }: AppCspOptions): string {
  const more = adsense ? ['https:'] : [];
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', [`'nonce-${nonce}'`, "'strict-dynamic'", themeHash, "'unsafe-inline'", ...(adsense ? ["'unsafe-eval'", 'https:', 'http:'] : [])]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', ...more]],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(apiOrigin ? [apiOrigin] : []), CF_BEACON_CONNECT, ...more]],
    ['frame-src', [CF_TURNSTILE, ...more]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'none'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  if (!dev) directives.push(['upgrade-insecure-requests', []]);
  return directives.map(([name, values]) => [name, ...values].join(' ')).join('; ');
}
