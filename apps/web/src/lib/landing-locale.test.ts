import { buildMetadata } from './metadata';
import { LANDING_LOCALES, landingLocaleRedirect } from './landing-locale';
import sitemap from '../app/sitemap';

describe('landingLocaleRedirect (design landing-redesign L4, D2)', () => {
  it('LR21 sends the English home to the Vietnamese one, with or without a trailing slash', () => {
    expect(landingLocaleRedirect('/en')).toBe('/vi');
    expect(landingLocaleRedirect('/en/')).toBe('/vi');
  });

  it('D2 leaves the English app and the legal pages alone', () => {
    for (const path of ['/en/app', '/en/app/login', '/en/privacy', '/en/terms']) expect(landingLocaleRedirect(path)).toBeNull();
  });

  it('leaves the Vietnamese home, the root and unknown paths alone', () => {
    for (const path of ['/vi', '/', '/fr', '/vi/privacy']) expect(landingLocaleRedirect(path)).toBeNull();
  });

  it('only Vietnamese has a landing for now', () => {
    expect(LANDING_LOCALES).toEqual(['vi']);
  });
});

describe('landing metadata and sitemap advertise only the Vietnamese landing', () => {
  it('hreflang lists vi and x-default and no English alternate', () => {
    const meta = buildMetadata('vi', { title: 'Wordmet', description: 'd' });
    expect(meta.alternates?.languages).toEqual({ vi: '/vi', 'x-default': '/' });
    expect(meta.openGraph).not.toHaveProperty('alternateLocale');
  });

  it('the sitemap has /vi alone', () => {
    expect(sitemap().map((entry) => new URL(entry.url).pathname)).toEqual(['/vi']);
  });
});
