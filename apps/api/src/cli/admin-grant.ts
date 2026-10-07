import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { runWithOperationId } from '../common/logging/request-context.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { StaffService } from '../identity/staff/staff.service.js';

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: pnpm admin:grant <email>');
    process.exitCode = 1;
    return;
  }
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(loadConfig(process.env)));
    try {
      const outcome = await runWithOperationId(randomUUID(), () => app.get(StaffService).grantAdminByEmail(email));
      console.log(outcome);
      if (outcome === 'not_found') console.log('register this email first');
      process.exitCode = outcome === 'granted' ? 0 : 1;
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch {
    console.error('admin:grant failed');
    process.exitCode = 1;
  }
}

await main();
