import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { WordFormExistsError, WordFormsService } from './word-forms.service.js';

const ACTOR = '00000000-0000-4000-8000-000000000009';

function setup() {
  const prisma = {
    wordFormAddition: {
      create: vi.fn(async ({ data }: { data: Record<string, string> }) =>
        ({ id: 'f1', lemmaKey: data.lemmaKey, formKey: data.formKey, form: data.form })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      findMany: vi.fn(async () => [] as Array<{ lemmaKey: string; formKey: string }>),
    },
  };
  return { prisma, service: new WordFormsService(prisma as unknown as PrismaClient) };
}

describe('WordFormsService (Bước 7 design §10)', () => {
  it('add keys the pair by lower-case NFC (inflectionFormKey) and keeps the form as written', async () => {
    const { prisma, service } = setup();
    expect(await service.add(ACTOR, 'Deploy', 'Déployable')).toEqual({
      id: 'f1', lemmaKey: 'deploy', formKey: 'déployable', form: 'Déployable',
    });
    expect(prisma.wordFormAddition.create).toHaveBeenCalledWith({
      data: { lemmaKey: 'deploy', form: 'Déployable', formKey: 'déployable', addedBy: ACTOR },
      select: { id: true, lemmaKey: true, formKey: true, form: true },
    });
  });

  it('a pair that exists (unique violation) → WordFormExistsError; other errors pass through', async () => {
    const { prisma, service } = setup();
    prisma.wordFormAddition.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }));
    await expect(service.add(ACTOR, 'deploy', 'deployable')).rejects.toBeInstanceOf(WordFormExistsError);
    prisma.wordFormAddition.create.mockRejectedValueOnce(new Error('down'));
    await expect(service.add(ACTOR, 'deploy', 'deployable')).rejects.toThrow('down');
  });

  it('remove → true when a row went, false otherwise', async () => {
    const { prisma, service } = setup();
    expect(await service.remove('f1')).toBe(true);
    prisma.wordFormAddition.deleteMany.mockResolvedValueOnce({ count: 0 });
    expect(await service.remove('f1')).toBe(false);
  });

  it('known returns "lemmaKey formKey" of the pairs that exist; no pairs → no read', async () => {
    const { prisma, service } = setup();
    expect(await service.known([])).toEqual(new Set());
    expect(prisma.wordFormAddition.findMany).not.toHaveBeenCalled();
    prisma.wordFormAddition.findMany.mockResolvedValueOnce([{ lemmaKey: 'deploy', formKey: 'deployable' }]);
    const pairs = [{ lemmaKey: 'deploy', formKey: 'deployable' }, { lemmaKey: 'deploy', formKey: 'deployment' }];
    expect(await service.known(pairs)).toEqual(new Set(['deploy deployable']));
    expect(prisma.wordFormAddition.findMany).toHaveBeenCalledWith({
      where: { OR: pairs }, select: { lemmaKey: true, formKey: true },
    });
  });
});
