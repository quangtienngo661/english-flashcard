import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe } from '../../auth/test-support';
import { ME_ADMIN, renderApp } from '../staff/test-utils';

const t = vi.uploads;
const item = (id: string, status: string, file = `${id}.csv`) => ({ id, status, file_name: file, row_count: 3200, created_at: '2026-10-14T09:30:00.000Z' });
const LIST = 'GET /v1/admin/content/uploads?page_size=20';

describe('uploads list', () => {
  it('renders the batches with their status; "Tải thêm" follows next_page_token', async () => {
    const r = renderApp('/uploads', {
      [LIST]: () => Response.json({ items: [item('b1', 'succeeded', 'cefr-j-1.5.csv'), item('b2', 'partial')], next_page_token: 'tok-2' }),
      'GET /v1/admin/content/uploads?page_size=20&page_token=tok-2': () => Response.json({ items: [item('b3', 'running', 'later.csv')], next_page_token: null }),
    });
    expect((await screen.findAllByText('cefr-j-1.5.csv')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(vi.status.succeeded).length).toBeGreaterThan(0);
    expect(screen.getAllByText(vi.status.partial).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    expect((await screen.findAllByText('later.csv')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(vi.status.running).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/content/uploads?page_size=20&page_token=tok-2')).toBe(1);
    expect(screen.queryByRole('button', { name: vi.common.loadMore })).toBeNull();
  });

  it('a file name is one wrapped value (long names stay inside the card)', async () => {
    const long = `${'x'.repeat(60)}.csv`;
    renderApp('/uploads', { [LIST]: () => Response.json({ items: [item('b1', 'failed', long)], next_page_token: null }) });
    expect((await screen.findAllByText(long)).length).toBeGreaterThan(0);
  });

  it('empty: names the empty state and points at "Upload CSV"', async () => {
    renderApp('/uploads', { [LIST]: () => Response.json({ items: [], next_page_token: null }) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('"Upload CSV" opens the form with its own page title', async () => {
    renderApp('/uploads', {
      [LIST]: () => Response.json({ items: [], next_page_token: null }),
      'GET /v1/admin/content/sources': () => Response.json({ items: [] }),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.upload }));
    expect(await screen.findByRole('heading', { level: 1, name: t.formTitle })).toBeInTheDocument();
  });

  it('an import-only user (no content.edit) sees the list but no "Upload CSV"', async () => {
    renderApp(
      '/uploads',
      { [LIST]: () => Response.json({ items: [item('b1', 'succeeded')], next_page_token: null }) },
      makeMe({ ...ME_ADMIN, staff_role: 'editor', permissions: ['content.import'] }),
    );
    await screen.findAllByText('b1.csv');
    await waitFor(() => expect(screen.queryByRole('button', { name: t.upload })).toBeNull());
  });
});
