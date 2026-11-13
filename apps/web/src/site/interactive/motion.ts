import { useSyncExternalStore } from 'react';
import { MOTION_STORAGE_KEY } from '../layout/site-head-script';

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

/** Fired on window when the footer's motion switch changes (T10, QA7), so loops stop or start again. */
export const MOTION_EVENT = 'wm-motion';

/** The reader's choice on this page: `off` when the head script or the switch marked <html> `data-wm-motion="off"`. */
export function motionChoice(): 'on' | 'off' {
  return document.documentElement.getAttribute('data-wm-motion') === 'off' ? 'off' : 'on';
}

/**
 * The footer switch: remembers the choice (MOTION_STORAGE_KEY), then turns the site motion off by taking `js` off <html> (every rule of
 * the site motion CSS sits under `html.js`, so hidden blocks show and the CSS loops stop) or on by putting it back, and tells the loops.
 */
export function setMotionChoice(on: boolean) {
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice holds for this page only.
  }
  const html = document.documentElement;
  html.classList.toggle('js', on);
  if (on) html.removeAttribute('data-wm-motion');
  else html.setAttribute('data-wm-motion', 'off');
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** Calls `change` after each switch of the footer's motion switch. Returns the cleanup. */
export function onMotionChange(change: () => void): () => void {
  window.addEventListener(MOTION_EVENT, change);
  return () => window.removeEventListener(MOTION_EVENT, change);
}

/** `motionAllowed()` as React state: false on the server, then follows the footer switch. */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(onMotionChange, motionAllowed, () => false);
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
