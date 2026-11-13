'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/ui/Button';
import { FIELD_BOX } from '@/ui/field-styles';
import { useAddWord } from '../add-word/add-word-context';

/** "Thêm từ vừa gặp" (Figma 117:4480): type the word, [Thêm] opens the add-word sheet with it. */
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
    <section aria-labelledby="quick-add" className="flex flex-col gap-3 rounded-wm-card border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6">
      <h2 id="quick-add" className="font-wm-display text-xl font-bold text-wm-ink">
        {t('quickTitle')}
      </h2>
      <p className="text-wm-small text-wm-muted">{t('quickBody')}</p>
      <form onSubmit={onSubmit} className="flex gap-3">
        <input
          aria-label={t('word')}
          name="word"
          placeholder={t('quickPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          maxLength={100}
          className={cn(FIELD_BOX, 'min-h-11 flex-1')}
        />
        <Button type="submit">{t('quickSubmit')}</Button>
      </form>
    </section>
  );
}
