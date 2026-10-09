import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { pickLocale, readCountry } from './i18n/pick-locale';
import { LOCALE_COOKIE, routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// Only "/" picks a locale by cookie, country and Accept-Language (spec §4.1); /vi and /en never redirect.
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== '/') return handleI18nRouting(request);

  const locale = pickLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    country: readCountry(request.headers),
    acceptLanguage: request.headers.get('accept-language'),
  });
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}`;
  const response = NextResponse.redirect(url, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Accept-Language');
  return response;
}

export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
