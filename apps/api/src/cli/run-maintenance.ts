import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { MaintenanceScheduler } from '../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../generated/prisma/client.js';

// Runs every registered maintenance job once (the hourly MaintenanceScheduler, by hand). Exit 0 even when a job fails:
// runAll only logs job errors, so callers check the data.
async function main(): Promise<void> {
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(loadConfig(process.env)));
    try {
      await app.get(MaintenanceScheduler).runAll();
      process.exitCode = 0;
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch {
    console.error('maintenance:run failed');
    process.exitCode = 1;
  }
}

await main();
