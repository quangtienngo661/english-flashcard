'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useTheme } from '@/app-shell/theme/ThemeProvider';

/**
 * Switches light/dark at once (owner 27/10/2026). On a switch the old icon flies up and out while the new one rises from below
 * into its place; with reduced motion the icon just changes.
 */
export function ThemeToggle() {
  const t = useTranslations('App.chrome');
  const { resolved, setChoice } = useTheme();
  // The icon that is leaving, and a counter so each switch replays the animation.
  const [leaving, setLeaving] = useState<'light' | 'dark' | null>(null);
  const [turn, setTurn] = useState(0);
  // Dark shows the sun (switch to light); light shows the moon.
  const glyph = (theme: 'light' | 'dark', key: string, className: string) =>
    theme === 'dark' ? <Sun key={key} aria-hidden className={className} /> : <Moon key={key} aria-hidden className={className} />;

  return (
    <button
      type="button"
      aria-label={resolved === 'dark' ? t('themeToLight') : t('themeToDark')}
      onClick={() => {
        setLeaving(resolved);
        setTurn((n) => n + 1);
        setChoice(resolved === 'dark' ? 'light' : 'dark');
      }}
      className="cursor-pointer rounded-control p-2 text-on-navy outline-none hover:bg-navy-raised focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="relative block size-5.5 overflow-hidden">
        {leaving && glyph(leaving, `out-${turn}`, 'absolute inset-0 size-5.5 motion-safe:animate-theme-icon-out motion-reduce:hidden')}
        {glyph(resolved, `in-${turn}`, turn > 0 ? 'absolute inset-0 size-5.5 motion-safe:animate-theme-icon-in' : 'absolute inset-0 size-5.5')}
      </span>
    </button>
  );
}
