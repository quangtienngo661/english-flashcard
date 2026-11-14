import { DynamicModule, Module } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

export const PRISMA_CLIENT = 'PRISMA_CLIENT';

export interface PrismaModuleOptions {
  connectionString: string;
  /** Most connections the pool opens (T16). */
  poolMax: number;
  /** How long a query waits for a free connection before it fails, in ms (T16). */
  poolTimeoutMs: number;
}

@Module({})
export class PrismaModule {
  static forRoot(options: PrismaModuleOptions): DynamicModule {
    return {
      module: PrismaModule,
      global: true,
      providers: [
        {
          provide: PRISMA_CLIENT,
          useFactory: (): PrismaClient => {
            const adapter = new PrismaPg({
              connectionString: options.connectionString,
              max: options.poolMax,
              connectionTimeoutMillis: options.poolTimeoutMs,
            });
            return new PrismaClient({ adapter });
          },
        },
      ],
      exports: [PRISMA_CLIENT],
    };
  }
}
