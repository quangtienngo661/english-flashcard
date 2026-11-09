import { Suspense } from 'react';
import { WelcomeLanguage } from '@/features/learner/auth/WelcomeLanguage';

// Part of sign-up, after the account exists: the (onboarding) layout draws the centred card (giao diện mới §5.4).
export default function Page() {
  return (
    <Suspense>
      <WelcomeLanguage />
    </Suspense>
  );
}
