import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

/** Lower-case NFC, as `entry_inflections.form_key` and `word_form_additions` (design §10). */
export const formKey = (text: string) => text.normalize('NFC').toLowerCase();

/** Forms the AI used that the table did not know (design §10): one row per (lemma, form), counted; no learner column. */
@Injectable()
export class UnknownFormsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async record(lemma: string, forms: string[], now: Date): Promise<void> {
    const unique = [...new Map(forms.map((form) => [formKey(form), form.normalize('NFC')])).entries()];
    if (unique.length === 0) return;
    const lemmaKey = formKey(lemma);
    await this.prisma.$executeRaw`
      INSERT INTO practice_unknown_forms (lemma_key, form_key, form, first_seen_at, last_seen_at)
      VALUES ${Prisma.join(unique.map(([key, form]) => Prisma.sql`(${lemmaKey}, ${key}, ${form}, ${now}, ${now})`))}
      ON CONFLICT (lemma_key, form_key) DO UPDATE
        SET rejected_count = practice_unknown_forms.rejected_count + 1, last_seen_at = EXCLUDED.last_seen_at`;
  }
}
