import type { ReactNode } from 'react';
import { SplitFrame } from '@/features/learner/auth/SplitFrame';

// Sign-in and sign-up: the form beside the brand panel from 1280 px (Figma 35:308, 35:405; design §5.4).
export default function SplitLayout({ children }: { children: ReactNode }) {
  return <SplitFrame>{children}</SplitFrame>;
}
