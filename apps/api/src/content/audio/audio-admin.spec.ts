import { describe, expect, it, vi } from 'vitest';
import { REQUIRED_PERMISSION_KEY } from '../../identity/staff/require-permission.decorator.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { AdminSensesController } from '../senses/admin-senses.controller.js';
import type { ContentService } from '../content.service.js';
import type { AudioService } from './audio.service.js';

const senseId = '00000000-0000-4000-8000-0000000000b1';

function controller(found: boolean, retried = 1) {
  const prisma = { sense: { findFirst: vi.fn(async () => (found ? { id: senseId } : null)) } };
  const audio = { retryForSense: vi.fn(async () => retried) };
  return { prisma, audio, controller: new AdminSensesController(prisma as unknown as PrismaClient, {} as ContentService, audio as unknown as AudioService) };
}

describe('POST /v1/admin/content/senses/:id/audio/retry (H13)', () => {
  it('returns how many failed recordings were put back, and only looks at catalog senses', async () => {
    const t = controller(true, 2);
    await expect(t.controller.retryAudio({ id: senseId })).resolves.toEqual({ retried: 2 });
    expect(t.prisma.sense.findFirst).toHaveBeenCalledWith({ where: { id: senseId, entry: { scope: 'catalog' } }, select: { id: true } });
    expect(t.audio.retryForSense).toHaveBeenCalledExactlyOnceWith(senseId);
  });

  it('an unknown sense is 404 and retries nothing', async () => {
    const t = controller(false);
    await expect(t.controller.retryAudio({ id: senseId })).rejects.toMatchObject({ status: 404 });
    expect(t.audio.retryForSense).not.toHaveBeenCalled();
  });

  it('answers 202 and needs content.edit', () => {
    expect(Reflect.getMetadata('__httpCode__', AdminSensesController.prototype.retryAudio)).toBe(202);
    expect(Reflect.getMetadata(REQUIRED_PERMISSION_KEY, AdminSensesController)).toEqual(['content.edit']);
  });
});
