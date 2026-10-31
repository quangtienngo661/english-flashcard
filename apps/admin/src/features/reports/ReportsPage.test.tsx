import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';

const t = vi.reports;
const LIST = 'GET /v1/admin/practice/reports?status=open&page_size=20';
const REASONS = 'GET /v1/admin/practice/report-reasons';
const ID = '5b1f0000-0000-4000-8000-0000000000a1';
const ONE = `GET /v1/admin/practice/reports/${ID}`;
const RESOLVE = `POST /v1/admin/practice/reports/${ID}/resolve`;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const EDITOR = makeMe({ staff_role: 'editor', permissions: ['content.edit'] });

const reasons = {
  items: [
    { code: 'wrong_meaning', label_vi: 'Nghĩa sai', label_en: 'Wrong meaning', refundable: true, active: true, position: 1 },
    { code: 'other', label_vi: 'Khác', label_en: 'Other', refundable: false, active: true, position: 1000 },
  ],
};

const MASK = '[nghĩa của từ riêng]';
const mcqSnapshot = (learner: Record<string, unknown>, options = ['máy chủ', MASK, 'bộ nhớ đệm', MASK]) => ({
  type: 'mcq_definition',
  prompt: { kind: 'mcq', meaning: 'a computer that serves', meaning_language: 'en', context_label: null, options },
  correct: { lemma: 'server', meaning: 'máy chủ', definition_en: null, option_index: 0 },
  hints_shown: { level1: null, level2: null, level3: null },
  learner: { answer: MASK, answers_tried: [], result: 'wrong', hint_level: 0, ...learner },
});

const report = (over: Record<string, unknown> = {}) => ({
  id: ID, sense_id: 's1', reason: 'wrong_meaning', reason_label: 'Nghĩa sai', note: null, status: 'open',
  question_snapshot: mcqSnapshot({ option_index: 3 }), created_at: '2026-10-18T09:00:00.000Z', resolved_at: null, resolved_by: null,
  resolved_by_role: null, resolved_by_user: null, refundable: true, question_source: 'rule', ai_operation_id: null, call_operation_id: null,
  model: null, prompt_revision: null, ai_charged: false, refunded: null, ...over,
});
const aiReport = (over: Record<string, unknown> = {}) =>
  report({ question_source: 'ai', ai_operation_id: 'op-1', call_operation_id: 'call-1', model: 'gpt-x', prompt_revision: 3, ai_charged: true, ...over });
const page = (items: unknown[]) => ({ items, next_page_token: null });
const resolves = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path.endsWith('/resolve'));
const DONE = { resolved_by_role: 'editor', resolved_at: '2026-10-18T11:02:00.000Z' };

function open(routes: Record<string, (c: Call) => Response | Promise<Response>>, path = `/reports/${ID}`, me?: ReturnType<typeof makeMe>) {
  return renderApp(path, { [LIST]: () => json(page([report()])), [REASONS]: () => json(reasons), ...routes }, me);
}

describe('reports list', { timeout: 20_000 }, () => {
  it('§6.8: the default request has status=open and the empty list says "Không còn báo lỗi chưa xử lý."', async () => {
    const r = renderApp('/reports', { [LIST]: () => json(page([])), [REASONS]: () => json(reasons) });
    expect(await screen.findByText(t.empty)).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/practice/reports?status=open&page_size=20')).toBe(1);
  });

  it('§6.8: columns show the word from the snapshot, the type and the reason (+ the admin-language label when different)', async () => {
    renderApp('/reports', {
      [LIST]: () => json(page([report({ reason_label: 'Wrong meaning' })])), [REASONS]: () => json(reasons),
    });
    expect((await screen.findAllByText('server')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t.types.mcq_definition).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Wrong meaning').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nghĩa sai').length).toBeGreaterThan(0);
  });

  it('§6.8: closed, the table has all eight columns; with a report open only Từ, Lý do and Trạng thái stay', async () => {
    const headers = () => screen.queryAllByRole('columnheader').map((h) => h.textContent);
    const all = [t.cols.word, t.cols.type, t.cols.reason, t.cols.source, t.cols.note, t.cols.sentAt, t.cols.status, t.cols.resolvedBy];
    const closed = renderApp('/reports', { [LIST]: () => json(page([report()])), [REASONS]: () => json(reasons) });
    await waitFor(() => expect(headers()).toEqual(all));
    closed.unmount();
    open({ [ONE]: () => json(report()) });
    await waitFor(() => expect(headers()).toEqual([t.cols.word, t.cols.reason, t.cols.status]));
  });

  it('§6.8: the filters go into the request (status, reason, source)', async () => {
    const url = '/v1/admin/practice/reports?status=confirmed&reason=other&source=ai&page_size=20';
    const r = renderApp('/reports?status=confirmed&reason=other&source=ai', {
      [`GET ${url}`]: () => json(page([])),
      [REASONS]: () => json(reasons),
    });
    await waitFor(() => expect(r.count('GET', url)).toBe(1));
  });

  it('§6.8: an editor sees the reason filter (the reasons endpoint is open to content.edit)', async () => {
    renderApp('/reports', { [LIST]: () => json(page([])), [REASONS]: () => json(reasons) }, EDITOR);
    expect(await screen.findByRole('button', { name: new RegExp(t.filters.reason) })).toBeInTheDocument();
  });
});

describe('report detail', { timeout: 20_000 }, () => {
  it('§6.8: an unknown id says "Không tìm thấy báo lỗi này." with a link back to the list', async () => {
    open({ [ONE]: () => problem(404, 'not-found') });
    expect(await screen.findByText(t.detail.notFound)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.detail.backToList })).toHaveAttribute('href', '/reports');
  });

  it('a report id that is not a UUID says not found without calling the API', async () => {
    const r = open({}, '/reports/not-a-uuid');
    expect(await screen.findByText(t.detail.notFound)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.detail.backToList })).toHaveAttribute('href', '/reports');
    expect(r.calls.filter((c) => c.path.includes('/reports/not-a-uuid'))).toHaveLength(0);
  });

  it('§6.8: an ordinary question offers [Không có lỗi] and [Đã sửa], never "Xác nhận lỗi"', async () => {
    open({ [ONE]: () => json(report()) });
    expect(await screen.findByRole('button', { name: t.actions.noError })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t.actions.fixed })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.actions.confirmed })).toBeNull();
    expect(screen.queryByText(t.actions.refundLine)).toBeNull();
  });

  it('§6.8: an AI question offers [Không có lỗi] and [Xác nhận lỗi] and links to the call by call_operation_id', async () => {
    open({ [ONE]: () => json(aiReport()) });
    expect(await screen.findByRole('button', { name: t.actions.confirmed })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.actions.fixed })).toBeNull();
    expect(screen.getByRole('link', { name: t.detail.openCall })).toHaveAttribute('href', '/ai/calls?operation_id=call-1');
    expect(screen.getByText('gpt-x')).toBeInTheDocument();
  });

  it('§6.8: the refund line shows when ai_charged, ai_operation_id and refundable all hold; an editor sees it too', async () => {
    open({ [ONE]: () => json(aiReport()) }, `/reports/${ID}`, EDITOR);
    expect(await screen.findByText(t.actions.refundLine)).toBeInTheDocument();
  });

  it.each([
    ['not charged', { ai_charged: false }],
    ['no operation id', { ai_operation_id: null }],
    ['reason not refundable', { refundable: false }],
  ])('§6.8: no refund line when %s', async (_name, over) => {
    open({ [ONE]: () => json(aiReport(over)) });
    await screen.findByRole('button', { name: t.actions.confirmed });
    expect(screen.queryByText(t.actions.refundLine)).toBeNull();
  });

  it('§6.8: there is no "Người học đồng ý cho xem từ này" label (AD5)', async () => {
    open({ [ONE]: () => json(aiReport()) });
    await screen.findByRole('button', { name: t.actions.confirmed });
    expect(screen.queryByText(/đồng ý cho xem/i)).toBeNull();
  });

  it('§6.8: two masked options without option_index → "Không rõ lựa chọn nào"', async () => {
    open({ [ONE]: () => json(report({ question_snapshot: mcqSnapshot({ option_index: undefined }) })) });
    expect(await screen.findByText(t.detail.unclearOption)).toBeInTheDocument();
  });

  it('§6.8: with option_index the chosen option is marked, even when two options are masked', async () => {
    open({ [ONE]: () => json(report()) });
    const marked = await screen.findByTestId('option-3');
    expect(within(marked).getByText(t.detail.learnerPicked)).toBeInTheDocument();
    expect(screen.queryByText(t.detail.unclearOption)).toBeNull();
    expect(within(screen.getByTestId('option-0')).getByText(t.detail.correctMark)).toBeInTheDocument();
    expect(within(screen.getByTestId('option-1')).queryByText(t.detail.learnerPicked)).toBeNull();
  });

  it('§6.8: [Xác nhận lỗi] sends status=confirmed with an Idempotency-Key and shows the refund outcome', async () => {
    const r = open({
      [ONE]: () => json(aiReport()),
      [RESOLVE]: () => json(aiReport({ status: 'confirmed', refunded: true, ...DONE })),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.actions.confirmed }));
    expect(await screen.findByText(t.detail.refunded)).toBeInTheDocument();
    const [call] = resolves(r.calls);
    expect(call!.body).toEqual({ status: 'confirmed' });
    expect(call!.headers['Idempotency-Key']).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.actions.confirmed })).toBeNull();
    await waitFor(() => expect(r.count('GET', '/v1/admin/practice/reports?status=open&page_size=20')).toBeGreaterThan(1));
  });

  it('§6.8: a confirmed report with refunded=null says the system retries every hour', async () => {
    open({ [ONE]: () => json(aiReport({ status: 'confirmed', refunded: null, ...DONE })) });
    expect(await screen.findByText(t.detail.refundPending)).toBeInTheDocument();
  });

  it('§6.8: a confirmed report with refunded=false says no unit was given back', async () => {
    open({ [ONE]: () => json(aiReport({ status: 'confirmed', refunded: false, ...DONE })) });
    expect(await screen.findByText(t.detail.notRefunded)).toBeInTheDocument();
  });

  it('§6.8: [Đã sửa] shows the line that links to the senses of the word', async () => {
    open({
      [ONE]: () => json(report()),
      [RESOLVE]: () => json(report({ status: 'fixed', ...DONE })),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.actions.fixed }));
    expect(await screen.findByText(t.detail.fixHint)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.detail.fixLink.replace('{word}', 'server') })).toHaveAttribute('href', '/senses?q=server');
  });

  it('§6.8: report-not-open shows "Báo lỗi này đã được xử lý." and reloads the report', async () => {
    let reads = 0;
    const r = open({
      [ONE]: () => json(++reads === 1 ? report() : report({ status: 'no_error', ...DONE })),
      [RESOLVE]: () => problem(409, 'report-not-open'),
    });
    await userEvent.click(await screen.findByRole('button', { name: t.actions.noError }));
    expect(await screen.findByText(vi.errors['report-not-open'])).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', `/v1/admin/practice/reports/${ID}`)).toBe(2));
    expect(screen.queryByRole('button', { name: t.actions.noError })).toBeNull();
  });

  it('§6.8: resolve-status-not-allowed shows the generic copy', async () => {
    open({ [ONE]: () => json(report()), [RESOLVE]: () => problem(409, 'resolve-status-not-allowed') });
    await userEvent.click(await screen.findByRole('button', { name: t.actions.noError }));
    expect(await screen.findByText(vi.errors['resolve-status-not-allowed'])).toBeInTheDocument();
  });

  it('an error of one button does not outlive a later press of another button that worked', async () => {
    let n = 0;
    open({
      [ONE]: () => json(aiReport()),
      [RESOLVE]: () => {
        if (++n === 1) throw new TypeError('network down');
        return json(aiReport({ status: 'confirmed', refunded: true, ...DONE }));
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: t.actions.noError }));
    expect(await screen.findByRole('button', { name: vi.common.retry })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: t.actions.confirmed }));
    expect(await screen.findByText(t.detail.refunded)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: vi.common.retry })).toBeNull();
  });

  it('§6.8: a retry after a network error keeps the Idempotency-Key', async () => {
    let n = 0;
    const r = open({
      [ONE]: () => json(report()),
      [RESOLVE]: () => {
        if (++n === 1) throw new TypeError('network down');
        return json(report({ status: 'no_error', ...DONE }));
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: t.actions.noError }));
    await userEvent.click(await screen.findByRole('button', { name: vi.common.retry }));
    await waitFor(() => expect(resolves(r.calls)).toHaveLength(2));
    const [first, second] = resolves(r.calls);
    expect(second!.headers['Idempotency-Key']).toBe(first!.headers['Idempotency-Key']);
  });
});

// Nhóm B M4-T8: a confirmed AI report can become a dev example, for an admin only (the endpoint needs settings.manage, an editor would get 403).
describe('report detail: add to the example set', { timeout: 20_000 }, () => {
  const PREVIEW = `GET /v1/admin/practice/eval-examples/from-source?report_id=${ID}`;
  const ADD = 'POST /v1/admin/practice/eval-examples/from-source';
  const FORMS = ['deploy', 'deployed', 'deploying', 'deploys'];
  const sourcePreview = (over: Record<string, unknown> = {}) => ({
    operation: 'generate_cloze', source: 'report', source_ref: ID, word: 'deploy', part_of_speech: 'verb',
    input: { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null }, rebuilt: false, expected: { forms: FORMS }, ...over,
  });
  const confirmedAi = (over: Record<string, unknown> = {}) => aiReport({ status: 'confirmed', refunded: true, ...DONE, ...over });
  const add = vi.ai.real.add;
  const sources = (calls: Call[]) => calls.filter((c) => c.path.includes('/eval-examples/from-source'));

  async function openDialog(routes: Record<string, (c: Call) => Response | Promise<Response>> = {}) {
    const r = open({ [ONE]: () => json(confirmedAi()), [PREVIEW]: () => json(sourcePreview()), ...routes });
    await userEvent.click(await screen.findByRole('button', { name: add.button }));
    const dialog = await screen.findByRole('dialog', { name: add.title });
    return { r, dialog };
  }

  it('an admin sees the button for a confirmed AI report; the dialog shows the word, the part of speech and the forms of the catalog', async () => {
    const { r, dialog } = await openDialog();
    expect(within(dialog).getByText('deploy · verb')).toBeInTheDocument();
    expect(within(dialog).getByText(add.body.replace('{operation}', vi.ai.operations.names.generate_cloze))).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label })).toHaveValue('deploy, deployed, deploying, deploys');
    expect(within(dialog).queryByText(add.rebuilt)).toBeNull();
    expect(r.count('GET', `/v1/admin/practice/eval-examples/from-source?report_id=${ID}`)).toBe(1);
  });

  it('removing a form sends the corrected list with an Idempotency-Key, shows the toast with a link to the example set and closes the dialog', async () => {
    const { r, dialog } = await openDialog({ [ADD]: () => json({ id: 'e9', operation: 'generate_cloze', rebuilt: false }, 201) });
    const box = within(dialog).getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label });
    await userEvent.clear(box);
    await userEvent.type(box, 'deploy, deployed, deploys');
    await userEvent.click(within(dialog).getByRole('button', { name: add.confirm }));
    expect(await screen.findByText(add.added)).toBeInTheDocument();
    const [call] = r.calls.filter((c) => c.method === 'POST' && c.path.includes('/from-source'));
    expect(call!.body).toEqual({ report_id: ID, expected: { forms: ['deploy', 'deployed', 'deploys'] }, note: null });
    expect(call!.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: add.title })).toBeNull());
    await userEvent.click(screen.getByRole('button', { name: add.openEval }));
    await waitFor(() => expect(r.router.state.location.pathname + r.router.state.location.search).toBe('/ai/eval?op=generate_cloze'));
  });

  it('the note is optional and sent when written', async () => {
    const { r, dialog } = await openDialog({ [ADD]: () => json({ id: 'e9', operation: 'generate_cloze', rebuilt: false }, 201) });
    await userEvent.type(within(dialog).getByRole('textbox', { name: vi.ai.eval.form.note }), '  two answers fit  ');
    await userEvent.click(within(dialog).getByRole('button', { name: add.confirm }));
    await screen.findByText(add.added);
    expect(r.calls.find((c) => c.method === 'POST' && c.path.includes('/from-source'))!.body).toMatchObject({ note: 'two answers fit' });
  });

  it('a question with no expected answer (the sentence choice) has no "Các dạng được nhận" box and sends expected null', async () => {
    const { r, dialog } = await openDialog({
      [PREVIEW]: () => json(sourcePreview({ operation: 'generate_sentence_mcq', expected: null })),
      [ADD]: () => json({ id: 'e9', operation: 'generate_sentence_mcq', rebuilt: false }, 201),
    });
    expect(within(dialog).queryByRole('textbox', { name: vi.ai.eval.form.expected.forms.label })).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: add.confirm }));
    await screen.findByText(add.added);
    expect(r.calls.find((c) => c.method === 'POST' && c.path.includes('/from-source'))!.body).toEqual({ report_id: ID, expected: null, note: null });
  });

  it('a rebuilt input says so in the dialog', async () => {
    const { dialog } = await openDialog({ [PREVIEW]: () => json(sourcePreview({ input: null, rebuilt: true })) });
    expect(within(dialog).getByText(add.rebuilt)).toBeInTheDocument();
  });

  it('422 expected-invalid: the violation lands under "Các dạng được nhận" and the dialog stays open', async () => {
    const { dialog } = await openDialog({ [ADD]: () => problem(422, 'expected-invalid', { violations: ['expected.forms: at least one form'] }) });
    await userEvent.clear(within(dialog).getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label }));
    await userEvent.click(within(dialog).getByRole('button', { name: add.confirm }));
    expect(await within(dialog).findByText('at least one form')).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText(add.added)).toBeNull();
  });

  it('409 no-input on adding says why in the dialog', async () => {
    const { dialog } = await openDialog({ [ADD]: () => problem(409, 'source-not-eligible', { reason: 'no-input' }) });
    await userEvent.click(within(dialog).getByRole('button', { name: add.confirm }));
    expect(await within(dialog).findByText(add.notEligible['no-input'])).toBeInTheDocument();
  });

  it.each([['private-word'], ['sense-gone']] as const)('a preview refused with %s shows its line and no button', async (reason) => {
    open({ [ONE]: () => json(confirmedAi()), [PREVIEW]: () => problem(409, 'source-not-eligible', { reason }) });
    expect(await screen.findByText(add.notEligible[reason])).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: add.button })).toBeNull();
  });

  it('B43: an editor sees no button and the preview is never requested', async () => {
    const r = open({ [ONE]: () => json(confirmedAi()) }, `/reports/${ID}`, EDITOR);
    expect(await screen.findByText(t.detail.refunded)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: add.button })).toBeNull();
    expect(sources(r.calls)).toHaveLength(0);
  });

  it.each([
    ['an open report', () => aiReport()],
    ['a report marked "Không có lỗi"', () => aiReport({ status: 'no_error', ...DONE })],
    ['a confirmed rule question', () => confirmedAi({ question_source: 'rule' })],
  ])('%s has no button and the preview is never requested', async (_name, make) => {
    const r = open({ [ONE]: () => json(make()) });
    await screen.findByRole('heading', { name: /^Báo lỗi · / });
    expect(screen.queryByRole('button', { name: add.button })).toBeNull();
    expect(sources(r.calls)).toHaveLength(0);
  });
});
