import { describe, expect, it, vi } from 'vitest';
import { AccountDeletionRegistry } from '../identity/deletion/account-eraser.js';
import { IdentitySettingsProvider } from './identity-settings.provider.js';
import { SETTINGS_DEFAULTS } from './settings.definitions.js';
import type { SettingsService } from './settings.service.js';

describe('IdentitySettingsProvider', () => {
  it('registers itself and reads both numbers from the current settings', async () => {
    const values = structuredClone(SETTINGS_DEFAULTS);
    values.identity.unverifiedCleanupDays = 3;
    values.entitlements.transactionRetentionYears = 8;
    const registry = new AccountDeletionRegistry();
    const provider = new IdentitySettingsProvider(registry, { get: vi.fn(async () => values) } as unknown as SettingsService);
    provider.onModuleInit();
    expect(registry.settings()).toBe(provider);
    expect(await provider.unverifiedCleanupDays()).toBe(3);
    expect(await provider.transactionRetentionYears()).toBe(8);
  });
});
