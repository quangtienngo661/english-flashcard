import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateValue, localDate } from '../../common/time/local-date.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService } from '../../settings/index.js';
import { lockItems, withLearnerLock } from '../learning-lock.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

type GroupRow = { id: string; name: string; version: number; createdAt: Date; updatedAt: Date };
export type GroupView = {
  id: string; name: string; version: number; item_count: number; created_at: string; updated_at: string;
};
export type GroupDetailView = GroupView & { removable_items: number };

const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const versionConflict = () => new ProblemDetailsException({ status: 409, title: 'Version conflict', type: 'version-conflict' });
const nameTaken = () => new ProblemDetailsException({ status: 409, title: 'Group name taken', type: 'group-name-taken' });

function isUniqueViolation(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
}

function view(row: GroupRow, itemCount: number): GroupView {
  return {
    id: row.id, name: row.name, version: row.version, item_count: itemCount,
    created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
  };
}

/** Items of the group that are in no other group: deleting the group removes them from learning. */
const removableWhere = (groupId: string) => ({ groups: { some: { groupId }, every: { groupId } } });

@Injectable()
export class GroupsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  async create(userId: string, name: string): Promise<GroupView> {
    // Read before the lock: existing groups above a lowered limit stay, only new ones are refused (B5E64).
    const { groupsPerUser } = (await this.settings.get()).learning;
    try {
      return await this.prisma.$transaction(async (tx) => {
        await withLearnerLock(tx, userId);
        if (await tx.learningGroup.count({ where: { userId } }) >= groupsPerUser) {
          throw new ProblemDetailsException({ status: 409, title: 'Group limit reached', type: 'group-limit-reached' });
        }
        const now = this.clock.now();
        const row = await tx.learningGroup.create({
          data: { userId, name, nameKey: name.toLowerCase(), createdAt: now, updatedAt: now },
        });
        return view(row, 0);
      }, transactionOptions);
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  async rename(userId: string, id: string, name: string, version: number): Promise<GroupView> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const group = await this.assertOwned(tx, userId, id);
        if (group.version !== version) throw versionConflict();
        // The version guard makes a concurrent rename of the same version update nothing.
        const { count } = await tx.learningGroup.updateMany({
          where: { id, version },
          data: { name, nameKey: name.toLowerCase(), version: version + 1, updatedAt: this.clock.now() },
        });
        if (count === 0) throw versionConflict();
        const row = await tx.learningGroup.findUniqueOrThrow({ where: { id } });
        return view(row, await tx.groupItem.count({ where: { groupId: id } }));
      }, transactionOptions);
    } catch (error) {
      if (isUniqueViolation(error)) throw nameTaken();
      throw error;
    }
  }

  async get(userId: string, id: string): Promise<GroupDetailView> {
    return this.prisma.$transaction(async (tx) => {
      const group = await this.assertOwned(tx, userId, id);
      const [itemCount, removable] = await Promise.all([
        tx.groupItem.count({ where: { groupId: id } }),
        tx.learningItem.count({ where: removableWhere(id) }),
      ]);
      return { ...view(group, itemCount), removable_items: removable };
    }, transactionOptions);
  }

  /** Deletes any group, the learner's last one included; items left in no group leave learning (B3E18). */
  async delete(userId: string, id: string): Promise<void> {
    const profile = await this.identity.getProfile(userId);
    if (!profile) throw notFound();
    await this.prisma.$transaction(async (tx) => {
      await withLearnerLock(tx, userId);
      await this.assertOwned(tx, userId, id);
      // Wait for any review in progress on the group's items, so the log keeps the level it left behind (L4).
      const linked = await tx.groupItem.findMany({ where: { groupId: id }, select: { itemId: true } });
      await lockItems(tx, userId, linked.map(({ itemId }) => itemId));
      const removable = await tx.learningItem.findMany({
        where: removableWhere(id), select: { id: true, senseId: true, level: true, dueDate: true },
      });
      const at = this.clock.now();
      const today = dateValue(localDate(profile.timezone, at));
      await tx.learningGroup.delete({ where: { id } });
      await tx.learningItem.deleteMany({ where: { id: { in: removable.map((item) => item.id) } } });
      await tx.learningLogEntry.createMany({ data: removable.map((item) => ({
        userId, itemId: item.id, senseId: item.senseId, groupId: id, kind: 'item_removed',
        levelBefore: item.level, dueBefore: item.dueDate, localDate: today, at,
      })) });
    }, transactionOptions);
  }

  /** The caller's group, or 404 for a missing group and for another learner's group alike. */
  async assertOwned(tx: Prisma.TransactionClient, userId: string, groupId: string): Promise<GroupRow> {
    const group = await tx.learningGroup.findFirst({ where: { id: groupId, userId } });
    if (!group) throw notFound();
    return group;
  }
}
