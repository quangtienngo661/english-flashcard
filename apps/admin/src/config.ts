import { resolveApiBaseUrl } from './resolve-api-base-url';

// The pure function lives in its own file so vite.config.ts can import it without `import.meta.env`.
export { resolveApiBaseUrl };

export const apiBaseUrl: string = resolveApiBaseUrl(import.meta.env.MODE, import.meta.env.VITE_API_BASE_URL);
