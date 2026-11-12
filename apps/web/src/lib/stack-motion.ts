/**
 * Motion of the Học card stack (motion doc §2, prototype chong-the-mo.html), run with the Web Animations API: the global reduced-motion
 * rule forces CSS durations to 0.01 ms, while motion doc §8 keeps short opacity fades (M5 code R surprise 9). With reduced motion every
 * helper animates opacity only, for 200 ms or less; nothing moves, scales, turns or blurs.
 */

/** The main curve (`--ease-wm-out-strong`). */
export const STACK_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 18 px from 768 px, 12 px on phones (design §8.1: blur capped on small screens). */
function bigBlur(): number {
  try {
    return window.matchMedia('(min-width: 48rem)').matches ? 18 : 12;
  } catch {
    return 18;
  }
}

function run(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Promise<void> {
  if (typeof (el as HTMLElement).animate !== 'function') return Promise.resolve();
  const animation = (el as HTMLElement).animate(keyframes, options);
  return animation.finished.then(() => undefined, () => undefined);
}

/**
 * A rated card leaves: it grows, blurs and fades towards its pile. From a drag it keeps going from where the hand left it (70 px,
 * 3°, faster with a faster flick); from a key or button it starts at rest (40 px, 5°, 240 ms).
 */
export function dissolve(el: HTMLElement, direction: 1 | -1, how: 'drag' | 'key', speed = 0): Promise<void> {
  if (prefersReducedMotion()) return run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'linear', fill: 'forwards' });
  const shift = how === 'drag' ? 70 : 40;
  const turn = how === 'drag' ? 3 : 5;
  const from = el.style.transform || 'none';
  return run(
    el,
    [
      { transform: from, filter: 'blur(0px)', opacity: 1 },
      { transform: `${from === 'none' ? '' : `${from} `}translateX(${direction * shift}px) rotate(${direction * turn}deg) scale(1.22)`, filter: `blur(${bigBlur()}px)`, opacity: 0 },
    ],
    { duration: how === 'drag' ? Math.round(300 - Math.min(1, speed) * 80) : 240, easing: STACK_EASE, fill: 'forwards' },
  );
}

/** The new top card comes from behind: from blur and small to sharp and at rest (300 ms). */
export function arrive(el: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) return run(el, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 140, easing: 'linear' });
  return run(
    el,
    [
      { transform: 'translateY(16px) scale(0.92)', filter: 'blur(10px)', opacity: 0.55 },
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    ],
    { duration: 300, easing: STACK_EASE },
  );
}

/** A rating pressed before the card is turned over: a short shake (300 ms); nothing with reduced motion. */
export function shake(el: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  return run(
    el,
    [
      { transform: 'none' },
      { transform: 'translateX(-9px) rotate(-1.2deg)', offset: 0.3 },
      { transform: 'translateX(8px) rotate(1deg)', offset: 0.65 },
      { transform: 'none' },
    ],
    { duration: 300, easing: 'ease-out' },
  );
}

/** A drag let go short of the threshold: back to rest (380 ms); the inline transform is cleared by the caller. */
export function settle(el: HTMLElement, from: string): Promise<void> {
  if (prefersReducedMotion() || !from) return Promise.resolve();
  return run(el, [{ transform: from }, { transform: 'none' }], { duration: 380, easing: STACK_EASE });
}

/** A word lands in its pile (300 ms). */
export function chipIn(el: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) return run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'linear' });
  return run(
    el,
    [
      { transform: 'translateY(-6px) scale(0.96)', filter: 'blur(6px)', opacity: 0 },
      { transform: 'none', filter: 'blur(0px)', opacity: 1 },
    ],
    { duration: 300, easing: STACK_EASE },
  );
}

/** A pile counter bumps when it grows (220 ms); nothing with reduced motion. */
export function bump(el: HTMLElement): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();
  return run(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 220, easing: STACK_EASE });
}
