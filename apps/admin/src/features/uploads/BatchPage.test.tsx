import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { ME_ADMIN, renderApp } from '../staff/test-utils';

const saveBlob = vitest.hoisted(() => vitest.fn());
vitest.mock('../../api/download', () => ({ saveBlob }));

const t = vi.batch;
const BATCH = 'GET /v1/admin/content/uploads/b1';
const REVERT = 'POST /v1/admin/content/uploads/b1/revert';
const PUBLISH = 'POST /v1/admin/content/senses/publish-jobs';
const batch = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  status: 'succeeded',
  file_name: 'cefr-j-1.5.csv',
  row_count: 3200,
  counters: { processed: 3200, created: 2400, updated: 500, unchanged: 212, rejected: 88 },
  warnings: ['Dòng 12: bỏ dấu đã rà', 'Dòng 37: bỏ chủ đề đã ẩn'],
  created_at: '2026-10-14T09:30:00.000Z',
  started_at: '2026-10-14T09:30:05.000Z',
  finished_at: '2026-10-14T09:32:00.000Z',
  reverted: false,
  ...over,
});
const json = (body: unknown, status = 200) => Response.json(body, { status });
const posts = (calls: Call[], path: string) => calls.filter((c) => c.method === 'POST' && c.path === path);

beforeEach(() => saveBlob.mockClear());

describe('batch page', () => {
  it('a finished batch: name, status, the five counters, rejected sentence and warnings', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch()) });
    expect(await screen.findByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' })).toBeInTheDocument();
    expect(screen.getByText(vi.status.succeeded)).toBeInTheDocument();
    for (const n of ['3.200', '2.400', '500', '212', '88']) expect(screen.getAllByText(n).length).toBeGreaterThan(0);
    expect(screen.getByText(/88 dòng bị loại/)).toBeInTheDocument();
    expect(screen.getByText('Cảnh báo (2)')).toBeInTheDocument();
    expect(screen.getByText(/Dòng 37/)).toBeInTheDocument();
  });

  it('while queued the counters read "—" and the page says it refreshes by itself', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch({ status: 'queued', counters: {}, row_count: 0, finished_at: null, started_at: null, created_at: new Date().toISOString() })) });
    expect(await screen.findByText(/Đang chờ worker nhận việc/)).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });

  it('running shows the progress sentence', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch({ status: 'running', counters: { processed: 1200, created: 700 }, finished_at: null })) });
    expect(await screen.findByText('Đang xử lý: 1.200 / 3.200 dòng')).toBeInTheDocument();
  });

  it('failed: a failure message and no publish or revert button', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch({ status: 'failed', counters: {} })) });
    expect(await screen.findByText(t.failed)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.publish })).toBeNull();
    expect(screen.queryByRole('button', { name: t.revert })).toBeNull();
    expect(screen.getByRole('button', { name: t.rejected })).toBeInTheDocument();
  });

  it('B25E11: reverted: true hides "Hoàn tác lô" and says the batch was reverted', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch({ reverted: true })) });
    expect(await screen.findByText(t.revertedNotice)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.revert })).toBeNull();
  });

  it('B25#14 (unit): "Tải rejected.csv" saves the API response as rejected-<id>.csv', async () => {
    renderApp('/uploads/b1', {
      [BATCH]: () => json(batch()),
      'GET /v1/admin/content/uploads/b1/rejected.csv': () => new Response('a,_row,_error\nx,3,bad\n', { headers: { 'content-type': 'text/csv' } }),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.rejected }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    const [blob, name] = saveBlob.mock.calls[0] as [Blob, string];
    expect(name).toBe('rejected-b1.csv');
    expect(await blob.text()).toBe('a,_row,_error\nx,3,bad\n');
  });

  it('publish this batch posts { filter: { batch_id } } with an Idempotency-Key and opens the job', async () => {
    const r = renderApp('/uploads/b1', { [BATCH]: () => json(batch()), [PUBLISH]: () => json({ job_id: 'j1' }, 202) });
    await userEvent.click(await screen.findByRole('button', { name: t.publish }));
    await waitFor(() => expect(posts(r.calls, '/v1/admin/content/senses/publish-jobs')).toHaveLength(1));
    const [call] = posts(r.calls, '/v1/admin/content/senses/publish-jobs');
    expect(call.body).toEqual({ filter: { batch_id: 'b1' } });
    expect(call.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByRole('heading', { level: 1, name: vi.nav.publishJobs })).toBeInTheDocument();
  });

  it('B25E10: nothing-to-publish → its message, and we stay on the batch', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch()), [PUBLISH]: () => problem(400, 'nothing-to-publish') });
    await userEvent.click(await screen.findByRole('button', { name: t.publish }));
    expect(await screen.findByText(vi.errors['nothing-to-publish'])).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' })).toBeInTheDocument();
  });

  it('revert: the dialog names the file; confirming posts once with a key, then the batch reads reverted', async () => {
    let reverted = false;
    const r = renderApp('/uploads/b1', {
      [BATCH]: () => json(batch({ reverted })),
      [REVERT]: () => {
        reverted = true;
        return json({ report: { removed: { entry: 1, variant: 0, level: 0, sense: 2, revision: 2 }, skipped: [] } });
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: t.revert }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(t.revertTitle.replace('{file}', 'cefr-j-1.5.csv'))).toBeInTheDocument();
    await userEvent.dblClick(within(dialog).getByRole('button', { name: t.revert }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(posts(r.calls, '/v1/admin/content/uploads/b1/revert')).toHaveLength(1);
    expect(await screen.findByText(t.revertedNotice)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.revert })).toBeNull();
  });

  it('B25E11: batch-not-revertable shows its reason inside the dialog', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch()), [REVERT]: () => problem(409, 'batch-not-revertable') });
    await userEvent.click(await screen.findByRole('button', { name: t.revert }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: t.revert }));
    expect(await within(dialog).findByText(vi.errors['batch-not-revertable'])).toBeInTheDocument();
  });

  it('without content.publish / content.edit the two buttons are not offered', async () => {
    renderApp('/uploads/b1', { [BATCH]: () => json(batch()) }, makeMe({ ...ME_ADMIN, staff_role: 'editor', permissions: ['content.import'] }));
    await screen.findByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' });
    expect(screen.queryByRole('button', { name: t.publish })).toBeNull();
    expect(screen.queryByRole('button', { name: t.revert })).toBeNull();
    expect(screen.getByRole('button', { name: t.rejected })).toBeInTheDocument();
  });

  it('B25E6: a 403 forbidden while loading goes through the session gate (refresh, /me with no role → signed out)', async () => {
    let meCalls = 0;
    const r = renderApp('/uploads/b1', {
      [BATCH]: () => problem(403, 'forbidden'),
      'GET /v1/me': () => (++meCalls === 1 ? json(ME_ADMIN) : json(makeMe({ staff_role: null, permissions: [] }))),
      'POST /v1/auth/logout': () => new Response(null, { status: 204 }),
    });
    expect(await screen.findByText(vi.errors.noAccess)).toBeInTheDocument();
    expect(r.count('POST', '/v1/auth/refresh')).toBeGreaterThanOrEqual(2);
    expect(r.count('POST', '/v1/auth/logout')).toBe(1);
  });
});
