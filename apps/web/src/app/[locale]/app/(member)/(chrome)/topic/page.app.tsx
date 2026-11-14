import { Suspense } from 'react';
import { TopicPickerPage } from '@/features/learner/groups/TopicPickerPage';

// K/18.
export default function Page() {
  return (
    <Suspense>
      <TopicPickerPage />
    </Suspense>
  );
}
