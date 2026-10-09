import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type SectionHeadingProps = {
  id?: string;
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align: 'center' | 'start';
  className?: string;
};

const alignment = {
  center: 'items-center text-center',
  start: 'items-start text-left',
} satisfies Record<SectionHeadingProps['align'], string>;

export function SectionHeading({ id, eyebrow, title, description, align, className }: SectionHeadingProps) {
  return (
    <div className={cn('flex flex-col gap-3.5', alignment[align], className)}>
      <p className="text-caption font-bold tracking-widest text-primary">{eyebrow}</p>
      <h2 id={id} className="max-w-heading text-h2 font-extrabold text-ink">
        {title}
      </h2>
      {description ? <p className="max-w-prose text-body text-muted md:text-subtitle">{description}</p> : null}
    </div>
  );
}
