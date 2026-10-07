import { describe, expect, it } from 'vitest';
import { fakeRequestUserMiddleware } from './fake-request-user.middleware.js';

describe('fakeRequestUserMiddleware', () => {
  it('sets req.user from the X-Test-User-Id header', () => {
    const req = { headers: { 'x-test-user-id': 'user-123' } } as any;
    fakeRequestUserMiddleware(req, {} as any, () => {});
    expect(req.user).toEqual({ userId: 'user-123', sessionChainId: 'fake-session' });
  });
});
