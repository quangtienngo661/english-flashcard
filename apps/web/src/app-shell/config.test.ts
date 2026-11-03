import { afterEach, vi } from 'vitest';
import { assertApiBaseUrl, serverApiBaseUrl } from './config';

afterEach(() => vi.unstubAllEnvs());

describe('assertApiBaseUrl (design §4.2)', () => {
  it('production site: the API host must start with api.', () => {
    expect(() => assertApiBaseUrl('https://wordmet.com', 'http://localhost:3000')).toThrow(/api\./);
    expect(assertApiBaseUrl('https://wordmet.com', 'https://api.wordmet.com')).toBe('https://api.wordmet.com');
  });

  it('local and e2e builds keep a localhost API', () => {
    expect(assertApiBaseUrl('http://localhost:3100', 'http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('requires an absolute http(s) URL', () => {
    expect(() => assertApiBaseUrl('http://localhost:3100', undefined)).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
    expect(() => assertApiBaseUrl('http://localhost:3100', '/api')).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
    expect(() => assertApiBaseUrl('http://localhost:3100', 'ftp://x.test')).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it('drops a trailing slash', () => {
    expect(assertApiBaseUrl('http://localhost:3100', 'http://localhost:3000/')).toBe('http://localhost:3000');
  });
});

describe('serverApiBaseUrl (where the server reads the API, which may differ from the address the browser uses)', () => {
  it('is the public API origin when no internal one is set, or it is blank', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.wordmet.com/');
    vi.stubEnv('API_INTERNAL_BASE_URL', undefined);
    expect(serverApiBaseUrl()).toBe('https://api.wordmet.com');
    vi.stubEnv('API_INTERNAL_BASE_URL', '  ');
    expect(serverApiBaseUrl()).toBe('https://api.wordmet.com');
  });

  it('is the internal origin when one is set, without a trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3000');
    vi.stubEnv('API_INTERNAL_BASE_URL', 'http://api:3000/');
    expect(serverApiBaseUrl()).toBe('http://api:3000');
  });
});
