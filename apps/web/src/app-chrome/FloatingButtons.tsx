'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useDesktop } from '@/lib/use-desktop';
import { useScrollAway } from '@/lib/use-scroll-away';
import { AddFab } from './AddFab';
import { CalendarButton } from './CalendarButton';

// Where a page's own floating bar sits on phones (M6 Figma A §6): Từ tồn đọng and Chủ đề.
const OWN_BAR = /^\/app\/(group\/backlog|topic)(\/|$)/;
// raw-ok: Figma 95:343 instances sit 14 px above the phone tab bar (62 px + the safe area); 32 px from the corner on desktop
const STACK = 'fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 md:bottom-8 md:right-8';
// raw-ok: phones, while scrolling down (QA4): the stack slides 1 rem past its own height and fades; focus inside keeps it shown
const AWAY = 'transition duration-200 ease-wm-out motion-reduce:transition-none data-[away]:not-focus-within:pointer-events-none data-[away]:not-focus-within:translate-y-[calc(100%+1rem)] data-[away]:not-focus-within:opacity-0';

/**
 * The bottom-right stack of the (chrome) layout (design §5.4): the calendar button, and below it on phones the "+" of Hôm nay, 12 px
 * apart. Phones hide the calendar button where the page has its own floating bar, and slide the stack away while the page scrolls down.
 */
export function FloatingButtons() {
  const desktop = useDesktop();
  const path = usePathname().replace(/^\/(vi|en)(?=\/|$)/, '');
  const calendar = desktop || !OWN_BAR.test(path);
  const add = !desktop && path === '/app';
  const away = useScrollAway(!desktop);
  if (!calendar && !add) return null;
  return (
    <div className={cn(STACK, AWAY)} data-away={away || undefined}>
      {calendar && <CalendarButton size={desktop ? 'lg' : 'sm'} />}
      {add && <AddFab />}
    </div>
  );
}
