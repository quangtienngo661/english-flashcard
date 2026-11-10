import { Suspense } from 'react';
import { ResetPasswordForm } from '@/features/learner/auth/ResetPasswordForm';

// Static shell; the form reads its query string in the browser (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
