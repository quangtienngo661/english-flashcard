'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Select } from '@/app-ui/Select';
import { LEVELS, lookupHref, parseLookup } from '@/features/learner/lookup/lookup-api';

const ALL = 'all';
const WIDE = '(min-width: 768px)';

/** Whether the window is 768 px or wider; false on the server and in the first render (static shell). */
function useWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

/**
 * K/10 tier 2 and M/40: level, search box and [Tra] under the top bar; submits to `/app/lookup?q=&level=` (design §5 M1/M3).
 * "/" focuses the box from anywhere except another field. On the lookup page it starts from the URL's query.
 */
export function SearchStrip() {
  const t = useTranslations('App.chrome.search');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const current = parseLookup(params);
  const onLookup = /\/app\/lookup$/.test(usePathname());
  const [q, setQ] = useState(current.q ?? '');
  const [level, setLevel] = useState(current.level ?? ALL);
  // The lookup page changes the URL under the strip (filters, "Xóa lọc", Back): follow it (review I-5).
  const search = params.toString();
  const [seen, setSeen] = useState(search);
  if (seen !== search) {
    setSeen(search);
    setQ(current.q ?? '');
    setLevel(current.level ?? ALL);
  }
  const box = useRef<HTMLInputElement>(null);
  const wide = useWide();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    // On the lookup page a new search keeps the topic, part of speech and "Chỉ từ của tôi" filters.
    const kept = onLookup ? { topic: current.topic, pos: current.pos, mine: current.mine } : {};
    router.push(lookupHref(locale, { ...kept, ...(query ? { q: query } : {}), ...(level !== ALL ? { level } : {}) }));
  }

  return (
    <div className="border-b border-border bg-surface">
      <form role="search" onSubmit={onSubmit} className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 md:gap-3">
        <div className="w-32 shrink-0 md:w-40">
          <Select
            label={t('level')}
            hideLabel
            value={level}
            onChange={setLevel}
            items={[{ id: ALL, label: t('allLevels') }, ...LEVELS.map((l) => ({ id: l, label: l }))]}
            display={(item) => (item.id === ALL ? (wide ? t('allLevels') : t('level')) : `${t('level')} ${item.label}`)}
          />
        </div>
        <label className="flex min-h-control min-w-0 flex-1 items-center gap-2 rounded-control border-2 border-border-strong bg-surface px-3 focus-within:border-primary">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <span className="sr-only">{t('placeholderShort')}</span>
          <input
            ref={box}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={100}
            placeholder={wide ? t('placeholder') : t('placeholderShort')}
            className="peer min-w-0 flex-1 bg-transparent py-2 text-ui text-ink outline-none placeholder:text-placeholder"
          />
        </label>
        <button
          type="submit"
          className="hidden min-h-control shrink-0 items-center rounded-control bg-navy px-6 text-ui font-semibold text-on-navy shadow-ledge outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex"
        >
          {t('submit')}
        </button>
      </form>
    </div>
  );
}
