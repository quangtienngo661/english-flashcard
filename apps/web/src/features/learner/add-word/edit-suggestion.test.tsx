// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Call } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
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

const TRAVEL = '00000000-0000-4000-8000-000000000201';
const pool = { limit: 100, used: 4, remaining: 96, resets_at: '2030-11-15T00:00:00Z' };
const ENT = {
  plan: 'pro', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool },
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
};
const RIZZ = {
  suggestion: { part_of_speech: 'noun', lemma: 'rizz', meaning: { text: 'sức hút, khả năng tán tỉnh', language: 'vi' }, definition_en: 'charm', examples: ["He's got serious rizz."] },
  catalog_senses: [],
};
const routes = (extra = {}) => ({
  'GET /v1/groups': () => Response.json({ items: [{ id: TRAVEL, name: 'Du lịch', version: 1, total: 3, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'GET /v1/topics': () => Response.json({ items: [{ code: 'daily-life', name: 'Đời sống' }, { code: 'travel', name: 'Du lịch' }] }),
  'GET /v1/lookup?q=rizz': () => Response.json({ senses: [], via_inflection: [] }),
  'POST /v1/lookup/ai': () => Response.json(RIZZ),
  'POST /v1/quick-add': () => Response.json({ item_id: 'i1', sense_id: 's1', created_item: true, created_word: true, sentence_id: null }, { status: 201 }),
  ...extra,
});
const quickAdds = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/quick-add');

async function openEdit(extra = {}) {
  const view = renderApp(
    <>
      <AddWordSheet initialWord="rizz" onClose={() => {}} />
      <ToastRegion />
    </>,
    { routes: routes(extra) },
  );
  await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Sửa rồi lưu' }));
  await screen.findByRole('heading', { name: 'Sửa trước khi lưu' });
  return view;
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
});

describe('Edit before saving (K/87)', () => {
  it('the form starts from the suggestion: word, part of speech, meaning, up to two examples; no level from AI', async () => {
    await openEdit();
    expect(screen.getByRole('textbox', { name: 'Từ' })).toHaveValue('rizz');
    expect(screen.getByRole('textbox', { name: 'Nghĩa' })).toHaveValue('sức hút, khả năng tán tỉnh');
    expect(screen.getByRole('button', { name: /Loại từ/ })).toHaveTextContent('noun');
    expect(screen.getByRole('button', { name: /Trình độ/ })).not.toHaveTextContent(/[ABC][12]/);
    expect(screen.getByRole('textbox', { name: 'Câu ví dụ 1' })).toHaveValue("He's got serious rizz.");
    expect(screen.getByText('Tối đa 300 ký tự mỗi câu.')).toBeInTheDocument();
    expect(screen.getByText('Từ này mang nhãn AI gợi ý tới khi bạn sửa nghĩa, chủ đề hoặc câu ví dụ.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Thêm câu ví dụ' }));
    expect(screen.getByRole('textbox', { name: 'Câu ví dụ 2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Thêm câu ví dụ' })).not.toBeInTheDocument();
  });

  it('[Lưu từ] sends the edited word with ai_suggestion, the level and topic chosen, and the examples', async () => {
    const { calls } = await openEdit();
    await userEvent.click(screen.getByRole('button', { name: /Trình độ/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'B2' }));
    await userEvent.click(screen.getByRole('button', { name: /Chủ đề/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Đời sống' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({
      group_id: TRAVEL,
      new_word: {
        lemma: 'rizz', meaning: 'sức hút, khả năng tán tỉnh', pos: 'noun', level: 'B2', topics: ['daily-life'],
        examples: ["He's got serious rizz."], ai_suggestion: true,
      },
    });
    expect(await screen.findByText('Đã lưu từ “rizz” vào nhóm “Du lịch”.')).toBeInTheDocument();
  });

  it('an emptied example is not sent; an empty meaning stops the save', async () => {
    const { calls } = await openEdit();
    await userEvent.clear(screen.getByRole('textbox', { name: 'Câu ví dụ 1' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'Nghĩa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    expect(await screen.findByText('Nhập nghĩa của từ.')).toBeInTheDocument();
    expect(quickAdds(calls)).toHaveLength(0);
    await userEvent.type(screen.getByRole('textbox', { name: 'Nghĩa' }), 'sức hút');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect((quickAdds(calls)[0].body as { new_word: { examples: string[] } }).new_word.examples).toEqual([]);
  });

  it('[Hủy] goes back to the result without saving', async () => {
    const { calls } = await openEdit();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));
    expect(await screen.findByRole('heading', { name: 'Kết quả cho “rizz”' })).toBeInTheDocument();
    expect(quickAdds(calls)).toHaveLength(0);
  });

  it('Review Focus 1: a second press while saving sends nothing', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const { calls } = await openEdit({
      'POST /v1/quick-add': async () => {
        await gate;
        return Response.json({ item_id: 'i1', sense_id: 's1', created_item: true, created_word: true, sentence_id: null }, { status: 201 });
      },
    });
    const save = screen.getByRole('button', { name: 'Lưu từ' });
    await userEvent.click(save);
    await userEvent.click(save);
    release();
    // Toasts of earlier tests stay in the shared toast store: count the new one, not just any.
    await waitFor(() => expect(screen.getAllByText('Đã lưu từ “rizz” vào nhóm “Du lịch”.').length).toBeGreaterThan(0));
    expect(quickAdds(calls)).toHaveLength(1);
  });
});
