import type { ReactNode } from 'react';
import { DotGridBackground } from '@/ui/DotGridBackground';

// Sessions (practice, Học, Ôn): no chrome, only the main landmark on the dot grid (design §5.4).
export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="relative isolate flex min-h-dvh flex-col outline-none">
      <DotGridBackground />
      {children}
    </main>
  );
}
