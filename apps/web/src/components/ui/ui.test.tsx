// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Button } from './Button';
import { ButtonLink } from './ButtonLink';

describe('ui primitives', () => {
  it('Button exposes the four B variants with min height 44', () => {
    render(
      <>
        <Button variant="primary">Go</Button>
        <Button variant="secondary">Back</Button>
        <Button variant="accent">Join</Button>
        <Button variant="ink">Next</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('bg-primary', 'text-on-primary', 'shadow-ledge', 'min-h-11');
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('bg-surface', 'text-ink', 'ring-border-strong', 'min-h-11');
    expect(screen.getByRole('button', { name: 'Join' })).toHaveClass('bg-accent', 'text-ink', 'shadow-ledge', 'min-h-11');
    expect(screen.getByRole('button', { name: 'Next' })).toHaveClass('bg-ink', 'text-on-primary', 'min-h-11');
  });

  it('L3 ButtonLink carries the app variants: sticker is yellow on its ledge, quiet is outlined, navy sits on the top bar', () => {
    render(
      <>
        <ButtonLink variant="sticker" href="/vi/app/register">Đăng ký</ButtonLink>
        <ButtonLink variant="quiet" href="/vi/app/login">Luyện lại</ButtonLink>
        <ButtonLink variant="navy" href="/vi/app/login">Đăng nhập</ButtonLink>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Đăng ký' })).toHaveClass('bg-accent', 'text-on-accent', 'shadow-ledge-accent');
    expect(screen.getByRole('link', { name: 'Luyện lại' })).toHaveClass('bg-surface', 'ring-border-strong', 'shadow-button-secondary');
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveClass('bg-navy-raised', 'text-on-navy');
  });
});
