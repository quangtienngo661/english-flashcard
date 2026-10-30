import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { makeMe, problem, type Call } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import { judgeOnFake, judgeView } from '../judges/judge-test-support';
import { PASS_ID, RURL, realEstimate, realItem, realJudge, realPass, realRoutes } from './real-test-support';

const t = vi.ai.real;
const e = t.estimate;
const EDITOR = makeMe({ id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor', permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'] });
const selected = (n: number, limit = 200) => e.selected.replace('{selected}', String(n)).replace('{limit}', String(limit));
const startButton = (count: number) => screen.getByRole('button', { name: t.start.replace('{count}', String(count)) });
const select = (label: string) => screen.getByRole('button', { name: new RegExp(`${label}$`) });
const starts = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/admin/practice/real-judge');

async function open(over: Record<string, (c: Call) => Response | Promise<Response>> = {}, path = '/ai/real-questions') {
  const r = renderApp(path, realRoutes(over));
  await screen.findByRole('heading', { level: 1, name: vi.nav.aiRealQuestions }, { timeout: 4000 });
  return r;
}

beforeEach(() => sessionStorage.clear());

describe('RealQuestionsPage: choosing what to judge (nhóm B M4-T9)', { timeout: 20_000 }, () => {
  it('asks the estimate of the first judge with a model and its first operation, and says how many, what was skipped and that the cost is unknown', async () => {
    const r = await open();
    expect(await screen.findByText(selected(3))).toBeInTheDocument();
    expect(screen.getByText(e.skippedPrivate.replace('{count}', '1'))).toBeInTheDocument();
    expect(screen.getByText(e.costUnknown)).toBeInTheDocument();
    expect(screen.queryByText(/^Còn \d+ câu chưa chấm/)).toBeNull();
    expect(screen.queryByText(/hết hạn giữ nội dung/)).toBeNull();
    expect(r.count('GET', '/v1/admin/practice/real-judge/estimate?judge_id=J1&operation=generate_cloze')).toBe(1);
    expect(screen.getByText(t.note)).toBeInTheDocument();
  });

  it('every line of the estimate: what remains, what was skipped for each reason, the cost and the day\'s cap', async () => {
    await open({
      [RURL.estimate()]: () => Response.json(realEstimate({
        selected: 200, remaining: 41, skipped: { private_word: 2, no_content: 5, already_judged: 7 }, estimate_usd: 0.0123, admin_usd_cap: 2,
      })),
    });
    expect(await screen.findByText(selected(200))).toBeInTheDocument();
    expect(screen.getByText(e.remaining.replace('{remaining}', '41'))).toBeInTheDocument();
    expect(screen.getByText(e.skippedPrivate.replace('{count}', '2'))).toBeInTheDocument();
    expect(screen.getByText(e.skippedNoContent.replace('{count}', '5'))).toBeInTheDocument();
    expect(screen.getByText(e.skippedJudged.replace('{count}', '7'))).toBeInTheDocument();
    expect(screen.getByText(e.cost.replace('{usd}', '0,0123'))).toBeInTheDocument();
    expect(screen.getByText(e.cap.replace('{cap}', '2,00'))).toBeInTheDocument();
    expect(screen.queryByText(e.costUnknown)).toBeNull();
  });

  it('the pair select lists "Tất cả" and each pair of the window with its number of questions; picking one asks the estimate for that pair', async () => {
    const r = await open({
      [RURL.estimate('judge_id=J1&operation=generate_cloze&config_number=4&model=fake%3Aok')]: () => Response.json(realEstimate({ selected: 2 })),
    });
    await screen.findByText(selected(3));
    await userEvent.click(select(t.fields.pair));
    expect(await screen.findByRole('option', { name: t.pairAll })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'Cấu hình 4 · fake:ok (6 câu)' }));
    expect(await screen.findByText(selected(2))).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/practice/real-judge/estimate?judge_id=J1&operation=generate_cloze&config_number=4&model=fake%3Aok')).toBe(1);
  });

  it('a pair made before configs is listed but cannot be picked (the API needs a number)', async () => {
    await open({ [RURL.estimate()]: () => Response.json(realEstimate({ pairs: [{ config_number: null, model: 'old:model', questions: 2 }] })) });
    await screen.findByText(selected(3));
    await userEvent.click(select(t.fields.pair));
    expect(await screen.findByRole('option', { name: 'Trước khi có cấu hình · old:model (2 câu)' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('ticking "Chỉ tài khoản test" asks the estimate again with test_accounts_only=true and puts the pair back to "Tất cả"', async () => {
    const withPair = RURL.estimate('judge_id=J1&operation=generate_cloze&config_number=4&model=fake%3Aok');
    const testOnly = RURL.estimate('judge_id=J1&operation=generate_cloze&test_accounts_only=true');
    const r = await open({
      [withPair]: () => Response.json(realEstimate({ selected: 2 })),
      [testOnly]: () => Response.json(realEstimate({ selected: 1, skipped: { private_word: 0, no_content: 0, already_judged: 0 } })),
    });
    await screen.findByText(selected(3));
    await userEvent.click(select(t.fields.pair));
    await userEvent.click(await screen.findByRole('option', { name: 'Cấu hình 4 · fake:ok (6 câu)' }));
    await screen.findByText(selected(2));
    await userEvent.click(screen.getByRole('checkbox', { name: t.fields.testOnly }));
    expect(await screen.findByText(selected(1))).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/practice/real-judge/estimate?judge_id=J1&operation=generate_cloze&test_accounts_only=true')).toBe(1);
    expect(select(t.fields.pair)).toHaveTextContent(t.pairAll);
  });

  it('the operation select offers only the judge\'s operations among the three; another operation asks its own estimate', async () => {
    const meaning = RURL.estimate('judge_id=J1&operation=generate_meaning_question');
    await open({
      [RURL.judges]: () => Response.json({ items: [realJudge({ operations: ['generate_cloze', 'lookup_word', 'generate_meaning_question'] })] }),
      [meaning]: () => Response.json(realEstimate({ selected: 4 })),
    });
    await screen.findByText(selected(3));
    await userEvent.click(select(t.fields.operation));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([vi.ai.operations.names.generate_cloze, vi.ai.operations.names.generate_meaning_question]);
    await userEvent.click(screen.getByRole('option', { name: vi.ai.operations.names.generate_meaning_question }));
    expect(await screen.findByText(selected(4))).toBeInTheDocument();
  });

  it('a judge with no model is listed but cannot be picked; the first judge with a model is the one asked', async () => {
    const two = [judgeView({ operations: ['generate_cloze'] }), judgeOnFake({ id: 'J2', name: 'Câu tự nhiên', operations: ['generate_cloze'] })];
    const r = await open({ [RURL.judges]: () => Response.json({ items: two }), [RURL.estimate('judge_id=J2&operation=generate_cloze')]: () => Response.json(realEstimate()) });
    await screen.findByText(selected(3));
    expect(r.count('GET', '/v1/admin/practice/real-judge/estimate?judge_id=J2&operation=generate_cloze')).toBe(1);
    await userEvent.click(select(t.fields.judge));
    expect(await screen.findByRole('option', { name: 'Chỉ một đáp án (chưa chọn model)' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('no active judge for these operations: says so with a link to the Judge page and asks no estimate', async () => {
    const r = await open({ [RURL.judges]: () => Response.json({ items: [judgeOnFake({ operations: ['lookup_word'] }), judgeOnFake({ id: 'J2', active: false })] }) });
    expect(await screen.findByText(t.noJudge)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.noJudgeLink })).toHaveAttribute('href', '/ai/judges');
    expect(r.calls.filter((c) => c.path.includes('/real-judge/estimate'))).toHaveLength(0);
  });

  it.each([
    ['retention-off', e.retentionOff],
    ['no-staff', e.noStaff],
  ] as const)('reason %s says why nothing can be judged and keeps "Chấm 0 câu" off', async (reason, text) => {
    await open({ [RURL.estimate()]: () => Response.json(realEstimate({ selected: 0, reason, skipped: { private_word: 0, no_content: 0, already_judged: 0 } })) });
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(startButton(0)).toBeDisabled();
    expect(screen.queryByText(e.empty)).toBeNull();
  });

  it('nothing selected and no reason: "Không có câu nào khớp bộ lọc." and "Chấm 0 câu" is off', async () => {
    await open({ [RURL.estimate()]: () => Response.json(realEstimate({ selected: 0, skipped: { private_word: 0, no_content: 0, already_judged: 0 } })) });
    expect(await screen.findByText(e.empty)).toBeInTheDocument();
    expect(startButton(0)).toBeDisabled();
  });

  it('"Chấm 3 câu" POSTs the filters with an Idempotency-Key, opens the new pass and reads the passes again', async () => {
    let started = false;
    const r = await open({
      [RURL.start]: () => { started = true; return Response.json({ pass_id: PASS_ID, selected: 3, skipped: { private_word: 1, no_content: 0, already_judged: 0 } }, { status: 201 }); },
      [RURL.passes]: () => Response.json({ items: started ? [realPass({ status: 'queued', judged: 0 })] : [], next_page_token: null }),
      [RURL.pass()]: () => Response.json({ pass: realPass({ status: 'queued', judged: 0 }), items: [realItem({ scores: [] })] }),
    });
    await screen.findByText(selected(3));
    await userEvent.click(startButton(3));
    await waitFor(() => expect(starts(r.calls)).toHaveLength(1));
    expect(starts(r.calls)[0]!.body).toEqual({ judge_id: 'J1', operation: 'generate_cloze', config: null, test_accounts_only: false });
    expect(starts(r.calls)[0]!.headers['Idempotency-Key']).toBeTruthy();
    await waitFor(() => expect(r.router.state.location.search).toBe(`?pass=${PASS_ID}`));
    expect(await screen.findByTestId('detail-panel')).toBeInTheDocument();
    await waitFor(() => expect(r.count('GET', '/v1/admin/practice/real-judge/passes?page_size=20')).toBeGreaterThan(1));
    await waitFor(() => expect(r.count('GET', '/v1/admin/practice/real-judge/estimate?judge_id=J1&operation=generate_cloze')).toBeGreaterThan(1));
  });

  it('the start sends the picked pair and the test-account switch', async () => {
    const both = RURL.estimate('judge_id=J1&operation=generate_cloze&config_number=4&model=fake%3Aok&test_accounts_only=true');
    const r = await open({
      [RURL.estimate('judge_id=J1&operation=generate_cloze&test_accounts_only=true')]: () => Response.json(realEstimate()),
      [both]: () => Response.json(realEstimate({ selected: 2 })),
      [RURL.start]: () => Response.json({ pass_id: PASS_ID, selected: 2, skipped: { private_word: 0, no_content: 0, already_judged: 0 } }, { status: 201 }),
      [RURL.pass()]: () => Response.json({ pass: realPass(), items: [] }),
    });
    await screen.findByText(selected(3));
    await userEvent.click(screen.getByRole('checkbox', { name: t.fields.testOnly }));
    await userEvent.click(select(t.fields.pair));
    await userEvent.click(await screen.findByRole('option', { name: 'Cấu hình 4 · fake:ok (6 câu)' }));
    await screen.findByText(selected(2));
    await userEvent.click(startButton(2));
    await waitFor(() => expect(starts(r.calls)).toHaveLength(1));
    expect(starts(r.calls)[0]!.body).toEqual({ judge_id: 'J1', operation: 'generate_cloze', config: { number: 4, model: 'fake:ok' }, test_accounts_only: true });
  });

  it('409 judge-pass-running shows its sentence and keeps the page as it was', async () => {
    const r = await open({ [RURL.start]: () => problem(409, 'judge-pass-running') });
    await screen.findByText(selected(3));
    await userEvent.click(startButton(3));
    expect(await screen.findByText(vi.errors['judge-pass-running'])).toBeInTheDocument();
    expect(r.router.state.location.search).toBe('');
  });

  it('409 nothing-to-judge (the window changed since the estimate) says so', async () => {
    await open({ [RURL.start]: () => problem(409, 'nothing-to-judge', { reason: 'empty' }) });
    await screen.findByText(selected(3));
    await userEvent.click(startButton(3));
    expect(await screen.findByText(vi.errors['nothing-to-judge'])).toBeInTheDocument();
  });

  it('a network error on start offers "Thử lại" with the same Idempotency-Key', async () => {
    let n = 0;
    const r = await open({
      [RURL.start]: () => {
        if (++n === 1) throw new TypeError('network down');
        return Response.json({ pass_id: PASS_ID, selected: 3, skipped: { private_word: 1, no_content: 0, already_judged: 0 } }, { status: 201 });
      },
      [RURL.pass()]: () => Response.json({ pass: realPass(), items: [] }),
    });
    await screen.findByText(selected(3));
    await userEvent.click(startButton(3));
    await userEvent.click(await screen.findByRole('button', { name: vi.common.retry }));
    await waitFor(() => expect(starts(r.calls)).toHaveLength(2));
    expect(starts(r.calls)[1]!.headers['Idempotency-Key']).toBe(starts(r.calls)[0]!.headers['Idempotency-Key']);
  });

  it('a button that is still waiting for the estimate does not start anything', async () => {
    renderApp('/ai/real-questions', realRoutes({ [RURL.estimate()]: () => new Promise<Response>(() => {}) }));
    await screen.findByRole('heading', { level: 1, name: vi.nav.aiRealQuestions }, { timeout: 4000 });
    expect(await screen.findByRole('button', { name: t.start.replace('{count}', '0') })).toBeDisabled();
  });

  it('while the estimate of a new selection is being read the old numbers stay but "Chấm 3 câu" is off (it would start another selection)', async () => {
    const r = await open({ [RURL.estimate('judge_id=J1&operation=generate_cloze&test_accounts_only=true')]: () => new Promise<Response>(() => {}) });
    await screen.findByText(selected(3));
    expect(startButton(3)).toBeEnabled();
    await userEvent.click(screen.getByRole('checkbox', { name: t.fields.testOnly }));
    await waitFor(() => expect(r.count('GET', '/v1/admin/practice/real-judge/estimate?judge_id=J1&operation=generate_cloze&test_accounts_only=true')).toBe(1));
    expect(screen.getByText(selected(3))).toBeInTheDocument();
    expect(startButton(3)).toBeDisabled();
    expect(starts(r.calls)).toHaveLength(0);
  });

  it('an editor has no access (the entry needs settings.manage) and nothing is read', async () => {
    const r = renderApp('/ai/real-questions', realRoutes(), EDITOR);
    expect(await screen.findByText(vi.noAccess.title, undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(r.calls.filter((c) => c.path.includes('/real-judge') || c.path === '/v1/admin/ai/judges')).toHaveLength(0);
  });
});

describe('RealQuestionsPage: the passes', { timeout: 20_000 }, () => {
  const rows = () => within(screen.getByRole('table'));

  it('with no pass yet the list says "Chưa có lượt chấm nào."', async () => {
    await open();
    expect(await screen.findByText(t.passes.empty)).toBeInTheDocument();
  });

  it('each pass is a line with its status; a stopped pass says why under it', async () => {
    await open({
      [RURL.passes]: () => Response.json({
        items: [
          realPass({ id: 'bbbbbbbb-0000-4000-8000-000000000002', status: 'failed', error: 'admin-usd-cap', judged: 1, cost_usd: null }),
          realPass({ status: 'finished' }),
        ],
        next_page_token: null,
      }),
    });
    await screen.findByRole('table');
    expect(rows().getByText('15/10/2026 09:12 · Chỉ một đáp án bản 2 · Sinh câu điền từ · 3/3 · 0,003 USD')).toBeInTheDocument();
    expect(rows().getByText('15/10/2026 09:12 · Chỉ một đáp án bản 2 · Sinh câu điền từ · 1/3')).toBeInTheDocument();
    expect(rows().getByText(vi.ai.eval.detail.judge.statuses.finished)).toBeInTheDocument();
    expect(rows().getByText(vi.ai.eval.detail.judge.statuses.failed)).toBeInTheDocument();
    expect(rows().getByText(vi.ai.eval.detail.judge.errors['admin-usd-cap'])).toBeInTheDocument();
  });

  it('opening a pass puts it in the address and shows its results beside the list; closing takes it out', async () => {
    const r = await open({
      [RURL.passes]: () => Response.json({ items: [realPass()], next_page_token: null }),
      [RURL.pass()]: () => Response.json({ pass: realPass(), items: [realItem()] }),
    });
    const link = await within(await screen.findByRole('table')).findByRole('link', { name: /15\/10\/2026 09:12 · Chỉ một đáp án bản 2/ });
    await userEvent.click(link);
    await waitFor(() => expect(r.router.state.location.search).toBe(`?pass=${PASS_ID}`));
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByRole('heading', { level: 2, name: 'Lượt chấm · 15/10/2026 09:12' })).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: vi.common.close }));
    await waitFor(() => expect(r.router.state.location.search).toBe(''));
  });

  it('a pass that is queued or running is read again every two seconds until it ends', async () => {
    let reads = 0;
    await open({
      [RURL.passes]: () => Response.json({ items: [realPass({ status: 'finished' })], next_page_token: null }),
      [RURL.pass()]: () => {
        reads += 1;
        return Response.json(reads === 1
          ? { pass: realPass({ status: 'running', judged: 1 }), items: [realItem({ scores: [] })] }
          : { pass: realPass({ status: 'finished' }), items: [realItem()] });
      },
    }, `/ai/real-questions?pass=${PASS_ID}`);
    const panel = await screen.findByTestId('detail-panel');
    expect(await within(panel).findByText(t.results.running.replace('{judged}', '1').replace('{total}', '3'))).toBeInTheDocument();
    expect(await within(within(panel).getByRole('table')).findByText('come fits too', undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(within(panel).queryByText(t.results.running.replace('{judged}', '1').replace('{total}', '3'))).toBeNull();
  });
});
