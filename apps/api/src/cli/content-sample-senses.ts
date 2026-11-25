import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Proportional allocation by the largest-remainder method, always summing exactly to
 * `target = Math.min(total, sum(counts))` (each level capped at its available count).
 *
 * Rule for `minPerLevel`: the per-level minimum (or a level's full count when smaller) is
 * applied ONLY when `activeLevels.length * minPerLevel <= target`. Otherwise (for example
 * 7 active levels with `total = 30` and `minPerLevel = 5`), allocation falls back to plain
 * proportional largest-remainder allocation so the exact sum is preserved without distorting
 * large levels. Remainder ties are broken deterministically by input order.
 */
export function allocate(
  countsByLevel: Record<string, number>,
  total = 100,
  minPerLevel = 5,
): Record<string, number> {
  const entries = Object.entries(countsByLevel).filter(([, count]) => count > 0);
  if (entries.length === 0 || total <= 0) return {};

  const available = entries.reduce((sum, [, count]) => sum + count, 0);
  const target = Math.min(total, available);
  const effectiveMin = entries.length * minPerLevel <= target ? minPerLevel : 0;

  const locked = new Map<string, number>();
  let unlocked = entries.map(([level, count]) => ({ level, count }));

  while (unlocked.length > 0) {
    const lockedSum = [...locked.values()].reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, target - lockedSum);
    const unlockedCount = unlocked.reduce((a, b) => a + b.count, 0);
    let changed = false;

    const nextUnlocked: typeof unlocked = [];
    for (const item of unlocked) {
      const floor = Math.min(item.count, effectiveMin);
      const exact = unlockedCount > 0 ? (item.count / unlockedCount) * remaining : 0;
      if (exact < floor) {
        locked.set(item.level, floor);
        changed = true;
      } else if (exact > item.count) {
        locked.set(item.level, item.count);
        changed = true;
      } else {
        nextUnlocked.push(item);
      }
    }
    unlocked = nextUnlocked;
    if (!changed) break;
  }

  const result: Record<string, number> = {};
  for (const [level] of entries) result[level] = locked.get(level) ?? 0;

  if (unlocked.length > 0) {
    const lockedSum = [...locked.values()].reduce((a, b) => a + b, 0);
    const remaining = Math.max(0, target - lockedSum);
    const unlockedCount = unlocked.reduce((a, b) => a + b.count, 0);
    const shares = unlocked.map((item, idx) => {
      const exact = unlockedCount > 0 ? (item.count / unlockedCount) * remaining : 0;
      const base = Math.floor(exact);
      return { level: item.level, count: item.count, base, remainder: exact - base, idx };
    });
    let assigned = shares.reduce((sum, s) => sum + s.base, 0);
    for (const s of shares) result[s.level] = s.base;

    const byRemainder = [...shares].sort((a, b) => (b.remainder !== a.remainder ? b.remainder - a.remainder : a.idx - b.idx));
    for (const s of byRemainder) {
      if (assigned >= remaining) break;
      if (result[s.level] < s.count) {
        result[s.level] += 1;
        assigned += 1;
      }
    }
  }

  return result;
}

type SampleRow = {
  sense_id: string;
  lemma: string;
  pos: string;
  cefr: string;
  meaning_vi: string;
  example: string;
  reviewed_by_set: boolean;
  published_at: Date | null;
};

function csvCell(value: string | boolean): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleByLevel(rows: SampleRow[], total: number): SampleRow[] {
  if (rows.length === 0 || total <= 0) return [];
  const byLevel = new Map<string, SampleRow[]>();
  for (const row of rows) {
    const list = byLevel.get(row.cefr) ?? [];
    list.push(row);
    byLevel.set(row.cefr, list);
  }
  const counts: Record<string, number> = {};
  for (const [level, list] of byLevel) counts[level] = list.length;
  const plan = allocate(counts, total, 5);
  const picked: SampleRow[] = [];
  for (const [level, take] of Object.entries(plan)) {
    const list = shuffle(byLevel.get(level) ?? []);
    picked.push(...list.slice(0, take));
  }
  return picked;
}

export function parseSince(argv: string[]): Date | null {
  const idx = argv.indexOf('--since');
  if (idx === -1) return null;
  const raw = argv[idx + 1];
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error('Usage: --since YYYY-MM-DD');
  }
  const utcCheck = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(utcCheck.getTime()) || utcCheck.toISOString().slice(0, 10) !== raw) {
    throw new Error(`Invalid date for --since: ${raw}`);
  }
  // Compare `--since` against Vietnam midnight (+07:00), matching admin report dates.
  return new Date(`${raw}T00:00:00+07:00`);
}

export async function runSampleSenses(argv = process.argv.slice(2)): Promise<void> {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const since = parseSince(argv);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const rows = await prisma.$queryRaw<SampleRow[]>`
      SELECT
        s.id::text AS sense_id,
        e.lemma,
        e.pos,
        COALESCE(
          (
            SELECT el.level
            FROM entry_levels el
            JOIN data_sources ds ON ds.id = el.source_id
            WHERE el.entry_id = e.id
            ORDER BY ds.display_priority ASC, el.level ASC
            LIMIT 1
          ),
          'UNRATED'
        ) AS cefr,
        COALESCE(
          (
            SELECT srt.text
            FROM sense_revision_texts srt
            WHERE srt.revision_id = r.id AND srt.language = 'vi'
            ORDER BY CASE srt.kind WHEN 'gloss' THEN 0 WHEN 'definition' THEN 1 ELSE 2 END
            LIMIT 1
          ),
          ''
        ) AS meaning_vi,
        COALESCE(r.examples[1], '') AS example,
        (r.reviewed_by IS NOT NULL) AS reviewed_by_set,
        r.published_at
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id
      WHERE e.scope = 'catalog' AND s.state = 'open' AND r.status = 'published'
    `;

    const reviewedByNull = rows.filter((r) => !r.reviewed_by_set).length;
    process.stderr.write(`published=${rows.length} reviewed_by_null=${reviewedByNull}\n`);

    let sample: SampleRow[];
    if (since) {
      const recent = rows.filter((r) => r.published_at !== null && r.published_at >= since);
      const older = rows.filter((r) => r.published_at === null || r.published_at < since);
      const recentPick = sampleByLevel(recent, Math.min(30, recent.length));
      const olderPick = sampleByLevel(older, Math.max(0, 100 - recentPick.length));
      sample = [...recentPick, ...olderPick];
    } else {
      sample = sampleByLevel(rows, 100);
    }

    process.stdout.write('sense_id,lemma,pos,cefr,meaning_vi,example,reviewed_by_set\n');
    for (const r of sample) {
      process.stdout.write(
        [
          csvCell(r.sense_id),
          csvCell(r.lemma),
          csvCell(r.pos),
          csvCell(r.cefr),
          csvCell(r.meaning_vi),
          csvCell(r.example),
          csvCell(r.reviewed_by_set),
        ].join(',') + '\n',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  runSampleSenses().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
