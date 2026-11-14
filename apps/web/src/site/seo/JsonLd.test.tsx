import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Design §11, M8.8: offers in VND with the prices the build read (the same numbers as the pricing section), plus an Organization.
async function load() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://wordmet.com');
  return (await import('./JsonLd')).JsonLd;
}

afterEach(() => vi.unstubAllEnvs());

const PRICES = { '1': 79000, '3': 199000, '12': 599000 };

function payload(html: string) {
  const match = html.match(/^<script type="application\/ld\+json">(.*)<\/script>$/s);
  expect(match, html).not.toBeNull();
  return { raw: match![1]!, data: JSON.parse(match![1]!) as Array<Record<string, unknown>> };
}

describe('JsonLd', () => {
  it('describes the site, the app with a free offer and three Pro offers in VND, and the organisation', async () => {
    const JsonLd = await load();
    const { data } = payload(renderToStaticMarkup(<JsonLd locale="vi" description="Ôn thẻ theo lịch." prices={PRICES} />));
    expect(data).toEqual([
      { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Wordmet', url: 'https://wordmet.com/vi', inLanguage: 'vi' },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Wordmet',
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        description: 'Ôn thẻ theo lịch.',
        url: 'https://wordmet.com/vi',
        offers: [
          { '@type': 'Offer', name: 'Miễn phí', price: 0, priceCurrency: 'VND' },
          { '@type': 'Offer', name: 'Pro 1 tháng', price: 79000, priceCurrency: 'VND' },
          { '@type': 'Offer', name: 'Pro 3 tháng', price: 199000, priceCurrency: 'VND' },
          { '@type': 'Offer', name: 'Pro 12 tháng', price: 599000, priceCurrency: 'VND' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Wordmet',
        url: 'https://wordmet.com',
        logo: 'https://wordmet.com/icon.svg',
      },
    ]);
  });

  it('names the offers in English on /en and points at the English page', async () => {
    const JsonLd = await load();
    const { data } = payload(renderToStaticMarkup(<JsonLd locale="en" description="Review cards on a schedule." prices={PRICES} />));
    expect(data[0]).toMatchObject({ url: 'https://wordmet.com/en', inLanguage: 'en' });
    const offers = (data[1] as { url: string; offers: Array<{ name: string; price: number }> });
    expect(offers.url).toBe('https://wordmet.com/en');
    expect(offers.offers.map((offer) => [offer.name, offer.price])).toEqual([
      ['Free', 0],
      ['Pro 1 month', 79000],
      ['Pro 3 months', 199000],
      ['Pro 12 months', 599000],
    ]);
  });

  it('follows the prices it is given (an admin changed them before the build)', async () => {
    const JsonLd = await load();
    const { data } = payload(renderToStaticMarkup(<JsonLd locale="vi" description="d" prices={{ '1': 89000, '3': 240000, '12': 699000 }} />));
    const offers = (data[1] as { offers: Array<{ price: number }> }).offers;
    expect(offers.map((offer) => offer.price)).toEqual([0, 89000, 240000, 699000]);
  });

  it('escapes < so the description cannot close the script tag', async () => {
    const JsonLd = await load();
    const { raw, data } = payload(renderToStaticMarkup(<JsonLd locale="vi" description="</script><b>x" prices={PRICES} />));
    expect(raw).not.toContain('<');
    expect(raw).toContain('\\u003c/script>');
    expect((data[1] as { description: string }).description).toBe('</script><b>x');
  });
});
