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
