import { useInfiniteQuery } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { useDateTime } from '../../i18n/use-date-time';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { ListState } from '../../ui/ListState';
import { listSettingsHistory, parentOf, SECTIONS, SETTINGS_LAYOUT, type Section, type SettingValue } from './settings-api';
import { choiceLabel } from './SettingsField';

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
  const ts = useTranslations('settings');
  /** `practice.ai_placement` → its section and field spec, when the layout has that key. */
  const fieldOf = (key: string) => {
    const section = key.slice(0, key.indexOf('.')) as Section;
    const spec = SECTIONS.includes(section) ? SETTINGS_LAYOUT[section].find((f) => f.key === key.slice(section.length + 1)) : undefined;
    return spec ? { section, spec } : null;
  };
  const labelOf = (section: Section, key: string) => ts(`fields.${section}.${key}` as Parameters<typeof ts>[0]);
  /** The field's label, a dependent field's prefixed with its choice's ("Số câu AI tối đa mỗi phiên · Mức cố định"); null for a retired key. */
  const label = (key: string) => {
    const field = fieldOf(key);
    if (!field) return null;
    const parent = parentOf(field.section, field.spec.key);
    const own = labelOf(field.section, field.spec.key);
    return parent ? `${labelOf(field.section, parent)} · ${own}` : own;
  };
  const shown = (key: string, value: SettingValue) => {
    if (value === null) return t('settings.hint.empty');
    if (typeof value === 'boolean') return value ? t('settings.hint.on') : t('settings.hint.off');
    const field = fieldOf(key);
    if (typeof value === 'string' && field?.spec.kind === 'choice') return choiceLabel(ts, field.spec.key, value);
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
              {label(row.key) && <span className="wrap-anywhere text-ui text-ink">{label(row.key)}</span>}
              <code className="wrap-anywhere text-xs text-muted">{row.key}</code>
              <span className="wrap-anywhere text-ui font-semibold text-ink">
                {t('settings.historyDialog.change', { old: shown(row.key, row.old_value), new: shown(row.key, row.new_value) })}
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
