import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, dateValue, localDate } from '../../common/time/local-date.js';
import { ContentService, type Level } from '../../content/index.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { GroupsService } from '../groups/groups.service.js';
import { GROUP_ITEMS_MAX } from '../learning.constants.js';
import { withLearnerLock } from '../learning-lock.js';
import { newItem } from '../schedule/schedule.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };

export type AddResult = { item_id: string; level: number; due_date: string; created: boolean };
export type BulkFilter = { level?: Level; topic?: string; pos?: string };
export type BulkResult = { added: number; already_in_group: number; skipped_function_words: number; skipped_group_full: number };
export type ItemState = { sense_id: string; item_id: string; level: number; due_date: string; priority: boolean; group_ids: string[] };
export type GroupItemView = {
  item_id: string; sense_id: string; level: number; due_date: string; priority: boolean; group_count: number;
  sense_changed: boolean; added_at: string;
};
export type Cell = 'priority' | 0 | 1 | 2 | 3 | 4 | 5;

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const invalidInput = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

@Injectable()
export class ItemsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(GroupsService) private readonly groups: GroupsService,
  ) {}

  /** B3#1: a sense the learner can see joins the group; the first time it also starts its schedule. */
  async add(userId: string, groupId: string, senseId: string): Promise<AddResult> {
    const today = await this.today(userId);
    if (!(await this.content.visibleSenseIds(userId, [senseId])).has(senseId)) {
      await this.groups.assertOwned(this.prisma, userId, groupId);
      throw notFound();
    }
    return this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      await this.groups.assertOwned(tx, userId, groupId);
      return this.linkInTx(tx, userId, groupId, senseId, today);
    }, transactionOptions);
  }

  /**
   * Links one sense the caller may see to one of their groups inside the caller's transaction, which already holds the
   * learner lock and checked the group (quick add reuses it). Already in the group: no change.
   */
  async linkInTx(tx: Prisma.TransactionClient, userId: string, groupId: string, senseId: string, today: string): Promise<AddResult> {
    const existing = await tx.learningItem.findUnique({
      where: { userId_senseId: { userId, senseId } }, include: { groups: { where: { groupId } } },
    });
    if (existing && existing.groups.length > 0) return addResult(existing, false);
    if (await tx.groupItem.count({ where: { groupId } }) >= GROUP_ITEMS_MAX) {
      throw new ProblemDetailsException({ status: 409, title: 'Group full', type: 'group-full' });
    }
    const [item] = await this.ensureItems(tx, userId, groupId, [senseId], today);
    return addResult(item, item.created);
  }

  /** Adds published catalog senses matching the filter, up to the group's free slots (B3E22). */
  async bulkAdd(userId: string, groupId: string, filter: BulkFilter): Promise<BulkResult> {
    const today = await this.today(userId);
    await this.groups.assertOwned(this.prisma, userId, groupId);
    // Every matching sense, not just enough to fill the group: what does not fit is reported as skipped_group_full (L3).
    const { senseIds, skippedFunctionWords } = await this.content.bulkCandidates(filter, Number.POSITIVE_INFINITY);
    return this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      await this.groups.assertOwned(tx, userId, groupId);
      const linked = new Set((await tx.learningItem.findMany({
        where: { userId, senseId: { in: senseIds }, groups: { some: { groupId } } }, select: { senseId: true },
      })).map((item) => item.senseId));
      const fresh = senseIds.filter((id) => !linked.has(id));
      const free = Math.max(0, GROUP_ITEMS_MAX - await tx.groupItem.count({ where: { groupId } }));
      const toAdd = fresh.slice(0, free);
      await this.ensureItems(tx, userId, groupId, toAdd, today);
      return {
        added: toAdd.length, already_in_group: linked.size, skipped_function_words: skippedFunctionWords,
        skipped_group_full: fresh.length - toAdd.length,
      };
    }, transactionOptions);
  }

  /** B3E19: leaving the last group removes the item from learning. */
  async removeFromGroup(userId: string, groupId: string, itemId: string): Promise<{ removed_from_learning: boolean }> {
    const profile = await this.profile(userId);
    return this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      await this.groups.assertOwned(tx, userId, groupId);
      const { count } = await tx.groupItem.deleteMany({ where: { groupId, itemId, item: { userId } } });
      if (count === 0) throw notFound();
      if (await tx.groupItem.count({ where: { itemId } }) > 0) return { removed_from_learning: false };
      await this.deleteItem(tx, userId, itemId, groupId, profile.timezone);
      return { removed_from_learning: true };
    }, transactionOptions);
  }

  /** "Bỏ khỏi việc học": the item leaves every group; its log stays (D33). */
  async forget(userId: string, itemId: string): Promise<void> {
    const profile = await this.profile(userId);
    await this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      if (!await tx.learningItem.findFirst({ where: { id: itemId, userId }, select: { id: true } })) throw notFound();
      await this.deleteItem(tx, userId, itemId, null, profile.timezone);
    }, transactionOptions);
  }

  async states(userId: string, senseIds: string[]): Promise<{ items: ItemState[] }> {
    const rows = await this.prisma.learningItem.findMany({
      where: { userId, senseId: { in: senseIds } }, include: { groups: { orderBy: { groupId: 'asc' } } },
    });
    const bySense = new Map(rows.map((row) => [row.senseId, row]));
    return { items: [...new Set(senseIds)].flatMap((senseId) => {
      const row = bySense.get(senseId);
      return row ? [{
        sense_id: senseId, item_id: row.id, level: row.level, due_date: dateString(row.dueDate), priority: row.priority,
        group_ids: row.groups.map(({ groupId }) => groupId),
      }] : [];
    }) };
  }

  async listGroup(userId: string, groupId: string, query: { cell?: Cell; page_size: number; page_token?: string }):
    Promise<{ items: GroupItemView[]; next_page_token: string | null }> {
    await this.groups.assertOwned(this.prisma, userId, groupId);
    const binding = `${groupId}:${query.cell ?? ''}`;
    let after: { addedAt: Date; itemId: string } | undefined;
    if (query.page_token !== undefined) {
      const cursor = decodeBoundToken(query.page_token, binding);
      if (!cursor || typeof cursor.at !== 'string' || typeof cursor.id !== 'string' || Number.isNaN(Date.parse(cursor.at))) {
        throw invalidInput();
      }
      after = { addedAt: new Date(cursor.at), itemId: cursor.id };
    }
    const cell = query.cell === undefined ? {} : query.cell === 'priority' ? { priority: true } : { level: query.cell };
    const rows = await this.prisma.groupItem.findMany({
      where: {
        groupId, item: cell,
        ...(after ? { OR: [{ addedAt: { gt: after.addedAt } }, { addedAt: after.addedAt, itemId: { gt: after.itemId } }] } : {}),
      },
      include: { item: { include: { _count: { select: { groups: true } } } } },
      orderBy: [{ addedAt: 'asc' }, { itemId: 'asc' }], take: query.page_size + 1,
    });
    const page = rows.slice(0, query.page_size);
    const visible = await this.content.visibleSenseIds(userId, page.map((row) => row.item.senseId));
    const last = page[page.length - 1];
    return {
      items: page.map(({ item, addedAt }) => ({
        item_id: item.id, sense_id: item.senseId, level: item.level, due_date: dateString(item.dueDate), priority: item.priority,
        group_count: item._count.groups, sense_changed: !visible.has(item.senseId), added_at: addedAt.toISOString(),
      })),
      next_page_token: rows.length > query.page_size
        ? encodeBoundToken({ at: last.addedAt.toISOString(), id: last.itemId }, binding) : null,
    };
  }

  /**
   * Links the senses to the group, creating the items that do not exist yet. INSERT … ON CONFLICT DO NOTHING plus a read
   * back means two adds of one sense at the same moment give one item, never a unique-violation 500.
   */
  private async ensureItems(tx: Prisma.TransactionClient, userId: string, groupId: string, senseIds: string[], today: string) {
    if (senseIds.length === 0) return [];
    const at = this.clock.now();
    const start = newItem(today);
    const created = await tx.learningItem.createManyAndReturn({
      data: senseIds.map((senseId) => ({
        userId, senseId, level: start.level, dueDate: dateValue(start.dueDate), priority: start.priority, createdAt: at,
      })),
      skipDuplicates: true, select: { id: true },
    });
    const createdIds = new Set(created.map(({ id }) => id));
    const items = await tx.learningItem.findMany({ where: { userId, senseId: { in: senseIds } } });
    await tx.groupItem.createMany({ data: items.map((item) => ({ groupId, itemId: item.id, addedAt: at })), skipDuplicates: true });
    await tx.learningLogEntry.createMany({ data: items.filter((item) => createdIds.has(item.id)).map((item) => ({
      userId, itemId: item.id, senseId: item.senseId, groupId, kind: 'item_added', levelAfter: item.level,
      dueAfter: item.dueDate, localDate: dateValue(today), at,
    })) });
    const bySense = new Map(items.map((item) => [item.senseId, { ...item, created: createdIds.has(item.id) }]));
    return senseIds.map((senseId) => bySense.get(senseId)!);
  }

  private async deleteItem(tx: Prisma.TransactionClient, userId: string, itemId: string, groupId: string | null, timeZone: string) {
    const item = await tx.learningItem.delete({ where: { id: itemId } });
    const at = this.clock.now();
    await tx.learningLogEntry.create({ data: {
      userId, itemId, senseId: item.senseId, groupId, kind: 'item_removed', levelBefore: item.level, dueBefore: item.dueDate,
      localDate: dateValue(localDate(timeZone, at)), at,
    } });
  }

  private async profile(userId: string) {
    const profile = await this.identity.getProfile(userId);
    if (!profile) throw notFound();
    return profile;
  }

  private async today(userId: string): Promise<string> {
    return localDate((await this.profile(userId)).timezone, this.clock.now());
  }
}

function addResult(item: { id: string; level: number; dueDate: Date }, created: boolean): AddResult {
  return { item_id: item.id, level: item.level, due_date: dateString(item.dueDate), created };
}
