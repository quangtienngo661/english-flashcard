// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';
import { AppBackground } from './AppBackground';
import { Kbd } from './Kbd';
import { Tag } from './Tag';
import { TextButton } from './TextButton';

// Like next/link, the mock handles the click itself (client navigation): the browser's own navigation is prevented.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  ),
}));

describe('ui actions and surfaces', () => {
  it('Button is a button named by its text and calls onPress', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress}>Lưu thay đổi</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('a pending Button does not call onPress', () => {
    const onPress = vi.fn();
    render(<Button onPress={onPress} isPending>Lưu thay đổi</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('a disabled Button is disabled', () => {
    render(<Button isDisabled>Lưu thay đổi</Button>);
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled();
  });

  it('ButtonLink is a link with its href', () => {
    render(<ButtonLink href="/vi/app/plans">Xem gói</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Xem gói' })).toHaveAttribute('href', '/vi/app/plans');
  });

  it('a ButtonLink without reload navigates on the client (next/link handles the click)', () => {
    render(<ButtonLink href="/vi/app/plans">Xem gói</ButtonLink>);
    expect(fireEvent.click(screen.getByRole('link', { name: 'Xem gói' }))).toBe(false);
  });

  it('ButtonLink reload is a plain anchor: exact href, the same look, and the click is left to the browser (full page load)', () => {
    render(
      <>
        <ButtonLink href="/vi/app/register" reload variant="secondary">Đăng ký</ButtonLink>
        <ButtonLink href="/vi/app/login" variant="secondary">Đăng nhập</ButtonLink>
      </>,
    );
    const link = screen.getByRole('link', { name: 'Đăng ký' });
    expect(link.getAttribute('href')).toBe('/vi/app/register');
    expect(link.className).toBe(screen.getByRole('link', { name: 'Đăng nhập' }).className);
    // fireEvent returns false when a handler called preventDefault.
    expect(fireEvent.click(link)).toBe(true);
  });

  it('TextButton is a button', () => {
    const onPress = vi.fn();
    render(<TextButton tone="delete" onPress={onPress}>Xóa từ</TextButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Xóa từ' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('Kbd and Tag render their text', () => {
    render(<p><Kbd>N</Kbd> <Tag tone="accent">noun · A2</Tag></p>);
    expect(screen.getByText('N').tagName).toBe('KBD');
    expect(screen.getByText('noun · A2')).toBeInTheDocument();
  });

  it('AppBackground is hidden from the accessibility tree', () => {
    const { container } = render(<AppBackground />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('AppBackground draws the mesh background', () => {
    const { container } = render(<AppBackground />);
    expect(container.firstChild).toHaveClass('app-mesh');
  });
});
