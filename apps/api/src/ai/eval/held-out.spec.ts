import { describe, expect, it, vi } from 'vitest';
import { HeldOutReader } from './held-out.js';

function setup(examples: Array<{ id: string; split: string }>, setItems: Array<{ exampleId: string; split: string; revealedAt: Date | null }>) {
  const prisma = {
    aiEvalExample: { findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => examples.filter((e) => where.id.in.includes(e.id))) },
    aiEvalSetItem: { findMany: vi.fn(async ({ where }: { where: { exampleId: { in: string[] } } }) => setItems.filter((i) => where.exampleId.in.includes(i.exampleId))) },
  };
  return { prisma, reader: new HeldOutReader(prisma as never) };
}

const REVEALED = new Date('2026-10-30T01:00:00Z');

describe('HeldOutReader.hiddenIds (R7)', () => {
  it('is hidden: a held-out example, or a deleted one whose held-out set item was never revealed', async () => {
    const { reader } = setup(
      [{ id: 'e1', split: 'held_out' }, { id: 'e2', split: 'dev' }],
      [
        { exampleId: 'e3', split: 'held_out', revealedAt: null },
        { exampleId: 'e4', split: 'held_out', revealedAt: REVEALED },
        { exampleId: 'e6', split: 'held_out', revealedAt: null }, { exampleId: 'e6', split: 'held_out', revealedAt: REVEALED },
        { exampleId: 'e7', split: 'dev', revealedAt: null },
      ],
    );
    expect(await reader.hiddenIds(['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'])).toEqual(new Set(['e1', 'e3']));
  });

  it('reads the set items only for the examples that are gone from the working set', async () => {
    const { reader, prisma } = setup([{ id: 'e1', split: 'held_out' }, { id: 'e2', split: 'dev' }], []);
    await reader.hiddenIds(['e1', 'e2', 'e3']);
    expect(prisma.aiEvalSetItem.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { exampleId: { in: ['e3'] } }, select: { exampleId: true, split: true, revealedAt: true },
    });
  });

  it('no gone example → no set item read', async () => {
    const { reader, prisma } = setup([{ id: 'e1', split: 'dev' }], []);
    expect(await reader.hiddenIds(['e1'])).toEqual(new Set());
    expect(prisma.aiEvalSetItem.findMany).not.toHaveBeenCalled();
  });

  it('an empty list → an empty set and no query', async () => {
    const { reader, prisma } = setup([], []);
    expect(await reader.hiddenIds([])).toEqual(new Set());
    expect(prisma.aiEvalExample.findMany).not.toHaveBeenCalled();
    expect(prisma.aiEvalSetItem.findMany).not.toHaveBeenCalled();
  });

  it('a repeated id is answered once', async () => {
    const { reader } = setup([{ id: 'e1', split: 'held_out' }], []);
    expect(await reader.hiddenIds(['e1', 'e1'])).toEqual(new Set(['e1']));
  });
});
