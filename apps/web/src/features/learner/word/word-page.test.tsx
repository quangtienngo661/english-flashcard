// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { installSpeech, makeVoice } from '@/app-ui/speech-test-support';
import { renderApp } from '@/app-ui/test-utils';
import { WordPage } from './WordPage';

const nav = vi.hoisted(() => ({ params: new URLSearchParams({ w: 'left' }) }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/word',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => nav.params,
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 20_000 });

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const G = '22222222-2222-4222-8222-222222222222';
const sense = (n: number, pos: string, meaning: string, over = {}) => ({
  sense_id: uuid(n), entry_id: `e-${pos}`, scope: 'catalog', lemma: 'left', pos, level: n === 3 ? 'A1' : 'A2', context_label: null,
  meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: `definition ${n}`, examples: [`Turn left ${n}.`],
  topics: [{ code: 'direction', name: 'Hướng' }], form_of: null, ai_suggested: false, sentence_count: 0, ...over,
});
const LEFT = {
  lemma: 'left',
  inflections: [],
  sections: [
    { pos: 'adjective', senses: [sense(1, 'adjective', 'bên trái')] },
    { pos: 'adverb', senses: [sense(2, 'adverb', 'về phía bên trái', { sentence_count: 3 })] },
    { pos: 'verb', senses: [sense(3, 'verb', 'quá khứ và phân từ của leave', { form_of: { entry_id: 'e-leave', lemma: 'leave', pos: 'verb', kind: 'past' } })] },
  ],
};
const LEAVE = { lemma: 'leave', inflections: [{ kind: 'past', form: 'left', has_page: true }, { kind: 'past_participle', form: 'left', has_page: true }], sections: [] };
const SENTENCES = [
  { id: uuid(51), text: 'Turn left after the bridge.', created_at: '2026-10-20T03:00:00Z' },
  { id: uuid(52), text: 'We went left at the lights.', created_at: '2026-10-21T03:00:00Z' },
  { id: uuid(53), text: 'Go left here.', created_at: '2026-10-22T03:00:00Z' },
];
const routes = (extra = {}) => ({
  'GET /v1/words/left': () => Response.json(LEFT),
  'GET /v1/words/leave': () => Response.json(LEAVE),
  [`GET /v1/items?sense_ids=${uuid(1)},${uuid(2)},${uuid(3)}`]: () =>
    Response.json({ items: [{ sense_id: uuid(2), item_id: uuid(90), level: 2, due_date: '2026-10-25', priority: false, group_ids: [G] }] }),
  'GET /v1/groups': () => Response.json({ items: [{ id: G, name: 'IELTS', version: 1, total: 10, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 }] }),
  [`GET /v1/senses/${uuid(2)}/sentences`]: () => Response.json({ items: SENTENCES }),
  'GET /v1/words?page_size=8&topic=direction': () => Response.json({ items: [{ lemma: 'right', pos_list: ['noun'], level: 'A1', meaning_preview: 'phải', has_private: false }], next_page_token: null }),
  'GET /v1/me/app-config': () => Response.json({ learning: { backlog_after_days: 60, groups_per_user: 100 } }),
  'GET /v1/me/entitlements': () => Response.json({ plan: 'free', pools: {}, sources: [] }),
  ...extra,
});

beforeEach(() => {
  nav.params = new URLSearchParams({ w: 'left' });
});

describe('WordPage (K/31–K/33, M/41)', () => {
  it('heads with the word, its level range and how many meanings; one numbered block per meaning with its definition', async () => {
    renderApp(<WordPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'left' })).toBeInTheDocument();
    expect(screen.getByText('A1 – A2')).toBeInTheDocument();
    expect(screen.getByText('3 nghĩa')).toBeInTheDocument();
    const blocks = screen.getAllByRole('article');
    expect(blocks.map((b) => within(b).getByRole('heading', { level: 2 }).textContent)).toEqual(['adjective', 'adverb', 'verb']);
    expect(within(blocks[0]).getByText('bên trái')).toBeInTheDocument();
    expect(within(blocks[0]).getByText('definition 1')).toBeInTheDocument();
  });

  it('a form of another word: the banner names the base and its forms, the meaning links to the base', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const banner = await screen.findByText(/Cũng là dạng chia của leave/);
    expect(within(banner.closest('p')!).getByRole('link', { name: 'leave' })).toHaveAttribute('href', '/vi/app/word?w=leave');
    const verb = screen.getAllByRole('article')[2];
    expect(within(verb).getByRole('link', { name: 'leave' })).toHaveAttribute('href', '/vi/app/word?w=leave');
  });

  it('the forms line links only the forms that have a page', async () => {
    nav.params = new URLSearchParams({ w: 'go' });
    renderApp(<WordPage />, {
      routes: routes({
        'GET /v1/words/go': () => Response.json({
          lemma: 'go',
          inflections: [{ kind: 'third_person', form: 'goes', has_page: false }, { kind: 'present_participle', form: 'going', has_page: false }, { kind: 'past', form: 'went', has_page: true }, { kind: 'past_participle', form: 'gone', has_page: false }],
          sections: [{ pos: 'verb', senses: [sense(4, 'verb', 'đi', { lemma: 'go' })] }],
        }),
        [`GET /v1/items?sense_ids=${uuid(4)}`]: () => Response.json({ items: [] }),
      }),
    });
    const line = await screen.findByText('Dạng chia:');
    const p = line.closest('p')!;
    expect(p).toHaveTextContent('Dạng chia: go · goes · going · went · gone');
    expect(within(p).getAllByRole('link').map((a) => a.textContent)).toEqual(['went']);
  });

  it('a learned meaning: "Đang học · IELTS · 3 câu đã gặp" and the "Bạn đang học" block with its deck stage and first sentence', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const adverb = (await screen.findAllByRole('article'))[1];
    expect(await within(adverb).findByText(/Đang học · IELTS/)).toBeInTheDocument();
    expect(within(adverb).getByRole('button', { name: '3 câu đã gặp' })).toBeInTheDocument();
    const block = screen.getByRole('region', { name: 'Bạn đang học' });
    expect(within(block).getByText('IELTS · ngăn 3 ngày')).toBeInTheDocument();
    expect(await within(block).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Turn left after the bridge.')).toBeInTheDocument();
  });

  it('GE2: a meaning without sentences shows no "câu đã gặp" line', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const adjective = (await screen.findAllByRole('article'))[0];
    expect(within(adjective).queryByText(/câu đã gặp/)).not.toBeInTheDocument();
  });

  it('GE4: deleting a sentence from the list takes it out and lowers the count', async () => {
    let sentences = SENTENCES;
    let count = 3;
    const { calls } = renderApp(<WordPage />, {
      routes: routes({
        'GET /v1/words/left': () => Response.json({ ...LEFT, sections: LEFT.sections.map((s) => ({ ...s, senses: s.senses.map((x) => (x.sense_id === uuid(2) ? { ...x, sentence_count: count } : x)) })) }),
        [`GET /v1/senses/${uuid(2)}/sentences`]: () => Response.json({ items: sentences }),
        [`DELETE /v1/sentences/${uuid(51)}`]: () => {
          sentences = sentences.slice(1);
          count = 2;
          return new Response(null, { status: 204 });
        },
      }),
    });
    // The count moves into the "Đang học" chip once the learning state arrives; press it there.
    await screen.findByText(/Đang học · IELTS/);
    await userEvent.click(screen.getByRole('button', { name: '3 câu đã gặp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Câu đã gặp · left' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(within(dialog).getAllByRole('button', { name: 'Xóa câu' })[0]);
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(2));
    expect(calls.find((c) => c.method === 'DELETE')!.headers['Idempotency-Key']).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(await screen.findByRole('button', { name: '2 câu đã gặp' })).toBeInTheDocument();
  });

  it('"Thêm vào nhóm" on a meaning not learned yet opens K/42 and adds it to the chosen deck', async () => {
    const { calls } = renderApp(
      <>
        <WordPage />
        <ToastRegion />
      </>,
      { routes: routes({ [`POST /v1/groups/${G}/items`]: () => Response.json({ item_id: uuid(91), level: 0, due_date: '2026-10-23', created: true }) }) },
    );
    const adjective = (await screen.findAllByRole('article'))[0];
    await userEvent.click(within(adjective).getByRole('button', { name: 'Thêm vào nhóm' }));
    const dialog = await screen.findByRole('dialog', { name: 'Lưu vào nhóm' });
    await userEvent.click(within(dialog).getAllByRole('radio', { name: /IELTS/ })[0]);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu vào IELTS' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.path === `/v1/groups/${G}/items`)?.body).toEqual({ sense_id: uuid(1) }));
    expect(await screen.findByText('Đã thêm “left” vào nhóm “IELTS”.')).toBeInTheDocument();
  });

  it('the same-topic box lists other words of the first topic', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const box = await screen.findByRole('region', { name: 'Cùng chủ đề: Hướng' });
    expect(await within(box).findByRole('link', { name: 'right' })).toHaveAttribute('href', '/vi/app/word?w=right');
  });

  it('an unknown word: "Không tìm thấy từ" with [Thêm từ này] (Review Focus 5)', async () => {
    nav.params = new URLSearchParams({ w: 'rizz' });
    renderApp(<WordPage />, { routes: routes({ 'GET /v1/words/rizz': () => problem(404, 'not-found') }) });
    expect(await screen.findByText('Không tìm thấy từ “rizz”')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm từ này' })).toBeInTheDocument();
  });
});

describe('WordPage pronunciation (đợt cải thiện A, C1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('A1-5: UK · US by the word and a button by the example; saved sentences only with a local US voice', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US', false)]);
    renderApp(<WordPage />, { routes: routes() });
    const head = (await screen.findByRole('heading', { level: 1, name: 'left' })).parentElement!;
    await userEvent.click(within(head).getByRole('button', { name: 'Nghe giọng Anh' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'left', lang: 'en-GB' }));
    expect(within(head).getByRole('button', { name: 'Nghe giọng Mỹ' })).toBeInTheDocument();
    const adjective = screen.getAllByRole('article')[0];
    await userEvent.click(within(adjective).getByRole('button', { name: 'Nghe câu' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Turn left 1.', lang: 'en-US' }));
    const block = screen.getByRole('region', { name: 'Bạn đang học' });
    await within(block).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Turn left after the bridge.');
    expect(within(block).queryByRole('button', { name: 'Nghe câu' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '3 câu đã gặp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Câu đã gặp · left' });
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(3));
    expect(within(dialog).queryByRole('button', { name: 'Nghe câu' })).not.toBeInTheDocument();
  });

  it('a saved sentence is read with the local US voice, in the block and in the list', async () => {
    const local = makeVoice('en-US');
    const synth = installSpeech([makeVoice('en-US', false), local]);
    renderApp(<WordPage />, { routes: routes() });
    const block = await screen.findByRole('region', { name: 'Bạn đang học' });
    await userEvent.click(await within(block).findByRole('button', { name: 'Nghe câu' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Turn left after the bridge.', voice: local }));
    await userEvent.click(screen.getByRole('button', { name: '3 câu đã gặp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Câu đã gặp · left' });
    await waitFor(() => expect(within(dialog).getAllByRole('button', { name: 'Nghe câu' })).toHaveLength(3));
  });
});
