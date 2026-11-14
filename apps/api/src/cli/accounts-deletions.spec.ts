import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { exportDeletions, parseDeletionLines, parseDeletionsArgs, replayDeletions } from './accounts-deletions-args.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

describe('parseDeletionsArgs', () => {
  it('accepts export and replay with their optional file flag', () => {
    expect(parseDeletionsArgs(['export'])).toEqual({ command: 'export', out: null });
    expect(parseDeletionsArgs(['export', '--out', 'd.jsonl'])).toEqual({ command: 'export', out: 'd.jsonl' });
    expect(parseDeletionsArgs(['replay'])).toEqual({ command: 'replay', from: null });
    expect(parseDeletionsArgs(['replay', '--from', 'd.jsonl'])).toEqual({ command: 'replay', from: 'd.jsonl' });
  });
  it.each([[[]], [['nope']], [['export', '--from', 'x']], [['replay', '--out', 'x']], [['export', '--out']], [['replay', '--from', 'a', 'b']]])(
    'rejects %j with the usage', (argv) => { expect(() => parseDeletionsArgs(argv)).toThrow(/Usage/); });
});

describe('exportDeletions', () => {
  it('writes one JSON line { user_id, deleted_at, by } per row, oldest first', async () => {
    const findMany = vi.fn(async (_a: unknown) => [{ userId: A, deletedAt: new Date('2026-10-01T00:00:00Z'), by: 'self' }]);
    const lines = await exportDeletions({ deletedAccount: { findMany } } as unknown as PrismaClient);
    expect(lines.map((l) => JSON.parse(l))).toEqual([{ user_id: A, deleted_at: '2026-10-01T00:00:00.000Z', by: 'self' }]);
    expect(findMany).toHaveBeenCalledWith({ orderBy: [{ deletedAt: 'asc' }, { userId: 'asc' }] });
  });
});

describe('parseDeletionLines', () => {
  it('reads export lines, skips blank ones, lower-cases ids and drops an unknown "by"', () => {
    const text = `${JSON.stringify({ user_id: A.toUpperCase(), by: 'cleanup' })}\n\n${JSON.stringify({ user_id: B, by: 'weird' })}\r\n`;
    expect(parseDeletionLines(text)).toEqual([{ userId: A, by: 'cleanup' }, { userId: B, by: null }]);
  });
  it('a bad line stops with its number', () => {
    expect(() => parseDeletionLines('{}\n')).toThrow('Line 1 has no valid user_id');
    expect(() => parseDeletionLines(`${JSON.stringify({ user_id: A })}\nnot json`)).toThrow('Line 2 is not JSON');
  });
});

describe('replayDeletions (B8E53, D21)', () => {
  function setup(table: Array<{ userId: string; by: string }>, present: string[]) {
    const prisma = {
      deletedAccount: { findMany: vi.fn(async () => table) },
      user: { findMany: vi.fn(async (_a: unknown) => present.map((id) => ({ id }))) },
    };
    const deletion = { delete: vi.fn(async (_i: unknown) => 'done' as 'done' | 'pending') };
    return { prisma, deletion, run: (file: Array<{ userId: string; by: 'self' | 'admin' | 'cleanup' | null }> = []) =>
      replayDeletions(prisma as unknown as PrismaClient, deletion, file) };
  }

  it('deletes again every id whose users row came back, in replay mode, with the by of its line (the file wins, admin when absent)', async () => {
    const s = setup([{ userId: A, by: 'self' }], [A, B, C]);
    const result = await s.run([{ userId: B, by: 'cleanup' }, { userId: C, by: null }]);
    expect(result).toEqual({ replayed: 3, withoutRow: 0, pending: [] });
    expect(s.deletion.delete).toHaveBeenCalledWith({ userId: A, by: 'self', mode: 'replay' });
    expect(s.deletion.delete).toHaveBeenCalledWith({ userId: B, by: 'cleanup', mode: 'replay' });
    expect(s.deletion.delete).toHaveBeenCalledWith({ userId: C, by: 'admin', mode: 'replay' });
  });

  it('ids without a users row are skipped and counted', async () => {
    const s = setup([{ userId: A, by: 'self' }, { userId: B, by: 'admin' }], [A]);
    expect(await s.run()).toEqual({ replayed: 1, withoutRow: 1, pending: [] });
    expect(s.deletion.delete).toHaveBeenCalledTimes(1);
  });

  it('ids that end pending are returned so the operator runs the command again', async () => {
    const s = setup([{ userId: A, by: 'self' }, { userId: B, by: 'self' }], [A, B]);
    s.deletion.delete.mockResolvedValueOnce('pending');
    expect(await s.run()).toEqual({ replayed: 1, withoutRow: 0, pending: [A] });
  });
});
