import type { SkeletonShape } from '@/ui/Skeleton';

// Pages with no app chrome (design giao diện mới §5.4–§5.5): sessions, onboarding and the sign-in pages.
const BARE = /^\/(vi|en)\/app\/(practice\/session|review|recall|complete-profile|welcome|login|register|verify-email|forgot-password|reset-password|google\/complete|account-deleted)(\/|$)/;
// Pages drawn with PageColumns: two columns from 1280 px.
const COLUMNS = /^\/(vi|en)\/app(\/practice)?\/?$/;
const CAROUSEL = /^\/(vi|en)\/app\/groups\/?$/;

/** The shape of the hard-load skeleton for the page being opened: its columns or carousel, the generic blocks, or no bars. */
export function chromeShape(pathname: string): SkeletonShape {
  if (BARE.test(pathname)) return 'bare';
  if (COLUMNS.test(pathname)) return 'columns';
  if (CAROUSEL.test(pathname)) return 'carousel';
  return 'chrome';
}
