import { assertApiBaseUrl } from './config';

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
