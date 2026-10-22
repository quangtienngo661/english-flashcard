import type { ReactNode } from 'react';
import { RequireSession } from '@/app-shell/RequireSession';

// Every screen that needs a signed-in learner (design §4.2, E1–E11).
export default function MemberLayout({ children }: { children: ReactNode }) {
  return <RequireSession>{children}</RequireSession>;
}
