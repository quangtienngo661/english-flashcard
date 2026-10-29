import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry, type AccountDataEraser } from '../identity/deletion/account-eraser.js';
import { LearningAccountEraser } from './account-eraser.provider.js';

describe('LearningAccountEraser (unit: statements only)', () => {
  it("locks the learner, then deletes only that user's log, activity days, items and groups; a second run is the same statements", async () => {
    const events: string[] = [];
    const del = (name: string) => ({ deleteMany: vi.fn(async () => { events.push(name); return { count: 0 }; }) });
    const tx = {
      $executeRaw: vi.fn(async (_s: TemplateStringsArray, ...v: unknown[]) => { events.push(`lock:${String(v[0])}`); return 1; }),
      learningLogEntry: del('log'), learningActivityDay: del('activity'), learningItem: del('items'), learningGroup: del('groups'),
    };
    const registry = new AccountDeletionRegistry();
    const instance = new LearningAccountEraser(registry);
    instance.onModuleInit();
    const eraser: AccountDataEraser = instance;
    await eraser.erase(tx as unknown as Prisma.TransactionClient, 'u1', 'anon', { checks: 'normal' });
    await eraser.erase(tx as unknown as Prisma.TransactionClient, 'u1', 'anon', { checks: 'normal' });
    expect(events.slice(0, 5)).toEqual(['lock:learning.user:u1', 'log', 'activity', 'items', 'groups']);
    expect(tx.learningItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.learningActivityDay.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(events).toHaveLength(10);
  });
});
