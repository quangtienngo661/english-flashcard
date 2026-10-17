import { Injectable } from '@nestjs/common';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { VALID_POS, isFunctionWordPos } from '../content.constants.js';
import { normalizeLemma, normalizeText } from './normalize.js';

export type EntryKey = { id: string; lemma: string; pos: string };
export type EnsureEntryInput = { lemma: string; pos: string; variants: string[] };
export type EnsureEntryResult = { entry: EntryKey; created: boolean; addedVariantIds: string[] };
export type VariantInput = { text: string; kind: 'spelling' | 'alias'; acceptedAsAnswer: boolean };
const entrySelect = { id: true, lemma: true, pos: true } satisfies Prisma.EntrySelect;

function invalidInput(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
}

function entryNotFound(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
}

function normalizedKey(lemma: string, pos: string): { lemma: string; pos: string } {
  lemma = normalizeLemma(lemma);
  pos = normalizeText(pos).toLowerCase();
  // PostgreSQL varchar counts Unicode code points, including supplementary characters as one.
  if (!lemma || lemma.includes('\0') || [...lemma].length > 100 || !VALID_POS.some((value) => value === pos)) throw invalidInput();
  return { lemma, pos };
}

function variantText(text: string): string {
  text = normalizeText(text);
  if (!text || text.includes('\0') || [...text].length > 2_000) throw invalidInput();
  return text;
}

/** Write methods use the caller's transaction, which must already hold lockEntryKey. */
@Injectable()
export class EntriesService {
  async lockEntryKey(tx: Prisma.TransactionClient, lemma: string, pos: string): Promise<void> {
    const key = normalizedKey(lemma, pos);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'content.entry:' + key.lemma + ':' + key.pos}, 0))`;
  }

  async ensureEntry(tx: Prisma.TransactionClient, input: EnsureEntryInput): Promise<EnsureEntryResult> {
    const { lemma, pos } = normalizedKey(input.lemma, input.pos);
    const variants = [...new Set(input.variants.map(variantText))].filter((text) => text !== lemma);
    const inserted = await tx.$executeRaw`
      INSERT INTO entries (language, lemma, pos, function_word_derived)
      VALUES ('en', ${lemma}, ${pos}, ${isFunctionWordPos(pos)})
      ON CONFLICT (language, lemma, pos) WHERE scope = 'catalog' DO NOTHING`;
    const entry = await tx.entry.findFirstOrThrow({
      where: { language: 'en', lemma, pos, scope: 'catalog' }, select: entrySelect,
    });
    const addedVariantIds: string[] = [];
    for (const text of variants) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO entry_variants (entry_id, text, kind, accepted_as_answer)
        VALUES (${entry.id}::uuid, ${text}, 'spelling', true)
        ON CONFLICT (entry_id, text) DO NOTHING RETURNING id`;
      addedVariantIds.push(...rows.map(({ id }) => id));
    }
    return { entry, created: inserted === 1, addedVariantIds };
  }

  async setVariants(tx: Prisma.TransactionClient, entryId: string, variants: VariantInput[]): Promise<void> {
    const normalized = variants.map((variant) => ({ ...variant, text: variantText(variant.text) }));
    if (new Set(normalized.map(({ text }) => text)).size !== normalized.length || normalized.some((variant) =>
      !['spelling', 'alias'].includes(variant.kind) || typeof variant.acceptedAsAnswer !== 'boolean')) throw invalidInput();
    if (!await tx.entry.findUnique({ where: { id: entryId }, select: { id: true } })) throw entryNotFound();
    await tx.entryVariant.deleteMany({ where: {
      entryId, ...(normalized.length ? { text: { notIn: normalized.map(({ text }) => text) } } : {}),
    } });
    for (const { text, kind, acceptedAsAnswer } of normalized) {
      await tx.entryVariant.upsert({
        where: { entryId_text: { entryId, text } },
        create: { entryId, text, kind, acceptedAsAnswer }, update: { kind, acceptedAsAnswer },
      });
    }
  }

  async setFunctionWordOverride(tx: Prisma.TransactionClient, entryId: string, value: boolean | null): Promise<void> {
    if (value !== null && typeof value !== 'boolean') throw invalidInput();
    const result = await tx.entry.updateMany({ where: { id: entryId }, data: { functionWordOverride: value } });
    if (result.count === 0) throw entryNotFound();
  }
}
