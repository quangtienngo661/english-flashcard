import { Suspense } from 'react';
import { RegisterForm } from '@/features/learner/auth/RegisterForm';

// Static shell; the form reads its query string in the browser (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
