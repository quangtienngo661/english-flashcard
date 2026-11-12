// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FocusLayout from '@/app/[locale]/app/(member)/(focus)/layout.app';
import type { Route } from '@/app-shell/session/test-support';
import { renderApp } from '@/test-utils/render-app';
import { testRoute } from '@/test-utils/route-locale';
import { PracticeSession } from '@/features/learner/practice/session/PracticeSession';
import type { Card } from '@/features/learner/groups/groups-api';
import { ReviewSession } from '@/features/learner/review/ReviewSession';

// QM9-9 (Part 10, P.11): Học, Phiên luyện and Ôn speak English in every locale, while links and the Vietnamese-only blocks follow the route.
const params = { current: new URLSearchParams() };
vi.mock('next/navigation', () => ({
  usePathname: () => `/${testRoute.locale}/app/review`,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => params.current,
  useParams: () => ({ locale: testRoute.locale }),
}));
vi.mock('@/app-shell/navigate', () => ({ hardReplace: vi.fn(), isLeaving: () => false }));
vi.setConfig({ testTimeout: 30_000 });

const G = '22222222-2222-4222-8222-222222222222';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const card = (n: number, lemma: string, meaning: string): Card => ({
  item_id: uuid(n), sense_id: uuid(100 + n), level: 1, due_date: '2026-10-20', priority: false, section: 'due',
  content: {
    sense_id: uuid(100 + n), scope: 'catalog', lemma, pos: 'verb', level: 'B1', context_label: null,
    meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: null,
    examples: [], form_of: null, sentences: [],
  },
});
const reviewRoutes: Record<string, Route> = {
  [`GET /v1/groups/${G}`]: () => Response.json({ id: G, name: 'Công nghệ', version: 1, item_count: 2, removable_items: 0, created_at: '', updated_at: '' }),
  [`GET /v1/groups/${G}/queue?mode=due`]: () => Response.json({ cards: [card(1, 'deploy', 'triển khai'), card(2, 'cache', 'bộ nhớ đệm')] }),
  'GET /v1/words/deploy': () => Response.json({ lemma: 'deploy', inflections: [], sections: [] }),
  'GET /v1/words/cache': () => Response.json({ lemma: 'cache', inflections: [], sections: [] }),
  'POST /v1/reviews': () => Response.json({ item_id: uuid(1), level: 2, due_date: '2026-10-23', priority: false }),
};

const SESSION = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const meaningItem = {
  round: 1, position: 4, prompt_style: 'sentence', hint_level: 0, state: 'unanswered', tries: 0, reportable: true, private_word: false, ai: true,
  item_id: 'it-m', type: 'meaning_in_sentence', hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'meaning_in_sentence', sentence: 'The team deployed the update to all servers.', highlight: 'deployed', meaning_language: 'vi',
    options: ['triển khai (phần mềm)', 'giao hàng', 'bảo vệ', 'trì hoãn'] },
};
const practiceRoutes: Record<string, Route> = {
  'GET /v1/practice/sessions/current': () => Response.json({
    session: { id: SESSION, source: 'all', group_id: null, group_filter: null, sort: 'least_practiced', types: ['meaning_in_sentence'],
      prompt_style: 'mixed', target_count: 10, status: 'active', round: 1, asked: 4, words: 10, ai_planned: 10, cloze_source: 'ai' },
    item: meaningItem, preparing: false,
  }),
  'GET /v1/groups': () => Response.json({ items: [] }),
  [`POST /v1/practice/sessions/${SESSION}/prepare`]: () => Response.json({ prepared: 0, already_ready: 0 }),
  'POST /v1/practice/items/it-m/answer': () => Response.json({
    result: 'correct', skipped: false, tries: 1, hint_level: 0,
    correct: { lemma: 'deploy', text: 'deploy', choice_index: 0, is_true: null },
    meaning: 'triển khai (phần mềm)', definition_en: null, show_known: false, highlight_needs_review: false,
    translation: 'Nhóm đã triển khai bản cập nhật lên mọi máy chủ.',
  }),
};

beforeEach(() => {
  params.current = new URLSearchParams();
});

describe('SessionIntl: session copy in English for every locale (QM9-9)', () => {
  it('a Vietnamese route: Học chrome is English and plural-correct, the meaning and group name stay Vietnamese, home is /vi/app', async () => {
    params.current = new URLSearchParams({ group: G });
    renderApp(<FocusLayout><ReviewSession /></FocusLayout>, { locale: 'vi', routes: reviewRoutes });

    await screen.findByRole('group', { name: 'Card 1 of 2' });
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Flip card/ })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '2 cards left' })).toBeInTheDocument();
    expect(screen.getByText('Click the card or press Space to flip')).toBeInTheDocument();
    expect(screen.getByText('Công nghệ')).toBeInTheDocument();

    await userEvent.keyboard(' ');
    expect(await screen.findByText('triển khai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Still learning/ })).toBeInTheDocument();
    await userEvent.keyboard('2');
    await screen.findByRole('group', { name: 'Card 2 of 2' });
    expect(screen.getByRole('progressbar', { name: '1 card left' })).toBeInTheDocument();

    await userEvent.keyboard(' ');
    await userEvent.keyboard('2');
    expect(await screen.findByRole('heading', { name: '2 cards done.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Back to home/ })).toHaveAttribute('href', '/vi/app');
  });

  it('the AI translation block follows the route: shown at /vi, absent at /en, with English chrome in both', async () => {
    renderApp(<FocusLayout><PracticeSession /></FocusLayout>, { locale: 'vi', routes: practiceRoutes });
    await screen.findByText('deployed', { selector: 'strong' });
    expect(screen.getByText('AI sentence')).toBeInTheDocument();
    await userEvent.keyboard('1');
    const block = (await screen.findByText('Nhóm đã triển khai bản cập nhật lên mọi máy chủ.')).closest('div')!;
    expect(within(block).getByText('AI translation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Next/ })).toBeInTheDocument();
  });

  it('an English route has no translation block', async () => {
    renderApp(<FocusLayout><PracticeSession /></FocusLayout>, { locale: 'en', routes: practiceRoutes });
    await screen.findByText('deployed', { selector: 'strong' });
    expect(screen.getByText('AI sentence')).toBeInTheDocument();
    await userEvent.keyboard('1');
    await screen.findByText('Right');
    expect(screen.queryByText('Nhóm đã triển khai bản cập nhật lên mọi máy chủ.')).toBeNull();
    expect(screen.queryByText('AI translation')).toBeNull();
  });
});
