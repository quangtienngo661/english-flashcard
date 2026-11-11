// @vitest-environment jsdom
import { getDefaultNormalizer, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import vi_ from '../../../messages/vi.json';
import { createFormat } from '@/app-shell/format';
import { formatVnd } from './copy';
import { HomePage } from './HomePage';
import type { LandingData } from './landing-data';
import { FALLBACK_LANDING_DATA } from './landing-data.fallback';

// next/link renders a marked anchor here, so a test can tell client navigation from a plain <a> (LB3E6: links into /app reload).
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={String(href)} data-client-link="" {...rest}>
      {children}
    </a>
  ),
}));

/** Intl writes a no-break space (U+00A0) between the amount and "₫"; the default normalizer would turn it into a space. */
const keepSpaces = { normalizer: getDefaultNormalizer({ collapseWhitespace: false }) };
const NBSP = ' ';

function renderHome(data: LandingData = FALLBACK_LANDING_DATA) {
  return render(<HomePage copy={vi_.Landing} data={data} locale="vi" />);
}

const pricing = () => within(screen.getByRole('region', { name: 'Hai gói, không tự gia hạn.' }));
/** The row of one period of the Pro card. */
const period = (label: string) => within(pricing().getByText(label, { exact: true }).closest('li') as HTMLElement);

describe('home page (M8.5, Figma 5:13 / 9:108)', () => {
  it('has the hero h1 and the section headings in Figma order', () => {
    renderHome();
    const headings = screen
      .getAllByRole('heading')
      .filter((h) => h.tagName === 'H1' || h.tagName === 'H2')
      .map((h) => `${h.tagName} ${h.textContent}`);
    expect(headings).toEqual([
      'H1 Ôn từ đúng lúc, luyện từ trong câu.',
      'H2 Từ của mỗi đề thành một nhóm.',
      'H2 Từ lúc gặp tới lúc dùng được',
      'H2 Hai gói, không tự gia hạn.',
      'H2 Câu hỏi thường gặp',
      'H2 Bắt đầu với đề bạn vừa làm.',
    ]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('Ôn từ đúng lúc, luyện từ trong câu.');
  });

  it('the sections carry the anchors of the header and the hero (nhom-tu, cach-hoc, gia, hoi-dap)', () => {
    const { container } = renderHome();
    const ids = [...container.querySelectorAll('section[id]')].map((s) => s.id);
    expect(ids).toEqual(['nhom-tu', 'cach-hoc', 'gia', 'hoi-dap']);
    expect(screen.getByRole('region', { name: 'Từ của mỗi đề thành một nhóm.' }).id).toBe('nhom-tu');
    expect(screen.getByRole('region', { name: 'Từ lúc gặp tới lúc dùng được' }).id).toBe('cach-hoc');
    expect(screen.getByRole('region', { name: 'Hai gói, không tự gia hạn.' }).id).toBe('gia');
    expect(screen.getByRole('region', { name: 'Câu hỏi thường gặp' }).id).toBe('hoi-dap');
  });

  it('QM8-6 shows the drafted wording instead of "ngăn" and Figma\'s refund note', () => {
    renderHome();
    expect(screen.getByText('Mỗi từ có lịch ôn riêng.')).toBeInTheDocument();
    expect(screen.getByText('Thẻ từ · ôn lại sau 3 ngày')).toBeInTheDocument();
    expect(screen.getByText('ôn lại sau')).toBeInTheDocument();
    expect(screen.getByText('từ ôn lại sau 7 ngày')).toBeInTheDocument();
    expect(pricing().getByText('Không hoàn tiền sau khi đã thanh toán.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ngăn|Không hoàn tiền tự động/);
  });

  it('LearnSection has its four cards, the listen card included (shown from md)', () => {
    renderHome();
    const learn = within(screen.getByRole('region', { name: 'Từ lúc gặp tới lúc dùng được' }));
    expect(learn.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Luyện trong câu',
      'Ghi từ',
      'Nghe và đọc phiên âm',
      'Ôn đúng lúc',
    ]);
  });
});

describe('PricingSection (QM8-2: three prices, the saving, no struck price, no selection)', () => {
  it('Free costs 0 ₫ and asks for no card; Pro has the "Có AI" chip', () => {
    renderHome();
    expect(pricing().getByText(`0${NBSP}₫`, keepSpaces)).toBeInTheDocument();
    expect(pricing().getByText('không cần thẻ thanh toán')).toBeInTheDocument();
    expect(pricing().getByText('Có thể có quảng cáo.')).toBeInTheDocument();
    expect(pricing().getByText('Có AI')).toBeInTheDocument();
  });

  it('the fallback prices give 79.000, 199.000 −16 % ≈ 66.300 a month, 599.000 −37 % ≈ 49.900 a month', () => {
    renderHome();
    const one = period('1 tháng');
    expect(one.getByText(`79.000${NBSP}₫`, keepSpaces)).toBeInTheDocument();
    expect(one.getByText('mỗi tháng', { exact: true })).toBeInTheDocument();
    expect(one.queryByText(/%/)).toBeNull();

    const three = period('3 tháng');
    expect(three.getByText(`199.000${NBSP}₫`, keepSpaces)).toBeInTheDocument();
    expect(three.getByText('−16%')).toBeInTheDocument();
    expect(three.getByText(`≈ 66.300${NBSP}₫ mỗi tháng`, keepSpaces)).toBeInTheDocument();

    const twelve = period('12 tháng');
    expect(twelve.getByText(`599.000${NBSP}₫`, keepSpaces)).toBeInTheDocument();
    expect(twelve.getByText('−37%')).toBeInTheDocument();
    expect(twelve.getByText(`≈ 49.900${NBSP}₫ mỗi tháng`, keepSpaces)).toBeInTheDocument();
    expect(twelve.getByText('Tiết kiệm nhất')).toBeInTheDocument();
    expect(pricing().getAllByText('Tiết kiệm nhất')).toHaveLength(1);

    // No struck price (237.000, 948.000) and nothing to pick: no radio, no button.
    expect(pricing().queryByText(/237\.000|948\.000/)).toBeNull();
    expect(pricing().queryAllByRole('radio')).toEqual([]);
    expect(pricing().queryAllByRole('button')).toEqual([]);
  });

  it('3 months at 240.000 (more than 3 × 79.000) has no saving pill; 12 months keeps −37 %', () => {
    renderHome({ ...FALLBACK_LANDING_DATA, prices: { '1': 79000, '3': 240000, '12': 599000 }, source: 'api' });
    const three = period('3 tháng');
    expect(three.getByText(`240.000${NBSP}₫`, keepSpaces)).toBeInTheDocument();
    expect(three.queryByText(/%/)).toBeNull();
    expect(three.getByText(`≈ 80.000${NBSP}₫ mỗi tháng`, keepSpaces)).toBeInTheDocument();
    expect(period('12 tháng').getByText('−37%')).toBeInTheDocument();
  });

  it('prices no period saves on show no pill and no "Tiết kiệm nhất"', () => {
    renderHome({ ...FALLBACK_LANDING_DATA, prices: { '1': 79000, '3': 237000, '12': 948000 }, source: 'api' });
    expect(pricing().queryByText(/%/)).toBeNull();
    expect(pricing().queryByText('Tiết kiệm nhất')).toBeNull();
  });

  it('formats money exactly as the app does (createFormat(...).money, Gói học)', () => {
    const app = createFormat('vi', 'UTC');
    for (const amount of [0, 79000, 199000, 599000, 66300, 49900, 1250000]) {
      expect(formatVnd(amount)).toBe(app.money(amount, 'VND'));
    }
    expect(formatVnd(66300)).toBe(`66.300${NBSP}₫`);
  });
});

describe('FaqSection', () => {
  it('six items give six native details, in data order, only the first open; the lead mails support', () => {
    renderHome();
    const faq = within(screen.getByRole('region', { name: 'Câu hỏi thường gặp' }));
    const items = faq.getAllByRole('group');
    expect(items).toHaveLength(6);
    expect(items.map((d) => d.tagName)).toEqual(Array(6).fill('DETAILS'));
    expect(items.map((d) => (d as HTMLDetailsElement).open)).toEqual([true, false, false, false, false, false]);
    expect(items.map((d) => d.querySelector('summary')?.textContent)).toEqual(FALLBACK_LANDING_DATA.faq.map((f) => f.question));
    expect(within(items[0]).getByText(FALLBACK_LANDING_DATA.faq[0].answer)).toBeInTheDocument();
    expect(faq.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
  });

  it('an empty FAQ renders no section, no heading and no #hoi-dap', () => {
    const { container } = renderHome({ ...FALLBACK_LANDING_DATA, faq: [], source: 'api' });
    expect(screen.queryByRole('heading', { name: 'Câu hỏi thường gặp' })).toBeNull();
    expect(container.querySelector('#hoi-dap')).toBeNull();
  });
});

describe('links', () => {
  it('every link into /vi/app/ is a plain anchor to register; "Xem cách học" scrolls to #cach-hoc', () => {
    renderHome();
    const appLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/vi/app/'));
    expect(appLinks.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Bắt đầu miễn phí', '/vi/app/register'],
      ['Tạo tài khoản miễn phí', '/vi/app/register'],
      ['Tạo tài khoản', '/vi/app/register'],
      ['Tạo tài khoản miễn phí', '/vi/app/register'],
    ]);
    expect(appLinks.filter((a) => a.hasAttribute('data-client-link'))).toEqual([]);
    expect(screen.getByRole('link', { name: 'Xem cách học' })).toHaveAttribute('href', '#cach-hoc');
  });
});
