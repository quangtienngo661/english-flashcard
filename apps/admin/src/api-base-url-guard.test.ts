import { afterEach, describe, expect, it } from 'vitest';
import { apiBaseUrlGuard } from './api-base-url-guard';

type ResolvedLike = { command: 'build' | 'serve'; mode: string; envDir: string };
const run = (config: ResolvedLike) => {
  const plugin = apiBaseUrlGuard();
  (plugin.configResolved as (c: ResolvedLike) => void)(config);
};
const envDir = '.'; // no .env files with VITE_ values live here; process.env decides

afterEach(() => {
  delete process.env.VITE_API_BASE_URL;
});

describe('apiBaseUrlGuard', () => {
  it('B25#20: a production build with a localhost API throws, naming VITE_API_BASE_URL', () => {
    process.env.VITE_API_BASE_URL = 'http://localhost:3000';
    expect(() => run({ command: 'build', mode: 'production', envDir })).toThrow(/VITE_API_BASE_URL/);
  });

  it('a production build with an admin-api host passes', () => {
    process.env.VITE_API_BASE_URL = 'https://admin-api.wordmet.com';
    expect(() => run({ command: 'build', mode: 'production', envDir })).not.toThrow();
  });

  it('vite preview (command serve, mode production) does not run the guard: the URL was fixed at build time', () => {
    process.env.VITE_API_BASE_URL = 'http://localhost:3000';
    expect(() => run({ command: 'serve', mode: 'production', envDir })).not.toThrow();
    delete process.env.VITE_API_BASE_URL;
    expect(() => run({ command: 'serve', mode: 'production', envDir })).not.toThrow();
  });

  it('an e2e build with a localhost API passes', () => {
    process.env.VITE_API_BASE_URL = 'http://localhost:3000';
    expect(() => run({ command: 'build', mode: 'e2e', envDir })).not.toThrow();
  });
});
