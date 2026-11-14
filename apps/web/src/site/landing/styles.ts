// Class strings the home page sections share. Figma (M8 Figma A §2, §4) uses a few one-off sizes no `wm-` text token has; they are
// written here once, each with its reason (R203), instead of new tokens in @wordmet/design-tokens.

/** Section titles, Display/Section (52) and its mobile style (30). */
export const SECTION_TITLE = 'font-wm-display text-wm-site-section-mobile text-wm-ink md:text-wm-site-section';

// raw-ok: Figma subtitles, the hero lead on a phone, the definition and the typed word are Noto 17 / 1.6, between Body/Base and Body/Lead
export const TEXT_17 = 'font-wm-sans text-[1.0625rem]/[1.6]';

// raw-ok: Figma FAQ questions are Noto SemiBold 17 / 1.6
export const FAQ_QUESTION = 'font-wm-sans text-[1.0625rem]/[1.6] font-semibold';

// raw-ok: the practice demo's sentence is Noto 22 (`7:67`)
export const SENTENCE_22 = 'font-wm-sans text-[1.375rem]/[1.5]';

// raw-ok: period prices are Bricolage Bold 26 (`33:351`…`33:367`)
export const PERIOD_PRICE = 'font-wm-display text-[1.625rem]/[1.2] font-bold tracking-[-0.01em]';

// raw-ok: the Free price "0 ₫" is Bricolage Bold 48, −1 % (`33:313`)
export const FREE_PRICE = 'font-wm-display text-[3rem]/[1.1] font-bold tracking-[-0.01em]';

// raw-ok: the FAQ title is Bricolage Bold 40 / 1.24, −2 % from lg (`28:360`); phones use Display/Section mobile
export const FAQ_TITLE = 'font-wm-display text-wm-site-section-mobile text-wm-ink lg:text-[2.5rem]/[1.24] lg:tracking-[-0.02em]';

// raw-ok: the closing title is Bricolage Bold 32 / 1.28, −1.5 % on a phone (`9:353`) and 60 / 1.24, −2 % from md (`7:202`)
export const FINAL_TITLE = 'font-wm-display text-[2rem]/[1.28] font-bold tracking-[-0.015em] text-wm-ink md:text-[3.75rem]/[1.24] md:tracking-[-0.02em]';

// raw-ok: the review boxes' values are Bricolage Bold 15 / 1.4 in the phone's pills (`9:291`, read from the frame) and 22 / 1.3 from md (`7:180`)
export const BIN_VALUE = 'font-wm-display text-[0.9375rem]/[1.4] font-bold whitespace-nowrap md:text-[1.375rem]/[1.3]';

// raw-ok: "7 ngày" on the floating card is Bricolage Bold 20 (`5:150`)
export const FLOAT_VALUE = 'font-wm-display text-[1.25rem]/[1.3] font-bold';

// raw-ok: "viable" in the listen card is Bricolage Bold 28 (`7:161`)
export const LISTEN_WORD = 'font-wm-display text-[1.75rem]/[1.2] font-bold';

// raw-ok: the lit boxes of the floating card glow 0 0 12 accent 34 % (`5:150`), a shadow no token has
export const BIN_GLOW = 'shadow-[0_0_12px_rgb(30_58_138/0.34)]';

// raw-ok: Figma "Lựa chọn" (3:51) and the typed-word box draw a 1.5 px border, between the 1 and 2 px utilities
export const BORDER_15 = 'border-[1.5px]';

/** A plain card of the page: surface, 1 px line, Shadow/Soft. */
export const CARD = 'border border-wm-line bg-wm-surface shadow-wm-soft';

/** Focus ring of the page's own links and summaries (the same as the header's). */
export const FOCUS = 'outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-wm-accent';
