import type { ReactNode } from 'react';
import { RequireSession } from '@/app-shell/RequireSession';
import { HouseAd } from '@/features/learner/house-ad/HouseAd';

// Every screen that needs a signed-in learner (design §4.2, E1–E11). The Pro introduction dialog lives here, inside the session, so it
// knows the learner and survives every soft navigation of the member screens (launch prep B design §4.2).
export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      {children}
      <HouseAd />
    </RequireSession>
  );
}
