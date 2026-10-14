import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it.each([
    ['https://api.wordmet.com'],
    ['http://localhost:3000'],
    [undefined],
    [''],
    ['admin-api.wordmet.com'],
  ])('B25#20: production rejects %s with a message naming VITE_API_BASE_URL', (raw) => {
    expect(() => resolveApiBaseUrl('production', raw)).toThrow(/VITE_API_BASE_URL/);
  });

  it('production accepts https://admin-api.wordmet.com/ and returns it without the trailing slash', () => {
    expect(resolveApiBaseUrl('production', 'https://admin-api.wordmet.com/')).toBe('https://admin-api.wordmet.com');
  });

  it.each(['development', 'test', 'e2e'])('%s accepts http://localhost:3000', (mode) => {
    expect(resolveApiBaseUrl(mode, 'http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('non-production modes still require an absolute http(s) URL', () => {
    expect(() => resolveApiBaseUrl('development', undefined)).toThrow(/VITE_API_BASE_URL/);
    expect(() => resolveApiBaseUrl('development', 'localhost:3000')).toThrow(/VITE_API_BASE_URL/);
  });
});
