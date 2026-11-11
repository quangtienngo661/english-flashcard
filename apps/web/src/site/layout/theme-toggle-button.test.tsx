// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/app-shell/theme/ThemeProvider';
import { THEME_STORAGE_KEY } from '@/app-shell/theme/theme';
import { ThemeToggleButton } from './ThemeToggle';

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

describe('ThemeToggleButton', () => {
  it('L1 a click stores dark and swaps its label to the light one', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggleButton toLight="Chuyển sang sáng" toDark="Chuyển sang tối" />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', { name: 'Chuyển sang tối' });
    await user.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Chuyển sang sáng' })).toBeInTheDocument();
  });
});
