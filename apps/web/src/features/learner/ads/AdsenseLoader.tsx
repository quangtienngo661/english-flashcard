'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { hardReplace } from '@/app-shell/navigate';
import { useEntitlements } from '@/app-shell/queries';

/** The only pages where the Google script may be in the document: Nhóm and Tra từ (launch prep B design §5.1, DB38). */
const ALLOWED = /^\/(?:vi|en)\/app\/(?:groups|lookup)$/;

type AdsWindow = Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };

/**
 * Loads the AdSense script, for a learner who may see ads (`ads.show`), only while the page is Nhóm or Tra từ (launch prep B design §5.1). The
 * vignette appears when a link is followed on a page that has the code, so "on Nhóm and Tra từ" means the code is in the document only there:
 * once loaded it stays until the document ends, so leaving those pages, or `ads.show` turning false (Lan bought Pro, the admin switched ads off),
 * reloads the page and the new document has none. Ads are always non-personalised (Q-B12), set before the script is added. A blocker or a
 * failure to load is silent. With no client set at build time nothing happens and the Pro dialog is used instead.
 */
export function AdsenseLoader({ nonce }: { nonce?: string }) {
  const pathname = usePathname();
  const entitlements = useEntitlements();
  const show = entitlements.data?.ads?.show === true;
  const loaded = useRef(false);

  useEffect(() => {
    // Read at call time: the build inlines the variable, and a test may set it.
    const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    const allowed = ALLOWED.test(pathname);
    if (loaded.current) {
      // A script that is there cannot be taken out: the document is replaced (LB3E1, LB3E3, LB3E4).
      if (!allowed || !show) hardReplace(window.location.href);
      return;
    }
    if (!client || !show || !allowed) return;
    const adsWindow = window as AdsWindow;
    adsWindow.adsbygoogle = adsWindow.adsbygoogle ?? [];
    adsWindow.adsbygoogle.requestNonPersonalizedAds = 1;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    if (nonce) script.nonce = nonce;
    // An ad blocker or a network failure: nothing to tell the learner (LB3E11).
    script.addEventListener('error', () => {});
    document.head.appendChild(script);
    loaded.current = true;
  }, [pathname, show, nonce]);

  return null;
}
