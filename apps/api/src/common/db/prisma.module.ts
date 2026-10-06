import { DynamicModule, Module } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

export const PRISMA_CLIENT = 'PRISMA_CLIENT';

export interface PrismaModuleOptions {
  connectionString: string;
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
            const adapter = new PrismaPg({ connectionString: options.connectionString });
            return new PrismaClient({ adapter });
          },
        },
      ],
      exports: [PRISMA_CLIENT],
    };
  }
}
