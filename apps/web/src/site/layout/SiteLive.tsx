'use client';

import { useEffect } from 'react';
import { LIVE_CLASS } from './site-head-script';

/** Tells the head script that React runs on this page (`wm-live` on <html>), so it keeps the `js` class of the site motion (R249). */
export function SiteLive() {
  useEffect(() => {
    document.documentElement.classList.add(LIVE_CLASS);
  }, []);
  return null;
}
