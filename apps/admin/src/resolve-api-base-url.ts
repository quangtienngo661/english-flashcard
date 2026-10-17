// Spec §4: the admin app talks to `admin-api.<domain>` in production, never `api.<domain>`
// (the host-only refresh cookie of `api.` would otherwise be overwritten).
export function resolveApiBaseUrl(mode: string, raw: string | undefined): string {
  const fail = (why: string): never => {
    throw new Error(`VITE_API_BASE_URL ${why} (got ${JSON.stringify(raw ?? null)})`);
  };
  if (!raw) return fail('is required');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail('must be an absolute http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return fail('must be an absolute http(s) URL');
  if (mode === 'production' && !url.hostname.startsWith('admin-api.')) {
    return fail('must have a host starting with "admin-api." in a production build');
  }
  return raw.replace(/\/+$/, '');
}
