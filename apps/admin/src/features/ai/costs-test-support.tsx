import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { IntlProvider, useTranslations } from 'use-intl';
import vi from '../../../messages/vi.json';
import en from '../../../messages/en.json';
import { ShellSlotsContext } from '../../app/shell-slots';
import { SessionProvider, useSession } from '../../auth/session-context';
import { SessionStore } from '../../auth/session-store';
import { BASE, makeFetch, makeMe, tokenResponse, type Route } from '../../auth/test-support';
import { AiCostsPage } from './AiCostsPage';

function CostsTestPage() {
  const [panel, setPanel] = useState<HTMLElement | null>(null);
  const { state } = useSession();
  const t = useTranslations();
  if (state.status !== 'signed-in') return null;
  return <ShellSlotsContext.Provider value={{ actions: null, panel }}><h1>{t('nav.aiCosts')}</h1><AiCostsPage /><div ref={setPanel} /></ShellSlotsContext.Provider>;
}

/** Isolated costs routes with real merged messages; unrelated workspaces need not finish importing first. */
export function renderCosts(path: string, routes: Record<string, Route>, locale: 'vi' | 'en' = 'vi') {
  const base = locale === 'vi' ? vi : en;
  const f = makeFetch({
    'POST /v1/auth/refresh': () => tokenResponse('tok-1'),
    'GET /v1/me': () => Response.json(makeMe({ staff_role: 'admin', permissions: ['settings.manage', 'ai.view'] })),
    ...routes,
  });
  const store = new SessionStore({ baseUrl: BASE, fetch: f.fetch, channel: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/ai/costs', element: <CostsTestPage /> }], { initialEntries: [path] });
  const utils = render(
    <IntlProvider locale={locale} messages={base} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}><SessionProvider store={store}><RouterProvider router={router} /></SessionProvider></QueryClientProvider>
    </IntlProvider>
  );
  return { ...f, ...utils, client, store, router };
}

export const BATCH_ID = '11111111-1111-4111-8111-111111111111';
export const SOURCE_ID = '22222222-2222-4222-8222-222222222222';
export const CONFIG_ID = '33333333-3333-4333-8333-333333333333';
export const batchRow = (over = {}) => ({
  id: BATCH_ID, kind: 'eval', operation: 'generate_cloze', status: 'finished',
  config_id: CONFIG_ID, config_version: 3, fingerprint: 'a'.repeat(64), source_id: SOURCE_ID, parent_id: null,
  model: 'fake:batch-model', provider: 'fake', total: 10, done: 10,
  started_by_user: { id: 'me-1', email: 'admin@wordmet.com' }, created_at: '2026-11-01T02:00:00Z',
  started_at: '2026-11-01T02:00:01Z', finished_at: '2026-11-01T02:01:00Z',
  cost_usd: '0.01230000', known_cost_usd: '0.01230000', unknown_cost_calls: 0, calls: 12, retries: 2,
  input_tokens: 1200, cached_input_tokens: 300, output_tokens: 800, reasoning_tokens: 50,
  ...over,
});
