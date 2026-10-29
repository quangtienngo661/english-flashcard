import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { problem } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import { URL, configEvent, configRoutes, configsView, draftView } from './config-test-support';

const t = vi.ai.configs.history;
const EVENTS = [
  configEvent({ id: 'ev3', kind: 'publish', config: { id: 'C5', number: 5, model_id: null }, from_config: { id: 'C4', number: 4, model_id: 'fake:ok' } }),
  configEvent({ id: 'ev2', kind: 'rollback', config: { id: 'C3', number: 3, model_id: 'fake:ok' }, from_config: { id: 'C4', number: 4, model_id: 'fake:ok' } }),
  configEvent({ id: 'ev1', kind: 'publish' }),
];
const rows = () => within(screen.getByRole('list', { name: t.title })).getAllByRole('listitem');

describe('ConfigHistory (M2-T7)', () => {
  it('lists publishes, rollbacks and turn-offs, newest first, with who did it and when', async () => {
    renderApp('/ai/configs', configRoutes({ [URL.history()]: () => Response.json({ items: EVENTS, next_page_token: null }) }));
    await screen.findByRole('list', { name: t.title }, { timeout: 4000 });
    expect(rows()).toHaveLength(3);
    expect(rows()[0]).toHaveTextContent(t.turnOff.replace('{number}', '5').replace('{from}', '4'));
    expect(rows()[1]).toHaveTextContent(t.rollback.replace('{number}', '3'));
    expect(rows()[2]).toHaveTextContent(t.publish.replace('{number}', '4').replace('{from}', '3'));
    expect(rows()[2]).toHaveTextContent('15/10/2026 09:12 · lan@wordmet.com');
    // A turn-off is not also read as a plain publish.
    expect(rows()[0]).not.toHaveTextContent(t.publish.replace('{number}', '5').replace('{from}', '4'));
  });

  it('an empty history says so', async () => {
    renderApp('/ai/configs', configRoutes());
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('"Tải thêm" reads the next page with its token', async () => {
    const r = renderApp('/ai/configs', configRoutes({
      [URL.history()]: () => Response.json({ items: [EVENTS[0]], next_page_token: 'next-1' }),
      'GET /v1/admin/ai/configs/generate_cloze/history?page_size=20&page_token=next-1': () => Response.json({ items: [EVENTS[2]], next_page_token: null }),
    }));
    await screen.findByRole('list', { name: t.title }, { timeout: 4000 });
    expect(rows()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(r.calls.filter((c) => c.path.includes('/history') && c.path.includes('page_token=next-1'))).toHaveLength(1);
  });

  it('"Tạo nháp từ bản này" posts { from_config_id } of that row and opens the draft', async () => {
    let created = false;
    const r = renderApp('/ai/configs', configRoutes({
      [URL.history()]: () => Response.json({ items: EVENTS, next_page_token: null }),
      [URL.configs()]: () => Response.json(configsView({ draft: created ? draftView({ id: 'C6', number: 6 }) : null })),
      [URL.createDraft()]: () => {
        created = true;
        return Response.json(draftView({ id: 'C6', number: 6 }), { status: 201 });
      },
    }));
    await screen.findByRole('list', { name: t.title }, { timeout: 4000 });
    await userEvent.click(within(rows()[1]!).getByRole('button', { name: t.fromHere }));
    expect(await screen.findByRole('heading', { name: /^Nháp · cấu hình 6/ })).toBeInTheDocument();
    const sent = r.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/draft'));
    expect(sent.map((c) => c.body)).toEqual([{ from_config_id: 'C3' }]);
    expect(within(screen.getByRole('list', { name: t.title })).queryByRole('button', { name: t.fromHere })).not.toBeInTheDocument();
  });

  it('while a draft exists no row offers "Tạo nháp từ bản này"', async () => {
    renderApp('/ai/configs', configRoutes({
      [URL.history()]: () => Response.json({ items: EVENTS, next_page_token: null }),
      [URL.configs()]: () => Response.json(configsView({ draft: draftView() })),
    }));
    await screen.findByRole('list', { name: t.title }, { timeout: 4000 });
    expect(screen.queryByRole('button', { name: t.fromHere })).not.toBeInTheDocument();
  });

  it('409 draft-exists shows its sentence and reads the configs again', async () => {
    const r = renderApp('/ai/configs', configRoutes({
      [URL.history()]: () => Response.json({ items: EVENTS, next_page_token: null }),
      [URL.createDraft()]: () => problem(409, 'draft-exists'),
    }));
    await screen.findByRole('list', { name: t.title }, { timeout: 4000 });
    await userEvent.click(within(rows()[0]!).getByRole('button', { name: t.fromHere }));
    expect(await screen.findByText(vi.errors['draft-exists'])).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/ai/configs/generate_cloze')).toBeGreaterThanOrEqual(2));
  });
});
