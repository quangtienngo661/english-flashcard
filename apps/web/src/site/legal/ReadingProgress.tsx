'use client';

import { useEffect, useRef } from 'react';
import { PROGRESS_GLOW } from './styles';

/**
 * "Thanh tiến độ đọc" (`14:183` / `17:267`): 3 px under the header and sticky with it; the accent fill grows with how far the article
 * has been scrolled (0 when its top reaches the top of the screen, 1 when its end reaches the bottom). Only `scale` changes, at most once per
 * frame. Decorative: screen readers skip it. Without JS it stays an empty track.
 */
export function ReadingProgress({ target }: { target: string }) {
  const fill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const article = document.getElementById(target);
    const bar = fill.current;
    if (!article || !bar) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const rect = article.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel <= 0 ? (rect.top <= 0 ? 1 : 0) : Math.min(1, Math.max(0, -rect.top / travel));
      // Tailwind 4's scale-x-0 sets the `scale` property, so the inline value replaces it there.
      bar.style.scale = `${progress} 1`;
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [target]);

  return (
    <div aria-hidden className="sticky top-15 z-30 h-0.75 bg-wm-line md:top-17">
      <div ref={fill} className={`h-full origin-left scale-x-0 bg-wm-accent ${PROGRESS_GLOW}`} />
    </div>
  );
}
