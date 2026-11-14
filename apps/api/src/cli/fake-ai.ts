import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { EntitlementsService } from '../entitlements/index.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { FAKE_AI_USAGE, parseFakeAiArgs, runFakeAiCalls } from './fake-ai-args.js';

// `pnpm entitlements:fake-ai`: calls the AI unit ledger against the real database, as Bước 7 will (design §17 item 2).
// Exit 2 on bad arguments, 1 unless BILLING_FAKE_ENABLED (never on production, plan choice 1) or when the run fails.
async function main(): Promise<void> {
  const args = parseFakeAiArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(`${args.error}\n${FAKE_AI_USAGE}`);
    process.exitCode = 2;
    return;
  }
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const config = loadConfig(process.env);
    if (!config.billing.fakeEnabled) {
      console.error('entitlements:fake-ai runs only with BILLING_FAKE_ENABLED=true');
      process.exitCode = 1;
      return;
    }
    // Only errors from Nest itself, so stdout carries nothing but the JSON lines.
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(config), { logger: ['error'] });
    try {
      await runFakeAiCalls(app.get(EntitlementsService), args, (line) => console.log(line));
      process.exitCode = 0;
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch {
    console.error('entitlements:fake-ai failed');
    process.exitCode = 1;
  }
}

await main();
