import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';

export type ReminderPrefsView = { enabled: boolean; email_verified: boolean };

@Injectable()
export class ReminderPrefsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  /** Reminders are on until the learner turns them off (D25). */
  async isEnabled(userId: string): Promise<boolean> {
    const row = await this.prisma.reminderPref.findUnique({ where: { userId }, select: { enabled: true } });
    return row?.enabled ?? true;
  }

  async get(userId: string): Promise<ReminderPrefsView> {
    const [enabled, emailVerified] = await Promise.all([this.isEnabled(userId), this.identity.isEmailVerified(userId)]);
    return { enabled, email_verified: emailVerified };
  }

  async set(userId: string, enabled: boolean): Promise<ReminderPrefsView> {
    const updatedAt = this.clock.now();
    await this.prisma.reminderPref.upsert({
      where: { userId }, create: { userId, enabled, updatedAt }, update: { enabled, updatedAt },
    });
    return { enabled, email_verified: await this.identity.isEmailVerified(userId) };
  }
}
