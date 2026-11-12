// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { THEME_STORAGE_KEY } from './theme';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { choice, resolved, setChoice } = useTheme();
  return (
    <button type="button" onClick={() => setChoice('dark')}>
      {choice}/{resolved}
    </button>
  );
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

function osPrefersDark(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: dark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

describe('ThemeProvider browser bar', () => {
  const bars = () => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content);
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1220"><meta name="theme-color" content="#f6f7fa">';
  });
  afterEach(() => {
    document.head.innerHTML = '';
  });
  const mount = () =>
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

  it('stored dark with a light OS paints both bars dark', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    osPrefersDark(false);
    mount();
    expect(bars()).toEqual(['#0f1220', '#0f1220']);
  });

  it('stored light with a dark OS paints both bars light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    osPrefersDark(true);
    mount();
    expect(bars()).toEqual(['#f6f7fa', '#f6f7fa']);
  });

  it('system follows the OS', () => {
    osPrefersDark(true);
    mount();
    expect(bars()).toEqual(['#0f1220', '#0f1220']);
  });

  it('repaints metas that Next re-renders after a client navigation', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    osPrefersDark(false);
    mount();
    document.head.innerHTML =
      '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f1220"><meta name="theme-color" content="#f6f7fa">';
    await waitFor(() => expect(bars()).toEqual(['#0f1220', '#0f1220']));
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#f6f7fa';
    document.head.appendChild(meta);
    await waitFor(() => expect(bars()).toEqual(['#0f1220', '#0f1220', '#0f1220']));
  });

  it('leaving the provider restores each bar to its server value by media', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    osPrefersDark(false);
    const { unmount } = mount();
    expect(bars()).toEqual(['#0f1220', '#0f1220']);
    unmount();
    expect(bars()).toEqual(['#0f1220', '#f6f7fa']);
  });
});

describe('ThemeProvider', () => {
  it('setChoice stores the choice and themes <html>', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button')).toHaveTextContent('dark/dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('E22: follows a change made in another tab', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    act(() => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      window.dispatchEvent(new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'dark' }));
    });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('leaving the app takes data-theme off <html>, so the landing is never themed', () => {
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    unmount();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
