import { useTranslations } from 'next-intl';

/** Figma "Logo" (3:14): "wordmet." in Bricolage ExtraBold, lower case, the full stop in the accent colour. App chrome and public pages. */
export function AppLogo() {
  const t = useTranslations('App.chrome');
  return (
    <span translate="no" aria-label={t('brand')} className="font-wm-display text-wm-logo text-wm-ink">
      <span aria-hidden>
        {t('brand').toLowerCase()}
        <span className="text-wm-accent">.</span>
      </span>
    </span>
  );
}
