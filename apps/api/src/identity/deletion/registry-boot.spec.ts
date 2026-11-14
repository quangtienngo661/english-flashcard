import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp, type TestApp } from '../../../test/support/create-test-app.js';
import { PRISMA_CLIENT, PrismaModule } from '../../common/db/prisma.module.js';
import { AccountDeletionRegistry, ERASE_ORDER } from './account-eraser.js';

describe('account deletion ports at start-up (B8E23: fail closed, so a missing one must show here)', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    vi.spyOn(PrismaModule, 'forRoot').mockReturnValue({ module: PrismaModule, global: true,
      providers: [{ provide: PRISMA_CLIENT, useValue: { $disconnect: async () => {} } }], exports: [PRISMA_CLIENT] });
    ctx = await createTestApp({ databaseUrl: 'unused' });
  });
  afterAll(async () => { await ctx?.close(); vi.restoreAllMocks(); });

  it('the app registers all six erasers in ERASE_ORDER, the precondition and the settings reader', () => {
    const registry = ctx.app.get(AccountDeletionRegistry, { strict: false });
    expect(registry.erasers().map(({ module }) => module)).toEqual([...ERASE_ORDER]);
    expect(registry.precondition().renewing).toBeTypeOf('function');
    expect(registry.settings().transactionRetentionYears).toBeTypeOf('function');
  });
});
