import { UnrecoverableError } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { IdentityService } from '../../identity/profile/identity.service.js';
import type { LearningService } from '../../learning/index.js';
import type { ChannelChooser } from '../provider/channel-chooser.js';
import { NotSentError, type NotificationProvider } from '../provider/notification-provider.js';
import { ReminderSendService } from './reminder-send.service.js';
import type { ReminderQueueService, ReminderSendData } from './reminder-queue.service.js';

const USER = '6f1c2a4e-0b7d-4c1e-9a55-3d2f8e7b6a10';
const DATA: ReminderSendData = { userId: USER, localDate: '2026-10-29', kind: 'regular', language: 'vi' };
const smtp = (fields: Record<string, unknown>) => Object.assign(new Error('smtp'), fields);

function setup(send: NotificationProvider['send']) {
  const rows = new Map<string, { state: string }>();
  const logs: LogEntry[] = [];
  const reminderDelivery = {
    findUnique: vi.fn(async () => rows.get('row') ?? null),
    create: vi.fn(async ({ data }: { data: { state: string } }) => { rows.set('row', { state: data.state }); }),
    update: vi.fn(async ({ data }: { data: { state: string } }) => { rows.set('row', { state: data.state }); }),
    delete: vi.fn(async () => { rows.delete('row'); }),
  };
  const provider = { channel: 'email', send: vi.fn(send) } as unknown as NotificationProvider;
  const service = new ReminderSendService(
    { reminderDelivery } as unknown as PrismaClient,
    new FakeClock(new Date('2026-10-29T03:00:00Z')), // 10:00 on 2026-10-29 in Asia/Saigon
    { choose: async () => [provider] } as unknown as ChannelChooser,
    { cardsLeftToday: async () => new Map([[USER, 5]]) } as unknown as LearningService,
    { getProfile: async () => ({ timezone: 'Asia/Saigon' }) } as unknown as IdentityService,
    {} as ReminderQueueService,
    new AppLogger({ write: (entry) => logs.push(entry) }),
  );
  return { service, rows, logs, provider };
}

describe('ReminderSendService.send (design 8.3, D37)', () => {
  let attempt: { lastAttempt: boolean };
  beforeEach(() => { attempt = { lastAttempt: false }; });

  it('sent → the row is sent and the day is closed', async () => {
    const t = setup(async () => 'sent');
    await t.service.send(DATA, attempt);
    expect(t.rows.get('row')).toEqual({ state: 'sent' });
    expect(t.logs.map((l) => l.event)).toEqual(['reminder_sent']);
  });

  it('B3-3: a failure BEFORE the mailer was called (NotSentError, e.g. a database error) frees the day for the retry', async () => {
    const t = setup(async () => { throw new NotSentError(new Error('database unavailable')); });
    await expect(t.service.send(DATA, attempt)).rejects.toBeInstanceOf(NotSentError);
    expect(t.rows.has('row')).toBe(false);
    expect(t.logs.map((l) => l.event)).toEqual(['reminder_retry']);
  });

  it('B3-3: on the last attempt a NotSentError closes the day as failed, not as "maybe sent"', async () => {
    const t = setup(async () => { throw new NotSentError(new Error('database unavailable')); });
    await expect(t.service.send(DATA, { lastAttempt: true })).rejects.toBeInstanceOf(NotSentError);
    expect(t.rows.get('row')).toEqual({ state: 'failed' });
    expect(t.logs.map((l) => l.event)).toEqual(['reminder_failed']);
  });

  it('an error from the mailer that says nothing about delivery keeps the row sending: losing an email beats sending it twice', async () => {
    const t = setup(async () => { throw smtp({ code: 'ECONNRESET' }); });
    await t.service.send(DATA, attempt);
    expect(t.rows.get('row')).toEqual({ state: 'sending' });
    expect(t.logs.map((l) => l.event)).toEqual(['reminder_outcome_unknown']);
  });

  it('B3-4: a transient SMTP refusal (4xx) logs reminder_retry with ids and the error, frees the day and rethrows for BullMQ', async () => {
    const t = setup(async () => { throw smtp({ responseCode: 421 }); });
    await expect(t.service.send(DATA, attempt)).rejects.toMatchObject({ responseCode: 421 });
    expect(t.rows.has('row')).toBe(false);
    expect(t.logs).toEqual([{ level: 'warn', event: 'reminder_retry', user_id: USER, local_date: '2026-10-29', kind: 'regular', error: { name: 'Error' } }]);
  });

  it('a permanent SMTP error (5xx) closes the day as failed and stops the retries', async () => {
    const t = setup(async () => { throw smtp({ responseCode: 550 }); });
    await expect(t.service.send(DATA, attempt)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(t.rows.get('row')).toEqual({ state: 'failed' });
  });
});
