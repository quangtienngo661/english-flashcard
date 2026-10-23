import { Suspense } from 'react';
import { BacklogPage } from '@/features/learner/groups/BacklogPage';

// K/15.
export default function Page() {
  return (
    <Suspense>
      <BacklogPage />
    </Suspense>
  );
}
