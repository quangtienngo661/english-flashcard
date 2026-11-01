import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../staff/test-utils';
import { problem, type Route } from '../../../auth/test-support';
import { evalRun, succeeded } from '../prompt-test-support';
import vi from '../../../../messages/vi.json';
import { configRoutes, configView, configsView, draftView, publishCheck, FAKE_OK, modelRow, RUN_ID, URL } from './config-test-support';

const root = '/v1/admin/ai/configs/generate_cloze/drafts';
const draft = () => draftView({ name: 'Thử ngữ cảnh' });
function routes(over: Record<string, Route> = {}) {
  return configRoutes({
    [`GET ${root}?page_size=20`]: () => Response.json({ items: [draft()], next_page_token: null }),
    [`GET ${root}/C4`]: () => Response.json(draft()),
    [`GET ${root}/C4/publish-check`]: () => Response.json(publishCheck()),
    [`GET ${root}/C4/revisions?page_size=20`]: () => Response.json({ items: [], next_page_token: null }),
    [URL.runs()]: () => Response.json({ items: [], next_page_token: null }),
    ...over,
  });
}

describe('AI workspace', () => {
  it('lists plural drafts, pages them, and keeps live independent of draft navigation', async () => {
    const r = renderApp('/ai/configs?op=generate_cloze', routes({
      [`GET ${root}?page_size=20`]: () => Response.json({ items: [draft()], next_page_token: 'next' }),
      [`GET ${root}?page_size=20&page_token=next`]: () => Response.json({ items: [draftView({ id: 'C5', name: 'Hướng khác' })], next_page_token: null }),
    }));
    await screen.findByRole('link', { name: 'Thử ngữ cảnh' });
    const live = screen.getByRole('complementary', { name: 'Bản đang chạy' });
    expect(within(live).queryByRole('button', { name: 'Tạo nháp' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tải thêm' }));
    await screen.findByRole('link', { name: 'Hướng khác' });
    await userEvent.click(screen.getByRole('link', { name: 'Thử ngữ cảnh' }));
    await screen.findByLabelText('Tên nháp');
    expect(screen.getByRole('complementary', { name: 'Bản đang chạy' })).toBe(live);
    expect(r.router.state.location).toMatchObject({ pathname: '/ai/configs/drafts/C4', search: '?op=generate_cloze' });
    expect(r.calls.some(c => c.path.endsWith('/draft'))).toBe(false);
  });

  it('shows the last quick-test from the draft list response without loading unrelated eval pages', async () => {
    const r = renderApp('/ai/configs', routes({
      [`GET ${root}?page_size=20`]: () => Response.json({ items: [{ ...draft(), last_run: {
        id: 'BT-last', kind: 'test', status: 'finished', model: 'fake:quick', total: 3, config_id: 'C4', config_version: 2,
        fingerprint: 'quick-fingerprint', source_id: null, provider: 'fake', created_at: '2026-11-01T00:00:00Z', started_at: null, finished_at: null,
      } }], next_page_token: null }),
    }));
    await screen.findByText('fake:quick');
    expect(screen.getByRole('link', { name: vi.ai.workspace.batch })).toHaveAttribute('href', '/ai/costs?batch=BT-last');
    expect(r.calls.some(call => call.path.startsWith('/v1/admin/ai/eval/runs?'))).toBe(false);
  });

  it('creates a named draft using the plural API', async () => {
    const r = renderApp('/ai/configs', routes({ [`POST ${root}`]: () => Response.json(draft()) }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo nháp' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByLabelText('Tên nháp')); await userEvent.paste('Phiên bản mới');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo nháp' }));
    await screen.findByLabelText('Lời dặn', {}, { timeout: 4000 });
    expect(r.calls.find(c => c.method === 'POST' && c.path === root)?.body).toEqual({ name: 'Phiên bản mới' });
    expect(r.calls.find(c => c.method === 'POST' && c.path === root)?.headers['Idempotency-Key']).toBeTruthy();
  });

  it('quick tests the unsaved snapshot, shows its frozen content/model/cost and never autosaves', async () => {
    const r = renderApp('/ai/configs/drafts/C4?op=generate_cloze', routes({
      [URL.models]: () => Response.json({ items: [FAKE_OK, modelRow('M2', 'fake', 'fake:alt')] }),
      [`POST ${root}/C4/test`]: () => Response.json({ items: [succeeded('go')], batch_id: 'B1', fingerprint: 'fp-test' }),
    }));
    const box = await screen.findByLabelText('Lời dặn', {}, { timeout: 4000 });
    await userEvent.clear(box); await userEvent.click(box); await userEvent.paste('Unsaved experiment');
    await userEvent.click(screen.getByRole('button', { name: /Model$/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Fake · fake:alt' }));
    await userEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    await screen.findByRole('heading', { name: /fake:alt/ });
    await screen.findByText('fp-test');
    expect(r.calls.find(c => c.path.endsWith('/C4/test'))?.body).toMatchObject({ snapshot: { instructions: 'Unsaved experiment', model_ref: 'M2' } });
    expect(r.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
    expect(screen.getByRole('link', { name: /batch/i })).toHaveAttribute('href', '/ai/costs?batch=B1');
    expect(screen.getAllByText(/0.00010000/)[0]).toBeInTheDocument();
    await userEvent.clear(box); await userEvent.click(box); await userEvent.paste('Next experiment');
    expect(screen.getByText('Unsaved experiment')).toBeInTheDocument();
  });

  it('eval sends temporary target with unsaved model settings and does not save', async () => {
    const r = renderApp('/ai/configs/drafts/C4?op=generate_cloze', routes({
      [URL.startRun]: () => Response.json({ run_id: RUN_ID, status: 'queued', judge_pass_id: null }),
      [URL.run()]: () => Response.json(evalRun({ batch_id: 'BE', fingerprint: 'eval-fp' })),
    }));
    const box = await screen.findByLabelText('Lời dặn', {}, { timeout: 4000 });
    await userEvent.clear(box); await userEvent.click(box); await userEvent.paste('Temporary eval');
    await userEvent.click(screen.getByRole('button', { name: 'Chạy bộ ví dụ với nháp' }));
    await waitFor(() => expect(r.calls.some(c => c.path === '/v1/admin/ai/eval/runs' && c.method === 'POST')).toBe(true));
    expect(r.calls.find(c => c.path === '/v1/admin/ai/eval/runs' && c.method === 'POST')?.body).toMatchObject({ operation: 'generate_cloze', set_id: 'S2', target: { kind: 'temporary', draft_id: 'C4', content: { instructions: 'Temporary eval', model_ref: 'M1' } } });
    expect(r.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  });

  it('dirty publish is blocked until saving and a fresh check supplies evidence', async () => {
    let version = 0;
    const r = renderApp('/ai/configs/drafts/C4?op=generate_cloze', routes({
      [`PUT ${root}/C4`]: c => { version = 1; return Response.json(draftView({ ...(c.body as object), version, name: 'Thử ngữ cảnh' })); },
      [`GET ${root}/C4/publish-check`]: () => Response.json(publishCheck({ draft: { id: 'C4', number: 4, version } })),
      [`POST ${root}/C4/publish`]: () => Response.json(configsView({ live: configView({ id: 'C4', number: 4 }) })),
    }));
    const box = await screen.findByLabelText('Lời dặn', {}, { timeout: 4000 });
    await userEvent.clear(box); await userEvent.click(box); await userEvent.paste('New saved content');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(r.calls.some(c => c.path.endsWith('/C4/publish') && c.method === 'POST')).toBe(true));
    expect(r.calls.find(c => c.path.endsWith('/C4/publish') && c.method === 'POST')?.body).toMatchObject({ expected_version: 1, candidate_run_id: 'RC' });
    expect(r.calls.filter(c => c.path.endsWith('/C4/publish-check')).length).toBeGreaterThanOrEqual(2);
  });

  it('retains unsaved edits on version conflict and reads the same draft ID', async () => {
    const r = renderApp('/ai/configs/drafts/C4', routes({ [`PUT ${root}/C4`]: () => problem(409, 'draft-version-conflict') }));
    const box = await screen.findByLabelText('Lời dặn', {}, { timeout: 4000 });
    await userEvent.clear(box); await userEvent.click(box); await userEvent.paste('Keep me');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await screen.findByText(/vừa được người khác sửa/i);
    expect(box).toHaveValue('Keep me');
    expect(r.count('GET', `${root}/C4`)).toBeGreaterThanOrEqual(2);
  });

  it('opens dev selection in a dialog, caps selection at five, and keeps picks across filters and reopening', async () => {
    const r = renderApp('/ai/configs/drafts/C4', routes({
      [URL.examples()]: () => Response.json({ items: [
        ...Array.from({ length: 6 }, (_, i) => ({ id: `E${i}`, split: 'dev', input: { word: `word${i}`, level: i === 5 ? 'B2' : 'A1' } })),
        { id: 'held-secret', split: 'held_out' },
      ] }),
      [`POST ${root}/C4/test`]: () => Response.json({ items: [succeeded('go')] }),
    }));
    await screen.findByLabelText('Lời dặn', {}, { timeout: 4000 });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Chọn từ dev' }));
    const dialog = await screen.findByRole('dialog', { name: vi.ai.prompts.test.pick });
    const checkboxes = await within(dialog).findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6);
    for (const checkbox of checkboxes.slice(0, 5)) await userEvent.click(checkbox);
    expect(checkboxes[5]).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Tìm ví dụ dev'), 'word5');
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(dialog).getByRole('checkbox')).toBeDisabled();
    expect(dialog).not.toHaveTextContent('held-secret');
    await userEvent.click(within(dialog).getByRole('button', { name: vi.common.close }));
    await userEvent.click(screen.getByRole('button', { name: 'Chọn từ dev' }));
    const reopened = await screen.findByRole('dialog');
    await userEvent.clear(within(reopened).getByLabelText('Tìm ví dụ dev'));
    expect(within(reopened).getAllByRole('checkbox').filter(box => (box as HTMLInputElement).checked)).toHaveLength(5);
    await userEvent.click(within(reopened).getByRole('button', { name: /Trình độ$/ }));
    await userEvent.click(screen.getByRole('option', { name: 'B2' }));
    expect(within(reopened).getAllByRole('checkbox')).toHaveLength(1);
    await userEvent.click(within(reopened).getByRole('button', { name: vi.common.close }));
    await userEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    await waitFor(() => expect(r.calls.some(call => call.path.endsWith('/C4/test'))).toBe(true));
    expect(r.calls.find(call => call.path.endsWith('/C4/test'))?.body).toMatchObject({ example_ids: ['E0', 'E1', 'E2', 'E3', 'E4'] });
  });

  it('history has exactly two tabs and pages saved content even when configs are deleted or published', async () => {
    const revision = { id: 'REV1', config_id: 'gone', operation: 'generate_cloze', config_number: 21, config_status: 'deleted', config_deleted_at: '2026-10-16T02:12:00.000Z', name: 'Thử trước khi xóa', version: 3,
      content: { instructions: 'Deleted draft instructions', examples: [], model_ref: 'M-old', effort: 'high', thinking: 'off', max_output_tokens: 3456 }, fingerprint: 'frozen-fp', note: 'Kept note',
      saved_by_user: { id: 'u9', email: 'lan@wordmet.com', system: false }, saved_at: '2026-10-15T02:12:00.000Z' };
    const r = renderApp('/ai/configs/history?op=generate_cloze', routes({
      'GET /v1/admin/ai/configs/generate_cloze/revisions?page_size=20': () => Response.json({ items: [revision], next_page_token: 'next+/=' }),
      'GET /v1/admin/ai/configs/generate_cloze/revisions?page_size=20&page_token=next%2B%2F%3D': () => Response.json({ items: [{ ...revision, id: 'REV2', config_id: 'published', config_number: 22, config_status: 'published', config_deleted_at: null, name: 'Đã publish', content: { ...revision.content, instructions: 'Published prompt' } }], next_page_token: null }),
    }));
    await screen.findByRole('tab', { name: 'Lịch sử prompt' });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await userEvent.click(screen.getByRole('tab', { name: 'Lịch sử prompt' }));
    const section = await screen.findByRole('region', { name: 'Các lần lưu nháp' });
    await userEvent.click(await within(section).findByText(/Thử trước khi xóa/));
    expect(within(section).getByText('Deleted draft instructions')).toBeInTheDocument();
    expect(within(section).getByText('frozen-fp')).toBeInTheDocument();
    expect(section).toHaveTextContent('M-old');
    expect(section).toHaveTextContent('3456');
    expect(section).toHaveTextContent('lan@wordmet.com');
    await screen.findByRole('heading', { name: vi.ai.configs.oldPrompts });
    await userEvent.click(within(section).getByRole('button', { name: 'Tải thêm' }));
    await within(section).findByText(/Đã publish/);
    expect(r.calls.some(call => call.path.includes('/drafts'))).toBe(false);
  });
});
