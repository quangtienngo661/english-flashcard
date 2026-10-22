import { Suspense } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { VerifyEmailForm } from '@/features/learner/auth/VerifyEmailForm';

// Part of sign-up, after the account exists: the split layout of the auth pages (design §5 M1).
export default function Page() {
  return (
    <AppShell variant="bare">
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </AppShell>
  );
}
