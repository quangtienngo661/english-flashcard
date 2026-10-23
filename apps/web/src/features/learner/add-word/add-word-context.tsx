'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AddWordSheet } from './AddWordSheet';

type AddWord = { open: (word?: string) => void };
const AddWordContext = createContext<AddWord>({ open: () => {} });

/** Thêm từ from anywhere in the app: the top bar button, the key N, the phone + button, Today's box, [Thêm từ này]. */
export function AddWordProvider({ children }: { children: ReactNode }) {
  const [word, setWord] = useState<string | null>(null);
  const open = useCallback((initial?: string) => setWord(initial ?? ''), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      e.preventDefault();
      setWord('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AddWordContext.Provider value={{ open }}>
      {children}
      {word !== null && <AddWordSheet initialWord={word} onClose={() => setWord(null)} />}
    </AddWordContext.Provider>
  );
}

export const useAddWord = () => useContext(AddWordContext);
