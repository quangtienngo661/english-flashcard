import type { ReactNode } from 'react';
import { CardFrame } from '@/app-chrome/CardFrame';

// Code, password, Google and account-deleted pages: the centred card (Figma 36:385…36:549; design §5.4).
export default function CardLayout({ children }: { children: ReactNode }) {
  return <CardFrame>{children}</CardFrame>;
}
