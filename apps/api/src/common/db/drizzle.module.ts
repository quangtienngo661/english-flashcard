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
            // node-postgres requires an 'error' listener on the pool — without one, an error on a
            // connection the server terminates on its own (e.g. transaction_timeout firing) crashes
            // the process instead of just rejecting the in-flight query, which already happens
            // correctly on its own.
            pool.on('error', () => {});
            return drizzle(pool);
          },
        },
      ],
      exports: [DRIZZLE_DB],
    };
  }
}
