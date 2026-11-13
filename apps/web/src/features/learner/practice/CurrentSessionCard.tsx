'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { TEXT_BUTTON_BASE, TEXT_BUTTON_TONE } from '@/ui/TextButton';
import type { GroupSummary } from '../groups/groups-api';
import { doneCount, type CurrentSession } from './practice-api';

/** "Nhóm Công nghệ", "Từ hay sai"…: where the open session's words come from. */
export function useSourceLabel(): (current: CurrentSession, groups: GroupSummary[]) => string {
  const t = useTranslations('App.practice.current.source');
  return ({ session }, groups) => {
    const name = groups.find((g) => g.id === session.group_id)?.name;
    switch (session.source) {
      case 'group':
        return name ? t('group', { name }) : t('groupUnknown');
      case 'weak':
        return name ? t('weakGroup', { name }) : t('weak');
      default:
        return t(session.source);
    }
  };
}

/** K/51 "Phiên đang dở" (Figma 99:3169, D9, E34): how far, where from, and [Làm tiếp câu n →]; in K/55 it says the session still goes on. */
export function CurrentSessionCard({ current, groups, out }: { current: CurrentSession; groups: GroupSummary[]; out: boolean }) {
  const t = useTranslations('App.practice.current');
  const locale = useLocale();
  const label = useSourceLabel();
  const done = doneCount(current);
  const total = current.session.target_count;
  const values = { source: label(current, groups), done, total };
  return (
    <section
      aria-labelledby="current-session"
      className="flex flex-col gap-3 rounded-wm-card border border-wm-line bg-wm-surface px-5 py-4 shadow-wm-card md:flex-row md:items-center md:gap-5"
    >
      <span aria-hidden className="font-wm-display text-wm-card-title text-wm-accent">
        {done}/{total}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="current-session" className="font-wm-sans text-wm-base-strong text-wm-ink">
          {t('title')}
        </h2>
        <p className="wrap-anywhere font-wm-sans text-wm-small text-wm-muted">{out ? t('bodyOut', values) : t('body', values)}</p>
      </div>
      <Link href={`/${locale}/app/practice/session`} className={`${TEXT_BUTTON_BASE} ${TEXT_BUTTON_TONE.normal} shrink-0`}>
        {current.session.status === 'waiting_continue' ? t('resumeWaiting') : t('resume', { n: done + 1 })}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}

type ResumeProps = {
  current: CurrentSession | null;
  groups: GroupSummary[];
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onStartNew: () => void;
  busy: boolean;
};

/** K/77 (E35): asked before `POST /practice/sessions` while a session is open; a new one closes the old. */
export function ResumeDialog({ current, groups, isOpen, onClose, onResume, onStartNew, busy }: ResumeProps) {
  const t = useTranslations('App.practice.resumeDialog');
  const tc = useTranslations('App.common');
  const label = useSourceLabel();
  if (!current) return null;
  const done = doneCount(current);
  const total = current.session.target_count;
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!busy}
      title={t('title', { done, total })}
      closeLabel={tc('close')}
      footer={
        <>
          <Button variant="secondary" isPending={busy} onPress={onStartNew}>
            {t('startNew')}
          </Button>
          <Button variant="primary" isDisabled={busy} onPress={onResume}>
            {t('resume')}
          </Button>
        </>
      }
    >
      <p className="font-wm-sans text-wm-base text-wm-ink">{t('body', { source: label(current, groups), done, total })}</p>
    </Dialog>
  );
}
