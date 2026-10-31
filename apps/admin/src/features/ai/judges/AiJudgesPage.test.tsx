import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import vi from '../../../../messages/vi.json';
import { makeMe, problem } from '../../../auth/test-support';
import { renderApp } from '../../staff/test-utils';
import type { SaveJudgeBody } from '../ai-api';
import { FAKE_OK, modelRow } from '../configs/config-test-support';
import { JURL, agreementView, judgeOnFake, judgeRevision, judgeRoutes, judgeView } from './judge-test-support';

const t = vi.ai.judges;
const PATH = '/ai/judges';
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});
const button = (name: string | RegExp) => screen.getByRole('button', { name });
// The list renders a table and the same rows as cards (CSS shows one of them): a row's buttons are taken from the table.
const rowButton = (name: string | RegExp) => within(screen.getByRole('table')).getByRole('button', { name });
const calls = (all: { method: string; path: string; body: unknown }[], method: string, suffix: string) =>
  all.filter((c) => c.method === method && c.path.endsWith(suffix));
const modelButton = () => screen.getByRole('button', { name: /Model$/ });

async function openPage(routes = judgeRoutes()) {
  const r = renderApp(PATH, routes);
  await screen.findAllByText('Chỉ một đáp án · bản 1', undefined, { timeout: 4000 });
  return r;
}
async function openEditor(routes = judgeRoutes()) {
  const r = await openPage(routes);
  await userEvent.click(rowButton(/^Sửa/));
  await screen.findByRole('heading', { name: 'Judge Chỉ một đáp án' });
  return r;
}
/** Long texts are pasted: every keystroke of `type` re-renders the whole editor, which is slow on a busy machine. */
async function paste(label: string, text: string) {
  await userEvent.click(screen.getByRole('textbox', { name: label }));
  await userEvent.paste(text);
}
async function chooseModel(name: string) {
  await userEvent.click(modelButton());
  await userEvent.click(await screen.findByRole('option', { name }));
}

beforeEach(() => sessionStorage.clear());

describe('AiJudgesPage: the list (M3-T15)', () => {
  it('shows the seeded judge: name and revision, the operation it scores, "Chưa chọn model" and "Đang dùng"', async () => {
    await openPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Judge' })).toBeInTheDocument();
    const row = screen.getAllByRole('row')[1]!;
    expect(row).toHaveTextContent('Chỉ một đáp án · bản 1');
    expect(row).toHaveTextContent('Sinh câu điền từ');
    expect(row).toHaveTextContent('Chưa chọn model');
    expect(row).toHaveTextContent('Đang dùng');
  });

  it('a judge on a model shows it ("Fake · fake:ok") and a switched-off judge says "Đã tắt"', async () => {
    renderApp(PATH, judgeRoutes({ [JURL.list]: () => Response.json({ items: [judgeOnFake({ active: false })] }) }));
    const row = (await screen.findAllByRole('row', undefined, { timeout: 4000 }))[1]!;
    await waitFor(() => expect(row).toHaveTextContent('Chỉ một đáp án · bản 2'));
    expect(row).toHaveTextContent('Fake · fake:ok');
    expect(row).toHaveTextContent('Đã tắt');
  });

  it('no judge: the empty text; an editor has no access and the API is not called', async () => {
    renderApp(PATH, judgeRoutes({ [JURL.list]: () => Response.json({ items: [] }) }));
    expect(await screen.findByText(t.empty, undefined, { timeout: 4000 })).toBeInTheDocument();
    cleanup();
    const r = renderApp(PATH, judgeRoutes(), EDITOR);
    expect(await screen.findByText(vi.noAccess.title, undefined, { timeout: 4000 })).toBeInTheDocument();
    expect(r.count('GET', '/v1/admin/ai/judges')).toBe(0);
  });

  it('403 on the list shows the forbidden text', async () => {
    renderApp(PATH, judgeRoutes({ [JURL.list]: () => problem(403, 'forbidden') }));
    expect(await screen.findByText(vi.errors.forbidden, undefined, { timeout: 4000 })).toBeInTheDocument();
  });
});

describe('AiJudgesPage: editing a judge (M3-T15)', () => {
  it('"Sửa", "Fake · fake:ok", "Lưu bản mới" PUTs expected_revision 1 with every field and toasts "Đã lưu bản 2."', async () => {
    let saved = false;
    const r = await openEditor(judgeRoutes({
      [JURL.list]: () => Response.json({ items: [saved ? judgeOnFake() : judgeView()] }),
      [JURL.save()]: () => {
        saved = true;
        return Response.json(judgeOnFake());
      },
    }));
    expect(button('Lưu bản mới')).toBeDisabled();
    await chooseModel('Fake · fake:ok');
    expect(button('Lưu bản mới')).toBeEnabled();
    await userEvent.click(button('Lưu bản mới'));
    expect(await screen.findByText('Đã lưu bản 2.')).toBeInTheDocument();
    const body = calls(r.calls, 'PUT', '/judges/J1')[0]!.body as SaveJudgeBody;
    expect(body).toEqual({
      expected_revision: 1, name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, criteria: judgeView().latest.criteria,
      instructions: 'You review one practice question.', examples: [], model_ref: 'M1', effort: null, thinking: null, max_output_tokens: null,
    });
    await waitFor(() => expect(button('Lưu bản mới')).toBeDisabled());
    expect((await screen.findAllByText('Chỉ một đáp án · bản 2')).length).toBeGreaterThan(0);
  });

  it('saving only a name change adds no revision: the toast says "Đã lưu (không đổi bản)."', async () => {
    await openEditor(judgeRoutes({ [JURL.save()]: () => Response.json(judgeView({ name: 'Một đáp án' })) }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), ' mới');
    await userEvent.click(button('Lưu bản mới'));
    expect(await screen.findByText('Đã lưu (không đổi bản).')).toBeInTheDocument();
  });

  it('422 judge-provider puts "Judge chỉ dùng model Anthropic." under "Model"', async () => {
    await openEditor(judgeRoutes({ [JURL.save()]: () => problem(422, 'judge-provider') }));
    await chooseModel('Fake · fake:ok');
    await userEvent.click(button('Lưu bản mới'));
    expect(await screen.findByText('Judge chỉ dùng model Anthropic.')).toBeInTheDocument();
    expect(modelButton()).toHaveAttribute('aria-describedby', expect.stringContaining(screen.getByText('Judge chỉ dùng model Anthropic.').id));
  });

  it('409 judge-revision-conflict says so with [Tải bản mới], which puts the newer revision in the boxes', async () => {
    let theirs = false;
    await openEditor(judgeRoutes({
      [JURL.list]: () => Response.json({ items: [theirs ? judgeOnFake() : judgeView()] }),
      [JURL.save()]: () => {
        theirs = true;
        return problem(409, 'judge-revision-conflict');
      },
    }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), ' mới');
    await userEvent.click(button('Lưu bản mới'));
    expect(await screen.findByText('Judge vừa được người khác sửa.')).toBeInTheDocument();
    expect(button('Lưu bản mới')).toBeDisabled();
    await userEvent.click(button('Tải bản mới'));
    expect(await screen.findByRole('button', { name: /Fake · fake:ok.*Model$/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Tên' })).toHaveValue('Chỉ một đáp án');
    expect(screen.queryByText('Judge vừa được người khác sửa.')).not.toBeInTheDocument();
  });

  it('a 400 puts each violation on its box: a criterion code, the instructions', async () => {
    await openEditor(judgeRoutes({
      [JURL.save()]: () => problem(400, 'validation-failed', {
        violations: ['criteria.0.code: Invalid string: must match pattern', 'instructions: Must not be blank'],
      }),
    }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), ' mới');
    await userEvent.click(button('Lưu bản mới'));
    expect(await screen.findByText('Invalid string: must match pattern')).toBeInTheDocument();
    expect(screen.getByText(vi.ai.prompts.errors.blank)).toBeInTheDocument();
  });

  it('the criteria are edited in place: add one, remove another; the body carries them in order', async () => {
    const both = [judgeView().latest.criteria[0]!, { code: 'natural', question: 'Is it natural?' }];
    const r = await openEditor(judgeRoutes({ [JURL.save()]: () => Response.json(judgeView({ latest: judgeRevision({ revision: 2, criteria: both }) })) }));
    await userEvent.click(button('Thêm tiêu chí'));
    const second = screen.getByRole('group', { name: 'Tiêu chí 2' });
    await userEvent.type(within(second).getByRole('textbox', { name: 'Mã' }), 'natural');
    await userEvent.type(within(second).getByRole('textbox', { name: 'Câu hỏi' }), 'Is it natural?');
    await userEvent.click(button('Lưu bản mới'));
    await waitFor(() => expect(calls(r.calls, 'PUT', '/judges/J1')).toHaveLength(1));
    expect((calls(r.calls, 'PUT', '/judges/J1')[0]!.body as SaveJudgeBody).criteria).toEqual(both);
    await screen.findByText('Đã lưu bản 2.');
    await userEvent.click(button('Xóa tiêu chí 1'));
    expect(screen.queryByRole('group', { name: 'Tiêu chí 2' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Tiêu chí 1' })).getByRole('textbox', { name: 'Mã' })).toHaveValue('natural');
  });

  it('"Các bản" lists every revision: number, date, who, model', async () => {
    await openEditor(judgeRoutes({
      [JURL.revisions()]: () => Response.json({ items: [judgeOnFake().latest, judgeRevision()] }),
    }));
    const history = await screen.findByRole('region', { name: 'Các bản' });
    expect(within(history).getByText('Bản 2 · 15/10/2026 09:12 · lan@wordmet.com · Fake · fake:ok')).toBeInTheDocument();
    expect(within(history).getByText('Bản 1 · 15/10/2026 09:12 · Hệ thống · Chưa chọn model')).toBeInTheDocument();
  });
});

describe('AiJudgesPage: the model choices (D3, D40, B50)', () => {
  it('an OpenAI model is not offered in "Model": "Không có model", then the Anthropic and Fake models', async () => {
    await openEditor();
    await userEvent.click(modelButton());
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([vi.ai.operations.row.noModel, 'Fake · fake:ok']);
  });

  it('hidden and retired models are not offered, unless one is the judge\'s newest model, then it is offered for that judge', async () => {
    const models = [
      FAKE_OK,
      modelRow('M2', 'anthropic', 'claude-old', { lifecycle: 'retired' }),
      modelRow('M3', 'anthropic', 'claude-hid', { hidden: true }),
      modelRow('M4', 'anthropic', 'claude-new'),
      modelRow('M5', 'openai', 'gpt-x'),
    ];
    await openEditor(judgeRoutes({ [JURL.models]: () => Response.json({ items: models }) }));
    await userEvent.click(modelButton());
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      vi.ai.operations.row.noModel, 'Fake · fake:ok', 'Anthropic · claude-new',
    ]);
    cleanup();
    const onOld = judgeView({ latest: judgeRevision({ revision: 3, model: { id: 'M2', provider: 'anthropic', model_id: 'claude-old' } }) });
    renderApp(PATH, judgeRoutes({ [JURL.models]: () => Response.json({ items: models }), [JURL.list]: () => Response.json({ items: [onOld] }) }));
    await userEvent.click(within(await screen.findByRole('table', undefined, { timeout: 4000 })).getByRole('button', { name: /^Sửa/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Model$/ }));
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      vi.ai.operations.row.noModel, 'Fake · fake:ok', 'Anthropic · claude-old', 'Anthropic · claude-new',
    ]);
  });
});

describe('AiJudgesPage: a new judge and a clone (M3-T15)', () => {
  it('"Thêm judge" opens an empty editor; "Tạo judge" POSTs the whole definition and toasts "Đã tạo judge Tự nhiên."', async () => {
    const r = await openPage(judgeRoutes({ [JURL.create]: () => Response.json(judgeView({ id: 'J2', name: 'Tự nhiên' }), { status: 201 }) }));
    await userEvent.click(button('Thêm judge'));
    expect(await screen.findByRole('heading', { name: 'Thêm judge' })).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên' }), 'Tự nhiên');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sinh câu điền từ' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Mã' }), 'natural');
    await paste('Câu hỏi', 'Is the sentence natural?');
    await paste('Hướng dẫn', 'Judge it.');
    await userEvent.click(button('Tạo judge'));
    expect(await screen.findByText('Đã tạo judge Tự nhiên.')).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/v1/admin/ai/judges')[0]!.body).toEqual({
      name: 'Tự nhiên', operations: ['generate_cloze'], active: true, criteria: [{ code: 'natural', question: 'Is the sentence natural?' }],
      instructions: 'Judge it.', examples: [], model_ref: null, effort: null, thinking: null, max_output_tokens: null,
    });
    expect(screen.queryByRole('heading', { name: 'Thêm judge' })).not.toBeInTheDocument();
  });

  it('"Nhân bản judge" asks for a name ("… (bản sao)"), POSTs it and toasts the new judge', async () => {
    const r = await openPage(judgeRoutes({ [JURL.clone()]: () => Response.json(judgeView({ id: 'J2', name: 'Chỉ một đáp án (bản sao)' }), { status: 201 }) }));
    await userEvent.click(rowButton('Nhân bản judge Chỉ một đáp án'));
    const dialog = await screen.findByRole('dialog', { name: 'Nhân bản judge' });
    expect(within(dialog).getByRole('textbox', { name: 'Tên' })).toHaveValue('Chỉ một đáp án (bản sao)');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Nhân bản' }));
    expect(await screen.findByText('Đã tạo judge Chỉ một đáp án (bản sao).')).toBeInTheDocument();
    expect(calls(r.calls, 'POST', '/judges/J1/clone')[0]!.body).toEqual({ name: 'Chỉ một đáp án (bản sao)' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a failed clone keeps the dialog open with the problem', async () => {
    await openPage(judgeRoutes({ [JURL.clone()]: () => problem(404, 'not-found') }));
    await userEvent.click(rowButton('Nhân bản judge Chỉ một đáp án'));
    const dialog = await screen.findByRole('dialog', { name: 'Nhân bản judge' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Nhân bản' }));
    expect(await within(dialog).findByText(vi.errors['not-found'])).toBeInTheDocument();
  });
});

describe('AiJudgesPage: agreement with the labels (D15)', () => {
  it('"Độ khớp" shows labels, the two rates and "Chưa hiệu chỉnh" with what calibration needs', async () => {
    await openPage(judgeRoutes({
      [JURL.agreement()]: () => Response.json(agreementView({
        items: [{ judge_revision_id: 'JR1', revision: 1, criterion: 'single_answer', labeled: 29, agree: 29, agree_exact: 28, rate: 1, exact_rate: 28 / 29, calibrated: false }],
      })),
    }));
    await userEvent.click(rowButton('Độ khớp của Chỉ một đáp án'));
    const panel = await screen.findByRole('region', { name: 'Độ khớp với nhãn · Chỉ một đáp án' });
    expect(await within(panel).findByText('Bản 1 · single_answer: 29 nhãn · khớp đạt/không đạt 100% · khớp cả mức 96,6%')).toBeInTheDocument();
    expect(within(panel).getByText('Chưa hiệu chỉnh')).toBeInTheDocument();
    expect(within(panel).getByText('Cần ít nhất 30 nhãn và khớp từ 85%.')).toBeInTheDocument();
  });

  it('a calibrated revision says "Đã hiệu chỉnh"; a revision with no label shows "—" for the rates', async () => {
    await openPage(judgeRoutes({
      [JURL.agreement()]: () => Response.json(agreementView({
        items: [
          { judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer', labeled: 40, agree: 36, agree_exact: 34, rate: 0.9, exact_rate: 0.85, calibrated: true },
          { judge_revision_id: 'JR1', revision: 1, criterion: 'single_answer', labeled: 0, agree: 0, agree_exact: 0, rate: null, exact_rate: null, calibrated: false },
        ],
      })),
    }));
    await userEvent.click(rowButton('Độ khớp của Chỉ một đáp án'));
    const panel = await screen.findByRole('region', { name: 'Độ khớp với nhãn · Chỉ một đáp án' });
    expect(await within(panel).findByText('Bản 2 · single_answer: 40 nhãn · khớp đạt/không đạt 90% · khớp cả mức 85%')).toBeInTheDocument();
    expect(within(panel).getByText('Đã hiệu chỉnh')).toBeInTheDocument();
    expect(within(panel).getByText('Bản 1 · single_answer: 0 nhãn · khớp đạt/không đạt — · khớp cả mức —')).toBeInTheDocument();
  });
});
