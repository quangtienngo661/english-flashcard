import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { dateString, localDate } from '../../common/time/local-date.js';
import { ContentService, type WordSense } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import { SettingsService, type AppSettings } from '../../settings/index.js';
import { GroupsService } from '../groups/groups.service.js';
import { sectionOf, type Section } from '../schedule/schedule.js';
import {
  groupStatsQuery, queueItemsQuery, reviewsDoneQuery, type GroupStatsRow, type LearnerDay, type QueueRow,
} from './queue.queries.js';

export type GroupSummary = {
  id: string; name: string; version: number; total: number; today: { priority: number; due: number; new: number };
  cells: Array<{ level: number; total: number; due: number }>; backlog: number;
};
export type Card = {
  item_id: string; sense_id: string; level: number; due_date: string; priority: boolean; section: Section;
  content: WordSense & { sentences: string[] };
};

/** Cards left today after the caps (design 6.2): capped sections never go below zero (B3E9); an empty review cap is no limit (D35). */
function today(row: GroupStatsRow, caps: AppSettings['learning']) {
  return {
    priority: row.priority,
    due: caps.reviewsPerGroupPerDay === null ? row.due_available
      : Math.max(0, Math.min(row.due_available, caps.reviewsPerGroupPerDay - row.due_done)),
    new: Math.max(0, Math.min(row.new_available, caps.newPerGroupPerDay - row.new_done)),
  };
}

@Injectable()
export class QueueService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(ContentService) private readonly content: ContentService,
    @Inject(GroupsService) private readonly groups: GroupsService,
  ) {}

  /** `GET /v1/groups`: groups with priority first, then most cards waiting, then name (design 6.3). */
  async list(userId: string): Promise<{ items: GroupSummary[] }> {
    const [day, { learning }] = await Promise.all([this.today(userId), this.settings.get()]);
    const rows = await this.prisma.$queryRaw<GroupStatsRow[]>(groupStatsQuery([{ userId, today: day }], learning.backlogAfterDays));
    const items = rows.map((row) => ({
      id: row.group_id, name: row.name, version: row.version, total: row.total, today: today(row, learning),
      cells: row.cell_total.map((total, level) => ({ level, total, due: row.cell_due[level] })), backlog: row.backlog,
    }));
    const waiting = (g: GroupSummary) => g.today.priority + g.today.due + g.today.new;
    items.sort((a, b) => Number(b.today.priority > 0) - Number(a.today.priority > 0) || waiting(b) - waiting(a)
      || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return { items };
  }

  /** Learners (of the given ones) with at least one card left today after the caps. */
  async cardsLeftToday(entries: LearnerDay[]): Promise<Set<string>> {
    if (entries.length === 0) return new Set();
    const { learning } = await this.settings.get();
    const rows = await this.prisma.$queryRaw<GroupStatsRow[]>(groupStatsQuery(entries, learning.backlogAfterDays));
    return new Set(rows.filter((row) => {
      const left = today(row, learning);
      return left.priority + left.due + left.new > 0;
    }).map((row) => row.user_id));
  }

  async queue(userId: string, groupId: string, mode: 'due' | 'all', nativeLanguage: 'vi' | 'en'): Promise<{ cards: Card[] }> {
    const [day, { learning }] = await Promise.all([this.today(userId), this.settings.get()]);
    await this.groups.assertOwned(this.prisma, userId, groupId);
    const backlogDays = learning.backlogAfterDays;
    const read = (section: Parameters<typeof queueItemsQuery>[4]) =>
      this.prisma.$queryRaw<QueueRow[]>(queueItemsQuery(userId, groupId, day, backlogDays, section));
    let rows: QueueRow[];
    if (mode === 'all') {
      rows = await read({ kind: 'all' });
    } else {
      const [done] = await this.prisma.$queryRaw<Array<{ due_done: number; new_done: number }>>(
        reviewsDoneQuery(userId, groupId, day));
      const dueLimit = learning.reviewsPerGroupPerDay === null ? null
        : Math.max(0, learning.reviewsPerGroupPerDay - done.due_done);
      const newLimit = Math.max(0, learning.newPerGroupPerDay - done.new_done);
      rows = [
        ...await read({ kind: 'priority' }),
        ...(dueLimit === null || dueLimit > 0 ? await read({ kind: 'due', limit: dueLimit }) : []),
        ...(newLimit > 0 ? await read({ kind: 'new', limit: newLimit }) : []),
      ];
    }
    const senseIds = rows.map((row) => row.sense_id);
    const [contents, sentences] = await Promise.all([
      this.content.cardContent(userId, senseIds, nativeLanguage), this.content.listSentences(userId, senseIds),
    ]);
    // A sense hidden between the two reads has no content: its card is left out rather than sent empty.
    return { cards: rows.flatMap((row) => {
      const content = contents.get(row.sense_id);
      if (!content) return [];
      const state = { level: row.level, dueDate: dateString(row.due_date), priority: row.priority };
      return [{
        item_id: row.item_id, sense_id: row.sense_id, level: row.level, due_date: state.dueDate, priority: row.priority,
        section: sectionOf(state, day, backlogDays),
        content: { ...content, sentences: (sentences.get(row.sense_id) ?? []).map(({ text }) => text) },
      }];
    }) };
  }

  private async today(userId: string): Promise<string> {
    const profile = await this.identity.getProfile(userId);
    if (!profile) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return localDate(profile.timezone, this.clock.now());
  }
}
