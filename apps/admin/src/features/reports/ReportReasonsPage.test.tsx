import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.reportReasons;
const LIST = 'GET /v1/admin/practice/report-reasons';
const CREATE = 'POST /v1/admin/practice/report-reasons';
const PATCH = 'PATCH /v1/admin/practice/report-reasons/wrong_meaning';
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit'] });

const reason = (over: Record<string, unknown> = {}) => ({
  code: 'wrong_meaning', label_vi: 'Nghĩa sai', label_en: 'Wrong meaning', detail_hint_vi: null, detail_hint_en: null, applies_to: 'all',
  note_required: false, refundable: true, active: true, position: 10, updated_at: '2026-10-20T03:00:00.000Z',
  updated_by_user: { id: 'u1', email: 'admin@wordmet.com', system: false }, ...over,
});
// The API's order is `position`; "other" sits last because the seed gave it 1000.
const items = [
  reason(),
  reason({ code: 'bad_sentence', label_vi: 'Câu sai', label_en: 'Bad sentence', applies_to: 'ai', note_required: true, position: 20, updated_by_user: null }),
  reason({ code: 'other', label_vi: 'Khác', label_en: 'Other', refundable: false, active: false, position: 1000, updated_by_user: { id: 'sys', email: null, system: true } }),
];
const switchName = (code: string) => t.activeFor.replace('{code}', code);
const posts = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path.endsWith('report-reasons'));
const patches = (calls: Call[]) => calls.filter((c) => c.method === 'PATCH');

describe('report reasons list', { timeout: 20_000 }, () => {
  it('§6.9: rows keep the API order (no client re-sort) and show who changed them', async () => {
    renderApp('/report-reasons', { [LIST]: () => json({ items: [items[2], items[0], items[1]] }) });
    await screen.findAllByText('other');
    const codes = screen.getAllByTestId('reason-code').map((e) => e.textContent).slice(0, 3);
    expect(codes).toEqual(['other', 'wrong_meaning', 'bad_sentence']);
    expect(screen.getAllByText('admin@wordmet.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText(vi.common.systemUser).length).toBeGreaterThan(0);
  });

  it('§6.9: a note under the table says old reports keep the name they were sent with', async () => {
    renderApp('/report-reasons', { [LIST]: () => json({ items }) });
    expect(await screen.findByText(/báo lỗi cũ giữ tên lúc gửi/)).toBeInTheDocument();
  });

  it('shows what each reason applies to and the yes/no columns', async () => {
    renderApp('/report-reasons', { [LIST]: () => json({ items }) });
    const row = (await screen.findAllByText('bad_sentence'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(row).getByText(t.appliesTo.ai)).toBeInTheDocument();
    expect(within(row).getAllByText(t.yes).length).toBeGreaterThan(0);
  });

  it('an editor has no access to the page and no reasons call is made', async () => {
    const r = renderApp('/report-reasons', { 'GET /v1/admin/content/uploads?page_size=20': () => json({ items: [], next_page_token: null }) }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/practice/report-reasons'))).toBe(false);
  });

  it('§6.9: the "Đang dùng" switch sends PATCH { active } and the list is reloaded', async () => {
    let reads = 0;
    const r = renderApp('/report-reasons', {
      [LIST]: () => json({ items: ++reads === 1 ? items : [reason({ active: false }), items[1], items[2]] }),
      [PATCH]: () => json(reason({ active: false })),
    });
    const toggle = (await screen.findAllByRole('switch', { name: switchName('wrong_meaning') }))[0];
    expect(toggle).toBeChecked();
    await userEvent.click(toggle);
    await waitFor(() => expect(patches(r.calls)).toHaveLength(1));
    expect(patches(r.calls)[0].body).toEqual({ active: false });
    await waitFor(() => expect(reads).toBe(2));
    await waitFor(() => expect(screen.getAllByRole('switch', { name: switchName('wrong_meaning') })[0]).not.toBeChecked());
  });

  it('a failed toggle shows the error', async () => {
    renderApp('/report-reasons', { [LIST]: () => json({ items }), [PATCH]: () => problem(404, 'not-found') });
    await userEvent.click((await screen.findAllByRole('switch', { name: switchName('wrong_meaning') }))[0]);
    expect(await screen.findByText(vi.errors['not-found'])).toBeInTheDocument();
  });
});

describe('reason dialog', { timeout: 30_000 }, () => {
  async function openNew(routes: Record<string, (c: Call) => Response> = {}) {
    const r = renderApp('/report-reasons', { [LIST]: () => json({ items }), ...routes });
    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    const dialog = await screen.findByRole('dialog', { name: t.newTitle });
    return { r, dialog };
  }
  async function fill(dialog: HTMLElement, code: string) {
    await userEvent.type(within(dialog).getByLabelText(t.form.code), code);
    await userEvent.type(within(dialog).getByLabelText(t.form.labelVi), 'Tên');
    await userEvent.type(within(dialog).getByLabelText(t.form.labelEn), 'Name');
  }

  it('§6.9: the code field explains the rule and a code that breaks it is refused before sending', async () => {
    const { r, dialog } = await openNew();
    expect(within(dialog).getByText(t.form.codeHint)).toBeInTheDocument();
    await fill(dialog, 'Bad Code');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    expect(await within(dialog).findByText(t.form.codeInvalid)).toBeInTheDocument();
    expect(posts(r.calls)).toHaveLength(0);
  });

  it('a valid form posts the body with an Idempotency-Key and closes on the refreshed list', async () => {
    const { r, dialog } = await openNew({ [CREATE]: () => json(reason({ code: 'typo' }), 201) });
    await userEvent.type(within(dialog).getByLabelText(t.form.code), 'typo');
    await userEvent.type(within(dialog).getByLabelText(t.form.labelVi), 'Lỗi chính tả');
    await userEvent.type(within(dialog).getByLabelText(t.form.labelEn), 'Typo');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(posts(r.calls)).toHaveLength(1));
    const post = posts(r.calls)[0];
    expect(post.body).toEqual({
      code: 'typo', label_vi: 'Lỗi chính tả', label_en: 'Typo', detail_hint_vi: null, detail_hint_en: null, applies_to: 'all',
      note_required: false, refundable: false, position: 0,
    });
    expect(post.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.newTitle })).toBeNull());
    expect(r.calls.filter((c) => c.method === 'GET' && c.path.endsWith('report-reasons')).length).toBeGreaterThan(1);
  });

  it('§6.9: 409 report-reason-exists shows "Đã có lý do mã này." on the code field', async () => {
    const { dialog } = await openNew({ [CREATE]: () => problem(409, 'report-reason-exists') });
    await fill(dialog, 'other');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    const code = within(dialog).getByLabelText(t.form.code);
    await waitFor(() => expect(code).toHaveAccessibleDescription(expect.stringContaining('Đã có lý do mã này.')));
    expect(code).toHaveFocus();
  });

  it('400 validation-failed puts the message on the field it names', async () => {
    const { dialog } = await openNew({ [CREATE]: () => problem(400, 'validation-failed', { violations: ['label_en: Too long'] }) });
    await fill(dialog, 'typo');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(within(dialog).getByLabelText(t.form.labelEn)).toHaveAccessibleDescription(expect.stringContaining('Too long')));
  });

  it('§4.3: [Hủy] on an untouched form closes at once; on a typed one it asks "Bỏ thay đổi?" first', async () => {
    const { dialog } = await openNew();
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.cancel }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.newTitle })).toBeNull());

    await userEvent.click((await screen.findAllByRole('button', { name: t.add }))[0]);
    const again = await screen.findByRole('dialog', { name: t.newTitle });
    await userEvent.type(within(again).getByLabelText(t.form.code), 'typo');
    await userEvent.click(within(again).getByRole('button', { name: vi.common.cancel }));
    expect(await screen.findByText(vi.leave.discardTitle)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: vi.leave.keepEditing }));
    expect(screen.getByRole('dialog', { name: t.newTitle })).toBeInTheDocument();
  });

  it('editing: the code is fixed, the form starts filled and PATCH carries the fields', async () => {
    const r = renderApp('/report-reasons/wrong_meaning', { [LIST]: () => json({ items }), [PATCH]: () => json(reason({ label_vi: 'Nghĩa chưa đúng' })) });
    const dialog = await screen.findByRole('dialog', { name: t.editTitle });
    expect(within(dialog).getByLabelText(t.form.code)).toBeDisabled();
    expect(within(dialog).getByLabelText(t.form.code)).toHaveValue('wrong_meaning');
    const vn = within(dialog).getByLabelText(t.form.labelVi);
    expect(vn).toHaveValue('Nghĩa sai');
    await userEvent.clear(vn);
    await userEvent.type(vn, 'Nghĩa chưa đúng');
    await userEvent.click(within(dialog).getByRole('button', { name: t.form.save }));
    await waitFor(() => expect(patches(r.calls)).toHaveLength(1));
    expect(patches(r.calls)[0].body).toMatchObject({ label_vi: 'Nghĩa chưa đúng', label_en: 'Wrong meaning', applies_to: 'all', position: 10 });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: t.editTitle })).toBeNull());
  });
});
