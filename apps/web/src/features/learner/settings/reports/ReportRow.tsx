'use client';

import { useTranslations } from 'next-intl';
import { useFormat } from '@/app-shell/format';
import { cn } from '@/lib/cn';
import type { MyReport } from './reports-api';

const TONE = {
  open: { dot: 'bg-wm-accent', text: 'text-wm-accent' },
  confirmed: { dot: 'bg-wm-pass', text: 'text-wm-pass' },
  fixed: { dot: 'bg-wm-pass', text: 'text-wm-pass' },
  no_error: { dot: 'bg-wm-muted', text: 'text-wm-muted' },
} as const;
// raw-ok: Figma 211:5998 line 1 is Noto Sans SemiBold 15, between the button (15 medium) and base-strong (16)
const LINE_1 = 'font-wm-sans text-[0.9375rem] font-semibold leading-snug text-wm-ink';

const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase() + text.slice(1);

/**
 * A row of "Báo lỗi của tôi" (Figma 211:5998 / 211:6224): date (desktop), "<từ> · <lý do>", the question type with " · câu AI" or
 * " · Đã trả lại 1 lượt câu AI", the status with its dot. A confirmed AI report not refunded keeps its refund line. Not interactive.
 */
export function ReportRow({ report }: { report: MyReport }) {
  const t = useTranslations('App.practice.reports');
  const tTypes = useTranslations('App.practice.types');
  const format = useFormat();
  const word = report.lemma ?? t('unknownWord');
  const second = [
    report.question_type ? lowerFirst(tTypes(report.question_type)) : null,
    report.refunded === true ? t('refunded') : report.ai ? t('aiQuestion') : null,
  ].filter(Boolean).join(' · ');
  const refundLine = report.ai && report.status === 'confirmed' && report.refunded !== true
    ? t(report.refunded === null ? 'refunding' : 'notRefundable') : null;
  const tone = TONE[report.status];
  return (
    <li className="flex items-center gap-3 border-wm-line px-1 py-3 not-first:border-t md:gap-4 md:rounded-wm-lg md:px-3 md:py-4">
      <span className="hidden w-25 shrink-0 font-wm-mono text-wm-mono text-wm-muted md:block">{format.date(report.created_at, 'numeric')}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn(LINE_1, 'break-words')}>{`${word} · ${report.reason_label}`}</span>
        {second && <span className="break-words font-wm-mono text-wm-mono text-wm-muted md:font-wm-sans md:text-wm-small">{second}</span>}
        {refundLine && <span className="break-words font-wm-sans text-wm-caption text-wm-muted">{refundLine}</span>}
      </span>
      <span className={cn('flex shrink-0 items-center gap-1.5 font-wm-sans text-wm-small-strong md:w-32.5', tone.text)}>
        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', tone.dot)} />
        {t(`status.${report.status}`)}
      </span>
    </li>
  );
}
