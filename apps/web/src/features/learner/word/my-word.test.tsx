// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hardReplace } from '@/app-shell/navigate';
import type { Call } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { renderApp } from '@/app-ui/test-utils';
import { WordPage } from './WordPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/word',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ w: 'rizz' }),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const SENSE = '00000000-0000-4000-8000-000000000001';
const ENTRY = '00000000-0000-4000-8000-000000000011';
const G = '22222222-2222-4222-8222-222222222222';
const page = (over: Record<string, unknown> = {}) => ({
  lemma: 'rizz',
  inflections: [],
  sections: [{
    pos: 'noun',
    senses: [{
      sense_id: SENSE, entry_id: ENTRY, scope: 'private', lemma: 'rizz', pos: 'noun', level: 'B2', context_label: null,
      meaning: { text: 'sức hút, khả năng tán tỉnh', language: 'vi', translation_missing: false },
      // A private word has no English definition; one here must still not show (K/88, §15 point 11).
      definition_en: 'charm', examples: ["He's got serious rizz."], topics: [{ code: 'daily-life', name: 'Đời sống' }], form_of: null,
      ai_suggested: true, sentence_count: 1, ...over,
    }],
  }],
});
const routes = (pages: Array<ReturnType<typeof page>>, extra = {}) => {
  let reads = 0;
  return {
    'GET /v1/words/rizz': () => Response.json(pages[Math.min(reads++, pages.length - 1)]),
    [`GET /v1/items?sense_ids=${SENSE}`]: () => Response.json({ items: [{ sense_id: SENSE, item_id: 'i1', level: 0, due_date: '2026-10-25', priority: false, group_ids: [G] }] }),
    'GET /v1/groups': () => Response.json({ items: [{ id: G, name: 'Du lịch', version: 1, total: 3, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
    'GET /v1/words?page_size=8&topic=daily-life': () => Response.json({ items: [], next_page_token: null }),
    'GET /v1/topics': () => Response.json({ items: [{ code: 'daily-life', name: 'Đời sống' }, { code: 'travel', name: 'Du lịch' }] }),
    'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
    'GET /v1/me/entitlements': () => Response.json({ plan: 'pro', pools: {}, sources: [] }),
    [`PATCH /v1/my-words/${ENTRY}`]: () => new Response(null, { status: 204 }),
    [`DELETE /v1/my-words/${ENTRY}`]: () => new Response(null, { status: 204 }),
    ...extra,
  };
};
const writes = (calls: Call[], method: string) => calls.filter((c) => c.method === method && c.path === `/v1/my-words/${ENTRY}`);
const open = (pages: Array<ReturnType<typeof page>>, extra = {}) =>
  renderApp(
    <>
      <WordPage />
      <ToastRegion />
    </>,
    { routes: routes(pages, extra) },
  );

describe('My word page (K/88)', () => {
  it('shows "Từ của tôi" and "AI gợi ý", the source line, no English definition, and [Sửa] [Xóa từ]', async () => {
    open([page()]);
    const head = await screen.findByRole('heading', { level: 1, name: 'rizz' });
    const top = head.parentElement!;
    expect(within(top).getByText('Từ của tôi')).toBeInTheDocument();
    expect(within(top).getByText('AI gợi ý')).toBeInTheDocument();
    expect(screen.getByText('Nguồn: AI gợi ý. Nghĩa này chưa ai duyệt, bạn nên kiểm lại.')).toBeInTheDocument();
    expect(screen.queryByText('charm')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sửa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa từ' })).toBeInTheDocument();
  });

  it('a private word the learner typed has no "AI gợi ý" label or source line', async () => {
    open([page({ ai_suggested: false })]);
    await screen.findByRole('heading', { level: 1, name: 'rizz' });
    expect(screen.getByText('Từ của tôi')).toBeInTheDocument();
    expect(screen.queryByText('AI gợi ý')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nguồn: AI gợi ý/)).not.toBeInTheDocument();
  });

  it('editing the meaning sends only that change; after the refetch the "AI gợi ý" label is gone', async () => {
    const { calls } = open([page(), page({ ai_suggested: false, meaning: { text: 'sức hấp dẫn', language: 'vi', translation_missing: false } })]);
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa từ' });
    expect(within(dialog).getByRole('textbox', { name: 'Nghĩa' })).toHaveValue('sức hút, khả năng tán tỉnh');
    expect(within(dialog).getByRole('button', { name: /Trình độ/ })).toHaveTextContent('B2');
    await userEvent.clear(within(dialog).getByRole('textbox', { name: 'Nghĩa' }));
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Nghĩa' }), 'sức hấp dẫn');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(writes(calls, 'PATCH')).toHaveLength(1));
    expect(writes(calls, 'PATCH')[0].body).toEqual({ senses: [{ sense_id: SENSE, meaning: 'sức hấp dẫn' }] });
    expect(writes(calls, 'PATCH')[0].headers['Idempotency-Key']).toBeTruthy();
    // The meaning shows in the block and in "Bạn đang học".
    expect((await screen.findAllByText('sức hấp dẫn')).length).toBeGreaterThan(0);
    expect(screen.queryByText('AI gợi ý')).not.toBeInTheDocument();
  });

  it('editing only the part of speech keeps the label (the API keeps ai_suggested)', async () => {
    const { calls } = open([page(), page({ pos: 'verb' })]);
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa từ' });
    await userEvent.click(within(dialog).getByRole('button', { name: /Loại từ/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'verb' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(writes(calls, 'PATCH')).toHaveLength(1));
    expect(writes(calls, 'PATCH')[0].body).toEqual({ pos: 'verb' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sửa từ' })).not.toBeInTheDocument());
    expect(screen.getAllByText('AI gợi ý').length).toBeGreaterThan(0);
  });

  it('editing the examples or topic sends them as the API expects', async () => {
    const { calls } = open([page()]);
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa từ' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Câu ví dụ 1' }), '!');
    await userEvent.click(within(dialog).getByRole('button', { name: /Chủ đề/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Du lịch' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(writes(calls, 'PATCH')).toHaveLength(1));
    expect(writes(calls, 'PATCH')[0].body).toEqual({ topics: ['travel'], senses: [{ sense_id: SENSE, examples: ["He's got serious rizz.!"] }] });
  });

  it('nothing changed → no request, the dialog closes', async () => {
    const { calls } = open([page()]);
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa từ' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sửa từ' })).not.toBeInTheDocument());
    expect(writes(calls, 'PATCH')).toHaveLength(0);
  });

  it('[Xóa từ] asks first, then deletes once and goes back to Tra từ', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const { calls } = open([page()], {
      [`DELETE /v1/my-words/${ENTRY}`]: async () => {
        await gate;
        return new Response(null, { status: 204 });
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Xóa từ' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa từ “rizz”?' });
    const confirm = within(dialog).getByRole('button', { name: 'Xóa từ' });
    await userEvent.click(confirm);
    await userEvent.click(confirm);
    release();
    await waitFor(() => expect(hardReplace).toHaveBeenCalledWith('/vi/app/lookup'));
    expect(writes(calls, 'DELETE')).toHaveLength(1);
    expect(writes(calls, 'DELETE')[0].headers['Idempotency-Key']).toBeTruthy();
  });
});
