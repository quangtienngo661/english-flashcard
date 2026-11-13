'use client';

import { ErrorView } from '@/app-chrome/ErrorView';

// A rendering error under this route group (design giao diện mới §5.5): the layout stays, only this part is replaced.
// `retry` (Next 16.4) refetches and re-renders the segment; `reset` would only clear the boundary.
export default function Error({ retry }: { error: Error & { digest?: string }; reset: () => void; retry: () => void }) {
  return <ErrorView retry={retry} />;
}
