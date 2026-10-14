import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocale, writeLocale } from './locale';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('locale', () => {
  it('stored en wins over a vi browser', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi-VN');
    localStorage.setItem('wordmet-admin.locale', 'en');
    expect(readLocale()).toBe('en');
  });

  it('vi-VN browser → vi; any other browser → en', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi-VN');
    expect(readLocale()).toBe('vi');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
    expect(readLocale()).toBe('en');
  });

  it('an invalid stored value is ignored', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi');
    localStorage.setItem('wordmet-admin.locale', 'de');
    expect(readLocale()).toBe('vi');
  });

  it('throwing localStorage → browser language, and writeLocale does not throw', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('vi-VN');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readLocale()).toBe('vi');
    expect(() => writeLocale('en')).not.toThrow();
  });

  it('writeLocale stores only the language under wordmet-admin.locale', () => {
    writeLocale('en');
    expect(localStorage.getItem('wordmet-admin.locale')).toBe('en');
    expect(localStorage.length).toBe(1);
  });
});
