import type { ReminderKind, ReminderLanguage } from './reminder-message.js';

export type { ReminderKind } from './reminder-message.js';
export type NotificationOutcome = 'sent' | 'no-address' | 'budget-exhausted';

/**
 * A channel that delivers a message to a user (design 8.1). Each implementation looks up its own address.
 * `send` throws on a transient transport error so the caller can retry.
 */
export abstract class NotificationProvider {
  abstract readonly channel: 'email' | 'push';
  abstract send(userId: string, message: { kind: ReminderKind; language: ReminderLanguage }): Promise<NotificationOutcome>;
}
