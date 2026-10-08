import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

type SectionProps = {
  id?: string;
  labelledBy: string;
  tone: 'bg' | 'surface' | 'primary';
  children: ReactNode;
  className?: string;
};

const tones = { bg: 'bg-bg', surface: 'bg-surface', primary: 'bg-primary' } satisfies Record<SectionProps['tone'], string>;

// Figma section rhythm: 56px top/bottom on mobile, 96px from md.
export function Section({ id, labelledBy, tone, children, className }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('scroll-mt-4 py-14 md:py-24', tones[tone])}>
      <Container className={cn('flex flex-col gap-8 md:gap-12', className)}>{children}</Container>
    </section>
  );
}
