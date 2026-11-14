import { Suspense } from 'react';
import { LoginForm } from '@/features/learner/auth/LoginForm';

// Static shell; the form reads its query string in the browser (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
