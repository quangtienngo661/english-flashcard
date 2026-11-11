'use client';

import { SkeletonBlocks } from '@/ui/Skeleton';

// A soft navigation inside the chrome (design §5.5): a neutral skeleton, a title and three blocks. Routes with their own layout
// get their own loading file with their milestone (M3–M5).
export default function Loading() {
  return <SkeletonBlocks />;
}
