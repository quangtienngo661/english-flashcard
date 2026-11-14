import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { normalizeText } from '../catalog/normalize.js';
import { inflectionFormKey } from '../inflections/inflections.service.js';

/** The pair (lemma, form) staff accepted already exists. */
export class WordFormExistsError extends Error {}

export type WordFormAdded = { id: string; lemmaKey: string; formKey: string; form: string };

/**
 * Forms staff accepted for a lemma (Bước 7 design §10, D15). They apply to every entry with that lemma, catalog and private,
 * through `PracticeSense.extra_forms`; keys are lower-case NFC like `entry_inflections.form_key`.
 */
@Injectable()
export class WordFormsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async add(actorId: string, lemma: string, form: string): Promise<WordFormAdded> {
    try {
      return await this.prisma.wordFormAddition.create({
        data: { lemmaKey: inflectionFormKey(lemma), form: normalizeText(form), formKey: inflectionFormKey(form), addedBy: actorId },
        select: { id: true, lemmaKey: true, formKey: true, form: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new WordFormExistsError();
      throw error;
    }
  }

  async remove(id: string): Promise<boolean> {
    return (await this.prisma.wordFormAddition.deleteMany({ where: { id } })).count === 1;
  }

  /** `lemmaKey + ' ' + formKey` of the given pairs that staff accepted (Practice hides them from its unknown-forms list). */
  async known(pairs: Array<{ lemmaKey: string; formKey: string }>): Promise<Set<string>> {
    if (pairs.length === 0) return new Set();
    const rows = await this.prisma.wordFormAddition.findMany({ where: { OR: pairs }, select: { lemmaKey: true, formKey: true } });
    return new Set(rows.map(({ lemmaKey, formKey }) => `${lemmaKey} ${formKey}`));
  }
}
