import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { userLabel } from '../../api/user-ref';
import { useApi } from '../../auth/session-context';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { ListState } from '../../ui/ListState';
import { aiKeys, listRevisions, type AiOperation, type PromptExample, type PromptRevision } from './ai-api';
import { useAiFormat } from './useAiFormat';

const textBlock = 'whitespace-pre-wrap wrap-anywhere rounded-inner bg-canvas p-3 text-ui text-ink';

/** A prompt's text and examples, read-only (an old revision, or the newer one after a conflict). */
export function RevisionContent({ instructions, examples }: { instructions: string; examples: PromptExample[] }) {
  const t = useTranslations();
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">{t('ai.prompts.instructions')}</span>
        <p className={textBlock}>{instructions}</p>
      </div>
      {examples.map((example, index) => (
        <div key={index} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">{t('ai.prompts.example', { n: index + 1 })}</span>
          <pre className={`${textBlock} font-mono text-xs`}>{JSON.stringify(example, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}

/** A/82 "Lịch sử": every saved revision, newest first; [Xem] opens one read-only with [Chép vào ô sửa]. */
export function PromptHistory({ op, onCopy }: { op: AiOperation; onCopy: (revision: PromptRevision) => void }) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const [open, setOpen] = useState<PromptRevision | null>(null);
  const list = useInfiniteQuery({
    queryKey: aiKeys.revisions(op),
    queryFn: ({ pageParam }) => listRevisions(api, op, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section aria-labelledby="prompt-history" className="flex flex-col gap-3">
      <h2 id="prompt-history" className="text-lg font-bold text-ink">{t('ai.prompts.history.title')}</h2>
      <p className="text-ui text-muted">{t('ai.prompts.history.note')}</p>
      {list.isError ? (
        <ListState state="error" onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <ListState state="loading" />
      ) : rows.length === 0 ? (
        <p className="text-ui text-muted">{t('ai.prompts.history.empty')}</p>
      ) : (
        <ul aria-label={t('ai.prompts.history.title')} className="flex flex-col divide-y-2 divide-border rounded-panel border-2 border-border">
          {rows.map((row) => (
            <li key={row.revision} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink">{t('ai.prompts.history.revision', { revision: row.revision })}</span>
                <span className="text-xs text-muted wrap-anywhere">
                  {t('ai.prompts.history.savedBy', { at: format.dateTime(row.saved_at), by: userLabel(row.saved_by_user, t) })}
                </span>
              </span>
              <Button variant="ghost" onPress={() => setOpen(row)} aria-label={t('ai.prompts.history.viewFor', { revision: row.revision })}>
                {t('ai.prompts.history.view')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button variant="secondary" className="self-center" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
          {t('common.loadMore')}
        </Button>
      )}
      <Dialog
        isOpen={open !== null}
        onOpenChange={(isOpen) => !isOpen && setOpen(null)}
        title={open ? t('ai.prompts.history.viewTitle', { revision: open.revision }) : ''}
        size="lg"
        actions={
          <>
            <Button variant="secondary" onPress={() => setOpen(null)}>{t('common.close')}</Button>
            <Button
              onPress={() => {
                if (open) onCopy(open);
                setOpen(null);
              }}
            >
              {t('ai.prompts.copyToEditor')}
            </Button>
          </>
        }
      >
        {open && <RevisionContent instructions={open.instructions} examples={open.examples} />}
      </Dialog>
    </section>
  );
}
