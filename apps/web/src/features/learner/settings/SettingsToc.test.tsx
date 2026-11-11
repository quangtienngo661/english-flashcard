// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import vi_ from '../../../../messages/vi.json';
import { currentSection, SettingsToc } from './SettingsToc';

const IDS = ['personal', 'plan', 'learning', 'notifications', 'shortcuts', 'account'];

describe('currentSection (which Mục lục entry is marked)', () => {
  it('top of the page: the first section inside the band', () => {
    expect(currentSection(IDS, new Set(['personal', 'plan']), false, null)).toBe('personal');
  });

  it('middle of the page: the first section inside the band', () => {
    expect(currentSection(IDS, new Set(['notifications', 'learning']), false, null)).toBe('learning');
  });

  it('bottom of the page with two sections inside the band: the last section', () => {
    expect(currentSection(IDS, new Set(['shortcuts', 'account']), true, null)).toBe('account');
  });

  it('after a click, until its scroll ends: the clicked section, whatever is inside the band', () => {
    expect(currentSection(IDS, new Set(['shortcuts', 'account']), true, 'notifications')).toBe('notifications');
    expect(currentSection(IDS, new Set(['personal']), false, 'account')).toBe('account');
  });

  it('nothing inside the band and not at the bottom: no change (null)', () => {
    expect(currentSection(IDS, new Set(), false, null)).toBeNull();
  });
});

describe('SettingsToc with a scrolling page (IntersectionObserver stubbed)', () => {
  let callback: IntersectionObserverCallback | null = null;
  const original = window.IntersectionObserver;

  beforeEach(() => {
    window.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as never;
    // A 2000 px page in a 900 px window.
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 2000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
    scrollTo(0);
  });
  afterEach(() => {
    window.IntersectionObserver = original;
    callback = null;
  });

  function scrollTo(y: number) {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
  }
  function inBand(ids: string[]) {
    const records = IDS.map((id) => ({ target: document.getElementById(id), isIntersecting: ids.includes(id) }) as unknown as IntersectionObserverEntry);
    act(() => callback?.(records, {} as IntersectionObserver));
  }
  function setup() {
    render(
      <NextIntlClientProvider locale="vi" messages={{ App: vi_.App }}>
        <SettingsToc entries={IDS.map((id) => ({ id, title: id === 'account' ? 'Tài khoản' : id === 'shortcuts' ? 'Phím tắt' : id }))} />
        {IDS.map((id) => (
          <section key={id} id={id}>
            <h2 id={`${id}-title`} tabIndex={-1}>
              {id}
            </h2>
          </section>
        ))}
      </NextIntlClientProvider>,
    );
    return within(screen.getByRole('navigation', { name: 'Mục lục' }));
  }

  it('scrolled to the bottom with "Phím tắt" and "Tài khoản" both in the band: "Tài khoản" is marked', () => {
    const toc = setup();
    scrollTo(1100);
    inBand(['shortcuts', 'account']);
    expect(toc.getByRole('link', { name: 'Tài khoản' })).toHaveAttribute('aria-current', 'true');
    expect(toc.getByRole('link', { name: 'Phím tắt' })).not.toHaveAttribute('aria-current');
  });

  it('pressing "Tài khoản": its scroll passing "Phím tắt" does not move the mark; the scroll ending keeps it', async () => {
    const toc = setup();
    await userEvent.click(toc.getByRole('link', { name: 'Tài khoản' }));
    scrollTo(700);
    inBand(['shortcuts']);
    expect(toc.getByRole('link', { name: 'Tài khoản' })).toHaveAttribute('aria-current', 'true');
    scrollTo(1100);
    act(() => {
      window.dispatchEvent(new Event('scrollend'));
    });
    inBand(['shortcuts', 'account']);
    expect(toc.getByRole('link', { name: 'Tài khoản' })).toHaveAttribute('aria-current', 'true');
  });

  it('after the clicked scroll has ended, scrolling back up marks the section in the band again', async () => {
    const toc = setup();
    await userEvent.click(toc.getByRole('link', { name: 'Tài khoản' }));
    act(() => {
      window.dispatchEvent(new Event('scrollend'));
    });
    scrollTo(300);
    inBand(['plan', 'learning']);
    expect(toc.getByRole('link', { name: 'plan' })).toHaveAttribute('aria-current', 'true');
  });
});
