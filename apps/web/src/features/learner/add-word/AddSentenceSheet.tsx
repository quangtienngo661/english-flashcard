'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { TextField } from '@/app-ui/TextField';
import { showToast } from '@/app-ui/Toast';
import { sentencesKey, wordKey } from '../word/word-api';

const SENTENCE_MAX = 300;
type Sense = { sense_id: string; lemma: string; pos: string; meaning: { text: string }; sentence_count: number };

/** K/44, K/44b, M/53: one more sentence for a meaning (`POST /senses/{id}/sentences` [I], ≤ 300 characters). */
export function AddSentenceSheet({ sense, onClose, onSeeAll }: { sense: Sense; onClose: () => void; onSeeAll?: () => void }) {
  const t = useTranslations('App.addWord');
  const tc = useTranslations('App.common');
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [limit, setLimit] = useState(false);
  const save = useSubmitOnce(async (key) => {
    await api.post(`/v1/senses/${sense.sense_id}/sentences`, { text: text.trim() }, { idempotencyKey: key });
    return true;
  });
  const info = { word: sense.lemma, pos: sense.pos, meaning: sense.meaning.text, count: sense.sentence_count };

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
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} title={t('sentenceTitle')} isDismissable={!save.busy}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="-mt-3 text-caption text-muted">{sense.sentence_count > 0 ? t('sentenceSub', info) : t('sentenceSubNone', info)}</p>
        <TextField label={t('sentenceField')} value={text} onChange={setText} maxLength={SENTENCE_MAX} showCount description={t('sentenceHint')} error={error} autoFocus />
        {limit && onSeeAll && (
          <button type="button" onClick={onSeeAll} className="-mt-2 w-fit text-ui font-semibold text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {t('seeSentences')}
          </button>
        )}
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          <Button variant="quiet" onPress={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="sticker" type="submit" isPending={save.busy}>
            {t('sentenceSave')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
