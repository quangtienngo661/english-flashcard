'use client';

import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { lookupHref, parseLookup } from '@/features/learner/lookup/lookup-api';

/**
 * Figma "Ô tìm" in the top bar (54:502), giao diện mới M4.3: "Tìm từ" with a "/" key cap, no level select (the level filter lives on
 * Tra từ). Enter goes to `/app/lookup?q=…`. "/" focuses it from anywhere except a field, an editable element or a dialog.
 * Typed text survives a tab change and other query params (`?id=`, `?lich=`, `?ngay=`); it follows the URL's `q` (design §5.4).
 */
export function TopSearch() {
  const t = useTranslations('App.chrome.search');
  const locale = useLocale();
  const router = useRouter();
  const urlQuery = parseLookup(useSearchParams()).q ?? '';
  const [q, setQ] = useState(urlQuery);
  const [seen, setSeen] = useState(urlQuery);
  if (seen !== urlQuery) {
    setSeen(urlQuery);
    setQ(urlQuery);
  }
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      box.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    router.push(lookupHref(locale, query ? { q: query } : {}));
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex w-65 min-w-24 shrink">
      <label className="flex h-9.5 w-full min-w-0 items-center gap-2 rounded-wm-control border border-wm-line bg-wm-bg pl-3 pr-2 focus-within:border-wm-accent">
        <Search aria-hidden className="size-4 shrink-0 text-wm-muted" />
        <span className="sr-only">{t('placeholder')}</span>
        <input
          ref={box}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={100}
          placeholder={t('placeholder')}
          className="min-w-0 flex-1 bg-transparent font-wm-sans text-wm-small text-wm-ink outline-none placeholder:text-wm-muted"
        />
        <kbd aria-hidden className="shrink-0 rounded-wm-key border border-wm-line bg-wm-bg px-1.5 font-wm-sans text-wm-meta text-wm-muted">
          /
        </kbd>
      </label>
    </form>
  );
}
