import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { ApiError, NetworkError } from '../../api/problem';
import { useIdempotencyKey } from '../../api/idempotency';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { FileDrop } from '../../ui/FileDrop';
import { Select } from '../../ui/Select';
import { useCountdown } from '../account/useCountdown';
import { createUpload, listSources } from '../content/content-api';
import { hasLevelColumn, readCsvHeader } from './csv-header';

/** `apps/api` refuses a larger file with `file-too-large`; refuse it here first (spec B25E9). */
const MAX_BYTES = 10 * 1024 * 1024;
const IN_PROGRESS_DEFAULT_WAIT_S = 2;

type Rejected = { name: string; size: number; reason: 'file-too-large' | 'file-invalid' };

/**
 * Spec §6.3 "Lô nhập": upload a `.csv` (≤ 10 MB); a level source is required when the file has a level column. Shown in
 * a dialog over the uploads list (UB9); `onPendingChange` lets the dialog refuse Esc and outside clicks while it sends.
 */
export function UploadForm({ onPendingChange }: { onPendingChange?: (pending: boolean) => void }) {
  const t = useTranslations();
  const format = useFormatter();
  const api = useApi();
  const navigate = useNavigate();
  const errorDetails = useErrorDetails();
  const queryClient = useQueryClient();
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => listSources(api) });

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rejected, setRejected] = useState<Rejected | null>(null);
  const [levelSourceId, setLevelSourceId] = useState('');
  const [levelError, setLevelError] = useState<string | null>(null);
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const waitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdown = useCountdown();

  const needsLevel = file !== null && hasLevelColumn(headers);
  const fingerprint = file ? `${file.name}|${file.size}|${file.lastModified}|${needsLevel ? levelSourceId : ''}` : '';
  const idempotency = useIdempotencyKey(fingerprint);

  useEffect(() => () => clearTimeout(waitTimer.current), []);
  useEffect(() => onPendingChange?.(pending), [pending, onPendingChange]);

  async function choose(picked: File) {
    clearTimeout(waitTimer.current);
    setBanner(null);
    setCanRetry(false);
    setLevelError(null);
    if (!/\.csv$/i.test(picked.name)) {
      setFile(null);
      setRejected({ name: picked.name, size: picked.size, reason: 'file-invalid' });
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setRejected({ name: picked.name, size: picked.size, reason: 'file-too-large' });
      return;
    }
    // Read the header first, so `needsLevel` never pairs the new file with the previous file's columns.
    const pickedHeaders = await readCsvHeader(picked);
    setRejected(null);
    setHeaders(pickedHeaders);
    setFile(picked);
  }

  async function submit() {
    if (!file || busy.current || countdown.remaining > 0) return;
    if (needsLevel && levelSourceId === '') {
      setLevelError(t('uploads.levelSourceRequired'));
      return;
    }
    busy.current = true;
    setPending(true);
    setBanner(null);
    setCanRetry(false);
    setLevelError(null);
    try {
      const created = await createUpload(api, file, needsLevel ? levelSourceId : null, idempotency.key);
      // The list stays mounted under the dialog (UB9): refresh it so the new batch is there, selected (review I3).
      void queryClient.invalidateQueries({ queryKey: ['uploads'] });
      void navigate(`/uploads/${created.batch_id}`);
    } catch (e) {
      setBanner(errorDetails(e));
      if (e instanceof NetworkError) setCanRetry(true);
      else if (e instanceof ApiError) {
        if (e.problem.status === 429) countdown.start(e.retryAfterSeconds ?? 1);
        else if (e.problem.slug === 'idempotency-key-abandoned') idempotency.renew();
        else if (e.problem.status === 409 && e.problem.slug === '') {
          // The first request is still running: ask again with the same key once it has had time to finish.
          waitTimer.current = setTimeout(() => void submit(), (e.retryAfterSeconds ?? IN_PROGRESS_DEFAULT_WAIT_S) * 1000);
        }
      }
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const megabytes = (bytes: number) => format.number(bytes / (1024 * 1024), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  let dropError: string | undefined;
  let dropDetail: string | undefined;
  if (rejected) {
    dropError = t(`errors.${rejected.reason}`);
    dropDetail =
      rejected.reason === 'file-too-large'
        ? t('uploads.tooLargeHint', { name: rejected.name, size: megabytes(rejected.size) })
        : t('uploads.invalidHint', { name: rejected.name });
  } else if (file) {
    dropDetail = t('uploads.fileSize', { size: megabytes(file.size) });
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      {banner && (
        <Banner
          variant="error"
          code={banner.code}
          action={
            canRetry ? (
              <Button variant="secondary" onPress={() => void submit()}>
                {t('common.retry')}
              </Button>
            ) : undefined
          }
        >
          {banner.message}
        </Banner>
      )}
      <FileDrop
        fileName={file?.name}
        detail={dropDetail}
        error={dropError}
        prompt={t('uploads.dropPrompt')}
        hint={t('uploads.chooseHint')}
        chooseLabel={t('uploads.chooseFile')}
        changeLabel={t('uploads.changeFile')}
        onSelect={(picked) => void choose(picked)}
      />
      {needsLevel && (
        <div className="flex max-w-md flex-col gap-1.5">
          <Select
            label={`${t('uploads.levelSource')} *`}
            placeholder={t('uploads.levelSourcePlaceholder')}
            items={(sources.data ?? []).map((s) => ({ id: s.id, label: `${s.name}${s.version ? ` ${s.version}` : ''}` }))}
            value={levelSourceId}
            onChange={(id) => {
              setLevelSourceId(id);
              setLevelError(null);
            }}
            error={levelError ?? undefined}
          />
          <p className="text-xs text-muted">{t('uploads.levelSourceHint')}</p>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onPress={() => void navigate('/uploads')}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isPending={pending} isDisabled={!file || countdown.remaining > 0}>
          {countdown.remaining > 0 ? t('uploads.wait', { seconds: countdown.remaining }) : t('uploads.submit')}
        </Button>
      </div>
    </form>
  );
}
