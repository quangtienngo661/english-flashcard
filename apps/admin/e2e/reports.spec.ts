import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { problem, requestCount, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.reports;
const LIST = '/v1/admin/practice/reports';
const ID = '5b1f0000-0000-4000-8000-0000000000a1';
const reasons = {
  items: [{ code: 'wrong_meaning', label_vi: 'Nghĩa sai', label_en: 'Wrong meaning', refundable: true, active: true, position: 1 }],
};
const report = (over: Record<string, unknown> = {}) => ({
  id: ID, sense_id: 's1', reason: 'wrong_meaning', reason_label: 'Nghĩa sai', note: 'Nghĩa không khớp', status: 'open',
  question_snapshot: {
    type: 'mcq_definition',
    prompt: { kind: 'mcq', meaning: 'a computer that serves', meaning_language: 'en', context_label: null, options: ['máy chủ', '[nghĩa của từ riêng]', 'bộ nhớ đệm', '[nghĩa của từ riêng]'] },
    correct: { lemma: 'server', meaning: 'máy chủ', definition_en: null, option_index: 0 },
    hints_shown: { level1: null, level2: null, level3: null },
    learner: { answer: '[nghĩa của từ riêng]', option_index: 3, answers_tried: [], result: 'wrong', hint_level: 0 },
  },
  created_at: '2026-10-18T09:00:00.000Z', resolved_at: null, resolved_by: null, resolved_by_role: null, resolved_by_user: null,
  refundable: true, question_source: 'ai', ai_operation_id: 'op-1', call_operation_id: 'call-1', model: 'gpt-x', prompt_revision: 3,
  ai_charged: true, refunded: null, ...over,
});
const base = {
  'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
  'GET /v1/admin/practice/report-reasons': () => ({ json: reasons }),
};

test.describe('Báo lỗi (A/73, A/74)', () => {
  test('empty open list: asks for status=open and says nothing is left; axe clean', async ({ page }) => {
    await signedInAs(page, 'editor', { ...base, [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }) });
    await page.goto('/reports');
    await expect(page.getByText(t.empty)).toBeVisible();
    expect(requests(page, 'GET', LIST)[0]!.query.get('status')).toBe('open');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('409 report-not-open: the message shows and the report is loaded again', async ({ page }) => {
    let reads = 0;
    await signedInAs(page, 'admin', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [report()], next_page_token: null } }),
      [`GET ${LIST}/${ID}`]: () => ({ json: ++reads === 1 ? report() : report({ status: 'no_error', resolved_by_role: 'editor', resolved_at: '2026-10-18T11:02:00.000Z' }) }),
      [`POST ${LIST}/${ID}/resolve`]: () => problem(409, 'report-not-open'),
    });
    await page.goto(`/reports/${ID}`);
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByRole('button', { name: t.actions.confirmed })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await panel.getByRole('button', { name: t.actions.noError }).click();
    await expect(panel.getByText(vi.errors['report-not-open'])).toBeVisible();
    await expect.poll(() => requestCount(page, 'GET', `${LIST}/${ID}`)).toBe(2);
    await expect(panel.getByRole('button', { name: t.actions.noError })).toHaveCount(0);
  });

  test('editor: sees the reason filter and the refund line, but no link to the AI call', async ({ page }) => {
    await signedInAs(page, 'editor', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [report()], next_page_token: null } }),
      [`GET ${LIST}/${ID}`]: () => ({ json: report() }),
    });
    await page.goto(`/reports/${ID}`);
    await expect(page.getByRole('button', { name: new RegExp(t.filters.reason) })).toBeVisible();
    await expect(page.getByText(t.actions.refundLine)).toBeVisible();
    await expect(page.getByRole('link', { name: t.detail.openCall })).toHaveCount(0);
  });

  test('unknown id: "Không tìm thấy báo lỗi này." with a link back', async ({ page }) => {
    await signedInAs(page, 'editor', {
      ...base,
      [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }),
      [`GET ${LIST}/${ID}`]: () => problem(404, 'not-found'),
    });
    await page.goto(`/reports/${ID}`);
    await expect(page.getByText(t.detail.notFound)).toBeVisible();
    await expect(page.getByRole('link', { name: t.detail.backToList })).toBeVisible();
  });
});
