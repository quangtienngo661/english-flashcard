import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry } from '../identity/deletion/account-eraser.js';
import { NotificationsAccountEraser } from './account-eraser.provider.js';

describe('NotificationsAccountEraser (unit: statements only)', () => {
  it("deletes only that user's deliveries and preferences; a second run does not fail", async () => {
    const tx = {
      reminderDelivery: { deleteMany: vi.fn(async () => ({ count: 4 })) },
      reminderPref: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    };
    const eraser = new NotificationsAccountEraser(new AccountDeletionRegistry());
    await eraser.erase(tx as unknown as Prisma.TransactionClient, 'u1');
    await eraser.erase(tx as unknown as Prisma.TransactionClient, 'u1');
    expect(tx.reminderDelivery.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.reminderPref.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.reminderPref.deleteMany).toHaveBeenCalledTimes(2);
  });
});
