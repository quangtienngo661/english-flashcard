import { Suspense } from 'react';
import { DeleteAccountPage } from '@/features/learner/settings/DeleteAccountPage';

// Reads ?reauth= in the browser (design §4.1: static shell).
export default function Page() {
  return (
    <Suspense>
      <DeleteAccountPage />
    </Suspense>
  );
}
