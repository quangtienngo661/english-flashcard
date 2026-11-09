'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as AriaToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from 'react-aria-components';

// The only file that touches React Aria's UNSTABLE_ toast (moved from app-ui/Toast.tsx, which re-exports it until M8). New look:
// a pop-shadowed pill in mark-ink (navy in both themes), radius 16.

export type ToastTone = 'neutral' | 'success' | 'danger';
export type ToastMessage = { text: string; tone: ToastTone };

/** One queue for the whole app, so a toast outlives the page that raised it. */
export const toastQueue = new AriaToastQueue<ToastMessage>({
  maxVisibleToasts: 3,
  // React Aria's documented way to animate a toast out (react-aria.adobe.com/Toast): close it inside a view transition, styled in
  // globals.css. Adding one keeps its own toast-in; without View Transitions or with reduced motion it just disappears.
  wrapUpdate(fn, action) {
    if (action === 'add' || !('startViewTransition' in document) || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
      fn();
      return;
    }
    document.startViewTransition(() => flushSync(fn));
  },
});

/** Confirms an action or reports a failure; closes itself after 5 s. */
export function showToast(text: string, tone: ToastTone = 'neutral'): void {
  toastQueue.add({ text, tone }, { timeout: 5000 });
}

const TONE: Record<ToastTone, string> = {
  neutral: 'bg-wm-mark-ink text-wm-mark',
  success: 'bg-wm-pass text-wm-surface',
  danger: 'bg-wm-fail text-wm-surface',
};

export function ToastRegion() {
  const t = useTranslations('App.common');
  return (
    <AriaToastRegion queue={toastQueue} className="fixed inset-x-4 bottom-20 z-60 flex flex-col items-center gap-2 outline-none md:bottom-6">
      {({ toast }) => (
        <AriaToast
          toast={toast}
          // raw-ok: each toast needs its own view-transition name so only the closing one animates out
          style={{ viewTransitionName: toast.key } as CSSProperties}
          className={`flex max-w-lg items-center gap-4 rounded-wm-modal px-4 py-3 font-wm-sans text-wm-small shadow-wm-pop outline-none [view-transition-class:toast] focus-visible:outline-3 focus-visible:outline-wm-mark motion-safe:animate-toast-in ${TONE[toast.content.tone]}`}
        >
          <AriaToastContent className="min-w-0 wrap-anywhere">
            <Text slot="title">{toast.content.text}</Text>
          </AriaToastContent>
          <Button slot="close" className="shrink-0 rounded-wm-sm px-1 font-semibold outline-none focus-visible:outline-3 focus-visible:outline-wm-mark">
            {t('close')}
          </Button>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}
