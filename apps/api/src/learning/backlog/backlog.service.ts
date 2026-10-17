import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue, daysBetween, localDate } from '../../common/time/local-date.js';
import { ContentService, visibleSenseCondition, type WordSense } from '../../content/index.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { GroupsService } from '../groups/groups.service.js';
import { withLearnerLock } from '../learning-lock.js';
import { relearn } from '../schedule/schedule.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };

export type BacklogItem = {
  item_id: string; sense_id: string; level: number; due_date: string; days_overdue: number; content: WordSense;
};
type Row = { item_id: string; sense_id: string; level: number; due_date: Date };

const invalidInput = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

/** The group's "danh sách cân nhắc" (D22): level ≥ 1 and overdue by more than the backlog setting; computed on read. */
@Injectable()
export class BacklogService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(GroupsService) private readonly groups: GroupsService,
  ) {}

  async list(userId: string, groupId: string, nativeLanguage: 'vi' | 'en', query: { page_size: number; page_token?: string }):
    Promise<{ items: BacklogItem[]; next_page_token: string | null }> {
    const [timeZone, { learning }] = await Promise.all([this.timeZone(userId), this.settings.get()]);
    await this.groups.assertOwned(this.prisma, userId, groupId);
    const today = localDate(timeZone, this.clock.now());
    let after = Prisma.empty;
    if (query.page_token !== undefined) {
      const cursor = decodeBoundToken(query.page_token, groupId);
      if (!cursor || typeof cursor.due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cursor.due)
        || typeof cursor.id !== 'string' || !/^[0-9a-f-]{36}$/.test(cursor.id)) throw invalidInput();
      after = Prisma.sql`AND (i.due_date, i.id) > (${cursor.due}::date, ${cursor.id}::uuid)`;
    }
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT i.id::text AS item_id, i.sense_id::text AS sense_id, i.level, i.due_date
      FROM group_items gi JOIN learning_items i ON i.id = gi.item_id
      WHERE gi.group_id = ${groupId}::uuid AND i.user_id = ${userId}::uuid AND i.level >= 1
        AND ${today}::date - i.due_date > ${learning.backlogAfterDays}
        AND ${visibleSenseCondition(Prisma.sql`i.sense_id`, userId)} ${after}
      ORDER BY i.due_date, i.id LIMIT ${query.page_size + 1}`;
    const page = rows.slice(0, query.page_size);
    const contents = await this.content.cardContent(userId, page.map((row) => row.sense_id), nativeLanguage);
    const last = page[page.length - 1];
    return {
      items: page.flatMap((row) => {
        const content = contents.get(row.sense_id);
        const due = dateString(row.due_date);
        return content ? [{
          item_id: row.item_id, sense_id: row.sense_id, level: row.level, due_date: due,
          days_overdue: daysBetween(due, today), content,
        }] : [];
      }),
      next_page_token: rows.length > query.page_size
        ? encodeBoundToken({ due: dateString(last.due_date), id: last.item_id }, groupId) : null,
    };
  }

  /** "Học lại": the caller's backlog items go back to level 0, due today, counted as new. Other ids are ignored. */
  async relearn(userId: string, itemIds: string[]): Promise<{ relearned: number }> {
    const [timeZone, { learning }] = await Promise.all([this.timeZone(userId), this.settings.get()]);
    return this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      const at = this.clock.now();
      const today = localDate(timeZone, at);
      const items = (await tx.learningItem.findMany({ where: { id: { in: itemIds }, userId, level: { gte: 1 } } }))
        .filter((item) => daysBetween(dateString(item.dueDate), today) > learning.backlogAfterDays);
      const next = relearn(today);
      await tx.learningItem.updateMany({
        where: { id: { in: items.map(({ id }) => id) } },
        data: { level: next.level, dueDate: dateValue(next.dueDate), priority: next.priority },
      });
      await tx.learningLogEntry.createMany({ data: items.map((item) => ({
        userId, itemId: item.id, senseId: item.senseId, kind: 'relearn', levelBefore: item.level, levelAfter: next.level,
        dueBefore: item.dueDate, dueAfter: dateValue(next.dueDate), localDate: dateValue(today), at,
      })) });
      return { relearned: items.length };
    }, transactionOptions);
  }

  private async timeZone(userId: string): Promise<string> {
    const profile = await this.identity.getProfile(userId);
    if (!profile) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return profile.timezone;
  }
}
