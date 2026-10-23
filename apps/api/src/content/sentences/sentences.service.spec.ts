import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { SentenceLimitError, SentencesService } from './sentences.service.js';

function setup(count: number) {
  const settings = structuredClone(SETTINGS_DEFAULTS);
  settings.content.sentencesPerSense = 7;
  const tx = {
    $queryRaw: vi.fn(async () => [{ ok: true }]),
    $executeRaw: vi.fn(async () => 0),
    contextSentence: {
      count: vi.fn(async () => count),
      create: vi.fn(async () => ({ id: 'cs1', text: 'I run.', createdAt: new Date('2026-10-19T03:00:00Z') })),
    },
  };
  const settingsService = { get: vi.fn(async () => settings) } as unknown as SettingsService;
  const service = new SentencesService({} as PrismaClient, new FakeClock(), { info: vi.fn() } as unknown as AppLogger,
    settingsService);
  return { service, tx, settingsService };
}

const input = { userId: 'u1', senseId: '00000000-0000-4000-8000-0000000000aa', text: 'I run.' };

describe('SentencesService.addSentence', () => {
  it('B5E64: count = limit → refused with SentenceLimitError', async () => {
    const { service, tx } = setup(7);
    await expect(service.addSentence(tx as unknown as Prisma.TransactionClient, input)).rejects.toBeInstanceOf(SentenceLimitError);
    expect(tx.contextSentence.create).not.toHaveBeenCalled();
  });

  it('B5E64: count = limit − 1 → passes the check; the setting is read through the caller\'s tx', async () => {
    const { service, tx, settingsService } = setup(6);
    await expect(service.addSentence(tx as unknown as Prisma.TransactionClient, input)).resolves.toMatchObject({ id: 'cs1' });
    expect(tx.contextSentence.create).toHaveBeenCalledOnce();
    expect(settingsService.get).toHaveBeenCalledWith(tx);
  });
});

describe('SentencesService.listSentences — reads through the client it is given (Bước 7 plan choice 5)', () => {
  it('a caller inside a transaction passes its tx; without one the global client is used', async () => {
    const row = { id: 'cs1', text: 'I run.', createdAt: new Date('2026-10-19T03:00:00Z'), senseId: 's1' };
    const prisma = { contextSentence: { findMany: vi.fn(async () => [row]) } };
    const tx = { contextSentence: { findMany: vi.fn(async () => [row]) } };
    const service = new SentencesService(prisma as unknown as PrismaClient, new FakeClock(), { info: vi.fn() } as unknown as AppLogger,
      {} as SettingsService);
    const viaTx = await service.listSentences('u1', ['s1'], tx as unknown as Prisma.TransactionClient);
    expect(viaTx.get('s1')).toEqual([{ id: 'cs1', text: 'I run.', createdAt: row.createdAt }]);
    expect(tx.contextSentence.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.contextSentence.findMany).not.toHaveBeenCalled();
    await service.listSentences('u1', ['s1']);
    expect(prisma.contextSentence.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('SentencesService.listForSense / counts (design §8.5, API (e))', () => {
  const SENSE = '00000000-0000-4000-8000-0000000000aa';
  const rows = [
    { id: 'cs1', text: 'First.', createdAt: new Date('2026-10-19T03:00:00Z') },
    { id: 'cs2', text: 'Second.', createdAt: new Date('2026-10-20T03:00:00Z') },
    { id: 'cs3', text: 'Third.', createdAt: new Date('2026-10-21T03:00:00Z') },
  ];
  function make(visible: boolean, found = rows) {
    const prisma = {
      $queryRaw: vi.fn(async () => [{ ok: visible }]),
      contextSentence: {
        findMany: vi.fn(async () => found),
        groupBy: vi.fn(async () => [{ senseId: 's1', _count: { _all: 3 } }]),
      },
    };
    const service = new SentencesService(prisma as unknown as PrismaClient, new FakeClock(), { info: vi.fn() } as unknown as AppLogger,
      {} as SettingsService);
    return { service, prisma };
  }

  it('GE1: a sense with 3 sentences lists them oldest first, for this learner only', async () => {
    const { service, prisma } = make(true);
    expect((await service.listForSense('u1', SENSE))?.map((s) => s.id)).toEqual(['cs1', 'cs2', 'cs3']);
    expect(prisma.contextSentence.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', senseId: SENSE }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }));
  });

  it('GE2: a sense without sentences gives an empty list', async () => {
    const { service } = make(true, []);
    expect(await service.listForSense('u1', SENSE)).toEqual([]);
  });

  it("GE3: a sense the learner cannot see (another learner's word, a hidden catalog sense) gives null, and no sentence is read", async () => {
    const { service, prisma } = make(false);
    expect(await service.listForSense('u1', SENSE)).toBeNull();
    expect(prisma.contextSentence.findMany).not.toHaveBeenCalled();
  });

  it('counts: one grouped read for the senses asked; a sense without sentences is absent', async () => {
    const { service, prisma } = make(true);
    const counts = await service.counts('u1', ['s1', 's2']);
    expect(counts.get('s1')).toBe(3);
    expect(counts.get('s2')).toBeUndefined();
    expect(prisma.contextSentence.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', senseId: { in: ['s1', 's2'] } } }));
    expect((await service.counts('u1', [])).size).toBe(0);
  });
});
