import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi as vitest } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const saveBlob = vitest.hoisted(() => vitest.fn());
vitest.mock('../../api/download', () => ({ saveBlob }));

const t = vi.publishJobs;
const JOBS = 'GET /v1/admin/content/senses/publish-jobs?page_size=20';
const CREATE = 'POST /v1/admin/content/senses/publish-jobs';
const ID = 'a3f2c1aa-0000-4000-8000-000000000001';
const job = (over: Record<string, unknown> = {}) => ({
  id: ID,
  status: 'running',
  filter: { level: 'B1', topic: 'food' },
  snapshot_count: 1250,
  not_ready_count: 0,
  counters: { processed: 480, pending: 770, published: 480, already_published: 0, refused: 0 },
  created_at: '2026-10-14T10:15:00.000Z',
  started_at: '2026-10-14T10:15:05.000Z',
  finished_at: null,
  ...over,
});
const json = (body: unknown, status = 200) => Response.json(body, { status });
const TOPICS = { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] };
const UPLOADS = { items: [{ id: 'b1', status: 'succeeded', file_name: 'cefr-j-1.5.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null };
const posts = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/content/senses/publish-jobs');
const keyOf = (call: Call) => call.headers['Idempotency-Key'];

beforeEach(() => saveBlob.mockClear());

describe('publish jobs list', { timeout: 20_000 }, () => {
  it('list: renders items from GET .../publish-jobs and "Tải thêm" follows next_page_token', async () => {
    const r = renderApp('/publish-jobs', {
      [JOBS]: () => json({ items: [job(), job({ id: '9be407aa-0000-4000-8000-000000000002', status: 'succeeded', filter: { batch_id: 'b1c2d3e4-0000-4000-8000-000000000003' }, snapshot_count: 3112 })], next_page_token: 'tok-2' }),
      'GET /v1/admin/content/senses/publish-jobs?page_size=20&page_token=tok-2': () => json({ items: [job({ id: '7d1b55aa-0000-4000-8000-000000000004', status: 'partial', filter: { level: 'A2' }, snapshot_count: 860 })], next_page_token: null }),
    });
    expect((await screen.findAllByText('#a3f2c1')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('level=B1 · topic=food').length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.batchFilter.replace('{id}', 'b1c2d3')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('1.250').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: vi.common.loadMore }));
    expect((await screen.findAllByText('#7d1b55')).length).toBeGreaterThan(0);
    expect(r.count('GET', '/v1/admin/content/senses/publish-jobs?page_size=20&page_token=tok-2')).toBe(1);
    expect(screen.queryByRole('button', { name: vi.common.loadMore })).toBeNull();
  });

  it('empty: names the empty state', async () => {
    renderApp('/publish-jobs', { [JOBS]: () => json({ items: [], next_page_token: null }) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('"Tạo publish job" opens the form with its own title', async () => {
    renderApp('/publish-jobs', {
      [JOBS]: () => json({ items: [], next_page_token: null }),
      'GET /v1/admin/taxonomy/topics': () => json(TOPICS),
      'GET /v1/admin/content/uploads?page_size=20': () => json(UPLOADS),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.create }));
    expect(await screen.findByRole('dialog', { name: t.formTitle })).toBeInTheDocument();
  });

  it('UBC13 /publish-jobs/new is a dialog over the list', async () => {
    renderApp('/publish-jobs/new', {
      [JOBS]: () => json({ items: [job({ status: 'succeeded' })], next_page_token: null }),
      'GET /v1/admin/taxonomy/topics': () => json(TOPICS),
      'GET /v1/admin/content/uploads?page_size=20': () => json(UPLOADS),
    });
    expect(await screen.findByRole('dialog', { name: t.formTitle })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('table')).not.toBeNull());
  });
});

describe('publish job form', { timeout: 20_000 }, () => {
  function open(create: (n: number) => Response) {
    let n = 0;
    return renderApp('/publish-jobs/new', {
      [JOBS]: () => json({ items: [], next_page_token: null }),
      'GET /v1/admin/taxonomy/topics': () => json(TOPICS),
      'GET /v1/admin/content/uploads?page_size=20': () => json(UPLOADS),
      [CREATE]: () => create(++n),
      [`GET /v1/admin/content/senses/publish-jobs/${ID}`]: () => json(job()),
    });
  }
  const choose = async (label: string, option: RegExp | string) => {
    await userEvent.click(await screen.findByRole('button', { name: new RegExp(label) }));
    await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: option }));
  };
  const submit = () => screen.findByRole('button', { name: t.create });
  const confirmation = () => screen.findByRole('dialog', { name: t.confirmAllTitle });
  const confirmAll = async () => userEvent.click(within(await confirmation()).getByRole('button', { name: t.confirmAllSubmit }));

  it('B25E29: with no filter at all a dialog says it publishes the whole catalog; nothing is sent until it is confirmed', async () => {
    const r = open(() => json({ job_id: ID }, 202));
    await userEvent.click(await submit());
    const dialog = await confirmation();
    expect(within(dialog).getByText(t.confirmAllTitle)).toBeInTheDocument();
    expect(within(dialog).getByText(t.confirmAllBody)).toBeInTheDocument();
    expect(posts(r.calls)).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.confirmAllTitle })).toBeNull());
    expect(posts(r.calls)).toHaveLength(0);

    await userEvent.click(await submit());
    await confirmAll();
    await waitFor(() => expect(posts(r.calls)).toHaveLength(1));
    expect(posts(r.calls)[0].body).toEqual({ filter: {} });
  });

  it('B25E29: with one filter set the job is sent straight away, without a dialog', async () => {
    const r = open(() => json({ job_id: ID }, 202));
    await choose(vi.export.level, 'B1');
    await userEvent.click(await submit());
    await waitFor(() => expect(posts(r.calls)).toHaveLength(1));
    expect(screen.queryByRole('dialog', { name: t.confirmAllTitle })).toBeNull();
  });

  it('create: filter level/topic/pos/batch_id is posted as { filter } with a key, and the job opens', async () => {
    const r = open(() => json({ job_id: ID }, 202));
    await choose(vi.export.level, 'B1');
    await choose(vi.export.topic, /Ăn uống \(food\)/);
    await choose(vi.export.batch, /cefr-j-1\.5\.csv/);
    await userEvent.click(await submit());
    await waitFor(() => expect(posts(r.calls)).toHaveLength(1));
    expect(posts(r.calls)[0].body).toEqual({ filter: { level: 'B1', topic: 'food', batch_id: 'b1' } });
    expect(keyOf(posts(r.calls)[0])).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByRole('heading', { level: 2, name: t.jobTitle.replace('{id}', 'a3f2c1') })).toBeInTheDocument();
  });

  it('create: a new key per changed filter; the same key after a network error', async () => {
    const r = open((n) => {
      if (n <= 2) throw new TypeError('Failed to fetch');
      return json({ job_id: ID }, 202);
    });
    await choose(vi.export.level, 'B1');
    await userEvent.click(await submit());
    await userEvent.click(await screen.findByRole('button', { name: vi.common.retry }));
    await waitFor(() => expect(posts(r.calls)).toHaveLength(2));
    expect(keyOf(posts(r.calls)[1])).toBe(keyOf(posts(r.calls)[0]));

    await choose(vi.export.level, 'B2');
    await userEvent.click(await submit());
    await waitFor(() => expect(posts(r.calls)).toHaveLength(3));
    expect(keyOf(posts(r.calls)[2])).not.toBe(keyOf(posts(r.calls)[0]));
  });

  it('B25E10: nothing-to-publish on create shows its message and stays on the form', async () => {
    open(() => problem(400, 'nothing-to-publish'));
    await userEvent.click(await submit());
    await confirmAll();
    expect(await screen.findByText(vi.errors['nothing-to-publish'])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.create })).toBeEnabled();
  });

  it('B25#18 (unit): 429 Retry-After 5 disables the button with a 5 s countdown', async () => {
    open(
      () =>
        new Response(JSON.stringify({ type: 'http://api.test/problems/rate-limited', status: 429, title: 'x' }), {
          status: 429,
          headers: { 'content-type': 'application/problem+json', 'retry-after': '5' },
        }),
    );
    await userEvent.click(await submit());
    await confirmAll();
    const button = await screen.findByRole('button', { name: t.wait.replace('{seconds}', '5') });
    expect(button).toBeDisabled();
  });
});

describe('publish job panel', () => {
  const GET = `GET /v1/admin/content/senses/publish-jobs/${ID}`;
  // The job opens over its list now (UB8): every render also answers the list (this job and another one).
  const OTHER = 'b7c9d0aa-0000-4000-8000-000000000002';
  const list = () => json({ items: [job({ status: 'queued', counters: {} }), job({ id: OTHER, status: 'succeeded', snapshot_count: 9, filter: { level: 'A1' } })], next_page_token: null });

  it('UBC12 /publish-jobs/<id> shows the list and the panel, and the job row is selected', async () => {
    renderApp(`/publish-jobs/${ID}`, { [JOBS]: list, [GET]: () => json(job()) });
    expect(await screen.findByRole('heading', { level: 2, name: t.jobTitle.replace('{id}', 'a3f2c1') })).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: '#a3f2c1' }).closest('tr')).toHaveAttribute('data-selected');
    expect(within(table).getByRole('link', { name: '#b7c9d0' }).closest('tr')).not.toHaveAttribute('data-selected');
    expect(screen.getByTestId('detail-panel')).toBeInTheDocument();
  });

  it('shows the running sentence while it runs', async () => {
    renderApp(`/publish-jobs/${ID}`, { [JOBS]: list, [GET]: () => json(job()) });
    expect(await screen.findByText('Đang publish: 480 / 1.250 sense')).toBeInTheDocument();
  });

  it('B25E8: a job queued for more than 30 s shows the worker hint; a fresh one only says it is waiting', async () => {
    const old = new Date(Date.now() - 45_000).toISOString();
    const { unmount } = renderApp(`/publish-jobs/${ID}`, { [JOBS]: list, [GET]: () => json(job({ status: 'queued', counters: {}, created_at: old, started_at: null })) });
    expect(await screen.findByText(/Worker có đang chạy không/)).toBeInTheDocument();
    unmount();

    renderApp(`/publish-jobs/${ID}`, { [JOBS]: list, [GET]: () => json(job({ status: 'queued', counters: {}, created_at: new Date().toISOString(), started_at: null })) });
    expect(await screen.findByText(/Đang chờ worker nhận việc/)).toBeInTheDocument();
    expect(screen.queryByText(/Worker có đang chạy không/)).toBeNull();
  });

  it('detail: polls until terminal, then shows counters published/already_published/refused', async () => {
    let n = 0;
    const r = renderApp(`/publish-jobs/${ID}`, {
      [JOBS]: list,
      [GET]: () => json(n++ === 0 ? job() : job({ status: 'succeeded', finished_at: '2026-10-14T10:16:00.000Z', counters: { processed: 1250, pending: 0, published: 1201, already_published: 37, refused: 12 } })),
    });
    expect(await screen.findByText(/Đang publish/)).toBeInTheDocument();
    expect(await screen.findByText('1.201', undefined, { timeout: 6000 })).toBeInTheDocument();
    for (const x of ['1.250', '37', '12']) expect(screen.getAllByText(x).length).toBeGreaterThan(0);
    expect(screen.getByText(/12 sense bị từ chối/)).toBeInTheDocument();
    const calls = r.count('GET', `/v1/admin/content/senses/publish-jobs/${ID}`);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(r.count('GET', `/v1/admin/content/senses/publish-jobs/${ID}`)).toBe(calls); // stopped
  }, 15_000);

  it("I1 job A's report.csv error is not shown once job B opens", async () => {
    renderApp(`/publish-jobs/${ID}`, {
      [JOBS]: list,
      [GET]: () => json(job({ status: 'succeeded', counters: { published: 1 } })),
      [`GET /v1/admin/content/senses/publish-jobs/${ID}/report.csv`]: () => problem(500, ''),
      [`GET /v1/admin/content/senses/publish-jobs/${OTHER}`]: () => json(job({ id: OTHER, status: 'succeeded', snapshot_count: 9 })),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.report }));
    expect(await within(screen.getByTestId('detail-panel')).findByRole('alert')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('table')).getByRole('link', { name: '#b7c9d0' }));
    expect(await screen.findByRole('heading', { level: 2, name: t.jobTitle.replace('{id}', 'b7c9d0') })).toBeInTheDocument();
    expect(within(screen.getByTestId('detail-panel')).queryByRole('alert')).toBeNull();
  });

  it('"Tải report.csv" saves publish-<id>.csv with the API content', async () => {
    renderApp(`/publish-jobs/${ID}`, {
      [JOBS]: list,
      [GET]: () => json(job({ status: 'succeeded', counters: { published: 1 } })),
      [`GET /v1/admin/content/senses/publish-jobs/${ID}/report.csv`]: () => new Response('sense_id,outcome\n1,published\n', { headers: { 'content-type': 'text/csv' } }),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.report }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    const [blob, name] = saveBlob.mock.calls[0] as [Blob, string];
    expect(name).toBe(`publish-${ID}.csv`);
    expect(await blob.text()).toBe('sense_id,outcome\n1,published\n');
  });
});
