import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { ApiError } from '../../api/problem';
import { useApi } from '../../auth/session-context';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { ListState } from '../../ui/ListState';
import { aiKeys, getSet, type AiOperation, type EvalSet } from './ai-api';
import { exampleSummary } from './prompt-form';
import { RevealExampleDialog } from './RevealExampleDialog';

type Props = { op: AiOperation; set: EvalSet; onClose: () => void };

/**
 * "Phiên bản {n}" (design §5.1): the items of one frozen version. A held-out item nobody opened shows no content, even when it was deleted
 * from the working set; it can be opened here (the question comes first) and then reads like a dev item marked "Đã bị xem".
 */
export function EvalSetDialog({ op, set, onClose }: Props) {
  const t = useTranslations();
  const api = useApi();
  const [revealing, setRevealing] = useState<string | null>(null);
  const detail = useQuery({ queryKey: aiKeys.set(set.id), queryFn: () => getSet(api, set.id) });
  const items = detail.data?.items ?? [];

  let body;
  if (detail.isPending) body = <ListState state="loading" />;
  else if (detail.isError) {
    body = detail.error instanceof ApiError && detail.error.problem.slug === 'forbidden'
      ? <Banner variant="error">{t('errors.forbidden')}</Banner>
      : <ListState state="error" onRetry={() => void detail.refetch()} />;
  } else {
    body = (
      <ul className="flex max-h-96 flex-col overflow-y-auto text-ui">
        {items.map((item) => {
          const hidden = item.split === 'held_out' && item.revealed_at === null;
          return (
            <li key={`${item.position}-${item.example_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border py-2">
              <Badge tone={item.split === 'dev' ? 'neutral' : 'warning'}>{t(item.split === 'dev' ? 'ai.eval.split.dev' : 'ai.eval.split.heldOut')}</Badge>
              <span className="min-w-0 flex-1 wrap-anywhere text-ink">
                {hidden || item.input === null ? t('ai.eval.heldOutHidden') : exampleSummary(item.input)}
              </span>
              {item.revealed_at !== null && <span className="text-xs text-muted">{t('ai.eval.sets.seen')}</span>}
              {!item.in_working_set && <span className="text-xs text-muted">{t('ai.eval.sets.deleted')}</span>}
              {hidden && (
                <Button variant="ghost" onPress={() => setRevealing(item.example_id)}>{t('ai.eval.reveal.button')}</Button>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      <Dialog
        isOpen
        onOpenChange={(open) => !open && onClose()}
        title={t('ai.eval.sets.version', { version: set.version })}
        size="lg"
        actions={<Button variant="secondary" onPress={onClose}>{t('common.close')}</Button>}
      >
        <p className="text-ui text-muted">{t('ai.eval.counts', { dev: set.dev_count, heldOut: set.held_out_count })}</p>
        {body}
      </Dialog>
      <RevealExampleDialog op={op} exampleId={revealing} onClose={() => setRevealing(null)} />
    </>
  );
}
