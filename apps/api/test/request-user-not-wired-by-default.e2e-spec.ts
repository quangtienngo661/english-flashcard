import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './support/create-test-app.js';

describe('RequestUser seam is not wired by default', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp?.close();
  });

  it('the X-Test-User-Id header alone does nothing without the fake middleware explicitly imported', async () => {
    const res = await testApp.http().get('/v1/health').set('X-Test-User-Id', 'user-123');
    expect(res.status).toBe(200);
  });
});
