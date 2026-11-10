import { Suspense } from 'react';
import { RecallSession } from '@/features/learner/recall/RecallSession';

// Đợt C §4.4: full screen, no app chrome, like the practice session.
export default function Page() {
  return (
    <Suspense>
      <RecallSession />
    </Suspense>
  );
}
