import { NextRequest, type NextResponse } from 'next/server';
import { THEME_SCRIPT_HASH } from '../app-shell/theme/theme-script';
import { buildAppCsp } from './csp';

/** `/vi/app`, `/en/app` and everything under them; not `/vi/apple`. */
export const isAppPath = (pathname: string): boolean => /^\/(?:vi|en)\/app(?:\/|$)/.test(pathname);

/** The nonce a policy carries (`'nonce-…'`), or undefined when it has none (a development server, a path outside `/app`). */
export function nonceFromPolicy(policy: string | null | undefined): string | undefined {
  return /'nonce-([^']+)'/.exec(policy ?? '')?.[1];
}

/** The origin of the API the browser calls (`connect-src`), from the same variable the build checks; null when it is not a URL. */
function apiOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? '').origin;
  } catch {
    return null;
  }
}

/**
 * Puts the per-request policy of `/app` on the request the page is rendered from (Next reads the nonce there and stamps it on its scripts) and
 * on the response (launch prep B design §5.4). Anything outside `/app`, and any build that is not a production build, is passed on untouched:
 * `next dev` needs eval and sockets the policy refuses. The middleware calls this with the i18n handler passed in.
 */
export function withAppCsp(request: NextRequest, next: (request: NextRequest) => NextResponse): NextResponse {
  if (process.env.NODE_ENV !== 'production' || !isAppPath(request.nextUrl.pathname)) return next(request);
  const nonce = btoa(crypto.randomUUID());
  const policy = buildAppCsp(nonce, {
    // Read at call time: the build inlines the variables.
    adsense: Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT),
    apiOrigin: apiOrigin(),
    dev: !(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').startsWith('https://'),
    themeHash: THEME_SCRIPT_HASH,
  });
  const headers = new Headers(request.headers);
  headers.set('Content-Security-Policy', policy);
  const response = next(new NextRequest(request, { headers }));
  response.headers.set('Content-Security-Policy', policy);
  return response;
}
