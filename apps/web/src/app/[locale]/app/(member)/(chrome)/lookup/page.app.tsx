import { Suspense } from 'react';
import { LookupPage } from '@/features/learner/lookup/LookupPage';

// K/30.
export default function Page() {
  return (
    <Suspense>
      <LookupPage />
    </Suspense>
  );
}
