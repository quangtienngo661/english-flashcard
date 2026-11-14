import { describe, expect, it } from 'vitest';
import { AccountDeletionRegistry, ERASE_ORDER, type AccountDataEraser, type ErasableModule } from './account-eraser.js';

const eraser = (module: ErasableModule): AccountDataEraser => ({ module, erase: async () => {} });

describe('AccountDeletionRegistry (fail closed, B8E23)', () => {
  it('returns the erasers in ERASE_ORDER whatever the registration order', () => {
    const registry = new AccountDeletionRegistry();
    for (const module of [...ERASE_ORDER].reverse()) registry.registerEraser(eraser(module));
    expect(registry.erasers().map((e) => e.module)).toEqual([...ERASE_ORDER]);
    expect(ERASE_ORDER[0]).toBe('practice');
  });

  it.each(ERASE_ORDER)('throws naming %s when its eraser is missing', (missing) => {
    const registry = new AccountDeletionRegistry();
    for (const module of ERASE_ORDER.filter((m) => m !== missing)) registry.registerEraser(eraser(module));
    expect(() => registry.erasers()).toThrow(`Account deletion port not registered: eraser of ${missing}`);
  });

  it('throws when the precondition or the settings reader is missing, returns them once registered', () => {
    const registry = new AccountDeletionRegistry();
    expect(() => registry.precondition()).toThrow(/precondition/);
    expect(() => registry.settings()).toThrow(/settings reader/);
    const precondition = { renewing: async () => false, turnOffRenewalForAdminDelete: async () => 'none' as const };
    const settings = { unverifiedCleanupDays: async () => 7, transactionRetentionYears: async () => 10 };
    registry.registerPrecondition(precondition);
    registry.registerSettingsReader(settings);
    expect(registry.precondition()).toBe(precondition);
    expect(registry.settings()).toBe(settings);
  });
});
