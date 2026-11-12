'use client';

import dynamic from 'next/dynamic';

// Design §5.7: the Pro introduction's code loads after the page, not with it. The member layout is a server component, where `ssr: false` is not allowed.
const HouseAd = dynamic(() => import('./HouseAd').then((m) => m.HouseAd), { ssr: false });

export function HouseAdLoader() {
  return <HouseAd />;
}
