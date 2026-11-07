import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import type { ContentService } from '../content.service.js';
import { AdminPublishController } from './admin-publish.controller.js';
import { problemDetails } from './admin-senses.controller.js';
import { ContentRuleError } from './revision-content.js';

const actor = { userId: '00000000-0000-4000-8000-0000000000a1' } as never;
const senseId = '00000000-0000-4000-8000-0000000000b1';
const rule = () => new ContentRuleError('ipa-invalid', { field: 'ipa_uk', char: '1' });

describe('ipa-invalid reaches the app as a 400 naming the field and the character (H11)', () => {
  it('create and save draft (problemDetails)', async () => {
    await expect(problemDetails(async () => { throw rule(); })).rejects.toMatchObject({
      status: 400, problemType: 'ipa-invalid', extensions: { field: 'ipa_uk', char: '1' },
    });
  });

  it('quick-publish', async () => {
    const content = { quickPublish: vi.fn(async () => { throw rule(); }) } as unknown as ContentService;
    const controller = new AdminPublishController(content, {} as AppConfig);
    await expect(controller.quickPublish({ id: senseId }, { revision: 1, content: { ipa_uk: 'lʌg1' } } as never, actor)).rejects.toMatchObject({
      status: 400, problemType: 'ipa-invalid', extensions: { field: 'ipa_uk', char: '1' },
    });
  });

  it('a rule error without detail adds no extensions', async () => {
    await expect(problemDetails(async () => { throw new ContentRuleError('sense-exists'); })).rejects.toMatchObject({ status: 400 });
  });
});
