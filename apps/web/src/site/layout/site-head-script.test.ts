// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { SITE_HEAD_SCRIPT, SITE_HEAD_SCRIPT_HASH } from './site-head-script';

afterEach(() => {
  document.documentElement.classList.remove('js');
  delete document.documentElement.dataset.theme;
});

describe('site head script (theme before paint + the `js` class of the site motion)', () => {
  it('SITE_HEAD_SCRIPT_HASH is the CSP sha256 of the script', () => {
    expect(SITE_HEAD_SCRIPT_HASH).toBe(`'sha256-${createHash('sha256').update(SITE_HEAD_SCRIPT).digest('base64')}'`);
  });

  it('sets the theme like the app does and adds `js` to <html>', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    expect(document.documentElement.classList.contains('js')).toBe(false);
    new Function(SITE_HEAD_SCRIPT)();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('js')).toBe(true);
  });
});
