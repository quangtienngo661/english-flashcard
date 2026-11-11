import { headers } from 'next/headers';
import { Suspense, type ReactNode } from 'react';
import { RequireSession } from '@/app-shell/RequireSession';
import { AdsenseLoader } from '@/features/learner/ads/AdsenseLoader';
import { CalendarHost } from '@/features/learner/calendar/CalendarHost';
import { HouseAd } from '@/features/learner/house-ad/HouseAd';
import { nonceFromPolicy } from '@/lib/app-csp';

// Every screen that needs a signed-in learner (design §4.2, E1–E11). The Pro introduction dialog and the AdSense loader live here, inside the
// session, so they know the learner and survive every soft navigation of the member screens (launch prep B design §4.2, §5.1). Only one of the
// two does anything: the loader with an AdSense client set at build time, the dialog without.
export default async function MemberLayout({ children }: { children: ReactNode }) {
  // The nonce of this request, from the policy the proxy put on it: the script the loader adds carries it (design §5.4).
  const nonce = nonceFromPolicy((await headers()).get('content-security-policy'));
  return (
    <RequireSession>
      {/* Lịch and Ngày for every member screen, driven by ?lich= / ?ngay= (design §5.6); useSearchParams sits in Suspense. */}
      <Suspense fallback={children}>
        <CalendarHost>{children}</CalendarHost>
      </Suspense>
      <HouseAd />
      <AdsenseLoader nonce={nonce} />
    </RequireSession>
  );
}
