// Relative import: next.config.ts reads this file, and its loader knows no `@/` alias.
import { THEME_SCRIPT } from '../../app-shell/theme/theme-script';

/** The class SiteLive puts on <html> once React runs on a public page. */
export const LIVE_CLASS = 'wm-live';

/** The footer's motion switch (T10, QA7): `off` keeps the site motion off on every public page; anything else is `on`. */
export const MOTION_STORAGE_KEY = 'wordmet-web.motion';

/** How long the hidden start state may wait for React before the head script takes `js` back (R249). */
export const LIVE_WAIT_MS = 3000;

/**
 * The inline script of the public pages' layout: the theme script of the app (no flash of the wrong theme), then the `js` class on
 * <html> that the site motion CSS needs before it hides anything (M8.6). If React has not marked the page `wm-live` (SiteLive) within
 * LIVE_WAIT_MS (slow network, a chunk refused by SRI), it removes `js` again, so the blocks below the hero show without motion (R249).
 * When the reader chose "Chuyển động: Tắt" (MOTION_STORAGE_KEY is `off`) it adds no `js` and marks <html> `data-wm-motion="off"` instead.
 * The learner app keeps THEME_SCRIPT alone, so `/app` is unchanged.
 * SITE_HEAD_SCRIPT_HASH is its CSP hash (site-head-script.test.ts recomputes it; next.config.ts lists it for the public policy).
 */
export const SITE_HEAD_SCRIPT = `${THEME_SCRIPT}(function(){var h=document.documentElement,m;try{m=localStorage.getItem('${MOTION_STORAGE_KEY}')}catch(e){}if(m==='off'){h.setAttribute('data-wm-motion','off');return}h.classList.add('js');setTimeout(function(){if(!h.classList.contains('${LIVE_CLASS}'))h.classList.remove('js')},${LIVE_WAIT_MS})})();`;

export const SITE_HEAD_SCRIPT_HASH = "'sha256-C0TDliMhcDOe0H/iiu39po9woTBunXEYnhWTLeDDbDo='";
