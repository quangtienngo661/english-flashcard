// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { richBreaks } from '@/lib/rich-breaks';
import { Button } from './Button';
import { Section } from './Section';
import { SectionHeading } from './SectionHeading';

describe('ui primitives', () => {
  it('richBreaks renders brMd as a br hidden below md and brSm as a br hidden from md', () => {
    const { container } = render(
      <p>
        a{richBreaks.br()}b{richBreaks.brMd()}c{richBreaks.brSm()}d
      </p>,
    );
    const [always, md, sm] = Array.from(container.querySelectorAll('br'));
    expect(always.className).toBe('');
    expect(md).toHaveClass('hidden', 'md:inline');
    expect(sm).toHaveClass('md:hidden');
  });

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

  it('Section maps each tone to its background', () => {
    const tones = { surface: 'bg-surface', tint: 'bg-primary-soft', primary: 'bg-primary', accent: 'bg-accent' } as const;
    for (const [tone, bg] of Object.entries(tones)) {
      const { container, unmount } = render(
        <Section labelledBy={`${tone}-title`} tone={tone as keyof typeof tones}>
          <h2 id={`${tone}-title`}>{tone}</h2>
        </Section>,
      );
      expect(container.querySelector('section')).toHaveClass(bg);
      unmount();
    }
  });

  it('SectionHeading renders an h2 with the given id', () => {
    render(<SectionHeading id="faq-title" eyebrow="FAQ" title="Questions" align="center" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Questions' })).toHaveAttribute('id', 'faq-title');
  });
});
