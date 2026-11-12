'use client';

import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { hardReplace } from '@/app-shell/navigate';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { showToast } from '@/ui/Toast';
import { GROUPS_KEY } from '../groups/groups-api';
import { bareIpa, cleanExamples, EditSuggestionForm, type WordDraft } from '../add-word/EditSuggestionForm';
import { wordHref, type PageSense } from './word-api';

const draftOf = (sense: PageSense): WordDraft => ({
  lemma: sense.lemma,
  pos: sense.pos ?? '',
  meaning: sense.meaning.text,
  level: sense.level ?? '',
  topic: sense.topics[0]?.code ?? '',
  examples: sense.examples.length > 0 ? sense.examples : [''],
  ipa: sense.pronunciation?.custom ?? '',
});

type Patch = {
  lemma?: string;
  pos?: string | null;
  level?: string | null;
  topics?: string[];
  /** Đợt C (H10, DC33): `ipa` belongs to this meaning; null clears it. */
  senses?: Array<{ sense_id: string; meaning?: string; examples?: string[]; ipa?: string | null }>;
};

/** Only what changed (`PATCH /v1/my-words/{id}`): the API drops the "AI gợi ý" label when meaning, topics or examples change. */
function patchOf(sense: PageSense, before: WordDraft, after: WordDraft): Patch {
  const patch: Patch = {};
  if (after.lemma.trim() !== before.lemma) patch.lemma = after.lemma.trim();
  if (after.pos !== before.pos) patch.pos = after.pos || null;
  if (after.level !== before.level) patch.level = after.level || null;
  if (after.topic !== before.topic) patch.topics = after.topic ? [after.topic] : [];
  const meaning = after.meaning.trim() !== before.meaning ? after.meaning.trim() : undefined;
  const examples = cleanExamples(after.examples);
  const examplesChanged = examples.join('\n') !== cleanExamples(before.examples).join('\n');
  const ipaChanged = bareIpa(after.ipa) !== bareIpa(before.ipa);
  if (meaning !== undefined || examplesChanged || ipaChanged) {
    patch.senses = [{
      sense_id: sense.sense_id, ...(meaning !== undefined ? { meaning } : {}), ...(examplesChanged ? { examples } : {}),
      ...(ipaChanged ? { ipa: bareIpa(after.ipa) || null } : {}),
    }];
  }
  return patch;
}

/** [Sửa từ] in the head of K/88: the fields of K/87 for a word the learner already has. */
export function EditMyWordDialog({ sense, onClose }: { sense: PageSense; onClose: () => void }) {
  const t = useTranslations('App.word.mine');
  const tAdd = useTranslations('App.addWord');
  const tc = useTranslations('App.common');
  const locale = useLocale();
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const [before] = useState(() => draftOf(sense));
  const [draft, setDraft] = useState(before);
  const [meaningError, setMeaningError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const save = useSubmitOnce((key) => api.patch(`/v1/my-words/${sense.entry_id}`, patchOf(sense, before, draft), { idempotencyKey: key }));

  async function submit() {
    setFailure(null);
    setMeaningError(undefined);
    if (!draft.meaning.trim()) return setMeaningError(tAdd('meaningRequired'));
    if (!draft.lemma.trim()) return setFailure(tAdd('wordRequired'));
    const patch = patchOf(sense, before, draft);
    if (Object.keys(patch).length === 0) return onClose();
    try {
      await save.submit(JSON.stringify(patch));
      showToast(t('saved'), 'success');
      for (const queryKey of [['word'], ['words'], ['lookup'], ['items']]) void client.invalidateQueries({ queryKey });
      // A new spelling is a new page (the page matches the lemma exactly, D42).
      if (patch.lemma) hardReplace(wordHref(locale, patch.lemma));
      else onClose();
    } catch (error) {
      const slug = error instanceof ApiError ? error.problem.slug : '';
      setFailure(slug === 'private-word-exists' ? tAdd('exists', { word: draft.lemma.trim() }) : errorText(error));
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('editTitle')}
      isDismissable={!save.busy}
      footer={
        <>
          <Button variant="secondary" onPress={onClose}>
            {tc('cancel')}
          </Button>
          <Button isPending={save.busy} onPress={() => void submit()}>
            {t('saveChanges')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <EditSuggestionForm value={draft} onChange={setDraft} meaningError={meaningError} />
        {sense.ai_suggested && <p className="font-wm-sans text-wm-small text-wm-muted">{tAdd('edit.note')}</p>}
        {failure && (
          <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
            {failure}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** [Xóa từ] in the head of K/88: asks first; the word, its saved sentences and its place in every deck go (`DELETE /v1/my-words/{id}`). */
export function DeleteMyWordDialog({ sense, onClose }: { sense: PageSense; onClose: () => void }) {
  const t = useTranslations('App.word.mine');
  const tc = useTranslations('App.common');
  const locale = useLocale();
  const api = useApi();
  const client = useQueryClient();
  const errorText = useErrorMessage();
  const [failure, setFailure] = useState<string | null>(null);
  const remove = useSubmitOnce((key) => api.delete(`/v1/my-words/${sense.entry_id}`, { idempotencyKey: key }));

  async function confirm() {
    setFailure(null);
    try {
      await remove.submit();
      for (const queryKey of [GROUPS_KEY, ['word'], ['words'], ['lookup']]) void client.invalidateQueries({ queryKey });
      hardReplace(`/${locale}/app/lookup`);
    } catch (error) {
      // Already gone (another tab): the page has nothing left to show either.
      if (error instanceof ApiError && error.problem.status === 404) return hardReplace(`/${locale}/app/lookup`);
      setFailure(errorText(error));
    }
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('deleteTitle', { word: sense.lemma })}
      isDismissable={!remove.busy}
      footer={
        <>
          <Button variant="secondary" onPress={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="danger" isPending={remove.busy} onPress={() => void confirm()}>
            {t('delete')}
          </Button>
        </>
      }
    >
      {/* M3's confirm look (Figma "Xác nhận xóa" 121:4597): what is lost in a fail-soft block. */}
      <p role="note" className="flex items-start gap-2 rounded-wm-row bg-wm-fail-soft p-4 font-wm-sans text-wm-small-strong text-wm-fail">
        <AlertTriangle aria-hidden className="mt-0.5 size-4.5 shrink-0" />
        <span>{t('deleteBody')}</span>
      </p>
      {failure && (
        <p role="alert" className="font-wm-sans text-wm-small text-wm-fail">
          {failure}
        </p>
      )}
    </Dialog>
  );
}
