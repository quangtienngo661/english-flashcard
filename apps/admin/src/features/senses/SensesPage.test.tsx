import { configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

// These pages mount the whole app (session, shell, several queries): the first render can pass 1 s on a busy machine.
configure({ asyncUtilTimeout: 4000 });

const s = vi.senses;
const page = (items: unknown[], next: string | null = null) => () => Response.json({ items, next_page_token: next });
const row = (id: string, over: Record<string, unknown> = {}) => ({
  sense_id: id, context_label: null, state: 'open', live_revision_id: null, replaces_sense_id: null, revision: 2, status: 'draft',
  entry_id: `e-${id}`, lemma: `word${id}`, pos: 'noun', displayed_level: 'B1', conflict: false,
  content: { gloss_vi: `nghĩa ${id}`, definition_en: null, examples_en: [], topics: [], accepted_forms: [] }, missing: [],
  ...over,
});
const LIST = 'GET /v1/admin/content/senses?page_size=20';
const base = {
  'GET /v1/admin/taxonomy/topics': () => Response.json({ items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] }),
  'GET /v1/admin/content/uploads?page_size=20': page([]),
};
const EDITOR_NO_PUBLISH = makeMe({ id: 'me-2', staff_role: 'editor', permissions: ['content.edit', 'content.import', 'taxonomy.manage'] });

afterEach(() => sessionStorage.clear());

async function pick(...words: string[]) {
  const table = await screen.findByRole('table');
  for (const word of words) await userEvent.click(within(table).getByRole('checkbox', { name: s.bulk.pick.replace('{word}', `${word} · noun`) }));
}

describe('SensesPage (A/88)', () => {
  it('filters in the URL reach the API; column Thiếu reads missing on any filter', async () => {
    const want = 'GET /v1/admin/content/senses?status=open_draft&level=B1&pos=noun&topic=food&page_size=20';
    renderApp('/senses?status=open_draft&level=B1&pos=noun&topic=food', {
      ...base,
      [want]: page([row('1', { missing: ['gloss-missing', 'example-missing'] })]),
    });
    const r = (await screen.findAllByText('word1'))[0].closest('tr, [data-testid="card"]') as HTMLElement;
    expect(within(r).getByText('nghĩa tiếng Việt · câu ví dụ')).toBeInTheDocument();
    expect(within(r).getByText(s.status.draft)).toBeInTheDocument();
  });

  const bulkRoutes = (sent: Record<string, unknown>) => ({
    ...base,
    [LIST]: page([row('1'), row('2', { revision: 5 })]),
    'POST /v1/admin/content/senses/review': (call: Call) => ((sent.review = call.body), Response.json({ items: [
      { sense_id: '1', ok: true }, { sense_id: '2', ok: false, reason: 'stale-revision' },
    ] })),
    'POST /v1/admin/content/senses/publish': (call: Call) => ((sent.publish = call.body), Response.json({ results: [
      { sense_id: '1', outcome: 'published' }, { sense_id: '2', outcome: 'refused', reason: 'publish-incomplete', violations: ['gloss-missing'] },
    ] })),
    'POST /v1/admin/content/senses/retire': (call: Call) => ((sent.retire = call.body), Response.json({ results: [{ sense_id: '1', ok: true }] })),
  });

  it('review sends each row with its own revision; the result shows successes and each failure with its reason', async () => {
    const sent: Record<string, unknown> = {};
    renderApp('/senses', bulkRoutes(sent));
    await pick('word1', 'word2');
    const bar = screen.getByRole('region', { name: s.bulk.region });
    expect(within(bar).getByText('Đã chọn 2 nghĩa')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: s.bulk.actions.review }));
    const dialog = await screen.findByRole('dialog', { name: s.bulk.resultTitle });
    expect(sent.review).toEqual({ items: [{ sense_id: '1', revision: 2, action: 'reviewed' }, { sense_id: '2', revision: 5, action: 'reviewed' }] });
    expect(within(dialog).getByText('1 nghĩa thành công · 1 nghĩa không làm được')).toBeInTheDocument();
    expect(within(dialog).getByText(s.bulk.reasons['stale-revision'])).toBeInTheDocument();
  });

  it('publish: a refused row shows publish-incomplete with its missing parts', async () => {
    const sent: Record<string, unknown> = {};
    renderApp('/senses', bulkRoutes(sent));
    await pick('word1', 'word2');
    await userEvent.click(within(screen.getByRole('region', { name: s.bulk.region })).getByRole('button', { name: s.bulk.actions.publish }));
    const dialog = await screen.findByRole('dialog', { name: s.bulk.resultTitle });
    expect(sent.publish).toEqual({ items: [{ sense_id: '1', revision: 2 }, { sense_id: '2', revision: 5 }] });
    expect(within(dialog).getByText('Còn thiếu nội dung: nghĩa tiếng Việt')).toBeInTheDocument();
  });

  it('retire asks first, then sends the ids', async () => {
    const sent: Record<string, unknown> = {};
    renderApp('/senses', bulkRoutes(sent));
    await pick('word1');
    await userEvent.click(within(screen.getByRole('region', { name: s.bulk.region })).getByRole('button', { name: s.bulk.actions.retire }));
    const ask = await screen.findByRole('dialog', { name: 'Ngừng dùng 1 nghĩa?' });
    await userEvent.click(within(ask).getByRole('button', { name: s.bulk.actions.retire }));
    await waitFor(() => expect(sent.retire).toEqual({ sense_ids: ['1'] }));
  });

  it('without content.publish only review and reject are offered', async () => {
    renderApp('/senses', { ...base, [LIST]: page([row('1')]) }, EDITOR_NO_PUBLISH);
    await pick('word1');
    const bar = screen.getByRole('region', { name: s.bulk.region });
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual([s.bulk.actions.review, s.bulk.actions.reject]);
  });
});

const detail = (over: Record<string, unknown> = {}) => ({
  ...row('d1', { lemma: 'deploy', pos: 'verb', live_revision_id: 'r1', revision: 3, status: 'draft',
    content: { gloss_vi: 'triển khai', definition_en: 'to move software', examples_en: ['We deploy on Friday.'], topics: ['food'], accepted_forms: ['deploys'] } }),
  reviewed_by: null, reviewed_at: null, published_by: null,
  state_changed_by: { id: 'u1', email: 'an.admin@wordmet.com' }, state_changed_at: '2026-10-18T03:05:00.000Z',
  ...over,
});
const GET_D = 'GET /v1/admin/content/senses/d1';

describe('SenseDetail (A/88b, design §6.12)', () => {
  it('a new draft after publish: "Bản nháp chưa review", no "Publish: —"; the state change names its action from state', async () => {
    renderApp('/senses/d1', { ...base, [GET_D]: () => Response.json(detail()) });
    expect(await screen.findByText(s.detail.notReviewed)).toBeInTheDocument();
    expect(screen.queryByText(/^Publish:/)).toBeNull();
    expect(screen.getByText(/Đổi trạng thái gần nhất: an\.admin@wordmet\.com · publish · /)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vi.nav.senses);
    expect(screen.getByText(/Đã publish, có bản sửa mở/)).toBeInTheDocument();
  });

  it('review and publish lines with their email; unpublished reads "gỡ khỏi app"', async () => {
    renderApp('/senses/d1', { ...base, [GET_D]: () => Response.json(detail({
      state: 'unpublished', status: 'published', reviewed_by: { id: 'u2', email: 'lan.editor@wordmet.com' }, reviewed_at: '2026-10-18T02:12:00.000Z',
      published_by: { id: 'u1', email: 'an.admin@wordmet.com' },
    })) });
    expect(await screen.findByText(/^Review: lan\.editor@wordmet\.com · /)).toBeInTheDocument();
    expect(screen.getByText('Publish: an.admin@wordmet.com')).toBeInTheDocument();
    expect(screen.getByText(/· gỡ khỏi app ·/)).toBeInTheDocument();
  });

  it('Lưu bản nháp sends revision and content; ≤ 3 examples; a dropped archived topic is named in a toast', async () => {
    let body: unknown;
    renderApp('/senses/d1', {
      ...base, [GET_D]: () => Response.json(detail()),
      'PUT /v1/admin/content/senses/d1/draft': (call: Call) => ((body = call.body), Response.json({ sense_id: 'd1', revision: 4, dropped_topics: ['old-topic'] })),
    });
    const gloss = await screen.findByLabelText(s.detail.gloss);
    await userEvent.clear(gloss);
    await userEvent.type(gloss, 'triển khai (phần mềm)');
    await userEvent.click(screen.getByRole('button', { name: s.detail.addExample }));
    await userEvent.click(screen.getByRole('button', { name: s.detail.addExample }));
    expect(screen.queryByRole('button', { name: s.detail.addExample })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: s.detail.saveDraft }));
    await waitFor(() => expect(body).toEqual({ revision: 3, content: {
      gloss_vi: 'triển khai (phần mềm)', definition_en: 'to move software', examples_en: ['We deploy on Friday.'], topics: ['food'], accepted_forms: ['deploys'],
    } }));
    expect(await screen.findByText('Đã bỏ chủ đề đã lưu trữ: old-topic')).toBeInTheDocument();
  });

  it('stale-revision → the copy and [Tải lại]; 422 publish-incomplete → errors on the fields, the first focused', async () => {
    let attempt = 0;
    renderApp('/senses/d1', {
      ...base, [GET_D]: () => Response.json(detail({ content: { gloss_vi: null, definition_en: null, examples_en: [], topics: [], accepted_forms: [] } })),
      'POST /v1/admin/content/senses/d1/quick-publish': () =>
        ++attempt === 1 ? problem(409, 'stale-revision') : problem(422, 'publish-incomplete', { violations: ['gloss-missing', 'example-missing'] }),
    });
    await screen.findByLabelText(s.detail.gloss);
    await userEvent.click(screen.getByRole('button', { name: s.detail.savePublish }));
    expect(await screen.findByText(s.detail.stale)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: s.detail.reload })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: s.detail.savePublish }));
    await waitFor(() => expect(screen.getByLabelText(s.detail.gloss)).toHaveFocus(), { timeout: 3000 });
    expect(screen.getByLabelText(s.detail.gloss)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Câu ví dụ 1')).toHaveAttribute('aria-invalid', 'true');
  });

  it('§4.6: a draft kept from an ended session is offered back', async () => {
    sessionStorage.setItem('wordmet-admin.draft.me-1.sense:d1', JSON.stringify({
      gloss_vi: 'bản giữ lại', definition_en: '', examples_en: [''], topics: [], accepted_forms: '',
    }));
    renderApp('/senses/d1', { ...base, [GET_D]: () => Response.json(detail()) });
    await userEvent.click(await screen.findByRole('button', { name: vi.draft.restore }));
    expect(screen.getByLabelText(s.detail.gloss)).toHaveValue('bản giữ lại');
  });

  it('an unknown id says not found', async () => {
    renderApp('/senses/d1', { ...base, [GET_D]: () => problem(404, 'not-found') });
    expect(await screen.findByText(s.detail.notFound)).toBeInTheDocument();
  });
});
