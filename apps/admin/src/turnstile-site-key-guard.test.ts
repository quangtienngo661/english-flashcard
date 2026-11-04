import { afterEach, describe, expect, it } from 'vitest';
import { turnstileSiteKeyGuard } from './turnstile-site-key-guard';

type ResolvedLike = { command: 'build' | 'serve'; mode: string; envDir: string };
const run = (config: ResolvedLike) => {
  const plugin = turnstileSiteKeyGuard();
  (plugin.configResolved as (c: ResolvedLike) => void)(config);
};
const envDir = '.'; // no .env files with VITE_ values live here; process.env decides

afterEach(() => {
  delete process.env.VITE_TURNSTILE_SITE_KEY;
});

describe('turnstileSiteKeyGuard (LA1#15)', () => {
  it('a production build without a site key throws, naming VITE_TURNSTILE_SITE_KEY', () => {
    expect(() => run({ command: 'build', mode: 'production', envDir })).toThrow(/VITE_TURNSTILE_SITE_KEY/);
    process.env.VITE_TURNSTILE_SITE_KEY = '   ';
    expect(() => run({ command: 'build', mode: 'production', envDir })).toThrow(/VITE_TURNSTILE_SITE_KEY/);
  });

  it('a production build with a site key passes', () => {
    process.env.VITE_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    expect(() => run({ command: 'build', mode: 'production', envDir })).not.toThrow();
  });

  it('the e2e and docker builds may leave it blank (the fake widget is used)', () => {
    expect(() => run({ command: 'build', mode: 'e2e', envDir })).not.toThrow();
    expect(() => run({ command: 'build', mode: 'docker', envDir })).not.toThrow();
  });

  it('vite preview and the dev server never run the guard', () => {
    expect(() => run({ command: 'serve', mode: 'production', envDir })).not.toThrow();
    expect(() => run({ command: 'serve', mode: 'development', envDir })).not.toThrow();
  });
});
