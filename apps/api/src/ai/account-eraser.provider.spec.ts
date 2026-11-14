import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { AccountDeletionRegistry } from '../identity/deletion/account-eraser.js';
import { AiAccountEraser } from './account-eraser.provider.js';
import type { AiService } from './ai.service.js';

describe('AiAccountEraser', () => {
  it('passes the transaction to AiService.deleteUserData', async () => {
    const deleteUserData = vi.fn(async () => undefined);
    const tx = {} as Prisma.TransactionClient;
    const eraser = new AiAccountEraser(new AccountDeletionRegistry(), { deleteUserData } as unknown as AiService);
    await eraser.erase(tx, 'u1');
    expect(deleteUserData).toHaveBeenCalledExactlyOnceWith('u1', tx);
  });
});
