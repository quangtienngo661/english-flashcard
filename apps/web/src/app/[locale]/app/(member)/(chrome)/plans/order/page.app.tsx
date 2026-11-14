import { Suspense } from 'react';
import { OrderReturnPage } from '@/features/learner/plans/OrderReturnPage';

// Where payOS sends the payer back; reads ?order= in the browser (design §4.1: static shell).
export default function Page() {
  return (
    <Suspense>
      <OrderReturnPage />
    </Suspense>
  );
}
