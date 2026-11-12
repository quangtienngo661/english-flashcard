// Class strings of the legal pages (M8 Figma B §2.1–§3). Figma's one-off sizes are written here once with their node (as R203 does for
// the home page), not as new tokens in @wordmet/design-tokens. None of these go through `cn`: tailwind-merge does not know the `wm-`
// sizes and would drop one of two `text-wm-*` classes.

/** The page title, Display/Page title (64) and its mobile style (38). */
export const PAGE_TITLE = 'font-wm-display text-wm-site-page-mobile text-wm-ink md:text-wm-site-page';

// raw-ok: the article's paragraphs are Noto 16 / 1.7 on a phone and Body/Article 17 / 1.7 from md (`14:299`, `17:335`)
export const ARTICLE_TEXT = 'font-wm-sans text-[1rem]/[1.7] text-wm-ink md:text-[1.0625rem]/[1.7]';

// raw-ok: ## is Display/Doc heading 28 from md and Bricolage Bold 24 / 1.3, −1 % on a phone; 32 px above (24 on a phone) except the first
export const DOC_H2 = 'font-wm-display text-[1.5rem]/[1.3] font-bold tracking-[-0.01em] text-wm-ink md:text-wm-site-doc-heading pt-6 first:pt-0 md:pt-8';

// raw-ok: ### is not drawn (R224): Bricolage Bold 20 / 1.3 (18 on a phone), 8 px more above than a paragraph
export const DOC_H3 = 'font-wm-display text-[1.125rem]/[1.3] font-bold text-wm-ink md:text-[1.25rem]/[1.3] pt-2';

// raw-ok: list markers sit 1.5 em in (24 px on a phone, 25.5 px from md, as drawn)
export const DOC_LIST = 'flex flex-col gap-1.5 pl-[1.5em]';

/** Body links: SemiBold accent, underlined (design §3.3: a link in a sentence is underlined). */
export const DOC_LINK = 'rounded-wm-key font-semibold text-wm-accent underline underline-offset-4 outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent';

// raw-ok: the callout title is Bricolage Bold 22 / 1.3, −1 % (`14:350`), a size no token has
export const CALLOUT_TITLE = 'font-wm-display text-[1.375rem]/[1.3] font-bold tracking-[-0.01em] text-wm-ink';

// raw-ok: the reading bar glows 0 0 8 accent 50 % on desktop (`14:183`), not on a phone (`17:267`)
export const PROGRESS_GLOW = 'md:shadow-[0_0_8px_rgb(30_58_138/0.5)]';

// raw-ok: the desktop contents card scrolls on its own when it is taller than the screen under the header (Điều khoản: 19 items, 790 px)
export const TOC_MAX_HEIGHT = 'lg:max-h-[calc(100svh-8rem)]';

// raw-ok: the open phone list scrolls inside the sticky pill instead of covering the whole screen
export const TOC_PHONE_LIST_HEIGHT = 'max-lg:max-h-[50svh]';

/** The phone pill's current section: Noto SemiBold 16 / 1.6 accent (`17:328`). */
export const TOC_PHONE_CURRENT = 'font-wm-sans text-wm-base-strong text-wm-accent';

/** Focus ring of the page's own links and buttons (the same as the header's). */
export const FOCUS = 'outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent';
