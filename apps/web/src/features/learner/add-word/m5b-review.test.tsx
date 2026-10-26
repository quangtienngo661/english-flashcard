// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
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

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TRAVEL = uuid(201);
const pool = { limit: 100, used: 4, remaining: 96, resets_at: '2030-11-15T00:00:00Z' };
const ENT = {
  plan: 'pro', sources: [], trial_eligible: false, ai_available: { enabled: true, cap_reached: false },
  pools: { practice_sessions: pool, ai_practice: pool, ai_lookup: pool },
  features: { 'ai.practice': { allowed: true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
};
const catalog = (n: number, lemma: string, meaning: string) => ({
  sense_id: uuid(n), entry_id: uuid(n + 10), scope: 'catalog', lemma, pos: 'verb', level: 'A1', context_label: null,
  meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: null, examples: [], topics: [], form_of: null, ai_suggested: false,
});
const RUN = catalog(1, 'run', 'chạy');
const GO = catalog(2, 'go', 'đi');
const suggest = (lemma: string, catalogSenses: unknown[] = []) => ({
  suggestion: { part_of_speech: 'verb', lemma, meaning: { text: `nghĩa của ${lemma}`, language: 'vi' }, definition_en: 'x', examples: [] },
  catalog_senses: catalogSenses,
});
const OK = { item_id: 'i1', sense_id: 's1', created_item: true, created_word: true, sentence_id: null };
const routes = (extra = {}) => ({
  'GET /v1/groups': () => Response.json({ items: [{ id: TRAVEL, name: 'Du lịch', version: 1, total: 3, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json(ENT),
  'GET /v1/topics': () => Response.json({ items: [] }),
  'GET /v1/lookup?q=runnning': () => Response.json({ senses: [], via_inflection: [] }),
  'GET /v1/lookup?q=sprint': () => Response.json({ senses: [], via_inflection: [] }),
  'GET /v1/lookup?q=went': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(12), lemma: 'go', pos: 'verb' }, senses: [GO] }] }),
  'GET /v1/lookup?q=deployed': () => Response.json({ senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(13), lemma: 'deploy', pos: 'verb' }, senses: [] }] }),
  'POST /v1/quick-add': () => Response.json(OK, { status: 201 }),
  ...extra,
});
const quickAdds = (calls: Call[]) => calls.filter((c) => c.method === 'POST' && c.path === '/v1/quick-add');
const open = (word: string, extra = {}) =>
  renderApp(
    <>
      <AddWordSheet initialWord={word} onClose={() => {}} />
      <ToastRegion />
    </>,
    { routes: routes(extra) },
  );

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(LAST_GROUP_KEY, TRAVEL);
});

describe('M5b review findings', () => {
  it('I1: [Chọn] a dictionary meaning saves that word under its own name', async () => {
    const { calls } = open('runnning', { 'POST /v1/lookup/ai': () => Response.json(suggest('run', [RUN])) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Chọn' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu run' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect(quickAdds(calls)[0].body).toEqual({ group_id: TRAVEL, sense_id: RUN.sense_id });
    expect((await screen.findAllByText('Đã lưu từ “run” vào nhóm “Du lịch”.')).length).toBeGreaterThan(0);
  });

  it('I1: a meaning chosen from the AI result is dropped when the word changes', async () => {
    open('runnning', { 'POST /v1/lookup/ai': () => Response.json(suggest('run', [RUN])) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Chọn' }));
    expect(await screen.findByRole('radio', { name: /chạy/ })).toBeChecked();
    const field = screen.getByRole('textbox', { name: 'Từ' });
    await userEvent.clear(field);
    await userEvent.type(field, 'sprint');
    await screen.findByRole('button', { name: 'Tra bằng AI' });
    expect(screen.queryByRole('radio', { name: /chạy/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu run' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lưu sprint' })).not.toBeInTheDocument();
  });

  it('I2: a form the typed text was recognised as is not attached to a different AI word', async () => {
    const { calls } = open('went', { 'POST /v1/lookup/ai': () => Response.json(suggest('go')) });
    await userEvent.click(await screen.findByRole('button', { name: 'Không phải nghĩa bạn cần?' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa rồi lưu' }));
    await screen.findByRole('heading', { name: 'Sửa trước khi lưu' });
    expect(screen.queryByText('Dạng chia của:')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect((quickAdds(calls)[0].body as { new_word: Record<string, unknown> }).new_word).not.toHaveProperty('form_of');
  });

  it('I2: the same word keeps its form; renamed in the form, it loses it', async () => {
    const { calls } = open('deployed', { 'POST /v1/lookup/ai': () => Response.json(suggest('deployed')) });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa rồi lưu' }));
    expect(await screen.findByText('Dạng chia của:')).toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: 'Từ' });
    await userEvent.clear(field);
    await userEvent.type(field, 'shipped');
    expect(screen.queryByText('Dạng chia của:')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(1));
    expect((quickAdds(calls)[0].body as { new_word: Record<string, unknown> }).new_word).not.toHaveProperty('form_of');
  });

  it('M6 → Important: a changed form after a lost connection is a new write with a new key', async () => {
    let n = 0;
    const { calls } = open('runnning', {
      'POST /v1/lookup/ai': () => Response.json(suggest('rizz')),
      'POST /v1/quick-add': () => {
        if (n++ === 0) throw new TypeError('Failed to fetch');
        return Response.json(OK, { status: 201 });
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa rồi lưu' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu từ' }));
    await screen.findAllByRole('alert');
    await userEvent.type(screen.getByRole('textbox', { name: 'Nghĩa' }), ' mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(2));
    expect(quickAdds(calls)[1].headers['Idempotency-Key']).not.toBe(quickAdds(calls)[0].headers['Idempotency-Key']);
  });

  it('M6: the same press retried after a lost connection keeps its key', async () => {
    let n = 0;
    const { calls } = open('runnning', {
      'POST /v1/lookup/ai': () => Response.json(suggest('rizz')),
      'POST /v1/quick-add': () => {
        if (n++ === 0) throw new TypeError('Failed to fetch');
        return Response.json(OK, { status: 201 });
      },
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Tra bằng AI' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sửa rồi lưu' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Lưu từ' }));
    await screen.findAllByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu từ' }));
    await waitFor(() => expect(quickAdds(calls)).toHaveLength(2));
    expect(quickAdds(calls)[1].headers['Idempotency-Key']).toBe(quickAdds(calls)[0].headers['Idempotency-Key']);
  });
});
