'use client';

import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/app-shell/theme/ThemeProvider';

/**
 * The public pages' light/dark switch (owner 27/10/2026): 44 px square, `--line` border. Its two labels come as props, because public pages
 * send no client messages (`messages={null}`). On a switch the old icon flies up and out while the new one rises from below into its place;
 * with reduced motion the icon just changes.
 */
export function ThemeToggleButton({ toLight, toDark }: { toLight: string; toDark: string }) {
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
      aria-label={resolved === 'dark' ? toLight : toDark}
      onClick={() => {
        setLeaving(resolved);
        setTurn((n) => n + 1);
        setChoice(resolved === 'dark' ? 'light' : 'dark');
      }}
      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-wm-button border border-wm-line bg-wm-surface text-wm-ink outline-none transition duration-200 hover:bg-wm-bg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent"
    >
      <span className="relative block size-5 overflow-hidden">
        {leaving && glyph(leaving, `out-${turn}`, 'absolute inset-0 size-5 motion-safe:animate-theme-icon-out motion-reduce:hidden')}
        {glyph(resolved, `in-${turn}`, turn > 0 ? 'absolute inset-0 size-5 motion-safe:animate-theme-icon-in' : 'absolute inset-0 size-5')}
      </span>
    </button>
  );
}
