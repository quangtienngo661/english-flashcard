import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EntitlementsService } from './entitlements.service.js';

describe('EntitlementsService', () => {
  it('D25: practice.basic is allowed for any user id', async () => {
    const service = new EntitlementsService();
    for (const userId of [randomUUID(), randomUUID()]) {
      expect(await service.check(userId, 'practice.basic')).toEqual({ allowed: true });
    }
  });
});
