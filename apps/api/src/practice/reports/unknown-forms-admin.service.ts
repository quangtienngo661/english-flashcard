import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

const binding = createHash('sha256').update(JSON.stringify({ route: 'practice-unknown-forms' })).digest('hex');
const invalidInput = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

/**
 * Staff's view of the forms AI used that the tables did not know (design §10, D15). Rows are written by the generator
 * (`UnknownFormsRepository`); a pair staff accepted in Content's word forms is hidden here, since Content cannot delete it.
 * A page may hold fewer rows than asked when some are hidden.
 */
@Injectable()
export class UnknownFormsAdminService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  async list(query: { pageSize: number; pageToken?: string }) {
    let cursor: { rejected_count: number; id: string } | undefined;
    if (query.pageToken !== undefined) {
      const decoded = decodeBoundToken(query.pageToken, binding);
      if (typeof decoded?.rejected_count !== 'number' || typeof decoded.id !== 'string') throw invalidInput();
      cursor = { rejected_count: decoded.rejected_count, id: decoded.id };
    }
    const rows = await this.prisma.practiceUnknownForm.findMany({
      where: cursor
        ? { OR: [{ rejectedCount: { lt: cursor.rejected_count } }, { rejectedCount: cursor.rejected_count, id: { gt: cursor.id } }] }
        : {},
      orderBy: [{ rejectedCount: 'desc' }, { id: 'asc' }], take: query.pageSize + 1,
    });
    const page = rows.slice(0, query.pageSize);
    const known = await this.content.knownWordForms(page.map(({ lemmaKey, formKey }) => ({ lemmaKey, formKey })));
    const last = page.at(-1);
    return {
      items: page.filter((row) => !known.has(`${row.lemmaKey} ${row.formKey}`)).map((row) => ({
        id: row.id, lemma_key: row.lemmaKey, form: row.form, rejected_count: row.rejectedCount,
        first_seen_at: row.firstSeenAt.toISOString(), last_seen_at: row.lastSeenAt.toISOString(),
      })),
      next_page_token: rows.length > query.pageSize && last
        ? encodeBoundToken({ rejected_count: last.rejectedCount, id: last.id }, binding) : null,
    };
  }

  /** Not a real form (a synonym, a typo): staff drop the row. */
  async dismiss(id: string): Promise<void> {
    const { count } = await this.prisma.practiceUnknownForm.deleteMany({ where: { id } });
    if (count === 0) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
  }
}
