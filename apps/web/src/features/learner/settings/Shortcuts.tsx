'use client';

import { useTranslations } from 'next-intl';

const KEYS = [
  ['N', 'shortcutAdd'],
  ['/', 'shortcutLookup'],
  ['Space', 'shortcutFlip'],
  ['1 · 2', 'shortcutAnswer'],
  ['Esc', 'shortcutExit'],
] as const;

/** K/50, K/91: the keyboard shortcuts (web only). */
export function ShortcutList() {
  const t = useTranslations('App.settings');
  return (
    <ul className="flex flex-col gap-2.5">
      {KEYS.map(([key, label]) => (
        <li key={key} className="flex items-center gap-3 text-caption text-muted">
          <kbd className="min-w-6 rounded-sm border border-border-strong px-1.5 py-0.5 text-center font-semibold text-ink">{key}</kbd>
          {t(label)}
        </li>
      ))}
    </ul>
  );
}
