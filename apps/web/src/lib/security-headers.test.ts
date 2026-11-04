import { securityHeaders } from './security-headers';

describe('securityHeaders (launch prep A, design 4.4)', () => {
  it('LA1#13: exactly these three headers, word for word', () => {
    expect(securityHeaders()).toEqual([
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]);
  });

  it('leaves Content-Security-Policy to buildCsp, which depends on the build', () => {
    expect(securityHeaders().map((header) => header.key)).not.toContain('Content-Security-Policy');
  });
});
