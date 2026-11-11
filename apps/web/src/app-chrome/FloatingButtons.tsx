'use client';

import { usePathname } from 'next/navigation';
import { useDesktop } from '@/lib/use-desktop';
import { AddFab } from './AddFab';
import { CalendarButton } from './CalendarButton';

// Where a page's own floating bar sits on phones (M6 Figma A §6): Từ tồn đọng and Chủ đề.
const OWN_BAR = /^\/app\/(group\/backlog|topic)(\/|$)/;
// raw-ok: Figma 95:343 instances sit 14 px above the phone tab bar (62 px + the safe area); 32 px from the corner on desktop
const STACK = 'fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 md:bottom-8 md:right-8';

/**
 * The bottom-right stack of the (chrome) layout (design §5.4): the calendar button, and below it on phones the "+" of Hôm nay, 12 px
 * apart. Phones hide the calendar button where the page has its own floating bar.
 */
export function FloatingButtons() {
  const desktop = useDesktop();
  const path = usePathname().replace(/^\/(vi|en)(?=\/|$)/, '');
  const calendar = desktop || !OWN_BAR.test(path);
  const add = !desktop && path === '/app';
  if (!calendar && !add) return null;
  return (
    <div className={STACK}>
      {calendar && <CalendarButton size={desktop ? 'lg' : 'sm'} />}
      {add && <AddFab />}
    </div>
  );
}
