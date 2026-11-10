'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { LEVELS, POS, useTopics, type LookupParams } from './lookup-api';

const ALL = 'all';

/**
 * Figma "Câu bộ lọc" (85:3277): "24 từ trình độ B1, chủ đề Công việc, loại từ tất cả." Each value opens a menu; a choice replaces
 * the URL and keeps the other filters.
 */
export function LookupFilters({ value, total, onChange }: { value: LookupParams; total: number; onChange: (next: LookupParams) => void }) {
  const t = useTranslations('App.lookup');
  const topics = useTopics().data?.items ?? [];
  const all = t('all');
  const level = value.level ?? all;
  const topic = value.topic ? (topics.find((tp) => tp.code === value.topic)?.name ?? value.topic) : all;
  const pos = value.pos ?? all;
  const set = (key: 'level' | 'topic' | 'pos') => (id: string) => onChange({ ...value, [key]: id === ALL ? undefined : id });
  return (
    <p className="font-wm-sans text-wm-base text-wm-ink md:text-wm-lead">
      {t.rich('summary', {
        count: total,
        level,
        topic,
        pos,
        lv: (chunks) => (
          <FilterMenu label={t('level', { value: level })} items={[{ id: ALL, label: all }, ...LEVELS.map((id) => ({ id, label: id }))]} onAction={set('level')}>
            {chunks}
          </FilterMenu>
        ),
        tp: (chunks) => (
          <FilterMenu label={t('topic', { value: topic })} items={[{ id: ALL, label: all }, ...topics.map((tp) => ({ id: tp.code, label: tp.name }))]} onAction={set('topic')}>
            {chunks}
          </FilterMenu>
        ),
        ps: (chunks) => (
          <FilterMenu label={t('pos', { value: pos })} items={[{ id: ALL, label: all }, ...POS.map((id) => ({ id, label: id }))]} onAction={set('pos')}>
            {chunks}
          </FilterMenu>
        ),
      })}
    </p>
  );
}

/** A filter value in the sentence: underlined accent text that opens its menu. */
function FilterMenu({ label, children, items, onAction }: {
  label: string;
  children: ReactNode;
  items: Array<{ id: string; label: string }>;
  onAction: (id: string) => void;
}) {
  return (
    <MenuTrigger>
      <Button
        aria-label={label}
        className="rounded-wm-xs font-semibold text-wm-accent underline decoration-2 underline-offset-4 outline-none hover:brightness-112 focus-visible:outline-3 focus-visible:outline-wm-accent"
      >
        {children}
      </Button>
      <Popover placement="bottom start" className="max-h-80 min-w-44 overflow-y-auto rounded-wm-md border border-wm-line bg-wm-surface p-1 shadow-wm-pop outline-none">
        <Menu className="outline-none" onAction={(key) => onAction(String(key))}>
          {items.map((item) => (
            <MenuItem
              key={item.id}
              id={item.id}
              className="cursor-pointer rounded-wm-sm px-3 py-2 font-wm-sans text-wm-small text-wm-ink outline-none data-focused:bg-wm-accent-soft data-focused:text-wm-accent"
            >
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
