import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../src/generated/prisma/client.js';
import { createIsolatedDatabase } from '../../support/isolated-database.js';

export interface IntegrationPrisma {
  prisma: PrismaClient;
  databaseUrl: string;
  close(): Promise<void>;
}

/**
 * Creates an isolated, migrated Postgres database and a PrismaClient wired identically to PrismaModule.forRoot.
 */
export async function createIntegrationPrisma(): Promise<IntegrationPrisma> {
  const databaseUrl = await createIsolatedDatabase();
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 10_000,
  });
  const prisma = new PrismaClient({ adapter });
  return {
    prisma,
    databaseUrl,
    close: async () => {
      await prisma.$disconnect();
    },
  };
}
