import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { useFormatter, useTranslations } from 'use-intl';
import { useErrorMessage } from '../../api/use-error-message';
import { useDialogDirtyClose } from '../../app/dirty-form';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { TextArea } from '../../ui/TextArea';
import { createEntries, MAX_PASTE_LINES, pastedLines, type BatchLine } from './words-api';

const TONE = { created: 'success', exists: 'neutral', invalid: 'danger' } as const;

/** [Dán danh sách từ] (A/87): ≤ 500 lines `lemma,pos`; the result per line, with "Soạn nghĩa" to the sense the API made or found. */
export function PasteWordsDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const format = useFormatter();
  const api = useApi();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ lines: string[]; items: BatchLine[] } | null>(null);
  const lines = pastedLines(text);
  const tooMany = lines.length > MAX_PASTE_LINES;
  const create = useMutation({
    mutationFn: (sent: string[]) => createEntries(api, sent),
    onSuccess: async ({ items }, sent) => {
      setResult({ lines: sent, items });
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
  const close = useDialogDirtyClose(text.trim() !== '' && result === null, onClose);
  const counts = result && {
    created: result.items.filter((i) => i.status === 'created').length,
    exists: result.items.filter((i) => i.status === 'exists').length,
    invalid: result.items.filter((i) => i.status === 'invalid').length,
  };

  return (
    <Dialog
      isOpen
      onOpenChange={(isOpen) => !isOpen && close()}
      title={t('words.paste.title')}
      size="lg"
      isDismissable={!create.isPending}
      actions={
        result ? (
          <Button variant="secondary" onPress={onClose}>
            {t('common.close')}
          </Button>
        ) : (
          <>
            <Button variant="secondary" onPress={close} isDisabled={create.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onPress={() => create.mutate(lines)} isPending={create.isPending} isDisabled={lines.length === 0 || tooMany}>
              {t('words.paste.submit')}
            </Button>
          </>
        )
      }
    >
      {result === null ? (
        <>
          {create.error && <Banner variant="error">{errorMessage(create.error)}</Banner>}
          <TextArea
            label={t('words.paste.label')}
            description={t('words.paste.hint')}
            value={text}
            onChange={setText}
            error={tooMany ? t('words.paste.tooMany', { count: format.number(lines.length), max: MAX_PASTE_LINES }) : undefined}
          />
        </>
      ) : (
        <>
          <p role="status" className="text-ui font-semibold text-ink">
            {t('words.paste.summary', counts!)}
          </p>
          <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
            {result.items.map((item) => (
              <li key={item.line} className="flex flex-col gap-1 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">{t('words.paste.line', { line: item.line })}</span>
                  <span className="min-w-0 wrap-anywhere text-ui font-semibold text-ink">{result.lines[item.line - 1]}</span>
                  <Badge tone={TONE[item.status]}>{t(`words.paste.status.${item.status}`)}</Badge>
                  {item.sense_id && (
                    <Link to={`/senses/${item.sense_id}`} className="text-ui font-semibold text-primary underline">
                      {t('words.paste.writeSense')}
                    </Link>
                  )}
                </div>
                {item.status === 'invalid' && <p className="text-xs text-danger">{t('words.paste.invalid')}</p>}
                {item.status !== 'invalid' && item.warnings.length > 0 && <p className="text-xs text-muted">{t('words.paste.caseWarning')}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
