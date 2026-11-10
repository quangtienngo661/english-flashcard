// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import { renderApp } from '@/app-ui/test-utils';
import { StageBar } from '@/ui/StageBar';
import { DeckButtons } from './DeckButtons';
import { GroupStack } from './GroupStack';
import type { GroupSummary } from './groups-api';

const deck = (today: GroupSummary['today'], levels: number[] = [5, 3, 8, 12, 7, 5], over: Partial<GroupSummary> = {}): GroupSummary => ({
  id: 'g1', name: 'Đề 12 · Writing', version: 1, total: levels.reduce((a, b) => a + b, 0), today,
  cells: levels.map((total, level) => ({ level, total, due: 0 })), backlog: 0, available: { due: today.due, new: today.new },
  ...over,
});

const behind = (el: HTMLElement) => el.querySelectorAll('[data-behind]').length;

describe('GroupStack (M3 Figma A §2.3, §4)', () => {
  it('normal face: words, name, waiting count and the next card', () => {
    const g = deck({ priority: 4, due: 14, new: 6 }, [6, 9, 10, 11, 8, 4], { next_lemma: 'mitigate' });
    const { container } = renderApp(<GroupStack group={g} size="carousel" />);
    expect(screen.getByText('48 từ · 12 đã thuộc')).toBeInTheDocument();
    expect(screen.getByText('Đề 12 · Writing')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('thẻ chờ')).toBeInTheDocument();
    expect(screen.getByText('tiếp theo').parentElement).toHaveTextContent('tiếp theo mitigate');
    expect(behind(container)).toBe(3);
  });

  it('done face: "✓ Xong hôm nay" and the last reviewed word', () => {
    const g = deck({ priority: 0, due: 0, new: 0 }, [6, 9, 10, 11, 8, 4], { last_reviewed: { lemma: 'take for granted', at: '2026-11-08T08:00:00Z' } });
    const { container } = renderApp(<GroupStack group={g} size="carousel" />);
    expect(screen.getByText('✓ Xong hôm nay')).toBeInTheDocument();
    expect(screen.getByText('ôn gần nhất').parentElement).toHaveTextContent('ôn gần nhất take for granted');
    expect(screen.queryByText('thẻ chờ')).toBeNull();
    expect(behind(container)).toBe(0);
  });

  it('empty face: "nhóm trống", "Chưa có từ", no card behind', () => {
    const g = deck({ priority: 0, due: 0, new: 0 }, [0, 0, 0, 0, 0, 0], { name: 'Du lịch Nhật' });
    const { container } = renderApp(<GroupStack group={g} size="carousel" />);
    expect(screen.getByText('nhóm trống')).toBeInTheDocument();
    expect(screen.getByText('Chưa có từ')).toBeInTheDocument();
    expect(screen.getByText('Thêm từ để bắt đầu')).toBeInTheDocument();
    expect(behind(container)).toBe(0);
  });

  it('leaves the footer out when the API sends no next card', () => {
    renderApp(<GroupStack group={deck({ priority: 0, due: 3, new: 0 })} size="today" />);
    expect(screen.queryByText('tiếp theo')).toBeNull();
  });

  it.each([[1, 1], [6, 1], [7, 2], [16, 2], [17, 3]])('%i waiting → %i cards behind', (due, depth) => {
    const { container } = renderApp(<GroupStack group={deck({ priority: 0, due, new: 0 })} size="carousel" />);
    expect(behind(container)).toBe(depth);
  });

  it('Hôm nay caps the stack at 2 cards behind', () => {
    const { container } = renderApp(<GroupStack group={deck({ priority: 0, due: 30, new: 0 })} size="today" depth={2} />);
    expect(behind(container)).toBe(2);
  });

  it('with an href the group name is the link', () => {
    renderApp(<GroupStack group={deck({ priority: 0, due: 3, new: 0 })} size="today" href="/vi/app/group?id=g1" />);
    expect(screen.getByRole('link', { name: 'Đề 12 · Writing' })).toHaveAttribute('href', '/vi/app/group?id=g1');
  });
});

describe('StageBar', () => {
  it('is a figure with one item per segment', () => {
    renderApp(
      <StageBar
        aria-label="nhịp ôn"
        segments={[
          { size: 6, fill: 6, tone: 'bg-wm-accent', label: 'Mới: 6/6' },
          { size: 9, fill: 3, tone: 'bg-wm-accent', label: '1 ngày: 3/9' },
        ]}
      />,
    );
    const fig = screen.getByRole('figure', { name: 'nhịp ôn' });
    expect(within(fig).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['Mới: 6/6', '1 ngày: 3/9']);
  });
});

const CASES: Array<[string, GroupSummary, Array<[string, string, string]>]> = [
  ['due and new', deck({ priority: 3, due: 5, new: 5 }), [['Học', '/vi/app/review?group=g1&mode=new', 'secondary'], ['Ôn', '/vi/app/recall?group=g1', 'primary']]],
  ['due only', deck({ priority: 0, due: 4, new: 0 }), [['Học', '/vi/app/review?group=g1&mode=all', 'secondary'], ['Ôn', '/vi/app/recall?group=g1', 'primary']]],
  ['new only, nothing learned', deck({ priority: 0, due: 0, new: 12 }, [12, 0, 0, 0, 0, 0]), [['Học', '/vi/app/review?group=g1&mode=new', 'primary']]],
  ['new and learned', deck({ priority: 0, due: 0, new: 5 }), [['Học', '/vi/app/review?group=g1&mode=new', 'primary'], ['Ôn tập', '/vi/app/recall?group=g1', 'secondary']]],
  ['done, learned', deck({ priority: 0, due: 0, new: 0 }), [['Ôn tập', '/vi/app/recall?group=g1', 'secondary']]],
  ['done, cap reached', deck({ priority: 0, due: 0, new: 0 }, [25, 0, 0, 0, 0, 0]), [['Học', '/vi/app/review?group=g1&mode=all', 'secondary']]],
  ['empty', deck({ priority: 0, due: 0, new: 0 }, [0, 0, 0, 0, 0, 0]), []],
];

describe('DeckButtons (deckPlan, design §9 M3: the one with work waiting is navy)', () => {
  it.each(CASES)('%s', (_name, group, expected) => {
    renderApp(<DeckButtons group={group} />);
    const links = screen.queryAllByRole('link');
    expect(links.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('data-variant')])).toEqual(expected);
    expect(links.filter((a) => a.getAttribute('data-variant') === 'primary').length).toBeLessThanOrEqual(1);
    links.forEach((a) => expect(a).toHaveAttribute('data-google-vignette', 'false'));
  });
});
