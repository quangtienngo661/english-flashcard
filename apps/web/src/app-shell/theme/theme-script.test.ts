// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { THEME_STORAGE_KEY } from './theme';
import { THEME_SCRIPT, THEME_SCRIPT_HASH } from './theme-script';

function run(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: prefersDark }) as unknown as typeof window.matchMedia;
  new Function(THEME_SCRIPT)();
  return document.documentElement.dataset.theme;
}

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('theme script (runs before paint)', () => {
  it('THEME_SCRIPT_HASH is the CSP sha256 of the script', () => {
    expect(THEME_SCRIPT_HASH).toBe(`'sha256-${createHash('sha256').update(THEME_SCRIPT).digest('base64')}'`);
  });

  it('applies the stored choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(run(false)).toBe('dark');
  });

  it('falls back to the system preference', () => {
    expect(run(true)).toBe('dark');
    expect(run(false)).toBe('light');
  });

  it('E21: still sets a theme when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(run(true)).toBe('dark');
    vi.restoreAllMocks();
  });
});
