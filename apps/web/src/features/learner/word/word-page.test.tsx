// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { problem } from '@/app-shell/session/test-support';
import { ToastRegion } from '@/app-ui/Toast';
import { installSpeech, makeVoice } from '@/lib/speech/speech-test-support';
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
  it('heads with the word, no meaning count (owner 27/10/2026), the level range in "Cùng chủ đề" (M4.6); one block per meaning under its part of speech', async () => {
    renderApp(<WordPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'left' })).toBeInTheDocument();
    expect(within(await screen.findByRole('region', { name: 'Cùng chủ đề: Hướng' })).getByText('trình độ A1 – A2')).toBeInTheDocument();
    expect(screen.queryByText('3 nghĩa')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent).slice(0, 3)).toEqual(['adjective', 'adverb', 'verb']);
    const blocks = screen.getAllByRole('article');
    expect(blocks.map((b) => within(b).getByRole('heading', { level: 3 }).textContent)).toEqual(['bên trái', 'về phía bên trái', 'quá khứ và phân từ của leave']);
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
    const line = await screen.findByText('dạng chia');
    const p = line.closest('p')!;
    expect(p).toHaveTextContent('dạng chia go · goes · going · went · gone');
    expect(within(p).getAllByRole('link').map((a) => a.textContent)).toEqual(['went']);
  });

  it('a learned word can be added to another deck from its own page (owner 27/10/2026; M4.6: [Thêm vào nhóm khác] in "Bạn đang học")', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const card = await screen.findByRole('region', { name: 'Bạn đang học' }, { timeout: 5000 });
    await userEvent.click(within(card).getByRole('button', { name: 'Thêm vào nhóm khác' }));
    expect(await screen.findByRole('dialog', { name: 'Lưu vào nhóm' })).toBeInTheDocument();
  });

  it('a learned meaning: its stage tag and "3 câu đã gặp"; "Bạn đang học" with its deck stage; its sentences in "Câu bạn đã gặp" (M4.6)', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const adverb = (await screen.findAllByRole('article'))[1];
    expect(await within(adverb).findByText('Ngăn 3 ngày · IELTS')).toBeInTheDocument();
    expect(within(adverb).getByRole('button', { name: '3 câu đã gặp' })).toBeInTheDocument();
    const block = screen.getByRole('region', { name: 'Bạn đang học' });
    expect((await within(block).findByText('IELTS')).closest('div')).toHaveTextContent('IELTSNgăn 3 ngày');
    const seen = screen.getByRole('region', { name: 'Câu bạn đã gặp' });
    expect(await within(seen).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Turn left after the bridge.')).toBeInTheDocument();
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
    await screen.findByText('Ngăn 3 ngày · IELTS');
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
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu vào nhóm' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST' && c.path === `/v1/groups/${G}/items`)?.body).toEqual({ sense_id: uuid(1) }));
    expect(await screen.findByText('Đã thêm “left” vào nhóm “IELTS”.')).toBeInTheDocument();
  });

  it('the same-topic box lists other words of the first topic', async () => {
    renderApp(<WordPage />, { routes: routes() });
    const box = await screen.findByRole('region', { name: 'Cùng chủ đề: Hướng' });
    expect(await within(box).findByRole('link', { name: 'right A1' })).toHaveAttribute('href', '/vi/app/word?w=right');
  });

  it('an unknown word: "Không tìm thấy từ" with [Thêm từ này] (Review Focus 5)', async () => {
    nav.params = new URLSearchParams({ w: 'rizz' });
    renderApp(<WordPage />, { routes: routes({ 'GET /v1/words/rizz': () => problem(404, 'not-found') }) });
    expect(await screen.findByText('Không tìm thấy từ “rizz”')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm từ này' })).toBeInTheDocument();
  });
});

describe('WordPage IPA (đợt C §5.3, DC13)', () => {
  const p = (uk: string | null, us: string | null) => ({ uk, us, custom: null, audio: { uk: null, us: null } });
  const LEAD = {
    lemma: 'lead', inflections: [],
    sections: [
      { pos: 'noun', senses: [
        sense(11, 'noun', 'vị trí dẫn đầu', { lemma: 'lead', pronunciation: p('liːd', 'liːd') }),
        sense(12, 'noun', 'chì (kim loại)', { lemma: 'lead', pronunciation: p('led', 'led') }),
      ] },
      { pos: 'verb', senses: [sense(13, 'verb', 'dẫn đường', { lemma: 'lead', pronunciation: p('liːd', 'liːd') })] },
    ],
  };
  afterEach(() => vi.unstubAllGlobals());

  it('each part-of-speech block shows its reading once; the metal sense shows its own /led/ under its meaning', async () => {
    installSpeech([makeVoice('en-GB'), makeVoice('en-US')]);
    nav.params = new URLSearchParams({ w: 'lead' });
    renderApp(<WordPage />, { routes: routes({ 'GET /v1/words/lead': () => Response.json(LEAD) }) });
    const noun = await screen.findByRole('group', { name: 'noun' });
    expect(within(noun).getAllByText('/liːd/')).toHaveLength(2);
    const metal = screen.getAllByRole('article').find((a) => a.textContent?.includes('chì (kim loại)'))!;
    expect(within(metal).getAllByText('/led/')).toHaveLength(2);
    const first = screen.getAllByRole('article').find((a) => a.textContent?.includes('vị trí dẫn đầu'))!;
    expect(within(first).queryByText('/liːd/')).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'verb' })).getAllByText('/liːd/')).toHaveLength(2);
  });
});

describe('WordPage pronunciation (đợt cải thiện A, C1)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('A1-5: the speaker icon by the word (US voice) and a button by the example; saved sentences only with a local US voice', async () => {
    const synth = installSpeech([makeVoice('en-GB'), makeVoice('en-US', false)]);
    renderApp(<WordPage />, { routes: routes() });
    // Đợt C §5.3: the speakers moved from the head to each part-of-speech block (UK and US).
    const adjectiveBlock = await screen.findByRole('group', { name: 'adjective' });
    await userEvent.click(within(adjectiveBlock).getByRole('button', { name: 'Nghe giọng Anh-Mỹ' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'left', lang: 'en-US' }));
    const head = screen.getByRole('heading', { level: 1, name: 'left' }).parentElement!;
    expect(within(head).queryByRole('button')).not.toBeInTheDocument();
    const adjective = screen.getAllByRole('article')[0];
    await userEvent.click(within(adjective).getByRole('button', { name: 'Nghe câu' }));
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Turn left 1.', lang: 'en-US' }));
    const block = screen.getByRole('region', { name: 'Câu bạn đã gặp' });
    await within(block).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Turn left after the bridge.');
    expect(within(block).queryByRole('button', { name: 'Nghe câu' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '3 câu đã gặp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Câu đã gặp · left' });
    await waitFor(() => expect(within(dialog).getAllByRole('listitem')).toHaveLength(3));
    expect(within(dialog).queryByRole('button', { name: 'Nghe câu' })).not.toBeInTheDocument();
  });

  it('a saved sentence is read with the local US voice, in "Câu bạn đã gặp" and in the list', async () => {
    const local = makeVoice('en-US');
    const synth = installSpeech([makeVoice('en-US', false), local]);
    renderApp(<WordPage />, { routes: routes() });
    const block = await screen.findByRole('region', { name: 'Câu bạn đã gặp' });
    await waitFor(() => expect(within(block).getAllByRole('button', { name: 'Nghe câu' })).toHaveLength(3));
    // Newest first: "Turn left after the bridge." (20/10) is the last row.
    await userEvent.click(within(block).getAllByRole('button', { name: 'Nghe câu' })[2]);
    expect(synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Turn left after the bridge.', voice: local }));
    await userEvent.click(screen.getByRole('button', { name: '3 câu đã gặp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Câu đã gặp · left' });
    await waitFor(() => expect(within(dialog).getAllByRole('button', { name: 'Nghe câu' })).toHaveLength(3));
  });
});

describe('WordPage new look (giao diện mới M4.6, Figma 118:4413)', () => {
  const pr = (uk: string, us: string) => ({ uk, us, custom: null, audio: { uk: null, us: null } });
  const W1 = '33333333-3333-4333-8333-333333333331';
  const W2 = '33333333-3333-4333-8333-333333333332';
  const rec = (n: number, pos: string, meaning: string, over = {}) =>
    sense(n, pos, meaning, { lemma: 'record', level: 'B1', topics: [{ code: 'work', name: 'Công việc' }], examples: [`Keep a record ${n}.`], ...over });
  const RECORD = {
    lemma: 'record',
    inflections: [{ kind: 'plural', form: 'records', has_page: false }, { kind: 'past', form: 'recorded', has_page: false }],
    sections: [
      { pos: 'noun', senses: [
        rec(21, 'noun', 'bản ghi, hồ sơ', { level: 'A2', sentence_count: 2, pronunciation: pr('ˈrek.ɔːd', 'ˈrek.ɚd') }),
        rec(22, 'noun', 'kỷ lục', { pronunciation: pr('ˈrek.ɔːd', 'ˈrek.ɚd') }),
      ] },
      { pos: 'verb', senses: [rec(23, 'verb', 'ghi lại, lưu lại', { pronunciation: pr('rɪˈkɔːd', 'rɪˈkɔːrd') })] },
    ],
  };
  const recordRoutes = (extra = {}) => routes({
    'GET /v1/words/record': () => Response.json(RECORD),
    [`GET /v1/items?sense_ids=${uuid(21)},${uuid(22)},${uuid(23)}`]: () => Response.json({ items: [
      { sense_id: uuid(21), item_id: uuid(94), level: 2, due_date: '2026-11-12', priority: false, group_ids: [W1] },
      { sense_id: uuid(23), item_id: uuid(95), level: 0, due_date: '2026-11-10', priority: false, group_ids: [W2] },
    ] }),
    'GET /v1/groups': () => Response.json({ items: [
      { id: W1, name: 'Đề 12 · Writing', version: 1, total: 10, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 },
      { id: W2, name: 'Đề 14 · Reading', version: 1, total: 4, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 },
    ] }),
    [`GET /v1/senses/${uuid(21)}/sentences`]: () => Response.json({ items: [
      { id: uuid(61), text: 'Official records show less rain.', created_at: '2026-11-02T03:00:00Z' },
      { id: uuid(62), text: 'The company kept no record of the meeting.', created_at: '2026-11-05T03:00:00Z' },
    ] }),
    'GET /v1/words?page_size=8&topic=work': () => Response.json({ items: [
      { lemma: 'record', pos_list: ['noun'], level: 'B1', meaning_preview: 'bản ghi', has_private: false },
      { lemma: 'schedule', pos_list: ['noun'], level: 'A2', meaning_preview: 'lịch', has_private: false },
    ], next_page_token: null }),
    ...extra,
  });
  beforeEach(() => {
    nav.params = new URLSearchParams({ w: 'record' });
  });

  it('the head reads each part of speech in UK and US, each with its own speaker', async () => {
    renderApp(<WordPage />, { routes: recordRoutes() });
    const noun = await screen.findByRole('group', { name: 'noun' });
    expect(within(noun).getByText('UK')).toBeInTheDocument();
    expect(within(noun).getByText('/ˈrek.ɔːd/')).toBeInTheDocument();
    expect(within(noun).getByText('/ˈrek.ɚd/')).toBeInTheDocument();
    expect(within(noun).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Nghe giọng Anh-Anh', 'Nghe giọng Anh-Mỹ']);
    expect(within(screen.getByRole('group', { name: 'verb' })).getByText('/rɪˈkɔːrd/')).toBeInTheDocument();
  });

  it('the tabs jump inside the page: "Nghĩa 3", "Câu đã gặp 2"', async () => {
    renderApp(<WordPage />, { routes: recordRoutes() });
    expect(await screen.findByRole('link', { name: 'Nghĩa 3' })).toHaveAttribute('href', '#nghia');
    expect(screen.getByRole('link', { name: 'Câu đã gặp 2' })).toHaveAttribute('href', '#cau-da-gap');
    expect(await screen.findByRole('region', { name: 'Câu bạn đã gặp' })).toHaveAttribute('id', 'cau-da-gap');
  });

  it('a learned meaning shows its stage and group; one not learned has [Thêm vào nhóm] that opens "Lưu vào nhóm"', async () => {
    renderApp(<WordPage />, { routes: recordRoutes() });
    const [first, second, verb] = await screen.findAllByRole('article');
    expect(await within(first).findByText('Ngăn 3 ngày · Đề 12 · Writing')).toBeInTheDocument();
    expect(within(verb).getByText('Mới · Đề 14 · Reading')).toBeInTheDocument();
    await userEvent.click(within(second).getByRole('button', { name: 'Thêm vào nhóm' }));
    expect(await screen.findByRole('dialog', { name: 'Lưu vào nhóm' })).toBeInTheDocument();
  });

  it('"Câu bạn đã gặp" lists every saved sentence, newest first, with its meaning and date', async () => {
    renderApp(<WordPage />, { routes: recordRoutes() });
    const box = await screen.findByRole('region', { name: 'Câu bạn đã gặp' });
    await waitFor(() => expect(within(box).getAllByRole('listitem')).toHaveLength(2));
    const rows = within(box).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('The company kept no record of the meeting.');
    expect(within(rows[0]).getByText('nghĩa 1 · bản ghi, hồ sơ · ghi ngày 05/11/2026')).toBeInTheDocument();
    expect(within(rows[1]).getByText('nghĩa 1 · bản ghi, hồ sơ · ghi ngày 02/11/2026')).toBeInTheDocument();
  });

  it('"Bạn đang học" shows the next review and each group with its stage', async () => {
    renderApp(<WordPage />, { routes: recordRoutes() });
    const block = await screen.findByRole('region', { name: 'Bạn đang học' });
    expect(within(block).getByText('bản ghi, hồ sơ')).toBeInTheDocument();
    expect(within(block).getByText('Thứ Năm, 12/11')).toBeInTheDocument();
    const row = (await within(block).findByText('Đề 12 · Writing')).closest('div')!;
    expect(row).toHaveTextContent('Đề 12 · WritingNgăn 3 ngày');
  });

  it('"Thêm câu đã gặp" with two learned meanings asks which one, and saves the sentence to it', async () => {
    const { calls } = renderApp(<WordPage />, {
      routes: recordRoutes({ [`POST /v1/senses/${uuid(23)}/sentences`]: () => Response.json({ id: uuid(63) }, { status: 201 }) }),
    });
    const box = await screen.findByRole('region', { name: 'Câu bạn đã gặp' });
    await userEvent.click(await within(box).findByRole('button', { name: 'Thêm câu đã gặp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm câu đã gặp' });
    await userEvent.click(within(dialog).getByRole('button', { name: /Nghĩa/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'verb · ghi lại, lưu lại' }));
    await userEvent.type(within(dialog).getByRole('textbox'), 'They recorded it.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu câu' }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST' && c.path.endsWith('/sentences')).map((c) => c.path)).toEqual([`/v1/senses/${uuid(23)}/sentences`]));
    expect(calls.find((c) => c.method === 'POST' && c.path.endsWith('/sentences'))!.body).toEqual({ text: 'They recorded it.' });
  });

  it('"Cùng chủ đề": the topic, the level range, the other words and a link to the topic page', async () => {
    renderApp(<WordPage />, { routes: recordRoutes() });
    const box = await screen.findByRole('region', { name: 'Cùng chủ đề: Công việc' });
    expect(within(box).getByText('trình độ A2 – B1')).toBeInTheDocument();
    expect(await within(box).findByRole('link', { name: 'schedule A2' })).toHaveAttribute('href', '/vi/app/word?w=schedule');
    expect(within(box).queryByRole('link', { name: /^record/ })).not.toBeInTheDocument();
    expect(within(box).getByRole('link', { name: 'Xem chủ đề Công việc →' })).toHaveAttribute('href', '/vi/app/topic?code=work&level=A2');
  });
});
