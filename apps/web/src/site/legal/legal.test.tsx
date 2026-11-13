// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactElement } from 'react';
import vi_ from '../../../messages/vi.json';
import { LegalDraft } from './LegalDraft';
import { LegalLayout } from './LegalLayout';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: ComponentProps<'a'>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

/** The legal pages read `Legal` on the server; here the intl provider stands in for it. */
const renderVi = (ui: ReactElement) =>
  render(
    <NextIntlClientProvider locale="vi" messages={{ Legal: vi_.Legal }} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
  );

const PRIVACY = [
  '## 1. Về chính sách này',
  '',
  'Chính sách này áp dụng cho website wordmet.com.',
  '',
  '**Dữ liệu học tập:**',
  '',
  '- một',
  '- **hai**',
  '',
  '### Chi tiết',
  '',
  'Khi tạo tài khoản, bạn đồng ý với [Điều khoản sử dụng](/vi/terms). Hỏi qua support@wordmet.com.',
  '',
  '## 2. Quyền của bạn',
  '',
  '| Bên | Để làm gì |',
  '|---|---|',
  '| Google | Đăng nhập |',
].join('\n');

const drawPrivacy = (extra: Partial<ComponentProps<typeof LegalLayout>> = {}) =>
  renderVi(
    <LegalLayout
      kind="privacy"
      title="Chính sách bảo mật"
      lead={vi_.Legal.privacyLead}
      version="3"
      effectiveDate="2026-11-20"
      markdown={PRIVACY}
      {...extra}
    />,
  );

describe('LegalLayout (M8.7, Figma 14:172 / 17:260)', () => {
  it('has one h1, the version and date line (QM8-4) and the lead', () => {
    drawPrivacy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Chính sách bảo mật' })).toBeInTheDocument();
    expect(screen.getByText('Phiên bản 3 · Có hiệu lực từ 20/11/2026')).toBeInTheDocument();
    expect(screen.getByText('Dữ liệu Wordmet thu thập, dùng vào việc gì, chia sẻ với ai, và quyền của bạn với dữ liệu của mình.')).toBeInTheDocument();
  });

  it('without an effective date the line names the version only', () => {
    drawPrivacy({ effectiveDate: null });
    expect(screen.getByText('Phiên bản 3')).toBeInTheDocument();
    expect(screen.queryByText(/Có hiệu lực/)).toBeNull();
  });

  it('Điều khoản adds "Áp dụng cho wordmet.com" to the line', () => {
    renderVi(<LegalLayout kind="terms" title="Điều khoản sử dụng" lead={vi_.Legal.termsLead} version="3" effectiveDate="2026-11-20" markdown="## 1. Phạm vi áp dụng" />);
    expect(screen.getByText(/^Phiên bản 3 · Có hiệu lực từ 20\/11\/2026/)).toHaveTextContent('Phiên bản 3 · Có hiệu lực từ 20/11/2026 · Áp dụng cho wordmet.com');
  });

  it('the Mục lục navigation lists the ## sections only, as plain links to their ids', () => {
    drawPrivacy();
    const links = within(screen.getByRole('navigation', { name: 'Mục lục' })).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['1. Về chính sách này', '2. Quyền của bạn']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#1-ve-chinh-sach-nay', '#2-quyen-cua-ban']);
    expect(screen.getByRole('heading', { level: 2, name: '1. Về chính sách này' })).toHaveAttribute('id', '1-ve-chinh-sach-nay');
    expect(screen.getByRole('heading', { level: 3, name: 'Chi tiết' })).toHaveAttribute('id', 'chi-tiet');
    expect(screen.getByRole('heading', { level: 2, name: '2. Quyền của bạn' })).toHaveAttribute('id', '2-quyen-cua-ban');
  });

  it('the phone pill opens the list and a link click closes it (aria-expanded)', () => {
    drawPrivacy();
    const pill = screen.getByRole('button', { name: 'Xem mục lục' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(pill.getAttribute('aria-controls') ?? '')).toBe(
      within(screen.getByRole('navigation', { name: 'Mục lục' })).getByRole('list'),
    );
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Mục lục' })).getByRole('link', { name: '2. Quyền của bạn' }));
    expect(pill).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders the Markdown: lists, bold, tables, links, and bare emails as mailto links', () => {
    drawPrivacy();
    const article = within(screen.getByRole('article'));
    expect(article.getAllByRole('listitem')).toHaveLength(2);
    expect(article.getByText('hai').tagName).toBe('STRONG');
    expect(article.getByRole('cell', { name: 'Google' })).toBeInTheDocument();
    expect(article.getByRole('link', { name: 'Điều khoản sử dụng' })).toHaveAttribute('href', '/vi/terms');
    expect(article.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
  });

  it('a # heading in the text does not become a second h1', () => {
    drawPrivacy({ markdown: '# Chính sách bảo mật\n\n## 1. Về chính sách này\n\ntext' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('never renders raw HTML, scripts or a javascript: link; an outside link opens a new tab safely', () => {
    const { container } = drawPrivacy({
      markdown: 'ok <script>window.hacked = 1</script> <img src=x onerror="window.hacked=1">\n\n[bad](javascript:alert(1)) [good](https://example.com)',
    });
    expect(container.querySelector('script, img')).toBeNull();
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
    const good = screen.getByRole('link', { name: 'good' });
    expect(good).toHaveAttribute('target', '_blank');
    expect(good).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('the privacy callout asks about data and links the support address', () => {
    drawPrivacy();
    const callout = within(screen.getByRole('region', { name: 'Còn câu hỏi về dữ liệu của bạn?' }));
    expect(callout.getByText('Gửi từ chính email của tài khoản. Phản hồi trong 02 ngày làm việc.')).toBeInTheDocument();
    expect(callout.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
  });

  it('the terms callout is about payments and says "nội dung chuyển khoản" like the app (R175)', () => {
    renderVi(<LegalLayout kind="terms" title="Điều khoản sử dụng" lead={vi_.Legal.termsLead} version="3" effectiveDate={null} markdown="text" />);
    const callout = within(screen.getByRole('region', { name: 'Có vấn đề với thanh toán?' }));
    expect(callout.getByText('Gửi email tài khoản, nội dung chuyển khoản (bắt đầu bằng WM) và ảnh biên nhận.')).toBeInTheDocument();
    expect(callout.getByRole('link', { name: 'support@wordmet.com' })).toHaveAttribute('href', 'mailto:support@wordmet.com');
  });

  it('a text without ## sections has no Mục lục', () => {
    drawPrivacy({ markdown: 'Chỉ có một đoạn.' });
    expect(screen.queryByRole('navigation', { name: 'Mục lục' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Xem mục lục' })).toBeNull();
  });
});

describe('LegalDraft (nothing published)', () => {
  it('shows the title, the lead, the draft notice and the contact address, and no version line', () => {
    renderVi(<LegalDraft title="Chính sách bảo mật" lead={vi_.Legal.privacyLead} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Chính sách bảo mật' })).toBeInTheDocument();
    expect(screen.getByText(vi_.Legal.draftNotice)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contact@wordmet.com' })).toHaveAttribute('href', 'mailto:contact@wordmet.com');
    expect(screen.queryByText(/Phiên bản/)).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});
