'use client';

// Copied from apps/admin/src/auth/session-context.tsx (design §4.2); differences: the pages are prerendered, so the store
// (it touches window) is created in an effect and every hook reads `loading` until it exists.
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from '@/app-shell/api/client';
import { apiBaseUrl } from '@/app-shell/config';
import { CHANNEL_NAME, SessionStore, type SessionState } from './session-store';

const LOADING: SessionState = { status: 'loading' };
const StoreContext = createContext<SessionStore | null>(null);
const StateContext = createContext<SessionState>(LOADING);
const noSubscribe = () => () => {};

function createDefaultStore(): SessionStore {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // B25E13: blocked or unsupported
  }
  return new SessionStore({ baseUrl: apiBaseUrl(), fetch: (input, init) => fetch(input, init), channel });
}

export function SessionProvider({ children, store: given }: { children: ReactNode; store?: SessionStore }) {
  const [store, setStore] = useState<SessionStore | null>(given ?? null);
  const state = useSyncExternalStore(
    store?.subscribe ?? noSubscribe,
    () => store?.state ?? LOADING,
    () => LOADING,
  );

  useEffect(() => {
    if (store) {
      void store.bootstrap();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the store needs window, which exists only after hydration
    setStore(createDefaultStore());
  }, [store]);

  // B25#7: coming back to the tab re-reads `/me`.
  const signedIn = state.status === 'signed-in';
  useEffect(() => {
    if (!signedIn || !store) return;
    const onFocus = () => void store.recheck();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [store, signedIn]);

  return (
    <StoreContext.Provider value={store}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </StoreContext.Provider>
  );
}

/** `store` is null only before the provider has created it; `state` is then `loading`. */
export function useSession(): { state: SessionState; store: SessionStore | null } {
  return { state: useContext(StateContext), store: useContext(StoreContext) };
}

/** Use inside signed-in screens only (under RequireSession), where the store always exists. */
export function useApi(): ApiClient {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useApi before the session store exists');
  return useMemo(() => createApiClient({ send: store.send }), [store]);
}
