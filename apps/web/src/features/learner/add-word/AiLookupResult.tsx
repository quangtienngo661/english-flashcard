'use client';

import { useTranslations } from 'next-intl';
import { useEntitlements } from '@/app-shell/queries';
import { Button } from '@/app-ui/Button';
import type { LookupSense } from './add-word-api';
import type { AiLookupResult as Result } from './ai-lookup-api';

/**
 * K/86, K/86b: "Kết quả cho “rizz”" and the credits left; the dictionary's meanings of that word first, each with [Chọn] (D21
 * Bước 7), then the "AI gợi ý" card. The English definition is only for reference and is not saved; an English learner's meaning
 * is that definition already, so the line is not repeated.
 */
export function AiLookupResult({ text, result, onChoose }: { text: string; result: Result; onChoose: (sense: LookupSense) => void }) {
  const t = useTranslations('App.addWord.result');
  const pool = useEntitlements().data?.pools?.ai_lookup;
  const s = result.suggestion;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="break-words text-title font-bold text-ink">{t('title', { word: text })}</h3>
        {pool && <p className="text-caption text-muted">{t('used', { remaining: pool.remaining })}</p>}
      </div>
      {result.catalog_senses.length > 0 && (
        <section aria-label={t('catalog')} className="flex flex-col gap-2">
          <h4 className="text-caption font-semibold text-ink">{t('catalog')}</h4>
          {result.catalog_senses.map((sense) => (
            <div key={sense.sense_id} className="flex items-center justify-between gap-3 rounded-inner border-2 border-border-strong p-3">
              <div className="min-w-0">
                <p className="text-caption text-muted">{[sense.pos, sense.level].filter(Boolean).join(' · ')}</p>
                <p className="break-words text-ui font-semibold text-ink">{sense.meaning.text}</p>
              </div>
              <Button variant="quiet" onPress={() => onChoose(sense)}>
                {t('choose')}
              </Button>
            </div>
          ))}
        </section>
      )}
      <section aria-label={t('aiLabel')} className="flex flex-col gap-1 rounded-inner border-2 border-primary bg-primary-soft p-3">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm bg-surface px-1.5 py-0.5 text-caption font-semibold text-primary">{t('aiLabel')}</span>
          <span className="break-all text-ui font-bold text-ink">{s.lemma}</span>
          <span className="text-caption text-muted">{s.part_of_speech}</span>
        </p>
        <p className="break-words text-ui font-semibold text-ink">{s.meaning.text}</p>
        {s.meaning.language === 'vi' && s.definition_en && <p className="break-words text-caption text-muted">{t('definition', { text: s.definition_en })}</p>}
        {s.examples.map((example) => (
          <p key={example} className="break-words text-caption text-ink">
            {example}
          </p>
        ))}
      </section>
      <p className="text-caption text-muted">{t('caution')}</p>
    </div>
  );
}
