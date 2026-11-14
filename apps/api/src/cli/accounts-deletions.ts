import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { runWithOperationId } from '../common/logging/request-context.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { AccountDeletionService } from '../identity/deletion/account-deletion.service.js';
import { exportDeletions, parseDeletionLines, parseDeletionsArgs, replayDeletions } from './accounts-deletions-args.js';

// pnpm accounts:export-deletions [--out <file>]   : the deleted accounts as JSON lines (keep the file outside the database)
// pnpm accounts:replay-deletions [--from <file>]  : after a restore from backup, delete again every account that came back
async function main(): Promise<void> {
  let command;
  try {
    command = parseDeletionsArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
    return;
  }
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(loadConfig(process.env)));
    try {
      const prisma = app.get<PrismaClient>(PRISMA_CLIENT);
      if (command.command === 'export') {
        const lines = await exportDeletions(prisma);
        if (command.out) writeFileSync(command.out, lines.map((line) => line + '\n').join(''));
        else for (const line of lines) console.log(line);
        console.error(`${lines.length} deleted accounts`);
      } else {
        const fromFile = command.from ? parseDeletionLines(readFileSync(command.from, 'utf8')) : [];
        const result = await runWithOperationId(randomUUID(), () => replayDeletions(prisma, app.get(AccountDeletionService), fromFile));
        console.log(`replayed ${result.replayed}, without a users row ${result.withoutRow}, pending ${result.pending.length}`);
        for (const id of result.pending) console.log(`pending ${id}`);
        // Pending ids are left `deleting`: run the command again (recorded in the deploy checklist).
        process.exitCode = result.pending.length === 0 ? 0 : 2;
      }
    } finally {
      try {
        await app.get<PrismaClient>(PRISMA_CLIENT).$disconnect();
      } finally {
        await app.close();
      }
    }
  } catch (error) {
    console.error(`accounts-deletions failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  }
}

await main();
