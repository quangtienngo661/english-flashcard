import { useTranslations } from 'next-intl';

/** SRS level of a word: 0 is "Mới" / "New", 1–5 are "Bậc 1–5" / "Level 1–5" (Part 10, mockup L80, L93). */
export type Level = 0 | 1 | 2 | 3 | 4 | 5;

export const LEVELS: readonly Level[] = [0, 1, 2, 3, 4, 5];

/** Days until the next review at each level. */
export const LEVEL_INTERVAL_DAYS: Record<Exclude<Level, 0>, 1 | 3 | 7 | 14 | 30> = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };

/** Fill of a level's square, bar or chip. Colour is never the only signal: show the level name beside it (WCAG 1.4.1). */
export const LEVEL_FILL: Record<Level, string> = {
  0: 'bg-wm-level-0', 1: 'bg-wm-level-1', 2: 'bg-wm-level-2', 3: 'bg-wm-level-3', 4: 'bg-wm-level-4', 5: 'bg-wm-level-5',
};

/** Level colour as text. Levels 0–2 are too pale for text on the surface; use it for marks, not for words. */
export const LEVEL_TEXT: Record<Level, string> = {
  0: 'text-wm-level-0', 1: 'text-wm-level-1', 2: 'text-wm-level-2', 3: 'text-wm-level-3', 4: 'text-wm-level-4', 5: 'text-wm-level-5',
};

/** Text colour of a word row's state (mockup L375). */
export const STATE_TEXT = { priority: 'text-wm-level-priority', due: 'text-wm-warn', new: 'text-wm-muted', ok: 'text-wm-pass' } as const;

/** Narrows an API level to a Level: out-of-range values clamp to 0–5. */
export function toLevel(level: number): Level {
  return Math.min(5, Math.max(0, Math.trunc(level))) as Level;
}

/** "Mới", "Bậc 3" / "New", "Level 3". */
export function useLevelName(): (level: Level) => string {
  const t = useTranslations('App.levels');
  return (level) => t('name', { level });
}

/** "ôn lại sau 14 ngày" / "review in 14 days"; null for level 0, which has no review yet. */
export function useLevelInterval(): (level: Level) => string | null {
  const t = useTranslations('App.levels');
  return (level) => (level === 0 ? null : t('interval', { days: LEVEL_INTERVAL_DAYS[level] }));
}
