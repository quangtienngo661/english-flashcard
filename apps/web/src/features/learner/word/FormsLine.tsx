'use client';

import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Fragment } from 'react';
import { wordHref, type Inflection } from './word-api';

/**
 * Figma row "dạng chia" in the word head: "record · records · recorded · recording", the head word in SemiBold, the dots muted. A form
 * links to its own page only when it has one (`has_page`); the word of the page itself is never a link. On phones the label sits above.
 */
export function FormsLine({ label, base, forms, current }: { label: string; base: string; forms: Inflection[]; current: string }) {
  const locale = useLocale();
  const items = [{ form: base, has_page: true }, ...forms];
  return (
    <p className="flex flex-col gap-1 md:flex-row md:gap-4">
      <span className="shrink-0 pt-1 text-wm-meta text-wm-muted md:w-19">{label}</span>{' '}
      <span className="min-w-0 break-words font-wm-sans text-wm-base text-wm-ink">
        {items.map((item, i) => (
          <Fragment key={`${item.form}-${i}`}>
            {i > 0 && <span className="text-wm-muted"> · </span>}
            {item.has_page && item.form !== current ? (
              <Link href={wordHref(locale, item.form)} className="text-wm-accent underline underline-offset-2">
                {item.form}
              </Link>
            ) : (
              <span className={item.form === base ? 'font-semibold' : undefined}>{item.form}</span>
            )}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
