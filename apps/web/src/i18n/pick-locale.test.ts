import { pickLocale, readCountry } from './pick-locale';

describe('pickLocale', () => {
  it('LP4 country VN without cookie → vi', () => {
    expect(pickLocale({ country: 'VN', acceptLanguage: 'en-US,en;q=0.9' })).toBe('vi');
  });

  it('LP5 cookie en beats country VN', () => {
    expect(pickLocale({ cookie: 'en', country: 'VN', acceptLanguage: 'vi-VN' })).toBe('en');
  });

  it('LP6 Accept-Language vi-VN without country → vi', () => {
    expect(pickLocale({ acceptLanguage: 'vi-VN,vi;q=0.9,en;q=0.8' })).toBe('vi');
  });

  it('LP7 Accept-Language en-US without country → en', () => {
    expect(pickLocale({ acceptLanguage: 'en-US,en;q=0.9' })).toBe('en');
  });

  it('LP6 a vi range with q=0 is not accepted', () => {
    expect(pickLocale({ acceptLanguage: 'vi;q=0, en' })).toBe('en');
  });

  it('LPE2 cookie fr is ignored', () => {
    expect(pickLocale({ cookie: 'fr', country: 'VN' })).toBe('vi');
  });

  it('no signals → en', () => {
    expect(pickLocale({})).toBe('en');
  });
});

describe('readCountry', () => {
  it('LPE1 country XX/T1/empty is ignored', () => {
    for (const value of ['XX', 'T1', '', '  ']) {
      expect(readCountry(new Headers({ 'x-vercel-ip-country': value }))).toBeNull();
    }
    expect(readCountry(new Headers())).toBeNull();
  });

  it('LPE3 x-vercel-ip-country wins over cf-ipcountry', () => {
    expect(readCountry(new Headers({ 'x-vercel-ip-country': 'US', 'cf-ipcountry': 'VN' }))).toBe('US');
    expect(readCountry(new Headers({ 'cf-ipcountry': 'vn' }))).toBe('VN');
  });
});
