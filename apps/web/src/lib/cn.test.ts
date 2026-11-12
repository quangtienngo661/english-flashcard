import { cn } from './cn';

// Design giao diện mới §7.1 (code facts S13): tailwind-merge must know the wm type sizes, or a size next to a colour is dropped.
describe('cn with wm tokens', () => {
  it('keeps a wm size next to a wm colour', () => {
    expect(cn('text-wm-base text-wm-ink')).toBe('text-wm-base text-wm-ink');
  });

  it('a later wm size replaces an earlier one', () => {
    expect(cn('text-wm-base text-wm-small')).toBe('text-wm-small');
  });

  it('a later wm shadow replaces an earlier one', () => {
    expect(cn('shadow-wm-card shadow-wm-pop')).toBe('shadow-wm-pop');
  });
});

// Kit §4: the title and site sizes were missing from the font-size group, so a text colour after them dropped the size.
describe('cn keeps every wm title size next to a colour', () => {
  it.each([
    'text-wm-card-heading-mobile',
    'text-wm-card-heading',
    'text-wm-page-title',
    'text-wm-page-title-mobile',
    'text-wm-app-title',
    'text-wm-app-title-mobile',
    'text-wm-site-hero',
    'text-wm-site-hero-mobile',
    'text-wm-site-section',
    'text-wm-site-section-mobile',
    'text-wm-site-page',
    'text-wm-site-page-mobile',
    'text-wm-site-doc-heading',
  ])('%s survives text-wm-ink', (size) => {
    expect(cn(`${size} text-wm-ink`)).toBe(`${size} text-wm-ink`);
  });
});
