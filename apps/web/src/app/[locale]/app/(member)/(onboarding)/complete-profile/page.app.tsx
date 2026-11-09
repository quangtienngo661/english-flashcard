import { Suspense } from 'react';
import { AppShell } from '@/app-chrome/AppShell';
import { CompleteProfile } from '@/features/learner/auth/CompleteProfile';

// AD18: the birth date and the terms, asked once of an account that lacks them; the split layout of the auth pages.
export default function Page() {
  return (
    <AppShell variant="bare">
      <Suspense>
        <CompleteProfile />
      </Suspense>
    </AppShell>
  );
}
