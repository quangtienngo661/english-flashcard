import { lighthouseArgs, summarise } from './lighthouse.mjs';

describe('lighthouse summarise', () => {
  it('turns scores into rounded percentages', () => {
    const r = summarise({
      categories: {
        performance: { score: 0.915 },
        accessibility: { score: 1 },
        'best-practices': { score: 0.5 },
        seo: { score: 0 },
      },
    });
    expect(r).toEqual({ performance: 92, accessibility: 100, bestPractices: 50, seo: 0 });
  });

  it('gives null for a null score and for a missing category', () => {
    const r = summarise({ categories: { performance: { score: null }, accessibility: { score: 0.9 }, 'best-practices': { score: 0.8 } } });
    expect(r).toEqual({ performance: null, accessibility: 90, bestPractices: 80, seo: null });
  });
});

describe('lighthouse command line', () => {
  it('builds the mobile run, which is the Lighthouse default', () => {
    expect(lighthouseArgs('http://localhost:3001/vi', '.lighthouse/vi-mobile', 'mobile')).toEqual([
      'dlx', 'lighthouse@13.6.0', 'http://localhost:3001/vi',
      '--output=json', '--output=html', '--output-path=.lighthouse/vi-mobile',
      '--chrome-flags=--headless=new', '--quiet',
    ]);
  });

  it('adds the desktop preset for the desktop run', () => {
    expect(lighthouseArgs('http://localhost:3001/vi/privacy', '.lighthouse/vi-privacy-desktop', 'desktop')).toContain('--preset=desktop');
  });
});
