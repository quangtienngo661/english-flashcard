import type { ReactNode } from 'react';
import { CalendarButton } from '@/app-chrome/CalendarButton';
import { AppBackground } from '@/ui/AppBackground';

// Sessions (practice, Học, Ôn): no chrome, only the main landmark on the mesh background (design §5.4). The calendar button floats at the
// bottom right on desktop; phones get it in the session bar (M6.9).
export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="relative isolate flex min-h-dvh flex-col outline-none">
      <AppBackground />
      {children}
      <div className="fixed bottom-8 right-8 z-40 hidden md:block">
        <CalendarButton size="lg" />
      </div>
    </main>
  );
}
