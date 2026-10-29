import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import type { GroupsService } from '../groups/groups.service.js';
import { BacklogService } from './backlog.service.js';

/** `overdueDays` is how long each returned item is overdue on 2026-10-20 (the learner's day at the fixed clock). */
function setup(overdueDays: number[]) {
  const events: string[] = [];
  const due = (days: number) => new Date(Date.UTC(2026, 9, 20 - days));
  const tx = {
    $executeRaw: vi.fn(async () => 0),
    $queryRaw: vi.fn(async () => []),
    learningItem: {
      findMany: vi.fn(async () => overdueDays.map((days, index) => ({ id: `i${index}`, senseId: `s${index}`, level: 2, dueDate: due(days) }))),
      updateMany: vi.fn(async () => { events.push('update'); }),
    },
    learningLogEntry: { createMany: vi.fn(async () => { events.push('log'); }) },
    learningActivityDay: { createMany: vi.fn(async () => { events.push('activity'); return { count: 1 }; }) },
  };
  const prisma = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } as unknown as PrismaClient;
  const identity = { getProfile: vi.fn(async () => ({ timezone: 'Asia/Ho_Chi_Minh' })) } as unknown as IdentityService;
  const service = new BacklogService(prisma, new FakeClock(new Date('2026-10-19T17:01:00Z')), identity,
    { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService, {} as ContentService, {} as GroupsService);
  return { service, tx, events };
}

describe('BacklogService.relearn — records a learning activity day (nhóm B M6, D39)', () => {
  it('relearning one eligible item (overdue by more than the 60 backlog days) writes the log row, then one activity statement', async () => {
    const { service, tx, events } = setup([61]);
    await expect(service.relearn('u1', ['i0'])).resolves.toEqual({ relearned: 1 });
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledExactlyOnceWith({
      data: [{ userId: 'u1', localDate: new Date('2026-10-20T00:00:00.000Z') }], skipDuplicates: true,
    });
    expect(events).toEqual(['update', 'log', 'activity']);
  });

  it('three eligible items still write one activity statement', async () => {
    const { service, tx } = setup([61, 90, 200]);
    await expect(service.relearn('u1', ['i0', 'i1', 'i2'])).resolves.toEqual({ relearned: 3 });
    expect(tx.learningActivityDay.createMany).toHaveBeenCalledOnce();
  });

  it('an item overdue by exactly the backlog days (60) is not eligible: nothing relearned, no activity', async () => {
    const { service, tx } = setup([60]);
    await expect(service.relearn('u1', ['i0'])).resolves.toEqual({ relearned: 0 });
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });

  it('no item found at all writes none', async () => {
    const { service, tx } = setup([]);
    await expect(service.relearn('u1', ['x'])).resolves.toEqual({ relearned: 0 });
    expect(tx.learningActivityDay.createMany).not.toHaveBeenCalled();
  });
});
