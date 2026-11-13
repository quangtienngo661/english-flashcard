'use client';

import { useTranslations } from 'next-intl';

/**
 * QA5: "Đang xác minh…" above a submit button that waits for the bot check's token, the one reason the button is off. The live region
 * stays in the page, empty and hidden, so the line is read when it fills.
 */
export function CaptchaPending({ show }: { show: boolean }) {
  const t = useTranslations('App.auth');
  return (
    <p role="status" className="font-wm-sans text-wm-caption text-wm-muted empty:hidden">
      {show ? t('captchaPending') : null}
    </p>
  );
}
