'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { createFormat } from '@/app-shell/format';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { StageBar } from '@/ui/StageBar';
import { TextButton } from '@/ui/TextButton';
import { DeckPickerDialog } from '../add-word/DeckPickerDialog';
import type { GroupSummary } from '../groups/groups-api';
import { STAGE_KEYS } from '../groups/stages';
import type { ItemState, PageSense } from './word-api';

/** Stage 5's dot is a gradient, so bars use its flat colour (as `GroupPicker`). */
const STAGE_FILL = ['bg-wm-stage-0-dot', 'bg-wm-stage-1-dot', 'bg-wm-stage-2-dot', 'bg-wm-stage-3-dot', 'bg-wm-stage-4-dot', 'bg-wm-stage-5-solid'] as const;

/** Figma "Ngăn" tag: a 9 px stage square and "Ngăn 3 ngày · Đề 12 · Writing" ("Mới · …" for a word not reviewed yet). */
export function StageTag({ level, group }: { level: number; group?: string }) {
  const t = useTranslations('App.word');
  const tStage = useTranslations('App.stages');
  const stage = level === 0 ? tStage('s0') : t('stageTag', { stage: tStage(STAGE_KEYS[level] ?? 's30') });
  return (
    <span className="inline-flex items-center gap-1.5 font-wm-sans text-wm-small text-wm-ink">
      <span aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-xs', STAGE_FILL[level] ?? STAGE_FILL[5])} />
      {group ? `${stage} · ${group}` : stage}
    </span>
  );
}

/**
 * Figma "Bạn đang học" (118:4659): the meaning being learned, the six stages with the current one, the next review, each group with
 * its stage (one item, so one stage for every group), and [Thêm vào nhóm khác] (Overlay 5).
 */
export function LearningBlock({ sense, item, groups }: { sense: PageSense; item: ItemState; groups: GroupSummary[] }) {
  const t = useTranslations('App.word');
  const tStage = useTranslations('App.stages');
  const locale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  // `due_date` is the learner's own day already (as R45): formatted in UTC so no zone moves it.
  const due = useMemo(() => createFormat(locale, 'UTC').date(item.due_date, 'weekdayDayMonth'), [locale, item.due_date]);
  const decks = item.group_ids.flatMap((id) => groups.find((g) => g.id === id) ?? []);
  const stage = (level: number) => tStage(STAGE_KEYS[level] ?? 's30');

  return (
    <section aria-labelledby="dang-hoc" className="flex flex-col gap-2 rounded-wm-xl border border-wm-line bg-wm-surface p-4 shadow-wm-card md:p-6">
      <h2 id="dang-hoc" className="text-wm-meta text-wm-muted">
        {t('learningTitle')}
      </h2>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="break-words font-wm-display text-wm-word text-wm-ink">{sense.meaning.text}</span>
        <span className="text-wm-meta text-wm-muted">{sense.pos}</span>
      </p>
      <StageBar
        aria-label={t('stageBar', { stage: stage(item.level) })}
        className="my-2"
        segments={STAGE_KEYS.map((key, i) => ({ size: 1, fill: i <= item.level ? 1 : 0, tone: STAGE_FILL[i], label: tStage(key) }))}
        labels={STAGE_KEYS.map((key, i) => (i === item.level ? <b key={key} className="font-semibold text-wm-ink">{tStage(key)}</b> : tStage(key)))}
      />
      <div className="flex items-center justify-between gap-3 border-t border-wm-line py-2 font-wm-sans text-wm-small">
        <span className="text-wm-muted">{t('nextReview')}</span>
        <span className="font-semibold text-wm-ink">{due}</span>
      </div>
      {decks.map((deck) => (
        <div key={deck.id} className="flex items-center justify-between gap-3 border-t border-wm-line py-2 font-wm-sans text-wm-small">
          <span className="min-w-0 wrap-anywhere text-wm-muted">{deck.name}</span>
          <StageTag level={item.level} />
        </div>
      ))}
      <TextButton tone="add" className="self-start" onPress={() => setOpen(true)}>
        {t('addCardTitle')}
      </TextButton>
      {open && <DeckPickerDialog sense={sense} onClose={() => setOpen(false)} />}
    </section>
  );
}
