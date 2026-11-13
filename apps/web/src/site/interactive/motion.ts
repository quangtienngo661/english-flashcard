// Shared pieces of the home page motion (M8.6, landing bản 3 mapped onto Figma; numbers in the plan's M8.6 Interfaces). The CSS lives in
// globals.css, block `/* site motion */`: it hides an element only under `html.js` (set by the site's inline head script) and only when
// motion is allowed, so the server HTML is the end state and reduced motion sees it from the first paint.

/** What the CSS keeps hidden until this file's code marks it: a block or title before `data-wm-in`, the groups before `data-wm-done`. */
export const HIDDEN_START = '[data-wm-reveal]:not([data-wm-in]), [data-wm-fly]:not([data-wm-done])';

/** `E` of the plan, the same curve as `--ease-wm-out`. */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

/** Blocks and titles start when 22 % is in view, 8 % above the bottom edge (bản 3). */
export const REVEAL_VIEW: IntersectionObserverInit = { threshold: 0.22, rootMargin: '0px 0px -8% 0px' };
/** The groups fly in and the demo loops run at 30 % in view (bản 3). */
export const LOOP_VIEW: IntersectionObserverInit = { threshold: 0.3 };

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Motion runs only when the head script set `js` (so the CSS start state applies) and the reader has not asked for less motion. */
export function motionAllowed(): boolean {
  return document.documentElement.classList.contains('js') && !prefersReducedMotion();
}

/** Pointer parallax is for a mouse or trackpad only (bản 3). */
export function finePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** The blur cap of the page in px: 12 on a phone (`--wm-blur-cap`, design §8.1), no cap above. */
export function blurCap(): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--wm-blur-cap'));
  return Number.isFinite(value) ? value : Infinity;
}

type Watch = (visible: boolean) => void;
const observers = new Map<string, { io: IntersectionObserver; watches: Map<Element, Set<Watch>> }>();

/**
 * One IntersectionObserver per option set for the whole page; each element registers callbacks on it. One element can have several (the
 * Pro card: its Reveal loop and its badges), so it is unobserved only when its last callback is cleaned up.
 */
function observe(el: Element, init: IntersectionObserverInit, watch: Watch): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    watch(true);
    return () => {};
  }
  const key = `${init.threshold}|${init.rootMargin ?? ''}`;
  let entry = observers.get(key);
  if (!entry) {
    const watches = new Map<Element, Set<Watch>>();
    const io = new IntersectionObserver(
      (records) => records.forEach((r) => watches.get(r.target)?.forEach((w) => w(r.isIntersecting))),
      init,
    );
    entry = { io, watches };
    observers.set(key, entry);
  }
  const { io, watches } = entry;
  let set = watches.get(el);
  if (!set) {
    set = new Set();
    watches.set(el, set);
  }
  set.add(watch);
  io.observe(el);
  return () => {
    const current = watches.get(el);
    if (!current?.delete(watch) || current.size > 0) return;
    watches.delete(el);
    io.unobserve(el);
  };
}

/** Calls `enter` the first time `el` comes into view, then stops watching it. Returns the cleanup. */
export function onceInView(el: Element, enter: () => void, init: IntersectionObserverInit = REVEAL_VIEW): () => void {
  let stop = () => {};
  let done = false;
  stop = observe(el, init, (visible) => {
    if (!visible || done) return;
    done = true;
    stop();
    enter();
  });
  if (done) stop();
  return () => stop();
}

/** Calls `change` each time `el` enters or leaves the view (the loops run only while on screen). Returns the cleanup. */
export function whileInView(el: Element, change: (visible: boolean) => void, init: IntersectionObserverInit = LOOP_VIEW): () => void {
  return observe(el, init, change);
}
