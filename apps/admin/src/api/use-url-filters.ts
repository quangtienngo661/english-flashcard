import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';

type FilterSpec<T extends Record<string, string>> = { [K in keyof T]: { default: T[K]; valid: (v: string) => boolean } };

/**
 * List filters kept in the URL (`?status=open&source=ai`): a reload or a shared link keeps them.
 * A value that is missing, invalid or equal to its default reads as the default; an invalid one is also removed from the URL
 * (replace, so no extra history entry). Writing a filter pushes one history entry, leaves every other search param alone and
 * never stores `page_token` (a token belongs to one filter set, so changing a filter goes back to the first page).
 * `spec` should be a module-level constant; `values` and `set` keep their identity while the URL and `spec` do not change,
 * so they are safe in effect and memo dependencies.
 */
export function useUrlFilters<T extends Record<string, string>>(spec: FilterSpec<T>): [T, (next: Partial<T>) => void] {
  const [params, setParams] = useSearchParams();

  const search = params.toString();
  const { values, invalid } = useMemo(() => {
    const current = new URLSearchParams(search);
    const values: Record<string, string> = {};
    const invalid: string[] = [];
    for (const key of Object.keys(spec)) {
      const entry = spec[key]!;
      const raw = current.get(key);
      if (raw !== null && entry.valid(raw)) values[key] = raw;
      else {
        values[key] = entry.default;
        if (raw !== null) invalid.push(key);
      }
    }
    return { values, invalid };
  }, [search, spec]);

  const invalidKeys = invalid.join(',');
  useEffect(() => {
    if (invalidKeys === '') return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const key of invalidKeys.split(',')) next.delete(key);
        return next;
      },
      { replace: true },
    );
  }, [invalidKeys, setParams]);

  const set = useCallback(
    (change: Partial<T>) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('page_token');
        for (const [key, value] of Object.entries(change) as Array<[string, string | undefined]>) {
          const entry = spec[key];
          if (!entry) continue;
          if (value === undefined || value === entry.default || !entry.valid(value)) next.delete(key);
          else next.set(key, value);
        }
        return next;
      });
    },
    [setParams, spec],
  );

  return [values as T, set];
}
