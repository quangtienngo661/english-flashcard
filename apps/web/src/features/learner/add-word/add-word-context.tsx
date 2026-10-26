'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AddWordSheet } from './AddWordSheet';

type AddWord = { open: (word?: string, opts?: { groupId?: string }) => void; setScope: (groupId: string | null) => void };
const AddWordContext = createContext<AddWord>({ open: () => {}, setScope: () => {} });
const ClearScopeContext = createContext<(groupId: string | null) => void>(() => {});

/** Thêm từ from anywhere in the app: the top bar button, the key N, the phone + button, Today's box, [Thêm từ này]. */
export function AddWordProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<{ word: string; lockedGroupId?: string } | null>(null);
  const scope = useRef<string | null>(null);
  const setScope = useCallback((groupId: string | null) => { scope.current = groupId; }, []);
  const clearScope = useCallback((groupId: string | null) => {
    // A14-4: an older page must not clear a newer page's scope.
    if (scope.current === groupId) scope.current = null;
  }, []);
  const open = useCallback((word?: string, opts?: { groupId?: string }) => {
    setSheet({ word: word ?? '', lockedGroupId: opts?.groupId ?? scope.current ?? undefined });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <AddWordContext.Provider value={{ open, setScope }}>
      <ClearScopeContext.Provider value={clearScope}>
        {children}
        {sheet !== null && <AddWordSheet initialWord={sheet.word} lockedGroupId={sheet.lockedGroupId} onClose={() => setSheet(null)} />}
      </ClearScopeContext.Provider>
    </AddWordContext.Provider>
  );
}

export const useAddWord = () => useContext(AddWordContext);

export function useAddWordScope(groupId: string | null): void {
  const { setScope } = useAddWord();
  const clearScope = useContext(ClearScopeContext);
  useEffect(() => {
    setScope(groupId);
    return () => clearScope(groupId);
  }, [groupId, setScope, clearScope]);
}
