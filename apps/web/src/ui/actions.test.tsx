// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';
import { DotGridBackground } from './DotGridBackground';
import { Kbd } from './Kbd';
import { Tag } from './Tag';
import { TextButton } from './TextButton';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
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

  it('DotGridBackground is hidden from the accessibility tree', () => {
    const { container } = render(<DotGridBackground />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('DotGridBackground draws the mesh background, not the dot grid', () => {
    const { container } = render(<DotGridBackground />);
    expect(container.firstChild).toHaveClass('app-mesh');
    expect(container.firstChild).not.toHaveClass('dot-grid');
  });
});
