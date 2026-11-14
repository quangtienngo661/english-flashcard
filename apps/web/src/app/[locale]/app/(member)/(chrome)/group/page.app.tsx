import { Suspense } from 'react';
import { GroupPage } from '@/features/learner/groups/GroupPage';

// K/11–K/13; the deck id is in the query (design §4.1).
export default function Page() {
  return (
    <Suspense>
      <GroupPage />
    </Suspense>
  );
}
