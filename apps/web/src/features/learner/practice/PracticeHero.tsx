'use client';

import { ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { Kbd } from '@/ui/Kbd';
import { TextButton } from '@/ui/TextButton';
import { RULE_TYPES } from './practice-api';

/** K/51 "Luyện nhanh" (Figma 99:3169): today's words across decks, the three types, and the default number of questions. */
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
  const types = RULE_TYPES.map((type) => t(`types.${type}`)).join(', ');
  return (
    <HeroFrame label={t('hero.title')} chip={t('hero.chip')} art={<ExampleBox />}>
      {words === 0 ? (
        <p className="font-wm-sans text-wm-base text-wm-muted">{t('hero.empty')}</p>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3 font-wm-display text-wm-card-heading-mobile text-wm-ink md:text-wm-card-heading">
            {t.rich('hero.words', {
              words,
              groups,
              b: (chunks) => <span className="text-wm-section text-wm-accent md:text-wm-hero">{chunks}</span>,
            })}
          </p>
          <p className="font-wm-sans text-wm-base text-wm-muted">{t('hero.body', { count, types })}</p>
          {error && (
            <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <Button variant="primary" isPending={busy} onPress={onStart}>
              {t('hero.start', { count })}
              <ArrowRight aria-hidden className="size-4" />
            </Button>
            <TextButton onPress={onCustomize}>{t('hero.customize')}</TextButton>
          </div>
        </>
      )}
    </HeroFrame>
  );
}

/** The white card of "Luyện nhanh" and of K/55: mono label, then its content; the example question on the right from 768 px. */
export function HeroFrame({ label, chip, art, children }: { label: string; chip: ReactNode; art?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={label} className="flex items-center gap-7 rounded-wm-card border border-wm-line bg-wm-surface p-5 shadow-wm-card md:p-7">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className="text-wm-meta text-wm-muted">{chip}</p>
        {children}
      </div>
      {art && (
        <div aria-hidden className="hidden w-75 shrink-0 md:block">
          {art}
        </div>
      )}
    </section>
  );
}

/** Decoration (Figma "ví dụ một câu"): one multiple-choice question with the right option marked. */
function ExampleBox() {
  const t = useTranslations('App.practice.hero');
  const options = ['deploy', 'delay', 'display'];
  return (
    <div className="flex flex-col gap-2 rounded-wm-row bg-wm-bg p-4">
      <span className="text-wm-meta text-wm-muted">{t('artPrompt')}</span>
      <span className="font-wm-display text-wm-card-title text-wm-ink">{t('artMeaning')}</span>
      {options.map((option, i) => (
        <span
          key={option}
          className={cn(
            'flex items-center gap-2 rounded-wm-control border-2 bg-wm-surface px-3 py-2 font-wm-sans text-wm-small-strong text-wm-ink',
            i === 0 ? 'border-wm-pass bg-wm-pass-soft' : 'border-wm-line',
          )}
        >
          <Kbd>{i + 1}</Kbd>
          <span className="flex-1">{option}</span>
          {i === 0 && (
            <span className="flex items-center gap-1 text-wm-pass">
              <Check className="size-3.5" />
              {t('artRight')}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
