import { getLocale, getTranslations } from 'next-intl/server';
import { Container } from '@/components/ui/Container';
import { site } from '@/lib/site';

export async function PrivacyPolicy() {
  const locale = await getLocale();
  const legal = await getTranslations('Legal');
  const privacy = await getTranslations('Legal.privacy');

  return (
    <Container className="flex flex-col gap-4 py-16 md:py-24">
      <h1 className="text-h2 font-extrabold text-ink">{legal('privacyTitle')}</h1>
      <p className="text-small text-muted">{privacy('effective', { date: locale === 'vi' ? '08/10/2026' : '8 October 2026' })}</p>
      <p className="max-w-prose text-subtitle text-muted">{privacy('intro')}</p>
      <section className="flex max-w-prose flex-col gap-2">
        <h2 className="text-h3 font-bold text-ink">{privacy('collectTitle')}</h2>
        <p className="text-body text-muted">{privacy('collectBody')}</p>
      </section>
      <section className="flex max-w-prose flex-col gap-2">
        <h2 className="text-h3 font-bold text-ink">{privacy('useTitle')}</h2>
        <p className="text-body text-muted">{privacy('useBody')}</p>
      </section>
      <section className="flex max-w-prose flex-col gap-2">
        <h2 className="text-h3 font-bold text-ink">{privacy('storeTitle')}</h2>
        <p className="text-body text-muted">{privacy('storeBody')}</p>
      </section>
      <section className="flex max-w-prose flex-col gap-2">
        <h2 className="text-h3 font-bold text-ink">{privacy('deleteTitle')}</h2>
        <p className="text-body text-muted">
          {privacy.rich('deleteBody', {
            email: site.contactEmail,
            link: (chunks) => (
              <a href={`mailto:${site.contactEmail}`} className="font-semibold underline underline-offset-2">
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
      <section className="flex max-w-prose flex-col gap-2">
        <h2 className="text-h3 font-bold text-ink">{privacy('changesTitle')}</h2>
        <p className="text-body text-muted">{privacy('changesBody')}</p>
      </section>
    </Container>
  );
}
