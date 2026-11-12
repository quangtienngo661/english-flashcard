// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { renderApp } from '@/app-ui/test-utils';
import { AddWordProvider, useAddWord } from './add-word-context';
import { AddWordSheet } from './AddWordSheet';
import { DeckPickerDialog } from './DeckPickerDialog';
import { LAST_GROUP_KEY } from './last-group';

// Giao diện mới M4.4: the five add-word overlays (Figma M4 B).

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const WORK = uuid(201);
const JAPAN = uuid(202);
const cells = [
  { level: 0, total: 10, due: 0 },
  { level: 2, total: 14, due: 3 },
];
const deck = (id: string, name: string, total: number) => ({
  id, name, version: 1, total, today: { priority: 0, due: 0, new: 0 }, cells: total ? cells : [], backlog: 0, available: { due: 0, new: 0 },
});
const goSense = {
  sense_id: uuid(1), entry_id: uuid(11), scope: 'catalog', lemma: 'go', pos: 'verb', level: 'A1', context_label: null,
  meaning: { text: 'đi', language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
};
const pool = { limit: 5, used: 1, remaining: 4, resets_at: '2030-11-15T00:00:00Z' };
const routes = {
  'GET /v1/groups': () => Response.json({ items: [deck(WORK, 'Công việc · B1', 24), deck(JAPAN, 'Du lịch Nhật', 0)] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () =>
    Response.json({ plan: 'pro', sources: [], pools: { ai_lookup: pool }, features: { 'ai.lookup': { allowed: true, reason: null } } }),
  'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(11), lemma: 'go', pos: 'verb' }, senses: [goSense] }] }),
  'GET /v1/lookup?q=cap': () => Response.json({ senses: [], via_inflection: [] }),
  'POST /v1/lookup/ai': () =>
    Response.json({
      suggestion: { part_of_speech: 'verb', lemma: 'cap', meaning: { text: 'nói dối, nói phét', language: 'vi' }, definition_en: 'to lie', examples: ['Stop capping, you never met him.'] },
      catalog_senses: [],
    }),
  'POST /v1/quick-add': () => Response.json({ item_id: uuid(90), sense_id: uuid(1), created_item: true, created_word: false, sentence_id: null }, { status: 201 }),
};

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(LAST_GROUP_KEY, WORK);
});

describe('Overlay 1: Bạn vừa gặp từ nào?', () => {
  it('the inflection row reads "went → go · quá khứ của go" and the save button is "Lưu"', async () => {
    const { calls } = renderApp(<AddWordSheet initialWord="went" onClose={() => {}} />, { routes });
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === 'went → go · quá khứ của go')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(calls.filter((c) => c.path === '/v1/quick-add')).toHaveLength(1));
    expect(calls.find((c) => c.path === '/v1/quick-add')?.body).toEqual({ group_id: WORK, sense_id: uuid(1) });
  });

  it('opening Thêm từ for the first time loads the dialog (next/dynamic)', async () => {
    function OpenOnMount() {
      const { open } = useAddWord();
      useEffect(() => open('went'), [open]);
      return null;
    }
    renderApp(
      <AddWordProvider>
        <OpenOnMount />
      </AddWordProvider>,
      { routes },
    );
    expect(await screen.findByRole('dialog', { name: 'Bạn vừa gặp từ nào?' })).toBeInTheDocument();
  });
});

describe('Overlay 4: AI result', () => {
  it('shows the preview card "thẻ sẽ lưu · xem trước" with the AI meaning', async () => {
    renderApp(<AddWordSheet initialWord="cap" onClose={() => {}} />, { routes });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    const preview = await screen.findByRole('region', { name: 'Thẻ sẽ lưu · xem trước' });
    expect(within(preview).getByText('nói dối, nói phét')).toBeInTheDocument();
    expect(within(preview).getByText('cap')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sửa rồi lưu' })).toBeInTheDocument();
  });
});

describe('Overlay 5: Lưu vào nhóm', () => {
  it('each deck row has its colour square; a deck with words has the six-stage bar, an empty one has none', async () => {
    renderApp(<DeckPickerDialog sense={{ sense_id: uuid(1), lemma: 'record', pos: 'noun', meaning: { text: 'bản ghi, hồ sơ' } }} onClose={() => {}} />, { routes });
    const all = await screen.findByRole('radiogroup', { name: 'Tất cả nhóm (2), A–Z' });
    const work = within(all).getByRole('radio', { name: /Công việc · B1/ }).closest('label')!;
    const japan = within(all).getByRole('radio', { name: /Du lịch Nhật/ }).closest('label')!;
    expect(work.querySelector('[data-group-square]')).not.toBeNull();
    expect(japan.querySelector('[data-group-square]')).not.toBeNull();
    expect(within(work).getByRole('figure')).toBeInTheDocument();
    expect(within(japan).queryByRole('figure')).not.toBeInTheDocument();
    expect(within(japan).getByText('0 từ')).toBeInTheDocument();
  });
});
