import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import vi from '../../messages/vi.json';
import { configRoutes } from '../features/ai/configs/config-test-support';
import { judgeRoutes } from '../features/ai/judges/judge-test-support';
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

  // M2-T11: the Thao tác and Prompt pages became one "Cấu hình" page; old links and bookmarks keep the operation.
  it.each(['/ai/prompts', '/ai/operations'])('%s?op=lookup_word lands on /ai/configs?op=lookup_word, titled "Cấu hình"', async (old) => {
    const r = renderApp(`${old}?op=lookup_word`, { ...handlers, ...configRoutes({}, 'lookup_word') });
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/configs'));
    expect(r.router.state.location.search).toBe('?op=lookup_word');
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.aiConfigs }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /^Bản đang chạy/ }, { timeout: 5000 })).toBeInTheDocument();
  });

  it.each(['/ai/prompts', '/ai/operations'])('%s with no op lands on /ai/configs with no query', async (old) => {
    const r = renderApp(old, { ...handlers, ...configRoutes() });
    await waitFor(() => expect(r.router.state.location.pathname).toBe('/ai/configs'));
    expect(r.router.state.location.search).toBe('');
  });

  it('/ai/judges opens the Judge page, titled "Judge"', async () => {
    renderApp('/ai/judges', { ...handlers, ...judgeRoutes() });
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.aiJudges }, { timeout: 5000 })).toBeInTheDocument();
    expect((await screen.findAllByText('Chỉ một đáp án · bản 1', undefined, { timeout: 5000 })).length).toBeGreaterThan(0);
  });

  it('/ai/judges/label opens the label screen under the Judge title', async () => {
    renderApp('/ai/judges/label', { ...handlers, ...judgeRoutes() });
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.aiJudges }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText(vi.ai.judges.label.missing, undefined, { timeout: 5000 })).toBeInTheDocument();
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
