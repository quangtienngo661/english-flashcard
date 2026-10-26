'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from '@/app-ui/Button';
import { RULE_TYPES } from './practice-api';

const CHIP = 'rounded-full border border-on-navy-muted px-2.5 py-0.5 text-caption font-semibold text-on-navy';

/** K/51 big card: today's words across decks, the three types, and the default number of questions. */
export function TodayHero({ words, groups, count, onStart, onCustomize, busy, error }: {
  words: number;
  groups: number;
  count: number;
  onStart: () => void;
  onCustomize: () => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useTranslations('App.practice');
  return (
    <HeroFrame labelledBy="today-title" art={<McqArt />}>
      <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-caption font-semibold text-on-accent">{t('hero.chip')}</span>
      <h2 id="today-title" className="text-h2 font-extrabold">
        {t('hero.title')}
      </h2>
      {words === 0 ? (
        <p className="text-ui text-on-navy-muted">{t('hero.empty')}</p>
      ) : (
        <>
          <p className="text-ui text-on-navy-muted">{t('hero.line', { words, groups, count })}</p>
          <ul className="flex flex-wrap gap-2">
            {RULE_TYPES.map((type) => (
              <li key={type} className={CHIP}>
                {t(`types.${type}`)}
              </li>
            ))}
            <li className={CHIP}>{t('countChip', { count })}</li>
          </ul>
          {error && (
            <p role="alert" className="text-ui font-semibold text-on-navy">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button variant="sticker" size="lg" className="px-8" isPending={busy} onPress={onStart}>
              {t('hero.start', { count })}
            </Button>
            <Button
              size="lg"
              className="bg-transparent px-8 text-on-navy shadow-none ring-2 ring-inset ring-on-navy-muted hover:bg-navy-raised"
              onPress={onCustomize}
            >
              {t('hero.customize')}
            </Button>
          </div>
        </>
      )}
    </HeroFrame>
  );
}

/** The navy big card of K/51 and K/55, the decorative question on the right from 768 px. */
export function HeroFrame({ labelledBy, art, children }: { labelledBy: string; art: ReactNode; children: ReactNode }) {
  return (
    <section
      aria-labelledby={labelledBy}
      className="relative flex items-center gap-6 overflow-hidden rounded-card border-b-4 border-primary bg-navy p-5 text-on-navy md:p-7"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">{children}</div>
      <div aria-hidden className="hidden shrink-0 md:block">
        {art}
      </div>
    </section>
  );
}

/** Decoration: a multiple-choice card on a second card, as K/51 draws it. */
export function McqArt() {
  const t = useTranslations('App.practice.hero');
  return (
    <div className="relative h-40 w-56">
      <div className="absolute right-0 top-0 h-32 w-48 rotate-6 rounded-card border-2 border-border-strong bg-surface" />
      <div className="absolute bottom-0 left-0 flex w-52 -rotate-2 flex-col gap-1.5 rounded-card border-2 border-border-strong bg-surface p-3 text-ink shadow-ledge-accent">
        <span className="text-caption text-muted">{t('artPrompt')}</span>
        <span className="text-body font-bold">{t('artMeaning')}</span>
        <span className="grid grid-cols-2 gap-1.5 text-caption font-semibold">
          <span className="rounded-sm border-2 border-primary bg-primary-soft px-2 py-1">deploy</span>
          <span className="rounded-sm border border-border-strong px-2 py-1">delay</span>
          <span className="rounded-sm border border-border-strong px-2 py-1">deliver</span>
          <span className="rounded-sm border border-border-strong px-2 py-1">defend</span>
        </span>
      </div>
    </div>
  );
}
