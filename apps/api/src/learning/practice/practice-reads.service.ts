import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, localDate } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { GroupsService } from '../groups/groups.service.js';
import { isDueNow, sectionOf, type Section } from '../schedule/schedule.js';
import {
  groupMatesQuery, practiceItemOfSenseQuery, practiceItemsQuery, type GroupFilter, type ItemsWhere, type PracticeItemRow,
} from './practice-reads.queries.js';

export type PracticeItem = {
  item_id: string; sense_id: string; level: number; due_date: string; priority: boolean; section: Section;
  /** Exactly `applyAnswer`'s `wasDue`: "Đã biết" moves the item up today. */
  due_now: boolean;
  /** The earliest group link. */
  added_at: string;
  last_needs_review_at: string | null;
};
export type PracticeScope =
  | { kind: 'today' } | { kind: 'all' } | { kind: 'priority' }
  | { kind: 'group'; groupId: string; filter: GroupFilter } | { kind: 'senses'; senseIds: string[] };
export type PracticeCheck = { item: PracticeItem | null; groupExists: boolean | null; inGroup: boolean | null };

type Db = Prisma.TransactionClient | PrismaClient;

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

function whereOf(scope: PracticeScope): ItemsWhere {
  if (scope.kind !== 'group') return scope.kind === 'today' ? { kind: 'today', groupId: null } : scope;
  const { groupId, filter } = scope;
  if (filter === 'all') return { kind: 'group', groupId };
  if (filter === 'due') return { kind: 'today', groupId };
  if (filter === 'priority') return { kind: 'group-priority', groupId };
  return { kind: 'level', groupId, level: filter };
}

/**
 * Word lists, group mates and item state for Practice (design Bước 4 7.1, 7.4, 7.8); visible senses only, except `check`.
 * Each read takes the client to read through (default: the global one): a caller inside an open transaction passes its `tx`,
 * so the read needs no second connection.
 */
@Injectable()
export class PracticeReadsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(GroupsService) private readonly groups: GroupsService,
  ) {}

  async items(userId: string, scope: PracticeScope, db: Db = this.prisma): Promise<PracticeItem[]> {
    if (scope.kind === 'senses' && scope.senseIds.length === 0) return [];
    // One after the other: with a transaction as `db` they would share its one connection.
    const day = await this.today(userId, db);
    const { learning } = await this.settings.get(db);
    if (scope.kind === 'group') await this.groups.assertOwned(db, userId, scope.groupId);
    const caps = { reviews: learning.reviewsPerGroupPerDay, new: learning.newPerGroupPerDay };
    const rows = await db.$queryRaw<PracticeItemRow[]>(
      practiceItemsQuery(userId, whereOf(scope), day, learning.backlogAfterDays, caps));
    return rows.map((row) => toItem(row, day, learning.backlogAfterDays));
  }

  async groupMates(userId: string, senseIds: string[], db: Db = this.prisma): Promise<Map<string, string[]>> {
    const mates = new Map(senseIds.map((senseId) => [senseId, [] as string[]]));
    if (senseIds.length === 0) return mates;
    const rows = await db.$queryRaw<Array<{ sense_id: string; mates: string[] }>>(groupMatesQuery(userId, senseIds));
    for (const row of rows) mates.set(row.sense_id, row.mates);
    return mates;
  }

  /** The learner's item of the sense ("still in learning", visible or not) and, for a group, whether it still holds it. */
  async check(userId: string, senseId: string, groupId: string | null, db: Db = this.prisma): Promise<PracticeCheck> {
    const day = await this.today(userId, db);
    const { learning } = await this.settings.get(db);
    const [row] = await db.$queryRaw<PracticeItemRow[]>(practiceItemOfSenseQuery(userId, senseId));
    const item = row ? toItem(row, day, learning.backlogAfterDays) : null;
    if (groupId === null) return { item, groupExists: null, inGroup: null };
    const group = await db.learningGroup.findFirst({ where: { id: groupId, userId }, select: { id: true } });
    const inGroup = group !== null && item !== null
      && (await db.groupItem.count({ where: { groupId, itemId: item.item_id } })) > 0;
    return { item, groupExists: group !== null, inGroup };
  }

  private async today(userId: string, db: Db): Promise<string> {
    const profile = await this.identity.getProfile(userId, db);
    if (!profile) throw notFound();
    return localDate(profile.timezone, this.clock.now());
  }
}

function toItem(row: PracticeItemRow, today: string, backlogDays: number): PracticeItem {
  const state = { level: row.level, dueDate: dateString(row.due_date), priority: row.priority };
  return {
    item_id: row.item_id, sense_id: row.sense_id, level: row.level, due_date: state.dueDate, priority: row.priority,
    section: sectionOf(state, today, backlogDays), due_now: isDueNow(state, today), added_at: row.added_at.toISOString(),
    last_needs_review_at: row.last_needs_review_at?.toISOString() ?? null,
  };
}
