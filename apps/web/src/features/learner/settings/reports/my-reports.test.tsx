// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/app-ui/test-utils';
import { MyReportsPage } from './MyReportsPage';

vi.mock('next/navigation', () => ({
  usePathname: () => '/vi/app/settings/reports',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const report = (over: Record<string, unknown>) => ({
  id: 'r', item_id: 'i', sense_id: 's', reason_label: 'Đáp án sai', status: 'open', refunded: null, created_at: '2026-11-08T03:00:00Z',
  resolved_at: null, lemma: 'deteriorate', question_type: 'cloze', ai: true, ...over,
});
// M6 Figma B §1.6 with the M6.1 fields.
const REPORTS = {
  items: [
    report({ id: 'r1' }),
    report({ id: 'r2', lemma: 'allocate', reason_label: 'Câu khó hiểu', question_type: 'meaning_in_sentence', status: 'confirmed', refunded: true,
      created_at: '2026-11-05T03:00:00Z', resolved_at: '2026-11-06T03:00:00Z' }),
    report({ id: 'r3', lemma: 'viable', reason_label: 'Nghĩa không đúng', question_type: 'mcq_definition', ai: false, status: 'no_error',
      created_at: '2026-10-28T03:00:00Z' }),
    report({ id: 'r4', lemma: 'mitigate', question_type: 'type_word', ai: false, status: 'fixed', created_at: '2026-10-20T03:00:00Z' }),
    report({ id: 'r5', lemma: null, question_type: 'cloze', status: 'confirmed', refunded: null, created_at: '2026-10-12T03:00:00Z' }),
    report({ id: 'r6', lemma: 'deploy', question_type: 'cloze', status: 'confirmed', refunded: false, created_at: '2026-10-11T03:00:00Z' }),
  ],
  next_page_token: null,
};
const routes = (over = {}) => ({ 'GET /v1/practice/reports?page_size=20': () => Response.json(REPORTS), ...over });
const row = (name: RegExp) => screen.getAllByRole('listitem').find((li) => name.test(li.textContent ?? ''))!;

describe('MyReportsPage (Figma 211:5827 / 211:6061)', () => {
  it('back to Cài đặt, the title, months newest first in the learner zone, and the footnote', async () => {
    renderApp(<MyReportsPage />, { routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'Báo lỗi của tôi' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/vi/app/settings');
    const months = await screen.findAllByRole('heading', { level: 2 });
    expect(months.map((h) => h.textContent)).toEqual(['tháng 11, 2026', 'tháng 10, 2026']);
    expect(screen.getByText('ngày theo múi giờ của bạn · câu do AI viết mà đúng là lỗi thì được trả lại 1 lượt câu AI')).toBeInTheDocument();
  });

  it('rows: word · reason, the question type and AI, the status, the date', async () => {
    renderApp(<MyReportsPage />, { routes: routes() });
    await screen.findByText('deteriorate · Đáp án sai');
    expect(row(/deteriorate/)).toHaveTextContent('điền từ vào câu · câu AI');
    expect(row(/deteriorate/)).toHaveTextContent('Đang xem');
    expect(row(/deteriorate/)).toHaveTextContent('08/11/2026');
    expect(row(/allocate/)).toHaveTextContent('chọn nghĩa trong câu · Đã trả lại 1 lượt câu AI');
    expect(row(/allocate/)).toHaveTextContent('Đã xác nhận lỗi');
    expect(row(/viable/)).toHaveTextContent('trắc nghiệm');
    expect(row(/viable/)).not.toHaveTextContent('câu AI');
    expect(row(/viable/)).toHaveTextContent('Không có lỗi');
    expect(row(/mitigate/)).toHaveTextContent('gõ từ');
    expect(row(/mitigate/)).toHaveTextContent('Đã sửa');
    expect(screen.getByText('— · Đáp án sai')).toBeInTheDocument();
    expect(row(/— · /)).toHaveTextContent('Đang trả lại 1 lượt câu AI');
    expect(row(/deploy/)).toHaveTextContent('Lượt câu AI này không trả lại được');
    expect(screen.queryByRole('button', { name: /deteriorate/ })).toBeNull();
  });

  it('Xem thêm asks for the next page', async () => {
    const view = renderApp(<MyReportsPage />, { routes: routes({
      'GET /v1/practice/reports?page_size=20': () => Response.json({ items: [report({ id: 'p1' })], next_page_token: 'tok' }),
      'GET /v1/practice/reports?page_size=20&page_token=tok': () => Response.json({ items: [report({ id: 'p2', lemma: 'second' })], next_page_token: null }),
    }) });
    await userEvent.click(await screen.findByRole('button', { name: 'Xem thêm' }));
    expect(await screen.findByText('second · Đáp án sai')).toBeInTheDocument();
    expect(view.count('GET', '/v1/practice/reports?page_size=20&page_token=tok')).toBe(1);
    expect(screen.queryByRole('button', { name: 'Xem thêm' })).toBeNull();
  });

  it('no report yet: the empty state with the way to Luyện tập', async () => {
    renderApp(<MyReportsPage />, { routes: routes({ 'GET /v1/practice/reports?page_size=20': () => Response.json({ items: [], next_page_token: null }) }) });
    expect(await screen.findByText('Bạn chưa báo lỗi câu nào.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Về Luyện tập' })).toHaveAttribute('href', '/vi/app/practice');
  });

  it('an error: Thử lại asks again', async () => {
    let calls = 0;
    renderApp(<MyReportsPage />, { routes: routes({
      'GET /v1/practice/reports?page_size=20': () => {
        calls += 1;
        return calls === 1 ? Response.json({ type: 'about:blank', title: 'x', status: 500 }, { status: 500 }) : Response.json(REPORTS);
      },
    }) });
    const alert = await screen.findByRole('alert');
    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('deteriorate · Đáp án sai')).toBeInTheDocument();
  });

  it('English', async () => {
    renderApp(<MyReportsPage />, { locale: 'en', routes: routes() });
    expect(await screen.findByRole('heading', { level: 1, name: 'My reports' })).toBeInTheDocument();
    expect((await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent)).toEqual(['November 2026', 'October 2026']);
    expect(row(/deteriorate/)).toHaveTextContent('fill in the blank · AI question');
  });
});
