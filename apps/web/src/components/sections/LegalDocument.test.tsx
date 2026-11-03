// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalDocument } from './LegalDocument';

const TITLE = 'Chính sách bảo mật';
const draw = (source: string, extra: Partial<Parameters<typeof LegalDocument>[0]> = {}) =>
  render(<LegalDocument title={TITLE} source={source} effective={null} {...extra} />);

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
