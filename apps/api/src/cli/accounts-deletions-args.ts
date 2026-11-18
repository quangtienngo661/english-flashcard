import type { PrismaClient } from '../generated/prisma/client.js';
import type { AccountDeletionService, DeletionBy } from '../identity/deletion/account-deletion.service.js';
import type { DeletionJournalEntry } from '../identity/deletion/deletion-journal.js';

export type DeletionsCommand = { command: 'export'; out: string | null } | { command: 'seed-journal' }
  | { command: 'replay'; from: string | null; journal?: true };

const USAGE = 'Usage: accounts-deletions export [--out <file>] | seed-journal | replay [--journal] [--from <file>]';

/** `export [--out <file>]` or `replay [--from <file>]`; anything else is an error naming the usage. */
export function parseDeletionsArgs(argv: string[]): DeletionsCommand {
  const [command, flag, value, ...rest] = argv;
  if (command === 'seed-journal' && argv.length === 1) return { command };
  if (command === 'replay' && flag === '--journal') {
    if (argv.length === 2) return { command, from: null, journal: true };
    if (argv.length === 4 && value === '--from' && rest[0] && !rest[0].startsWith('--')) return { command, from: rest[0], journal: true };
    throw new Error(USAGE);
  }
  if (rest.length > 0 || (flag !== undefined && (!value || value.startsWith('--')))) throw new Error(USAGE);
  if (command === 'export' && (flag === undefined || flag === '--out')) return { command, out: value ?? null };
  if (command === 'replay' && (flag === undefined || flag === '--from')) return { command, from: value ?? null };
  throw new Error(USAGE);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BYS: readonly string[] = ['self', 'admin', 'cleanup'];

/** One JSON line per completed or pending deletion. One statement sees a consistent snapshot of both tables. */
export async function deletionEntries(prisma: PrismaClient): Promise<DeletionJournalEntry[]> {
  const rows = await prisma.$queryRaw<Array<{ userId: string; deletedAt: Date; by: DeletionBy }>>`
    SELECT user_id AS "userId", deleted_at AS "deletedAt", by FROM deleted_accounts
    UNION ALL
    SELECT id, deleting_since, deleting_by FROM users
    WHERE status = 'deleting' AND deleting_since IS NOT NULL AND deleting_by IS NOT NULL
    ORDER BY "deletedAt", "userId"`;
  return rows.map((row) => ({ user_id: row.userId, deleted_at: row.deletedAt.toISOString(), by: row.by }));
}

export async function exportDeletions(prisma: PrismaClient): Promise<string[]> {
  return (await deletionEntries(prisma)).map((entry) => JSON.stringify(entry));
}

/** Lines of a file written by `export`; blank lines are skipped, a bad line stops with its number (a half-read list would miss accounts). */
export function parseDeletionLines(text: string): Array<{ userId: string; by: DeletionBy | null }> {
  const out: Array<{ userId: string; by: DeletionBy | null }> = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === '') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`Line ${index + 1} is not JSON`);
    }
    const id = (parsed as { user_id?: unknown } | null)?.user_id;
    const by = (parsed as { by?: unknown } | null)?.by;
    if (typeof id !== 'string' || !UUID.test(id)) throw new Error(`Line ${index + 1} has no valid user_id`);
    out.push({ userId: id.toLowerCase(), by: typeof by === 'string' && BYS.includes(by) ? (by as DeletionBy) : null });
  });
  return out;
}

export type ReplayResult = { replayed: number; withoutRow: number; pending: string[] };

/**
 * After a restore from backup (D21): every id from the file and from `deleted_accounts` whose `users` row came back is deleted again
 * in `replay` mode, which skips the conditions and the mail. Ids that end `pending` are returned so the operator runs the command again.
 */
export async function replayDeletions(
  prisma: PrismaClient, deletion: Pick<AccountDeletionService, 'delete'>, fromFile: Array<{ userId: string; by: DeletionBy | null }>,
): Promise<ReplayResult> {
  const known = await prisma.deletedAccount.findMany({ select: { userId: true, by: true } });
  const byId = new Map<string, DeletionBy>(known.map((row) => [row.userId, row.by as DeletionBy]));
  for (const line of fromFile) if (line.by !== null || !byId.has(line.userId)) byId.set(line.userId, line.by ?? 'admin');
  const ids = [...byId.keys()];
  const result: ReplayResult = { replayed: 0, withoutRow: 0, pending: [] };
  for (let start = 0; start < ids.length; start += 1000) {
    const batch = ids.slice(start, start + 1000);
    const present = await prisma.user.findMany({ where: { id: { in: batch } }, select: { id: true } });
    result.withoutRow += batch.length - present.length;
    for (const { id: userId } of present) {
      const outcome = await deletion.delete({ userId, by: byId.get(userId)!, mode: 'replay' });
      if (outcome === 'done') result.replayed += 1;
      else result.pending.push(userId);
    }
  }
  return result;
}
