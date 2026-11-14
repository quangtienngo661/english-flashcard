import { Suspense } from 'react';
import { VerifyEmailForm } from '@/features/learner/auth/VerifyEmailForm';

// Signed out, between sign-up (or an unverified sign-in) and the app (design §4.3); the (auth) layout gives the frame.
export default function Page() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
