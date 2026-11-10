'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

// The brand panel beside the sign-in and sign-up forms (Figma "Khung giới thiệu" in 35:308 and 35:405), from 1280 px only. It is a
// picture of the app, not content: the whole panel is aria-hidden. "ngan" = three word cards in their review stages and "Hôm nay";
// "de12" = one word card and its group card (sign-up).
export type ShowcaseVariant = 'ngan' | 'de12';

export function AuthShowcase({ variant }: { variant: ShowcaseVariant }) {
  const t = useTranslations('App.auth.showcase');
  return (
    <div aria-hidden className="relative isolate h-full overflow-hidden rounded-wm-2xl bg-wm-accent-soft">
      <div className="auth-panel-glow absolute inset-0 -z-10" />
      <div className="dot-grid absolute inset-0 -z-10 opacity-45" />
      <ReviewPath />
      <Chip className="left-11 top-16" word="deadline" dot="bg-wm-fail" />
      <Chip className="bottom-1/3 left-14" word="negotiate" dot="bg-wm-mark" />
      <Chip className="bottom-16 left-107" word="commute" dot="bg-wm-pass" />

      <div className="absolute left-1/2 top-1/2 h-132 w-115 -translate-x-1/2 -translate-y-1/2">
        {variant === 'ngan' ? (
          <>
            <WordCard className="left-25 top-0 rotate-7 opacity-80" stage={t('stage', { days: 7 })} word="allocate" pos="verb · /ˈæl.ə.keɪt/" gloss="to give something to someone for a purpose" meaning={t('allocate')} />
            <WordCard className="left-12.5 top-3 rotate-3" stage={t('stage', { days: 3 })} word="viable" pos="adj · /ˈvaɪ.ə.bəl/" gloss="able to work as intended" meaning={t('viable')} />
            <WordCard className="left-0 top-4.5 -rotate-2" stage={t('stage', { days: 1 })} word="mitigate" pos="verb · /ˈmɪt.ɪ.ɡeɪt/" gloss="to make something bad less serious" meaning={t('mitigate')} example />
            <div className="absolute left-62 top-97.5 flex rotate-4 flex-col gap-2 rounded-wm-lg bg-wm-surface px-4.5 py-4 shadow-wm-lift backdrop-blur-wm-sm">
              <p className="font-wm-sans text-wm-label text-wm-muted">{t('today')}</p>
              <p className="flex items-baseline gap-2">
                <span className="font-wm-display text-wm-lemma text-wm-accent">12</span>
                <span className="font-wm-sans text-wm-base text-wm-ink">{t('due')}</span>
              </p>
              <span className="flex gap-1">
                {[true, true, false, false, false].map((on, i) => (
                  <span key={i} className={cn('h-2 w-7.5 rounded-wm-pill', on ? 'bg-wm-accent' : 'bg-wm-line')} />
                ))}
              </span>
            </div>
          </>
        ) : (
          <>
            <WordCard className="left-24 top-8 -rotate-2" stage={t('group', { group: 'Đề 12' })} word="mitigate" pos="verb · /ˈmɪt.ɪ.ɡeɪt/" gloss="to make something bad less serious" meaning={t('mitigate')} example />
            <div className="absolute left-2.5 top-81 flex w-62 -rotate-3 flex-col gap-2 rounded-wm-lg bg-wm-surface px-4 py-3.5 shadow-wm-lift">
              <p className="font-wm-sans text-wm-label text-wm-ink">Đề 12 · Writing</p>
              <p className="flex flex-wrap gap-1">
                {['mitigate', 'allocate', 'viable', t('more', { count: 9 })].map((w) => (
                  <span key={w} className="rounded-wm-sm bg-wm-accent-soft px-2 py-0.5 font-wm-sans text-wm-caption text-wm-accent">
                    {w}
                  </span>
                ))}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WordCard({ className, stage, word, pos, gloss, meaning, example }: {
  className: string; stage: string; word: string; pos: string; gloss: string; meaning: string; example?: boolean;
}) {
  return (
    <div className={cn('absolute flex w-85 flex-col gap-2.5 rounded-wm-xl bg-wm-surface p-5 shadow-wm-lift', className)}>
      <p className="font-wm-sans text-wm-label text-wm-muted">{stage}</p>
      <p className="font-wm-display text-wm-lemma text-wm-ink">{word}</p>
      <p className="font-wm-sans text-wm-small text-wm-muted">{pos}</p>
      <p className="font-wm-sans text-wm-base text-wm-ink">{gloss}</p>
      <p className="font-wm-sans text-wm-small text-wm-muted">{meaning}</p>
      {example && (
        <p className="rounded-wm-md bg-wm-bg px-3 py-2.5 font-wm-sans text-wm-small text-wm-ink">
          Planting trees can help <Mark>mitigate</Mark> urban heat.
        </p>
      )}
    </div>
  );
}

function Mark({ children }: { children: ReactNode }) {
  return <span className="rounded-xs bg-wm-mark px-0.5 text-wm-mark-ink">{children}</span>;
}

function Chip({ className, word, dot }: { className: string; word: string; dot: string }) {
  return (
    <span className={cn('absolute flex items-center gap-1.5 rounded-wm-sm bg-wm-bg px-2 py-1 font-wm-display text-wm-small-strong text-wm-ink shadow-wm-row', className)}>
      <span className={cn('size-2 rounded-xs', dot)} />
      {word}
    </span>
  );
}

// "Đường ôn (Mới → 30 ngày)": the dashed path a word travels through the six review stages, bottom left to top right.
function ReviewPath() {
  const stages: Array<[number, number, number]> = [[48, 820, 4], [180, 751, 4], [270, 630, 4], [565, 139, 4], [588, 112, 4], [604, 96, 5]];
  return (
    <svg viewBox="0 0 640 868" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 size-full">
      <path
        d="M48 820 C 120 800 210 730 270 630 S 480 260 565 139 S 590 108 604 96"
        fill="none"
        strokeWidth="1.5"
        strokeDasharray="3 6"
        strokeLinecap="round"
        className="stroke-wm-ghost"
      />
      {stages.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} className={i === stages.length - 1 ? 'fill-wm-accent' : 'fill-wm-ghost'} />
      ))}
    </svg>
  );
}
