export type FlyOptions = { durationMs: number; easing: string; onLand: () => void };

/**
 * Flies a decorative copy of `source` onto the centre of `target` (Web Animations API, no library).
 * The copy lands once, at the earliest of: the animation finishing, `durationMs + 80`, or the tab becoming
 * visible again — a background tab can stall both the animation and the timer, and a stuck sticker must
 * vanish as soon as the person returns (design UB14, UBE5–UBE7). App state never waits on this.
 * Returns `cancel`, which removes the copy without calling `onLand`.
 */
export function flyInto(source: HTMLElement, target: HTMLElement, { durationMs, easing, onLand }: FlyOptions): () => void {
  if (typeof source.animate !== 'function') {
    onLand();
    return () => {};
  }

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.setAttribute('data-flyer', '');
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '50',
  });
  // appendChild, not append: the Workers types merge an HTMLRewriter `Element.append` that shadows the DOM one.
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = clone.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${dx}px, ${dy}px)` }], {
    duration: durationMs,
    easing,
  });

  let settled = false;
  const onVisibility = () => {
    if (document.visibilityState === 'visible') land();
  };
  const timer = setTimeout(() => land(), durationMs + 80);
  const cleanup = () => {
    settled = true;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    clone.remove();
  };
  function land() {
    if (settled) return;
    cleanup();
    onLand();
  }

  document.addEventListener('visibilitychange', onVisibility);
  // A cancelled animation rejects `finished`; cancel() has already cleaned up, so the rejection is ignored.
  animation.finished.then(land, () => {});

  return () => {
    if (settled) return;
    cleanup();
    animation.cancel();
  };
}
