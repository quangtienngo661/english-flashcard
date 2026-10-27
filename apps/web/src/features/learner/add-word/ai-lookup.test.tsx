// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem, type Call } from '@/app-shell/session/test-support';
import { renderApp } from '@/app-ui/test-utils';
import { AddWordSheet } from './AddWordSheet';
import { LAST_GROUP_KEY } from './last-group';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TRAVEL = uuid(201);
const deck = (id: string, name: string) => ({ id, name, version: 1, total: 3, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 });
const sickSense = {
  sense_id: uuid(1), entry_id: uuid(11), scope: 'catalog', lemma: 'sick', pos: 'adjective', level: 'A2', context_label: null,
  meaning: { text: 'ốm, bệnh', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
};
const pool = (remaining: number) => ({ limit: 100, used: 100 - remaining, remaining, resets_at: '2030-11-15T00:00:00Z' });
const entitlements = (plan: 'free' | 'trial' | 'pro', remaining = 96) => ({
  plan, sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  pools: { practice_sessions: pool(3), ai_practice: pool(50), ai_lookup: plan === 'free' ? { limit: 0, used: 0, remaining: 0, resets_at: null } : pool(remaining) },
  features: { 'ai.practice': { allowed: plan !== 'free', reason: plan === 'free' ? 'plan-required' : null }, 'ai.lookup': { allowed: plan !== 'free', reason: plan === 'free' ? 'plan-required' : null } },
});
const RIZZ = {
  suggestion: { part_of_speech: 'noun', lemma: 'rizz', meaning: { text: 'sức hút, khả năng tán tỉnh', language: 'vi' }, definition_en: 'charm or the ability to attract someone', examples: ["He's got serious rizz."] },
  catalog_senses: [],
};
const routes = (plan: 'free' | 'trial' | 'pro', extra = {}) => {
  let reads = 0;
  return {
    'GET /v1/groups': () => Response.json({ items: [deck(TRAVEL, 'Du lịch')] }),
    'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
    // The second read is the refetch after a lookup: one credit used.
    'GET /v1/me/entitlements': () => Response.json(entitlements(plan, reads++ === 0 ? 96 : 95)),
    'GET /v1/lookup?q=rizz': () => Response.json({ senses: [], via_inflection: [] }),
    'GET /v1/lookup?q=sick': () => Response.json({ senses: [sickSense], via_inflection: [] }),
    'POST /v1/lookup/ai': () => Response.json(RIZZ),
    ...extra,
  };
};
const aiCalls = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/lookup/ai');
const open = (word: string, options: Parameters<typeof renderApp>[1]) => renderApp(<AddWordSheet initialWord={word} onClose={() => {}} />, options);

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
});

describe('AI lookup in the add-word sheet (K/85–K/86)', () => {
  it('K/85: a word Wordmet lacks shows two buttons and the lookups left under [Tra bằng AI]', async () => {
    open('rizz', { routes: routes('pro') });
    const ai = await screen.findByRole('button', { name: 'Tra bằng AI' });
    expect(screen.getByRole('button', { name: 'Tự nhập nghĩa' })).toBeInTheDocument();
    expect(await screen.findByText('còn 96 lượt tra AI')).toBeInTheDocument();
    expect(ai).toBeEnabled();
  });

  it('K/85t: Trial shows its own count and the Trial chip', async () => {
    open('rizz', { routes: routes('trial') });
    expect(await screen.findByText('còn 96 lượt tra AI')).toBeInTheDocument();
    expect(screen.getByText('Dùng thử')).toBeInTheDocument();
  });

  it('K/85b: Free sees the Pro label; a press shows the D6 line and sends nothing; manual entry still works', async () => {
    const { calls } = open('rizz', { routes: routes('free') });
    const ai = await screen.findByRole('button', { name: /Tra bằng AI/ });
    await waitFor(() => expect(within(ai).getByText('Pro')).toBeInTheDocument());
    await userEvent.click(ai);
    expect(await screen.findByText('Dành cho gói Pro. Gói Pro chưa mở bán.')).toBeInTheDocument();
    expect(aiCalls(calls)).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Tự nhập nghĩa' }));
    expect(await screen.findByRole('textbox', { name: 'Nghĩa' })).toBeInTheDocument();
  });

  it('the sentence goes to AI only when "Gửi kèm câu đã gặp cho AI" is ticked (unticked by default)', async () => {
    const { calls } = open('rizz', { routes: routes('pro') });
    expect(screen.queryByRole('checkbox', { name: 'Gửi kèm câu đã gặp cho AI' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu bạn gặp (không bắt buộc)' }), 'That guy has so much rizz.');
    const box = await screen.findByRole('checkbox', { name: 'Gửi kèm câu đã gặp cho AI' });
    expect(box).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Tra bằng AI' }));
    await waitFor(() => expect(aiCalls(calls)).toHaveLength(1));
    expect(aiCalls(calls)[0]).toMatchObject({ body: { text: 'rizz' } });
    expect(aiCalls(calls)[0].headers['Idempotency-Key']).toBeTruthy();
  });

  it('a ticked box sends context_sentence', async () => {
    const { calls } = open('rizz', { routes: routes('pro') });
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu bạn gặp (không bắt buộc)' }), 'That guy has so much rizz.');
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Gửi kèm câu đã gặp cho AI' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tra bằng AI' }));
    await waitFor(() => expect(aiCalls(calls)).toHaveLength(1));
    expect(aiCalls(calls)[0]).toMatchObject({ body: { text: 'rizz', context_sentence: 'That guy has so much rizz.' } });
  });

  it('K/86b: the result lists the dictionary meanings first, then the AI suggestion, with the credits left', async () => {
    const routesSick = routes('pro', {
      'POST /v1/lookup/ai': () => Response.json({
        suggestion: { part_of_speech: 'adjective', lemma: 'sick', meaning: { text: 'tuyệt, đỉnh (tiếng lóng)', language: 'vi' }, definition_en: 'very good, excellent (informal)', examples: ['That concert was sick!'] },
        catalog_senses: [sickSense],
      }),
    });
    open('sick', { routes: routesSick });
    await userEvent.click(await screen.findByRole('button', { name: 'Không phải nghĩa bạn cần?' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    expect(await screen.findByRole('heading', { name: 'Kết quả cho “sick”' })).toBeInTheDocument();
    expect(await screen.findByText('Đã dùng 1 lượt tra AI · còn 95')).toBeInTheDocument();
    const catalog = screen.getByRole('region', { name: 'Nghĩa có sẵn trong từ điển' });
    const suggestion = screen.getByRole('region', { name: 'AI gợi ý' });
    expect(catalog.compareDocumentPosition(suggestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(catalog).getByText('ốm, bệnh')).toBeInTheDocument();
    expect(within(suggestion).getByText('tuyệt, đỉnh (tiếng lóng)')).toBeInTheDocument();
    expect(within(suggestion).getByText(/Định nghĩa tiếng Anh \(chỉ để tham khảo, không lưu\): very good/)).toBeInTheDocument();
    expect(within(suggestion).getByText('That concert was sick!')).toBeInTheDocument();
    expect(screen.getByText('AI gợi ý có thể sai. Kiểm lại trước khi lưu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sửa rồi lưu' })).toBeInTheDocument();
    // [Chọn] a dictionary meaning: back to the saving form with that meaning picked.
    await userEvent.click(within(catalog).getByRole('button', { name: 'Chọn' }));
    expect(await screen.findByRole('radio', { name: /ốm, bệnh/ })).toBeChecked();
  });

  it('E38: 409 ai-in-progress keeps "Đang tra…" and sends again with the same key', async () => {
    let n = 0;
    const { calls } = open('rizz', {
      routes: routes('pro', { 'POST /v1/lookup/ai': () => (n++ === 0 ? problem(409, 'ai-in-progress') : Response.json(RIZZ)) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    expect(await screen.findByText('Đang tra…')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Kết quả cho “rizz”' }, { timeout: 5000 });
    const sent = aiCalls(calls);
    expect(sent).toHaveLength(2);
    expect(sent[1].headers['Idempotency-Key']).toBe(sent[0].headers['Idempotency-Key']);
  });

  it('E39: 503 ai-lookup-failed, retryable → the D11 line and [Thử lại], which sends a new lookup', async () => {
    let n = 0;
    const { calls } = open('rizz', {
      routes: routes('pro', { 'POST /v1/lookup/ai': () => (n++ === 0 ? problem(503, 'ai-lookup-failed', { retryable: true }) : Response.json(RIZZ)) }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    expect(await screen.findByText('Hệ thống đang gặp lỗi.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('heading', { name: 'Kết quả cho “rizz”' })).toBeInTheDocument();
    // With a result on screen, the "enter a meaning" line above it is gone.
    expect(screen.queryByText(/Wordmet chưa có từ “rizz”/)).not.toBeInTheDocument();
    expect(aiCalls(calls)).toHaveLength(2);
  });

  it('E39: not retryable (and ai-unavailable) → the D11 line, no [Thử lại], manual entry stays', async () => {
    open('rizz', { routes: routes('pro', { 'POST /v1/lookup/ai': () => problem(503, 'ai-lookup-failed', { retryable: false }) }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    expect(await screen.findByText('Hệ thống đang gặp lỗi.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tự nhập nghĩa' })).toBeInTheDocument();
  });

  it('E40: 403 quota-exhausted → "Hết lượt tra AI." with the refill date', async () => {
    open('rizz', { routes: routes('pro', { 'POST /v1/lookup/ai': () => problem(403, 'quota-exhausted', { resets_at: '2030-11-15T00:00:00Z' }) }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    expect(await screen.findByText('Hết lượt tra AI. Lượt tra AI mới vào 15/11.')).toBeInTheDocument();
  });

  it('E24: 403 entitlement-required → the D6 line', async () => {
    open('rizz', { routes: routes('pro', { 'POST /v1/lookup/ai': () => problem(403, 'entitlement-required') }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    expect(await screen.findByText('Dành cho gói Pro. Gói Pro chưa mở bán.')).toBeInTheDocument();
  });

  it('Review Focus 1: a second press while the lookup runs sends nothing', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const { calls } = open('rizz', { routes: routes('pro', { 'POST /v1/lookup/ai': async () => { await gate; return Response.json(RIZZ); } }) });
    const ai = await screen.findByRole('button', { name: 'Tra bằng AI' });
    await userEvent.click(ai);
    await userEvent.click(ai);
    release();
    await screen.findByRole('heading', { name: 'Kết quả cho “rizz”' });
    expect(aiCalls(calls)).toHaveLength(1);
  });
});
