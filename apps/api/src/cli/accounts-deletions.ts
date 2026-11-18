import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { AppModule } from '../app.module.js';
import { loadConfig } from '../common/config/app-config.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { runWithOperationId } from '../common/logging/request-context.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { AccountDeletionService } from '../identity/deletion/account-deletion.service.js';
import { DeletionJournal } from '../identity/deletion/deletion-journal.js';
import { deletionEntries, exportDeletions, parseDeletionLines, parseDeletionsArgs, replayDeletions } from './accounts-deletions-args.js';

// pnpm accounts:export-deletions [--out <file>]   : the deleted accounts as JSON lines (keep the file outside the database)
// pnpm accounts:seed-deletion-journal           : initialize the bucket from the current DB while deletion writers are stopped
// pnpm accounts:replay-deletions --journal [--from <file>] : after restore, delete again every account that came back
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
    const config = loadConfig(process.env);
    const app = await NestFactory.createApplicationContext(AppModule.forRoot(config));
    try {
      const prisma = app.get<PrismaClient>(PRISMA_CLIENT);
      if (command.command === 'export') {
        const lines = await exportDeletions(prisma);
        if (command.out) writeFileSync(command.out, lines.map((line) => line + '\n').join(''));
        else for (const line of lines) console.log(line);
        console.error(`${lines.length} deleted accounts`);
      } else if (command.command === 'seed-journal') {
        const entries = await deletionEntries(prisma);
        await app.get(DeletionJournal).seed(entries);
        console.log(`initialized deletion journal from ${entries.length} database records`);
      } else {
        const fromFile = command.from ? parseDeletionLines(readFileSync(command.from, 'utf8')) : [];
        const journal = app.get(DeletionJournal);
        const saved = command.journal || journal.enabled || config.billing.production ? await journal.readAll() : [];
        const entries = [...fromFile, ...saved.map((entry) => ({ userId: entry.user_id, by: entry.by }))];
        console.log(`read ${saved.length} journal records and ${fromFile.length} file records`);
        const result = await runWithOperationId(randomUUID(), () => replayDeletions(prisma, app.get(AccountDeletionService), entries));
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
