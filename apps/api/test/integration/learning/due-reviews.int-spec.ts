import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeClock } from '../../../src/common/clock/clock.js';
import { localDate } from '../../../src/common/time/local-date.js';
import type { ContentService } from '../../../src/content/content.service.js';
import type { IdentityService } from '../../../src/identity/profile/identity.service.js';
import { GroupsService } from '../../../src/learning/groups/groups.service.js';
import { QueueService } from '../../../src/learning/queue/queue.service.js';
import type { SettingsService } from '../../../src/settings/settings.service.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('TST-01: due reviews respect Asia/Ho_Chi_Minh midnight boundary on Postgres', () => {
  let db: IntegrationPrisma;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
  });

  afterAll(async () => {
    await db.close();
  });

  it('includes item due at 2026-11-23 16:59:59Z (23:59:59 VN) and excludes item due at 17:00:00Z (00:00 VN next day)', async () => {
    const userId = randomUUID();
    const tz = 'Asia/Ho_Chi_Minh';
    const now = new Date('2026-11-23T10:00:00.000Z');
    const clock = new FakeClock(now);

    const dueTodayDate = new Date(`${localDate(tz, new Date('2026-11-23T16:59:59.000Z'))}T00:00:00.000Z`);
    const dueTomorrowDate = new Date(`${localDate(tz, new Date('2026-11-23T17:00:00.000Z'))}T00:00:00.000Z`);
    expect(dueTodayDate.toISOString().slice(0, 10)).toBe('2026-11-23');
    expect(dueTomorrowDate.toISOString().slice(0, 10)).toBe('2026-11-24');

    // Create two private entries + senses owned by this learner so visibleSenseCondition matches them.
    const entry1Id = randomUUID();
    const entry2Id = randomUUID();
    const sense1Id = randomUUID();
    const sense2Id = randomUUID();
    const groupId = randomUUID();
    const item1Id = randomUUID();
    const item2Id = randomUUID();

    await db.prisma.entry.createMany({
      data: [
        { id: entry1Id, scope: 'private', ownerUserId: userId, lemma: 'apple', pos: 'noun', createdAt: now, updatedAt: now },
        { id: entry2Id, scope: 'private', ownerUserId: userId, lemma: 'banana', pos: 'noun', createdAt: now, updatedAt: now },
      ],
    });
    await db.prisma.sense.createMany({
      data: [
        { id: sense1Id, entryId: entry1Id, state: 'open', liveRevisionId: randomUUID(), createdAt: now },
        { id: sense2Id, entryId: entry2Id, state: 'open', liveRevisionId: randomUUID(), createdAt: now },
      ],
    });
    await db.prisma.learningGroup.create({
      data: { id: groupId, userId, name: 'Fruits', nameKey: 'fruits', version: 0, createdAt: now, updatedAt: now },
    });
    await db.prisma.learningItem.createMany({
      data: [
        { id: item1Id, userId, senseId: sense1Id, level: 1, dueDate: dueTodayDate, priority: false, createdAt: now },
        { id: item2Id, userId, senseId: sense2Id, level: 1, dueDate: dueTomorrowDate, priority: false, createdAt: now },
      ],
    });
    await db.prisma.groupItem.createMany({
      data: [
        { groupId, itemId: item1Id, addedAt: now },
        { groupId, itemId: item2Id, addedAt: now },
      ],
    });

    const identity = { getProfile: async () => ({ timezone: tz }) } as unknown as IdentityService;
    const settings = {
      get: async () => ({ learning: { reviewsPerGroupPerDay: 50, newPerGroupPerDay: 20, backlogAfterDays: 60 } }),
    } as unknown as SettingsService;
    const content = {
      cardContent: async (_u: string, ids: string[]) =>
        new Map(ids.map((id) => [id, {
          sense_id: id, lemma: id === sense1Id ? 'apple' : 'banana', pos: 'noun', meaning: 'm', example: null,
          ipa_uk: null, ipa_us: null, audio_uk_url: null, audio_us_url: null, cefr: null, scope: 'private',
        }])),
      listSentences: async () => new Map<string, string[]>(),
    } as unknown as ContentService;
    const groups = new GroupsService(db.prisma, clock, identity, settings);
    const queue = new QueueService(db.prisma, clock, identity, settings, content, groups);

    // At 2026-11-23T10:00:00Z (17:00 VN on 23/11): only item 1 is due
    const resToday = await queue.queue(userId, groupId, 'due', 'vi');
    expect(resToday.cards.map((c) => c.item_id)).toEqual([item1Id]);

    // At 2026-11-23T17:00:00Z (00:00 VN on 24/11): both items are due
    clock.set(new Date('2026-11-23T17:00:00.000Z'));
    const resNextDay = await queue.queue(userId, groupId, 'due', 'vi');
    expect(resNextDay.cards.map((c) => c.item_id).sort()).toEqual([item1Id, item2Id].sort());
  });
});
