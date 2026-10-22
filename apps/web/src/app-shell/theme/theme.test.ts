// @vitest-environment jsdom
import { readThemeChoice, resolveTheme, THEME_STORAGE_KEY, writeThemeChoice } from './theme';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('theme choice (D3, E21)', () => {
  it('follows the system preference when the choice is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('an explicit choice wins over the system', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('defaults to system when nothing is stored', () => {
    expect(readThemeChoice()).toBe('system');
  });

  it('reads back what was written', () => {
    writeThemeChoice('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readThemeChoice()).toBe('dark');
  });

  it('ignores a stored value it does not know', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readThemeChoice()).toBe('system');
  });

  it('E21: a throwing localStorage reads as system and writes nothing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readThemeChoice()).toBe('system');
    expect(() => writeThemeChoice('dark')).not.toThrow();
  });
});
