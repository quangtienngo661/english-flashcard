'use client';

import { useEffect, useRef } from 'react';
import { motionAllowed, whileInView } from './motion';

/** Figma scene 6 (`48:423`): one lap of the card in 6000 ms at a constant speed, clockwise from the top-left corner. */
const LAP_MS = 6000;
/** Each corner turns the light by 90° in 200 ms, ease-in-out, as it gets there. */
const TURN_MS = 200;

/**
 * The light that runs around the Pro card's border (M8.6). A blurred ellipse (Figma 200 × 64) behind the card, moved along its parent's
 * edges with the `translate` and `rotate` properties, so nothing is laid out again. It is drawn only while it runs (`data-wm-on`): the
 * static frame and reduced motion have no light. The lap is measured again when the card changes size, and pauses off screen.
 */
export function Sweep() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const light = ref.current;
    const card = light?.parentElement;
    if (!light || !card || !motionAllowed() || typeof light.animate !== 'function') return;
    let animations: Animation[] = [];
    let visible = false;

    const start = () => {
      const time = animations[0]?.currentTime ?? 0;
      animations.forEach((a) => a.cancel());
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const lap = 2 * (w + h);
      if (lap === 0) return;
      const corners = [w / lap, (w + h) / lap, (2 * w + h) / lap];
      const turn = TURN_MS / LAP_MS;
      const options: KeyframeAnimationOptions = { duration: LAP_MS, iterations: Infinity };
      const along = light.animate(
        [
          { translate: '0px 0px', offset: 0 },
          { translate: `${w}px 0px`, offset: corners[0] },
          { translate: `${w}px ${h}px`, offset: corners[1] },
          { translate: `0px ${h}px`, offset: corners[2] },
          { translate: '0px 0px', offset: 1 },
        ],
        { ...options, easing: 'linear' },
      );
      // −90° (coming up the left edge) turns to 0° at the first corner, and so on; 270° at the end is −90° again, so the loop is seamless.
      const turns: Keyframe[] = [{ rotate: '-90deg', offset: 0, easing: 'ease-in-out' }, { rotate: '0deg', offset: turn }];
      corners.forEach((at, i) => {
        turns.push({ rotate: `${i * 90}deg`, offset: at, easing: 'ease-in-out' }, { rotate: `${(i + 1) * 90}deg`, offset: at + turn });
      });
      turns.push({ rotate: '270deg', offset: 1 });
      const spin = light.animate(turns, options);
      animations = [along, spin];
      animations.forEach((a) => {
        a.currentTime = time;
        if (!visible) a.pause();
      });
    };

    start();
    const stopView = whileInView(card, (on) => {
      visible = on;
      light.toggleAttribute('data-wm-on', on);
      animations.forEach((a) => (on ? a.play() : a.pause()));
    });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(start);
    resize?.observe(card);
    return () => {
      stopView();
      resize?.disconnect();
      animations.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-wm-sweep=""
      className="pointer-events-none absolute top-0 left-0 -z-10 -mt-8 -ml-25 hidden h-16 w-50 rounded-full bg-radial from-wm-accent via-wm-mark/70 to-transparent to-70%"
    />
  );
}
