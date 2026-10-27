import { useInfiniteQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { ListState } from '../../ui/ListState';
import { listSettingsHistory, type SettingValue } from './settings-api';

/** [Lịch sử thay đổi] (A/70a): key, old → new, who, when; newest first, "Tải thêm". */
export function SettingsHistoryDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations();
  const api = useApi();
  const format = useFormatter();
  const dateTime = useDateTime();
  const history = useInfiniteQuery({
    queryKey: ['settings', 'history'],
    queryFn: ({ pageParam }) => listSettingsHistory(api, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_page_token ?? undefined,
  });
  const rows = history.data?.pages.flatMap((p) => p.items) ?? [];
  const shown = (value: SettingValue) => {
    if (value === null) return t('settings.hint.empty');
    if (typeof value === 'boolean') return value ? t('settings.hint.on') : t('settings.hint.off');
    return typeof value === 'number' ? format.number(value) : value;
  };

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={t('settings.historyDialog.title')}
      size="md"
      actions={
        <Button variant="secondary" onPress={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {history.isPending || (history.isError && rows.length === 0) || rows.length === 0 ? (
        <ListState
          state={history.isPending ? 'loading' : history.isError ? 'error' : 'empty'}
          emptyText={t('settings.historyDialog.empty')}
          onRetry={() => void history.refetch()}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <li key={`${row.key}-${row.changed_at}`} className="flex flex-col gap-0.5 py-2">
              <code className="wrap-anywhere text-xs text-muted">{row.key}</code>
              <span className="wrap-anywhere text-ui font-semibold text-ink">
                {t('settings.historyDialog.change', { old: shown(row.old_value), new: shown(row.new_value) })}
              </span>
              <span className="wrap-anywhere text-xs text-muted">
                {t('settings.historyDialog.by', {
                  email: row.changed_by.email ?? t('settings.historyDialog.unknownUser'),
                  at: dateTime(row.changed_at),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {history.hasNextPage && (
        <Button variant="secondary" className="w-fit self-center" isPending={history.isFetchingNextPage} onPress={() => void history.fetchNextPage()}>
          {t('common.loadMore')}
        </Button>
      )}
    </Dialog>
  );
}
