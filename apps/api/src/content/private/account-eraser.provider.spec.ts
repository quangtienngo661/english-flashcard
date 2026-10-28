import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../../identity/deletion/account-eraser.js';
import { ContentAccountEraser } from './account-eraser.provider.js';

function setup() {
  const events: string[] = [];
  const tx = {
    $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      events.push(`lock:${String(values[0])}`);
      return 1;
    }),
    entry: { deleteMany: vi.fn(async () => { events.push('entries'); return { count: 2 }; }) },
    contextSentence: { deleteMany: vi.fn(async () => { events.push('sentences'); return { count: 5 }; }) },
  };
  const registry = new AccountDeletionRegistry();
  const instance = new ContentAccountEraser(registry);
  instance.onModuleInit();
  const eraser: AccountDataEraser = instance;
  return { tx, events, eraser, registry, client: tx as unknown as Prisma.TransactionClient };
}

describe('ContentAccountEraser (unit: statements only; cascades and the entries_clear_form_kind trigger are proven in the smoke)', () => {
  it('registers itself as the content eraser', () => {
    const { registry, eraser } = setup();
    for (const module of ['practice', 'learning', 'notifications', 'entitlements', 'ai'] as const) {
      registry.registerEraser({ module, erase: async () => {} });
    }
    expect(registry.erasers().find((e) => e.module === 'content')).toBe(eraser);
  });

  it("deletes only the user's private entries and context sentences, under the content.private lock", async () => {
    const { tx, events, eraser, client } = setup();
    await eraser.erase(client, 'user-1', 'anon-1', { checks: 'normal' });
    expect(events).toEqual(['lock:content.private:user-1', 'entries', 'sentences']);
    expect(tx.entry.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { scope: 'private', ownerUserId: 'user-1' } });
    expect(tx.contextSentence.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { userId: 'user-1' } });
  });

  it('is idempotent: a second run issues the same statements and does not fail', async () => {
    const { tx, eraser, client } = setup();
    tx.entry.deleteMany.mockResolvedValue({ count: 0 });
    await eraser.erase(client, 'user-1', 'anon-1', { checks: 'normal' });
    await eraser.erase(client, 'user-1', 'anon-2', { checks: 'skip' });
    expect(tx.entry.deleteMany).toHaveBeenCalledTimes(2);
  });
});
