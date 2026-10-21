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
    $queryRaw: vi.fn(async (_s: TemplateStringsArray, ..._v: unknown[]) => [] as Array<{ id: string }>),
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
  level: null, topicCodes: [], formOf: null, examples: [], aiSuggestion: false,
};

/** A service whose create path runs to the end, recording the revision it writes. */
function fullSetup(now = new Date('2026-10-21T08:00:00.000Z')) {
  const { tx } = setup(0);
  const full = {
    ...tx,
    entry: { ...tx.entry, create: vi.fn(async () => ({ id: 'e1' })), findFirst: vi.fn(async () => null) },
    sense: { findMany: vi.fn(async () => []), create: vi.fn(async () => ({ id: 's1' })), update: vi.fn(async () => ({})) },
    senseRevision: { updateMany: vi.fn(async () => ({})), create: vi.fn(async () => ({ id: 'r1' })) },
    entryLevel: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
  };
  const settings = structuredClone(SETTINGS_DEFAULTS);
  const service = new PrivateWordsService({} as PrismaClient, new FakeClock(now), {} as LevelsService,
    { replaceInflections: vi.fn(async () => undefined) } as unknown as InflectionsService,
    { get: vi.fn(async () => settings) } as unknown as SettingsService);
  return { service, full, now };
}

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

describe('PrivateWordsService form_of base check (FE22)', () => {
  const withFormOf = { ...input, formOf: { entryId: 'base1', kind: 'past' as never } };
  it('FE22: the form_of check of a private word takes FOR SHARE on the base entry', async () => {
    const { service, tx } = setup(0);
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'base1' }]);
    await expect(service.createPrivateSense(tx as unknown as Prisma.TransactionClient, withFormOf)).rejects.toBeInstanceOf(PassedCheck);
    const [strings, ...values] = tx.$queryRaw.mock.calls[0]!;
    expect(strings.join('?').replace(/\s+/g, ' ')).toMatch(/FROM entries WHERE id = \?::uuid AND \(scope = 'catalog' OR \(scope = 'private' AND owner_user_id = \?::uuid\)\) FOR SHARE/);
    expect(values).toEqual(['base1', 'u1']);
  });

  it('FE22: no visible base row → not-found', async () => {
    const { service, tx } = setup(0);
    await expect(service.createPrivateSense(tx as unknown as Prisma.TransactionClient, withFormOf))
      .rejects.toMatchObject({ message: expect.stringContaining('not-found') });
    expect(tx.entry.create).not.toHaveBeenCalled();
  });
});

describe('PrivateWordsService audit columns (N3)', () => {
  it("N3: a private word's revision is published by its owner", async () => {
    const now = new Date('2026-10-21T08:00:00.000Z');
    const { tx } = setup(0);
    const full = {
      ...tx,
      entry: { ...tx.entry, create: vi.fn(async () => ({ id: 'e1' })), findFirst: vi.fn(async () => null) },
      sense: { findMany: vi.fn(async () => []), create: vi.fn(async () => ({ id: 's1' })), update: vi.fn(async () => ({})) },
      senseRevision: { updateMany: vi.fn(async () => ({})), create: vi.fn(async () => ({ id: 'r1' })) },
      entryLevel: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    };
    const settings = structuredClone(SETTINGS_DEFAULTS);
    const service = new PrivateWordsService({} as PrismaClient, new FakeClock(now), {} as LevelsService,
      { replaceInflections: vi.fn(async () => undefined) } as unknown as InflectionsService,
      { get: vi.fn(async () => settings) } as unknown as SettingsService);
    await service.createPrivateSense(full as unknown as Prisma.TransactionClient, input);
    expect(full.senseRevision.create).toHaveBeenCalledWith({ data: expect.objectContaining({ publishedBy: 'u1' }), select: { id: true } });
    expect(full.sense.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: {
      state: 'open', liveRevisionId: 'r1', stateChangedBy: 'u1', stateChangedAt: now } });
  });
});

describe('PrivateWordsService.visibleSenseIds — reads through the client it is given (Bước 7 plan choice 5)', () => {
  it('a caller inside a transaction passes its tx; without one the global client is used', async () => {
    const prisma = { $queryRaw: vi.fn(async () => [{ id: 's1' }]) };
    const tx = { $queryRaw: vi.fn(async () => [{ id: 's1' }]) };
    const service = new PrivateWordsService(prisma as unknown as PrismaClient, new FakeClock(), {} as LevelsService,
      {} as InflectionsService, {} as SettingsService);
    expect(await service.visibleSenseIds('00000000-0000-4000-8000-000000000001', ['s1'], tx as unknown as Prisma.TransactionClient))
      .toEqual(new Set(['s1']));
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    await service.visibleSenseIds('00000000-0000-4000-8000-000000000001', ['s1']);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe('PrivateWordsService — an AI suggestion saved with examples (Bước 7 design §11.2, D22, plan choices 3–4)', () => {
  const create = (patch: Record<string, unknown>) => {
    const { service, full } = fullSetup();
    return { full, run: () => service.createPrivateSense(full as unknown as Prisma.TransactionClient, { ...input, ...patch }) };
  };
  const revisionData = (full: ReturnType<typeof fullSetup>['full']) =>
    (full.senseRevision.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;

  it('two examples and ai_suggestion → the first revision holds both, draft_source ai_suggestion', async () => {
    const { full, run } = create({ examples: [' We sat on the bank. ', 'The bank was muddy.'], aiSuggestion: true });
    await run();
    expect(revisionData(full)).toMatchObject({ examples: ['We sat on the bank.', 'The bank was muddy.'], draftSource: 'ai_suggestion' });
  });

  it('no examples, no ai_suggestion → draft_source user, no examples (Bước 3 behaviour)', async () => {
    const { full, run } = create({});
    await run();
    expect(revisionData(full)).toMatchObject({ examples: [], draftSource: 'user' });
  });

  it('B7E93: three examples, an empty one or one of 301 → validation-failed, nothing written', async () => {
    for (const examples of [['a.', 'b.', 'c.'], ['  '], ['x'.repeat(301)]]) {
      const { full, run } = create({ examples });
      await expect(run()).rejects.toMatchObject({ code: 'validation-failed' });
      expect(full.entry.create).not.toHaveBeenCalled();
    }
  });
});

describe('PrivateWordsService.updatePrivateWord — examples and the AI label (Bước 7 plan choices 3–4)', () => {
  function updateSetup() {
    const { service, full } = fullSetup();
    const latest = {
      revisionNo: 1, contentHash: '', draftSource: 'ai_suggestion', examples: ['We sat on the bank.'], topicCodes: [], acceptedForms: [],
      formOfEntryId: null, formKind: null, texts: [{ language: 'vi', kind: 'gloss', text: 'bờ sông' }],
    };
    const tx = {
      ...full,
      entry: { ...full.entry, findFirst: vi.fn().mockResolvedValueOnce({ id: 'e1', lemma: 'bank', pos: 'noun' }).mockResolvedValue(null),
        update: vi.fn(async () => ({})) },
      sense: { ...full.sense, findMany: vi.fn(async () => [{ id: 's1', revisions: [latest] }]) },
    };
    return { service, tx };
  }

  it('examples only → a new revision with those examples and draft_source user (the label goes)', async () => {
    const { service, tx } = updateSetup();
    await service.updatePrivateWord(tx as unknown as Prisma.TransactionClient, 'u1', 'e1',
      { senses: [{ senseId: 's1', examples: ['The river bank flooded.', 'They fished from the bank.'] }] });
    expect(tx.senseRevision.create).toHaveBeenCalledTimes(1);
    expect((tx.senseRevision.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data).toMatchObject({
      revisionNo: 2, draftSource: 'user', examples: ['The river bank flooded.', 'They fished from the bank.'],
    });
  });

  it('an empty list removes the examples; the meaning is kept', async () => {
    const { service, tx } = updateSetup();
    await service.updatePrivateWord(tx as unknown as Prisma.TransactionClient, 'u1', 'e1', { senses: [{ senseId: 's1', examples: [] }] });
    const data = (tx.senseRevision.create.mock.calls[0] as unknown as [{ data: { examples: string[]; texts: unknown } }])[0].data;
    expect(data.examples).toEqual([]);
    expect(data.texts).toEqual({ create: [{ language: 'vi', kind: 'gloss', text: 'bờ sông' }] });
  });

  it('lemma only → no new revision, so the AI label stays (plan choice 3)', async () => {
    const { service, tx } = updateSetup();
    await service.updatePrivateWord(tx as unknown as Prisma.TransactionClient, 'u1', 'e1', { lemma: 'banks' });
    expect(tx.entry.update).toHaveBeenCalledTimes(1);
    expect(tx.senseRevision.create).not.toHaveBeenCalled();
  });

  it('three examples → validation-failed', async () => {
    const { service, tx } = updateSetup();
    await expect(service.updatePrivateWord(tx as unknown as Prisma.TransactionClient, 'u1', 'e1',
      { senses: [{ senseId: 's1', examples: ['a.', 'b.', 'c.'] }] })).rejects.toMatchObject({ code: 'validation-failed' });
    expect(tx.senseRevision.create).not.toHaveBeenCalled();
  });
});
