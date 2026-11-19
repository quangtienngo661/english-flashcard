// @vitest-environment jsdom
import { getDefaultNormalizer, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import en_ from '../../../messages/en.json';
import vi_ from '../../../messages/vi.json';
import { createFormat } from '@/app-shell/format';
import { formatVnd } from './copy';
import { HomePage } from './HomePage';
import type { LandingData } from './landing-data';
import { FALLBACK_LANDING_DATA } from './landing-data.fallback';
import { LANDING_FAQ_EN } from './landing-faq.en';

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

const pricing = () => within(screen.getByRole('region', { name: 'Học miễn phí, bứt phá cùng Pro' }));
/** The row of one period of the Pro card. */
const period = (label: string) => within(pricing().getByText(label, { exact: true }).closest('li') as HTMLElement);

describe('home page (M8.5, Figma 5:13 / 9:108)', () => {
  it('has the hero h1 and the section headings in Figma order', () => {
    renderHome();
    // Accessible names, not textContent: M8.6 splits each title into aria-hidden words beside one sr-only copy.
    const headings = screen.getAllByRole('heading').filter((h) => h.tagName === 'H1' || h.tagName === 'H2');
    const expected = [
      'H1 Nhớ từ lâu bền, tự tin dùng trong câu',
      'H2 Tạo nhóm từ cho mỗi bài đọc',
      'H2 Từ lúc gặp đến lúc dùng được',
      'H2 Học miễn phí, bứt phá cùng Pro',
      'H2 Câu hỏi thường gặp',
      'H2 Biến bài đọc thành tiếng Anh trôi chảy',
    ];
    expect(headings.map((h) => h.tagName)).toEqual(expected.map((e) => e.slice(0, 2)));
    headings.forEach((h, i) => expect(h).toHaveAccessibleName(expected[i].slice(3)));
  });

  it('the sections carry the anchors of the header and the hero (nhom-tu, cach-hoc, gia, hoi-dap)', () => {
    const { container } = renderHome();
    const ids = [...container.querySelectorAll('section[id]')].map((s) => s.id);
    expect(ids).toEqual(['nhom-tu', 'cach-hoc', 'gia', 'hoi-dap']);
    expect(screen.getByRole('region', { name: 'Tạo nhóm từ cho mỗi bài đọc' }).id).toBe('nhom-tu');
    expect(screen.getByRole('region', { name: 'Từ lúc gặp đến lúc dùng được' }).id).toBe('cach-hoc');
    expect(screen.getByRole('region', { name: 'Học miễn phí, bứt phá cùng Pro' }).id).toBe('gia');
    expect(screen.getByRole('region', { name: 'Câu hỏi thường gặp' }).id).toBe('hoi-dap');
  });

  it('has no sliding word strip: its words are gone from the page', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    for (const word of ['feasible', 'alleviate', 'detrimental', 'incentive']) expect(screen.queryAllByText(word)).toHaveLength(0);
  });

  it('QM8-6 shows the drafted wording instead of "ngăn" and Figma\'s refund note', () => {
    renderHome();
    expect(screen.getByText('Mỗi từ có lịch ôn riêng, đến hạn là Wordmet nhắc.')).toBeInTheDocument();
    expect(screen.getByText('Thẻ · ôn lại sau 3 ngày')).toBeInTheDocument();
    expect(screen.getByText('ôn lại sau')).toBeInTheDocument();
    expect(pricing().queryByText('Không hoàn tiền sau khi đã thanh toán.')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ngăn|Không hoàn tiền tự động/);
  });

  it('the practice demo has one tally line like the app, with no right or wrong words on the rows', () => {
    renderHome();
    const learn = within(screen.getByRole('region', { name: 'Từ lúc gặp đến lúc dùng được' }));
    expect(learn.getByText('7/20')).toBeInTheDocument();
    expect(learn.getByRole('img', { name: '5 câu đúng' })).toBeInTheDocument();
    expect(learn.getByRole('img', { name: '1 câu sai' })).toBeInTheDocument();
    expect(learn.queryByText(/câu còn lại|từ ôn lại sau 7 ngày/)).toBeNull();
    expect(learn.queryByText('Đúng', { exact: true })).toBeNull();
    expect(learn.queryByText('Sai', { exact: true })).toBeNull();
  });

  it('F.22 reads as general English, not IELTS-only: no caption pill under the groups, no exam wording', () => {
    renderHome();
    expect(screen.queryByText(/12 từ · ôn lần đầu ngày mai/)).toBeNull();
    expect(screen.getByText('Bài báo sáng nay')).toBeInTheDocument();
    expect(screen.getByText('Sau khi đọc một bài')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/IELTS|Writing|Đề 12|Sau khi làm đề|mỗi đề|đề bạn vừa làm/);
  });

  it('LearnSection lists its four steps in learning order, the listen step on every width', () => {
    renderHome();
    const learn = within(screen.getByRole('region', { name: 'Từ lúc gặp đến lúc dùng được' }));
    const steps = learn.queryAllByRole('listitem').filter((li) => li.parentElement?.tagName === 'OL' && within(li).queryByRole('heading', { level: 3 }));
    expect(steps.map((li) => within(li).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Lưu từ trong vài giây',
      'Nghe giọng Anh-Anh, Anh-Mỹ và đọc phiên âm',
      'Luyện từ trong câu thật',
      'Ôn đúng lúc sắp quên',
    ]);
  });
});

describe('PricingSection (QM8-2: three prices, the saving, no struck price, no selection)', () => {
  it('owner 19/11/2026: the sessions per day come from the data, not fixed text (3 and 30 from the fallback, 5 and 1.200 from the API)', () => {
    const { unmount } = renderHome();
    expect(pricing().getByText('3 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(pricing().getByText('30 phiên luyện mỗi ngày')).toBeInTheDocument();
    unmount();
    renderHome({ ...FALLBACK_LANDING_DATA, sessions: { free: 5, pro: 1200 }, source: 'api' });
    expect(pricing().getByText('5 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(pricing().getByText('1.200 phiên luyện mỗi ngày')).toBeInTheDocument();
    expect(pricing().queryByText(/^(3|30) phiên/)).toBeNull();
  });

  it('Free costs 0 ₫ and asks for no card; Pro has the "Có AI" chip', () => {
    renderHome();
    expect(pricing().getByText(`0${NBSP}₫`, keepSpaces)).toBeInTheDocument();
    expect(pricing().getByText('không giới hạn thời gian')).toBeInTheDocument();
    // Ads are off at launch: no card mentions them (owner 13/11/2026).
    expect(pricing().queryByText(/quảng cáo/i)).not.toBeInTheDocument();
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

  it('formats money in English exactly as the app does for /en (createFormat("en", ...).money)', () => {
    const app = createFormat('en', 'UTC');
    for (const amount of [0, 79000, 199000, 599000, 66300, 1250000]) {
      expect(formatVnd(amount, 'en')).toBe(app.money(amount, 'VND'));
    }
    expect(formatVnd(66300, 'en')).toBe('₫66,300');
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
      ['Tạo tài khoản miễn phí', '/vi/app/register'],
      ['Tạo tài khoản miễn phí', '/vi/app/register'],
      ['Tạo tài khoản', '/vi/app/register'],
      ['Tạo tài khoản miễn phí', '/vi/app/register'],
    ]);
    expect(appLinks.filter((a) => a.hasAttribute('data-client-link'))).toEqual([]);
    expect(screen.getByRole('link', { name: 'Xem cách học' })).toHaveAttribute('href', '#cach-hoc');
  });
});

describe('the English landing (/en, 14/11/2026)', () => {
  function renderEnglish(data: LandingData = FALLBACK_LANDING_DATA) {
    return render(<HomePage copy={en_.Landing} data={data} locale="en" />);
  }

  it('shows the English heading, the English FAQ (not the Vietnamese one) and links into /en/app', () => {
    renderEnglish();
    expect(screen.getByRole('heading', { level: 1, name: 'Remember words forever, use them in a sentence' })).toBeInTheDocument();
    const faq = within(screen.getByRole('region', { name: 'Frequently asked questions' }));
    expect(faq.getAllByRole('group').map((d) => d.querySelector('summary')?.textContent)).toEqual(LANDING_FAQ_EN.map((f) => f.question));
    expect(faq.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
    const appLinks = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/en/app/'));
    expect(appLinks.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Create a free account', '/en/app/register'],
      ['Create a free account', '/en/app/register'],
      ['Create an account', '/en/app/register'],
      ['Create a free account', '/en/app/register'],
    ]);
  });

  it('the sessions per day follow the data in English too', () => {
    renderEnglish({ ...FALLBACK_LANDING_DATA, sessions: { free: 5, pro: 1200 }, source: 'api' });
    const pro = within(screen.getByRole('region', { name: 'Start free, accelerate with Pro' }));
    expect(pro.getByText('5 practice sessions a day')).toBeInTheDocument();
    expect(pro.getByText('1,200 practice sessions a day')).toBeInTheDocument();
  });

  it('prices follow the build data in English money: free, three Pro periods, the saving and the monthly figure', () => {
    renderEnglish({ ...FALLBACK_LANDING_DATA, prices: { '1': 79000, '3': 240000, '12': 599000 }, source: 'api' });
    const pro = within(screen.getByRole('region', { name: 'Start free, accelerate with Pro' }));
    expect(pro.getByText('₫0')).toBeInTheDocument();
    expect(pro.getByText('₫240,000')).toBeInTheDocument();
    expect(pro.getByText('≈ ₫80,000 per month')).toBeInTheDocument();
    expect(pro.getByText('3 months', { exact: true })).toBeInTheDocument();
    expect(pro.queryByText(/ngày|tháng|₫\s?\d+\.\d/)).toBeNull();
  });

  it('keeps no Vietnamese sentence on the page except the demo word glosses', () => {
    const { container } = renderEnglish();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/Bắt đầu|Câu hỏi|Miễn phí|Tạo tài khoản|Xem cách học|ngày/);
  });
});
