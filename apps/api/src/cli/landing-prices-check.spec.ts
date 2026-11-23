import { describe, expect, it, vi } from 'vitest';
import { comparePrices, extractJsonLdPrices, runLandingPricesCheck } from './landing-prices-check.js';

function htmlWithJsonLd(prices: [number, number, number]): string {
  const data = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Wordmet', url: 'https://wordmet.com/vi', inLanguage: 'vi' },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Wordmet',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      description: 'Học từ vựng tiếng Anh',
      url: 'https://wordmet.com/vi',
      offers: [
        { '@type': 'Offer', name: 'Miễn phí', price: 0, priceCurrency: 'VND' },
        { '@type': 'Offer', name: 'Pro 1 tháng', price: prices[0], priceCurrency: 'VND' },
        { '@type': 'Offer', name: 'Pro 3 tháng', price: prices[1], priceCurrency: 'VND' },
        { '@type': 'Offer', name: 'Pro 12 tháng', price: prices[2], priceCurrency: 'VND' },
      ],
    },
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Wordmet', url: 'https://wordmet.com', logo: 'https://wordmet.com/icon.svg' },
  ];
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script></head><body></body></html>`;
}

describe('extractJsonLdPrices', () => {
  it('extracts the 1, 3, and 12 month paid offers from the JsonLd.tsx block', () => {
    const html = htmlWithJsonLd([59000, 199000, 599000]);
    expect(extractJsonLdPrices(html)).toEqual({ 1: 59000, 3: 199000, 12: 599000 });
  });

  it('returns null when the HTML has no JSON-LD block', () => {
    expect(extractJsonLdPrices('<!doctype html><html><body>no ld+json</body></html>')).toBeNull();
  });

  it('returns null when there are fewer than 3 paid offers', () => {
    const html = `<script type="application/ld+json">[{"offers":[{"price":0},{"price":59000}]}]</script>`;
    expect(extractJsonLdPrices(html)).toBeNull();
  });
});

describe('comparePrices', () => {
  it('lists only the months that differ', () => {
    expect(
      comparePrices(
        { 1: 59000, 3: 199000, 12: 599000 },
        { 1: 59000, 3: 149000, 12: 479000 },
      ),
    ).toEqual([
      { months: 3, landing: 199000, live: 149000 },
      { months: 12, landing: 599000, live: 479000 },
    ]);
  });

  it('returns an empty array when prices match', () => {
    expect(
      comparePrices(
        { 1: 59000, 3: 149000, 12: 479000 },
        { 1: 59000, 3: 149000, 12: 479000 },
      ),
    ).toEqual([]);
  });
});

describe('runLandingPricesCheck', () => {
  const liveBody = JSON.stringify({ currency: 'VND', prices: { '1': 59000, '3': 149000, '12': 479000 } });

  it('exits 4 when the landing fetch rejects', async () => {
    const out: string[] = [];
    const fetchStub = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/v1/public/prices')) return new Response(liveBody, { status: 200 });
      throw new Error('network down');
    });

    const code = await runLandingPricesCheck({
      fetchImpl: fetchStub as unknown as typeof fetch,
      write: (line) => out.push(line),
      env: {},
    });

    expect(code).toBe(4);
    expect(out.join('\n')).toMatch(/network down|landing/i);
  });

  it('exits 4 when landing returns 200 without JSON-LD prices', async () => {
    const out: string[] = [];
    const fetchStub = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/v1/public/prices')) return new Response(liveBody, { status: 200 });
      return new Response('<html><body>no json-ld</body></html>', { status: 200 });
    });

    const code = await runLandingPricesCheck({
      fetchImpl: fetchStub as unknown as typeof fetch,
      write: (line) => out.push(line),
      env: {},
    });

    expect(code).toBe(4);
    expect(out.join('\n')).toMatch(/json-ld/i);
  });

  it('exits 3 and prints mismatched prices when landing differs from live', async () => {
    const out: string[] = [];
    const fetchStub = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/v1/public/prices')) return new Response(liveBody, { status: 200 });
      return new Response(htmlWithJsonLd([59000, 199000, 599000]), { status: 200 });
    });

    const code = await runLandingPricesCheck({
      fetchImpl: fetchStub as unknown as typeof fetch,
      write: (line) => out.push(line),
      env: {},
    });

    expect(code).toBe(3);
    const text = out.join('\n');
    expect(text).toContain('199000');
    expect(text).toContain('149000');
  });

  it('exits 0 when landing and live prices match', async () => {
    const out: string[] = [];
    const fetchStub = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/v1/public/prices')) return new Response(liveBody, { status: 200 });
      return new Response(htmlWithJsonLd([59000, 149000, 479000]), { status: 200 });
    });

    const code = await runLandingPricesCheck({
      fetchImpl: fetchStub as unknown as typeof fetch,
      write: (line) => out.push(line),
      env: {},
    });

    expect(code).toBe(0);
  });
});
