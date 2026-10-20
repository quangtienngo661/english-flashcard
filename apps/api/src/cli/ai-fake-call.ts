import { NestFactory } from '@nestjs/core';
import { existsSync } from 'node:fs';
import { AiService } from '../ai/index.js';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { AI_FAKE_CALL_USAGE, parseAiFakeCallArgs, runAiFakeCalls } from './ai-fake-call-args.js';

// `pnpm ai:fake-call`: runs the AI gateway against the real database with the fake provider (design §17 item 2, R7).
// Exit 2 on bad arguments, 1 unless AI_FAKE_ENABLED (never on production, B6E45) or when the run fails. The AppLogger also
// writes JSON lines to stdout (one `ai_call` per provider call), so readers keep only lines whose kind is `ai_fake_call`.
async function main(): Promise<void> {
  const args = parseAiFakeCallArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(`${args.error}\n${AI_FAKE_CALL_USAGE}`);
    process.exitCode = 2;
    return;
  }
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const config = loadConfig(process.env);
    if (!config.ai.fakeEnabled) {
      console.error('ai:fake-call runs only with AI_FAKE_ENABLED=true');
      process.exitCode = 1;
      return;
    }
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(config), { logger: ['error'] });
    try {
      await runAiFakeCalls(app.get(AiService), args, (line) => console.log(line));
      process.exitCode = 0;
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch {
    console.error('ai:fake-call failed');
    process.exitCode = 1;
  }
}

await main();
