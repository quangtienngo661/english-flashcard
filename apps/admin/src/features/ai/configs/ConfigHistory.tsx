import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'use-intl';
import { userLabel } from '../../../api/user-ref';
import { useApi } from '../../../auth/session-context';
import { Button } from '../../../ui/Button';
import { ListState } from '../../../ui/ListState';
import { aiKeys, listConfigHistory, type AiOperation, type ConfigEvent } from '../ai-api';
import { useAiFormat } from '../useAiFormat';

type Props = {
  op: AiOperation;
  /** An operation has one draft at a time: while there is one, no row offers a new draft. */
  hasDraft: boolean;
  /** Makes a draft from that config (a published or retired one). */
  onCreateFrom: (configId: string) => void;
  creating: boolean;
};

/** "Lịch sử publish" (design §6.4): every publish, turn-off and rollback of the operation, newest first. */
export function ConfigHistory({ op, hasDraft, onCreateFrom, creating }: Props) {
  const t = useTranslations();
  const api = useApi();
  const format = useAiFormat();
  const list = useInfiniteQuery({
    queryKey: aiKeys.configHistory(op),
    queryFn: ({ pageParam }) => listConfigHistory(api, op, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];

  function label(event: ConfigEvent): string {
    const number = event.config.number;
    if (event.kind === 'rollback') return t('ai.configs.history.rollback', { number });
    const from = event.from_config?.number ?? t('ai.eval.detail.none');
    // A publish of a config without a model is the operation being turned off.
    return t(event.config.model_id === null ? 'ai.configs.history.turnOff' : 'ai.configs.history.publish', { number, from });
  }

  return (
    <section aria-labelledby="config-history" className="flex flex-col gap-3">
      <h2 id="config-history" className="text-lg font-bold text-ink">{t('ai.configs.history.title')}</h2>
      {list.isError ? (
        <ListState state="error" onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <ListState state="loading" />
      ) : rows.length === 0 ? (
        <p className="text-ui text-muted">{t('ai.configs.history.empty')}</p>
      ) : (
        <ul aria-label={t('ai.configs.history.title')} className="flex flex-col divide-y-2 divide-border rounded-panel border-2 border-border">
          {rows.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold text-ink wrap-anywhere">{label(event)}</span>
                <span className="text-xs text-muted wrap-anywhere">
                  {t('ai.prompts.history.savedBy', { at: format.dateTime(event.at), by: userLabel(event.actor_user, t) })}
                </span>
              </span>
              {!hasDraft && (
                <Button variant="ghost" isPending={creating} onPress={() => onCreateFrom(event.config.id)}>
                  {t('ai.configs.history.fromHere')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage && (
        <Button variant="secondary" className="self-center" isPending={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()}>
          {t('common.loadMore')}
        </Button>
      )}
    </section>
  );
}
