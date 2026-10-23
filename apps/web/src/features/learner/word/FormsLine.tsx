'use client';

import { Plus } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Fragment } from 'react';
import { wordHref, type Inflection } from './word-api';

const LINK = 'font-semibold text-primary underline underline-offset-2';

/**
 * The yellow line under the word (K/31–K/33): "Dạng chia: go · goes · going · went · gone". A form links to its own page only
 * when it has one (`has_page`); the word of the page itself is never a link.
 */
export function FormsLine({ label, base, forms, current }: { label: string; base: string; forms: Inflection[]; current: string }) {
  const locale = useLocale();
  const items = [{ form: base, has_page: true }, ...forms];
  return (
    <p className="flex items-start gap-2 rounded-inner bg-accent-soft px-4 py-2.5 text-ui text-ink">
      <Plus aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words">
        <span className="font-semibold">{label}</span>{' '}
        {items.map((item, i) => (
          <Fragment key={`${item.form}-${i}`}>
            {i > 0 && ' · '}
            {item.has_page && item.form !== current ? (
              <Link href={wordHref(locale, item.form)} className={LINK}>
                {item.form}
              </Link>
            ) : (
              <span className="font-semibold">{item.form}</span>
            )}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
