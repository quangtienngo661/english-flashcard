import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

const day = 86_400_000;

/** Hourly cleanup of Identity tables (design §7); registered with the common scheduler. */
@Injectable()
export class IdentityCleanupService implements OnModuleInit {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(MaintenanceScheduler) private readonly scheduler: MaintenanceScheduler,
  ) {}

  onModuleInit(): void {
    this.scheduler.register('identity-cleanup', (now) => this.runOnce(now));
  }

  async runOnce(now: Date): Promise<{ graceSecrets: number; otpCodes: number; otpFailureWindows: number; chains: number }> {
    const at = (ms: number) => new Date(now.getTime() - ms);
    const graceSecrets = await this.prisma.refreshToken.updateMany({
      where: { successorCiphertext: { not: null }, graceUntil: { lt: now } },
      data: { successorCiphertext: null },
    });
    const otpCodes = await this.prisma.otpCode.deleteMany({ where: { expiresAt: { lt: at(day) } } });
    // B1-5: a wrong-code counter older than 48 hours counts for nothing; one still locking the user stays until the lock ends.
    const otpFailureWindows = await this.prisma.otpFailureWindow.deleteMany({
      where: { windowStart: { lt: at(2 * day) }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
    });
    // "Dead for more than 30 days": revoked 30 d ago, or expired 30 d ago by the 90 d idle or the
    // 365 d absolute limit without ever being revoked. Tokens cascade with their chain.
    const chains = await this.prisma.sessionChain.deleteMany({
      where: {
        OR: [
          { revokedAt: { lt: at(30 * day) } },
          { revokedAt: null, lastUsedAt: { lt: at(120 * day) } },
          { revokedAt: null, createdAt: { lt: at(395 * day) } },
        ],
      },
    });
    return { graceSecrets: graceSecrets.count, otpCodes: otpCodes.count, otpFailureWindows: otpFailureWindows.count, chains: chains.count };
  }
}
