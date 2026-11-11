import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { AdminFaqItem } from './faq-api';

const t = vi.faq;
const LIST = 'GET /v1/admin/faq';
const ID1 = '00000000-0000-4000-8000-000000000001';
const ID2 = '00000000-0000-4000-8000-000000000002';
const ID3 = '00000000-0000-4000-8000-000000000003';
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant', 'users.read', 'ai.view'] });

const item = (over: Partial<AdminFaqItem> = {}): AdminFaqItem => ({
  id: ID1, position: 10, question: 'Wordmet có miễn phí không?', answer: 'Có.\nGói Free dùng mãi.', published: true, row_version: 3,
  updated_at: '2026-11-11T03:00:00.000Z', updated_by: { id: 'u1', email: 'admin@wordmet.com' }, ...over,
});
// The API's order (position, then creation): the screen keeps it, it does not sort.
const items = [
  item({ id: ID2, position: 30, question: 'Học trên điện thoại được không?', published: false, row_version: 1 }),
  item(),
];
const posts = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/faq');
const patches = (calls: Call[]) => calls.filter((c) => c.method === 'PATCH');
const deletes = (calls: Call[]) => calls.filter((c) => c.method === 'DELETE');

describe('FaqPage (list)', { timeout: 20_000 }, () => {
  it('shows the rows in API order with their status badges and the deploy banner', async () => {
    renderApp('/faq', { [LIST]: () => json({ items }) });
    const table = within(await screen.findByRole('table'));
    const rows = table.getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('Học trên điện thoại được không?')).toBeInTheDocument();
    expect(within(rows[0]).getByText(t.status.draft)).toBeInTheDocument();
    expect(within(rows[0]).getByText('30')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Wordmet có miễn phí không?')).toBeInTheDocument();
    expect(within(rows[1]).getByText(t.status.published)).toBeInTheDocument();
    expect(screen.getByText(t.banner)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: vi.nav.faq })).toBeInTheDocument();
  });

  it('an empty list says so', async () => {
    renderApp('/faq', { [LIST]: () => json({ items: [] }) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
  });

  it('[Thêm câu hỏi] → fill → save posts the exact body with an Idempotency-Key and closes on the refreshed list', async () => {
    const r = renderApp('/faq', { [LIST]: () => json({ items }), 'POST /v1/admin/faq': () => json(item({ id: ID3, position: 40 }), 201) });
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.newTitle });
    // A new question goes after the last one: the highest position + 10.
    expect(within(dialog).getByLabelText(t.form.position)).toHaveValue('40');
    await userEvent.type(within(dialog).getByLabelText(t.form.question), '  Có quảng cáo không?  ');
    await userEvent.type(within(dialog).getByLabelText(t.form.answer), 'Gói Free có quảng cáo.{Enter}Gói Pro thì không.');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(posts(r.calls)).toHaveLength(1));
    const post = posts(r.calls)[0];
    expect(post.body).toEqual({ question: 'Có quảng cáo không?', answer: 'Gói Free có quảng cáo.\nGói Pro thì không.', position: 40, published: false });
    expect(post.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.newTitle })).toBeNull());
    expect(r.calls.filter((c) => c.method === 'GET' && c.path === '/v1/admin/faq').length).toBeGreaterThan(1);
  });

  it('a new question on an empty list starts at position 10', async () => {
    renderApp('/faq/new', { [LIST]: () => json({ items: [] }) });
    const dialog = await screen.findByRole('dialog', { name: t.newTitle });
    expect(within(dialog).getByLabelText(t.form.position)).toHaveValue('10');
  });

  it('an empty question is refused before sending', async () => {
    const r = renderApp('/faq/new', { [LIST]: () => json({ items }) });
    const dialog = await screen.findByRole('dialog', { name: t.newTitle });
    await userEvent.type(within(dialog).getByLabelText(t.form.answer), 'Có.');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    expect(await within(dialog).findByText(t.form.questionInvalid)).toBeInTheDocument();
    expect(posts(r.calls)).toHaveLength(0);
  });

  it('400 validation-failed puts the message on the field it names', async () => {
    const r = renderApp('/faq/new', { [LIST]: () => json({ items }), 'POST /v1/admin/faq': () => problem(400, 'validation-failed', { violations: ['answer: Too long'] }) });
    const dialog = await screen.findByRole('dialog', { name: t.newTitle });
    await userEvent.type(within(dialog).getByLabelText(t.form.question), 'Hỏi?');
    await userEvent.type(within(dialog).getByLabelText(t.form.answer), 'Đáp.');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(within(dialog).getByLabelText(t.form.answer)).toHaveAccessibleDescription(expect.stringContaining('Too long')));
    expect(posts(r.calls)).toHaveLength(1);
  });

  it('[Sửa] → tick "Đăng lên trang chủ" sends PATCH with expected_version = row_version and published: true', async () => {
    const r = renderApp('/faq', {
      [LIST]: () => json({ items }),
      [`PATCH /v1/admin/faq/${ID2}`]: () => json(item({ id: ID2, position: 30, question: 'Học trên điện thoại được không?', published: true, row_version: 2 })),
    });
    await userEvent.click((await screen.findAllByRole('button', { name: t.editFor.replace('{question}', 'Học trên điện thoại được không?') }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.editTitle });
    expect(within(dialog).getByLabelText(t.form.question)).toHaveValue('Học trên điện thoại được không?');
    const publish = within(dialog).getByRole('checkbox', { name: t.form.published });
    expect(publish).not.toBeChecked();
    await userEvent.click(publish);
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(patches(r.calls)).toHaveLength(1));
    const patch = patches(r.calls)[0];
    expect(patch.body).toEqual({ expected_version: 1, question: 'Học trên điện thoại được không?', answer: 'Có.\nGói Free dùng mãi.', position: 30, published: true });
    expect(patch.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.editTitle })).toBeNull());
  });

  it('409 faq-version-conflict shows the conflict text and reloads the list', async () => {
    let reads = 0;
    const r = renderApp(`/faq/${ID1}`, {
      [LIST]: () => { reads += 1; return json({ items }); },
      [`PATCH /v1/admin/faq/${ID1}`]: () => problem(409, 'faq-version-conflict'),
    });
    const dialog = await screen.findByRole('dialog', { name: t.editTitle });
    await userEvent.type(within(dialog).getByLabelText(t.form.question), ' nhé');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    expect(await within(dialog).findByText(vi.errors['faq-version-conflict'])).toBeInTheDocument();
    expect(patches(r.calls)[0].body).toMatchObject({ expected_version: 3 });
    // The next try must not reuse the stale row_version from the cache.
    await waitFor(() => expect(reads).toBe(2));
  });

  it('a list reload while the form is open does not move expected_version: the PATCH sends the version the form was opened with', async () => {
    let reads = 0;
    const r = renderApp(`/faq/${ID1}`, {
      // Someone else saved ID1 meanwhile: the reloaded list has row_version 4.
      [LIST]: () => json({ items: ++reads === 1 ? items : [items[0], item({ row_version: 4 })] }),
      [`PATCH /v1/admin/faq/${ID1}`]: () => problem(409, 'faq-version-conflict'),
    });
    const dialog = await screen.findByRole('dialog', { name: t.editTitle });
    await userEvent.type(within(dialog).getByLabelText(t.form.question), ' nhé');
    await r.client.invalidateQueries({ queryKey: ['faq'] });
    await waitFor(() => expect(reads).toBe(2));
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(patches(r.calls)).toHaveLength(1));
    expect(patches(r.calls)[0].body).toMatchObject({ expected_version: 3, question: 'Wordmet có miễn phí không? nhé' });
  });

  it('[Xóa] asks first; [Hủy] sends nothing, confirming sends DELETE and reloads the list', async () => {
    let reads = 0;
    const r = renderApp('/faq', {
      [LIST]: () => json({ items: ++reads === 1 ? items : [items[0]] }),
      [`DELETE /v1/admin/faq/${ID1}`]: () => new Response(null, { status: 204 }),
    });
    const remove = t.deleteFor.replace('{question}', 'Wordmet có miễn phí không?');
    await userEvent.click((await screen.findAllByRole('button', { name: remove }))[0]);
    let confirm = await screen.findByRole('dialog', { name: t.deleteDialog.title });
    await userEvent.click(within(confirm).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.deleteDialog.title })).toBeNull());
    expect(deletes(r.calls)).toHaveLength(0);

    await userEvent.click(screen.getAllByRole('button', { name: remove })[0]);
    confirm = await screen.findByRole('dialog', { name: t.deleteDialog.title });
    await userEvent.click(within(confirm).getByRole('button', { name: t.deleteDialog.confirm }));
    await waitFor(() => expect(deletes(r.calls)).toHaveLength(1));
    expect(deletes(r.calls)[0].path).toBe(`/v1/admin/faq/${ID1}`);
    await waitFor(() => expect(reads).toBe(2));
    await waitFor(() => expect(screen.queryAllByText('Wordmet có miễn phí không?')).toHaveLength(0));
  });

  it('an admin sees the nav item; an editor (no settings.manage) does not, and cannot open the page', async () => {
    const admin = renderApp('/faq', { [LIST]: () => json({ items }) });
    expect(await screen.findByRole('link', { name: vi.nav.faq })).toBeInTheDocument();
    admin.unmount();

    const r = renderApp('/faq', { 'GET /v1/admin/content/uploads?page_size=20': () => json({ items: [], next_page_token: null }) }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: vi.nav.faq })).toBeNull();
    expect(screen.getByRole('link', { name: vi.nav.words })).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/faq'))).toBe(false);
  });
});
