'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
import { FullScreenSpinner } from '@/app-ui/States';
import { showToast } from '@/app-ui/Toast';
import { highlightWord } from '../groups/highlight';
import { sentencesKey, useSentences, wordKey, type Sentence } from './word-api';

/** "3 câu đã gặp" (copy §4.4): the learner's sentences of one meaning, oldest first, each one deletable (GE4). */
export function SavedSentencesDialog({ lemma, senseId, onClose }: { lemma: string; senseId: string; onClose: () => void }) {
  const t = useTranslations('App.word');
  const tc = useTranslations('App.common');
  const list = useSentences(senseId);
  const items = list.data?.items ?? [];
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('sentencesTitle', { word: lemma })}
      footer={
        <Button variant="quiet" onPress={onClose}>
          {tc('close')}
        </Button>
      }
    >
      {list.isPending ? (
        <FullScreenSpinner />
      ) : items.length === 0 ? (
        <p className="text-body text-muted">{t('noSentences')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((sentence) => (
            <SentenceRow key={sentence.id} sentence={sentence} lemma={lemma} senseId={senseId} />
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function SentenceRow({ sentence, lemma, senseId }: { sentence: Sentence; lemma: string; senseId: string }) {
  const t = useTranslations('App.word');
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const remove = useSubmitOnce(async (key) => {
    await api.delete(`/v1/sentences/${sentence.id}`, { idempotencyKey: key });
    return true;
  });

  async function onDelete() {
    try {
      if (!(await remove.submit())) return;
      showToast(t('sentenceDeleted'), 'success');
    } catch (error) {
      showToast(errorText(error), 'danger');
    } finally {
      void client.invalidateQueries({ queryKey: sentencesKey(senseId) });
      void client.invalidateQueries({ queryKey: wordKey(lemma) });
    }
  }

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <p className="min-w-0 break-words text-body text-ink">{highlightWord(sentence.text, lemma)}</p>
      <Button variant="ghost" aria-label={t('deleteSentence')} isPending={remove.busy} onPress={() => void onDelete()} className="shrink-0 px-2 text-danger">
        <Trash2 aria-hidden className="size-4" />
      </Button>
    </li>
  );
}
