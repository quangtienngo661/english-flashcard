import { useTranslations } from 'use-intl';
import { NAV_ICONS } from '../../app/nav-icons';
import type { NavEntry } from '../../app/nav';

/** The page for a menu item whose feature is outside Bước 2.5 (Figma `ComingSoon`, spec D23). */
export function ComingSoonPage({ item }: { item: NavEntry }) {
  const t = useTranslations();
  const Icon = NAV_ICONS[item.path];
  const id = item.labelKey.replace('nav.', '');
  const eta = item.plannedStep
    ? t(item.etaNote === 'unconfirmed' ? 'comingSoon.etaUnconfirmed' : 'comingSoon.eta', { step: item.plannedStep })
    : t(item.etaNote === 'apiReady' ? 'comingSoon.etaNoneApiReady' : 'comingSoon.etaNone');
  return (
    <section className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span aria-hidden className="flex items-center justify-center rounded-panel bg-primary-soft p-3 text-primary">
        {Icon && <Icon className="size-5" />}
      </span>
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{t('comingSoon.title')}</h2>
      <p className="max-w-prose text-ui text-muted">{t(`comingSoon.purpose.${id}`)}</p>
      <p className="text-xs text-muted">{eta}</p>
    </section>
  );
}
