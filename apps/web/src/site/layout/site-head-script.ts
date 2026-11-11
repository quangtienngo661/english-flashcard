// Relative import: next.config.ts reads this file, and its loader knows no `@/` alias.
import { THEME_SCRIPT } from '../../app-shell/theme/theme-script';

/**
 * The inline script of the public pages' layout: the theme script of the app (no flash of the wrong theme), then the `js` class on
 * <html> that the site motion CSS needs before it hides anything (M8.6). The learner app keeps THEME_SCRIPT alone, so `/app` is unchanged.
 * SITE_HEAD_SCRIPT_HASH is its CSP hash (site-head-script.test.ts recomputes it; next.config.ts lists it for the public policy).
 */
export const SITE_HEAD_SCRIPT = `${THEME_SCRIPT}document.documentElement.classList.add('js');`;

export const SITE_HEAD_SCRIPT_HASH = "'sha256-Tx7XxLQb7nEWZ8wReWEYmzIu0AMYH37XUL7MIfQOigw='";
