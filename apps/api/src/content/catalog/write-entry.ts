import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import type { ContentService } from '../content.service.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

/**
 * Runs a write on one catalog entry under that entry's key lock (B2-8: the two admin controllers used to carry a copy each).
 * The immutable key is read before the transaction opens, so the transaction's first operation is the lock; each write method
 * checks again that the entry still exists after acquiring it. `notFound` builds the error of the caller's own style.
 */
export async function writeCatalogEntry<T>(
  prisma: PrismaClient, content: ContentService, entryId: string,
  write: (tx: Prisma.TransactionClient) => Promise<T>, notFound: () => Error,
): Promise<T> {
  const entry = await prisma.entry.findFirst({ where: { id: entryId, scope: 'catalog' }, select: { lemma: true, pos: true } });
  if (!entry) throw notFound();
  return prisma.$transaction(async (tx) => {
    await content.lockEntryKey(tx, entry.lemma, entry.pos);
    return write(tx);
  }, transactionOptions);
}
