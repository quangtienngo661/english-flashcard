'use client';

import type { ReactNode } from 'react';
import { AppChrome } from '@/app-chrome/AppChrome';
import { AddWordProvider } from '@/features/learner/add-word/add-word-context';

// Pages under a tab (design giao diện mới §5.4): the chrome stays put across soft navigations. AddWordProvider sits here, not in
// (member), so the N key opens Thêm từ only where the chrome is (never in a session or onboarding).
export default function ChromeLayout({ children }: { children: ReactNode }) {
  return (
    <AddWordProvider>
      <AppChrome>{children}</AppChrome>
    </AddWordProvider>
  );
}
