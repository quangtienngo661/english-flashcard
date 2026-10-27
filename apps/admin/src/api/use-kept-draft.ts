import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PREFIX = 'wordmet-admin.draft.';

// `sessionStorage` can be missing or throw (blocked site data, private modes): every access is guarded, and "no storage" means "no draft".
function readDraft<T>(storageKey: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      window.sessionStorage.removeItem(storageKey); // not JSON: no draft
      return null;
    }
  } catch {
    return null;
  }
}

function removeDraft(storageKey: string) {
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    /* no storage: nothing was kept */
  }
}

/**
 * Keeps a long form's unsaved text in `sessionStorage` while `isDirty`, so it survives the session ending (`RequireSession`
 * replaces the page with `/login`, which unmounts it before any leave question can run; design §4.6). After signing in again
 * the screen is back at `from`; `kept` is then the saved value, to offer [Khôi phục] / [Bỏ]. The caller calls `clear()` after
 * a successful save, `discard()` on [Bỏ] (and after a restore), and puts `kept` back into its own form state itself.
 */
export function useKeptDraft<T>(key: string, value: T, isDirty: boolean): { kept: T | null; discard(): void; clear(): void } {
  const storageKey = PREFIX + key;
  const [read, setRead] = useState(() => ({ storageKey, kept: readDraft<T>(storageKey) }));
  let kept = read.kept;
  if (read.storageKey !== storageKey) {
    // The same screen now shows another record (`sense:<id>`): its draft, not the previous one's.
    kept = readDraft<T>(storageKey);
    setRead({ storageKey, kept });
  }

  const serialized = useMemo(() => {
    try {
      return JSON.stringify(value) ?? null;
    } catch {
      return null;
    }
  }, [value]);

  const wasDirty = useRef(false);
  useEffect(() => {
    if (isDirty) {
      wasDirty.current = true;
      if (serialized === null) return;
      try {
        window.sessionStorage.setItem(storageKey, serialized);
      } catch {
        /* no storage: nothing is kept */
      }
    } else if (wasDirty.current) {
      // Edited back to clean: the stored text is no longer an unsaved change. A fresh mount (never dirty) leaves a kept draft alone.
      wasDirty.current = false;
      removeDraft(storageKey);
    }
  }, [storageKey, isDirty, serialized]);

  const discard = useCallback(() => {
    removeDraft(storageKey);
    setRead({ storageKey, kept: null });
  }, [storageKey]);

  return useMemo(() => ({ kept, discard, clear: discard }), [kept, discard]);
}
