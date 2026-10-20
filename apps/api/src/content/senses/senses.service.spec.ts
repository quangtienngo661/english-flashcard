import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { contentHash } from './revision-content.js';
import { SensesService } from './senses.service.js';

const ACTOR = '00000000-0000-4000-8000-0000000000a1';

function fakeTx(sense: object) {
  const tx = {
    sense: { findUnique: vi.fn(async () => sense), update: vi.fn(async () => ({})) },
    senseRevision: { update: vi.fn(async (_args: { where: object; data: Record<string, unknown> }) => ({})) },
  };
  return tx;
}
const draft = (over: object = {}) => ({
  id: 's1', state: 'unpublished', replacesSenseId: null, liveRevisionId: null,
  revisions: [{ id: 'r1', revisionNo: 3, status: 'draft' }], ...over,
});
const service = () => new SensesService();

describe('SensesService.markRevisions audit columns (N3)', () => {
  it('N3: review and reject record reviewed_*', async () => {
    const tx = fakeTx(draft());
    const db = tx as unknown as Prisma.TransactionClient;
    const before = Date.now();
    await service().markRevisions(db, [{ senseId: 's1', revision: 3, action: 'reviewed' }], ACTOR);
    const data = tx.senseRevision.update.mock.calls[0]?.[0].data ?? {};
    expect(data).toMatchObject({ status: 'reviewed', reviewedBy: ACTOR });
    expect((data.reviewedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
    const rej = fakeTx(draft());
    await service().markRevisions(rej as unknown as Prisma.TransactionClient, [{ senseId: 's1', revision: 3, action: 'rejected' }], ACTOR);
    expect(rej.senseRevision.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({
      status: 'rejected', reviewedBy: ACTOR }) });
  });

  it('N3: rejecting a waiting replacement stamps that sense', async () => {
    const tx = fakeTx(draft({ replacesSenseId: 'old' }));
    await service().markRevisions(tx as unknown as Prisma.TransactionClient, [{ senseId: 's1', revision: 3, action: 'rejected' }], ACTOR);
    expect(tx.sense.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: expect.objectContaining({
      state: 'retired', stateChangedBy: ACTOR }) });
  });
});

const usableRev = {
  id: 'r1', revisionNo: 1, status: 'reviewed', examples: ['A cat sat.'], topicCodes: [], acceptedForms: [],
  formOfEntryId: null, formKind: null, contentHash: 'h1',
  texts: [{ language: 'vi', kind: 'gloss', text: 'con mèo' }],
};
const rejectedRev = {
  ...usableRev, id: 'r2', revisionNo: 2, status: 'rejected', contentHash: 'h2',
  examples: ['Bad example.'], texts: [{ language: 'vi', kind: 'gloss', text: 'văn bản bị từ chối' }],
};
const usableHash = contentHash({
  glossVi: 'con mèo', definitionEn: null, examplesEn: ['A cat sat.'], topicCodes: [], acceptedForms: [],
});
function draftTx(latest: object, usable: object | null) {
  const created: Array<{ data: Record<string, unknown> }> = [];
  const raw = {
    sense: { findUnique: vi.fn(async () => ({
      id: 's1', state: 'unpublished', entry: { lemma: 'cat' }, revisions: [latest] })) },
    senseRevision: {
      findFirst: vi.fn(async (_args: object) => usable),
      updateMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => { created.push(args); return { id: 'r3', revisionNo: 3 }; }),
    },
  };
  return { tx: raw as unknown as Prisma.TransactionClient, raw, created };
}
const noTopics = async () => [];
const save = (tx: Prisma.TransactionClient, baseRevision: number, content: object) =>
  service().saveDraft(tx, { senseId: 's1', baseRevision, content, source: 'ui', actorId: ACTOR }, noTopics);

describe('SensesService.saveDraft after a rejection (T1)', () => {
  it('T1c: a draft after a rejection does not carry the rejected text', async () => {
    const { tx, raw, created } = draftTx(rejectedRev, usableRev);
    const result = await save(tx, 2, { definitionEn: 'a small pet' });
    expect(result).toMatchObject({ revisionNo: 3, changed: true });
    expect(raw.senseRevision.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { senseId: 's1', status: { not: 'rejected' } } }));
    const data = created[0].data as { examples: string[]; texts: { create: Array<{ text: string }> } };
    expect(data.examples).toEqual(['A cat sat.']);
    const texts = data.texts.create.map(({ text }) => text);
    expect(texts).toEqual(expect.arrayContaining(['con mèo', 'a small pet']));
    expect(texts).not.toContain('văn bản bị từ chối');
  });

  it('T1b: a save equal to the last usable revision still writes a new revision', async () => {
    const { tx, created } = draftTx(rejectedRev, usableRev);
    await expect(save(tx, 2, {})).resolves.toMatchObject({ revisionNo: 3, changed: true });
    expect(created).toHaveLength(1);
  });

  it('T1b: even when the hash equals the rejected latest, a new revision is written', async () => {
    const { tx, created } = draftTx({ ...rejectedRev, contentHash: usableHash }, usableRev);
    await expect(save(tx, 2, {})).resolves.toMatchObject({ changed: true });
    expect(created).toHaveLength(1);
  });

  it('T1: the stale check still compares with the latest revision number', async () => {
    const { tx } = draftTx(rejectedRev, usableRev);
    await expect(save(tx, 1, {})).rejects.toMatchObject({ code: 'stale-revision' });
  });

  it('T1: with no usable revision the base is empty content', async () => {
    const { tx, created } = draftTx(rejectedRev, null);
    await save(tx, 2, { glossVi: 'mới' });
    expect((created[0].data as { examples: string[] }).examples).toEqual([]);
  });

  it('control: a non-rejected latest keeps the unchanged shortcut and skips the usable lookup', async () => {
    const { tx, raw, created } = draftTx({ ...usableRev, status: 'draft', contentHash: usableHash }, null);
    await expect(save(tx, 1, {})).resolves.toMatchObject({ changed: false });
    expect(created).toHaveLength(0);
    expect(raw.senseRevision.findFirst).not.toHaveBeenCalled();
  });
});
