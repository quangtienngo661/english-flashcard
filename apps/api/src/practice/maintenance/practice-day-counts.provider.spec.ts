import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PracticeDayCountsProvider } from './practice-day-counts.provider.js';

function build(rows: Array<Record<string, unknown>>) {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (query: { sql?: string; strings?: string[]; values?: unknown[] }) => {
      calls.push({ text: query.sql ?? query.strings?.join('?') ?? '', values: query.values ?? [] });
      return rows;
    }),
  } as unknown as PrismaClient;
  return { provider: new PracticeDayCountsProvider(prisma), calls };
}

describe('PracticeDayCountsProvider (giao diện mới §10.2)', () => {
  it('countByLocalDate filters graded practice answers in range and maps numbers and dates', async () => {
    const { provider, calls } = build([
      { date: new Date('2026-11-08T00:00:00Z'), sessions: 1n, questions: 18n, correct: 12n },
    ]);
    const result = await provider.countByLocalDate('u1', '2026-11-01', '2026-11-30');
    expect(result).toEqual([{ date: '2026-11-08', sessions: 1, questions: 18, correct: 12 }]);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.text).toContain("result IN ('correct', 'wrong')");
    expect(calls[0]!.text).toContain("kind = 'practice'");
    expect(calls[0]!.values).toEqual(['u1', '2026-11-01', '2026-11-30']);
  });

  it('sessionsOfDay maps each session to camel case with the same numbers', async () => {
    const { provider, calls } = build([
      { session_id: 'p1', first_position: 1, last_position: 10, questions: 10n, correct: 7n },
      { session_id: 'p2', first_position: 4, last_position: 11, questions: 8n, correct: 8n },
    ]);
    const result = await provider.sessionsOfDay('u1', '2026-11-08');
    expect(result).toEqual([
      { sessionId: 'p1', firstPosition: 1, lastPosition: 10, questions: 10, correct: 7 },
      { sessionId: 'p2', firstPosition: 4, lastPosition: 11, questions: 8, correct: 8 },
    ]);
    expect(calls[0]!.text).toContain("result IN ('correct', 'wrong')");
    expect(calls[0]!.text).toContain("kind = 'practice'");
    expect(calls[0]!.values).toEqual(['u1', '2026-11-08']);
  });
});
