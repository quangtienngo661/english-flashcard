import { resolveApiBaseUrl } from './resolve-api-base-url';

// The pure function lives in its own file so vite.config.ts can import it without `import.meta.env`.
export { resolveApiBaseUrl };

/** Public Turnstile site key, baked at build time (launch prep A, design 4.3). Blank: the forms use the fake widget, which only an API in `fake` mode accepts. */
export function turnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim();
}

export const apiBaseUrl: string = resolveApiBaseUrl(import.meta.env.MODE, import.meta.env.VITE_API_BASE_URL);
