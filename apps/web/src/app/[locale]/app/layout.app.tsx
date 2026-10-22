import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Learner app root (design §4.1). Only in builds with NEXT_PUBLIC_LEARNER_APP=on (D21).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LearnerAppLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}
