'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { createFormat } from '@/app-shell/format';
import type { AppLocale } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { shownPos } from '@/lib/pos';
import { Card } from '@/ui/Card';
import { SegmentBar } from '@/ui/SegmentBar';
import { TextButton } from '@/ui/TextButton';
import { LEVEL_FILL, LEVELS, toLevel, useLevelInterval, useLevelName } from '@/ui/levels';
import { DeckPickerDialog } from '../add-word/DeckPickerDialog';
import type { GroupSummary } from '../groups/groups-api';
import type { ItemState, PageSense } from './word-api';

/** Level tag: a 9 px level square and "Bậc 3 · Bài báo sáng nay" ("Mới · …" for a word not reviewed yet). */
export function LevelTag({ level, group }: { level: number; group?: string }) {
  const levelName = useLevelName();
  const name = levelName(toLevel(level));
  return (
    <span className="inline-flex items-center gap-1.5 font-wm-sans text-wm-small text-wm-ink">
      <span aria-hidden className={cn('size-2.25 shrink-0 rounded-wm-key', LEVEL_FILL[toLevel(level)])} />
      {group ? `${name} · ${group}` : name}
    </span>
  );
}

/**
 * Figma "Bạn đang học" (118:4659): the meaning being learned, the six levels with the current one, the next review, each group with
 * its level (one item, so one level for every group), and [Thêm vào nhóm khác] (Overlay 5).
 */
export function LearningBlock({ sense, item, groups }: { sense: PageSense; item: ItemState; groups: GroupSummary[] }) {
  const t = useTranslations('App.word');
  const levelName = useLevelName();
  const levelInterval = useLevelInterval();
  const locale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  // `due_date` is the learner's own day already (as R45): formatted in UTC so no zone moves it.
  const due = useMemo(() => createFormat(locale, 'UTC').date(item.due_date, 'weekdayDayMonth'), [locale, item.due_date]);
  const interval = levelInterval(toLevel(item.level));
  const decks = item.group_ids.flatMap((id) => groups.find((g) => g.id === id) ?? []);

  return (
    <section aria-labelledby="dang-hoc">
      <Card className="flex flex-col gap-2">
        <h2 id="dang-hoc" className="text-wm-meta text-wm-muted">
          {t('learningTitle')}
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="break-words font-wm-display text-wm-word text-wm-ink">{sense.meaning.text}</span>
          {shownPos(sense.pos) && <span className="text-wm-meta text-wm-muted">{shownPos(sense.pos)}</span>}
        </p>
        <SegmentBar
          aria-label={t('levelBar', { level: levelName(toLevel(item.level)) })}
          className="my-2"
          segments={LEVELS.map((i) => ({ size: 1, fill: i <= item.level ? 1 : 0, tone: LEVEL_FILL[i], label: levelName(i) }))}
          labels={LEVELS.map((i) => (i === item.level ? <b key={i} className="font-semibold text-wm-ink">{levelName(i)}</b> : levelName(i)))}
        />
        <p className="font-wm-sans text-wm-small text-wm-ink">
          <strong className="font-semibold">{levelName(toLevel(item.level))}</strong>
          {interval && ` · ${interval}`}
        </p>
        <div className="flex items-center justify-between gap-3 border-t border-wm-line py-2 font-wm-sans text-wm-small">
          <span className="text-wm-muted">{t('nextReview')}</span>
          <span className="font-semibold text-wm-ink">{due}</span>
        </div>
        {decks.map((deck) => (
          <div key={deck.id} className="flex items-center justify-between gap-3 border-t border-wm-line py-2 font-wm-sans text-wm-small">
            <span className="min-w-0 wrap-anywhere text-wm-muted">{deck.name}</span>
            <LevelTag level={item.level} />
          </div>
        ))}
        <TextButton tone="add" className="self-start" onPress={() => setOpen(true)}>
          {t('addCardTitle')}
        </TextButton>
        {open && <DeckPickerDialog sense={sense} inGroups={item.group_ids} onClose={() => setOpen(false)} />}
      </Card>
    </section>
  );
}
