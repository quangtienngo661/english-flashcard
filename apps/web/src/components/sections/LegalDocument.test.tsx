// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalDocument } from './LegalDocument';

const TITLE = 'Chính sách bảo mật';
const draw = (source: string, extra: Partial<Parameters<typeof LegalDocument>[0]> = {}) =>
  render(<LegalDocument title={TITLE} source={source} effective={null} contentsLabel="Mục lục" {...extra} />);

describe('LegalDocument (Markdown of a published legal text)', () => {
  it('renders headings, lists, bold text and tables', () => {
    draw('# Chính sách bảo mật\n\n## 1. Dữ liệu\n\n- một\n- **hai**\n\n| Bên | Để làm gì |\n|---|---|\n| Google | Đăng nhập |');
    expect(screen.getByRole('heading', { level: 1, name: TITLE })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '1. Dữ liệu' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(within(screen.getByRole('table')).getByRole('cell', { name: 'Google' })).toBeInTheDocument();
  });

  it('adds the page title as the h1 when the text has no # heading, and does not double it when it has one', () => {
    draw('## Chỉ có mục');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(TITLE);
  });

  it('does not double the h1 when the text brings its own', () => {
    draw('# Tiêu đề của bản đăng\n\ntext');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tiêu đề của bản đăng');
  });

  it('never renders raw HTML, scripts or a javascript: link', () => {
    const { container } = draw('ok <script>window.hacked = 1</script> <img src=x onerror="window.hacked=1">\n\n[bad](javascript:alert(1)) [good](https://wordmet.com) [mail](mailto:a@b.co)');
    expect(container.querySelector('script, img')).toBeNull();
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
    expect(screen.queryByRole('link', { name: 'bad' })).toBeNull();
    expect(screen.getByRole('link', { name: 'good' })).toHaveAttribute('href', 'https://wordmet.com');
    expect(screen.getByRole('link', { name: 'mail' })).toHaveAttribute('href', 'mailto:a@b.co');
  });

  it('opens an outside link safely', () => {
    draw('[x](https://example.com)');
    const link = screen.getByRole('link', { name: 'x' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows the effective line when there is one', () => {
    draw('# T', { effective: 'Có hiệu lực từ 10/11/2026' });
    expect(screen.getByText('Có hiệu lực từ 10/11/2026')).toBeInTheDocument();
  });
});

describe('LegalDocument contents (jump to a section instead of scrolling)', () => {
  const SOURCE = '# Chính sách\n\n**Mục lục**\n1. Dữ liệu\n2. Quyền của bạn\n\n## 1. Dữ liệu\n\n### Chi tiết\n\ntext\n\n## 2. Quyền của bạn\n\ntext';

  it('gives every section heading an id', () => {
    draw(SOURCE);
    expect(screen.getByRole('heading', { level: 2, name: '1. Dữ liệu' })).toHaveAttribute('id', '1-du-lieu');
    expect(screen.getByRole('heading', { level: 3, name: 'Chi tiết' })).toHaveAttribute('id', 'chi-tiet');
    expect(screen.getByRole('heading', { level: 2, name: '2. Quyền của bạn' })).toHaveAttribute('id', '2-quyen-cua-ban');
  });

  it('lists the ## sections, and only those, in a navigation that links to them', () => {
    draw(SOURCE);
    const nav = screen.getByRole('navigation', { name: 'Mục lục' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['1. Dữ liệu', '2. Quyền của bạn']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['#1-du-lieu', '#2-quyen-cua-ban']);
  });

  it('has no navigation when the text has no ## section', () => {
    draw('# Chỉ có tiêu đề\n\ntext');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('makes the hand-written Mục lục list in the text clickable', () => {
    draw(SOURCE);
    const text = within(screen.getByRole('article'));
    expect(text.getByRole('link', { name: 'Dữ liệu' })).toHaveAttribute('href', '#1-du-lieu');
    expect(text.getByRole('link', { name: 'Quyền của bạn' })).toHaveAttribute('href', '#2-quyen-cua-ban');
  });

  it('does not open a #link in a new tab', () => {
    draw(SOURCE);
    const link = within(screen.getByRole('article')).getByRole('link', { name: 'Dữ liệu' });
    expect(link).not.toHaveAttribute('target');
  });
});
