// Content-Security-Policy for every apps/web path (design §4.6, D9). D22: Cloudflare Web Analytics is the only third party.
const CF_BEACON_SCRIPT = 'https://static.cloudflareinsights.com';
const CF_BEACON_CONNECT = 'https://cloudflareinsights.com';

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
    ['script-src', ["'self'", ...hashes, CF_BEACON_SCRIPT, ...unsafeInline, ...(dev ? ["'unsafe-eval'"] : [])]],
    ['style-src', ["'self'", ...unsafeInline]],
    ['img-src', ["'self'", 'data:', 'blob:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(apiOrigin ? [apiOrigin] : []), CF_BEACON_CONNECT]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  if (!dev) directives.push(['upgrade-insecure-requests', []]);
  return directives.map(([name, values]) => [name, ...values].join(' ')).join('; ');
}
