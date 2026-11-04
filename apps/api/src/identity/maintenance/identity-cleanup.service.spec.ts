import { describe, expect, it, vi } from 'vitest';
import type { MaintenanceScheduler } from '../../common/maintenance/maintenance.scheduler.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { IdentityCleanupService } from './identity-cleanup.service.js';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const HOUR = 3_600_000;

function setup() {
  const deleteMany = vi.fn(async () => ({ count: 0 }));
  const prisma = {
    refreshToken: { updateMany: vi.fn(async () => ({ count: 0 })) },
    otpCode: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    sessionChain: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    otpFailureWindow: { deleteMany },
  } as unknown as PrismaClient;
  const scheduler = { register: vi.fn() } as unknown as MaintenanceScheduler;
  return { service: new IdentityCleanupService(prisma, scheduler), deleteMany };
}

describe('IdentityCleanupService otp_failure_windows (B1-5, LA2#7)', () => {
  it('deletes a window that started more than 48 hours ago and whose lock, if any, has ended', async () => {
    const { service, deleteMany } = setup();
    await service.runOnce(NOW);
    expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        windowStart: { lt: new Date(NOW.getTime() - 48 * HOUR) },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: NOW } }],
      },
    });
  });

  it('reports how many it deleted', async () => {
    const { service, deleteMany } = setup();
    deleteMany.mockResolvedValueOnce({ count: 3 });
    expect(await service.runOnce(NOW)).toMatchObject({ otpFailureWindows: 3 });
  });
});
