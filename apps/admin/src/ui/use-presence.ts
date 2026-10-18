import { useEffect, useRef, useState, type RefObject } from 'react';

type PresenceState = 'entering' | 'open' | 'exiting' | 'closed';

/**
 * Keeps an element mounted while its enter/exit animation runs, like React Aria does for overlays, for an element that is
 * not a React Aria overlay (the side panel). The caller sets `data-entering` / `data-exiting` from `state` and declares
 * the animation on those attributes (UBE22). Unlike React Aria, a cancelled animation still counts as done, so the
 * element can never stay stuck on screen. No animation (reduced motion, jsdom) means done at once.
 */
export function usePresence(isOpen: boolean, ref: RefObject<HTMLElement | null>, onExited?: () => void) {
  const [state, setState] = useState<PresenceState>(isOpen ? 'entering' : 'closed');
  // Follow `isOpen` during render: reopening while exiting goes straight back to open (UBE23).
  if (isOpen && state === 'closed') setState('entering');
  else if (isOpen && state === 'exiting') setState('open');
  else if (!isOpen && (state === 'entering' || state === 'open')) setState('exiting');

  const exited = useRef(onExited);
  useEffect(() => {
    exited.current = onExited;
  });

  useEffect(() => {
    if (state !== 'entering' && state !== 'exiting') return;
    let stale = false;
    const animations = ref.current?.getAnimations?.() ?? [];
    void Promise.allSettled(animations.map((a) => a.finished)).then(() => {
      if (stale) return;
      if (state === 'entering') {
        setState('open');
      } else {
        setState('closed');
        exited.current?.();
      }
    });
    return () => {
      stale = true;
    };
  }, [state, ref]);

  return { isMounted: state !== 'closed', state };
}
