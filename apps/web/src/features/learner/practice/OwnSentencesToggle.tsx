'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/app-ui/Switch';

const STORAGE_KEY = 'wordmet-web.own-sentences';

/** C3: remembered on this device only; blocked storage means "off". */
export function readOwnSentencesOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeOwnSentencesOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered; the dialog still works.
  }
}

export function OwnSentencesToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const t = useTranslations('App.practice.customize');
  return (
    <div className="flex flex-col gap-2">
      <Switch label={t('ownToggle')} isSelected={on} onChange={onChange} />
      <p className="text-caption text-muted">{t('ownLine')}</p>
    </div>
  );
}
