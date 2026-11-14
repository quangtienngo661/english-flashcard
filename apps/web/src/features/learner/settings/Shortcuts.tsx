'use client';

import { useTranslations } from 'next-intl';
import { Kbd } from '@/ui/Kbd';
import { SettingsRow } from './SettingsRows';

const KEYS = [
  [['N'], 'shortcutAdd'],
  [['/'], 'shortcutLookup'],
  [['Space'], 'shortcutFlip'],
  [['1', '2'], 'shortcutAnswer'],
  [['Esc'], 'shortcutExit'],
] as const;

function Keys({ keys }: { keys: readonly string[] }) {
  return (
    <span className="flex gap-1">
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </span>
  );
}

/** Cài đặt "Phím tắt" (Figma 120:4462, desktop only): one row per shortcut, the keys at the right. */
export function ShortcutRows() {
  const t = useTranslations('App.settings');
  return KEYS.map(([keys, label]) => <SettingsRow key={label} label={t(label)} control={<Keys keys={keys} />} />);
}
