import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Which examples are still hidden (design §5.1, R7): a held-out example in the working set, or one deleted from it whose held-out
 * snapshot nobody has revealed. Other pages that show an eval call (the calls page, judge calls) hide the content of these.
 */
@Injectable()
export class HeldOutReader {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async hiddenIds(exampleIds: string[]): Promise<Set<string>> {
    const ids = [...new Set(exampleIds)];
    if (ids.length === 0) return new Set();
    const examples = await this.prisma.aiEvalExample.findMany({ where: { id: { in: ids } }, select: { id: true, split: true } });
    const hidden = new Set(examples.filter((example) => example.split === 'held_out').map((example) => example.id));
    const known = new Set(examples.map((example) => example.id));
    const gone = ids.filter((id) => !known.has(id));
    if (gone.length === 0) return hidden;
    const items = await this.prisma.aiEvalSetItem.findMany({
      where: { exampleId: { in: gone } }, select: { exampleId: true, split: true, revealedAt: true },
    });
    const byExample = new Map<string, { heldOut: boolean; revealed: boolean }>();
    for (const item of items) {
      const state = byExample.get(item.exampleId) ?? { heldOut: false, revealed: false };
      state.heldOut ||= item.split === 'held_out';
      state.revealed ||= item.revealedAt !== null;
      byExample.set(item.exampleId, state);
    }
    for (const [id, state] of byExample) if (state.heldOut && !state.revealed) hidden.add(id);
    return hidden;
  }
}
