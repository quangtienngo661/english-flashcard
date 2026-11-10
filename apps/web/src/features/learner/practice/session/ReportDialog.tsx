'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';
import { ApiError } from '@/app-shell/api/problem';
import { useErrorMessage } from '@/app-shell/api/use-error-message';
import { useApi } from '@/app-shell/session/session-context';
import { useSubmitOnce } from '@/app-shell/use-submit-once';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { showToast } from '@/ui/Toast';
import { cn } from '@/lib/cn';

type Reason = { code: string; label: string; detail_hint: string | null; note_required: boolean };
const NOTE_MAX = 300;

/** The reasons for one kind of question, read once per page (design §9.2 Bước 7), in the API's order ("Khác" last, API (d)). */
function useReasons(kind: 'ai' | 'non_ai', enabled: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ['practice', 'report-reasons', kind],
    queryFn: () => api.get<{ items: Reason[] }>(`/v1/practice/report-reasons?kind=${kind}`),
    enabled,
    staleTime: Infinity,
  });
}

/** K/66: "Báo lỗi câu này"; one report per question (409 report-exists counts as sent). */
export function ReportDialog({ itemId, kind, privateWord = false, lemma = null, subtitle, isOpen, onClose, onSent }: {
  itemId: string;
  kind: 'ai' | 'non_ai';
  /** K/81 (D12): an AI question about the learner's own word; no consent box, a line says the team will see it. */
  privateWord?: boolean;
  /** The asked word once the answer is shown; before that the line does not name it. */
  lemma?: string | null;
  subtitle: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const t = useTranslations('App.practice.session.report');
  const tc = useTranslations('App.common');
  const api = useApi();
  const errorText = useErrorMessage();
  const reasons = useReasons(kind, isOpen);
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();
  const reason = reasons.data?.items.find((r) => r.code === code) ?? null;
  const length = [...note.trim()].length;
  const noteMissing = reason?.note_required === true && length === 0;
  const send = useSubmitOnce(async () => {
    try {
      await api.post(`/v1/practice/items/${itemId}/report`, { reason: code, ...(note.trim() ? { note: note.trim() } : {}) });
    } catch (e) {
      if (!(e instanceof ApiError && e.problem.slug === 'report-exists')) throw e;
    }
    return true;
  });

  async function submit() {
    setTried(true);
    if (!reason || noteMissing) return;
    setError(null);
    try {
      if (await send.submit()) {
        showToast(t('done'), 'success');
        onSent();
        onClose();
      }
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!send.busy}
      title={t('title')}
      closeLabel={tc('close')}
      footer={
        <>
          <Button variant="secondary" size="lg" isDisabled={send.busy} onPress={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="primary" size="lg" isPending={send.busy} onPress={() => void submit()}>
            {t('send')}
          </Button>
        </>
      }
    >
      {subtitle && <span className="w-fit rounded-full bg-wm-accent-soft px-2 py-0.5 text-wm-label text-wm-ink">{subtitle}</span>}
      <RadioGroup value={code} onChange={setCode} className="flex flex-col gap-2" isInvalid={tried && !reason}>
        <Label className="text-wm-small-strong text-wm-ink">{t('question')}</Label>
        {(reasons.data?.items ?? []).map((r) => (
          <Radio
            key={r.code}
            value={r.code}
            className="group flex cursor-pointer items-center gap-3 rounded-wm-lg border border-wm-line bg-wm-surface px-3 py-2.5 text-wm-small-strong text-wm-ink outline-none data-focus-visible:outline-3 data-focus-visible:outline-offset-2 data-focus-visible:outline-wm-accent data-selected:border-wm-accent data-selected:bg-wm-accent-soft"
          >
            <span aria-hidden className="flex size-4 shrink-0 items-center justify-center rounded-full border border-wm-line group-data-selected:border-wm-accent">
              <span className="size-2 rounded-full group-data-selected:bg-wm-accent" />
            </span>
            {r.label}
          </Radio>
        ))}
        {tried && !reason && <p className="text-wm-caption text-wm-fail">{t('chooseReason')}</p>}
      </RadioGroup>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={noteId} className="text-wm-small-strong text-wm-ink">
            {t('note')}
          </label>
          <span className="text-wm-caption text-wm-muted">
            {reason?.note_required ? t('required', { count: length, max: NOTE_MAX }) : t('optional', { count: length, max: NOTE_MAX })}
          </span>
        </div>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          rows={3}
          placeholder={reason?.detail_hint ?? undefined}
          aria-invalid={tried && noteMissing}
          className={cn(
            'w-full resize-y rounded-control border-2 bg-wm-surface px-3 py-2 text-wm-small text-wm-ink outline-none placeholder:text-wm-muted focus-visible:border-wm-accent',
            tried && noteMissing ? 'border-wm-fail' : 'border-wm-line',
          )}
        />
        {tried && noteMissing && <p className="text-wm-caption text-wm-fail">{t('noteMissing')}</p>}
      </div>
      {privateWord && <p className="text-wm-small text-wm-ink">{lemma ? t('privateWord', { lemma }) : t('privateWordUnknown')}</p>}
      <p className="text-wm-caption text-wm-muted">{kind === 'ai' ? t('infoAi') : t('info')}</p>
      {error && (
        <p role="alert" className="text-wm-small text-wm-fail">
          {error}
        </p>
      )}
    </Dialog>
  );
}
