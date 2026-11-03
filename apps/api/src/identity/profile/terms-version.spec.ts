import { describe, expect, it } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import { TermsVersion } from './terms-version.js';

// Q (legal documents, 03/11/2026): the version a learner accepts is the one the admin published; the env value only covers the time before the first one.
describe('TermsVersion', () => {
  it('is the TERMS_VERSION of the config while no source is registered', async () => {
    expect(await new TermsVersion(testConfig()).current()).toBe(testConfig().termsVersion);
  });

  it('is the version the registered source reports', async () => {
    const terms = new TermsVersion(testConfig());
    terms.register({ current: async () => '3' });
    expect(await terms.current()).toBe('3');
  });

  it('falls back to the config when the source has nothing published yet', async () => {
    const terms = new TermsVersion(testConfig());
    terms.register({ current: async () => null });
    expect(await terms.current()).toBe(testConfig().termsVersion);
  });

  it('does not hide a failing source: a sign-up must not record the wrong version', async () => {
    const terms = new TermsVersion(testConfig());
    terms.register({ current: async () => { throw new Error('db down'); } });
    await expect(terms.current()).rejects.toThrow('db down');
  });

  it('outdated() is false before consent, false for the current version, true for any other (also an unknown one)', async () => {
    const terms = new TermsVersion(testConfig());
    terms.register({ current: async () => '3' });
    expect(await terms.outdated(null, null)).toBe(false);
    expect(await terms.outdated(new Date(), '3')).toBe(false);
    expect(await terms.outdated(new Date(), '2')).toBe(true);
    expect(await terms.outdated(new Date(), null)).toBe(true);
  });
});
