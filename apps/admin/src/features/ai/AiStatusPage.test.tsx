import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import vi from '../../../messages/vi.json';
import { makeMe, problem } from '../../auth/test-support';
import { renderApp } from '../staff/test-utils';
import { AI_OPERATION_ORDER, type AiStatus } from './ai-api';

const STATUS = 'GET /v1/admin/ai/status';
const EDITOR = makeMe({
  id: 'me-2', email: 'editor@wordmet.com', staff_role: 'editor',
  permissions: ['content.edit', 'content.import', 'content.publish', 'taxonomy.manage', 'entitlements.grant'],
});

const idleOps = (over: Partial<AiStatus['operations'][number]> = {}): AiStatus['operations'] =>
  AI_OPERATION_ORDER.map((operation) => ({
    operation, ready: false, reason: 'model-not-set', model: null, effort: null, thinking: null, max_output_tokens: null,
    last_error: null, model_warning: null, ...over,
  }));
const status = (over: Partial<AiStatus> = {}): AiStatus => ({
  operations: idleOps(),
  today: {
    calls: 1240, cap: 3000, failed_calls: 12, failed_cost_usd: '0.0400', cost_usd: '2.3100', cost_vnd: 60291, admin_cost_usd: '1.50000000', admin_usd_cap: 2,
  },
  ai_enabled: true,
  providers: { openai: true, anthropic: true, fake: false },
  ...over,
});
const reply = (body: AiStatus) => () => Response.json(body);
const rowOf = (op: string) => screen.getAllByText(op)[0].closest('tr, [data-testid="card"]') as HTMLElement;
const bodyRows = () => screen.getAllByRole('row').slice(1).map((r) => r.textContent ?? '');

describe('AiStatusPage (A/84, A/84b)', () => {
  it('a fresh database: six rows in the copy deck order, each "Chưa sẵn sàng · Chưa chọn model" with [Chọn model] to Cấu hình of that operation', async () => {
    renderApp('/ai/status', { [STATUS]: reply(status()) });
    expect(await screen.findByRole('heading', { level: 1, name: 'Tình trạng' })).toBeInTheDocument();
    await screen.findAllByText('generate_cloze');
    for (const op of AI_OPERATION_ORDER) {
      const row = rowOf(op);
      expect(within(row).getByText('Chưa sẵn sàng')).toBeInTheDocument();
      expect(within(row).getByText('Chưa chọn model')).toBeInTheDocument();
      expect(within(row).getByRole('link', { name: /Chọn model/ })).toHaveAttribute('href', `/ai/configs?op=${op}`);
    }
    expect(bodyRows()).toHaveLength(6);
  });

  it('the API lists operations a→z; the page still shows the copy deck order', async () => {
    const sorted = [...idleOps()].sort((a, b) => a.operation.localeCompare(b.operation));
    renderApp('/ai/status', { [STATUS]: reply(status({ operations: sorted })) });
    await screen.findAllByText('generate_cloze');
    const order = bodyRows();
    AI_OPERATION_ORDER.forEach((op, i) => expect(order[i]).toContain(op));
  });

  it('the today block: calls over cap, failures with their cost, cost in US$ and ₫, providers with a key, system switch on', async () => {
    renderApp('/ai/status', { [STATUS]: reply(status()) });
    expect(await screen.findByText('Lời gọi của người học hôm nay: 1.240/3.000')).toBeInTheDocument();
    expect(screen.getByText(/^Lỗi: 12 \(0,04\s*US\$\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^Chi phí hôm nay: 2,31\s*US\$ · 60\.291\s*₫$/)).toBeInTheDocument();
    expect(screen.getByText('Nhà cung cấp có key: OpenAI · Anthropic')).toBeInTheDocument();
    expect(screen.getByText('AI toàn hệ thống: Đang bật')).toBeInTheDocument();
  });

  it('admin spend today: US$ spent over the US$ cap, or "không có trần" when the cap is null', async () => {
    renderApp('/ai/status', { [STATUS]: reply(status()) });
    expect(await screen.findByText(/^Việc của admin hôm nay \(chạy thử, bộ ví dụ, judge\): 1,50\s*US\$ \/ 2,00\s*US\$$/)).toBeInTheDocument();
  });

  it('admin_usd_cap null: the spend alone with "không có trần"', async () => {
    renderApp('/ai/status', { [STATUS]: reply(status({ today: { ...status().today, admin_usd_cap: null } })) });
    expect(await screen.findByText(/^Việc của admin hôm nay \(chạy thử, bộ ví dụ, judge\): 1,50\s*US\$, không có trần$/)).toBeInTheDocument();
  });

  it('ai_enabled false: every row says "AI đang tắt" and the head links to the AI tab of the settings', async () => {
    renderApp('/ai/status', {
      [STATUS]: reply(status({ ai_enabled: false, operations: idleOps({ reason: 'ai-disabled' }) })),
    });
    expect(await screen.findByText('AI toàn hệ thống: Đang tắt')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở Cài đặt' })).toHaveAttribute('href', '/settings?tab=ai');
    for (const op of AI_OPERATION_ORDER) {
      expect(within(rowOf(op)).getByText('AI đang tắt')).toBeInTheDocument();
      expect(within(rowOf(op)).queryByRole('link', { name: /Chọn model/ })).toBeNull();
    }
  });

  it('today.cap null: "Lời gọi của người học hôm nay: 1.240" with no "/…"', async () => {
    renderApp('/ai/status', { [STATUS]: reply(status({ today: { ...status().today, cap: null } })) });
    expect(await screen.findByText('Lời gọi của người học hôm nay: 1.240')).toBeInTheDocument();
  });

  it('a ready operation shows "Sẵn sàng" and its model; no reason, no [Chọn model]', async () => {
    const ops = idleOps();
    ops[0] = { ...ops[0], ready: true, reason: null, model: { provider: 'openai', model_id: 'gpt-x' }, effort: 'low', thinking: 'disabled', max_output_tokens: 800 };
    renderApp('/ai/status', { [STATUS]: reply(status({ operations: ops })) });
    await screen.findAllByText('generate_cloze');
    const row = rowOf('generate_cloze');
    expect(within(row).getByText('Sẵn sàng')).toBeInTheDocument();
    expect(within(row).getByText('OpenAI · gpt-x')).toBeInTheDocument();
    expect(within(row).queryByRole('link', { name: /Chọn model/ })).toBeNull();
  });

  it('a model_warning with shutdown_at 30/11/2026 gives the badge "Ngừng ngày 30/11/2026"', async () => {
    const ops = idleOps();
    ops[1] = { ...ops[1], ready: true, reason: null, model: { provider: 'anthropic', model_id: 'claude-old' },
      model_warning: { shutdown_at: '2026-11-30T00:00:00.000Z', lifecycle: 'deprecated' } };
    renderApp('/ai/status', { [STATUS]: reply(status({ operations: ops })) });
    await screen.findAllByText('lookup_word');
    expect(within(rowOf('lookup_word')).getByText('Ngừng ngày 30/11/2026')).toBeInTheDocument();
  });

  it('a warning without shutdown_at names the lifecycle instead', async () => {
    const ops = idleOps();
    ops[1] = { ...ops[1], ready: true, reason: null, model: { provider: 'anthropic', model_id: 'claude-old' },
      model_warning: { shutdown_at: null, lifecycle: 'retired' } };
    renderApp('/ai/status', { [STATUS]: reply(status({ operations: ops })) });
    expect((await screen.findAllByText('Vòng đời: retired')).length).toBeGreaterThan(0);
  });

  it('last error: time and outcome, "· chạy thử" for a test call, and the note under the table', async () => {
    const ops = idleOps();
    ops[2] = { ...ops[2], last_error: { at: '2026-10-15T02:12:00.000Z', outcome: 'timeout', http_status: 504, purpose: 'test' } };
    ops[3] = { ...ops[3], last_error: { at: '2026-10-16T02:12:00.000Z', outcome: 'rejected', http_status: null, purpose: 'eval' } };
    renderApp('/ai/status', { [STATUS]: reply(status({ operations: ops })) });
    await screen.findAllByText('translate_sentence');
    const test = within(rowOf('translate_sentence'));
    expect(test.getByText(/15\/10\/2026/)).toBeInTheDocument();
    expect(test.getByText(/timeout/)).toBeInTheDocument();
    expect(test.getByText(/· chạy thử$/)).toBeInTheDocument();
    expect(within(rowOf('generate_meaning_question')).getByText(/· bộ ví dụ$/)).toBeInTheDocument();
    expect(within(rowOf('generate_cloze')).getAllByText('—')).toHaveLength(2);
    expect(screen.getAllByText('Gồm cả lỗi khi chạy thử và chạy bộ ví dụ.').length).toBeGreaterThan(0);
  });

  it.each([
    ['ai-disabled', 'AI đang tắt'],
    ['model-not-set', 'Chưa chọn model'],
    ['provider-not-configured', 'Nhà cung cấp chưa có key'],
    ['daily-call-cap', 'Chạm trần lời gọi'],
    ['admin-usd-cap', 'Chạm trần USD việc admin'],
  ] as const)('reason %s reads "%s"', async (reason, text) => {
    renderApp('/ai/status', { [STATUS]: reply(status({ operations: idleOps({ reason }) })) });
    await screen.findAllByText('generate_cloze');
    expect(within(rowOf('generate_cloze')).getByText(text)).toBeInTheDocument();
  });

  it('a 403 forbidden reads errors.forbidden, not the generic list error', async () => {
    renderApp('/ai/status', { [STATUS]: () => problem(403, 'forbidden') });
    expect(await screen.findByText(vi.errors.forbidden)).toBeInTheDocument();
    expect(screen.queryByText(vi.list.error)).toBeNull();
  });

  it('another failure reads the generic list error with [Thử lại]', async () => {
    renderApp('/ai/status', { [STATUS]: () => problem(500, 'internal') });
    expect(await screen.findByText(vi.list.error)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: vi.common.retry })).toBeInTheDocument();
  });

  it('an editor has no AI menu entry and /ai/status calls no AI API', async () => {
    const r = renderApp('/ai/status', { 'GET /v1/admin/content/uploads?page_size=20': () => Response.json({ items: [], next_page_token: null }) }, EDITOR);
    expect(await screen.findByText(vi.noAccess.title)).toBeInTheDocument();
    expect(r.calls.some((c) => c.path.startsWith('/v1/admin/ai'))).toBe(false);
  });
});
