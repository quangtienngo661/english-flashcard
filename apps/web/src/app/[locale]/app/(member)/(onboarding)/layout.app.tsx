import type { ReactNode } from 'react';
import { CardFrame } from '@/app-chrome/CardFrame';

// "Bổ sung hồ sơ", "Chào mừng": the centred card of the sign-in pages, behind a session (design §5.4).
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <CardFrame>{children}</CardFrame>;
}
