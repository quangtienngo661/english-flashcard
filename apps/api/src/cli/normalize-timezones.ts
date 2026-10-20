import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { normalizeTimezones } from './normalize-timezones-run.js';

// `pnpm db:normalize-timezones`: one-off rewrite of the zones stored before they were canonicalised (C2). Prints
// `{ scanned, changed }` and nothing else: no email, no zone. Exit 0 on success, 1 on any failure.
async function main(): Promise<void> {
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    // Only errors from Nest itself, so stdout carries nothing but the result.
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(loadConfig(process.env)), { logger: ['error'] });
    try {
      console.log(await normalizeTimezones(app.get<PrismaClient>(PRISMA_CLIENT)));
      process.exitCode = 0;
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch {
    console.error('db:normalize-timezones failed');
    process.exitCode = 1;
  }
}

await main();
