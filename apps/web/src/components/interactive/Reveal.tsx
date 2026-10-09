'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/use-reduced-motion';

type RevealProps = { children: ReactNode; step?: 0 | 1 | 2; as?: 'div' | 'li'; className?: string };

const delays = { 0: 'delay-0', 1: 'delay-80', 2: 'delay-160' } as const;

// SSR renders content visible; after hydration, content still below the fold fades in once (spec §5).
export function Reveal({ children, step = 0, as: Tag = 'div', className }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'static' | 'hidden' | 'shown'>('static');

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase((p) => (p === 'hidden' ? 'shown' : p));
          observer.disconnect();
        } else {
          setPhase((p) => (p === 'static' ? 'hidden' : p));
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  const hidden = phase === 'hidden' && !reduced;
  return (
    <Tag
      ref={ref as never}
      className={cn(
        phase !== 'static' && !reduced && cn('transition duration-reveal ease-out', delays[step]),
        hidden ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
