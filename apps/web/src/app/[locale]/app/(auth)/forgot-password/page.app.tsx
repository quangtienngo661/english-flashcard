import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/features/learner/auth/ForgotPasswordForm';

// Static shell; the form reads its query string in the browser (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
