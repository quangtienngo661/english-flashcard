import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { runWithOperationId } from '../common/logging/request-context.js';
import { AudioService } from '../content/audio/audio.service.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { runTtsBackfill } from './tts-backfill-run.js';

// `pnpm tts:backfill` (round C, design §5.6): queues the recordings of every catalog sense on show. Run it once after the import of the
// transcriptions and the bulk publish; the worker makes the recordings (see the "Đợt C" part of docs/deliveries/deploy-checklist.md).
async function main(): Promise<void> {
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(loadConfig(process.env)));
    try {
      const prisma = app.get<PrismaClient>(PRISMA_CLIENT);
      const audio = app.get(AudioService);
      const rows = audio.enabled
        ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT s.id::text AS id FROM senses s JOIN entries e ON e.id = s.entry_id
          WHERE s.state = 'open' AND s.live_revision_id IS NOT NULL AND e.scope = 'catalog' AND e.language = 'en'
          ORDER BY e.lemma, s.id`
        : [];
      const result = await runWithOperationId(randomUUID(), () => runTtsBackfill({
        audio, senseIds: rows.map((row) => row.id), log: (line) => { console.log(line); },
      }));
      process.exitCode = result.exitCode;
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch {
    console.error('tts:backfill failed');
    process.exitCode = 1;
  }
}

await main();
