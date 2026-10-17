import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { normalizeText } from '../catalog/normalize.js';
import type { InflectionKind } from '../content.constants.js';

export type InflectionInput = { form: string; kind: InflectionKind };
export type InflectionSource = 'library' | 'reviewed';
export type EntryByForm = { entryId: string; lemma: string; pos: string; kind: InflectionKind };

export function inflectionFormKey(form: string): string {
  return normalizeText(form).toLowerCase();
}

/** Inflected forms per entry (D29). Writes use the caller's transaction, which holds the entry lock. */
@Injectable()
export class InflectionsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** A reviewed set replaces every row of the entry; a library set replaces only library rows and
   * is skipped when the entry already has reviewed rows (reviewed wins). */
  async replaceInflections(
    tx: Prisma.TransactionClient, entryId: string, source: InflectionSource, forms: InflectionInput[],
  ): Promise<void> {
    if (source === 'library' && await tx.entryInflection.findFirst({ where: { entryId, source: 'reviewed' }, select: { id: true } })) return;
    await tx.entryInflection.deleteMany({ where: { entryId, ...(source === 'library' ? { source: 'library' } : {}) } });
    const rows = new Map(forms.map(({ form, kind }) => {
      const text = normalizeText(form);
      return [`${kind}\0${text}`, { entryId, form: text, formKey: inflectionFormKey(text), kind, source }];
    }));
    if (rows.size) await tx.entryInflection.createMany({ data: [...rows.values()] });
  }

  /** Catalog entries plus the viewer's own private entries that list this form. */
  async entriesByForm(form: string, viewerId: string): Promise<EntryByForm[]> {
    const rows = await this.prisma.entryInflection.findMany({
      where: { formKey: inflectionFormKey(form), entry: { OR: [{ scope: 'catalog' }, { scope: 'private', ownerUserId: viewerId }] } },
      select: { kind: true, entry: { select: { id: true, lemma: true, pos: true } } },
      orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { kind: 'asc' }, { entryId: 'asc' }],
    });
    return rows.map(({ kind, entry }) => ({ entryId: entry.id, lemma: entry.lemma, pos: entry.pos, kind: kind as InflectionKind }));
  }
}
