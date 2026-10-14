import { useQuery } from '@tanstack/react-query';
import { useFormatter, useLocale, useTranslations } from 'use-intl';
import { useApi } from '../../auth/session-context';
import { Select } from '../../ui/Select';
import { LEVELS, listTopics, listUploads, VALID_POS, type SenseFilter, type TopicView } from './content-api';

const ALL = 'all';
const STATUSES = ['unpublishable', 'open_draft', 'published'] as const;

/** One value per select; `'all'` stands for "no filter". */
export type FilterValues = { status: string; level: string; pos: string; topic: string; batch: string };
export const NO_FILTER: FilterValues = { status: ALL, level: ALL, pos: ALL, topic: ALL, batch: ALL };

/** The query/body filter: a select left on "all" is left out (key order is the export query order). */
export function toFilter(values: FilterValues, withStatus: boolean): SenseFilter {
  const only = (value: string) => (value === ALL ? undefined : value);
  return {
    ...(withStatus ? { status: only(values.status) } : {}),
    level: only(values.level),
    pos: only(values.pos),
    topic: only(values.topic),
    batch_id: only(values.batch),
  };
}

/** `Ăn uống (food)`: the name in the UI language, else `en`, else just the code; an archived topic gets a mark. */
export function topicLabel(topic: TopicView, locale: string, archivedLabel: string): string {
  const name = topic.names[locale as 'vi' | 'en'] ?? topic.names.en;
  const base = name ? `${name} (${topic.code})` : topic.code;
  return topic.archived_at ? `${base} · ${archivedLabel}` : base;
}

type Props = { values: FilterValues; onChange: (values: FilterValues) => void; withStatus?: boolean };

/** The filter selects shared by "Xuất CSV" and "Tạo publish job" (spec §6.3). */
export function FilterFields({ values, onChange, withStatus = false }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const api = useApi();
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => listTopics(api) });
  const uploads = useQuery({ queryKey: ['uploads', 'filter-options'], queryFn: () => listUploads(api) });

  const all = { id: ALL, label: t('export.all') };
  const set = (key: keyof FilterValues) => (value: string) => onChange({ ...values, [key]: value });
  const date = (iso: string) => format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="grid gap-4 shell:grid-cols-2">
      {withStatus && (
        <Select label={t('export.status')} value={values.status} onChange={set('status')} items={[all, ...STATUSES.map((s) => ({ id: s, label: t(`export.statuses.${s}`) }))]} />
      )}
      <Select label={t('export.level')} value={values.level} onChange={set('level')} items={[all, ...LEVELS.map((l) => ({ id: l, label: l }))]} />
      <Select label={t('export.pos')} value={values.pos} onChange={set('pos')} items={[all, ...VALID_POS.map((p) => ({ id: p, label: p }))]} />
      <Select
        label={t('export.topic')}
        value={values.topic}
        onChange={set('topic')}
        items={[all, ...(topics.data ?? []).map((tp) => ({ id: tp.code, label: topicLabel(tp, locale, t('export.archived')) }))]}
      />
      <Select
        label={t('export.batch')}
        value={values.batch}
        onChange={set('batch')}
        items={[all, ...(uploads.data?.items ?? []).map((b) => ({ id: b.id, label: `${b.file_name} · ${date(b.created_at)}` }))]}
      />
    </div>
  );
}
