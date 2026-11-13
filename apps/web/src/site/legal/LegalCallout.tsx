import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { site } from '@/lib/site';
import { ButtonLink } from '@/ui/ButtonLink';
import { CALLOUT_TITLE } from './styles';

/**
 * "Hỏi về dữ liệu" (`14:350` Chính sách, `15:342` Điều khoản): the last block of the article, on `--accent-soft`, with the support
 * address as a primary button. Figma draws it on desktop only; it shows on a phone too (plan M8.7), stacked.
 */
export function LegalCallout({ kind }: { kind: 'privacy' | 'terms' }) {
  const t = useTranslations('Legal');
  const titleId = `${kind}-help-title`;
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col items-start gap-4 rounded-wm-card bg-wm-accent-soft px-5 py-5 md:flex-row md:items-center md:gap-6 md:px-7 md:py-6"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={titleId} className={CALLOUT_TITLE}>
          {t(kind === 'privacy' ? 'privacyHelpTitle' : 'termsHelpTitle')}
        </h2>
        <p className="font-wm-sans text-wm-small text-wm-muted">{t(kind === 'privacy' ? 'privacyHelpBody' : 'termsHelpBody')}</p>
      </div>
      <ButtonLink reload variant="primary" href={`mailto:${site.supportEmail}`}>
        {site.supportEmail}
        <ArrowRight aria-hidden className="size-4" />
      </ButtonLink>
    </section>
  );
}
