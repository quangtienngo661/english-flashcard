import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBeforeUnload, useBlocker, useLocation } from 'react-router';
import { useTranslations } from 'use-intl';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type DirtyForms = {
  /** Form id → the pathname it was dirty on, and what to run when the user confirms leaving. A ref, so `release()` is seen by the very next navigation. */
  registry: { current: Map<string, { pathname: string; onLeave?: () => void }> };
  /** Asks "Bỏ thay đổi?" for the dialog `owner`; `discard` runs only on [Bỏ thay đổi]. */
  askDiscard: (owner: string, discard: () => void) => void;
  /** Withdraws `owner`'s question, if it is the one open (its dialog went away). */
  dropDiscard: (owner: string) => void;
};

const DirtyFormContext = createContext<DirtyForms | null>(null);

function useDirtyForms(): DirtyForms {
  const value = useContext(DirtyFormContext);
  if (!value) throw new Error('useDirtyForm must be used inside DirtyFormProvider (the Shell)');
  return value;
}

/**
 * Forms report "unsaved changes" here, with the page they sit on (design §4.3, T6). `Shell` holds it, so the one
 * `LeaveGuard` (react-router allows a single blocker per router) answers for every form, page or dialog.
 */
export function DirtyFormProvider({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const registry = useRef(new Map<string, { pathname: string; onLeave?: () => void }>());
  const [pendingDiscard, setPendingDiscard] = useState<{ owner: string; discard: () => void } | null>(null);
  const value = useMemo<DirtyForms>(
    () => ({
      registry,
      askDiscard: (owner, discard) => setPendingDiscard({ owner, discard }),
      dropDiscard: (owner) => setPendingDiscard((pending) => (pending?.owner === owner ? null : pending)),
    }),
    [],
  );

  return (
    <DirtyFormContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={pendingDiscard !== null}
        title={t('leave.discardTitle')}
        confirmLabel={t('leave.discard')}
        cancelLabel={t('leave.keepEditing')}
        tone="danger"
        onConfirm={() => {
          pendingDiscard?.discard();
          setPendingDiscard(null);
        }}
        onCancel={() => setPendingDiscard(null)}
      >
        {t('leave.body')}
      </ConfirmDialog>
    </DirtyFormContext.Provider>
  );
}

/**
 * Marks this form dirty on the current page while `isDirty`. Call `release()` right before a post-save or post-cancel
 * `navigate`: it drops the mark at once, so that navigation is not blocked. `onLeave` runs when the user confirms
 * [Rời trang] (they accepted losing the changes, so e.g. a kept draft must go too), before the navigation proceeds.
 */
export function useDirtyForm(
  isDirty: boolean,
  opts?: { onLeave?: () => void },
): {
  /** Call only right before a navigation (save-and-go, cancel-and-go); the form is not marked again until `isDirty` changes. */
  release(): void;
} {
  const { registry } = useDirtyForms();
  const id = useId();
  const { pathname } = useLocation();
  const onLeaveRef = useRef(opts?.onLeave);
  useEffect(() => {
    onLeaveRef.current = opts?.onLeave;
  });

  useEffect(() => {
    if (!isDirty) return;
    const forms = registry.current;
    forms.set(id, { pathname, onLeave: () => onLeaveRef.current?.() });
    return () => {
      forms.delete(id);
    };
  }, [registry, id, isDirty, pathname]);

  const release = useCallback(() => {
    registry.current.delete(id);
  }, [registry, id]);
  return useMemo(() => ({ release }), [release]);
}

/**
 * The handler for a form dialog's [Hủy], ✕ and Esc: clean → `close()`; dirty → "Bỏ thay đổi?" first, then `release()` and
 * `close()`. The dialog's form also counts as dirty for leaving the page.
 */
export function useDialogDirtyClose(isDirty: boolean, close: () => void): () => void {
  const { askDiscard, dropDiscard } = useDirtyForms();
  const { release } = useDirtyForm(isDirty);
  const owner = useId();
  // A question still open when its dialog goes away (e.g. the page was left) must not outlive it or run a stale `close()`.
  useEffect(() => () => dropDiscard(owner), [dropDiscard, owner]);
  return useCallback(() => {
    if (!isDirty) {
      close();
      return;
    }
    askDiscard(owner, () => {
      release();
      close();
    });
  }, [askDiscard, close, isDirty, owner, release]);
}

/**
 * The single blocker: leaving the page of a dirty form asks "Rời trang?"; a change of `search` only (a tab, a filter) does
 * not. Closing or reloading the tab gets the browser's own prompt.
 */
export function LeaveGuard() {
  const t = useTranslations();
  const { registry } = useDirtyForms();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const dirtyHere = [...registry.current.values()].some((form) => form.pathname === currentLocation.pathname);
    return dirtyHere && nextLocation.pathname !== currentLocation.pathname;
  });
  useBeforeUnload((event) => {
    if (registry.current.size === 0) return;
    event.preventDefault();
    event.returnValue = ''; // older browsers prompt only when this is set
  });

  return (
    <ConfirmDialog
      isOpen={blocker.state === 'blocked'}
      title={t('leave.title')}
      confirmLabel={t('leave.leave')}
      cancelLabel={t('leave.stay')}
      tone="danger"
      onConfirm={() => {
        const forms = [...registry.current.values()];
        registry.current.clear();
        for (const form of forms) form.onLeave?.();
        blocker.proceed?.();
      }}
      onCancel={() => blocker.reset?.()}
    >
      {t('leave.body')}
    </ConfirmDialog>
  );
}
