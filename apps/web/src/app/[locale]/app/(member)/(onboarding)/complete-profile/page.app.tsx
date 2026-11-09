import { Suspense } from 'react';
import { CompleteProfile } from '@/features/learner/auth/CompleteProfile';

// AD18: the birth date and the terms, asked once of an account that lacks them; the (onboarding) layout draws the centred card (giao diện mới §5.4).
export default function Page() {
  return (
    <Suspense>
      <CompleteProfile />
    </Suspense>
  );
}
