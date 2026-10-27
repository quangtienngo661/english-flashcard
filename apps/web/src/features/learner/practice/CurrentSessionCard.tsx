'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/app-ui/Button';
import { Dialog } from '@/app-ui/Dialog';
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

/** K/51 "Phiên đang dở" side card (D9, E34); in K/55 it says the session still goes on. */
export function CurrentSessionCard({ current, groups, out }: { current: CurrentSession; groups: GroupSummary[]; out: boolean }) {
  const t = useTranslations('App.practice.current');
  const locale = useLocale();
  const label = useSourceLabel();
  const done = doneCount(current);
  const values = { source: label(current, groups), done, total: current.session.target_count };
  return (
    <section aria-labelledby="current-session" className="flex flex-col gap-3 rounded-card border-b-4 border-accent-deep bg-accent-soft p-5">
      <h2 id="current-session" className="text-title font-semibold text-ink">
        {t('title')}
      </h2>
      <p className="wrap-anywhere text-caption text-ink">{out ? t('bodyOut', values) : t('body', values)}</p>
      <Link
        href={`/${locale}/app/practice/session`}
        className="flex min-h-control items-center justify-center rounded-inner bg-navy px-4 text-ui font-semibold text-on-navy shadow-ledge outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {current.session.status === 'waiting_continue' ? t('resumeWaiting') : t('resume', { n: done + 1 })}
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
      footer={
        <>
          <Button variant="quiet" size="lg" isPending={busy} onPress={onStartNew}>
            {t('startNew')}
          </Button>
          <Button variant="sticker" size="lg" isDisabled={busy} onPress={onResume}>
            {t('resume')}
          </Button>
        </>
      }
    >
      <p className="text-body text-ink">{t('body', { source: label(current, groups), done, total })}</p>
    </Dialog>
  );
}
