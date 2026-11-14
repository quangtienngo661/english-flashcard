// Response headers for every apps/web path besides the Content-Security-Policy, which `buildCsp` makes per build
// (launch prep A, design 4.4). `poweredByHeader: false` in next.config.ts already drops X-Powered-By.
export function securityHeaders(): Array<{ key: string; value: string }> {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}
