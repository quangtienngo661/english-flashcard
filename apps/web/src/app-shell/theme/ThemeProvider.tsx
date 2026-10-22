'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { readThemeChoice, resolveTheme, THEME_STORAGE_KEY, writeThemeChoice, type ResolvedTheme, type ThemeChoice } from './theme';

type ThemeValue = { choice: ThemeChoice; resolved: ResolvedTheme; setChoice: (choice: ThemeChoice) => void };

const ThemeContext = createContext<ThemeValue | null>(null);
const DARK_QUERY = '(prefers-color-scheme: dark)';

// The stored choice and the system setting, read as one external store. `storage` covers other tabs (E22); a write in
// this tab notifies through `localChange` because `storage` does not fire in the tab that wrote.
const localChange = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) onChange();
  };
  media.addEventListener('change', onChange);
  window.addEventListener('storage', onStorage);
  localChange.add(onChange);
  return () => {
    media.removeEventListener('change', onChange);
    window.removeEventListener('storage', onStorage);
    localChange.delete(onChange);
  };
}

function snapshot(): string {
  return `${readThemeChoice()}|${window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'}`;
}

// Prerender has no storage: null means "not read yet", so nothing overwrites THEME_SCRIPT's value before hydration.
const serverSnapshot = (): string | null => null;

// Keeps <html data-theme> in step with the stored choice, the system setting and other tabs. The inline THEME_SCRIPT set
// the first value before paint; this takes over after hydration.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore<string | null>(subscribe, snapshot, serverSnapshot);
  const [choice, system] = (current ?? 'system|light').split('|') as [ThemeChoice, ResolvedTheme];
  const resolved = resolveTheme(choice, system === 'dark');

  useEffect(() => {
    if (current !== null) document.documentElement.dataset.theme = resolved;
  }, [current, resolved]);

  // The landing shares <html>; it must never keep the app's theme after a client-side navigation.
  useEffect(
    () => () => {
      delete document.documentElement.dataset.theme;
    },
    [],
  );

  const setChoice = useCallback((next: ThemeChoice) => {
    writeThemeChoice(next);
    localChange.forEach((notify) => notify());
  }, []);

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme outside ThemeProvider');
  return value;
}
