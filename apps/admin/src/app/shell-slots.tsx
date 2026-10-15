import { createContext, useContext, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Two places inside the white sheet that a page fills (design §6.1): its primary action beside the page title, and
 * the side-panel column. Portals, because the app uses `<Routes>` (no data-router `handle`) and lifting the button
 * into Shell state would need effects to keep it in sync.
 */
export type ShellSlots = { actions: HTMLElement | null; panel: HTMLElement | null };

export const ShellSlotsContext = createContext<ShellSlots>({ actions: null, panel: null });

export function PageActions({ children }: { children: ReactNode }) {
  const { actions } = useContext(ShellSlotsContext);
  return actions ? createPortal(children, actions) : null;
}

export function usePanelSlot(): HTMLElement | null {
  return useContext(ShellSlotsContext).panel;
}
