// Email colours. Values are copied from packages/design-tokens/web.css (light) and web-dark.css (dark); colors.spec.ts compares each one
// with the CSS so an email never drifts from the app. Design docs/superpowers/specs/2026-11-14-email-giao-dien-design.md §2.1.
export type EmailColor = 'bg' | 'surface' | 'ink' | 'muted' | 'line' | 'accent' | 'accentSoft' | 'onAccent' | 'mark' | 'markInk';
/** The chip ("Chuỗi N ngày") keeps its light colours in dark mode. */
export type DarkEmailColor = Exclude<EmailColor, 'mark' | 'markInk'>;

export const EMAIL_COLORS: { light: Record<EmailColor, string>; dark: Record<DarkEmailColor, string> } = {
  light: {
    bg: '#f6f7fa', surface: '#ffffff', ink: '#1b2444', muted: '#525a78', line: '#e1e5ee',
    accent: '#1e3a8a', accentSoft: '#e7ecf8', onAccent: '#ffffff', mark: '#ffd84a', markInk: '#1b2444',
  },
  dark: {
    bg: '#0f1220', surface: '#171b2a', ink: '#eceef5', muted: '#a6adc4', line: '#2a3044',
    accent: '#8da2ff', accentSoft: '#2c334f', onAccent: '#0f1220',
  },
};
