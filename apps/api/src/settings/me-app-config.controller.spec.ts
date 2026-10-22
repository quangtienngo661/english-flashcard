import { describe, expect, it } from 'vitest';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import type { RequestWithUser } from '../common/request-user/request-user.js';
import { MeAppConfigController } from './me-app-config.controller.js';
import { SETTINGS_DEFAULTS, type AppSettings } from './settings.definitions.js';
import type { SettingsService } from './settings.service.js';

const req = { user: { userId: 'u1', sessionChainId: 'c1' } } as unknown as RequestWithUser;

describe('GET /v1/me/app-config', () => {
  it('GG1: reads the settings on every request, so an admin change shows at once', async () => {
    let values: AppSettings = SETTINGS_DEFAULTS;
    const controller = new MeAppConfigController({ get: async () => values } as unknown as SettingsService);
    expect((await controller.read(req)).practice.max_questions_per_session).toBe(20);
    values = { ...SETTINGS_DEFAULTS, practice: { ...SETTINGS_DEFAULTS.practice, maxQuestionsPerSession: 30 } };
    expect((await controller.read(req)).practice.max_questions_per_session).toBe(30);
  });

  it('GG4: needs only a signed-in user, not a learner profile with a language (no @LearnerContent)', () => {
    // @LearnerContent() adds a guard (403 profile-incomplete); this route must carry none of its own.
    expect(Reflect.getMetadata(GUARDS_METADATA, MeAppConfigController)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, MeAppConfigController.prototype.read)).toBeUndefined();
  });
});
