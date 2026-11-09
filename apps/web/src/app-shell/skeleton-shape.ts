// Pages with no app chrome (design giao diện mới §5.4–§5.5): sessions, onboarding and the sign-in pages.
const BARE = /^\/(vi|en)\/app\/(practice\/session|review|recall|complete-profile|welcome|login|register|verify-email|forgot-password|reset-password|google\/complete|account-deleted)(\/|$)/;

/** The shape of the hard-load skeleton for the page being opened: the top and tab bars, or only the content. */
export function chromeShape(pathname: string): 'chrome' | 'bare' {
  return BARE.test(pathname) ? 'bare' : 'chrome';
}
