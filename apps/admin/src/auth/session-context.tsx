import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createApiClient, type ApiClient } from '../api/client';
import { apiBaseUrl } from '../config';
import { CHANNEL_NAME, SessionStore, type SessionState } from './session-store';

const SessionContext = createContext<SessionStore | null>(null);

function createDefaultStore(): SessionStore {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // B25E13: blocked or unsupported
  }
  return new SessionStore({ baseUrl: apiBaseUrl, fetch: (input, init) => fetch(input, init), channel });
}

export function SessionProvider({ children, store: given }: { children: ReactNode; store?: SessionStore }) {
  const [store] = useState(() => given ?? createDefaultStore());
  const state = useSyncExternalStore(store.subscribe, () => store.state);

  useEffect(() => {
    void store.bootstrap();
  }, [store]);

  // B25#7: coming back to the tab re-reads `/me` and re-applies the gate rule.
  const signedIn = state.status === 'signed-in';
  useEffect(() => {
    if (!signedIn) return;
    const onFocus = () => void store.recheck();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [store, signedIn]);

  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
}

function useStore(): SessionStore {
  const store = useContext(SessionContext);
  if (!store) throw new Error('useSession must be used inside <SessionProvider>');
  return store;
}

export function useSession(): { state: SessionState; store: SessionStore } {
  const store = useStore();
  const state = useSyncExternalStore(store.subscribe, () => store.state);
  return { state, store };
}

export function useApi(): ApiClient {
  const store = useStore();
  return useMemo(() => createApiClient({ send: store.send }), [store]);
}
