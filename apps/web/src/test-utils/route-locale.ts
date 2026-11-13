/**
 * The route's locale (`/vi/app…` or `/en/app…`) for tests that mock `next/navigation`: renderApp sets it from its `locale`, and the
 * mock's `useParams: () => ({ locale: testRoute.locale })` hands it to `useRouteLocale()`.
 */
export const testRoute: { locale: 'vi' | 'en' } = { locale: 'vi' };
