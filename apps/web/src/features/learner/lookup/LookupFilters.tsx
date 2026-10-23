'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/app-ui/Checkbox';
import { Select } from '@/app-ui/Select';
import { LEVELS, POS, useTopics, type LookupParams } from './lookup-api';

const ALL = 'all';

/** K/30, M/40 filter row: level, topic, part of speech, "Chỉ từ của tôi", "Xóa lọc". Every change goes back to the URL. */
export function LookupFilters({ value, onChange }: { value: LookupParams; onChange: (next: LookupParams) => void }) {
  const t = useTranslations('App.lookup');
  const topics = useTopics().data?.items ?? [];
  const set = (key: 'level' | 'topic' | 'pos') => (id: string) => {
    const next = { ...value };
    if (id === ALL) delete next[key];
    else next[key] = id;
    onChange(next);
  };
  const shown = (label: (v: string) => string) => (item: { id: string; label: string }) => label(item.id === ALL ? t('all') : item.label);
  const filtered = value.level || value.topic || value.pos || value.mine;

  return (
    <div className="grid grid-cols-2 items-center gap-2 md:flex md:flex-wrap">
      <div className="md:w-44">
        <Select
          label={t('colLevel')}
          hideLabel
          value={value.level ?? ALL}
          onChange={set('level')}
          items={[{ id: ALL, label: t('all') }, ...LEVELS.map((l) => ({ id: l, label: l }))]}
          display={shown((v) => t('level', { value: v }))}
        />
      </div>
      <div className="md:w-52">
        <Select
          label={t('topicLabel')}
          hideLabel
          value={value.topic ?? ALL}
          onChange={set('topic')}
          items={[{ id: ALL, label: t('all') }, ...topics.map((tp) => ({ id: tp.code, label: tp.name }))]}
          display={shown((v) => t('topic', { value: v }))}
        />
      </div>
      <div className="md:w-56">
        <Select
          label={t('colPos')}
          hideLabel
          value={value.pos ?? ALL}
          onChange={set('pos')}
          items={[{ id: ALL, label: t('all') }, ...POS.map((p) => ({ id: p, label: p }))]}
          display={shown((v) => t('pos', { value: v }))}
        />
      </div>
      <Checkbox isSelected={value.mine === true} onChange={(on) => onChange({ ...value, mine: on || undefined })}>
        {t('mine')}
      </Checkbox>
      {filtered && (
        <button
          type="button"
          onClick={() => onChange(value.q ? { q: value.q } : {})}
          className="justify-self-start rounded-sm px-1 text-ui font-semibold text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {t('clear')}
        </button>
      )}
    </div>
  );
}
