import type { ReactNode } from 'react';
import { AuthGate } from '@/features/learner/auth/AuthGate';

// Sign-in, sign-up and password pages: the split K/01–K/05 layout; a learner already signed in goes on into the app.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
