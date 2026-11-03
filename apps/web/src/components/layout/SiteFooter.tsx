import { Logo } from '@/app-chrome/Logo';
import { Container } from '@/components/ui/Container';
import type { AppLocale } from '@/i18n/routing';
import { site } from '@/lib/site';

// The Terms and Privacy links were hidden until launch (owner, 09/10/2026); shown since 04/11/2026 (owner), now that the pages carry the text an
// admin publishes. No language link while the English landing is out of scope (design landing-redesign L4).
export function SiteFooter({
  copy,
  locale,
}: {
  copy: { plans: string; faq: string; contact: string; terms: string; privacy: string; copyright: string };
  locale: AppLocale;
}) {
  const link =
    'inline-flex min-h-11 items-center text-small font-medium text-muted underline-offset-4 transition-colors duration-fast hover:text-ink hover:underline';
  return (
    <footer className="bg-surface">
      <Container className="flex flex-col gap-5 py-8 md:py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Logo tone="surface" />
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <a href={`/${locale}#goi`} className={link}>
                {copy.plans}
              </a>
            </li>
            <li>
              <a href={`/${locale}#hoi-dap`} className={link}>
                {copy.faq}
              </a>
            </li>
            <li>
              <a href={`/${locale}/terms`} className={link}>
                {copy.terms}
              </a>
            </li>
            <li>
              <a href={`/${locale}/privacy`} className={link}>
                {copy.privacy}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.contactEmail}`} className={link}>
                {copy.contact}
              </a>
            </li>
          </ul>
        </div>
        <p className="text-small text-muted">{copy.copyright}</p>
      </Container>
    </footer>
  );
}
