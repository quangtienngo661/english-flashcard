import { describe, expect, it } from 'vitest';
import { AdminSettingsController } from './admin-settings.controller.js';
import { SETTINGS_DEFAULTS, toApiValues } from './settings.definitions.js';
import type { SettingsService } from './settings.service.js';

describe('GET /v1/admin/settings', () => {
  it('returns the defaults beside the stored values, one section per key', async () => {
    const values = toApiValues(SETTINGS_DEFAULTS);
    const controller = new AdminSettingsController({
      current: async () => ({ version: 3, values: SETTINGS_DEFAULTS }),
    } as unknown as SettingsService);

    const body = await controller.read();

    expect(body.version).toBe(3);
    expect(body.defaults.practice.max_questions_per_session).toBe(20);
    expect(body.defaults.ai.usd_vnd_rate).toBe(26100);
    for (const section of Object.keys(values) as Array<keyof typeof values>) {
      expect(Object.keys(body.defaults[section])).toEqual(Object.keys(body.values[section]));
    }
  });
});
