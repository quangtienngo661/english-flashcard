import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'use-intl';
import { saveBlob } from '../../api/download';
import { useErrorMessage } from '../../api/use-error-message';
import { useApi } from '../../auth/session-context';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { exportSenses, LEVELS, listTopics, listUploads, VALID_POS, type TopicView } from '../content/content-api';

const ALL = 'all';
const STATUSES = ['unpublishable', 'open_draft', 'published'] as const;

/** `Ăn uống (food)`: the name in the UI language, else `en`, else just the code; an archived topic gets a mark. */
export function topicLabel(topic: TopicView, locale: string, archivedLabel: string): string {
  const name = topic.names[locale as 'vi' | 'en'] ?? topic.names.en;
  const base = name ? `${name} (${topic.code})` : topic.code;
  return topic.archived_at ? `${base} · ${archivedLabel}` : base;
}

/** The file name carries the admin's local date, not UTC (spec §6.3). */
function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Spec §6.3 "Xuất CSV": filters → `GET senses/export` → a file the editor fills in and re-uploads. */
export function ExportPage() {
  const t = useTranslations();
  const locale = useLocale();
  const format = useFormatter();
  const api = useApi();
  const errorMessage = useErrorMessage();
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => listTopics(api) });
  const uploads = useQuery({ queryKey: ['uploads', 'export-options'], queryFn: () => listUploads(api) });

  const [status, setStatus] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [pos, setPos] = useState(ALL);
  const [topic, setTopic] = useState(ALL);
  const [batch, setBatch] = useState(ALL);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  const all = { id: ALL, label: t('export.all') };
  const only = (value: string) => (value === ALL ? undefined : value);
  const date = (iso: string) => format.dateTime(new Date(iso), { day: '2-digit', month: '2-digit', year: 'numeric' });

  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const blob = await exportSenses(api, {
        status: only(status),
        level: only(level),
        pos: only(pos),
        topic: only(topic),
        batch_id: only(batch),
      });
      saveBlob(blob, `senses-${localDate(new Date())}.csv`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void download();
      }}
      className="flex flex-col gap-4 rounded-panel bg-surface p-4 shadow-card"
    >
      {error && <Banner variant="error">{error}</Banner>}
      <div className="grid gap-4 shell:grid-cols-2">
        <Select label={t('export.status')} value={status} onChange={setStatus} items={[all, ...STATUSES.map((s) => ({ id: s, label: t(`export.statuses.${s}`) }))]} />
        <Select label={t('export.level')} value={level} onChange={setLevel} items={[all, ...LEVELS.map((l) => ({ id: l, label: l }))]} />
        <Select label={t('export.pos')} value={pos} onChange={setPos} items={[all, ...VALID_POS.map((p) => ({ id: p, label: p }))]} />
        <Select
          label={t('export.topic')}
          value={topic}
          onChange={setTopic}
          items={[all, ...(topics.data ?? []).map((tp) => ({ id: tp.code, label: topicLabel(tp, locale, t('export.archived')) }))]}
        />
        <Select
          label={t('export.batch')}
          value={batch}
          onChange={setBatch}
          items={[all, ...(uploads.data?.items ?? []).map((b) => ({ id: b.id, label: `${b.file_name} · ${date(b.created_at)}` }))]}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" isPending={pending}>
          {t('export.download')}
        </Button>
      </div>
    </form>
  );
}
