import { Suspense } from 'react';
import { ReviewSession } from '@/features/learner/review/ReviewSession';

// K/20–K/22: full screen, no app chrome.
export default function Page() {
  return (
    <Suspense>
      <ReviewSession />
    </Suspense>
  );
}
