// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { SITE_HEAD_SCRIPT, SITE_HEAD_SCRIPT_HASH } from './site-head-script';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-wm-motion');
  document.documentElement.classList.remove('js', 'wm-live');
  delete document.documentElement.dataset.theme;
  vi.useRealTimers();
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

  // I2 of the M8b review (R249): the blocks below the hero wait hidden under `js` until React marks them; if React never runs (slow
  // network, a chunk blocked by SRI), the page must not stay blank.
  it('removes `js` 3000 ms later when React has not marked the page live', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();
    new Function(SITE_HEAD_SCRIPT)();
    vi.advanceTimersByTime(2999);
    expect(document.documentElement.classList.contains('js')).toBe(true);
    vi.advanceTimersByTime(1);
    expect(document.documentElement.classList.contains('js')).toBe(false);
  });

  it('keeps `js` past 3000 ms once the page is marked live (`wm-live`)', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();
    new Function(SITE_HEAD_SCRIPT)();
    document.documentElement.classList.add('wm-live');
    vi.advanceTimersByTime(10_000);
    expect(document.documentElement.classList.contains('js')).toBe(true);
  });

  // T10 (QA7): the footer's "Chuyển động: Tắt" is remembered, so the next page starts without the site motion at all.
  it('does not add `js` when the stored motion choice is off, and marks <html> data-wm-motion="off"', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    localStorage.setItem('wordmet-web.motion', 'off');
    new Function(SITE_HEAD_SCRIPT)();
    expect(document.documentElement.classList.contains('js')).toBe(false);
    expect(document.documentElement.getAttribute('data-wm-motion')).toBe('off');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('adds `js` when the stored choice is on, and when storage throws', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    localStorage.setItem('wordmet-web.motion', 'on');
    new Function(SITE_HEAD_SCRIPT)();
    expect(document.documentElement.classList.contains('js')).toBe(true);
    expect(document.documentElement.hasAttribute('data-wm-motion')).toBe(false);

    document.documentElement.classList.remove('js');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    new Function(SITE_HEAD_SCRIPT)();
    expect(document.documentElement.classList.contains('js')).toBe(true);
  });
});
