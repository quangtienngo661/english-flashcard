'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Dialog } from '@/ui/Dialog';
import { Skeleton } from '@/ui/Skeleton';
import { SpeakSentence } from '@/ui/SpeakButton';
import { TextButton } from '@/ui/TextButton';
import { showToast } from '@/ui/Toast';
import { TargetWord } from '@/ui/TargetWord';
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
      closeLabel={tc('close')}
    >
      {list.isPending ? (
        <div role="status" className="flex flex-col gap-3">
          <span className="sr-only">{tc('loading')}</span>
          <Skeleton className="h-6" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : items.length === 0 ? (
        <p className="font-wm-sans text-wm-base text-wm-muted">{t('noSentences')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-wm-line">
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
    <li className="flex items-start justify-between gap-2 py-3">
      <p className="min-w-0 flex-1 break-words font-wm-sans text-wm-base text-wm-ink"><TargetWord text={sentence.text} lemma={lemma} /></p>
      <SpeakSentence private text={sentence.text} />
      <TextButton tone="delete" aria-label={t('deleteSentence')} isDisabled={remove.busy} onPress={() => void onDelete()} className="shrink-0 justify-center px-2">
        <Trash2 aria-hidden className="size-4" />
      </TextButton>
    </li>
  );
}
