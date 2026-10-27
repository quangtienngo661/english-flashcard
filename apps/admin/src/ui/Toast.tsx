import {
  Button,
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as AriaToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from 'react-aria-components';
import { useTranslations } from 'use-intl';

/*
 * The only file that touches React Aria's toast, still marked UNSTABLE_ in 1.22.1: if its API changes, only this file
 * changes (design §6.2, UB12). React Aria's toast has no entering/exiting state, so a toast slides in with a keyframe on
 * mount and disappears at once (UB23).
 */

export type ToastAction = { label: string; onPress: () => void };
export type ToastMessage = { text: string; action?: ToastAction };

/** One queue for the whole app, so a toast outlives the page that raised it (Review Focus 4). */
export const toastQueue = new AriaToastQueue<ToastMessage>({ maxVisibleToasts: 3 });

/** Confirms an action; closes itself after 5 s (design §6.2). */
export function showToast(text: string, action?: ToastAction): void {
  toastQueue.add({ text, action }, { timeout: 5000 });
}

export function ToastRegion() {
  const t = useTranslations();
  return (
    <AriaToastRegion queue={toastQueue} className="fixed inset-x-4 bottom-5 z-60 flex flex-col items-center gap-2 outline-none">
      {({ toast }) => (
        <AriaToast
          toast={toast}
          className="flex max-w-120 items-center gap-4 rounded-inner bg-ink px-4 py-3 text-ui text-on-primary shadow-toast outline-none focus-visible:ring-2 focus-visible:ring-accent motion-safe:animate-toast-in"
        >
          <AriaToastContent className="min-w-0 wrap-anywhere">
            <Text slot="title">{toast.content.text}</Text>
          </AriaToastContent>
          {toast.content.action && (
            <Button
              className="shrink-0 rounded-sm px-1 font-semibold text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
              onPress={() => {
                toast.content.action?.onPress();
                toastQueue.close(toast.key);
              }}
            >
              {toast.content.action.label}
            </Button>
          )}
          <Button
            slot="close"
            aria-label={t('common.close')}
            className="shrink-0 rounded-sm px-1 font-semibold text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t('common.close')}
          </Button>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}
