'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useAddWord } from '../add-word/add-word-context';

/** K/10 "Thêm từ vừa gặp": type the word, [Thêm] opens the add-word sheet with it. */
export function QuickAddBox() {
  const t = useTranslations('App.addWord');
  const { open } = useAddWord();
  const [word, setWord] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    open(word.trim());
    setWord('');
  }

  return (
    <section aria-labelledby="quick-add" className="pastel-island flex flex-col gap-3 rounded-card bg-accent-soft p-5 shadow-ledge-accent">
      <h2 id="quick-add" className="text-title font-semibold text-ink">
        {t('quickTitle')}
      </h2>
      <p className="text-caption text-ink">{t('quickBody')}</p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          aria-label={t('word')}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={100}
          placeholder={t('wordPlaceholder')}
          className="min-h-control min-w-0 flex-1 rounded-control border-2 border-border-strong bg-surface px-3 text-ui text-ink outline-none placeholder:text-placeholder focus:border-primary"
        />
        <button type="submit" className="min-h-control shrink-0 rounded-control bg-navy px-5 text-ui font-semibold text-on-navy shadow-ledge outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {t('quickSubmit')}
        </button>
      </form>
    </section>
  );
}
