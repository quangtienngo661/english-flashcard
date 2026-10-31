import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { AdminSpend } from './admin-spend.service.js';
import type { CallLedger } from './call-ledger.service.js';

const NOW = new Date('2026-10-30T05:00:00.000Z');
const PRICE = { input: 1, cachedInput: null, output: 5 };

function setup(spent: number, cap: number | null) {
  const spentToday = vi.fn(async (_now: Date) => spent);
  const settings = { get: vi.fn(async () => ({ ...SETTINGS_DEFAULTS, ai: { ...SETTINGS_DEFAULTS.ai, adminDailyUsdCap: cap } })) };
  const service = new AdminSpend(settings as unknown as SettingsService, { adminSpentToday: spentToday } as unknown as CallLedger);
  return { service, spentToday };
}

async function problemOf(promise: Promise<unknown>): Promise<{ status: number; type: string }> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    const problem = error as ProblemDetailsException;
    return { status: problem.getStatus(), type: problem.problemType };
  }
  throw new Error('expected a problem');
}

describe('AdminSpend.reached (design §5.5, B20)', () => {
  it('cap 2: 1.99 is under, 2.00 and 2.01 are reached', async () => {
    await expect(setup(1.99, 2).service.reached(NOW)).resolves.toBe(false);
    await expect(setup(2, 2).service.reached(NOW)).resolves.toBe(true);
    await expect(setup(2.01, 2).service.reached(NOW)).resolves.toBe(true);
  });

  it('no cap (null) is never reached, and the ledger is not even asked', async () => {
    const { service, spentToday } = setup(500, null);
    await expect(service.reached(NOW)).resolves.toBe(false);
    expect(spentToday).not.toHaveBeenCalled();
  });

  it('cap 0 blocks everything, even with nothing spent', async () => {
    await expect(setup(0, 0).service.reached(NOW)).resolves.toBe(true);
  });

  it('asks the ledger for the day of `now`', async () => {
    const { service, spentToday } = setup(0.1, 2);
    await service.reached(NOW);
    expect(spentToday).toHaveBeenCalledWith(NOW);
  });
});

describe('AdminSpend.assertCanStart (B22, E14)', () => {
  it('no price → 409 model-price-missing, before the spend is read', async () => {
    const { service, spentToday } = setup(100, 2);
    await expect(problemOf(service.assertCanStart(null, NOW))).resolves.toEqual({ status: 409, type: 'model-price-missing' });
    expect(spentToday).not.toHaveBeenCalled();
  });

  it('a price and the cap reached → 409 admin-usd-cap', async () => {
    await expect(problemOf(setup(2, 2).service.assertCanStart(PRICE, NOW))).resolves.toEqual({ status: 409, type: 'admin-usd-cap' });
  });

  it('a price and room under the cap, or no cap → resolves', async () => {
    await expect(setup(1.99, 2).service.assertCanStart(PRICE, NOW)).resolves.toBeUndefined();
    await expect(setup(500, null).service.assertCanStart(PRICE, NOW)).resolves.toBeUndefined();
  });
});
