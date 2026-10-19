import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { LevelsService } from '../catalog/levels.service.js';
import type { InflectionsService } from '../inflections/inflections.service.js';
import { PrivateWordLimitError, PrivateWordsService } from './private-words.service.js';

/** Thrown by the fake `entry.create`: reaching it means the limit check passed. */
class PassedCheck extends Error {}

function setup(count: number) {
  const settings = structuredClone(SETTINGS_DEFAULTS);
  settings.content.privateWordsPerUser = 1200;
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    topic: { count: vi.fn(async () => 0) },
    entry: {
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => count),
      create: vi.fn(async () => { throw new PassedCheck(); }),
    },
  };
  const settingsService = { get: vi.fn(async () => settings) } as unknown as SettingsService;
  const service = new PrivateWordsService({} as PrismaClient, new FakeClock(), {} as LevelsService, {} as InflectionsService,
    settingsService);
  return { service, tx, settingsService };
}

const input = {
  ownerId: 'u1', lemma: 'serendipity', pos: null, meaning: { text: 'sự tình cờ may mắn', language: 'vi' as const },
  level: null, topicCodes: [], formOf: null,
};

describe('PrivateWordsService.createPrivateSense', () => {
  it('B5E64: count = limit → refused with PrivateWordLimitError', async () => {
    const { service, tx } = setup(1200);
    await expect(service.createPrivateSense(tx as unknown as Prisma.TransactionClient, input))
      .rejects.toBeInstanceOf(PrivateWordLimitError);
    expect(tx.entry.create).not.toHaveBeenCalled();
  });

  it('B5E64: count = limit − 1 → passes the check; the setting is read through the caller\'s tx', async () => {
    const { service, tx, settingsService } = setup(1199);
    await expect(service.createPrivateSense(tx as unknown as Prisma.TransactionClient, input)).rejects.toBeInstanceOf(PassedCheck);
    expect(settingsService.get).toHaveBeenCalledWith(tx);
  });
});
