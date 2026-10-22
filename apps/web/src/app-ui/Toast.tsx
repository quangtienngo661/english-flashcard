'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as AriaToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from 'react-aria-components';

// Copied from apps/admin/src/ui/Toast.tsx: the only file that touches React Aria's UNSTABLE_ toast.

export type ToastTone = 'neutral' | 'success' | 'danger';
export type ToastMessage = { text: string; tone: ToastTone };

/** One queue for the whole app, so a toast outlives the page that raised it. */
export const toastQueue = new AriaToastQueue<ToastMessage>({ maxVisibleToasts: 3 });

/** Confirms an action or reports a failure; closes itself after 5 s. */
export function showToast(text: string, tone: ToastTone = 'neutral'): void {
  toastQueue.add({ text, tone }, { timeout: 5000 });
}

const TONE: Record<ToastTone, string> = { neutral: 'bg-ink text-surface', success: 'bg-success text-surface', danger: 'bg-danger text-surface' };

export function ToastRegion() {
  const t = useTranslations('App.common');
  return (
    <AriaToastRegion queue={toastQueue} className="fixed inset-x-4 bottom-20 z-60 flex flex-col items-center gap-2 outline-none md:bottom-6">
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className={`flex max-w-lg items-center gap-4 rounded-inner px-4 py-3 text-ui shadow-toast outline-none focus-visible:ring-2 focus-visible:ring-accent motion-safe:animate-toast-in ${TONE[toast.content.tone]}`}
        >
          <AriaToastContent className="min-w-0 wrap-anywhere">
            <Text slot="title">{toast.content.text}</Text>
          </AriaToastContent>
          <Button slot="close" className="shrink-0 rounded-sm px-1 font-semibold text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {t('close')}
          </Button>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}
