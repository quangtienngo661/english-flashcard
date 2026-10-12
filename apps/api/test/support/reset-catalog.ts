import { OWNER_SOURCE_ID } from '../../src/content/index.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

export async function resetCatalog(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Retired senses are outside both partial indexes, so unlinking cannot create a label conflict.
    await tx.sense.updateMany({ data: { state: 'retired' } });
    // Break replacement links before deleting senses protected by the self FK.
    await tx.sense.updateMany({ data: { replacesSenseId: null } });
    await tx.senseRevisionText.deleteMany();
    await tx.senseRevision.deleteMany();
    await tx.sense.deleteMany();
    await tx.entryLevel.deleteMany();
    await tx.entryVariant.deleteMany();
    await tx.entry.deleteMany();
    await tx.dataSource.deleteMany({ where: { kind: { not: 'owner' }, id: { not: OWNER_SOURCE_ID } } });
    // The seeded owner source, topics and topic names remain available to every suite.
  });
}
