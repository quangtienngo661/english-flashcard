import type { PrismaClient } from '../generated/prisma/client.js';
import type { AccountDeletionService, DeletionBy } from '../identity/deletion/account-deletion.service.js';

export type DeletionsCommand = { command: 'export'; out: string | null } | { command: 'replay'; from: string | null };

const USAGE = 'Usage: accounts-deletions export [--out <file>] | replay [--from <file>]';

/** `export [--out <file>]` or `replay [--from <file>]`; anything else is an error naming the usage. */
export function parseDeletionsArgs(argv: string[]): DeletionsCommand {
  const [command, flag, value, ...rest] = argv;
  if (rest.length > 0 || (flag !== undefined && value === undefined)) throw new Error(USAGE);
  if (command === 'export' && (flag === undefined || flag === '--out')) return { command, out: value ?? null };
  if (command === 'replay' && (flag === undefined || flag === '--from')) return { command, from: value ?? null };
  throw new Error(USAGE);
}

export type DeletionLine = { user_id: string; deleted_at: string; by: DeletionBy };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BYS: readonly string[] = ['self', 'admin', 'cleanup'];

/** One JSON line per deleted account: the list an operator keeps outside the database (design §7.5, D21). */
export async function exportDeletions(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.deletedAccount.findMany({ orderBy: [{ deletedAt: 'asc' }, { userId: 'asc' }] });
  return rows.map((row) => JSON.stringify({ user_id: row.userId, deleted_at: row.deletedAt.toISOString(), by: row.by as DeletionBy } satisfies DeletionLine));
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
  const present = new Set((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((row) => row.id));
  const result: ReplayResult = { replayed: 0, withoutRow: ids.length - present.size, pending: [] };
  for (const userId of ids.filter((id) => present.has(id))) {
    const outcome = await deletion.delete({ userId, by: byId.get(userId)!, mode: 'replay' });
    if (outcome === 'done') result.replayed += 1;
    else result.pending.push(userId);
  }
  return result;
}
