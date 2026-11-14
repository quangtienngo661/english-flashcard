import { describe, expect, it, vi } from 'vitest';
import type { ContentService } from '../content.service.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { writeCatalogEntry } from './write-entry.js';

function setup(entry: { lemma: string; pos: string } | null) {
  const order: string[] = [];
  const tx = { marker: 'tx' };
  const prisma = {
    entry: { findFirst: vi.fn(async () => entry) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown, options: unknown) => { order.push(`tx:${JSON.stringify(options)}`); return fn(tx); }),
  } as unknown as PrismaClient;
  const content = { lockEntryKey: vi.fn(async () => { order.push('lock'); }) } as unknown as ContentService;
  return { prisma, content, tx, order };
}

describe('writeCatalogEntry (B2-8)', () => {
  it('looks the key up before the transaction, makes the lock its first operation, then runs the write on the same tx and returns its result', async () => {
    const { prisma, content, tx, order } = setup({ lemma: 'run', pos: 'verb' });
    const write = vi.fn(async () => { order.push('write'); return 'done'; });

    await expect(writeCatalogEntry(prisma, content, 'e1', write, () => new Error('missing'))).resolves.toBe('done');

    expect(prisma.entry.findFirst).toHaveBeenCalledWith({ where: { id: 'e1', scope: 'catalog' }, select: { lemma: true, pos: true } });
    expect(content.lockEntryKey).toHaveBeenCalledWith(tx, 'run', 'verb');
    expect(write).toHaveBeenCalledWith(tx);
    expect(order).toEqual(['tx:{"timeout":10000,"maxWait":5000}', 'lock', 'write']);
  });

  it('an entry that is not in the catalog throws the error the caller built, and nothing is locked or written', async () => {
    const { prisma, content } = setup(null);
    const write = vi.fn();
    const missing = new Error('missing');

    await expect(writeCatalogEntry(prisma, content, 'e1', write, () => missing)).rejects.toBe(missing);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(content.lockEntryKey).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
