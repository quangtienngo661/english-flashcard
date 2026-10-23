import { Suspense } from 'react';
import { HistoryPage } from '@/features/learner/practice/HistoryPage';

// K/57, K/57b, K/82, K/83; the tab is in the query (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <HistoryPage />
    </Suspense>
  );
}
