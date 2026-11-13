import { Suspense } from 'react';
import { WordPage } from '@/features/learner/word/WordPage';

// K/31–K/33.
export default function Page() {
  return (
    <Suspense>
      <WordPage />
    </Suspense>
  );
}
