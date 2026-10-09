// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { richBreaks } from '@/lib/rich-breaks';
import { Button } from './Button';
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

  it('Button exposes variant styles and has min height 44 (min-h-11)', () => {
    render(
      <>
        <Button variant="primary">Go</Button>
        <Button variant="secondary">Back</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Go' })).toHaveClass('bg-primary', 'text-on-primary', 'min-h-11');
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('bg-surface', 'text-ink', 'min-h-11');
  });

  it('SectionHeading renders an h2 with the given id', () => {
    render(<SectionHeading id="faq-title" eyebrow="FAQ" title="Questions" align="center" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Questions' })).toHaveAttribute('id', 'faq-title');
  });
});
