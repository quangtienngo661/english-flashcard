import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useErrorDetails, type ErrorDetails } from '../../api/use-error-message';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { FileDrop } from '../../ui/FileDrop';
import { TextArea } from '../../ui/TextArea';
import { showToast } from '../../ui/Toast';
import { aiKeys, createExamples, type AiOperation, type BulkExamplesResult } from './ai-api';
import { BULK_MAX, parseExamples } from './bulk-examples';

const FILE_MAX_BYTES = 2 * 1024 * 1024;
const FILE_TYPES = ['.csv', '.tsv', '.txt', '.jsonl', 'text/csv', 'text/plain'];
const ROOM = /^operation: room for (\d+) more examples, (\d+) valid rows sent$/;

type Props = {
  op: AiOperation;
  /** The operation's `input_fields`, in its order: the columns of the file. */
  inputFields: string[];
  onClose: () => void;
};

type Issue = { line: number; reason: string };

/**
 * `/ai/eval/bulk` (owner 28/10/2026): many examples at once, from a file or pasted text (one reader for both, see `bulk-examples.ts`).
 * Rows that are right go in; a row that is wrong is skipped and listed by its line, so only those lines need fixing.
 */
export function BulkExamplesDialog({ op, inputFields, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const format = useFormatter();
  const queryClient = useQueryClient();
  const errorDetails = useErrorDetails();
  const [text, setText] = useState('');
  const [file, setFile] = useState<{ name: string; detail?: string; error?: string } | null>(null);
  const [banner, setBanner] = useState<ErrorDetails | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<{ created: number; issues: Issue[] } | null>(null);
  const busy = useRef(false);

  const parsed = useMemo(() => (text.trim() === '' ? null : parseExamples(text, inputFields)), [text, inputFields]);
  const requestClose = useDialogDirtyClose(text.trim() !== '' && done === null, onClose);
  const number = (n: number) => format.number(n);

  async function choose(picked: File) {
    if (picked.size > FILE_MAX_BYTES) {
      setFile({ name: picked.name, error: t('ai.eval.bulk.fileTooLarge') });
      return;
    }
    setText(await picked.text());
    setFile({ name: picked.name, detail: t('ai.eval.bulk.fileLoaded') });
    setBanner(null);
  }

  async function submit() {
    if (busy.current || !parsed || parsed.problem || parsed.rows.length === 0) return;
    busy.current = true;
    setPending(true);
    setBanner(null);
    try {
      const result: BulkExamplesResult = await createExamples(api, { operation: op, rows: parsed.rows.map(({ input, note }) => ({ input, note })) });
      await queryClient.invalidateQueries({ queryKey: aiKeys.examples(op) });
      const issues: Issue[] = [
        ...parsed.errors.map((error) => ({ line: error.line, reason: t(`ai.eval.bulk.reasons.${error.reason}`) })),
        ...result.invalid.map((row) => ({ line: parsed.rows[row.row - 1]?.line ?? row.row, reason: row.violations.join('; ') })),
      ].sort((a, b) => a.line - b.line);
      if (issues.length === 0) {
        showToast(t('ai.eval.bulk.added', { count: result.created }));
        requestClose.release();
        onClose();
      } else {
        requestClose.release();
        setDone({ created: result.created, issues });
      }
    } catch (e) {
      const violation = e instanceof ApiError && e.problem.slug === 'validation-failed' ? (e.problem.violations ?? []).join(' ') : '';
      const room = ROOM.exec(violation);
      setBanner(room ? { message: t('ai.eval.bulk.noRoom', { room: Number(room[1]), sent: Number(room[2]) }), code: null } : errorDetails(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const problem = parsed?.problem ?? null;
  const problemText = !problem ? null
    : problem.kind === 'empty' ? t('ai.eval.bulk.problems.empty')
      : problem.kind === 'columns' ? t('ai.eval.bulk.problems.columns', { names: problem.names.join(', '), fields: [...inputFields, 'note'].join(', ') })
        : t('ai.eval.bulk.problems.tooMany', { count: number(problem.count), max: number(BULK_MAX) });
  const readable = parsed?.rows.length ?? 0;
  const unreadable = parsed?.errors.length ?? 0;

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && !pending && requestClose()}
      isDismissable={!pending}
      title={t('ai.eval.bulk.title')}
      size="lg"
    >
      {done ? (
        <div className="flex flex-col gap-4">
          <Banner variant={done.created > 0 ? 'info' : 'warning'}>{t('ai.eval.bulk.added', { count: done.created })}</Banner>
          <p className="text-ui font-semibold text-ink">{t('ai.eval.bulk.skipped', { count: done.issues.length })}</p>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-ui">
            {done.issues.map((issue) => (
              <li key={issue.line} className="flex gap-3 border-b border-border py-1">
                <span className="w-20 shrink-0 font-semibold tabular-nums text-ink">{t('ai.eval.bulk.line', { line: issue.line })}</span>
                <span className="min-w-0 wrap-anywhere text-muted">{issue.reason}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onPress={onClose}>{t('common.close')}</Button>
          </div>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="flex min-w-0 flex-col gap-4"
        >
          {banner && <Banner variant="error" code={banner.code}>{banner.message}</Banner>}
          <p className="text-ui text-muted wrap-anywhere">{t('ai.eval.bulk.hint', { fields: inputFields.join(', '), max: number(BULK_MAX) })}</p>
          <FileDrop
            fileName={file?.error ? undefined : file?.name}
            detail={file?.detail}
            error={file?.error}
            prompt={t('ai.eval.bulk.filePrompt')}
            hint={t('ai.eval.bulk.fileHint')}
            chooseLabel={t('ai.eval.bulk.choose')}
            changeLabel={t('ai.eval.bulk.change')}
            accept={FILE_TYPES}
            onSelect={(picked) => void choose(picked)}
          />
          <TextArea
            id="bulk-text"
            label={t('ai.eval.bulk.paste')}
            placeholder={[...inputFields, 'note'].join(',')}
            value={text}
            onChange={(value) => { setText(value); setFile(null); }}
            isDisabled={pending}
            rows={8}
            spellCheck={false}
          />
          {problemText && parsed && <Banner variant="error">{problemText}</Banner>}
          {parsed && !problem && (
            <p className="text-ui text-ink" role="status">
              {t('ai.eval.bulk.readable', { count: readable })}
              {unreadable > 0 && <span className="text-danger">{` · ${t('ai.eval.bulk.unreadable', { count: unreadable })}`}</span>}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onPress={requestClose} isDisabled={pending}>{t('common.cancel')}</Button>
            <Button type="submit" isPending={pending} isDisabled={!parsed || problem !== null || readable === 0}>
              {t('ai.eval.bulk.submit', { count: readable })}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
