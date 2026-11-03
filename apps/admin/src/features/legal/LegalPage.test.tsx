import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import type { LegalSummary, LegalVersion } from './legal-api';

const t = vi.legal;
const LIST = 'GET /v1/admin/legal/versions?page_size=100';
const ID1 = '00000000-0000-4000-8000-000000000001';
const ID2 = '00000000-0000-4000-8000-000000000002';
const ID3 = '00000000-0000-4000-8000-000000000003';

const summary = (over: Partial<LegalSummary> = {}): LegalSummary => ({
  id: ID1, number: 1, version: '1', status: 'published', row_version: 3, effective_date: '2026-11-10', has_english: false,
  updated_at: '2026-11-03T03:00:00.000Z', published_at: '2026-11-03T03:00:00.000Z', published_by: { id: 'u1', email: 'admin@wordmet.com' }, ...over,
});
const version = (over: Partial<LegalVersion> = {}): LegalVersion => ({
  ...summary(), privacy_vi: '# Chính sách', terms_vi: '# Điều khoản', privacy_en: null, terms_en: null, ...over,
});
const draft = (over: Partial<LegalVersion> = {}): LegalVersion =>
  version({ id: ID2, number: 2, version: '2', status: 'draft', row_version: 1, published_at: null, published_by: null, ...over });

describe('LegalPage (list of versions)', () => {
  it('lists the versions newest first with status, date and who published', async () => {
    renderApp('/legal', { [LIST]: () => Response.json({ items: [summary({ id: ID2, number: 2, status: 'draft', published_at: null, published_by: null, effective_date: null }), summary()], next_page_token: null }) });
    const rows = await screen.findAllByRole('row');
    const text = rows.map((row) => row.textContent ?? '').join('|');
    expect(text.indexOf(t.status.draft)).toBeLessThan(text.indexOf(t.status.published));
    expect(screen.getByText('admin@wordmet.com')).toBeInTheDocument();
    expect(screen.getByText('10/11/2026')).toBeInTheDocument();
  });

  it('says which version is published, or that nothing is', async () => {
    const r = renderApp('/legal', { [LIST]: () => Response.json({ items: [summary()], next_page_token: null }) });
    expect(await screen.findByText(t.current.replace('{number}', '1').replace('{date}', '10/11/2026'))).toBeInTheDocument();
    r.unmount();
    renderApp('/legal', { [LIST]: () => Response.json({ items: [], next_page_token: null }) });
    expect(await screen.findByText(t.noCurrent)).toBeInTheDocument();
    expect(screen.getByText(t.empty)).toBeInTheDocument();
  });

  it('[Tạo bản nháp] posts with an Idempotency-Key and opens the new draft', async () => {
    const r = renderApp('/legal', {
      [LIST]: () => Response.json({ items: [summary()], next_page_token: null }),
      'POST /v1/admin/legal/versions': () => Response.json(draft(), { status: 201 }),
      [`GET /v1/admin/legal/versions/${ID2}`]: () => Response.json(draft()),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.create }));
    expect(await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') })).toBeInTheDocument();
    const post = r.calls.find((c) => c.method === 'POST');
    expect(post?.body).toEqual({});
    expect(post?.headers['Idempotency-Key']).toBeTruthy();
  });

});

describe('LegalEditorPage (one version)', () => {
  const open = (v: LegalVersion, extra: Record<string, () => Response> = {}) =>
    renderApp(`/legal/${v.id}`, { [`GET /v1/admin/legal/versions/${v.id}`]: () => Response.json(v), [LIST]: () => Response.json({ items: [summary(v)], next_page_token: null }), ...extra });
  const privacyVi = () => screen.getByRole('textbox', { name: t.editor.vi });

  it('shows the Vietnamese text of the Privacy Policy, and its Markdown preview', async () => {
    open(draft({ privacy_vi: '# Chính sách bảo mật\n\n- một\n- hai' }));
    expect(await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') })).toBeInTheDocument();
    expect(privacyVi()).toHaveValue('# Chính sách bảo mật\n\n- một\n- hai');
    const preview = screen.getByRole('region', { name: t.editor.preview });
    expect(within(preview).getByRole('heading', { name: 'Chính sách bảo mật' })).toBeInTheDocument();
    expect(within(preview).getAllByRole('listitem')).toHaveLength(2);
  });

  it('the preview never renders raw HTML or a javascript: link', async () => {
    open(draft({ privacy_vi: 'ok <script>window.hacked = 1</script> <img src=x onerror="window.hacked=1">\n\n[bad](javascript:alert(1))' }));
    const preview = await screen.findByRole('region', { name: t.editor.preview });
    expect(preview.querySelector('script, img')).toBeNull();
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
    expect(within(preview).queryByRole('link', { name: 'bad' })?.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
  });

  it('saves every text and the date under expected_version, then shows the next version', async () => {
    const r = open(draft(), {
      [`PUT /v1/admin/legal/versions/${ID2}`]: () => Response.json(draft({ row_version: 2, privacy_vi: 'Mới' })),
    });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') });
    await userEvent.clear(privacyVi());
    await userEvent.type(privacyVi(), 'Mới');
    await userEvent.click(screen.getByRole('button', { name: t.editor.save }));
    await waitFor(() => expect(r.calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = r.calls.find((c) => c.method === 'PUT')!;
    expect(put.body).toEqual({ expected_version: 1, privacy_vi: 'Mới', terms_vi: '# Điều khoản', privacy_en: null, terms_en: null, effective_date: '2026-11-10' });
    expect(put.headers['Idempotency-Key']).toBeTruthy();
    expect(await screen.findByText(t.editor.saved.replace('{number}', '2'))).toBeInTheDocument();
  });

  it('an empty English text is sent as null, a filled one as text', async () => {
    const r = open(draft(), { [`PUT /v1/admin/legal/versions/${ID2}`]: () => Response.json(draft({ row_version: 2 })) });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') });
    await userEvent.type(screen.getByRole('textbox', { name: t.editor.en }), '# Privacy');
    await userEvent.click(screen.getByRole('button', { name: t.editor.save }));
    await waitFor(() => expect(r.calls.some((c) => c.method === 'PUT')).toBe(true));
    expect(r.calls.find((c) => c.method === 'PUT')!.body).toMatchObject({ privacy_en: '# Privacy', terms_en: null });
  });

  it('[Đăng] is blocked while there are unsaved changes; saved, it asks first and posts expected_version', async () => {
    const r = open(draft({ row_version: 4 }), {
      [`POST /v1/admin/legal/versions/${ID2}/publish`]: () => Response.json(draft({ status: 'published', row_version: 5 })),
    });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') });
    await userEvent.type(privacyVi(), '!');
    expect(screen.getByRole('button', { name: t.editor.publish })).toBeDisabled();
    expect(screen.getByText(t.editor.publishFirst)).toBeInTheDocument();
    await userEvent.type(privacyVi(), '{Backspace}');
    await userEvent.click(screen.getByRole('button', { name: t.editor.publish }));
    const dialog = await screen.findByRole('alertdialog', { name: t.publishDialog.title.replace('{number}', '2') });
    expect(within(dialog).getByText(t.publishDialog.body)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: t.publishDialog.confirm }));
    await waitFor(() => expect(r.calls.some((c) => c.path.endsWith('/publish'))).toBe(true));
    const post = r.calls.find((c) => c.path.endsWith('/publish'))!;
    expect(post.body).toEqual({ expected_version: 4 });
    expect(post.headers['Idempotency-Key']).toBeTruthy();
  });

  it('a publish refused for a missing text marks the field', async () => {
    open(draft({ privacy_vi: '' }), {
      [`POST /v1/admin/legal/versions/${ID2}/publish`]: () => problem(400, 'validation-failed', { violations: ['privacy_vi', 'effective_date'] }),
    });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') });
    await userEvent.click(screen.getByRole('button', { name: t.editor.publish }));
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: t.publishDialog.confirm }));
    expect(await screen.findByText(t.editor.required)).toBeInTheDocument();
    expect(privacyVi()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(t.editor.needDate)).toBeInTheDocument();
  });

  it('409 draft-version-conflict keeps what was typed, offers [Tải bản mới] and stops saving until then', async () => {
    let gets = 0;
    open(draft(), {
      [`GET /v1/admin/legal/versions/${ID2}`]: () => Response.json(++gets === 1 ? draft() : draft({ row_version: 2, privacy_vi: 'Từ nơi khác' })),
      [`PUT /v1/admin/legal/versions/${ID2}`]: () => problem(409, 'draft-version-conflict'),
    });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') });
    await userEvent.type(privacyVi(), ' thêm');
    await userEvent.click(screen.getByRole('button', { name: t.editor.save }));
    expect(await screen.findByText(t.editor.conflict)).toBeInTheDocument();
    expect(privacyVi()).toHaveValue('# Chính sách thêm');
    expect(screen.getByRole('button', { name: t.editor.save })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: t.editor.reload }));
    await waitFor(() => expect(privacyVi()).toHaveValue('Từ nơi khác'));
  });

  it('a published version is read-only and offers a draft copy', async () => {
    const r = open(version(), {
      'POST /v1/admin/legal/versions': () => Response.json(draft({ id: ID3, number: 3 }), { status: 201 }),
      [`GET /v1/admin/legal/versions/${ID3}`]: () => Response.json(draft({ id: ID3, number: 3 })),
    });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '1') });
    expect(screen.getByText(t.editor.readOnly)).toBeInTheDocument();
    expect(privacyVi()).toBeDisabled();
    expect(screen.queryByRole('button', { name: t.editor.save })).toBeNull();
    expect(screen.queryByRole('button', { name: t.editor.publish })).toBeNull();
    expect(screen.queryByRole('button', { name: t.editor.delete })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: t.editor.copy }));
    await waitFor(() => expect(r.calls.find((c) => c.method === 'POST')?.body).toEqual({ copy_from: ID1 }));
  });

  it('[Xóa nháp] asks first, then deletes and returns to the list', async () => {
    const r = open(draft(), { [`DELETE /v1/admin/legal/versions/${ID2}`]: () => new Response(null, { status: 204 }) });
    await screen.findByRole('heading', { name: t.editor.heading.replace('{number}', '2') });
    await userEvent.click(screen.getByRole('button', { name: t.editor.delete }));
    const dialog = await screen.findByRole('alertdialog', { name: t.deleteDialog.title.replace('{number}', '2') });
    await userEvent.click(within(dialog).getByRole('button', { name: t.deleteDialog.confirm }));
    await waitFor(() => expect(r.calls.some((c) => c.method === 'DELETE')).toBe(true));
    expect(await screen.findByRole('button', { name: t.create })).toBeInTheDocument();
  });
});
