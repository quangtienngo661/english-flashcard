import { describe, expect, it, vi } from 'vitest';
import type { Clock } from '../common/clock/clock.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { IdentityService } from '../identity/profile/identity.service.js';
import { SettingsService } from './settings.service.js';

const C = (at: string, oldValue: unknown, newValue: unknown) => ({ oldValue, newValue, changedAt: new Date(at) });
// END(d) = the Vietnam midnight after day d.
const END = (date: string) => new Date(`${date}T17:00:00.000Z`);

const ROWS = [C('2026-10-17T05:00:00Z', 1000, 3), C('2026-10-19T03:00:00Z', 3, 5), C('2026-10-19T08:00:00Z', 5, 7)];

function setup(rows = ROWS) {
  const prisma = {
    appSettingChange: { findMany: vi.fn(async () => rows) },
    appSetting: { findUnique: vi.fn(async () => ({ key: 'global', version: 3, value: { entitlements: { aiDailyCap: 7 } } })) },
  };
  const service = new SettingsService(prisma as unknown as PrismaClient, {} as Clock, {} as IdentityService);
  return { service, prisma };
}

describe('SettingsService.valuesAt (M5-T1)', () => {
  it('one value per instant, in order; one read of the key’s history and one of the current values', async () => {
    const { service, prisma } = setup();
    expect(await service.valuesAt('entitlements.ai_daily_cap', [END('2026-10-16'), END('2026-10-20')])).toEqual([1000, 7]);
    expect(prisma.appSettingChange.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.appSettingChange.findMany).toHaveBeenCalledWith({
      where: { key: 'entitlements.ai_daily_cap' }, orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
      select: { oldValue: true, newValue: true, changedAt: true },
    });
    expect(prisma.appSetting.findUnique).toHaveBeenCalledTimes(1);
  });

  it('instants in any order each get their own value', async () => {
    const { service } = setup();
    expect(await service.valuesAt('entitlements.ai_daily_cap', [END('2026-10-19'), END('2026-10-17'), END('2026-10-16')])).toEqual([7, 3, 1000]);
  });

  it('a key that was never changed → its current value for every instant (here the stored 7)', async () => {
    const { service } = setup([]);
    expect(await service.valuesAt('entitlements.ai_daily_cap', [END('2026-10-16'), END('2026-10-20')])).toEqual([7, 7]);
  });

  it('a key with no stored value → the default for every instant', async () => {
    const { service, prisma } = setup([]);
    prisma.appSetting.findUnique.mockResolvedValue(null as never);
    expect(await service.valuesAt('entitlements.ai_daily_cap', [END('2026-10-20')])).toEqual([1000]);
  });

  it('an unknown key throws before anything is read', async () => {
    const { service, prisma } = setup();
    await expect(service.valuesAt('entitlements.nope', [END('2026-10-16')])).rejects.toThrow('Unknown setting key entitlements.nope');
    await expect(service.valuesAt('constructor', [END('2026-10-16')])).rejects.toThrow('Unknown setting key constructor');
    expect(prisma.appSettingChange.findMany).not.toHaveBeenCalled();
    expect(prisma.appSetting.findUnique).not.toHaveBeenCalled();
  });
});
