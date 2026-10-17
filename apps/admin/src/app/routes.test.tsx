import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import vi from '../../messages/vi.json';
import { LIST_URL, renderApp, row } from '../features/staff/test-utils';
import { NAV } from './nav';

const handlers = {
  [LIST_URL]: () => Response.json({ items: [row({ id: 'me-1', email: 'admin@wordmet.com', staff_role: 'admin' })], next_page_token: null }),
  'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }),
};

describe('routes', () => {
  it('/ goes to /uploads (the topbar names the Lô nhập page)', async () => {
    renderApp('/', handlers);
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.uploads }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('every unavailable path renders ComingSoonPage', { timeout: 60_000 }, async () => {
    for (const entry of NAV.filter((n) => !n.available)) {
      const { unmount } = renderApp(entry.path, handlers);
      expect(await screen.findByText(vi.comingSoon.title, undefined, { timeout: 5000 }), entry.path).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav[entry.labelKey.replace('nav.', '') as keyof typeof vi.nav] as string);
      unmount();
    }
  });
});
