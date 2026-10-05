import { DynamicModule, Module } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const DRIZZLE_DB = 'DRIZZLE_DB';

export interface DrizzleModuleOptions {
  connectionString: string;
}

@Module({})
export class DrizzleModule {
  static forRoot(options: DrizzleModuleOptions): DynamicModule {
    return {
      module: DrizzleModule,
      global: true,
      providers: [
        {
          provide: DRIZZLE_DB,
          useFactory: (): NodePgDatabase => {
            const pool = new Pool({ connectionString: options.connectionString });
            return drizzle(pool);
          },
        },
      ],
      exports: [DRIZZLE_DB],
    };
  }
}
