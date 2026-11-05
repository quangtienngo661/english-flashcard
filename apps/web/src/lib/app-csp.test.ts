import { NextRequest, NextResponse } from 'next/server';
import { isAppPath, nonceFromPolicy, withAppCsp } from './app-csp';

const request = (path: string) => new NextRequest(`http://localhost:3100${path}`);
const nonceOf = (policy: string | null) => /'nonce-([^']+)'/.exec(policy ?? '')?.[1] ?? null;

/** What the i18n middleware is in production, reduced to what matters here: it sees a request and answers a response. */
function run(path: string) {
  const seen: NextRequest[] = [];
  const response = withAppCsp(request(path), (incoming) => {
    seen.push(incoming);
    return NextResponse.next();
  });
  return { response, seen: seen[0], policy: response.headers.get('content-security-policy') };
}

describe('withAppCsp: the nonce policy of /app (launch prep B design §5.4, LB3E6, LB3E7)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('isAppPath: /vi/app, /en/app and what is under them; not /vi/apple, the landing or the legal pages', () => {
    for (const path of ['/vi/app', '/en/app', '/vi/app/groups', '/en/app/lookup', '/vi/app/login']) expect(isAppPath(path), path).toBe(true);
    for (const path of ['/', '/vi', '/en', '/vi/apple', '/vi/terms', '/vi/privacy', '/app', '/fr/app']) expect(isAppPath(path), path).toBe(false);
  });

  it('LB3E7: every /app page answers with a policy that has a nonce and strict-dynamic', () => {
    for (const path of ['/vi/app', '/vi/app/login', '/vi/app/groups', '/en/app/lookup']) {
      const { policy } = run(path);
      expect(policy, path).toContain("'strict-dynamic'");
      expect(nonceOf(policy), path).toMatch(/^[A-Za-z0-9+/=]{16,}$/);
      expect(policy, path).toContain("frame-ancestors 'none'");
    }
  });

  it('two requests to the same page get two nonces', () => {
    const first = nonceOf(run('/vi/app/groups').policy);
    const second = nonceOf(run('/vi/app/groups').policy);
    expect(first).not.toBeNull();
    expect(first).not.toBe(second);
  });

  it('the same policy is on the request the page is rendered from (that is where Next reads the nonce it stamps on its scripts) and on the response', () => {
    const { seen, policy } = run('/vi/app/groups');
    expect(policy).not.toBeNull();
    expect(seen.headers.get('content-security-policy')).toBe(policy);
    expect(seen.nextUrl.pathname).toBe('/vi/app/groups');
  });

  it('the landing, the legal pages and /vi/apple get nothing from here: their policy is the one of next.config.ts, and the request is passed on as it came', () => {
    for (const path of ['/vi', '/en', '/vi/terms', '/vi/privacy', '/vi/apple']) {
      const { policy, seen } = run(path);
      expect(policy, path).toBeNull();
      expect(seen.headers.get('content-security-policy'), path).toBeNull();
    }
  });

  it('outside a production build (next dev) it sets nothing: the dev server needs eval and sockets the policy would refuse', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(run('/vi/app/groups').policy).toBeNull();
  });

  it('a response that is a redirect keeps its status; the policy is on it too and does no harm', () => {
    const response = withAppCsp(request('/vi/app'), () => NextResponse.redirect('http://localhost:3100/vi/app/login', 307));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3100/vi/app/login');
  });
});

describe('nonceFromPolicy', () => {
  it('reads the nonce a policy carries; none for a policy without one, a missing header or an empty one', () => {
    expect(nonceFromPolicy("default-src 'self'; script-src 'nonce-bm9uY2U=' 'strict-dynamic'")).toBe('bm9uY2U=');
    expect(nonceFromPolicy("default-src 'self'; script-src 'self'")).toBeUndefined();
    expect(nonceFromPolicy(null)).toBeUndefined();
    expect(nonceFromPolicy(undefined)).toBeUndefined();
    expect(nonceFromPolicy('')).toBeUndefined();
  });
});
