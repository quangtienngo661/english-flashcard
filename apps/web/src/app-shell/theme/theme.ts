// Light / dark / system, stored per device (design §4.4, D3; D40 Bước 3). Every storage access is guarded (E21).
export type ThemeChoice = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'wordmet-web.theme';
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return CHOICES.includes(stored as ThemeChoice) ? (stored as ThemeChoice) : 'system';
  } catch {
    return 'system';
  }
}

export function writeThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private windows or blocked storage: the choice lasts until the page closes.
  }
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  return choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice;
}
