import { Suspense } from 'react';
import { AccountDeleted } from '@/features/learner/auth/AccountDeleted';

export default function Page() {
  return (
    <Suspense>
      <AccountDeleted />
    </Suspense>
  );
}
