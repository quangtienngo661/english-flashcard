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
