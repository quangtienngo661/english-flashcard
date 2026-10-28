import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { isSourceComplete, SourcesService, type SourceView } from './sources.service.js';

const source: SourceView = {
  id: '00000000-0000-4000-8000-000000000002', kind: 'third_party', name: 'CEFR-J',
  version: '1.5', url: null, license: 'test license', attribution: '', display_priority: 10,
};

describe('source completeness', () => {
  it('owner sources are complete without a version or license', () => {
    expect(isSourceComplete({ ...source, kind: 'owner', version: '', license: '' })).toBe(true);
  });

  it('third-party sources require both a non-blank version and license', () => {
    expect(isSourceComplete(source)).toBe(true);
    expect(isSourceComplete({ ...source, version: ' 1.5 ', license: ' test license ' })).toBe(true);
    for (const blank of ['', ' ', '\t\n']) {
      expect(isSourceComplete({ ...source, version: blank })).toBe(false);
      expect(isSourceComplete({ ...source, license: blank })).toBe(false);
      expect(isSourceComplete({ ...source, version: blank, license: blank })).toBe(false);
    }
  });
});

const ID = '00000000-0000-4000-8000-0000000000c1';
const row = {
  id: ID, kind: 'third_party', name: 'CEFR-J', version: '1.5', url: null, license: 'test license', attribution: '', displayPriority: 10,
};
const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: 'x' });

function setup() {
  const prisma = {
    dataSource: { update: vi.fn(), findUnique: vi.fn() },
    $executeRaw: vi.fn(),
  };
  return { prisma, service: new SourcesService(prisma as unknown as PrismaClient) };
}

async function problem(promise: Promise<unknown>): Promise<{ status: number; type: string }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ProblemDetailsException) return { status: error.getStatus(), type: error.problemType };
    throw error;
  }
  throw new Error('expected a problem');
}

describe('SourcesService.update', () => {
  it('writes only the keys that were sent, mapping display_priority, and returns the view', async () => {
    const { prisma, service } = setup();
    prisma.dataSource.update.mockResolvedValue({ ...row, name: 'CEFR-J v2', displayPriority: 3 });
    const view = await service.update(ID, { name: 'CEFR-J v2', display_priority: 3 });
    expect(prisma.dataSource.update).toHaveBeenCalledOnce();
    expect(prisma.dataSource.update.mock.calls[0]![0]).toMatchObject({
      where: { id: ID, kind: 'third_party' }, data: { name: 'CEFR-J v2', displayPriority: 3 },
    });
    expect(Object.keys(prisma.dataSource.update.mock.calls[0]![0].data).sort()).toEqual(['displayPriority', 'name']);
    expect(view).toEqual({
      id: ID, kind: 'third_party', name: 'CEFR-J v2', version: '1.5', url: null, license: 'test license', attribution: '', display_priority: 3,
    });
  });

  it('url: null is written (clears the link), it is not treated as "not sent"', async () => {
    const { prisma, service } = setup();
    prisma.dataSource.update.mockResolvedValue(row);
    await service.update(ID, { url: null });
    expect(prisma.dataSource.update.mock.calls[0]![0].data).toEqual({ url: null });
  });

  it('only a third_party row can match: the update filters on kind', async () => {
    const { prisma, service } = setup();
    prisma.dataSource.update.mockResolvedValue(row);
    await service.update(ID, { license: 'x' });
    expect(prisma.dataSource.update.mock.calls[0]![0].where).toEqual({ id: ID, kind: 'third_party' });
    expect(prisma.dataSource.findUnique).not.toHaveBeenCalled();
  });

  it('unknown id → 404 not-found', async () => {
    const { prisma, service } = setup();
    prisma.dataSource.update.mockRejectedValue(prismaError('P2025'));
    prisma.dataSource.findUnique.mockResolvedValue(null);
    expect(await problem(service.update(ID, { name: 'x' }))).toEqual({ status: 404, type: 'not-found' });
  });

  it('an owner source → 409 source-protected', async () => {
    const { prisma, service } = setup();
    prisma.dataSource.update.mockRejectedValue(prismaError('P2025'));
    prisma.dataSource.findUnique.mockResolvedValue({ kind: 'owner' });
    expect(await problem(service.update(ID, { name: 'x' }))).toEqual({ status: 409, type: 'source-protected' });
  });

  it('no row matched yet a third_party source is there (cannot happen): the error is not disguised as a problem', async () => {
    const { prisma, service } = setup();
    const missing = prismaError('P2025');
    prisma.dataSource.update.mockRejectedValue(missing);
    prisma.dataSource.findUnique.mockResolvedValue({ kind: 'third_party' });
    await expect(service.update(ID, { name: 'x' })).rejects.toBe(missing);
  });

  it('a (name, version) pair another source has → 409 source-exists', async () => {
    const { prisma, service } = setup();
    prisma.dataSource.update.mockRejectedValue(prismaError('P2002'));
    expect(await problem(service.update(ID, { name: 'AGID', version: '2016.01.19' }))).toEqual({ status: 409, type: 'source-exists' });
  });

  it('any other database error is not turned into a problem', async () => {
    const { prisma, service } = setup();
    const boom = new Error('connection lost');
    prisma.dataSource.update.mockRejectedValue(boom);
    await expect(service.update(ID, { name: 'x' })).rejects.toBe(boom);
  });
});

describe('SourcesService.remove', () => {
  const sqlOf = (call: unknown[]) => ({ text: (call[0] as TemplateStringsArray).join('?').replace(/\s+/g, ' ').trim(), values: call.slice(1) });

  it('one guarded DELETE: third_party only, and nothing in entry_levels, import_batches or import_row_keys refers to it', async () => {
    const { prisma, service } = setup();
    prisma.$executeRaw.mockResolvedValue(1);
    await service.remove(ID);
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
    const { text, values } = sqlOf(prisma.$executeRaw.mock.calls[0]!);
    expect(text).toContain('DELETE FROM data_sources');
    expect(text).toContain("kind = 'third_party'");
    expect(text).toContain('NOT EXISTS (SELECT 1 FROM entry_levels WHERE source_id = ds.id)');
    expect(text).toContain('NOT EXISTS (SELECT 1 FROM import_batches WHERE level_source_id = ds.id)');
    expect(text).toContain('NOT EXISTS (SELECT 1 FROM import_row_keys WHERE source_id = ds.id)');
    expect(values).toEqual([ID]);
    expect(prisma.dataSource.findUnique).not.toHaveBeenCalled();
  });

  it('nothing deleted and no such row → 404 not-found', async () => {
    const { prisma, service } = setup();
    prisma.$executeRaw.mockResolvedValue(0);
    prisma.dataSource.findUnique.mockResolvedValue(null);
    expect(await problem(service.remove(ID))).toEqual({ status: 404, type: 'not-found' });
  });

  it('nothing deleted and the row is an owner source → 409 source-protected', async () => {
    const { prisma, service } = setup();
    prisma.$executeRaw.mockResolvedValue(0);
    prisma.dataSource.findUnique.mockResolvedValue({ kind: 'owner' });
    expect(await problem(service.remove(ID))).toEqual({ status: 409, type: 'source-protected' });
  });

  it('nothing deleted and a third_party row is still there → 409 source-in-use', async () => {
    const { prisma, service } = setup();
    prisma.$executeRaw.mockResolvedValue(0);
    prisma.dataSource.findUnique.mockResolvedValue({ kind: 'third_party' });
    expect(await problem(service.remove(ID))).toEqual({ status: 409, type: 'source-in-use' });
  });

  it.each([
    ['P2003', undefined],
    // What a raw statement really throws for a foreign-key refusal (seen against Postgres 17, Prisma 7.10 with the pg adapter).
    ['P2010', { driverAdapterError: { name: 'DriverAdapterError', cause: {
      originalCode: '23503', kind: 'ForeignKeyConstraintViolation', constraint: { index: 'entry_levels_source_id_fkey' },
      originalMessage: 'update or delete on table "data_sources" violates foreign key constraint "entry_levels_source_id_fkey"',
    } } }],
  ])('a foreign-key refusal (%s: a level written between the guard and the delete) → 409 source-in-use', async (code, meta) => {
    const { prisma, service } = setup();
    prisma.$executeRaw.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('fk', { code, clientVersion: 'x', meta }));
    expect(await problem(service.remove(ID))).toEqual({ status: 409, type: 'source-in-use' });
  });

  it('a raw error that is not a foreign-key refusal (P2010 with another driver code) is not turned into a problem', async () => {
    const { prisma, service } = setup();
    const boom = new Prisma.PrismaClientKnownRequestError('x', { code: 'P2010', clientVersion: 'x', meta: {
      driverAdapterError: { cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } },
    } });
    prisma.$executeRaw.mockRejectedValue(boom);
    await expect(service.remove(ID)).rejects.toBe(boom);
  });

  it('any other database error is not turned into a problem', async () => {
    const { prisma, service } = setup();
    const boom = new Error('connection lost');
    prisma.$executeRaw.mockRejectedValue(boom);
    await expect(service.remove(ID)).rejects.toBe(boom);
  });
});
