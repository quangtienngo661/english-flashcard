'use client';

import { shownPos } from '@/lib/pos';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Select } from '@/ui/Select';
import { TextButton } from '@/ui/TextButton';
import { TextField } from '@/ui/TextField';
import { showToast } from '@/ui/Toast';
import { TargetWord } from '@/ui/TargetWord';
import { sentencesKey, wordKey } from '../word/word-api';

const SENTENCE_MAX = 300;
type Sense = { sense_id: string; lemma: string; pos: string; meaning: { text: string }; sentence_count: number };

/**
 * K/44, K/44b, M/53: one more sentence for a meaning (`POST /senses/{id}/sentences` [I], ≤ 300 characters). With `senses` (the word
 * page, more than one meaning learned) a select asks which meaning first; `sense` is the one chosen at the start.
 */
export function AddSentenceSheet({ sense: initial, senses, onClose, onSeeAll }: {
  sense: Sense;
  senses?: Sense[];
  onClose: () => void;
  onSeeAll?: (senseId: string) => void;
}) {
  const t = useTranslations('App.addWord');
  const tc = useTranslations('App.common');
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const [chosen, setChosen] = useState(initial.sense_id);
  const sense = senses?.find((s) => s.sense_id === chosen) ?? initial;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [limit, setLimit] = useState(false);
  const save = useSubmitOnce(async (key) => {
    await api.post(`/v1/senses/${sense.sense_id}/sentences`, { text: text.trim() }, { idempotencyKey: key });
    return true;
  });
  const info = { lead: [sense.lemma, shownPos(sense.pos)].filter(Boolean).join(', '), meaning: sense.meaning.text, count: sense.sentence_count };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setLimit(false);
    if (!text.trim()) return setError(t('sentenceRequired'));
    try {
      // undefined: a press ignored while the first one is still saving (review I-2).
      if (!(await save.submit())) return;
      showToast(t('sentenceSaved'), 'success');
      void client.invalidateQueries({ queryKey: sentencesKey(sense.sense_id) });
      void client.invalidateQueries({ queryKey: wordKey(sense.lemma) });
      onClose();
    } catch (failure) {
      if (failure instanceof ApiError && failure.problem.slug === 'sentence-limit-reached') {
        setLimit(true);
        setError(t('sentenceLimit'));
      } else setError(errorText(failure));
    }
  }

  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={t('sentenceTitle')} closeLabel={tc('close')} isDismissable={!save.busy}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="-mt-2 break-words font-wm-sans text-wm-small text-wm-muted">
          {sense.sentence_count > 0 ? t('sentenceSub', info) : t('sentenceSubNone', info)}
        </p>
        {senses && senses.length > 1 && (
          <Select
            label={t('sentenceSense')}
            items={senses.map((s) => ({ id: s.sense_id, label: shownPos(s.pos) ? `${shownPos(s.pos)} · ${s.meaning.text}` : s.meaning.text }))}
            value={sense.sense_id}
            onChange={setChosen}
          />
        )}
        <TextField label={t('sentenceField')} value={text} onChange={setText} maxLength={SENTENCE_MAX} showCount description={t('sentenceHint')} error={error} autoFocus />
        {limit && onSeeAll && (
          <TextButton className="-mt-2 self-start" onPress={() => onSeeAll(sense.sense_id)}>
            {t('seeSentences')}
          </TextButton>
        )}
        {text.trim() && (
          // Figma "Xem trước mặt sau thẻ": the meaning and the sentence with the word highlighted, as on the back of the card.
          <div className="flex flex-col gap-1.5 rounded-wm-card border border-wm-line bg-wm-surface p-5 shadow-wm-card md:-rotate-1">
            <p className="text-wm-meta text-wm-muted">{t('sentencePreview')}</p>
            <p className="break-words font-wm-display text-wm-word text-wm-ink">{sense.meaning.text}</p>
            <p className="break-words font-wm-sans text-wm-base text-wm-ink"><TargetWord text={text.trim()} lemma={sense.lemma} /></p>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-end md:gap-5">
          <TextButton tone="muted" onPress={onClose}>
            {tc('cancel')}
          </TextButton>
          <Button type="submit" isPending={save.busy}>
            {t('sentenceSave')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
