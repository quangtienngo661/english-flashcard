import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { AppIntl } from '@/app-shell/AppIntl';
import { AppProviders } from '@/app-shell/AppProviders';
import { THEME_SCRIPT } from '@/app-shell/theme/theme-script';

// Learner app root (design §4.1). Only in builds with NEXT_PUBLIC_LEARNER_APP=on (D21).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LearnerAppLayout({ children }: { children: ReactNode }) {
  // Rendered per request, so every response of /app carries its own CSP nonce (launch prep B design §5.4); the landing stays static.
  await connection();
  return (
    <>
      {/* Sets data-theme on <html> before the app paints (design §4.4). */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <AppIntl>
        <AppProviders>
          <div className="min-h-dvh bg-canvas text-ink">{children}</div>
        </AppProviders>
      </AppIntl>
    </>
  );
}
