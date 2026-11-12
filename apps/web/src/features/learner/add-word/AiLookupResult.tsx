'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useEntitlements } from '@/app-shell/queries';
import { cn } from '@/lib/cn';
import { shownPos } from '@/lib/pos';
import { TextButton } from '@/ui/TextButton';
import { TargetWord } from '@/ui/TargetWord';
import type { LookupSense } from './add-word-api';
import type { AiLookupResult as Result } from './ai-lookup-api';

/**
 * K/86, K/86b, Figma Overlay 4 (124:4907): "Kết quả cho “cap”" and the credits left; one list with the dictionary's meanings of that
 * word first, each with [Chọn] (D21 Bước 7), then the AI meaning; on the right (under it on phones) the card that will be saved.
 * The English definition is only for reference and is not saved; an English learner's meaning is that definition already, so the
 * line is not repeated. `leading` (the "Từ" and sentence fields) sits at the top of the left column, so from 768 px the preview
 * on the right starts level with the "Từ" field (chỗ 23, mockup "hộp 4").
 */
export function AiLookupResult({
  text, sentence, result, onChoose, leading,
}: { text: string; sentence: string; result: Result; onChoose: (sense: LookupSense) => void; leading?: ReactNode }) {
  const t = useTranslations('App.addWord.result');
  const pool = useEntitlements().data?.pools?.ai_lookup;
  const s = result.suggestion;
  return (
    <div
      // raw-ok: Figma's two columns from 768 px, the list beside a 300 px preview
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18.75rem] md:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-4">
        {leading}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="break-words font-wm-display text-wm-word text-wm-ink">{t('title', { word: text })}</h3>
          {pool && <p className="text-wm-meta text-wm-muted">{t('used', { remaining: pool.remaining })}</p>}
        </div>
        <div className="flex flex-col overflow-hidden rounded-wm-card border border-wm-line bg-wm-surface shadow-wm-card">
          {result.catalog_senses.length > 0 && (
            <section aria-label={t('catalog')} className="flex flex-col">
              {result.catalog_senses.map((sense, i) => (
                <div key={sense.sense_id} className={cn('flex items-center gap-4 p-4', i > 0 && 'border-t border-wm-line')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-wm-meta text-wm-muted">{[shownPos(sense.pos), sense.level].filter(Boolean).join(' · ')}</p>
                    <p className="break-words font-wm-display text-wm-word text-wm-ink">{sense.meaning.text}</p>
                  </div>
                  <Badge>{t('dictionary')}</Badge>
                  <TextButton onPress={() => onChoose(sense)}>{t('choose')}</TextButton>
                </div>
              ))}
            </section>
          )}
          <section
            aria-label={t('aiLabel')}
            className={cn('flex flex-col gap-1 bg-wm-accent/6 p-4', result.catalog_senses.length > 0 && 'border-t border-wm-line')}
          >
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-wm-meta text-wm-muted">
                  <span className="break-all font-semibold text-wm-ink">{s.lemma}</span>{shownPos(s.part_of_speech) && ` · ${shownPos(s.part_of_speech)}`}
                </p>
                <p className="break-words font-wm-display text-wm-word text-wm-ink">{s.meaning.text}</p>
              </div>
              <Badge ai>{t('aiLabel')}</Badge>
            </div>
            {s.meaning.language === 'vi' && s.definition_en && (
              <p className="break-words font-wm-sans text-wm-caption text-wm-muted">{t('definition', { text: s.definition_en })}</p>
            )}
            {s.examples.map((example) => (
              <p key={example} className="break-words font-wm-sans text-wm-small text-wm-ink">
                {example}
              </p>
            ))}
          </section>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <section aria-label={t('preview')} className="flex flex-col gap-3">
          <p aria-hidden className="text-wm-meta text-wm-muted">
            {t('preview')}
          </p>
          <div
            // raw-ok: Figma tilts the desktop preview card 1.2°; phones keep it straight
            className="flex flex-col gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-5 shadow-wm-card md:rotate-[1.2deg] md:p-6"
          >
            <div className="flex items-center gap-2">
              <span className="text-wm-meta text-wm-muted">{shownPos(s.part_of_speech)}</span>
              <span className="flex-1" />
              <Badge ai>{t('aiLabel')}</Badge>
            </div>
            <p className="break-all font-wm-display text-wm-card-title text-wm-ink md:text-wm-lemma">{s.lemma}</p>
            <p className="break-words font-wm-display text-wm-word text-wm-ink">{s.meaning.text}</p>
            {s.examples[0] && <p className="break-words font-wm-sans text-wm-base text-wm-ink"><TargetWord text={s.examples[0]} lemma={s.lemma} /></p>}
            {sentence.trim() && (
              <div className="hidden flex-col gap-1 md:flex">
                <p className="text-wm-meta text-wm-muted">{t('yourSentence')}</p>
                <p className="break-words font-wm-sans text-wm-small text-wm-ink"><TargetWord text={sentence.trim()} lemma={text} /></p>
              </div>
            )}
          </div>
        </section>
        <p className="flex items-start gap-2 font-wm-sans text-wm-caption text-wm-muted">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t('caution')}
        </p>
      </div>
    </div>
  );
}

function Badge({ ai = false, children }: { ai?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-wm-key px-2 py-0.5 text-wm-meta font-bold',
        ai ? 'bg-wm-accent-soft text-wm-accent' : 'bg-wm-bg text-wm-muted',
      )}
    >
      {children}
    </span>
  );
}
