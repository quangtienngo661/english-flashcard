import type { ReactNode } from 'react';
import { AuthGate } from '@/features/learner/auth/AuthGate';

// Sign-in pages: a learner already signed in goes on into the app (except the password pages, B8-2). The frame is drawn by the two
// sub-groups: (split) for sign-in and sign-up, (card) for the rest (design §5.4).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
