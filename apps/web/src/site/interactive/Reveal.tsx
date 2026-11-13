'use client';

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { motionAllowed, onceInView, whileInView } from './motion';

type Props = {
  as?: 'div' | 'p' | 'article' | 'h1' | 'h2';
  /** `block` fades, rises and sharpens as one; `words` does it per `[data-wm-word]` inside (SplitWords). */
  kind?: 'block' | 'words';
  /** `load`: marked in by the server, so the CSS plays it from the first paint (the hero). `view`: once it scrolls in. */
  trigger?: 'load' | 'view';
  /** ms before it starts. */
  delay?: number;
  /** Start blur in px (default 16 for a block, 12 per word; capped at 12 on a phone by the CSS). */
  blur?: number;
  /** Also marks `data-wm-on` while on screen, so the CSS loops inside (the Pro card, the closing card) run only then. */
  loop?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
} & { [data: `data-${string}`]: string | undefined };

/**
 * An element that comes in once (M8.6 "Reveal", "Words"). It renders no start state of its own: the CSS block `site motion` hides it only
 * under `html.js` with motion allowed, until this code sets `data-wm-in` (IntersectionObserver .22, −8 %, once). Reduced motion, or a page
 * without the `js` class, gets `data-wm-in` at once.
 */
export function Reveal({ as = 'div', kind = 'block', trigger = 'view', delay, blur, loop, className, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const allowed = motionAllowed();
    const stops: Array<() => void> = [];
    if (!el.hasAttribute('data-wm-in')) {
      const show = () => el.setAttribute('data-wm-in', '');
      if (allowed) stops.push(onceInView(el, show));
      else show();
    }
    if (loop && allowed) stops.push(whileInView(el, (on) => el.toggleAttribute('data-wm-on', on)));
    return () => stops.forEach((stop) => stop());
  }, [loop]);

  const vars = {
    ...(delay ? { '--wm-delay': `${delay}ms` } : {}),
    ...(blur !== undefined ? { '--wm-blur': `${blur}px` } : {}),
  } as CSSProperties;
  return (
    <Tag
      ref={ref}
      data-wm-reveal={kind}
      data-wm-in={trigger === 'load' ? '' : undefined}
      className={className}
      // raw-ok: the delay and start blur of this one element, read by the site motion CSS
      style={vars}
      {...rest}
    >
      {children}
    </Tag>
  );
}
