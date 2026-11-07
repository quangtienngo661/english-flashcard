import { describe, expect, it } from 'vitest';
import { contentSchema, toContent } from './content-body.js';

describe('contentSchema / toContent — ipa (round C, H11)', () => {
  it('accepts ipa_uk and ipa_us and maps them to ipaUk / ipaUs', () => {
    const body = contentSchema.parse({ ipa_uk: 'ˈlɛd', ipa_us: 'lɛd' });
    expect(toContent(body)).toEqual({ ipaUk: 'ˈlɛd', ipaUs: 'lɛd' });
  });

  it('null clears and an absent field is left out of the patch', () => {
    expect(toContent(contentSchema.parse({ ipa_uk: null }))).toEqual({ ipaUk: null });
    expect(toContent(contentSchema.parse({ gloss_vi: 'chì' }))).toEqual({ glossVi: 'chì' });
  });

  it('still refuses unknown fields', () => {
    expect(contentSchema.safeParse({ ipa_gb: 'x' }).success).toBe(false);
  });
});
