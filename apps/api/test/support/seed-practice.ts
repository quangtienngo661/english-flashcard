import { randomUUID } from 'node:crypto';
import type { InflectionKind } from '../../src/content/index.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';

export type SeedPracticeSenseOptions = {
  lemma: string; pos?: string; glossVi?: string; definitionEn?: string; examples?: string[]; variants?: string[];
  acceptedForms?: string[]; inflections?: Array<{ form: string; kind: InflectionKind }>; formOfEntryId?: string;
  functionWord?: boolean; ownerUserId?: string;
};

/**
 * Inserts one open sense with a live published revision: a catalog sense, or the owner's private one when `ownerUserId` is
 * given. Every variant is an accepted spelling; `functionWord` sets the derived flag. Lemmas must be unique per suite.
 */
export async function seedPracticeSense(prisma: PrismaClient, opts: SeedPracticeSenseOptions): Promise<{ senseId: string; entryId: string }> {
  const scope = opts.ownerUserId === undefined ? 'catalog' : 'private';
  return prisma.$transaction(async (tx) => {
    const entry = await tx.entry.create({ data: {
      lemma: opts.lemma, pos: opts.pos ?? 'verb', scope, ownerUserId: opts.ownerUserId ?? null,
      functionWordDerived: opts.functionWord ?? false,
      variants: { create: (opts.variants ?? []).map((text) => ({ text, kind: 'spelling' })) },
      inflections: { create: (opts.inflections ?? []).map(({ form, kind }, position) => ({
        form, formKey: form.normalize('NFC').toLowerCase(), kind, source: 'reviewed', position,
      })) },
    }, select: { id: true } });
    const sense = await tx.sense.create({ data: { entryId: entry.id, state: 'open' }, select: { id: true } });
    const texts = [
      ...(opts.glossVi === undefined ? [] : [{ language: 'vi', kind: 'gloss', text: opts.glossVi }]),
      ...(opts.definitionEn === undefined ? [] : [{ language: 'en', kind: 'definition', text: opts.definitionEn }]),
    ];
    const revision = await tx.senseRevision.create({ data: {
      senseId: sense.id, revisionNo: 1, status: 'published', draftSource: scope === 'catalog' ? 'ui' : 'user',
      contentHash: randomUUID(), createdBy: opts.ownerUserId ?? randomUUID(), publishedAt: new Date(),
      examples: opts.examples ?? [], acceptedForms: opts.acceptedForms ?? [], formOfEntryId: opts.formOfEntryId ?? null,
      texts: { create: texts },
    }, select: { id: true } });
    await tx.sense.update({ where: { id: sense.id }, data: { liveRevisionId: revision.id } });
    return { senseId: sense.id, entryId: entry.id };
  });
}
